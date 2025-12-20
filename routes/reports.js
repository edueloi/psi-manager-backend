import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/finance/summary', authenticate, async (req, res) => {
  const { from, to, psychologist_id, service_id } = req.query || {};
  const params = [req.user.tenant_id];
  let whereSql = 'p.tenant_id = ?';
  if (from) {
    whereSql += ' AND created_at >= ?';
    params.push(from);
  }
  if (to) {
    whereSql += ' AND created_at <= ?';
    params.push(to);
  }
  if (service_id) {
    whereSql += ' AND p.service_id = ?';
    params.push(service_id);
  }
  if (psychologist_id) {
    whereSql += ' AND a.psychologist_id = ?';
    params.push(psychologist_id);
  }

  const [[payments]] = await pool.query(
    `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
     FROM payments p
     LEFT JOIN appointments a ON a.id = p.appointment_id
     WHERE ${whereSql} AND p.status = 'paid'`,
    params
  );
  const [[pending]] = await pool.query(
    `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
     FROM payments p
     LEFT JOIN appointments a ON a.id = p.appointment_id
     WHERE ${whereSql} AND p.status = 'pending'`,
    params
  );
  const [[comandas]] = await pool.query(
    `SELECT COUNT(*) AS count, COALESCE(SUM(total_value), 0) AS total
     FROM comandas p
     LEFT JOIN patients pt ON pt.id = p.patient_id
     LEFT JOIN users u ON u.id = pt.psychologist_id
     WHERE ${whereSql}`,
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

router.get('/finance/by-service', authenticate, async (req, res) => {
  const { from, to } = req.query || {};
  const params = [req.user.tenant_id];
  let whereSql = 'p.tenant_id = ? AND p.status = \'paid\'';
  if (from) {
    whereSql += ' AND p.created_at >= ?';
    params.push(from);
  }
  if (to) {
    whereSql += ' AND p.created_at <= ?';
    params.push(to);
  }

  const [rows] = await pool.query(
    `SELECT p.service_id, s.name AS service_name, COALESCE(SUM(p.amount), 0) AS total
     FROM payments p
     LEFT JOIN services s ON s.id = p.service_id
     WHERE ${whereSql}
     GROUP BY p.service_id
     ORDER BY total DESC`,
    params
  );
  res.json(rows);
});

router.get('/finance/by-professional', authenticate, async (req, res) => {
  const { from, to } = req.query || {};
  const params = [req.user.tenant_id];
  let whereSql = 'p.tenant_id = ? AND p.status = \'paid\'';
  if (from) {
    whereSql += ' AND p.created_at >= ?';
    params.push(from);
  }
  if (to) {
    whereSql += ' AND p.created_at <= ?';
    params.push(to);
  }

  const [rows] = await pool.query(
    `SELECT a.psychologist_id, u.name AS psychologist_name, COALESCE(SUM(p.amount), 0) AS total
     FROM payments p
     LEFT JOIN appointments a ON a.id = p.appointment_id
     LEFT JOIN users u ON u.id = a.psychologist_id
     WHERE ${whereSql}
     GROUP BY a.psychologist_id
     ORDER BY total DESC`,
    params
  );
  res.json(rows);
});

export default router;
