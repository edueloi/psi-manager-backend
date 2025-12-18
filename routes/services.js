import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const toNull = (v) => (v === undefined || v === '' ? null : v);

router.get('/', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM services WHERE tenant_id = ? ORDER BY id DESC`,
    [req.user.tenant_id]
  );
  res.json(rows);
});

router.get('/:id', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM services WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Servico nao encontrado' });
  res.json(rows[0]);
});

router.post('/', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.name) return res.status(400).json({ error: 'name e obrigatorio' });

  const [result] = await pool.query(
    `INSERT INTO services
     (tenant_id, name, category, duration, price, cost, color, modality, description, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.tenant_id,
      data.name,
      toNull(data.category),
      data.duration ?? 50,
      data.price ?? 0,
      data.cost ?? 0,
      toNull(data.color),
      data.modality ?? 'presencial',
      toNull(data.description),
      data.is_active ?? 1
    ]
  );

  res.status(201).json({ message: 'Servico criado', id: result.insertId });
});

router.put('/:id', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.name) return res.status(400).json({ error: 'name e obrigatorio' });

  const [result] = await pool.query(
    `UPDATE services SET
      name=?, category=?, duration=?, price=?, cost=?, color=?, modality=?,
      description=?, is_active=?
     WHERE id=? AND tenant_id=?`,
    [
      data.name,
      toNull(data.category),
      data.duration ?? 50,
      data.price ?? 0,
      data.cost ?? 0,
      toNull(data.color),
      data.modality ?? 'presencial',
      toNull(data.description),
      data.is_active ?? 1,
      req.params.id,
      req.user.tenant_id
    ]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Servico nao encontrado' });
  res.json({ message: 'Servico atualizado' });
});

router.delete('/:id', authenticate, async (req, res) => {
  const [result] = await pool.query(
    `DELETE FROM services WHERE id=? AND tenant_id=?`,
    [req.params.id, req.user.tenant_id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Servico nao encontrado' });
  res.json({ message: 'Servico removido' });
});

export default router;
