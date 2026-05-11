const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on('error', (err) => {
  console.error('Unexpected idle client error', err);
  process.exit(-1);
});

module.exports = {
  query:     (text, params) => pool.query(text, params),
  connect:   ()             => pool.connect(),   // returns a client for transactions
};
