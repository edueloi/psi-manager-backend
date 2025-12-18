import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const toNull = (v) => (v === undefined || v === '' ? null : v);

const loadPackage = async (tenantId, id) => {
  const [rows] = await pool.query(
    `SELECT * FROM service_packages WHERE id = ? AND tenant_id = ?`,
    [id, tenantId]
  );
  if (!rows.length) return null;
  const [items] = await pool.query(
    `SELECT * FROM service_package_items WHERE package_id = ? ORDER BY id ASC`,
    [id]
  );
  return { ...rows[0], items };
};

router.get('/', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM service_packages WHERE tenant_id = ? ORDER BY id DESC`,
    [req.user.tenant_id]
  );
  res.json(rows);
});

router.get('/:id', authenticate, async (req, res) => {
  const pkg = await loadPackage(req.user.tenant_id, req.params.id);
  if (!pkg) return res.status(404).json({ error: 'Pacote nao encontrado' });
  res.json(pkg);
});

router.post('/', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.name) return res.status(400).json({ error: 'name e obrigatorio' });

  const items = Array.isArray(data.items) ? data.items : [];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO service_packages
       (tenant_id, name, description, discount_type, discount_value, total_price)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenant_id,
        data.name,
        toNull(data.description),
        data.discount_type ?? 'percentage',
        data.discount_value ?? 0,
        data.total_price ?? 0
      ]
    );
    const packageId = result.insertId;

    for (const item of items) {
      await conn.query(
        `INSERT INTO service_package_items (package_id, service_id, quantity)
         VALUES (?, ?, ?)`,
        [packageId, item.service_id, item.quantity ?? 1]
      );
    }

    await conn.commit();
    res.status(201).json({ message: 'Pacote criado', id: packageId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

router.put('/:id', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.name) return res.status(400).json({ error: 'name e obrigatorio' });

  const items = Array.isArray(data.items) ? data.items : [];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `UPDATE service_packages SET
        name=?, description=?, discount_type=?, discount_value=?, total_price=?
       WHERE id=? AND tenant_id=?`,
      [
        data.name,
        toNull(data.description),
        data.discount_type ?? 'percentage',
        data.discount_value ?? 0,
        data.total_price ?? 0,
        req.params.id,
        req.user.tenant_id
      ]
    );
    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Pacote nao encontrado' });
    }

    await conn.query(`DELETE FROM service_package_items WHERE package_id = ?`, [req.params.id]);
    for (const item of items) {
      await conn.query(
        `INSERT INTO service_package_items (package_id, service_id, quantity)
         VALUES (?, ?, ?)`,
        [req.params.id, item.service_id, item.quantity ?? 1]
      );
    }

    await conn.commit();
    res.json({ message: 'Pacote atualizado' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  const [result] = await pool.query(
    `DELETE FROM service_packages WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Pacote nao encontrado' });
  res.json({ message: 'Pacote removido' });
});

export default router;
