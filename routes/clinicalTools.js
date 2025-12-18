import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const ensurePatient = async (tenantId, patientId) => {
  const [rows] = await pool.query(
    'SELECT id FROM patients WHERE id = ? AND tenant_id = ?',
    [patientId, tenantId]
  );
  return rows.length > 0;
};

const clampInt = (v, min, max, fallback) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
};

/* -------------------- TCC -------------------- */

// GET tudo do TCC (RPD + cards)
router.get('/:patientId/tcc', authenticate, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const patientId = Number(req.params.patientId);

  if (!(await ensurePatient(tenantId, patientId))) {
    return res.status(404).json({ error: 'Paciente não encontrado' });
  }

  const [records] = await pool.query(
    `SELECT id, situation, thought, emotion, intensity, created_at
     FROM tcc_rpd_records
     WHERE tenant_id = ? AND patient_id = ?
     ORDER BY created_at DESC`,
    [tenantId, patientId]
  );

  const [cards] = await pool.query(
    `SELECT id, front, back, created_at
     FROM tcc_coping_cards
     WHERE tenant_id = ? AND patient_id = ?
     ORDER BY created_at DESC`,
    [tenantId, patientId]
  );

  res.json({ records, cards });
});

// POST RPD
router.post('/:patientId/tcc/rpd', authenticate, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const userId = req.user.id ?? null;
  const patientId = Number(req.params.patientId);

  if (!(await ensurePatient(tenantId, patientId))) {
    return res.status(404).json({ error: 'Paciente não encontrado' });
  }

  const { situation, thought, emotion, intensity } = req.body || {};
  if (!situation?.trim() || !thought?.trim()) {
    return res.status(400).json({ error: 'situation e thought são obrigatórios' });
  }

  const safeIntensity = clampInt(intensity, 0, 10, 5);

  const [result] = await pool.query(
    `INSERT INTO tcc_rpd_records
     (tenant_id, patient_id, creator_user_id, situation, thought, emotion, intensity)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, patientId, userId, situation.trim(), thought.trim(), (emotion || '').trim(), safeIntensity]
  );

  res.status(201).json({ id: result.insertId });
});

// PUT RPD
router.put('/:patientId/tcc/rpd/:id', authenticate, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const patientId = Number(req.params.patientId);
  const id = Number(req.params.id);

  const { situation, thought, emotion, intensity } = req.body || {};
  if (!situation?.trim() || !thought?.trim()) {
    return res.status(400).json({ error: 'situation e thought são obrigatórios' });
  }

  const safeIntensity = clampInt(intensity, 0, 10, 5);

  const [result] = await pool.query(
    `UPDATE tcc_rpd_records
     SET situation=?, thought=?, emotion=?, intensity=?
     WHERE id=? AND tenant_id=? AND patient_id=?`,
    [situation.trim(), thought.trim(), (emotion || '').trim(), safeIntensity, id, tenantId, patientId]
  );

  if (result.affectedRows === 0) return res.status(404).json({ error: 'Registro não encontrado' });
  res.json({ ok: true });
});

// DELETE RPD
router.delete('/:patientId/tcc/rpd/:id', authenticate, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const patientId = Number(req.params.patientId);
  const id = Number(req.params.id);

  const [result] = await pool.query(
    `DELETE FROM tcc_rpd_records WHERE id=? AND tenant_id=? AND patient_id=?`,
    [id, tenantId, patientId]
  );

  if (result.affectedRows === 0) return res.status(404).json({ error: 'Registro não encontrado' });
  res.json({ ok: true });
});

// POST Card
router.post('/:patientId/tcc/cards', authenticate, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const userId = req.user.id ?? null;
  const patientId = Number(req.params.patientId);

  const { front, back } = req.body || {};
  if (!front?.trim() || !back?.trim()) {
    return res.status(400).json({ error: 'front e back são obrigatórios' });
  }

  const [result] = await pool.query(
    `INSERT INTO tcc_coping_cards (tenant_id, patient_id, creator_user_id, front, back)
     VALUES (?, ?, ?, ?, ?)`,
    [tenantId, patientId, userId, front.trim(), back.trim()]
  );

  res.status(201).json({ id: result.insertId });
});

// PUT Card
router.put('/:patientId/tcc/cards/:id', authenticate, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const patientId = Number(req.params.patientId);
  const id = Number(req.params.id);

  const { front, back } = req.body || {};
  if (!front?.trim() || !back?.trim()) {
    return res.status(400).json({ error: 'front e back são obrigatórios' });
  }

  const [result] = await pool.query(
    `UPDATE tcc_coping_cards SET front=?, back=?
     WHERE id=? AND tenant_id=? AND patient_id=?`,
    [front.trim(), back.trim(), id, tenantId, patientId]
  );

  if (result.affectedRows === 0) return res.status(404).json({ error: 'Card não encontrado' });
  res.json({ ok: true });
});

// DELETE Card
router.delete('/:patientId/tcc/cards/:id', authenticate, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const patientId = Number(req.params.patientId);
  const id = Number(req.params.id);

  const [result] = await pool.query(
    `DELETE FROM tcc_coping_cards WHERE id=? AND tenant_id=? AND patient_id=?`,
    [id, tenantId, patientId]
  );

  if (result.affectedRows === 0) return res.status(404).json({ error: 'Card não encontrado' });
  res.json({ ok: true });
});

/* -------------------- ESQUEMAS -------------------- */

// GET último snapshot
router.get('/:patientId/schema/latest', authenticate, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const patientId = Number(req.params.patientId);

  const [rows] = await pool.query(
    `SELECT id, active_schemas, modes, created_at
     FROM schema_snapshots
     WHERE tenant_id=? AND patient_id=?
     ORDER BY created_at DESC
     LIMIT 1`,
    [tenantId, patientId]
  );

  if (!rows.length) return res.json({ active_schemas: [], modes: [], created_at: null });
  res.json(rows[0]);
});

// POST snapshot (quando clicar “Salvar registro”)
router.post('/:patientId/schema/snapshot', authenticate, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const userId = req.user.id ?? null;
  const patientId = Number(req.params.patientId);

  const { activeSchemas, modes } = req.body || {};
  if (!Array.isArray(activeSchemas) || !Array.isArray(modes)) {
    return res.status(400).json({ error: 'activeSchemas e modes devem ser arrays' });
  }

  const [result] = await pool.query(
    `INSERT INTO schema_snapshots (tenant_id, patient_id, creator_user_id, active_schemas, modes)
     VALUES (?, ?, ?, ?, ?)`,
    [tenantId, patientId, userId, JSON.stringify(activeSchemas), JSON.stringify(modes)]
  );

  res.status(201).json({ id: result.insertId });
});

/* -------------------- PSICANÁLISE -------------------- */

// GET tudo (dreams + free + signifiers)
router.get('/:patientId/psycho', authenticate, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const patientId = Number(req.params.patientId);

  const [dreams] = await pool.query(
    `SELECT id, title, manifest, latent, created_at
     FROM psycho_dreams
     WHERE tenant_id=? AND patient_id=?
     ORDER BY created_at DESC`,
    [tenantId, patientId]
  );

  const [freeRows] = await pool.query(
    `SELECT content, updated_at
     FROM psycho_free_text
     WHERE tenant_id=? AND patient_id=?
     LIMIT 1`,
    [tenantId, patientId]
  );

  const [signifiers] = await pool.query(
    `SELECT id, term, created_at
     FROM psycho_signifiers
     WHERE tenant_id=? AND patient_id=?
     ORDER BY created_at DESC`,
    [tenantId, patientId]
  );

  res.json({
    dreams,
    freeText: freeRows[0]?.content ?? '',
    signifiers,
  });
});

// POST dream
router.post('/:patientId/psycho/dreams', authenticate, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const userId = req.user.id ?? null;
  const patientId = Number(req.params.patientId);

  const { title, manifest, latent } = req.body || {};
  if (!title?.trim() && !manifest?.trim() && !latent?.trim()) {
    return res.status(400).json({ error: 'Preencha ao menos um campo' });
  }

  const [result] = await pool.query(
    `INSERT INTO psycho_dreams (tenant_id, patient_id, creator_user_id, title, manifest, latent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [tenantId, patientId, userId, title?.trim() || null, manifest?.trim() || null, latent?.trim() || null]
  );

  res.status(201).json({ id: result.insertId });
});

// PUT free text (upsert)
router.put('/:patientId/psycho/free', authenticate, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const userId = req.user.id ?? null;
  const patientId = Number(req.params.patientId);
  const { content } = req.body || {};

  await pool.query(
    `INSERT INTO psycho_free_text (tenant_id, patient_id, creator_user_id, content)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE content=VALUES(content), creator_user_id=VALUES(creator_user_id)`,
    [tenantId, patientId, userId, content ?? '']
  );

  res.json({ ok: true });
});

// POST signifier
router.post('/:patientId/psycho/signifiers', authenticate, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const userId = req.user.id ?? null;
  const patientId = Number(req.params.patientId);
  const { term } = req.body || {};

  if (!term?.trim()) return res.status(400).json({ error: 'term é obrigatório' });

  const [result] = await pool.query(
    `INSERT INTO psycho_signifiers (tenant_id, patient_id, creator_user_id, term)
     VALUES (?, ?, ?, ?)`,
    [tenantId, patientId, userId, term.trim()]
  );

  res.status(201).json({ id: result.insertId });
});

export default router;
