import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const toNull = (v) => (v === undefined || v === '' ? null : v);

const loadComanda = async (tenantId, id) => {
  const [rows] = await pool.query(
    `SELECT * FROM comandas WHERE id = ? AND tenant_id = ?`,
    [id, tenantId]
  );
  if (!rows.length) return null;
  const [items] = await pool.query(
    `SELECT * FROM comanda_items WHERE comanda_id = ? ORDER BY id ASC`,
    [id]
  );
  const [sessions] = await pool.query(
    `SELECT * FROM comanda_sessions WHERE comanda_id = ? ORDER BY id ASC`,
    [id]
  );
  return { ...rows[0], items, sessions };
};

router.get('/', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM comandas WHERE tenant_id = ? ORDER BY id DESC`,
    [req.user.tenant_id]
  );
  res.json(rows);
});

router.get('/:id', authenticate, async (req, res) => {
  const comanda = await loadComanda(req.user.tenant_id, req.params.id);
  if (!comanda) return res.status(404).json({ error: 'Comanda nao encontrada' });
  res.json(comanda);
});

router.post('/', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.patient_id) return res.status(400).json({ error: 'patient_id e obrigatorio' });

  const items = Array.isArray(data.items) ? data.items : [];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO comandas
       (tenant_id, patient_id, status, description, discount_type, discount_value,
        subtotal, total_value, paid_value, start_date, frequency)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenant_id,
        data.patient_id,
        data.status ?? 'aberta',
        toNull(data.description),
        toNull(data.discount_type),
        data.discount_value ?? 0,
        data.subtotal ?? 0,
        data.total_value ?? 0,
        data.paid_value ?? 0,
        toNull(data.start_date),
        toNull(data.frequency)
      ]
    );
    const comandaId = result.insertId;
    for (const item of items) {
      await conn.query(
        `INSERT INTO comanda_items (comanda_id, service_id, description, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          comandaId,
          toNull(item.service_id),
          toNull(item.description),
          item.quantity ?? 1,
          item.unit_price ?? 0,
          item.total_price ?? 0
        ]
      );
    }
    await conn.commit();
    res.status(201).json({ message: 'Comanda criada', id: comandaId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

router.put('/:id', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.patient_id) return res.status(400).json({ error: 'patient_id e obrigatorio' });

  const items = Array.isArray(data.items) ? data.items : [];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `UPDATE comandas SET
        patient_id=?, status=?, description=?, discount_type=?, discount_value=?,
        subtotal=?, total_value=?, paid_value=?, start_date=?, frequency=?
       WHERE id=? AND tenant_id=?`,
      [
        data.patient_id,
        data.status ?? 'aberta',
        toNull(data.description),
        toNull(data.discount_type),
        data.discount_value ?? 0,
        data.subtotal ?? 0,
        data.total_value ?? 0,
        data.paid_value ?? 0,
        toNull(data.start_date),
        toNull(data.frequency),
        req.params.id,
        req.user.tenant_id
      ]
    );
    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Comanda nao encontrada' });
    }

    await conn.query(`DELETE FROM comanda_items WHERE comanda_id = ?`, [req.params.id]);
    for (const item of items) {
      await conn.query(
        `INSERT INTO comanda_items (comanda_id, service_id, description, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          req.params.id,
          toNull(item.service_id),
          toNull(item.description),
          item.quantity ?? 1,
          item.unit_price ?? 0,
          item.total_price ?? 0
        ]
      );
    }

    await conn.commit();
    res.json({ message: 'Comanda atualizada' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  const [result] = await pool.query(
    `DELETE FROM comandas WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Comanda nao encontrada' });
  res.json({ message: 'Comanda removida' });
});

router.post('/:id/items', authenticate, async (req, res) => {
  const data = req.body || {};
  const [rows] = await pool.query(
    `SELECT id FROM comandas WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Comanda nao encontrada' });

  const [result] = await pool.query(
    `INSERT INTO comanda_items (comanda_id, service_id, description, quantity, unit_price, total_price)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      req.params.id,
      toNull(data.service_id),
      toNull(data.description),
      data.quantity ?? 1,
      data.unit_price ?? 0,
      data.total_price ?? 0
    ]
  );
  res.status(201).json({ message: 'Item adicionado', id: result.insertId });
});

router.put('/:id/items/:itemId', authenticate, async (req, res) => {
  const data = req.body || {};
  const [result] = await pool.query(
    `UPDATE comanda_items SET
      service_id=?, description=?, quantity=?, unit_price=?, total_price=?
     WHERE id=? AND comanda_id=?`,
    [
      toNull(data.service_id),
      toNull(data.description),
      data.quantity ?? 1,
      data.unit_price ?? 0,
      data.total_price ?? 0,
      req.params.itemId,
      req.params.id
    ]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Item nao encontrado' });
  res.json({ message: 'Item atualizado' });
});

router.delete('/:id/items/:itemId', authenticate, async (req, res) => {
  const [result] = await pool.query(
    `DELETE FROM comanda_items WHERE id = ? AND comanda_id = ?`,
    [req.params.itemId, req.params.id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Item nao encontrado' });
  res.json({ message: 'Item removido' });
});

router.post('/:id/sessions', authenticate, async (req, res) => {
  const data = req.body || {};
  const [rows] = await pool.query(
    `SELECT id FROM comandas WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Comanda nao encontrada' });

  const [result] = await pool.query(
    `INSERT INTO comanda_sessions (comanda_id, session_number, session_date, status)
     VALUES (?, ?, ?, ?)`,
    [
      req.params.id,
      data.session_number ?? 1,
      toNull(data.session_date),
      data.status ?? 'pending'
    ]
  );
  res.status(201).json({ message: 'Sessao adicionada', id: result.insertId });
});

export default router;
