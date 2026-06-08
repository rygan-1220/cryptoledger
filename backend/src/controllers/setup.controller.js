const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const redisClient = require('../config/redis');

// Generate a simple 12-word recovery phrase (simplified for example)
const generateRecoveryPhrase = () => {
  const words = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima', 'mike', 'november', 'oscar', 'papa', 'quebec', 'romeo', 'sierra', 'tango', 'uniform', 'victor', 'whiskey', 'xray', 'yankee', 'zulu'];
  const phrase = [];
  for (let i = 0; i < 12; i++) {
    phrase.push(words[crypto.randomInt(0, words.length)]);
  }
  return phrase.join(' ');
};

exports.getStatus = (req, res) => {
  // .env file must exist on disk AND contain K_SYSTEM + DATABASE_URL
  const fs = require('fs');
  const path = require('path');
  const envExists = fs.existsSync(path.join(__dirname, '../../.env'));
  const isInitialized = envExists && !!process.env.K_SYSTEM && !!process.env.DATABASE_URL;
  res.json({
    isInitialized,
    defaults: {
      dbUrl: 'postgresql://cryptoledger:password@localhost:5432/cryptoledger_db',
      redisUrl: 'redis://localhost:6379'
    }
  });
};

exports.ignite = async (req, res) => {
  const { companyName, workspaceId, adminName, adminEmail, password, departments, rsaPublicKey, dbUrl, redisUrl, sessionTtl, enableRateLimit } = req.body;

  try {
    // 1. Initialize DB and Redis temporarily
    db.initPool(dbUrl);
    redisClient.initRedis(redisUrl);

    // 2. Run Database schema (Migrations)
    const migrationsDir = path.join(__dirname, '../../../database/migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
      for (const file of files) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await db.query(sql);
      }
    } else {
      throw new Error("Migrations directory not found at " + migrationsDir);
    }

    const client = await db.connect();
    let wrappedManagementKey = null;
    let recoveryPhrase = null;
    let invites = [];

    const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    try {
      await client.query('BEGIN');

      // Clear existing setup if any (just in case)
      await client.query('TRUNCATE users, departments, expenses, expense_audit_log CASCADE');

      // 3. Generate K_system
      const K_system = crypto.randomBytes(32).toString('base64');
      process.env.K_SYSTEM = K_system; // Set it temporarily for this request

      const { encryptSystem } = require('../services/cryptoService');

      // 4. Create Departments & Generate K_real
      const deptResults = [];
      const allDepts = [...new Set(['Operations', ...departments])];

      let opsDeptId = null;

      for (const deptName of allDepts) {
        const deptId = crypto.randomUUID();
        const k_real = crypto.randomBytes(32).toString('hex');

        // Encrypt K_real with K_system
        const wrappedKReal = encryptSystem(k_real);

        await client.query(
          'INSERT INTO departments (dept_id, dept_name, wrapped_kreal) VALUES ($1, $2, $3)',
          [deptId, deptName, wrappedKReal]
        );

        deptResults.push({ deptId, deptName, k_real });
        if (deptName.toLowerCase() === 'operations') opsDeptId = deptId;
      }

      // 5. Wrap Operations K_real for the Admin
      const opsKReal = deptResults.find(d => d.deptId === opsDeptId).k_real;
      const publicKeyObj = crypto.createPublicKey({ key: rsaPublicKey, format: 'pem' });
      wrappedManagementKey = crypto.publicEncrypt({
        key: publicKeyObj,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      }, Buffer.from(opsKReal, 'hex')).toString('base64');

      // 6. Create Genesis Admin
      const adminId = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(password, 12);
      await client.query(
        'INSERT INTO users (user_id, username, email, password_hash, role, dept_id, public_key_pem) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [adminId, adminName, adminEmail, passwordHash, 'admin', opsDeptId, rsaPublicKey]
      );

      // 7. Generate invites for Genesis Managers
      invites = [];
      if (req.body.managers && Array.isArray(req.body.managers)) {
        for (let i = 0; i < req.body.managers.length; i++) {
          const mgr = req.body.managers[i];
          const dept = deptResults.find(d => d.deptName === allDepts[i + 1]); // +1 because Ops is index 0
          if (!dept || !mgr.email) continue;

          const token = crypto.randomBytes(32).toString('hex');
          const invitation = { email: mgr.email, username: mgr.name, role: 'dept_manager', dept_id: dept.deptId, invited_by: adminId };

          await redisClient.initRedis(redisUrl).set(`invite:${token}`, JSON.stringify(invitation), 'EX', 7 * 24 * 60 * 60);

          const inviteLink = `${frontendOrigin}/setup-account?token=${token}`;
          invites.push({ deptName: dept.deptName, email: mgr.email, link: inviteLink });
        }
      }

      // 8. Generate Recovery Phrase
      recoveryPhrase = generateRecoveryPhrase();

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    // Set in memory for current process
    process.env.COMPANY_NAME = companyName || 'CryptoLedger';
    process.env.WORKSPACE_ID = workspaceId || 'default';
    process.env.FRONTEND_ORIGIN = 'http://localhost:5173'; // Default for dev setup

    // Convert ms -> seconds for express-session, with fallback
    const sessionTtlSeconds = sessionTtl ? Math.floor(sessionTtl / 1000) : 3600;
    const rateLimitEnabled = enableRateLimit !== false;
    const envPath = path.join(__dirname, '../../.env');

    const envContent = `PORT=3001
DATABASE_URL=${dbUrl}
REDIS_URL=${redisUrl}
SESSION_SECRET=${crypto.randomBytes(32).toString('base64')}
SESSION_TTL=${sessionTtlSeconds}
SESSION_REMEMBER_TTL=604800
K_SYSTEM=${process.env.K_SYSTEM}
K_SESSION_TTL=${sessionTtlSeconds}
FRONTEND_ORIGIN=http://localhost:5173
NODE_ENV=development
ENABLE_RATE_LIMIT=${rateLimitEnabled}
COMPANY_NAME=${companyName || 'CryptoLedger'}
WORKSPACE_ID=${workspaceId || 'default'}
`;
    fs.writeFileSync(envPath, envContent);

    res.json({
      message: 'System ignited successfully.',
      wrapped_management_key: wrappedManagementKey,
      recoveryPhrase,
      invites // <-- Return the invites
    });
  } catch (err) {
    console.error('Ignite Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error during ignition' });
  }
};
