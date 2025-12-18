import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const toNull = (v) => (v === undefined || v === '' ? null : v);

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const addMonths = (date, months) => {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
};

const formatDateTimeLocal = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return [
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  ].join(' ');
};

const weekdayMap = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6
};

const normalizeRule = (rule) => {
  if (!rule || typeof rule !== 'object') return null;
  const freq = String(rule.freq || '').toLowerCase();
  if (!['daily', 'weekly', 'monthly'].includes(freq)) return null;
  const interval = Math.max(1, Number(rule.interval) || 1);
  const byWeekday = Array.isArray(rule.byWeekday)
    ? rule.byWeekday.map((d) => String(d).toUpperCase()).filter((d) => weekdayMap[d] !== undefined)
    : [];
  return { freq, interval, byWeekday };
};

const generateOccurrences = (startDate, rule, count, endDate) => {
  const occurrences = [];
  const maxCount = Number.isFinite(count) && count > 0 ? count : null;
  const end = endDate ? new Date(endDate) : null;
  const start = new Date(startDate);

  if (!rule || (!maxCount && !end)) return [start];

  if (rule.freq === 'daily') {
    let cursor = new Date(start);
    while (true) {
      if (end && cursor > end) break;
      occurrences.push(new Date(cursor));
      if (maxCount && occurrences.length >= maxCount) break;
      cursor = addDays(cursor, rule.interval);
    }
    return occurrences;
  }

  if (rule.freq === 'monthly') {
    let cursor = new Date(start);
    while (true) {
      if (end && cursor > end) break;
      occurrences.push(new Date(cursor));
      if (maxCount && occurrences.length >= maxCount) break;
      cursor = addMonths(cursor, rule.interval);
    }
    return occurrences;
  }

  const weekdays = rule.byWeekday.length
    ? rule.byWeekday.map((d) => weekdayMap[d]).sort((a, b) => a - b)
    : [start.getDay()];

  let cursor = new Date(start);
  let weekStart = addDays(cursor, -cursor.getDay());
  while (true) {
    for (const day of weekdays) {
      const candidate = addDays(weekStart, day);
      if (candidate < start) continue;
      if (end && candidate > end) return occurrences;
      occurrences.push(new Date(candidate));
      if (maxCount && occurrences.length >= maxCount) return occurrences;
    }
    weekStart = addDays(weekStart, 7 * rule.interval);
  }
};

const buildAppointmentQuery = (filters) => {
  const clauses = ['a.tenant_id = ?'];
  const params = [filters.tenantId];
  if (filters.from) {
    clauses.push('a.appointment_date >= ?');
    params.push(filters.from);
  }
  if (filters.to) {
    clauses.push('a.appointment_date <= ?');
    params.push(filters.to);
  }
  return { whereSql: clauses.join(' AND '), params };
};

// Listar agendamentos
router.get('/', authenticate, async (req, res) => {
  const { from, to } = req.query || {};
  const { whereSql, params } = buildAppointmentQuery({
    tenantId: req.user.tenant_id,
    from,
    to
  });

  const [rows] = await pool.query(
    `SELECT a.*, p.full_name AS patient_name, u.name AS psychologist_name, s.name AS service_name
     FROM appointments a
     LEFT JOIN patients p ON p.id = a.patient_id
     LEFT JOIN users u ON u.id = a.psychologist_id
     LEFT JOIN services s ON s.id = a.service_id
     WHERE ${whereSql}
     ORDER BY a.appointment_date ASC`,
    params
  );

  res.json(rows);
});

