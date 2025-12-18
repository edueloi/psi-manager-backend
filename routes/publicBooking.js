import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const toNull = (v) => (v === undefined || v === '' ? null : v);

// Admin profiles
router.get('/profiles', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM public_booking_profiles WHERE tenant_id = ? ORDER BY id DESC`,
    [req.user.tenant_id]
  );
  res.json(rows);
});

router.post('/profiles', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.slug || !data.title) {
    return res.status(400).json({ error: 'Campos obrigatorios: slug, title' });
  }
  const [result] = await pool.query(
    `INSERT INTO public_booking_profiles
     (tenant_id, slug, title, description, settings, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      req.user.tenant_id,
      data.slug,
      data.title,
      toNull(data.description),
      data.settings ? JSON.stringify(data.settings) : null,
      data.is_active ?? 1
    ]
  );
  res.status(201).json({ message: 'Perfil criado', id: result.insertId });
});

router.put('/profiles/:id', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.slug || !data.title) {
    return res.status(400).json({ error: 'Campos obrigatorios: slug, title' });
  }
  const [result] = await pool.query(
    `UPDATE public_booking_profiles SET
      slug=?, title=?, description=?, settings=?, is_active=?
     WHERE id=? AND tenant_id=?`,
    [
      data.slug,
      data.title,
      toNull(data.description),
      data.settings ? JSON.stringify(data.settings) : null,
      data.is_active ?? 1,
      req.params.id,
      req.user.tenant_id
    ]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Perfil nao encontrado' });
  res.json({ message: 'Perfil atualizado' });
});

router.delete('/profiles/:id', authenticate, async (req, res) => {
  const [result] = await pool.query(
    `DELETE FROM public_booking_profiles WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Perfil nao encontrado' });
  res.json({ message: 'Perfil removido' });
});

// Admin view requests
router.get('/requests', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT r.*, p.slug, p.title
     FROM public_booking_requests r
     JOIN public_booking_profiles p ON p.id = r.profile_id
     WHERE p.tenant_id = ?
     ORDER BY r.id DESC`,
    [req.user.tenant_id]
  );
  res.json(rows);
});

router.put('/requests/:id', authenticate, async (req, res) => {
  const data = req.body || {};
  const [result] = await pool.query(
    `UPDATE public_booking_requests SET status = ?
     WHERE id = ?`,
    [data.status ?? 'pending', req.params.id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Solicitacao nao encontrada' });
  res.json({ message: 'Solicitacao atualizada' });
});

// Public endpoints
router.get('/:slug', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, slug, title, description, settings, is_active
     FROM public_booking_profiles
     WHERE slug = ? AND is_active = 1
     LIMIT 1`,
    [req.params.slug]
  );
  if (!rows.length) return res.status(404).json({ error: 'Perfil nao encontrado' });
  res.json(rows[0]);
});

router.post('/:slug/requests', async (req, res) => {
  const data = req.body || {};
  if (!data.patient_name) {
    return res.status(400).json({ error: 'patient_name e obrigatorio' });
  }

  const [profiles] = await pool.query(
    `SELECT id FROM public_booking_profiles
     WHERE slug = ? AND is_active = 1
     LIMIT 1`,
    [req.params.slug]
  );
  if (!profiles.length) return res.status(404).json({ error: 'Perfil nao encontrado' });

  const [result] = await pool.query(
    `INSERT INTO public_booking_requests
     (profile_id, patient_name, patient_email, patient_phone, preferred_date, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      profiles[0].id,
      data.patient_name,
      toNull(data.patient_email),
      toNull(data.patient_phone),
      toNull(data.preferred_date),
      toNull(data.notes),
      'pending'
    ]
  );
  res.status(201).json({ message: 'Solicitacao enviada', id: result.insertId });
});

export default router;
