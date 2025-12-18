import express from 'express';
import crypto from 'crypto';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const toNull = (v) => (v === undefined || v === '' ? null : v);

const loadForm = async (tenantId, id) => {
  const [forms] = await pool.query(
    `SELECT * FROM clinical_forms WHERE id = ? AND tenant_id = ?`,
    [id, tenantId]
  );
  if (!forms.length) return null;
  const [questions] = await pool.query(
    `SELECT * FROM clinical_form_questions WHERE form_id = ? ORDER BY sort_order ASC`,
    [id]
  );
  const [interpretations] = await pool.query(
    `SELECT * FROM clinical_form_interpretations WHERE form_id = ? ORDER BY id ASC`,
    [id]
  );
  return { ...forms[0], questions, interpretations };
};

const loadPublicFormByHash = async (hash) => {
  const [forms] = await pool.query(
    `SELECT * FROM clinical_forms WHERE hash = ? AND is_global = 1 LIMIT 1`,
    [hash]
  );
  if (!forms.length) return null;
  const form = forms[0];
  const [questions] = await pool.query(
    `SELECT * FROM clinical_form_questions WHERE form_id = ? ORDER BY sort_order ASC`,
    [form.id]
  );
  const [interpretations] = await pool.query(
    `SELECT * FROM clinical_form_interpretations WHERE form_id = ? ORDER BY id ASC`,
    [form.id]
  );
  return { ...form, questions, interpretations };
};

router.get('/', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, title, hash, description, is_global, response_count, created_at, updated_at
     FROM clinical_forms
     WHERE tenant_id = ?
     ORDER BY id DESC`,
    [req.user.tenant_id]
  );
  res.json(rows);
});

router.get('/:id', authenticate, async (req, res) => {
  const form = await loadForm(req.user.tenant_id, req.params.id);
  if (!form) return res.status(404).json({ error: 'Formulario nao encontrado' });
  res.json(form);
});

router.post('/', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.title) return res.status(400).json({ error: 'title e obrigatorio' });

  const questions = Array.isArray(data.questions) ? data.questions : [];
  const interpretations = Array.isArray(data.interpretations) ? data.interpretations : [];
  const hash = data.hash || crypto.randomBytes(16).toString('hex');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO clinical_forms
       (tenant_id, creator_user_id, title, hash, description, is_global, response_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenant_id,
        req.user.user_id,
        data.title,
        hash,
        toNull(data.description),
        data.is_global ?? 0,
        0
      ]
    );
    const formId = result.insertId;

    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      const questionType = q.question_type ?? q.type;
      const questionText = q.question_text ?? q.text;
      await conn.query(
        `INSERT INTO clinical_form_questions
         (form_id, question_type, question_text, is_required, options_json, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          formId,
          questionType,
          questionText,
          q.is_required ? 1 : 0,
          (q.options_json ?? q.options) ? JSON.stringify(q.options_json ?? q.options) : null,
          q.sort_order ?? i
        ]
      );
    }

    for (const rule of interpretations) {
      const minScore = rule.min_score ?? rule.minScore;
      const maxScore = rule.max_score ?? rule.maxScore;
      const resultTitle = rule.result_title ?? rule.resultTitle;
      await conn.query(
        `INSERT INTO clinical_form_interpretations
         (form_id, min_score, max_score, result_title, description, color)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          formId,
          minScore,
          maxScore,
          resultTitle,
          toNull(rule.description),
          toNull(rule.color)
        ]
      );
    }

    await conn.commit();
    res.status(201).json({ message: 'Formulario criado', id: formId, hash });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

router.put('/:id', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.title) return res.status(400).json({ error: 'title e obrigatorio' });

  const questions = Array.isArray(data.questions) ? data.questions : [];
  const interpretations = Array.isArray(data.interpretations) ? data.interpretations : [];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `UPDATE clinical_forms SET
        title=?, description=?, is_global=?
       WHERE id=? AND tenant_id=?`,
      [
        data.title,
        toNull(data.description),
        data.is_global ?? 0,
        req.params.id,
        req.user.tenant_id
      ]
    );
    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Formulario nao encontrado' });
    }

    await conn.query(`DELETE FROM clinical_form_questions WHERE form_id = ?`, [req.params.id]);
    await conn.query(`DELETE FROM clinical_form_interpretations WHERE form_id = ?`, [req.params.id]);

    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      const questionType = q.question_type ?? q.type;
      const questionText = q.question_text ?? q.text;
      await conn.query(
        `INSERT INTO clinical_form_questions
         (form_id, question_type, question_text, is_required, options_json, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          req.params.id,
          questionType,
          questionText,
          q.is_required ? 1 : 0,
          (q.options_json ?? q.options) ? JSON.stringify(q.options_json ?? q.options) : null,
          q.sort_order ?? i
        ]
      );
    }

    for (const rule of interpretations) {
      const minScore = rule.min_score ?? rule.minScore;
      const maxScore = rule.max_score ?? rule.maxScore;
      const resultTitle = rule.result_title ?? rule.resultTitle;
      await conn.query(
        `INSERT INTO clinical_form_interpretations
         (form_id, min_score, max_score, result_title, description, color)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          req.params.id,
          minScore,
          maxScore,
          resultTitle,
          toNull(rule.description),
          toNull(rule.color)
        ]
      );
    }

    await conn.commit();
    res.json({ message: 'Formulario atualizado' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  const [result] = await pool.query(
    `DELETE FROM clinical_forms WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Formulario nao encontrado' });
  res.json({ message: 'Formulario removido' });
});

