const { blake2b } = require('@noble/hashes/blake2.js');
const db = require('../config/db');

// Genesis hash (64 zeros)
const GENESIS_HASH = '0'.repeat(64);

// Convert Uint8Array to hex string
function toHex(uint8arr) {
  return Array.from(uint8arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Calculate the BLAKE2b hash for an expense
// blake2b only accepts Uint8Array — encode the string first
function calculateExpenseHash(expenseId, prevHash, amount, deptId, createdAt) {
  const payload = `${expenseId}|${prevHash}|${amount}|${deptId}|${createdAt.toISOString()}`;
  const hash = blake2b(new TextEncoder().encode(payload), { dkLen: 32 }); // 32 bytes = 64 hex chars
  return toHex(hash);
}

// Get the previous hash from the expenses table
async function getPrevExpenseHash(client) {
  const res = await client.query(
    'SELECT hash FROM expenses ORDER BY created_at DESC LIMIT 1'
  );
  return res.rows.length === 0 ? GENESIS_HASH : res.rows[0].hash;
}

// Calculate the BLAKE2b hash for an audit log entry
function calculateAuditHash(logId, prevHash, action, actorId, timestamp) {
  const payload = `${logId}|${prevHash}|${action}|${actorId}|${timestamp.toISOString()}`;
  const hash = blake2b(new TextEncoder().encode(payload), { dkLen: 32 });
  return toHex(hash);
}

// Get the previous hash from the audit log table
async function getPrevAuditHash(client) {
  const res = await client.query(
    'SELECT hash FROM expense_audit_log ORDER BY timestamp DESC LIMIT 1'
  );
  return res.rows.length === 0 ? GENESIS_HASH : res.rows[0].hash;
}

module.exports = {
  GENESIS_HASH,
  calculateExpenseHash,
  getPrevExpenseHash,
  calculateAuditHash,
  getPrevAuditHash
};
