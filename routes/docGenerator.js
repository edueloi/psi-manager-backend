import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const toNull = (v) => (v === undefined || v === '' ? null : v);

const renderTemplate = (templateBody, data) => {
  if (!templateBody) return '';
  return templateBody.replace(/{{\s*([\w.]+)\s*}}/g, (_match, key) => {
    const value = data[key];
    if (value === undefined || value === null) return '';
    return String(value);
  });
};

const loadPatientData = async (patientId, tenantId) => {
  if (!patientId) return {};
  const [rows] = await pool.query(
    `SELECT full_name, email, whatsapp, cpf_cnpj, birth_date, city, state
     FROM patients WHERE id = ? AND tenant_id = ?`,
    [patientId, tenantId]
  );
  if (!rows.length) return {};
  const p = rows[0];
  return {
    patient_name: p.full_name,
    patient_email: p.email,
    patient_phone: p.whatsapp,
    patient_cpf: p.cpf_cnpj,
    patient_birth_date: p.birth_date,
    patient_city: p.city,
    patient_state: p.state
  };
};

// Categories
router.get('/doc-categories', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM document_categories WHERE tenant_id = ? ORDER BY name ASC`,
    [req.user.tenant_id]
  );
  res.json(rows);
});

router.post('/doc-categories', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.name) return res.status(400).json({ error: 'name e obrigatorio' });

  const [result] = await pool.query(
    `INSERT INTO document_categories (tenant_id, name) VALUES (?, ?)`,
    [req.user.tenant_id, data.name]
  );
  res.status(201).json({ message: 'Categoria criada', id: result.insertId });
});

router.put('/doc-categories/:id', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.name) return res.status(400).json({ error: 'name e obrigatorio' });

  const [result] = await pool.query(
    `UPDATE document_categories SET name=? WHERE id=? AND tenant_id=?`,
    [data.name, req.params.id, req.user.tenant_id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Categoria nao encontrada' });
  res.json({ message: 'Categoria atualizada' });
});

router.delete('/doc-categories/:id', authenticate, async (req, res) => {
  const [result] = await pool.query(
    `DELETE FROM document_categories WHERE id=? AND tenant_id=?`,
    [req.params.id, req.user.tenant_id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Categoria nao encontrada' });
  res.json({ message: 'Categoria removida' });
});

// Templates
router.get('/doc-templates', authenticate, async (req, res) => {
  const { category_id } = req.query || {};
  const params = [req.user.tenant_id];
  let whereSql = 'tenant_id = ?';
  if (category_id) {
    whereSql += ' AND category_id = ?';
    params.push(category_id);
  }

  const [rows] = await pool.query(
    `SELECT * FROM document_templates WHERE ${whereSql} ORDER BY id DESC`,
    params
  );
  res.json(rows);
});

router.get('/doc-templates/:id', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM document_templates WHERE id=? AND tenant_id=?`,
    [req.params.id, req.user.tenant_id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Template nao encontrado' });
  res.json(rows[0]);
});

router.post('/doc-templates', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.title || !data.template_body) {
    return res.status(400).json({ error: 'Campos obrigatorios: title, template_body' });
  }

  const [result] = await pool.query(
    `INSERT INTO document_templates
     (tenant_id, category_id, title, doc_type, template_body, header_logo_url, footer_logo_url, signature_name, signature_crp, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.tenant_id,
      toNull(data.category_id),
      data.title,
      toNull(data.doc_type),
      data.template_body,
      toNull(data.header_logo_url),
      toNull(data.footer_logo_url),
      toNull(data.signature_name),
      toNull(data.signature_crp),
      req.user.user_id
    ]
  );
  res.status(201).json({ message: 'Template criado', id: result.insertId });
});

router.put('/doc-templates/:id', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.title || !data.template_body) {
    return res.status(400).json({ error: 'Campos obrigatorios: title, template_body' });
  }

  const [result] = await pool.query(
    `UPDATE document_templates SET
      category_id=?, title=?, doc_type=?, template_body=?, header_logo_url=?, footer_logo_url=?, signature_name=?, signature_crp=?
     WHERE id=? AND tenant_id=?`,
    [
      toNull(data.category_id),
      data.title,
      toNull(data.doc_type),
      data.template_body,
      toNull(data.header_logo_url),
      toNull(data.footer_logo_url),
      toNull(data.signature_name),
      toNull(data.signature_crp),
      req.params.id,
      req.user.tenant_id
    ]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Template nao encontrado' });
  res.json({ message: 'Template atualizado' });
});

router.delete('/doc-templates/:id', authenticate, async (req, res) => {
  const [result] = await pool.query(
    `DELETE FROM document_templates WHERE id=? AND tenant_id=?`,
    [req.params.id, req.user.tenant_id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Template nao encontrado' });
  res.json({ message: 'Template removido' });
});

router.post('/doc-templates/:id/render', authenticate, async (req, res) => {
  const data = req.body || {};
  const [rows] = await pool.query(
    `SELECT * FROM document_templates WHERE id=? AND tenant_id=?`,
    [req.params.id, req.user.tenant_id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Template nao encontrado' });

  const template = rows[0];
  const patientData = await loadPatientData(data.patient_id, req.user.tenant_id);
  const merged = { ...patientData, ...(data.data || {}) };
  const rendered = renderTemplate(template.template_body, merged);
  res.json({ rendered_html: rendered });
});

// Instances
router.get('/doc-instances', authenticate, async (req, res) => {
  const { patient_id, template_id } = req.query || {};
  const params = [req.user.tenant_id];
  let whereSql = 'tenant_id = ?';
  if (patient_id) {
    whereSql += ' AND patient_id = ?';
    params.push(patient_id);
  }
  if (template_id) {
    whereSql += ' AND template_id = ?';
    params.push(template_id);
  }

  const [rows] = await pool.query(
    `SELECT * FROM document_instances WHERE ${whereSql} ORDER BY id DESC`,
    params
  );
  res.json(rows);
});

router.get('/doc-instances/:id', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM document_instances WHERE id=? AND tenant_id=?`,
    [req.params.id, req.user.tenant_id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Documento nao encontrado' });
  res.json(rows[0]);
});

router.post('/doc-instances', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.template_id || !data.title) {
    return res.status(400).json({ error: 'Campos obrigatorios: template_id, title' });
  }

  const [result] = await pool.query(
    `INSERT INTO document_instances
     (tenant_id, template_id, patient_id, professional_user_id, title, data_json, rendered_html, file_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.tenant_id,
      data.template_id,
      toNull(data.patient_id),
      toNull(data.professional_user_id),
      data.title,
      data.data_json ? JSON.stringify(data.data_json) : null,
      toNull(data.rendered_html),
      toNull(data.file_url)
    ]
  );
  res.status(201).json({ message: 'Documento criado', id: result.insertId });
});

router.delete('/doc-instances/:id', authenticate, async (req, res) => {
  const [result] = await pool.query(
    `DELETE FROM document_instances WHERE id=? AND tenant_id=?`,
    [req.params.id, req.user.tenant_id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Documento nao encontrado' });
  res.json({ message: 'Documento removido' });
});

export default router;
