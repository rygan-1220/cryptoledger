const bcrypt = require('bcrypt');
const db = require('../config/db');
const keyService = require('../services/keyService');
const { validationResult } = require('express-validator');

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { username, email, password, role, dept_id, public_key_pem, encrypted_kreal_pwd } = req.body;

  try {
    // Check if user exists
    const existing = await db.query('SELECT user_id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists', code: 'USER_EXISTS' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Insert user (encrypted_kreal_pwd is optional — only for dept members with KEK backup)
    const insertQuery = `
      INSERT INTO users (username, email, password_hash, role, dept_id, public_key_pem, encrypted_kreal_pwd)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING user_id, username, email, role, dept_id
    `;
    const result = await db.query(insertQuery, [username, email, password_hash, role, dept_id || null, public_key_pem, encrypted_kreal_pwd || null]);
    const user = result.rows[0];

    // Record the device's public key for signature verification history
    if (public_key_pem) {
      await db.query(
        'INSERT INTO user_public_keys (user_id, public_key_pem, device_name) VALUES ($1, $2, $3)',
        [user.user_id, public_key_pem, 'Initial registration device']
      );
    }

    let wrapped_kreal_for_user = null;

    // Distribute K_real if user belongs to a department
    if (dept_id) {
      const deptRes = await db.query('SELECT wrapped_kreal FROM departments WHERE dept_id = $1', [dept_id]);
      if (deptRes.rows.length > 0) {
        const wrappedKRealSystem = deptRes.rows[0].wrapped_kreal;
        wrapped_kreal_for_user = keyService.wrapKRealForUser(wrappedKRealSystem, public_key_pem);
      }
    }

    res.status(201).json({
      message: 'Registration successful',
      user,
      wrapped_kreal_for_user
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query(`
      SELECT u.*, d.dept_name 
      FROM users u 
      LEFT JOIN departments d ON u.dept_id = d.dept_id 
      WHERE u.email = $1
    `, [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'AUTH_FAILED' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account has been deactivated', code: 'ACCOUNT_INACTIVE' });
    }

    // Set session
    req.session.user = {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
      dept_id: user.dept_id,
      dept_name: user.dept_name
    };

    // Re-wrap K_real with user's public key so client can restore it after logout
    let wrapped_kreal_for_user = null;
    if (user.dept_id && user.public_key_pem) {
      try {
        const deptRes = await db.query('SELECT wrapped_kreal FROM departments WHERE dept_id = $1', [user.dept_id]);
        if (deptRes.rows.length > 0) {
          wrapped_kreal_for_user = keyService.wrapKRealForUser(deptRes.rows[0].wrapped_kreal, user.public_key_pem);
        }
      } catch (keyErr) {
        console.warn('K_real re-wrap failed (non-fatal):', keyErr.message);
      }
    }

    res.json({
      message: 'Login successful',
      user: req.session.user,
      settings: {
        companyName: process.env.COMPANY_NAME || 'CryptoLedger',
        workspaceId: process.env.WORKSPACE_ID || 'default'
      },
      wrapped_kreal_for_user,   // client unwraps this with their stored RSA private key (same-device)
      encrypted_kreal_pwd: user.encrypted_kreal_pwd  // fallback: password-derived KEK recovery (cross-device)
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
  }
};


exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out', code: 'LOGOUT_ERROR' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
};

exports.me = (req, res) => {
  if (req.session && req.session.user) {
    res.json({
      user: req.session.user,
      settings: {
        companyName: process.env.COMPANY_NAME || 'CryptoLedger',
        workspaceId: process.env.WORKSPACE_ID || 'default'
      }
    });
  } else {
    res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED' });
  }
};

// Store password-encrypted K_real backup on the server for cross-device recovery.
// The server receives an already-encrypted blob (AES-256-GCM with PBKDF2-derived KEK).
// The server never sees the KEK or the plaintext K_real.
exports.backupKey = async (req, res) => {
  try {
    const { encrypted_kreal_pwd } = req.body;

    if (!encrypted_kreal_pwd) {
      return res.status(400).json({ error: 'encrypted_kreal_pwd is required', code: 'MISSING_KEY' });
    }

    await db.query(
      'UPDATE users SET encrypted_kreal_pwd = $1 WHERE user_id = $2',
      [encrypted_kreal_pwd, req.session.user.user_id]
    );

    res.json({ message: 'Key backup stored successfully' });
  } catch (error) {
    console.error('Key Backup Error:', error);
    res.status(500).json({ error: 'Failed to store key backup', code: 'BACKUP_ERROR' });
  }
};

// Register a new device's signing public key.
// Each device generates its own RSA key pair for digital signatures.
// The server stores all active device public keys for signature verification.
exports.registerDevice = async (req, res) => {
  try {
    const { public_key_pem, device_name } = req.body;

    if (!public_key_pem) {
      return res.status(400).json({ error: 'public_key_pem is required', code: 'MISSING_KEY' });
    }

    // Update the user's primary public_key_pem (used for K_real wrapping on this device)
    await db.query(
      'UPDATE users SET public_key_pem = $1 WHERE user_id = $2',
      [public_key_pem, req.session.user.user_id]
    );

    // Idempotent insert into device-specific keys table for signature verification history.
    // Skip if this (user_id, public_key_pem) pair already exists.
    const existing = await db.query(
      'SELECT key_id FROM user_public_keys WHERE user_id = $1 AND public_key_pem = $2',
      [req.session.user.user_id, public_key_pem]
    );
    if (existing.rows.length === 0) {
      await db.query(
        'INSERT INTO user_public_keys (user_id, public_key_pem, device_name) VALUES ($1, $2, $3)',
        [req.session.user.user_id, public_key_pem, device_name || null]
      );
    }

    res.json({ message: 'Device registered successfully' });
  } catch (error) {
    console.error('Device Registration Error:', error);
    res.status(500).json({ error: 'Failed to register device', code: 'DEVICE_ERROR' });
  }
};
