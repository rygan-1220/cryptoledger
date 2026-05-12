const crypto = require('crypto');
const db = require('../config/db');
const redisClient = require('../config/redis');
const bcrypt = require('bcrypt');

// Invite User (Admin/Manager only)
exports.inviteUser = async (req, res) => {
  const { email, username, role, dept_id } = req.body;
  const actor = req.session.user;

  // RBAC check: Dept Manager can only invite 'employee' and only for their own dept
  if (actor.role === 'dept_manager') {
    if (role !== 'employee') return res.status(403).json({ error: 'Dept Managers can only invite employees' });
    if (dept_id !== actor.dept_id) return res.status(403).json({ error: 'Dept Managers can only invite users to their own department' });
  }

  try {
    // Force 'Operations' for Admin/CEO/Finance Manager
    let finalDeptId = dept_id;
    if (['admin', 'ceo', 'finance_manager'].includes(role)) {
      const opsDept = await db.query('SELECT dept_id FROM departments WHERE dept_name ILIKE $1', ['Operations']);
      if (opsDept.rows.length) {
        finalDeptId = opsDept.rows[0].dept_id;
      }
    }

    // Check if user already exists
    const exists = await db.query('SELECT user_id FROM users WHERE email=$1 OR username=$2', [email, username]);
    if (exists.rows.length) return res.status(400).json({ error: 'User already exists with this email or username' });

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const invitation = { email, username, role, dept_id: finalDeptId, invited_by: actor.user_id };

    // Store in Redis (7 days)
    await redisClient.set(`invite:${token}`, JSON.stringify(invitation), 'EX', 7 * 24 * 60 * 60);

    const inviteLink = `${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}/setup-account?token=${token}`;
    res.json({ message: 'Invitation created', inviteLink, token });
  } catch (err) {
    console.error('Invite Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Validate Token
exports.validateInvite = async (req, res) => {
  const { token } = req.params;
  try {
    const data = await redisClient.get(`invite:${token}`);
    if (!data) return res.status(404).json({ error: 'Invitation link invalid or expired' });
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Finalize Setup (Set password + public key)
exports.setupAccount = async (req, res) => {
  const { token, password, public_key_pem } = req.body;
  try {
    const dataStr = await redisClient.get(`invite:${token}`);
    if (!dataStr) return res.status(400).json({ error: 'Invalid or expired token' });
    
    const invite = JSON.parse(dataStr);
    const password_hash = await bcrypt.hash(password, 12);
    
    await db.query(
      `INSERT INTO users (user_id, username, email, password_hash, role, dept_id, public_key_pem)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [crypto.randomUUID(), invite.username, invite.email, password_hash, invite.role, invite.dept_id, public_key_pem]
    );

    await redisClient.del(`invite:${token}`);
    res.json({ message: 'Account created successfully. You can now login.' });
  } catch (err) {
    console.error('Setup Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// List Users
exports.listUsers = async (req, res) => {
  const actor = req.session.user;
  try {
    let query = `
      SELECT u.user_id, u.username, u.email, u.role, u.is_active, d.dept_name as department_name, u.created_at
      FROM users u
      LEFT JOIN departments d ON u.dept_id = d.dept_id
    `;
    const params = [];

    if (actor.role === 'dept_manager') {
      query += ' WHERE u.dept_id = $1';
      params.push(actor.dept_id);
    }

    query += ' ORDER BY u.created_at DESC';

    const result = await db.query(query, params);
    const users = result.rows.map(u => ({
      ...u,
      status: u.is_active ? 'active' : 'inactive'
    }));

    // Fetch pending invites from Redis
    const keys = await redisClient.keys('invite:*');
    if (keys && keys.length > 0) {
      const invitesStr = await redisClient.mget(...keys);
      for (let i = 0; i < keys.length; i++) {
        const inviteStr = invitesStr[i];
        if (!inviteStr) continue;
        const invite = JSON.parse(inviteStr);
        
        // Filter out invites not belonging to dept_manager's department
        if (actor.role === 'dept_manager' && invite.dept_id !== actor.dept_id) continue;

        // Fetch department name for the invite
        let deptName = 'Unknown';
        if (invite.dept_id) {
          const deptRes = await db.query('SELECT dept_name FROM departments WHERE dept_id = $1', [invite.dept_id]);
          if (deptRes.rows.length > 0) deptName = deptRes.rows[0].dept_name;
        }

        users.push({
          user_id: `pending-${crypto.randomUUID()}`, // dummy ID for the list
          username: invite.username,
          email: invite.email,
          role: invite.role,
          department_name: deptName,
          status: 'pending_invite',
          created_at: null,
          is_active: false,
          invite_link: `${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}/setup-account?token=${keys[i].replace('invite:', '')}`
        });
      }
    }

    res.json(users);
  } catch (err) {
    console.error('List Users Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Toggle Active Status
exports.toggleActive = async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  const actor = req.session.user;

  try {
    const userRes = await db.query('SELECT dept_id, role FROM users WHERE user_id = $1', [id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const targetUser = userRes.rows[0];

    // Dept Managers can only toggle employees in their department
    if (actor.role === 'dept_manager') {
      if (targetUser.dept_id !== actor.dept_id) {
        return res.status(403).json({ error: 'Cannot modify user from another department' });
      }
      if (targetUser.role !== 'employee') {
        return res.status(403).json({ error: 'Dept Managers can only modify employees' });
      }
    }

    // Admins cannot deactivate themselves
    if (id === actor.user_id && is_active === false) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    await db.query('UPDATE users SET is_active = $1 WHERE user_id = $2', [is_active, id]);
    res.json({ message: `User account has been ${is_active ? 'activated' : 'deactivated'}` });
  } catch (err) {
    console.error('Toggle Active Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
