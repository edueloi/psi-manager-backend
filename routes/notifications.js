import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const toNull = (v) => (v === undefined || v === '' ? null : v);

router.get('/settings/me', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM notification_settings WHERE user_id = ? LIMIT 1`,
    [req.user.user_id]
  );
  res.json(rows[0] ?? null);
});

router.put('/settings/me', authenticate, async (req, res) => {
  const data = req.body || {};
  await pool.query(
    `INSERT INTO notification_settings
     (user_id, email_enabled, sms_enabled, push_enabled, reminder_minutes)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       email_enabled=VALUES(email_enabled),
       sms_enabled=VALUES(sms_enabled),
       push_enabled=VALUES(push_enabled),
       reminder_minutes=VALUES(reminder_minutes)`,
    [
      req.user.user_id,
      data.email_enabled ?? 1,
      data.sms_enabled ?? 0,
      data.push_enabled ?? 1,
      data.reminder_minutes ?? 60
    ]
  );
  res.json({ message: 'Configuracoes atualizadas' });
});

router.get('/reminders', authenticate, async (req, res) => {
  const { status } = req.query || {};
  const params = [req.user.tenant_id];
  let whereSql = 'tenant_id = ?';
  if (status) {
    whereSql += ' AND status = ?';
    params.push(status);
  }
  const [rows] = await pool.query(
    `SELECT * FROM appointment_reminders WHERE ${whereSql} ORDER BY scheduled_at ASC`,
    params
  );
  res.json(rows);
});

router.post('/reminders', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.appointment_id || !data.channel || !data.scheduled_at) {
    return res.status(400).json({ error: 'Campos obrigatorios: appointment_id, channel, scheduled_at' });
  }

  const [result] = await pool.query(
    `INSERT INTO appointment_reminders
     (tenant_id, appointment_id, channel, scheduled_at, status)
     VALUES (?, ?, ?, ?, ?)`,
    [
      req.user.tenant_id,
      data.appointment_id,
      data.channel,
      data.scheduled_at,
      data.status ?? 'scheduled'
    ]
  );
  res.status(201).json({ message: 'Lembrete criado', id: result.insertId });
});

router.put('/reminders/:id', authenticate, async (req, res) => {
  const data = req.body || {};
  const [result] = await pool.query(
    `UPDATE appointment_reminders SET
      channel=?, scheduled_at=?, status=?
     WHERE id=? AND tenant_id=?`,
    [
      data.channel,
      data.scheduled_at,
      data.status ?? 'scheduled',
      req.params.id,
      req.user.tenant_id
    ]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Lembrete nao encontrado' });
  res.json({ message: 'Lembrete atualizado' });
});

router.delete('/reminders/:id', authenticate, async (req, res) => {
  const [result] = await pool.query(
    `DELETE FROM appointment_reminders WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Lembrete nao encontrado' });
  res.json({ message: 'Lembrete removido' });
});

export default router;
