import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const toNull = (v) => (v === undefined || v === '' ? null : v);

router.get('/', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT p.*, pt.full_name AS patient_name
     FROM payments p
     LEFT JOIN patients pt ON pt.id = p.patient_id
     WHERE p.tenant_id = ?
     ORDER BY p.id DESC`,
    [req.user.tenant_id]
  );
  res.json(rows);
});

router.get('/:id', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM payments WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Pagamento nao encontrado' });
  res.json(rows[0]);
});

router.post('/', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.patient_id || !data.amount || !data.payment_type) {
    return res.status(400).json({ error: 'Campos obrigatorios: patient_id, amount, payment_type' });
  }

  const [result] = await pool.query(
    `INSERT INTO payments
     (tenant_id, patient_id, appointment_id, service_id, amount, payment_type, status, paid_at, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.tenant_id,
      data.patient_id,
      toNull(data.appointment_id),
      toNull(data.service_id),
      data.amount,
      data.payment_type,
      data.status ?? 'pending',
      toNull(data.paid_at),
      toNull(data.notes)
    ]
  );

  res.status(201).json({ message: 'Pagamento criado', id: result.insertId });
});

router.put('/:id', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.patient_id || !data.amount || !data.payment_type) {
    return res.status(400).json({ error: 'Campos obrigatorios: patient_id, amount, payment_type' });
  }

  const [result] = await pool.query(
    `UPDATE payments SET
      patient_id=?, appointment_id=?, service_id=?, amount=?, payment_type=?,
      status=?, paid_at=?, notes=?
     WHERE id=? AND tenant_id=?`,
    [
      data.patient_id,
      toNull(data.appointment_id),
      toNull(data.service_id),
      data.amount,
      data.payment_type,
      data.status ?? 'pending',
      toNull(data.paid_at),
      toNull(data.notes),
      req.params.id,
      req.user.tenant_id
    ]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Pagamento nao encontrado' });
  res.json({ message: 'Pagamento atualizado' });
});

router.delete('/:id', authenticate, async (req, res) => {
  const [result] = await pool.query(
    `DELETE FROM payments WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Pagamento nao encontrado' });
  res.json({ message: 'Pagamento removido' });
});

export default router;
