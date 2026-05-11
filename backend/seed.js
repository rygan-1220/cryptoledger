require('dotenv').config();
const crypto = require('crypto');
const db = require('./src/config/db');
const { encryptSystem } = require('./src/services/cryptoService');

async function seed() {
  const depts = ['Engineering', 'Finance', 'Operations', 'Marketing'];
  
  for (const name of depts) {
    const check = await db.query('SELECT * FROM departments WHERE dept_name = $1', [name]);
    if (check.rows.length === 0) {
      // Generate 32-byte K_real
      const kReal = crypto.randomBytes(32).toString('hex');
      // Wrap it with K_system
      const wrappedKReal = encryptSystem(kReal);
      
      await db.query(
        'INSERT INTO departments (dept_name, wrapped_kreal) VALUES ($1, $2)',
        [name, wrappedKReal]
      );
      console.log(`Seeded department: ${name}`);
    } else {
      console.log(`Department already exists: ${name}`);
    }
  }
  
  console.log("Seeding complete.");
  process.exit(0);
}

seed().catch(console.error);
