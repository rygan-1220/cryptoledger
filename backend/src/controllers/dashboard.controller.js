const db = require('../config/db');
const { logAction } = require('../services/auditService');

// GET /api/dashboard/summary
exports.getSummary = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*)                                                   AS total_count,
        COALESCE(SUM(amount), 0)                                   AS total_amount,
        COUNT(*) FILTER (WHERE status = 'pending')                 AS pending_count,
        COUNT(*) FILTER (WHERE status = 'paid')                    AS approved_count,
        COUNT(*) FILTER (WHERE status = 'rejected')                AS rejected_count,
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)    AS approved_amount
      FROM expenses
      WHERE deleted = false
    `);
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
};

// GET /api/dashboard/by-department
exports.getByDepartment = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        e.dept_id,
        d.dept_name,
        COUNT(*)                                    AS count,
        COALESCE(SUM(e.amount), 0)                  AS total_amount,
        COUNT(*) FILTER (WHERE e.status = 'pending')   AS pending,
        COUNT(*) FILTER (WHERE e.status = 'paid')      AS approved,
        COUNT(*) FILTER (WHERE e.status = 'rejected')  AS rejected
      FROM expenses e
      JOIN departments d ON e.dept_id = d.dept_id
      WHERE e.deleted = false
      GROUP BY e.dept_id, d.dept_name
      ORDER BY total_amount DESC
    `);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
};

// GET /api/dashboard/by-category
exports.getByCategory = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        category,
        COUNT(*)                   AS count,
        COALESCE(SUM(amount), 0)   AS total_amount
      FROM expenses
      WHERE deleted = false
      GROUP BY category
      ORDER BY total_amount DESC
    `);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
};

// GET /api/dashboard/by-project
exports.getByProject = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        project_id,
        COUNT(*)                   AS count,
        COALESCE(SUM(amount), 0)   AS total_amount
      FROM expenses
      WHERE deleted = false AND project_id IS NOT NULL
      GROUP BY project_id
      ORDER BY total_amount DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
};

// GET /api/dashboard/monthly-trends
exports.getMonthlyTrends = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
        COUNT(*)                 AS count,
        COALESCE(SUM(amount), 0) AS total_amount
      FROM expenses
      WHERE deleted = false
        AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
};

// GET /api/dashboard/export?format=csv|json
exports.exportReport = async (req, res) => {
  const format = req.query.format === 'csv' ? 'csv' : 'json';
  try {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(`
        SELECT
          e.expense_id, e.amount, e.category, e.project_id, e.status,
          d.dept_name,
          TO_CHAR(e.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at
        FROM expenses e
        JOIN departments d ON e.dept_id = d.dept_id
        WHERE e.deleted = false
        ORDER BY e.created_at DESC
      `);

      await logAction(client, {
        expense_id: null,
        action: 'EXPORT',
        actor_id: req.session.user.user_id,
        metadata: { format, filters: req.query }
      });

      await client.query('COMMIT');

      if (format === 'csv') {
      const headers = ['expense_id','amount','category','project_id','status','dept_name','created_at'];
      const lines = [
        headers.join(','),
        ...result.rows.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(','))
      ];
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=cryptoledger_report.csv');
      return res.send(lines.join('\n'));
    }

      res.json(result.rows);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
