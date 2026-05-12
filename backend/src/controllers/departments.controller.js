const db = require('../config/db');
const crypto = require('crypto');
const { encryptSystem } = require('../services/cryptoService');

exports.getDepartments = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT d.dept_id, d.dept_name, d.created_at, COUNT(u.user_id) as user_count 
      FROM departments d
      LEFT JOIN users u ON d.dept_id = u.dept_id
      GROUP BY d.dept_id
      ORDER BY d.dept_name ASC
    `);
    res.json({ departments: result.rows });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createDepartment = async (req, res) => {
  const { dept_name } = req.body;
  if (!dept_name || typeof dept_name !== 'string' || !dept_name.trim()) {
    return res.status(400).json({ error: 'Department name is required' });
  }

  const name = dept_name.trim();

  try {
    // Check if exists
    const exists = await db.query('SELECT dept_id FROM departments WHERE dept_name ILIKE $1', [name]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Department already exists' });
    }

    const deptId = crypto.randomUUID();
    const k_real = crypto.randomBytes(32).toString('hex');
    const wrappedKReal = encryptSystem(k_real);

    await db.query(
      'INSERT INTO departments (dept_id, dept_name, wrapped_kreal) VALUES ($1, $2, $3)',
      [deptId, name, wrappedKReal]
    );

    res.status(201).json({ message: 'Department created successfully', dept_id: deptId, dept_name: name });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteDepartment = async (req, res) => {
  const { id } = req.params;
  try {
    const check = await db.query(
      'SELECT COUNT(u.user_id) as user_count FROM departments d LEFT JOIN users u ON d.dept_id = u.dept_id WHERE d.dept_id = $1 GROUP BY d.dept_id',
      [id]
    );
    if (check.rows.length === 0) return res.status(404).json({ error: 'Department not found' });
    if (parseInt(check.rows[0].user_count) > 0) {
      return res.status(409).json({ error: 'Cannot delete a department with active members' });
    }
    await db.query('DELETE FROM departments WHERE dept_id = $1', [id]);
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
