import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const toNull = (v) => (v === undefined || v === '' ? null : v);

router.get('/', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM uploads WHERE tenant_id = ? ORDER BY id DESC`,
    [req.user.tenant_id]
  );
  res.json(rows);
});

router.post('/request', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.file_name) return res.status(400).json({ error: 'file_name e obrigatorio' });

  const [result] = await pool.query(
    `INSERT INTO uploads
     (tenant_id, owner_user_id, file_name, file_type, file_size, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      req.user.tenant_id,
      req.user.user_id,
      data.file_name,
      toNull(data.file_type),
      toNull(data.file_size),
      'pending'
    ]
  );
  res.status(201).json({ id: result.insertId, message: 'Upload criado' });
});

router.put('/:id/confirm', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.file_url) return res.status(400).json({ error: 'file_url e obrigatorio' });

  const [result] = await pool.query(
    `UPDATE uploads SET file_url=?, status=?
     WHERE id=? AND tenant_id=?`,
    [
      data.file_url,
      data.status ?? 'uploaded',
      req.params.id,
      req.user.tenant_id
    ]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Upload nao encontrado' });
  res.json({ message: 'Upload confirmado' });
});

router.delete('/:id', authenticate, async (req, res) => {
  const [result] = await pool.query(
    `DELETE FROM uploads WHERE id=? AND tenant_id=?`,
    [req.params.id, req.user.tenant_id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Upload nao encontrado' });
  res.json({ message: 'Upload removido' });
});

export default router;
