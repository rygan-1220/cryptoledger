const { Pool } = require('pg');
require('dotenv').config();

let pool = null;

function initPool(connectionString) {
  if (pool) {
    pool.end();
  }
  pool = new Pool({ connectionString });
  pool.on('error', (err) => {
    console.error('Unexpected idle client error', err);
  });
}

// Initialize with current env if available
if (process.env.DATABASE_URL) {
  initPool(process.env.DATABASE_URL);
}

module.exports = {
  query: (text, params) => {
    if (!pool) throw new Error('Database pool not initialized');
    return pool.query(text, params);
  },
  connect: () => {
    if (!pool) throw new Error('Database pool not initialized');
    return pool.connect();
  },
  initPool,
  getPool: () => pool
};
