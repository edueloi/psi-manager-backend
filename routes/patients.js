import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const toNull = (v) => (v === undefined || v === '' ? null : v);
const pickFullName = (data) => data.full_name ?? data.fullName ?? data.name;
const pickWhatsapp = (data) => data.whatsapp ?? data.phone;

// listar todos os pacientes
router.get('/', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM patients WHERE tenant_id = ?',
    [req.user.tenant_id]
  );
  res.json(rows);
});

// buscar paciente por ID
router.get('/:id', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM patients WHERE id = ? AND tenant_id = ?',
    [req.params.id, req.user.tenant_id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Paciente não encontrado' });
  res.json(rows[0]);
});

// criar paciente
router.post('/', authenticate, async (req, res) => {
  const data = req.body || {};

  const full_name = pickFullName(data);
  const whatsapp = pickWhatsapp(data);

  if (!full_name) {
    return res.status(400).json({ error: 'full_name (ou name/fullName) é obrigatório' });
  }

  const [result] = await pool.query(
    `INSERT INTO patients (
      tenant_id, full_name, email, whatsapp, cpf_cnpj, street, house_number, neighborhood,
      city, state, country, nationality, naturality, marital_status, education,
      profession, family_contact, has_children, children_count, minor_children_count,
      spouse_name, convenio, convenio_name, needs_reimbursement, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.tenant_id,
      full_name,
      toNull(data.email),
      toNull(whatsapp),
      toNull(data.cpf_cnpj),
      toNull(data.street),
      toNull(data.house_number),
      toNull(data.neighborhood),
      toNull(data.city),
      toNull(data.state),
      toNull(data.country),
      toNull(data.nationality),
      toNull(data.naturality),
      toNull(data.marital_status),
      toNull(data.education),
      toNull(data.profession),
      toNull(data.family_contact),
      toNull(data.has_children),
      toNull(data.children_count),
      toNull(data.minor_children_count),
      toNull(data.spouse_name),
      toNull(data.convenio),
      toNull(data.convenio_name),
      toNull(data.needs_reimbursement),
      data.status ?? 'ativo',
    ]
  );

  return res.status(201).json({ message: 'Paciente criado', patient_id: result.insertId });
});

// atualizar paciente
router.put('/:id', authenticate, async (req, res) => {
  const data = req.body || {};

  const full_name = pickFullName(data);
  const whatsapp = pickWhatsapp(data);

  if (!full_name) {
    return res.status(400).json({ error: 'full_name (ou name/fullName) é obrigatório' });
  }

  await pool.query(
    `UPDATE patients SET
      full_name=?, email=?, whatsapp=?, cpf_cnpj=?, street=?, house_number=?, neighborhood=?,
      city=?, state=?, country=?, nationality=?, naturality=?, marital_status=?, education=?,
      profession=?, family_contact=?, has_children=?, children_count=?, minor_children_count=?,
      spouse_name=?, convenio=?, convenio_name=?, needs_reimbursement=?, status=?
      WHERE id=? AND tenant_id=?`,
    [
      full_name,
      toNull(data.email),
      toNull(whatsapp),
      toNull(data.cpf_cnpj),
      toNull(data.street),
      toNull(data.house_number),
      toNull(data.neighborhood),
      toNull(data.city),
      toNull(data.state),
      toNull(data.country),
      toNull(data.nationality),
      toNull(data.naturality),
      toNull(data.marital_status),
      toNull(data.education),
      toNull(data.profession),
      toNull(data.family_contact),
      toNull(data.has_children),
      toNull(data.children_count),
      toNull(data.minor_children_count),
      toNull(data.spouse_name),
      toNull(data.convenio),
      toNull(data.convenio_name),
      toNull(data.needs_reimbursement),
      data.status ?? 'ativo',
      req.params.id,
      req.user.tenant_id,
    ]
  );

  res.json({ message: 'Paciente atualizado' });
});

// deletar paciente
router.delete('/:id', authenticate, async (req, res) => {
  await pool.query(
    'DELETE FROM patients WHERE id = ? AND tenant_id = ?',
    [req.params.id, req.user.tenant_id]
  );
  res.json({ message: 'Paciente removido' });
});

export default router;
