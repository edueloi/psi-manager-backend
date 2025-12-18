import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/finance/summary', authenticate, async (req, res) => {
  const { from, to } = req.query || {};
  const params = [req.user.tenant_id];
  let whereSql = 'tenant_id = ?';
  if (from) {
    whereSql += ' AND created_at >= ?';
    params.push(from);
  }
  if (to) {
    whereSql += ' AND created_at <= ?';
    params.push(to);
  }

  const [[payments]] = await pool.query(
    `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
     FROM payments WHERE ${whereSql} AND status = 'paid'`,
    params
  );
  const [[pending]] = await pool.query(
    `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
     FROM payments WHERE ${whereSql} AND status = 'pending'`,
    params
  );
  const [[comandas]] = await pool.query(
    `SELECT COUNT(*) AS count, COALESCE(SUM(total_value), 0) AS total
     FROM comandas WHERE ${whereSql}`,
    params
  );

  res.json({
    payments_paid: payments,
    payments_pending: pending,
    comandas
  });
});

router.get('/finance/monthly', authenticate, async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const [rows] = await pool.query(
    `SELECT MONTH(created_at) AS month, COALESCE(SUM(amount), 0) AS total
     FROM payments
     WHERE tenant_id = ? AND status = 'paid' AND YEAR(created_at) = ?
     GROUP BY MONTH(created_at)
     ORDER BY MONTH(created_at)`,
    [req.user.tenant_id, year]
  );
  res.json(rows);
});

export default router;
