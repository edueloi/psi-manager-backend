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
  const [requests] = await pool.query(
    `SELECT r.*, p.tenant_id, p.settings
     FROM public_booking_requests r
     JOIN public_booking_profiles p ON p.id = r.profile_id
     WHERE r.id = ?
     LIMIT 1`,
    [req.params.id]
  );
  if (!requests.length) return res.status(404).json({ error: 'Solicitacao nao encontrada' });

  const request = requests[0];
  let settings = {};
  if (request.settings) {
    try {
      settings = JSON.parse(request.settings);
    } catch {
      settings = {};
    }
  }

  const newStatus = data.status ?? 'pending';
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `UPDATE public_booking_requests SET status = ?
       WHERE id = ?`,
      [newStatus, req.params.id]
    );
    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Solicitacao nao encontrada' });
    }

    if (newStatus === 'approved') {
      const appointmentDate = data.appointment_date ?? request.preferred_date;
      const psychologistId = data.psychologist_id ?? settings.default_psychologist_id;
      const serviceId = data.service_id ?? settings.default_service_id ?? null;
      const durationMinutes = data.duration_minutes ?? settings.default_duration_minutes ?? 50;
      const modality = data.modality ?? settings.default_modality ?? 'presencial';

      if (!appointmentDate) {
        await conn.rollback();
        return res.status(400).json({ error: 'appointment_date e obrigatorio para aprovar' });
      }
      if (!psychologistId) {
        await conn.rollback();
        return res.status(400).json({ error: 'psychologist_id e obrigatorio para aprovar' });
      }

      let patientId = null;
      if (request.patient_email) {
        const [patients] = await conn.query(
          `SELECT id FROM patients WHERE tenant_id = ? AND email = ? LIMIT 1`,
          [request.tenant_id, request.patient_email]
        );
        if (patients.length) patientId = patients[0].id;
      }
      if (!patientId && request.patient_phone) {
        const [patients] = await conn.query(
          `SELECT id FROM patients WHERE tenant_id = ? AND whatsapp = ? LIMIT 1`,
          [request.tenant_id, request.patient_phone]
        );
        if (patients.length) patientId = patients[0].id;
      }
      if (!patientId) {
        const [patientResult] = await conn.query(
          `INSERT INTO patients
           (tenant_id, full_name, email, whatsapp, status)
           VALUES (?, ?, ?, ?, 'ativo')`,
          [
            request.tenant_id,
            request.patient_name,
            toNull(request.patient_email),
            toNull(request.patient_phone)
          ]
        );
        patientId = patientResult.insertId;
      }

      await conn.query(
        `INSERT INTO appointments
         (tenant_id, patient_id, psychologist_id, service_id, appointment_date, duration_minutes,
          status, modality, type, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, 'consulta', ?, ?)`,
        [
          request.tenant_id,
          patientId,
          psychologistId,
          toNull(serviceId),
          appointmentDate,
          durationMinutes,
          modality,
          toNull(request.notes),
          req.user.user_id
        ]
      );
    }

    await conn.commit();
    res.json({ message: 'Solicitacao atualizada' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
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
