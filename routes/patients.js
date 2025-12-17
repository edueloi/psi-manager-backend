import express from 'express';
import { pool } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// listar todos os pacientes
router.get('/', authenticate, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM patients WHERE tenant_id = ?', [req.user.tenant_id]);
  res.json(rows);
});

// buscar paciente por ID
router.get('/:id', authenticate, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM patients WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
  if (!rows.length) return res.status(404).json({ error: 'Paciente não encontrado' });
  res.json(rows[0]);
});

// criar paciente
router.post('/', authenticate, async (req, res) => {
  const data = req.body;
  const [result] = await pool.query(
    `INSERT INTO patients (
      tenant_id, full_name, email, whatsapp, cpf_cnpj, street, house_number, neighborhood,
      city, state, country, nationality, naturality, marital_status, education,
      profession, family_contact, has_children, children_count, minor_children_count,
      spouse_name, convenio, convenio_name, needs_reimbursement, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.tenant_id,
      data.full_name,
      data.email,
      data.whatsapp,
      data.cpf_cnpj,
      data.street,
      data.house_number,
      data.neighborhood,
      data.city,
      data.state,
      data.country,
      data.nationality,
      data.naturality,
      data.marital_status,
      data.education,
      data.profession,
      data.family_contact,
      data.has_children,
      data.children_count,
      data.minor_children_count,
      data.spouse_name,
      data.convenio,
      data.convenio_name,
      data.needs_reimbursement,
      data.status || 'ativo',
    ]
  );
  res.json({ message: 'Paciente criado', patient_id: result.insertId });
});

// atualizar paciente
router.put('/:id', authenticate, async (req, res) => {
  const data = req.body;
  await pool.query(
    `UPDATE patients SET
      full_name=?, email=?, whatsapp=?, cpf_cnpj=?, street=?, house_number=?, neighborhood=?,
      city=?, state=?, country=?, nationality=?, naturality=?, marital_status=?, education=?,
      profession=?, family_contact=?, has_children=?, children_count=?, minor_children_count=?,
      spouse_name=?, convenio=?, convenio_name=?, needs_reimbursement=?, status=?
      WHERE id=? AND tenant_id=?`,
    [
      data.full_name,
      data.email,
      data.whatsapp,
      data.cpf_cnpj,
      data.street,
      data.house_number,
      data.neighborhood,
      data.city,
      data.state,
      data.country,
      data.nationality,
      data.naturality,
      data.marital_status,
      data.education,
      data.profession,
      data.family_contact,
      data.has_children,
      data.children_count,
      data.minor_children_count,
      data.spouse_name,
      data.convenio,
      data.convenio_name,
      data.needs_reimbursement,
      data.status,
      req.params.id,
      req.user.tenant_id,
    ]
  );
  res.json({ message: 'Paciente atualizado' });
});

// deletar paciente
router.delete('/:id', authenticate, async (req, res) => {
  await pool.query('DELETE FROM patients WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
  res.json({ message: 'Paciente removido' });
});

export default router;