router.get('/:id/responses', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM clinical_form_responses
     WHERE form_id = ? AND tenant_id = ?
     ORDER BY id DESC`,
    [req.params.id, req.user.tenant_id]
  );
  res.json(rows);
});

router.post('/:id/responses', authenticate, async (req, res) => {
  const data = req.body || {};
  const answersPayload = data.answers_json ?? data.answers;
  if (!answersPayload) {
    return res.status(400).json({ error: 'answers_json e obrigatorio' });
  }

  const respondentName = data.respondent_name ?? data.respondentName ?? data.name ?? null;
  const respondentEmail = data.respondent_email ?? data.respondentEmail ?? data.email ?? null;
  const respondentPhone = data.respondent_phone ?? data.respondentPhone ?? data.phone ?? null;
  const patientId = data.patient_id ?? data.patientId ?? null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO clinical_form_responses
       (form_id, tenant_id, patient_id, respondent_name, respondent_email, respondent_phone, answers_json, score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.id,
        req.user.tenant_id,
        toNull(patientId),
        toNull(respondentName),
        toNull(respondentEmail),
        toNull(respondentPhone),
        JSON.stringify(answersPayload),
        toNull(data.score)
      ]
    );
    await conn.query(
      `UPDATE clinical_forms SET response_count = response_count + 1 WHERE id = ? AND tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );
    await conn.commit();
    res.status(201).json({ message: 'Resposta registrada', id: result.insertId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Public form by hash (no auth)
router.get('/public/:hash', async (req, res) => {
  const form = await loadPublicFormByHash(req.params.hash);
  if (!form) return res.status(404).json({ error: 'Formulario nao encontrado' });
  res.json(form);
});

router.post('/public/:hash/responses', async (req, res) => {
  const data = req.body || {};
  const answersPayload = data.answers_json ?? data.answers;
  if (!answersPayload) {
    return res.status(400).json({ error: 'answers_json e obrigatorio' });
  }

  const respondentName = data.respondent_name ?? data.respondentName ?? data.name ?? null;
  const respondentEmail = data.respondent_email ?? data.respondentEmail ?? data.email ?? null;
  const respondentPhone = data.respondent_phone ?? data.respondentPhone ?? data.phone ?? null;

  const form = await loadPublicFormByHash(req.params.hash);
  if (!form) return res.status(404).json({ error: 'Formulario nao encontrado' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO clinical_form_responses
       (form_id, tenant_id, patient_id, respondent_name, respondent_email, respondent_phone, answers_json, score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        form.id,
        form.tenant_id,
        null,
        toNull(respondentName),
        toNull(respondentEmail),
        toNull(respondentPhone),
        JSON.stringify(answersPayload),
        toNull(data.score)
      ]
    );
    await conn.query(
      `UPDATE clinical_forms SET response_count = response_count + 1 WHERE id = ?`,
      [form.id]
    );
    await conn.commit();
    res.status(201).json({ message: 'Resposta registrada', id: result.insertId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

export default router;
