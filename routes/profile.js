
import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const toNull = (v) => (v === undefined || v === '' ? null : v);

router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.tenant_id, u.name, u.email, u.role, u.phone,
              p.crp, p.specialty, p.company_name, p.address, p.bio,
              p.avatar_url, p.clinic_logo_url, p.cover_url, p.schedule_json
       FROM users u
       LEFT JOIN user_profiles p
         ON p.user_id = u.id AND p.tenant_id = u.tenant_id
       WHERE u.id = ? AND u.tenant_id = ?
       LIMIT 1`,
      [req.user.user_id, req.user.tenant_id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Perfil nao encontrado' });

    const row = rows[0];
    let schedule = row.schedule_json;
    if (typeof schedule === 'string') {
      try { schedule = JSON.parse(schedule); } catch { /* ignore */ }
    }

    res.json({
      id: row.id,
      tenant_id: row.tenant_id,
      name: row.name,
      email: row.email,
      role: row.role,
      phone: row.phone,
      crp: row.crp,
      specialty: row.specialty,
      company_name: row.company_name,
      address: row.address,
      bio: row.bio,
      avatar_url: row.avatar_url,
      clinic_logo_url: row.clinic_logo_url,
      cover_url: row.cover_url,
      schedule,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/me', authenticate, async (req, res) => {
  try {
    const data = req.body || {};

    const [userRows] = await pool.query(
      `SELECT id, name, email, phone
       FROM users WHERE id = ? AND tenant_id = ?
       LIMIT 1`,
      [req.user.user_id, req.user.tenant_id]
    );
    if (!userRows.length) return res.status(404).json({ error: 'Usuario nao encontrado' });

    const current = userRows[0];
    const name = data.name ?? current.name;
    const email = data.email ?? current.email;
    const phone = data.phone ?? current.phone;

    await pool.query(
      `UPDATE users SET name=?, email=?, phone=?
       WHERE id=? AND tenant_id=?`,
      [name, email, toNull(phone), req.user.user_id, req.user.tenant_id]
    );

    const scheduleJson = data.schedule ? JSON.stringify(data.schedule) : null;

    await pool.query(
      `INSERT INTO user_profiles
       (tenant_id, user_id, crp, specialty, company_name, address, bio,
        avatar_url, clinic_logo_url, cover_url, schedule_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        crp=VALUES(crp),
        specialty=VALUES(specialty),
        company_name=VALUES(company_name),
        address=VALUES(address),
        bio=VALUES(bio),
        avatar_url=VALUES(avatar_url),
        clinic_logo_url=VALUES(clinic_logo_url),
        cover_url=VALUES(cover_url),
        schedule_json=VALUES(schedule_json)`,
      [
        req.user.tenant_id,
        req.user.user_id,
        toNull(data.crp),
        toNull(data.specialty),
        toNull(data.company_name),
        toNull(data.address),
        toNull(data.bio),
        toNull(data.avatar_url),
        toNull(data.clinic_logo_url),
        toNull(data.cover_url),
        scheduleJson
      ]
    );

    res.json({ message: 'Perfil atualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
