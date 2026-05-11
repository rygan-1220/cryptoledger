const crypto = require('crypto');
const db = require('../config/db');
const { encryptSystem } = require('../services/cryptoService');
const { getPrevExpenseHash, calculateExpenseHash } = require('../services/hashChain');
const { logAction } = require('../services/auditService');
const { validationResult } = require('express-validator');

exports.submitExpense = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const {
    layer1_ciphertext,   // { iv, authTag, ciphertext } — encrypts vendor_name + description
    pattern,             // { amount, project_id, dept_id, category, date }
    digital_signature,   // signs JSON({ layer1_ciphertext, pattern, file_hash })
    encrypted_receipt,   // { iv, authTag, ciphertext, mime_type } — AES-GCM encrypted file
    file_hash            // SHA-256 hex of the encrypted receipt ciphertext (for verification)
  } = req.body;

  const user = req.session.user;

  try {
    // 1. Fetch user's public key
    const userRes = await db.query('SELECT public_key_pem FROM users WHERE user_id = $1', [user.user_id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const publicKeyPem = userRes.rows[0].public_key_pem;

    // 2. Verify Digital Signature
    // Client signed: JSON({ layer1_ciphertext, pattern, file_hash })
    const payloadToSign = JSON.stringify({ layer1_ciphertext, pattern, file_hash });
    const isVerified = crypto.verify(
      'sha256',
      Buffer.from(payloadToSign),
      {
        key: publicKeyPem,
        padding: crypto.constants.RSA_PKCS1_PADDING  // RSASSA-PKCS1-v1_5
      },
      Buffer.from(digital_signature, 'base64')
    );

    if (!isVerified) {
      return res.status(401).json({ error: 'Invalid digital signature', code: 'SIGNATURE_INVALID' });
    }

    // 3. Validate dept ownership
    const { amount, project_id, dept_id, category, date } = pattern;
    if (dept_id !== user.dept_id) {
      return res.status(403).json({ error: 'Cannot submit expense for a different department' });
    }

    // 4. Convert encrypted_receipt base64 ciphertext to binary Buffer
    let encryptedReceiptBuf = null;
    let fileMimeType = null;
    if (encrypted_receipt && encrypted_receipt.ciphertext) {
      // Reconstruct: [12B IV][16B authTag][ciphertext]
      const iv      = Buffer.from(encrypted_receipt.iv,       'base64');
      const authTag = Buffer.from(encrypted_receipt.authTag,  'base64');
      const ct      = Buffer.from(encrypted_receipt.ciphertext,'base64');
      encryptedReceiptBuf = Buffer.concat([iv, authTag, ct]);
      fileMimeType = encrypted_receipt.mime_type || null;
    }

    // 5. Layer 2 — wrap layer1_ciphertext + pattern with K_system (no file here)
    const combinedPayload = { layer1_ciphertext, pattern };
    const layer2Ciphertext = encryptSystem(combinedPayload);

    // 6. Database transaction
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const expenseId = crypto.randomUUID();
      const createdAt = new Date();

      const prevHash = await getPrevExpenseHash(client);
      const hash     = calculateExpenseHash(expenseId, prevHash, amount, dept_id, createdAt);

      await client.query(
        `INSERT INTO expenses
         (expense_id, user_id, dept_id, amount, project_id, category,
          layer2_ciphertext, digital_signature,
          encrypted_receipt, file_mime_type, file_hash,
          prev_hash, hash, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          expenseId, user.user_id, dept_id, amount, project_id, category,
          layer2Ciphertext, digital_signature,
          encryptedReceiptBuf, fileMimeType, file_hash || null,
          prevHash, hash, createdAt
        ]
      );

      await logAction(client, {
        expense_id: expenseId,
        action: 'CREATE',
        actor_id: user.user_id,
        metadata: { date, file_hash: file_hash || null }
      });

      await client.query('COMMIT');
      res.status(201).json({ message: 'Expense submitted securely', expense_id: expenseId });
    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Submit Expense Error:', error);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
};
