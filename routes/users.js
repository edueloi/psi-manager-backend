import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';
import { authenticate, authorize, requireTenant } from '../middleware/auth.js';

const router = express.Router();

const toNull = (v) => (v === undefined || v === '' ? null : v);

// LISTAR usuários do TENANT (somente admin)
router.get('/', authenticate, requireTenant, authorize('admin'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, tenant_id, role, name, email, phone, is_active, created_at, updated_at
     FROM users
     WHERE tenant_id = ?
     ORDER BY id DESC`,
    [req.user.tenant_id]
  );
  res.json(rows);
});

// DETALHAR usuário do TENANT (somente admin)
router.get('/:id', authenticate, requireTenant, authorize('admin'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, tenant_id, role, name, email, phone, is_active, created_at, updated_at
     FROM users
     WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json(rows[0]);
});

// CRIAR usuário (somente admin do tenant)
// admin pode criar: admin, secretario, profissional
router.post('/', authenticate, requireTenant, authorize('admin'), async (req, res) => {
  const { name, email, password, role, phone, is_active } = req.body || {};

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Campos obrigatórios: name, email, password, role' });
  }

  const allowedRoles = ['admin', 'secretario', 'profissional'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Role inválida' });
  }

  // limite 5 usuários por tenant (ajustável)
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM users WHERE tenant_id = ?`,
    [req.user.tenant_id]
  );
  if (countRows[0].total >= 5) {
    return res.status(403).json({ error: 'Limite de usuários atingido (5). Solicite upgrade.' });
  }

  const hash = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    `INSERT INTO users (tenant_id, role, name, email, password_hash, phone, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.tenant_id,
      role,
      name,
      email,
      hash,
      toNull(phone),
      is_active ?? true
    ]
  );

  res.status(201).json({ message: 'Usuário criado', user_id: result.insertId });
});

// ATUALIZAR usuário (somente admin do tenant)
// permite alterar role/is_active e dados básicos
router.put('/:id', authenticate, requireTenant, authorize('admin'), async (req, res) => {
  const { name, email, role, phone, is_active, password } = req.body || {};

  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Campos obrigatórios: name, email, role' });
  }

  const allowedRoles = ['admin', 'secretario', 'profissional'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Role inválida' });
  }

  // impede admin desativar a si mesmo (opcional mas recomendado)
  if (Number(req.params.id) === Number(req.user.user_id) && is_active === false) {
    return res.status(400).json({ error: 'Você não pode desativar seu próprio usuário' });
  }

  let password_hash = null;
  if (password) password_hash = await bcrypt.hash(password, 10);

  if (password_hash) {
    await pool.query(
      `UPDATE users SET name=?, email=?, role=?, phone=?, is_active=?, password_hash=? 
       WHERE id=? AND tenant_id=?`,
      [name, email, role, toNull(phone), is_active ?? true, password_hash, req.params.id, req.user.tenant_id]
    );
  } else {
    await pool.query(
      `UPDATE users SET name=?, email=?, role=?, phone=?, is_active=?
       WHERE id=? AND tenant_id=?`,
      [name, email, role, toNull(phone), is_active ?? true, req.params.id, req.user.tenant_id]
    );
  }

  res.json({ message: 'Usuário atualizado' });
});

// REMOVER usuário (somente admin do tenant)
router.delete('/:id', authenticate, requireTenant, authorize('admin'), async (req, res) => {
  // opcional: impedir deletar a si mesmo
  if (Number(req.params.id) === Number(req.user.user_id)) {
    return res.status(400).json({ error: 'Você não pode remover seu próprio usuário' });
  }

  await pool.query(
    `DELETE FROM users WHERE id=? AND tenant_id=?`,
    [req.params.id, req.user.tenant_id]
  );
  res.json({ message: 'Usuário removido' });
});

export default router;
