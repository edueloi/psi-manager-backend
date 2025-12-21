import express from 'express';
import crypto from 'crypto';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const getRoomByCode = async (code) => {
  const [rows] = await pool.query(
    'SELECT id, tenant_id FROM virtual_rooms WHERE code = ? LIMIT 1',
    [code]
  );
  return rows[0] || null;
};

const getWaitingByToken = async (token) => {
  const [rows] = await pool.query(
    'SELECT id, room_id, tenant_id, guest_name, status FROM virtual_room_waiting WHERE token = ? LIMIT 1',
    [token]
  );
  return rows[0] || null;
};

const getParticipantByToken = async (token) => {
  const [rows] = await pool.query(
    'SELECT id, room_id, tenant_id, name, role, status FROM virtual_room_participants WHERE token = ? LIMIT 1',
    [token]
  );
  return rows[0] || null;
};

const insertSystemMessage = async (roomId, tenantId, text) => {
  await pool.query(
    `INSERT INTO virtual_room_messages (room_id, tenant_id, sender_role, sender_name, message)
     VALUES (?, ?, 'system', 'Sistema', ?)`,
    [roomId, tenantId, text]
  );
};

// Listar todas as salas virtuais do tenant
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM virtual_rooms WHERE tenant_id = ? ORDER BY created_at DESC',
      [req.user.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar sala virtual por ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM virtual_rooms WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Sala virtual nao encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: entrar na fila de espera por codigo da sala
router.post('/public/:code/waiting', async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name e obrigatorio' });
    const room = await getRoomByCode(req.params.code);
    if (!room) return res.status(404).json({ error: 'Sala virtual nao encontrada' });
    const token = crypto.randomBytes(16).toString('hex');
    await pool.query(
      `INSERT INTO virtual_room_waiting
        (room_id, tenant_id, guest_name, token, status)
       VALUES (?, ?, ?, ?, 'waiting')`,
      [room.id, room.tenant_id, name, token]
    );
    res.status(201).json({ token, status: 'waiting' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: verificar status da fila
router.get('/public/waiting/:token', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT status FROM virtual_room_waiting WHERE token = ? LIMIT 1',
      [req.params.token]
    );
    if (!rows.length) return res.status(404).json({ error: 'Solicitacao nao encontrada' });
    res.json({ status: rows[0].status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: registrar entrada do convidado após aprovacao
router.post('/public/:code/join', async (req, res) => {
  try {
    const { token, name } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token e obrigatorio' });
    const room = await getRoomByCode(req.params.code);
    if (!room) return res.status(404).json({ error: 'Sala virtual nao encontrada' });
    const waiting = await getWaitingByToken(token);
    if (!waiting || waiting.room_id !== room.id || waiting.status !== 'approved') {
      return res.status(400).json({ error: 'Entrada nao autorizada' });
    }
    const guestName = name || waiting.guest_name;
    await pool.query(
      `INSERT INTO virtual_room_participants
        (room_id, tenant_id, role, name, token, status, last_seen)
       VALUES (?, ?, 'guest', ?, ?, 'joined', NOW())
       ON DUPLICATE KEY UPDATE status='joined', last_seen=NOW()`,
      [room.id, room.tenant_id, guestName, token]
    );
    await insertSystemMessage(room.id, room.tenant_id, `${guestName} entrou na sala.`);
    res.json({ status: 'joined' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: sair da sala
router.post('/public/:code/leave', async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token e obrigatorio' });
    const room = await getRoomByCode(req.params.code);
    if (!room) return res.status(404).json({ error: 'Sala virtual nao encontrada' });
    const participant = await getParticipantByToken(token);
    if (!participant || participant.room_id !== room.id) {
      return res.status(404).json({ error: 'Participante nao encontrado' });
    }
    await pool.query(
      `UPDATE virtual_room_participants
       SET status='left', last_seen=NOW()
       WHERE id = ?`,
      [participant.id]
    );
    await insertSystemMessage(room.id, room.tenant_id, `${participant.name} saiu da sala.`);
    res.json({ status: 'left' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: listar fila de espera por codigo da sala
router.get('/:code/waiting', authenticate, async (req, res) => {
  try {
    const room = await getRoomByCode(req.params.code);
    if (!room || room.tenant_id !== req.user.tenant_id) {
      return res.status(404).json({ error: 'Sala virtual nao encontrada' });
    }
    const [rows] = await pool.query(
      `SELECT id, guest_name, status, created_at
       FROM virtual_room_waiting
       WHERE room_id = ? AND status = 'waiting'
       ORDER BY id ASC`,
      [room.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: listar participantes ativos
router.get('/:code/participants', authenticate, async (req, res) => {
  try {
    const room = await getRoomByCode(req.params.code);
    if (!room || room.tenant_id !== req.user.tenant_id) {
      return res.status(404).json({ error: 'Sala virtual nao encontrada' });
    }
    const [rows] = await pool.query(
      `SELECT id, name, role, status, last_seen
       FROM virtual_room_participants
       WHERE room_id = ? AND status = 'joined'
       ORDER BY id ASC`,
      [room.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: aprovar entrada
router.post('/:code/waiting/:waitId/approve', authenticate, async (req, res) => {
  try {
    const room = await getRoomByCode(req.params.code);
    if (!room || room.tenant_id !== req.user.tenant_id) {
      return res.status(404).json({ error: 'Sala virtual nao encontrada' });
    }
    const [result] = await pool.query(
      `UPDATE virtual_room_waiting
       SET status = 'approved'
       WHERE id = ? AND room_id = ?`,
      [req.params.waitId, room.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Solicitacao nao encontrada' });
    res.json({ message: 'Aprovado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: negar entrada
router.post('/:code/waiting/:waitId/deny', authenticate, async (req, res) => {
  try {
    const room = await getRoomByCode(req.params.code);
    if (!room || room.tenant_id !== req.user.tenant_id) {
      return res.status(404).json({ error: 'Sala virtual nao encontrada' });
    }
    const [result] = await pool.query(
      `UPDATE virtual_room_waiting
       SET status = 'denied'
       WHERE id = ? AND room_id = ?`,
      [req.params.waitId, room.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Solicitacao nao encontrada' });
    res.json({ message: 'Negado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: listar mensagens
router.get('/:code/messages', authenticate, async (req, res) => {
  try {
    const since = Number(req.query.since || 0);
    const room = await getRoomByCode(req.params.code);
    if (!room || room.tenant_id !== req.user.tenant_id) {
      return res.status(404).json({ error: 'Sala virtual nao encontrada' });
    }
    const [rows] = await pool.query(
      `SELECT id, sender_role, sender_name, message, created_at
       FROM virtual_room_messages
       WHERE room_id = ? AND id > ?
       ORDER BY id ASC
       LIMIT 200`,
      [room.id, since]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: enviar mensagem
router.post('/:code/messages', authenticate, async (req, res) => {
  try {
    const { message, sender_name } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message e obrigatorio' });
    const room = await getRoomByCode(req.params.code);
    if (!room || room.tenant_id !== req.user.tenant_id) {
      return res.status(404).json({ error: 'Sala virtual nao encontrada' });
    }
    await pool.query(
      `INSERT INTO virtual_room_messages (room_id, tenant_id, sender_role, sender_name, message)
       VALUES (?, ?, 'host', ?, ?)`,
      [room.id, room.tenant_id, sender_name || 'Profissional', message]
    );
    res.status(201).json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: listar mensagens
router.get('/public/:code/messages', async (req, res) => {
  try {
    const since = Number(req.query.since || 0);
    const room = await getRoomByCode(req.params.code);
    if (!room) return res.status(404).json({ error: 'Sala virtual nao encontrada' });
    const [rows] = await pool.query(
      `SELECT id, sender_role, sender_name, message, created_at
       FROM virtual_room_messages
       WHERE room_id = ? AND id > ?
       ORDER BY id ASC
       LIMIT 200`,
      [room.id, since]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: enviar mensagem
router.post('/public/:code/messages', async (req, res) => {
  try {
    const { token, message, sender_name } = req.body || {};
    if (!token || !message) return res.status(400).json({ error: 'token e message sao obrigatorios' });
    const room = await getRoomByCode(req.params.code);
    if (!room) return res.status(404).json({ error: 'Sala virtual nao encontrada' });
    const participant = await getParticipantByToken(token);
    if (!participant || participant.room_id !== room.id) {
      return res.status(404).json({ error: 'Participante nao encontrado' });
    }
    await pool.query(
      `INSERT INTO virtual_room_messages (room_id, tenant_id, sender_role, sender_name, message)
       VALUES (?, ?, 'guest', ?, ?)`,
      [room.id, room.tenant_id, sender_name || participant.name, message]
    );
    res.status(201).json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: listar eventos (lousa/tela)
router.get('/:code/events', authenticate, async (req, res) => {
  try {
    const since = Number(req.query.since || 0);
    const room = await getRoomByCode(req.params.code);
    if (!room || room.tenant_id !== req.user.tenant_id) {
      return res.status(404).json({ error: 'Sala virtual nao encontrada' });
    }
    const [rows] = await pool.query(
      `SELECT id, event_type, payload_json, created_at
       FROM virtual_room_events
       WHERE room_id = ? AND id > ?
       ORDER BY id ASC
       LIMIT 500`,
      [room.id, since]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: enviar eventos (lousa/tela)
router.post('/:code/events', authenticate, async (req, res) => {
  try {
    const { event_type, payload } = req.body || {};
    if (!event_type) return res.status(400).json({ error: 'event_type e obrigatorio' });
    const room = await getRoomByCode(req.params.code);
    if (!room || room.tenant_id !== req.user.tenant_id) {
      return res.status(404).json({ error: 'Sala virtual nao encontrada' });
    }
    await pool.query(
      `INSERT INTO virtual_room_events (room_id, tenant_id, event_type, payload_json)
       VALUES (?, ?, ?, ?)`,
      [room.id, room.tenant_id, event_type, payload ? JSON.stringify(payload) : null]
    );
    res.status(201).json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: listar eventos (lousa/tela)
router.get('/public/:code/events', async (req, res) => {
  try {
    const since = Number(req.query.since || 0);
    const room = await getRoomByCode(req.params.code);
    if (!room) return res.status(404).json({ error: 'Sala virtual nao encontrada' });
    const [rows] = await pool.query(
      `SELECT id, event_type, payload_json, created_at
       FROM virtual_room_events
       WHERE room_id = ? AND id > ?
       ORDER BY id ASC
       LIMIT 500`,
      [room.id, since]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: enviar eventos (lousa/tela)
router.post('/public/:code/events', async (req, res) => {
  try {
    const { token, event_type, payload } = req.body || {};
    if (!token || !event_type) return res.status(400).json({ error: 'token e event_type sao obrigatorios' });
    const room = await getRoomByCode(req.params.code);
    if (!room) return res.status(404).json({ error: 'Sala virtual nao encontrada' });
    const participant = await getParticipantByToken(token);
    if (!participant || participant.room_id !== room.id) {
      return res.status(404).json({ error: 'Participante nao encontrado' });
    }
    await pool.query(
      `INSERT INTO virtual_room_events (room_id, tenant_id, event_type, payload_json)
       VALUES (?, ?, ?, ?)`,
      [room.id, room.tenant_id, event_type, payload ? JSON.stringify(payload) : null]
    );
    res.status(201).json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: listar assessments
router.get('/:code/assessments', authenticate, async (req, res) => {
  try {
    const since = Number(req.query.since || 0);
    const room = await getRoomByCode(req.params.code);
    if (!room || room.tenant_id !== req.user.tenant_id) {
      return res.status(404).json({ error: 'Sala virtual nao encontrada' });
    }
    const [rows] = await pool.query(
      `SELECT id, event_type, assessment_id, question_id, payload_json, created_at
       FROM virtual_room_assessment_events
       WHERE room_id = ? AND id > ?
       ORDER BY id ASC
       LIMIT 500`,
      [room.id, since]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: enviar assessments
router.post('/:code/assessments', authenticate, async (req, res) => {
  try {
    const { event_type, assessment_id, question_id, payload } = req.body || {};
    if (!event_type || !assessment_id) return res.status(400).json({ error: 'event_type e assessment_id sao obrigatorios' });
    const room = await getRoomByCode(req.params.code);
    if (!room || room.tenant_id !== req.user.tenant_id) {
      return res.status(404).json({ error: 'Sala virtual nao encontrada' });
    }
    await pool.query(
      `INSERT INTO virtual_room_assessment_events (room_id, tenant_id, event_type, assessment_id, question_id, payload_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [room.id, room.tenant_id, event_type, assessment_id, question_id || null, payload ? JSON.stringify(payload) : null]
    );
    res.status(201).json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: listar assessments
router.get('/public/:code/assessments', async (req, res) => {
  try {
    const since = Number(req.query.since || 0);
    const room = await getRoomByCode(req.params.code);
    if (!room) return res.status(404).json({ error: 'Sala virtual nao encontrada' });
    const [rows] = await pool.query(
      `SELECT id, event_type, assessment_id, question_id, payload_json, created_at
       FROM virtual_room_assessment_events
       WHERE room_id = ? AND id > ?
       ORDER BY id ASC
       LIMIT 500`,
      [room.id, since]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: enviar assessments
router.post('/public/:code/assessments', async (req, res) => {
  try {
    const { token, event_type, assessment_id, question_id, payload } = req.body || {};
    if (!token || !event_type || !assessment_id) return res.status(400).json({ error: 'token, event_type e assessment_id sao obrigatorios' });
    const room = await getRoomByCode(req.params.code);
    if (!room) return res.status(404).json({ error: 'Sala virtual nao encontrada' });
    const participant = await getParticipantByToken(token);
    if (!participant || participant.room_id !== room.id) {
      return res.status(404).json({ error: 'Participante nao encontrado' });
    }
    await pool.query(
      `INSERT INTO virtual_room_assessment_events (room_id, tenant_id, event_type, assessment_id, question_id, payload_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [room.id, room.tenant_id, event_type, assessment_id, question_id || null, payload ? JSON.stringify(payload) : null]
    );
    res.status(201).json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar sala virtual
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      code,
      title,
      description,
      scheduled_start,
      scheduled_end,
      patient_id,
      professional_id,
      appointment_id,
      provider,
      link,
      expiration_date
    } = req.body || {};
    if (!code) return res.status(400).json({ error: 'code e obrigatorio' });
    const [result] = await pool.query(
      `INSERT INTO virtual_rooms (
        tenant_id, creator_user_id, code, title, description, scheduled_start, scheduled_end,
        patient_id, professional_id, appointment_id, provider, link, expiration_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenant_id,
        req.user.user_id,
        code,
        title,
        description,
        scheduled_start,
        scheduled_end,
        patient_id || null,
        professional_id || null,
        appointment_id || null,
        provider || null,
        link || null,
        expiration_date || null
      ]
    );
    res.status(201).json({ message: 'Sala virtual criada', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar sala virtual
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      code,
      title,
      description,
      scheduled_start,
      scheduled_end,
      patient_id,
      professional_id,
      appointment_id,
      provider,
      link,
      expiration_date
    } = req.body || {};
    const [result] = await pool.query(
      `UPDATE virtual_rooms SET
        code=?, title=?, description=?, scheduled_start=?, scheduled_end=?,
        patient_id=?, professional_id=?, appointment_id=?, provider=?, link=?, expiration_date=?
       WHERE id=? AND tenant_id=?`,
      [
        code,
        title,
        description,
        scheduled_start,
        scheduled_end,
        patient_id || null,
        professional_id || null,
        appointment_id || null,
        provider || null,
        link || null,
        expiration_date || null,
        req.params.id,
        req.user.tenant_id
      ]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Sala virtual nao encontrada' });
    res.json({ message: 'Sala virtual atualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remover sala virtual
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM virtual_rooms WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Sala virtual nao encontrada' });
    res.json({ message: 'Sala virtual removida' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