// Buscar por ID
router.get('/:id', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT a.*, p.full_name AS patient_name, u.name AS psychologist_name, s.name AS service_name
     FROM appointments a
     LEFT JOIN patients p ON p.id = a.patient_id
     LEFT JOIN users u ON u.id = a.psychologist_id
     LEFT JOIN services s ON s.id = a.service_id
     WHERE a.id = ? AND a.tenant_id = ?
     LIMIT 1`,
    [req.params.id, req.user.tenant_id]
  );

  if (!rows.length) return res.status(404).json({ error: 'Agendamento nǜo encontrado' });
  res.json(rows[0]);
});

// Criar agendamento (com recorrǭncia opcional)
router.post('/', authenticate, async (req, res) => {
  const data = req.body || {};
  const appointmentDate = data.appointment_date;
  const rule = normalizeRule(data.recurrence_rule);
  const recurrenceCount = data.recurrence_count ? Number(data.recurrence_count) : null;
  const recurrenceEndDate = data.recurrence_end_date || null;

  if (!data.patient_id || !data.psychologist_id || !appointmentDate) {
    return res.status(400).json({ error: 'Campos obrigatǭrios: patient_id, psychologist_id, appointment_date' });
  }

  const occurrences = generateOccurrences(
    appointmentDate,
    rule,
    recurrenceCount,
    recurrenceEndDate
  );

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO appointments (
        tenant_id, patient_id, psychologist_id, service_id, appointment_date, duration_minutes,
        status, modality, type, notes, meeting_url, recurrence_rule, recurrence_end_date,
        recurrence_count, parent_appointment_id, recurrence_index, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenant_id,
        data.patient_id,
        data.psychologist_id,
        toNull(data.service_id),
        appointmentDate,
        data.duration_minutes ?? 50,
        data.status ?? 'scheduled',
        data.modality ?? 'presencial',
        data.type ?? 'consulta',
        toNull(data.notes),
        toNull(data.meeting_url),
        rule ? JSON.stringify(rule) : null,
        toNull(recurrenceEndDate),
        recurrenceCount,
        null,
        0,
        req.user.user_id
      ]
    );

    const rootId = result.insertId;
    const childIds = [];

    for (let i = 1; i < occurrences.length; i += 1) {
      const occurrenceDate = formatDateTimeLocal(occurrences[i]);
      const [childResult] = await conn.query(
        `INSERT INTO appointments (
          tenant_id, patient_id, psychologist_id, service_id, appointment_date, duration_minutes,
          status, modality, type, notes, meeting_url, parent_appointment_id, recurrence_index, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.tenant_id,
          data.patient_id,
          data.psychologist_id,
          toNull(data.service_id),
          occurrenceDate,
          data.duration_minutes ?? 50,
          data.status ?? 'scheduled',
          data.modality ?? 'presencial',
          data.type ?? 'consulta',
          toNull(data.notes),
          toNull(data.meeting_url),
          rootId,
          i,
          req.user.user_id
        ]
      );
      childIds.push(childResult.insertId);
    }

    await conn.commit();
    res.status(201).json({ message: 'Agendamento criado', id: rootId, recurrence_ids: childIds });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Atualizar agendamento
router.put('/:id', authenticate, async (req, res) => {
  const data = req.body || {};
  const applyToSeries = data.apply_to_series === 'all';

  const [rows] = await pool.query(
    `SELECT id, parent_appointment_id
     FROM appointments
     WHERE id = ? AND tenant_id = ?
     LIMIT 1`,
    [req.params.id, req.user.tenant_id]
  );

  if (!rows.length) return res.status(404).json({ error: 'Agendamento nǜo encontrado' });

  const baseId = rows[0].parent_appointment_id || rows[0].id;
  const whereClause = applyToSeries ? 'id = ? OR parent_appointment_id = ?' : 'id = ?';
  const whereParams = applyToSeries ? [baseId, baseId] : [req.params.id];

  await pool.query(
    `UPDATE appointments SET
      patient_id = ?, psychologist_id = ?, service_id = ?, appointment_date = ?,
      duration_minutes = ?, status = ?, modality = ?, type = ?, notes = ?, meeting_url = ?
     WHERE tenant_id = ? AND (${whereClause})`,
    [
      data.patient_id,
      data.psychologist_id,
      toNull(data.service_id),
      data.appointment_date,
      data.duration_minutes ?? 50,
      data.status ?? 'scheduled',
      data.modality ?? 'presencial',
      data.type ?? 'consulta',
      toNull(data.notes),
      toNull(data.meeting_url),
      req.user.tenant_id,
      ...whereParams
    ]
  );

  res.json({ message: 'Agendamento atualizado' });
});

// Remover agendamento
router.delete('/:id', authenticate, async (req, res) => {
  const deleteSeries = req.query.delete_series === '1' || req.query.delete_series === 'true';

  const [rows] = await pool.query(
    `SELECT id, parent_appointment_id
     FROM appointments
     WHERE id = ? AND tenant_id = ?
     LIMIT 1`,
    [req.params.id, req.user.tenant_id]
  );

  if (!rows.length) return res.status(404).json({ error: 'Agendamento nǜo encontrado' });

  const baseId = rows[0].parent_appointment_id || rows[0].id;
  if (deleteSeries) {
    await pool.query(
      `DELETE FROM appointments WHERE tenant_id = ? AND (id = ? OR parent_appointment_id = ?)`,
      [req.user.tenant_id, baseId, baseId]
    );
  } else {
    await pool.query(
      `DELETE FROM appointments WHERE tenant_id = ? AND id = ?`,
      [req.user.tenant_id, req.params.id]
    );
  }

  res.json({ message: 'Agendamento removido' });
});

export default router;
