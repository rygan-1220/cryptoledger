const crypto = require('crypto');
const db = require('../config/db');
const { encryptSystem, decryptSystem } = require('../services/cryptoService');
const { getPrevExpenseHash, calculateExpenseHash } = require('../services/hashChain');
const { logAction } = require('../services/auditService');
const { validationResult } = require('express-validator');

// ─── Helpers ────────────────────────────────────────────────────────────────
const EXPENSE_COLS = `
  expense_id, user_id, dept_id, amount, project_id, category, status,
  file_mime_type, file_hash, digital_signature, prev_hash, hash,
  created_at, updated_at, deleted
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
    const userRes = await db.query('SELECT public_key_pem FROM users WHERE user_id = $1', [user.user_id]);
    if (!userRes.rows.length) return res.status(404).json({ error: 'User not found' });

    // Verify signature
    const payloadToSign = JSON.stringify({ layer1_ciphertext, pattern, file_hash });
    const isVerified = crypto.verify(
      'sha256',
      Buffer.from(payloadToSign),
      { key: userRes.rows[0].public_key_pem, padding: crypto.constants.RSA_PKCS1_PADDING },
      Buffer.from(digital_signature, 'base64')
    );
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
      db.query(`SELECT ${EXPENSE_COLS} FROM expenses WHERE user_id=$1 AND deleted=false ORDER BY created_at DESC LIMIT $2 OFFSET $3`, [user_id, limit, offset]),
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
      db.query(`SELECT ${EXPENSE_COLS} FROM expenses WHERE dept_id=$1 AND deleted=false ORDER BY created_at DESC LIMIT $2 OFFSET $3`, [dept_id, limit, offset]),
      db.query('SELECT COUNT(*) FROM expenses WHERE dept_id=$1 AND deleted=false', [dept_id])
    ]);
    res.json({ data: data.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
};

// ─── All Expenses (Finance/Admin/CEO) ───────────────────────────────────────
exports.getAllExpenses = async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const { dept_id, status, category } = req.query;
  const conditions = ['deleted=false'];
  const params = [];
  if (dept_id) { params.push(dept_id); conditions.push(`dept_id=$${params.length}`); }
  if (status)  { params.push(status);  conditions.push(`status=$${params.length}`); }
  if (category){ params.push(category);conditions.push(`category=$${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  // Build count params (same WHERE, no limit/offset)
  const countParams = params.slice(0, -2);

  try {
    const [data, count] = await Promise.all([
      db.query(`SELECT ${EXPENSE_COLS} FROM expenses ${where} ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`, params),
      db.query(`SELECT COUNT(*) FROM expenses ${where}`, countParams)
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
      `SELECT expense_id, user_id, dept_id, amount, project_id, category, status,
              layer2_ciphertext, encrypted_receipt, file_mime_type, file_hash,
              digital_signature, prev_hash, hash, created_at, updated_at, deleted
       FROM expenses WHERE expense_id=$1`, [id]
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
        rejection_reason: expense.rejection_reason
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

    if (user.role === 'dept_manager') {
      if (expense.status !== 'pending') return res.status(400).json({ error: 'Dept Manager can only update pending expenses' });
      if (expense.dept_id !== user.dept_id) return res.status(403).json({ error: 'Forbidden: Different department' });
      if (status === 'approved') newStatus = 'dept_approved';
    } else if (['finance_manager', 'admin', 'ceo'].includes(user.role)) {
      if (expense.status !== 'dept_approved' && status === 'approved') {
        return res.status(400).json({ error: 'Finance Manager can only approve dept_approved expenses' });
      }
      if (status === 'approved') newStatus = 'approved';
    } else {
      return res.status(403).json({ error: 'Forbidden: Unauthorized role' });
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'UPDATE expenses SET status=$1, rejection_reason=$2, updated_at=NOW() WHERE expense_id=$3',
        [newStatus, status === 'rejected' ? reason : null, id]
      );
      await logAction(client, {
        expense_id: id,
        action: status === 'approved' ? 'APPROVE' : 'REJECT',
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
