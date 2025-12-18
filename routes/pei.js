import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const toNull = (v) => (v === undefined || v === '' ? null : v);

const loadPei = async (tenantId, id) => {
  const [plans] = await pool.query(
    `SELECT * FROM pei_plans WHERE id = ? AND tenant_id = ?`,
    [id, tenantId]
  );
  if (!plans.length) return null;
  const [goals] = await pool.query(
    `SELECT * FROM pei_goals WHERE pei_id = ? ORDER BY id ASC`,
    [id]
  );
  const goalIds = goals.map((g) => g.id);
  let history = [];
  if (goalIds.length) {
    const [rows] = await pool.query(
      `SELECT * FROM pei_goal_history WHERE goal_id IN (${goalIds.map(() => '?').join(',')})
       ORDER BY recorded_date ASC`,
      goalIds
    );
    history = rows;
  }
  const [abc] = await pool.query(
    `SELECT * FROM pei_abc_records WHERE pei_id = ? ORDER BY record_date DESC`,
    [id]
  );
  const [sensory] = await pool.query(
    `SELECT * FROM pei_sensory_profiles WHERE pei_id = ? LIMIT 1`,
    [id]
  );
  return { ...plans[0], goals, history, abc, sensory: sensory[0] ?? null };
};

router.get('/', authenticate, async (req, res) => {
  const { patient_id } = req.query || {};
  const params = [req.user.tenant_id];
  let whereSql = 'tenant_id = ?';
  if (patient_id) {
    whereSql += ' AND patient_id = ?';
    params.push(patient_id);
  }
  const [rows] = await pool.query(
    `SELECT * FROM pei_plans WHERE ${whereSql} ORDER BY id DESC`,
    params
  );
  res.json(rows);
});

router.get('/:id', authenticate, async (req, res) => {
  const pei = await loadPei(req.user.tenant_id, req.params.id);
  if (!pei) return res.status(404).json({ error: 'PEI nao encontrado' });
  res.json(pei);
});

router.post('/', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.patient_id || !data.start_date) {
    return res.status(400).json({ error: 'Campos obrigatorios: patient_id, start_date' });
  }
  const [result] = await pool.query(
    `INSERT INTO pei_plans
     (tenant_id, patient_id, creator_user_id, start_date, review_date, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      req.user.tenant_id,
      data.patient_id,
      req.user.user_id,
      data.start_date,
      toNull(data.review_date),
      data.status ?? 'active'
    ]
  );
  res.status(201).json({ message: 'PEI criado', id: result.insertId });
});

router.put('/:id', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.patient_id || !data.start_date) {
    return res.status(400).json({ error: 'Campos obrigatorios: patient_id, start_date' });
  }
  const [result] = await pool.query(
    `UPDATE pei_plans SET
      patient_id=?, start_date=?, review_date=?, status=?
     WHERE id=? AND tenant_id=?`,
    [
      data.patient_id,
      data.start_date,
      toNull(data.review_date),
      data.status ?? 'active',
      req.params.id,
      req.user.tenant_id
    ]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'PEI nao encontrado' });
  res.json({ message: 'PEI atualizado' });
});

router.delete('/:id', authenticate, async (req, res) => {
  const [result] = await pool.query(
    `DELETE FROM pei_plans WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'PEI nao encontrado' });
  res.json({ message: 'PEI removido' });
});

router.post('/:id/goals', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.area || !data.title) {
    return res.status(400).json({ error: 'Campos obrigatorios: area, title' });
  }
  const [result] = await pool.query(
    `INSERT INTO pei_goals
     (pei_id, area, title, description, status, current_value, target_value, start_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.params.id,
      data.area,
      data.title,
      toNull(data.description),
      data.status ?? 'acquisition',
      data.current_value ?? 0,
      data.target_value ?? 100,
      toNull(data.start_date)
    ]
  );
  res.status(201).json({ message: 'Meta criada', id: result.insertId });
});

router.put('/:id/goals/:goalId', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.area || !data.title) {
    return res.status(400).json({ error: 'Campos obrigatorios: area, title' });
  }
  const [result] = await pool.query(
    `UPDATE pei_goals SET
      area=?, title=?, description=?, status=?, current_value=?, target_value=?, start_date=?
     WHERE id=? AND pei_id=?`,
    [
      data.area,
      data.title,
      toNull(data.description),
      data.status ?? 'acquisition',
      data.current_value ?? 0,
      data.target_value ?? 100,
      toNull(data.start_date),
      req.params.goalId,
      req.params.id
    ]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Meta nao encontrada' });
  res.json({ message: 'Meta atualizada' });
});

router.delete('/:id/goals/:goalId', authenticate, async (req, res) => {
  const [result] = await pool.query(
    `DELETE FROM pei_goals WHERE id = ? AND pei_id = ?`,
    [req.params.goalId, req.params.id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Meta nao encontrada' });
  res.json({ message: 'Meta removida' });
});

router.post('/:id/goals/:goalId/history', authenticate, async (req, res) => {
  const data = req.body || {};
  if (data.value === undefined || !data.recorded_date) {
    return res.status(400).json({ error: 'Campos obrigatorios: value, recorded_date' });
  }
  const [result] = await pool.query(
    `INSERT INTO pei_goal_history (goal_id, value, recorded_date) VALUES (?, ?, ?)`,
    [req.params.goalId, data.value, data.recorded_date]
  );
  res.status(201).json({ message: 'Historico criado', id: result.insertId });
});

router.post('/:id/abc', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.record_date || !data.antecedent || !data.behavior) {
    return res.status(400).json({ error: 'Campos obrigatorios: record_date, antecedent, behavior' });
  }
  const [result] = await pool.query(
    `INSERT INTO pei_abc_records
     (pei_id, record_date, antecedent, behavior, consequence, intensity, duration)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      req.params.id,
      data.record_date,
      data.antecedent,
      data.behavior,
      toNull(data.consequence),
      data.intensity ?? 'medium',
      toNull(data.duration)
    ]
  );
  res.status(201).json({ message: 'Registro ABC criado', id: result.insertId });
});

router.delete('/:id/abc/:abcId', authenticate, async (req, res) => {
  const [result] = await pool.query(
    `DELETE FROM pei_abc_records WHERE id = ? AND pei_id = ?`,
    [req.params.abcId, req.params.id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Registro nao encontrado' });
  res.json({ message: 'Registro ABC removido' });
});

router.put('/:id/sensory', authenticate, async (req, res) => {
  const data = req.body || {};
  await pool.query(
    `INSERT INTO pei_sensory_profiles
     (pei_id, auditory, visual, tactile, vestibular, oral, social, proprioceptive, last_assessment_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       auditory=VALUES(auditory),
       visual=VALUES(visual),
       tactile=VALUES(tactile),
       vestibular=VALUES(vestibular),
       oral=VALUES(oral),
       social=VALUES(social),
       proprioceptive=VALUES(proprioceptive),
       last_assessment_date=VALUES(last_assessment_date)`,
    [
      req.params.id,
      data.auditory ?? 50,
      data.visual ?? 50,
      data.tactile ?? 50,
      data.vestibular ?? 50,
      data.oral ?? 50,
      data.social ?? 50,
      data.proprioceptive ?? 50,
      toNull(data.last_assessment_date)
    ]
  );
  res.json({ message: 'Perfil sensorial atualizado' });
});

export default router;
