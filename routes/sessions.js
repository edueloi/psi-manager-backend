import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const toNull = (v) => (v === undefined || v === '' ? null : v);

router.get('/', authenticate, async (req, res) => {
  const { patient_id, psychologist_id } = req.query || {};
  const params = [req.user.tenant_id];
  let whereSql = 's.tenant_id = ?';
  if (patient_id) {
    whereSql += ' AND s.patient_id = ?';
    params.push(patient_id);
  }
  if (psychologist_id) {
    whereSql += ' AND s.psychologist_id = ?';
    params.push(psychologist_id);
  }

  const [rows] = await pool.query(
    `SELECT s.*, p.full_name AS patient_name, u.name AS psychologist_name
     FROM sessions s
     LEFT JOIN patients p ON p.id = s.patient_id
     LEFT JOIN users u ON u.id = s.psychologist_id
     WHERE ${whereSql}
     ORDER BY s.created_at DESC`,
    params
  );
  res.json(rows);
});

router.get('/:id', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT s.*, p.full_name AS patient_name, u.name AS psychologist_name
     FROM sessions s
     LEFT JOIN patients p ON p.id = s.patient_id
     LEFT JOIN users u ON u.id = s.psychologist_id
     WHERE s.id = ? AND s.tenant_id = ?
     LIMIT 1`,
    [req.params.id, req.user.tenant_id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Sessao nao encontrada' });
  res.json(rows[0]);
});

router.post('/', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.patient_id || !data.psychologist_id) {
    return res.status(400).json({ error: 'Campos obrigatorios: patient_id, psychologist_id' });
  }

  const [result] = await pool.query(
    `INSERT INTO sessions
     (tenant_id, appointment_id, patient_id, psychologist_id, status, started_at, ended_at, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.tenant_id,
      toNull(data.appointment_id),
      data.patient_id,
      data.psychologist_id,
      data.status ?? 'pending',
      toNull(data.started_at),
      toNull(data.ended_at),
      toNull(data.notes)
    ]
  );
  res.status(201).json({ message: 'Sessao criada', id: result.insertId });
});

router.put('/:id', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.patient_id || !data.psychologist_id) {
    return res.status(400).json({ error: 'Campos obrigatorios: patient_id, psychologist_id' });
  }

  const [result] = await pool.query(
    `UPDATE sessions SET
      appointment_id=?, patient_id=?, psychologist_id=?, status=?, started_at=?, ended_at=?, notes=?
     WHERE id=? AND tenant_id=?`,
    [
      toNull(data.appointment_id),
      data.patient_id,
      data.psychologist_id,
      data.status ?? 'pending',
      toNull(data.started_at),
      toNull(data.ended_at),
      toNull(data.notes),
      req.params.id,
      req.user.tenant_id
    ]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Sessao nao encontrada' });
  res.json({ message: 'Sessao atualizada' });
});

router.delete('/:id', authenticate, async (req, res) => {
  const [result] = await pool.query(
    `DELETE FROM sessions WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Sessao nao encontrada' });
  res.json({ message: 'Sessao removida' });
});

export default router;
