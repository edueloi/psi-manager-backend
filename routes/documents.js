import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const toNull = (v) => (v === undefined || v === '' ? null : v);

router.get('/', authenticate, async (req, res) => {
  const { category, search } = req.query || {};
  const params = [req.user.tenant_id];
  let whereSql = 'tenant_id = ?';
  if (category) {
    whereSql += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    whereSql += ' AND title LIKE ?';
    params.push(`%${search}%`);
  }

  const [rows] = await pool.query(
    `SELECT * FROM documents WHERE ${whereSql} ORDER BY id DESC`,
    params
  );
  res.json(rows);
});

router.get('/:id', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM documents WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Documento nao encontrado' });
  res.json(rows[0]);
});

router.post('/', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.title || !data.category || !data.type || !data.file_url) {
    return res.status(400).json({ error: 'Campos obrigatorios: title, category, type, file_url' });
  }

  const [result] = await pool.query(
    `INSERT INTO documents
     (tenant_id, title, category, type, size, file_url, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.tenant_id,
      data.title,
      data.category,
      data.type,
      toNull(data.size),
      data.file_url,
      data.uploaded_by ?? req.user.user_id
    ]
  );
  res.status(201).json({ message: 'Documento criado', id: result.insertId });
});

router.put('/:id', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.title || !data.category || !data.type || !data.file_url) {
    return res.status(400).json({ error: 'Campos obrigatorios: title, category, type, file_url' });
  }

  const [result] = await pool.query(
    `UPDATE documents SET
      title=?, category=?, type=?, size=?, file_url=?
     WHERE id=? AND tenant_id=?`,
    [
      data.title,
      data.category,
      data.type,
      toNull(data.size),
      data.file_url,
      req.params.id,
      req.user.tenant_id
    ]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Documento nao encontrado' });
  res.json({ message: 'Documento atualizado' });
});

router.delete('/:id', authenticate, async (req, res) => {
  const [result] = await pool.query(
    `DELETE FROM documents WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Documento nao encontrado' });
  res.json({ message: 'Documento removido' });
});

export default router;
