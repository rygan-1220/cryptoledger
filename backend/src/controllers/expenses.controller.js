const crypto = require('crypto');
const db = require('../config/db');
const { encryptSystem, decryptSystem } = require('../services/cryptoService');
const { getPrevExpenseHash, calculateExpenseHash, GENESIS_HASH } = require('../services/hashChain');
const { logAction } = require('../services/auditService');
const { validationResult } = require('express-validator');

// ─── Helpers ────────────────────────────────────────────────────────────────
const EXPENSE_COLS = `
  e.expense_id, e.user_id, e.dept_id, e.amount, e.project_id, e.category, e.status,
  e.file_mime_type, e.file_hash, e.digital_signature, e.prev_hash, e.hash,
  e.created_at, e.updated_at, e.deleted, e.rejection_reason, e.rejected_by_role,
  u.username as employee_name, d.dept_name
`;

function paginate(req) {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  return { page, limit, offset: (page - 1) * limit };
}

// ─── Submit ─────────────────────────────────────────────────────────────────
exports.submitExpense = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { layer1_ciphertext, pattern, digital_signature, encrypted_receipt, file_hash } = req.body;
  const user = req.session.user;

  try {
    // Collect all active device public keys for this user (supports per-device RSA keys)
    const keysRes = await db.query(
      'SELECT public_key_pem FROM user_public_keys WHERE user_id = $1 AND is_active = TRUE',
      [user.user_id]
    );
    if (!keysRes.rows.length) return res.status(404).json({ error: 'No device keys found for user' });

    // Verify signature against all device keys (the signing device may not be the latest)
    const payloadToSign = JSON.stringify({ layer1_ciphertext, pattern, file_hash });
    const sigBuffer = Buffer.from(digital_signature, 'base64');
    let isVerified = false;
    for (const row of keysRes.rows) {
      try {
        isVerified = crypto.verify(
          'sha256',
          Buffer.from(payloadToSign),
          { key: row.public_key_pem, padding: crypto.constants.RSA_PKCS1_PADDING },
          sigBuffer
        );
        if (isVerified) break;
      } catch (_) {
        // Key format mismatch — skip and try next key
      }
    }
    if (!isVerified) return res.status(401).json({ error: 'Invalid digital signature', code: 'SIGNATURE_INVALID' });

    const { amount, project_id, dept_id, category, date } = pattern;
    if (dept_id !== user.dept_id) return res.status(403).json({ error: 'Cannot submit expense for a different department' });

    // Layer 2 — no file inside
    const layer2Ciphertext = encryptSystem({ layer1_ciphertext, pattern });

    // Build encrypted_receipt buffer: [12B iv][16B authTag][ciphertext]
    let encryptedReceiptBuf = null;
    let fileMimeType = null;
    if (encrypted_receipt?.ciphertext) {
      const iv      = Buffer.from(encrypted_receipt.iv,        'base64');
      const authTag = Buffer.from(encrypted_receipt.authTag,   'base64');
      const ct      = Buffer.from(encrypted_receipt.ciphertext,'base64');
      encryptedReceiptBuf = Buffer.concat([iv, authTag, ct]);
      fileMimeType = encrypted_receipt.mime_type || null;
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const expenseId = crypto.randomUUID();
      const createdAt = new Date();
      const prevHash  = await getPrevExpenseHash(client);
      const hash      = calculateExpenseHash(expenseId, prevHash, amount, dept_id, createdAt);

      await client.query(
        `INSERT INTO expenses
           (expense_id, user_id, dept_id, amount, project_id, category,
            layer2_ciphertext, digital_signature,
            encrypted_receipt, file_mime_type, file_hash,
            prev_hash, hash, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [expenseId, user.user_id, dept_id, amount, project_id, category,
         layer2Ciphertext, digital_signature,
         encryptedReceiptBuf, fileMimeType, file_hash || null,
         prevHash, hash, createdAt]
      );
      await logAction(client, { expense_id: expenseId, action: 'CREATE', actor_id: user.user_id, metadata: { date } });
      await client.query('COMMIT');
      res.status(201).json({ message: 'Expense submitted securely', expense_id: expenseId });
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  } catch (err) {
    console.error('Submit Expense Error:', err);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
};

// ─── My Expenses (Employee) ──────────────────────────────────────────────────
exports.getMyExpenses = async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const { user_id } = req.session.user;
  try {
    const [data, count] = await Promise.all([
      db.query(`SELECT ${EXPENSE_COLS} FROM expenses e JOIN users u ON e.user_id = u.user_id JOIN departments d ON e.dept_id = d.dept_id WHERE e.user_id=$1 AND e.deleted=false ORDER BY e.created_at DESC LIMIT $2 OFFSET $3`, [user_id, limit, offset]),
      db.query('SELECT COUNT(*) FROM expenses WHERE user_id=$1 AND deleted=false', [user_id])
    ]);
    res.json({ data: data.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
};

// ─── Department Expenses (Manager+) ─────────────────────────────────────────
exports.getDeptExpenses = async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const { dept_id } = req.session.user;
  if (!dept_id) return res.status(400).json({ error: 'No department assigned' });
  try {
    const [data, count] = await Promise.all([
      db.query(`SELECT ${EXPENSE_COLS} FROM expenses e JOIN users u ON e.user_id = u.user_id JOIN departments d ON e.dept_id = d.dept_id WHERE e.dept_id=$1 AND e.deleted=false ORDER BY e.created_at DESC LIMIT $2 OFFSET $3`, [dept_id, limit, offset]),
      db.query('SELECT COUNT(*) FROM expenses WHERE dept_id=$1 AND deleted=false', [dept_id])
    ]);
    res.json({ data: data.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
};

// ─── All Expenses (Finance/Admin/CEO) ───────────────────────────────────────
exports.getAllExpenses = async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const { dept_id, status, category } = req.query;
  const conditions = ['e.deleted=false'];
  const params = [];
  if (dept_id) { params.push(dept_id); conditions.push(`e.dept_id=$${params.length}`); }
  if (status)  { params.push(status);  conditions.push(`e.status=$${params.length}`); }
  if (category){ params.push(category);conditions.push(`e.category=$${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  // Build count params (same WHERE but on raw table)
  const countConditions = conditions.map(c => c.replace('e.', ''));
  const countWhere = countConditions.length ? `WHERE ${countConditions.join(' AND ')}` : '';
  const countParams = params.slice(0, -2);

  try {
    const [data, count] = await Promise.all([
      db.query(`SELECT ${EXPENSE_COLS} FROM expenses e JOIN users u ON e.user_id = u.user_id JOIN departments d ON e.dept_id = d.dept_id ${where} ORDER BY e.created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`, params),
      db.query(`SELECT COUNT(*) FROM expenses ${countWhere}`, countParams)
    ]);
    res.json({ data: data.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
};

// ─── Single Expense Detail ──────────────────────────────────────────────────
// Server decrypts Layer 2 → sends layer1_ciphertext + encrypted_receipt to client
exports.getExpenseById = async (req, res) => {
  const { id } = req.params;
  const user = req.session.user;

  try {
    const result = await db.query(
      `SELECT e.expense_id, e.user_id, e.dept_id, e.amount, e.project_id, e.category, e.status,
              e.layer2_ciphertext, e.encrypted_receipt, e.file_mime_type, e.file_hash,
              e.digital_signature, e.prev_hash, e.hash, e.created_at, e.updated_at, e.deleted,
              e.rejection_reason, e.rejected_by_role,
              u.username as employee_name, d.dept_name
       FROM expenses e
       JOIN users u ON e.user_id = u.user_id
       JOIN departments d ON e.dept_id = d.dept_id
       WHERE e.expense_id=$1`, [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Expense not found' });
    const expense = result.rows[0];

    // Authorization: owner OR privileged roles
    const isOwner = expense.user_id === user.user_id;
    const isPrivileged = ['finance_manager','admin','ceo'].includes(user.role);
    const isDeptManager = user.role === 'dept_manager' && expense.dept_id === user.dept_id;
    if (!isOwner && !isPrivileged && !isDeptManager) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Decrypt Layer 2
    let layer1_ciphertext = null;
    try {
      const decrypted = JSON.parse(decryptSystem(expense.layer2_ciphertext));
      layer1_ciphertext = decrypted.layer1_ciphertext;
    } catch (e) {
      console.error('Layer 2 decrypt failed:', e);
    }

    // Build encrypted_receipt as base64 parts for client
    let receiptData = null;
    if (expense.encrypted_receipt) {
      const buf = Buffer.from(expense.encrypted_receipt);
      receiptData = {
        iv:         buf.slice(0,12).toString('base64'),
        authTag:    buf.slice(12,28).toString('base64'),
        ciphertext: buf.slice(28).toString('base64'),
        mime_type:  expense.file_mime_type
      };
    }

    // Log VIEW_PLAINTEXT if privileged
    if (isPrivileged || isDeptManager) {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        await logAction(client, { expense_id: id, action: 'VIEW_PLAINTEXT', actor_id: user.user_id, metadata: { role: user.role } });
        await client.query('COMMIT');
      } catch(e) { await client.query('ROLLBACK'); }
      finally { client.release(); }
    }

    res.json({
      expense: {
        expense_id:       expense.expense_id,
        user_id:          expense.user_id,
        dept_id:          expense.dept_id,
        amount:           expense.amount,
        project_id:       expense.project_id,
        category:         expense.category,
        status:           expense.status,
        file_mime_type:   expense.file_mime_type,
        file_hash:        expense.file_hash,
        created_at:       expense.created_at,
        updated_at:       expense.updated_at,
        deleted:          expense.deleted,
        rejection_reason: expense.rejection_reason,
        rejected_by_role: expense.rejected_by_role,
        employee_name:    expense.employee_name,
        dept_name:        expense.dept_name
      },
      layer1_ciphertext,   // for client-side Layer 1 decryption using K_real
      encrypted_receipt:   receiptData
    });
  } catch (err) {
    console.error('Get Expense Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── Soft Delete (owner, pending only) ──────────────────────────────────────
exports.softDeleteExpense = async (req, res) => {
  const { id } = req.params;
  const user = req.session.user;
  try {
    const result = await db.query('SELECT user_id, status FROM expenses WHERE expense_id=$1', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Expense not found' });
    const expense = result.rows[0];
    if (expense.user_id !== user.user_id) return res.status(403).json({ error: 'Forbidden' });
    if (expense.status !== 'pending') return res.status(400).json({ error: 'Only pending expenses can be deleted' });

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE expenses SET deleted=true, deleted_at=NOW() WHERE expense_id=$1', [id]);
      await logAction(client, { expense_id: id, action: 'DELETE', actor_id: user.user_id, metadata: {} });
      await client.query('COMMIT');
      res.json({ message: 'Expense deleted' });
    } catch(e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
};

// ─── Approve / Reject ────────────────────────────────────────────────────────
// Status flow:
//   pending → dept_approved (dept mgr) → finance_approved (finance mgr) → paid (auto)
//                                                                        → payout_failed (auto) → finance_approved (retry)
//   Any → rejected (manual, terminal)
exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body; // status: 'approved' | 'rejected'
  const user = req.session.user;

  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if (status === 'rejected' && !reason) return res.status(400).json({ error: 'Rejection reason is required' });

  try {
    const result = await db.query('SELECT dept_id, status FROM expenses WHERE expense_id=$1 AND deleted=false', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Expense not found' });
    const expense = result.rows[0];

    let newStatus = status === 'rejected' ? 'rejected' : null;
    let action = null;

    if (user.role === 'dept_manager') {
      // Dept Manager: pending → dept_approved, or pending → rejected
      if (expense.status !== 'pending') return res.status(400).json({ error: 'Dept Manager can only update pending expenses' });
      if (expense.dept_id !== user.dept_id) return res.status(403).json({ error: 'Forbidden: Different department' });
      if (status === 'approved') { newStatus = 'dept_approved'; action = 'DEPT_APPROVE'; }
      else { action = 'DEPT_REJECT'; }
    } else if (user.role === 'finance_manager') {
      // Finance Manager:
      //   dept_approved → finance_approved (first approval)
      //   payout_failed → finance_approved (retry after fix)
      //   dept_approved / payout_failed → rejected (manual reject)
      if (status === 'approved') {
        if (!['dept_approved', 'payout_failed'].includes(expense.status)) {
          return res.status(400).json({ error: 'Finance Manager can only approve dept_approved or payout_failed expenses' });
        }
        newStatus = 'finance_approved';
        action = 'FINANCE_APPROVE';
      } else {
        // Reject
        if (!['dept_approved', 'payout_failed'].includes(expense.status)) {
          return res.status(400).json({ error: 'Finance Manager can only reject dept_approved or payout_failed expenses' });
        }
        action = 'FINANCE_REJECT';
      }
    } else {
      return res.status(403).json({ error: 'Forbidden: Unauthorized role' });
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'UPDATE expenses SET status=$1, rejection_reason=$2, rejected_by_role=$3, updated_at=NOW() WHERE expense_id=$4',
        [newStatus, status === 'rejected' ? reason : null, status === 'rejected' ? user.role : null, id]
      );
      await logAction(client, {
        expense_id: id,
        action,
        actor_id: user.user_id,
        metadata: { from_status: expense.status, to_status: newStatus, reason: reason || null }
      });
      await client.query('COMMIT');
      res.json({ message: `Expense status updated to ${newStatus}`, newStatus });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally { client.release(); }
  } catch (err) {
    console.error('Update Status Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── Verify Expense Integrity (for payout) ────────────────────────────────────
exports.verifyExpense = async (req, res) => {
  const { id } = req.params;
  const user = req.session.user;

  try {
    const result = await db.query(
      `SELECT e.expense_id, e.user_id, e.dept_id, e.amount, e.layer2_ciphertext,
              e.digital_signature, e.file_hash, e.prev_hash, e.hash, e.created_at,
              u.bank_name, u.bank_account_no, u.account_holder_name
       FROM expenses e
       JOIN users u ON e.user_id = u.user_id
       WHERE e.expense_id = $1 AND e.deleted = false`, [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Expense not found' });
    const expense = result.rows[0];

    const verification = {
      signature_valid: false,
      signature_detail: null,
      hash_chain_valid: false,
      hash_chain_detail: null,
      submitter_has_bank_info: !!(expense.bank_name && expense.bank_account_no && expense.account_holder_name)
    };

    // ── 1. Digital Signature Re-verification ──
    try {
      // Decrypt Layer 2 to reconstruct the original signed payload
      const decrypted = JSON.parse(decryptSystem(expense.layer2_ciphertext));
      const { layer1_ciphertext, pattern } = decrypted;

      const payloadToSign = JSON.stringify({
        layer1_ciphertext,
        pattern,
        file_hash: expense.file_hash
      });
      const sigBuffer = Buffer.from(expense.digital_signature, 'base64');

      // Fetch all active public keys for the submitter
      const keysRes = await db.query(
        'SELECT public_key_pem FROM user_public_keys WHERE user_id = $1 AND is_active = TRUE',
        [expense.user_id]
      );

      let sigVerified = false;
      for (const row of keysRes.rows) {
        try {
          sigVerified = crypto.verify(
            'sha256',
            Buffer.from(payloadToSign),
            { key: row.public_key_pem, padding: crypto.constants.RSA_PKCS1_PADDING },
            sigBuffer
          );
          if (sigVerified) break;
        } catch (_) { /* try next key */ }
      }
      verification.signature_valid = sigVerified;
      if (!sigVerified) {
        verification.signature_detail = 'Digital signature does not match any active device key for this user.';
      }
    } catch (e) {
      verification.signature_valid = false;
      verification.signature_detail = `Signature verification error: ${e.message}`;
    }

    // ── 2. Hash Chain Integrity ──
    try {
      const computedHash = calculateExpenseHash(
        expense.expense_id,
        expense.prev_hash,
        expense.amount,
        expense.dept_id,
        new Date(expense.created_at)
      );

      if (computedHash !== expense.hash) {
        verification.hash_chain_valid = false;
        verification.hash_chain_detail = 'Expense hash does not match recomputed value. Data may have been tampered with.';
      } else {
        // Verify chain link: prev_hash must match previous expense's hash (or genesis)
        const prevRes = await db.query(
          'SELECT hash FROM expenses WHERE created_at < $1 AND deleted = false ORDER BY created_at DESC LIMIT 1',
          [expense.created_at]
        );

        if (prevRes.rows.length === 0) {
          // This is the first expense — prev_hash must be genesis
          if (expense.prev_hash !== GENESIS_HASH) {
            verification.hash_chain_valid = false;
            verification.hash_chain_detail = 'First expense does not reference genesis hash.';
          } else {
            verification.hash_chain_valid = true;
          }
        } else {
          if (expense.prev_hash !== prevRes.rows[0].hash) {
            verification.hash_chain_valid = false;
            verification.hash_chain_detail = 'Hash chain broken: prev_hash does not match the previous expense hash.';
          } else {
            verification.hash_chain_valid = true;
          }
        }
      }
    } catch (e) {
      verification.hash_chain_valid = false;
      verification.hash_chain_detail = `Hash chain verification error: ${e.message}`;
    }

    // Log the verification
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await logAction(client, {
        expense_id: id,
        action: 'VERIFY_PAYOUT',
        actor_id: user.user_id,
        metadata: verification
      });
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); }
    finally { client.release(); }

    res.json(verification);
  } catch (err) {
    console.error('Verify Expense Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── Cancel Payout (revert finance_approved → dept_approved, before payout runs) ─
exports.cancelPayout = async (req, res) => {
  const { id } = req.params;
  const user = req.session.user;

  try {
    const result = await db.query(
      'SELECT expense_id, status FROM expenses WHERE expense_id = $1 AND deleted = false', [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Expense not found' });
    const expense = result.rows[0];

    if (expense.status !== 'finance_approved') {
      return res.status(400).json({ error: 'Payout can only be cancelled for finance_approved expenses' });
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        "UPDATE expenses SET status='dept_approved', updated_at=NOW(), rejection_reason=NULL, rejected_by_role=NULL WHERE expense_id=$1",
        [id]
      );
      await logAction(client, {
        expense_id: id,
        action: 'CANCEL_PAYOUT',
        actor_id: user.user_id,
        metadata: { from_status: 'finance_approved', to_status: 'dept_approved' }
      });
      await client.query('COMMIT');
      res.json({ message: 'Payout cancelled. Expense reverted to dept_approved.', newStatus: 'dept_approved' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally { client.release(); }
  } catch (err) {
    console.error('Cancel Payout Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── Payout Success (finance_approved → paid) ─────────────────────────────────
exports.payoutSuccess = async (req, res) => {
  const { id } = req.params;
  const user = req.session.user;

  try {
    const result = await db.query(
      'SELECT expense_id, status FROM expenses WHERE expense_id = $1 AND deleted = false', [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Expense not found' });
    const expense = result.rows[0];

    if (expense.status !== 'finance_approved') {
      return res.status(400).json({ error: 'Payout success can only be recorded for finance_approved expenses' });
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        "UPDATE expenses SET status='paid', updated_at=NOW() WHERE expense_id=$1",
        [id]
      );
      await logAction(client, {
        expense_id: id,
        action: 'PAYOUT_SUCCESS',
        actor_id: user.user_id,
        metadata: { from_status: 'finance_approved', to_status: 'paid' }
      });
      await client.query('COMMIT');
      res.json({ message: 'Payout completed successfully.', newStatus: 'paid' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally { client.release(); }
  } catch (err) {
    console.error('Payout Success Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── Fail Payout (finance_approved → payout_failed, auto-set by system) ─────────
// Called by frontend when payout verification fails or submitter has no bank info.
// Sets status to 'payout_failed' — retryable, not terminal like 'rejected'.
exports.failPayout = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = req.session.user;

  if (!reason) return res.status(400).json({ error: 'Failure reason is required' });

  try {
    const result = await db.query(
      'SELECT expense_id, status FROM expenses WHERE expense_id = $1 AND deleted = false', [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Expense not found' });
    const expense = result.rows[0];

    if (expense.status !== 'finance_approved') {
      return res.status(400).json({ error: 'Payout failure can only be recorded for finance_approved expenses' });
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        "UPDATE expenses SET status='payout_failed', rejection_reason=$1, rejected_by_role=NULL, updated_at=NOW() WHERE expense_id=$2",
        [reason, id]
      );
      await logAction(client, {
        expense_id: id,
        action: 'FAIL_PAYOUT',
        actor_id: user.user_id,
        metadata: { from_status: 'finance_approved', to_status: 'payout_failed', reason }
      });
      await client.query('COMMIT');
      res.json({ message: 'Payout failed.', newStatus: 'payout_failed' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally { client.release(); }
  } catch (err) {
    console.error('Fail Payout Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
