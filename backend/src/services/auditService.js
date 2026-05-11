const crypto = require('crypto');
const { calculateAuditHash, getPrevAuditHash } = require('./hashChain');

// Appends an action to the audit log securely within a database transaction
async function logAction(client, { expense_id, action, actor_id, metadata = {} }) {
  const logId = crypto.randomUUID();
  const timestamp = new Date();
  
  // 1. Get previous hash
  const prevHash = await getPrevAuditHash(client);
  
  // 2. Compute new hash
  const hash = calculateAuditHash(logId, prevHash, action, actor_id, timestamp);
  
  // 3. Insert record
  await client.query(
    `INSERT INTO expense_audit_log (log_id, expense_id, action, actor_id, timestamp, metadata, prev_hash, hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [logId, expense_id, action, actor_id, timestamp, JSON.stringify(metadata), prevHash, hash]
  );
}

module.exports = {
  logAction
};
