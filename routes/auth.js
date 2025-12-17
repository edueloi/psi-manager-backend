import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const router = express.Router();

// CRIAR TENANT + ADMIN INICIAL
router.post('/signup/super-admin', async (req, res) => {
  const { company_name, admin_name, admin_email, password } = req.body;

  if (!company_name || !admin_name || !admin_email || !password) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // cria tenant
      const [tenantResult] = await conn.query(
        `INSERT INTO tenants (company_name, admin_name, admin_email, admin_password_hash)
         VALUES (?, ?, ?, ?)`,
        [company_name, admin_name, admin_email, hash]
      );

      const tenantId = tenantResult.insertId;

      // cria usuário admin do tenant
      const [userResult] = await conn.query(
        `INSERT INTO users (tenant_id, role, name, email, password_hash)
         VALUES (?, 'admin', ?, ?, ?)`,
        [tenantId, admin_name, admin_email, hash]
      );

      await conn.commit();

      return res.status(201).json({
        message: 'Tenant e admin criados',
        tenant_id: tenantId,
        user_id: userResult.insertId
      });
    } catch (err) {
      await conn.rollback();
      return res.status(500).json({ error: err.message });
    } finally {
      conn.release();
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// LOGIN REAL (gera token)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await pool.query(`SELECT * FROM users WHERE email = ?`, [email]);
  if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });

  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Senha inválida' });

  const token = jwt.sign(
    { user_id: user.id, tenant_id: user.tenant_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.json({ token });
});

export default router;
