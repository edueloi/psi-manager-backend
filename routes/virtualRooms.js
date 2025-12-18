// routes/virtualRooms.js

import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Listar todas as salas virtuais do tenant
router.get('/', authenticate, async (req, res) => {
	const [rows] = await pool.query(
		'SELECT * FROM virtual_rooms WHERE tenant_id = ? ORDER BY created_at DESC',
		[req.user.tenant_id]
	);
	res.json(rows);
});

// Buscar sala virtual por ID
router.get('/:id', authenticate, async (req, res) => {
	const [rows] = await pool.query(
		'SELECT * FROM virtual_rooms WHERE id = ? AND tenant_id = ?',
		[req.params.id, req.user.tenant_id]
	);
	if (!rows.length) return res.status(404).json({ error: 'Sala virtual não encontrada' });
	res.json(rows[0]);
});

// Criar sala virtual
router.post('/', authenticate, async (req, res) => {
	const { code, title, description, scheduled_start, scheduled_end } = req.body || {};
	if (!code) return res.status(400).json({ error: 'code é obrigatório' });
	const [result] = await pool.query(
		`INSERT INTO virtual_rooms (tenant_id, creator_user_id, code, title, description, scheduled_start, scheduled_end)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		[req.user.tenant_id, req.user.user_id, code, title, description, scheduled_start, scheduled_end]
	);
	res.status(201).json({ message: 'Sala virtual criada', id: result.insertId });
});

// Atualizar sala virtual
router.put('/:id', authenticate, async (req, res) => {
	const { code, title, description, scheduled_start, scheduled_end } = req.body || {};
	const [result] = await pool.query(
		`UPDATE virtual_rooms SET code=?, title=?, description=?, scheduled_start=?, scheduled_end=?
		 WHERE id=? AND tenant_id=?`,
		[code, title, description, scheduled_start, scheduled_end, req.params.id, req.user.tenant_id]
	);
	if (result.affectedRows === 0) return res.status(404).json({ error: 'Sala virtual não encontrada' });
	res.json({ message: 'Sala virtual atualizada' });
});

// Remover sala virtual
router.delete('/:id', authenticate, async (req, res) => {
	const [result] = await pool.query(
		'DELETE FROM virtual_rooms WHERE id = ? AND tenant_id = ?',
		[req.params.id, req.user.tenant_id]
	);
	if (result.affectedRows === 0) return res.status(404).json({ error: 'Sala virtual não encontrada' });
	res.json({ message: 'Sala virtual removida' });
});

export default router;
