const crypto = require('crypto');
const db = require('../config/db');
const { calculateExpenseHash } = require('../services/hashChain');
const { buildMTTBA } = require('../services/merkleService');
const { logAction } = require('../services/auditService');

// POST /api/integrity/verify-chain
exports.verifyChain = async (req, res) => {
  const user = req.session.user;
  try {
    const result = await db.query(
      `SELECT expense_id, amount, dept_id, prev_hash, hash, created_at
       FROM expenses
       ORDER BY created_at ASC`  // include deleted records intentionally
    );
    const records = result.rows;

    if (records.length === 0) return res.json({ valid: true, checked: 0, message: 'No records to verify' });

    // Verify first record uses genesis hash
    const GENESIS = '0'.repeat(64);
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const expectedHash = calculateExpenseHash(r.expense_id, r.prev_hash, r.amount, r.dept_id, new Date(r.created_at));

      // Check self-hash integrity
      if (expectedHash !== r.hash) {
        return res.json({
          valid: false,
          checked: i + 1,
          broken_at: r.expense_id,
          reason: `Hash mismatch at record ${i + 1}`
        });
      }

      // Check chain link (prev_hash must match previous record's hash)
      if (i === 0) {
        if (r.prev_hash !== GENESIS) {
          return res.json({
            valid: false, checked: 1, broken_at: r.expense_id,
            reason: 'First record does not reference genesis hash'
          });
        }
      } else {
        if (r.prev_hash !== records[i - 1].hash) {
          return res.json({
            valid: false, checked: i + 1, broken_at: r.expense_id,
            reason: `Chain broken at record ${i + 1}: prev_hash mismatch`
          });
        }
      }
    }

    // Log the verification
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await logAction(client, {
        expense_id: null,
        action: 'VERIFY',
        actor_id: user.user_id,
        metadata: { checked: records.length, result: 'valid' }
      });
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); }
    finally { client.release(); }

    res.json({ valid: true, checked: records.length });
  } catch (err) {
    console.error('Chain verify error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/integrity/create-merkle-checkpoint
exports.createMerkleCheckpoint = async (req, res) => {
  const user = req.session.user;
  try {
    // Get all expenses not yet covered by a checkpoint
    const lastRoot = await db.query(
      `SELECT end_expense_id, created_at FROM merkle_roots ORDER BY created_at DESC LIMIT 1`
    );

    let sinceDate = new Date(0); // beginning of time if no checkpoints
    if (lastRoot.rows.length > 0) {
      // Get the created_at of the last checkpointed expense
      const lastExp = await db.query(
        `SELECT created_at FROM expenses WHERE expense_id=$1`,
        [lastRoot.rows[0].end_expense_id]
      );
      if (lastExp.rows.length > 0) sinceDate = new Date(lastExp.rows[0].created_at);
    }

    const result = await db.query(
      `SELECT expense_id, hash FROM expenses WHERE created_at > $1 ORDER BY created_at ASC`,
      [sinceDate]
    );
    const batch = result.rows;
    if (batch.length === 0) return res.status(400).json({ error: 'No new records to checkpoint' });

    const hashes = batch.map(r => r.hash);
    const rootHash = buildMTTBA(hashes);
    const rootId = crypto.randomUUID();

    await db.query(
      `INSERT INTO merkle_roots (root_id, root_hash, start_expense_id, end_expense_id, record_count, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [rootId, rootHash, batch[0].expense_id, batch[batch.length - 1].expense_id, batch.length, user.user_id]
    );

    res.status(201).json({ root_id: rootId, root_hash: rootHash, record_count: batch.length });
  } catch (err) {
    console.error('Merkle checkpoint error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/integrity/merkle-roots
exports.getMerkleRoots = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.*, u.username AS created_by_name
       FROM merkle_roots r
       LEFT JOIN users u ON r.created_by = u.user_id
       ORDER BY r.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
};

// POST /api/integrity/verify-merkle/:root_id
exports.verifyMerkle = async (req, res) => {
  const { root_id } = req.params;
  try {
    const rootRes = await db.query('SELECT * FROM merkle_roots WHERE root_id=$1', [root_id]);
    if (!rootRes.rows.length) return res.status(404).json({ error: 'Merkle root not found' });
    const root = rootRes.rows[0];

    // Fetch same batch of expenses in same order
    const batchRes = await db.query(
      `SELECT expense_id, hash, created_at FROM expenses
       WHERE created_at >= (SELECT created_at FROM expenses WHERE expense_id=$1)
         AND created_at <= (SELECT created_at FROM expenses WHERE expense_id=$2)
       ORDER BY created_at ASC`,
      [root.start_expense_id, root.end_expense_id]
    );

    const hashes = batchRes.rows.map(r => r.hash);
    const recomputedRoot = buildMTTBA(hashes);
    const valid = recomputedRoot === root.root_hash;

    res.json({ valid, root_id, stored_root: root.root_hash, recomputed_root: recomputedRoot, record_count: hashes.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
};
