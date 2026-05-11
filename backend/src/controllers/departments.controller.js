const db = require('../config/db');

exports.getDepartments = async (req, res) => {
  try {
    const result = await db.query('SELECT dept_id, dept_name FROM departments ORDER BY dept_name ASC');
    res.json({ departments: result.rows });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
