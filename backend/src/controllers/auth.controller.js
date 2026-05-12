const bcrypt = require('bcrypt');
const db = require('../config/db');
const keyService = require('../services/keyService');
const { validationResult } = require('express-validator');

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { username, email, password, role, dept_id, public_key_pem } = req.body;

  try {
    // Check if user exists
    const existing = await db.query('SELECT user_id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists', code: 'USER_EXISTS' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Insert user
    const insertQuery = `
      INSERT INTO users (username, email, password_hash, role, dept_id, public_key_pem)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING user_id, username, email, role, dept_id
    `;
    const result = await db.query(insertQuery, [username, email, password_hash, role, dept_id || null, public_key_pem]);
    const user = result.rows[0];

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
      wrapped_kreal_for_user   // client unwraps this with their stored RSA private key
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
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ error: 'Not authenticated', code: 'UNAUTHORIZED' });
  }
};
