import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const toNull = (v) => (v === undefined || v === '' ? null : v);

router.get('/', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM neuro_assessments
     WHERE tenant_id = ? OR tenant_id IS NULL
     ORDER BY id DESC`,
    [req.user.tenant_id]
  );
  res.json(rows);
});

router.get('/:id', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM neuro_assessments
     WHERE id = ? AND (tenant_id = ? OR tenant_id IS NULL)`,
    [req.params.id, req.user.tenant_id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Avaliacao nao encontrada' });
  res.json(rows[0]);
});

router.post('/', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.name) return res.status(400).json({ error: 'name e obrigatorio' });

  const [result] = await pool.query(
    `INSERT INTO neuro_assessments
     (tenant_id, name, description, assessment_type, cutoff, questions_json, options_json, color)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.tenant_id,
      data.name,
      toNull(data.description),
      data.assessment_type ?? 'sum',
      toNull(data.cutoff),
      data.questions_json ? JSON.stringify(data.questions_json) : null,
      data.options_json ? JSON.stringify(data.options_json) : null,
      toNull(data.color)
    ]
  );
  res.status(201).json({ message: 'Avaliacao criada', id: result.insertId });
});

router.put('/:id', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.name) return res.status(400).json({ error: 'name e obrigatorio' });

  const [result] = await pool.query(
    `UPDATE neuro_assessments SET
      name=?, description=?, assessment_type=?, cutoff=?, questions_json=?, options_json=?, color=?
     WHERE id=? AND tenant_id=?`,
    [
      data.name,
      toNull(data.description),
      data.assessment_type ?? 'sum',
      toNull(data.cutoff),
      data.questions_json ? JSON.stringify(data.questions_json) : null,
      data.options_json ? JSON.stringify(data.options_json) : null,
      toNull(data.color),
      req.params.id,
      req.user.tenant_id
    ]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Avaliacao nao encontrada' });
  res.json({ message: 'Avaliacao atualizada' });
});

router.delete('/:id', authenticate, async (req, res) => {
  const [result] = await pool.query(
    `DELETE FROM neuro_assessments WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Avaliacao nao encontrada' });
  res.json({ message: 'Avaliacao removida' });
});

router.get('/:id/results', authenticate, async (req, res) => {
  const { patient_id } = req.query || {};
  const params = [req.user.tenant_id, req.params.id];
  let whereSql = 'tenant_id = ? AND assessment_id = ?';
  if (patient_id) {
    whereSql += ' AND patient_id = ?';
    params.push(patient_id);
  }
  const [rows] = await pool.query(
    `SELECT * FROM neuro_assessment_results WHERE ${whereSql} ORDER BY id DESC`,
    params
  );
  res.json(rows);
});

router.post('/:id/results', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.patient_id) return res.status(400).json({ error: 'patient_id e obrigatorio' });

  const [result] = await pool.query(
    `INSERT INTO neuro_assessment_results
     (tenant_id, patient_id, assessment_id, score, answers_json)
     VALUES (?, ?, ?, ?, ?)`,
    [
      req.user.tenant_id,
      data.patient_id,
      req.params.id,
      toNull(data.score),
      data.answers_json ? JSON.stringify(data.answers_json) : null
    ]
  );
  res.status(201).json({ message: 'Resultado criado', id: result.insertId });
});

export default router;
