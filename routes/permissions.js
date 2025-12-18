import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const ensureUserAccess = async (requester, userId) => {
  if (requester.role === 'super_admin') return true;
  const [rows] = await pool.query(
    `SELECT id FROM users WHERE id = ? AND tenant_id = ? LIMIT 1`,
    [userId, requester.tenant_id]
  );
  return rows.length > 0;
};

router.get('/', authenticate, async (req, res) => {
  const [rows] = await pool.query(`SELECT * FROM permissions ORDER BY module, code`);
  res.json(rows);
});

router.get('/roles/:role', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT permission_code FROM role_permissions WHERE role = ? ORDER BY permission_code`,
    [req.params.role]
  );
  res.json(rows.map((r) => r.permission_code));
});

router.put('/roles/:role', authenticate, async (req, res) => {
  const data = req.body || {};
  const permissionCodes = Array.isArray(data.permission_codes) ? data.permission_codes : [];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`DELETE FROM role_permissions WHERE role = ?`, [req.params.role]);
    for (const code of permissionCodes) {
      await conn.query(
        `INSERT INTO role_permissions (role, permission_code) VALUES (?, ?)`,
        [req.params.role, code]
      );
    }
    await conn.commit();
    res.json({ message: 'Permissoes de role atualizadas' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

router.get('/users/:id', authenticate, async (req, res) => {
  const allowed = await ensureUserAccess(req.user, req.params.id);
  if (!allowed) return res.status(403).json({ error: 'Permissao negada' });

  const [rows] = await pool.query(
    `SELECT permission_code, granted FROM user_permissions WHERE user_id = ? ORDER BY permission_code`,
    [req.params.id]
  );
  res.json(rows);
});

router.put('/users/:id', authenticate, async (req, res) => {
  const allowed = await ensureUserAccess(req.user, req.params.id);
  if (!allowed) return res.status(403).json({ error: 'Permissao negada' });

  const data = req.body || {};
  const permissions = Array.isArray(data.permissions) ? data.permissions : [];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`DELETE FROM user_permissions WHERE user_id = ?`, [req.params.id]);
    for (const item of permissions) {
      await conn.query(
        `INSERT INTO user_permissions (user_id, permission_code, granted)
         VALUES (?, ?, ?)`,
        [req.params.id, item.permission_code, item.granted ?? 1]
      );
    }
    await conn.commit();
    res.json({ message: 'Permissoes do usuario atualizadas' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

export default router;
