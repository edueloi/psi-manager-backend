import express from 'express';
import { pool } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// listar todos os usuários do locatário
router.get('/', authenticate, authorize(['admin', 'super_admin']), async (req, res) => {
  const [rows] = await pool.query('SELECT id, name, email, role, is_active FROM users WHERE tenant_id = ?', [req.user.tenant_id]);
  res.json(rows);
});

// buscar um usuário por ID
router.get('/:id', authenticate, authorize(['admin', 'super_admin']), async (req, res) => {
  const [rows] = await pool.query('SELECT id, name, email, role, is_active FROM users WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
  if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json(rows[0]);
});

// atualizar um usuário
router.put('/:id', authenticate, authorize(['admin', 'super_admin']), async (req, res) => {
  const { name, role, is_active } = req.body;
  await pool.query(
    'UPDATE users SET name = ?, role = ?, is_active = ? WHERE id = ? AND tenant_id = ?',
    [name, role, is_active, req.params.id, req.user.tenant_id]
  );
  res.json({ message: 'Usuário atualizado' });
});

// deletar um usuário
router.delete('/:id', authenticate, authorize(['admin', 'super_admin']), async (req, res) => {
  await pool.query('DELETE FROM users WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
  res.json({ message: 'Usuário removido' });
});

export default router;
