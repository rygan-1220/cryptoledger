const db = require('../config/db');

// GET /api/audit-logs?page=1&limit=20&action=&actor_id=&from=&to=
exports.getAuditLogs = async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page)  || 1);
  const limit  = Math.min(100, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  const { action, actor_id, from, to } = req.query;
  const conditions = [];
  const params = [];

  if (action)   { params.push(action);    conditions.push(`l.action = $${params.length}`); }
  if (actor_id) { params.push(actor_id);  conditions.push(`l.actor_id = $${params.length}`); }
  if (from)     { params.push(from);      conditions.push(`l.timestamp >= $${params.length}`); }
  if (to)       { params.push(to);        conditions.push(`l.timestamp <= $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  try {
    const [data, count] = await Promise.all([
      db.query(
        `SELECT l.log_id, l.expense_id, l.action, l.actor_id, l.timestamp, l.metadata,
                l.prev_hash, l.hash, u.username AS actor_name
         FROM expense_audit_log l
         LEFT JOIN users u ON l.actor_id = u.user_id
         ${where}
         ORDER BY l.timestamp DESC
         LIMIT $${params.length-1} OFFSET $${params.length}`,
        params
      ),
      db.query(
        `SELECT COUNT(*) FROM expense_audit_log l ${where}`,
        params.slice(0, -2)
      )
    ]);
    res.json({ data: data.rows, total: parseInt(count.rows[0].count), page, limit });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
};
