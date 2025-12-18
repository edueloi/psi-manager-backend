import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const toNull = (v) => (v === undefined || v === '' ? null : v);

router.get('/templates', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM message_templates
     WHERE tenant_id = ? OR is_global = 1
     ORDER BY id DESC`,
    [req.user.tenant_id]
  );
  res.json(rows);
});

router.post('/templates', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.title || !data.category || !data.content) {
    return res.status(400).json({ error: 'Campos obrigatorios: title, category, content' });
  }
  const [result] = await pool.query(
    `INSERT INTO message_templates
     (tenant_id, title, category, content, is_global)
     VALUES (?, ?, ?, ?, ?)`,
    [
      req.user.tenant_id,
      data.title,
      data.category,
      data.content,
      data.is_global ?? 0
    ]
  );
  res.status(201).json({ message: 'Template criado', id: result.insertId });
});

router.put('/templates/:id', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.title || !data.category || !data.content) {
    return res.status(400).json({ error: 'Campos obrigatorios: title, category, content' });
  }
  const [result] = await pool.query(
    `UPDATE message_templates SET title=?, category=?, content=?, is_global=?
     WHERE id=? AND tenant_id=?`,
    [
      data.title,
      data.category,
      data.content,
      data.is_global ?? 0,
      req.params.id,
      req.user.tenant_id
    ]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Template nao encontrado' });
  res.json({ message: 'Template atualizado' });
});

router.delete('/templates/:id', authenticate, async (req, res) => {
  const [result] = await pool.query(
    `DELETE FROM message_templates WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Template nao encontrado' });
  res.json({ message: 'Template removido' });
});

router.get('/logs', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM message_logs WHERE tenant_id = ? ORDER BY id DESC`,
    [req.user.tenant_id]
  );
  res.json(rows);
});

router.post('/send', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.channel || !data.recipient || !data.content) {
    return res.status(400).json({ error: 'Campos obrigatorios: channel, recipient, content' });
  }

  const [result] = await pool.query(
    `INSERT INTO message_logs (tenant_id, channel, recipient, content, status)
     VALUES (?, ?, ?, ?, ?)`,
    [
      req.user.tenant_id,
      data.channel,
      data.recipient,
      data.content,
      data.status ?? 'queued'
    ]
  );
  res.status(201).json({ message: 'Envio registrado', id: result.insertId });
});

export default router;
