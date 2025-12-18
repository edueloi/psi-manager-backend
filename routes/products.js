import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const toNull = (v) => (v === undefined || v === '' ? null : v);

router.get('/', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM products WHERE tenant_id = ? ORDER BY id DESC`,
    [req.user.tenant_id]
  );
  res.json(rows);
});

router.get('/:id', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM products WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Produto nao encontrado' });
  res.json(rows[0]);
});

router.post('/', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.name || !data.category) {
    return res.status(400).json({ error: 'Campos obrigatorios: name, category' });
  }

  const [result] = await pool.query(
    `INSERT INTO products
     (tenant_id, name, category, price, cost, stock, min_stock, brand, sales_count, type,
      image_url, expiration_date, barcode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.tenant_id,
      data.name,
      data.category,
      data.price ?? 0,
      data.cost ?? 0,
      data.stock ?? 0,
      data.min_stock ?? 0,
      toNull(data.brand),
      data.sales_count ?? 0,
      data.type ?? 'physical',
      toNull(data.image_url),
      toNull(data.expiration_date),
      toNull(data.barcode)
    ]
  );
  res.status(201).json({ message: 'Produto criado', id: result.insertId });
});

router.put('/:id', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.name || !data.category) {
    return res.status(400).json({ error: 'Campos obrigatorios: name, category' });
  }

  const [result] = await pool.query(
    `UPDATE products SET
      name=?, category=?, price=?, cost=?, stock=?, min_stock=?, brand=?,
      sales_count=?, type=?, image_url=?, expiration_date=?, barcode=?
     WHERE id=? AND tenant_id=?`,
    [
      data.name,
      data.category,
      data.price ?? 0,
      data.cost ?? 0,
      data.stock ?? 0,
      data.min_stock ?? 0,
      toNull(data.brand),
      data.sales_count ?? 0,
      data.type ?? 'physical',
      toNull(data.image_url),
      toNull(data.expiration_date),
      toNull(data.barcode),
      req.params.id,
      req.user.tenant_id
    ]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Produto nao encontrado' });
  res.json({ message: 'Produto atualizado' });
});

router.delete('/:id', authenticate, async (req, res) => {
  const [result] = await pool.query(
    `DELETE FROM products WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Produto nao encontrado' });
  res.json({ message: 'Produto removido' });
});

export default router;
