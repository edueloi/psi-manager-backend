import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const toNull = (v) => (v === undefined || v === '' ? null : v);
const normalizeRecordType = (value) => {
  if (!value) return value;
  const map = {
    'Evolucao': 'Evolucao',
    'Evolução': 'Evolucao',
    'Anamnese': 'Anamnese',
    'Avaliacao': 'Avaliacao',
    'Avaliação': 'Avaliacao',
    'Encaminhamento': 'Encaminhamento',
    'Plano': 'Plano',
    'Relatorio': 'Relatorio'
  };
  return map[value] || value;
};

const insertAttachments = async (recordId, attachments) => {
  if (!Array.isArray(attachments) || attachments.length === 0) return;
  for (const item of attachments) {
    if (!item) continue;
    if (typeof item === 'string') {
      await pool.query(
        `INSERT INTO medical_record_attachments (record_id, file_name, file_url, file_type, file_size)
         VALUES (?, ?, ?, ?, ?)`,
        [recordId, 'Arquivo', item, null, null]
      );
      continue;
    }
    if (!item.file_url) continue;
    await pool.query(
      `INSERT INTO medical_record_attachments (record_id, file_name, file_url, file_type, file_size)
       VALUES (?, ?, ?, ?, ?)`,
      [
        recordId,
        item.file_name || 'Arquivo',
        item.file_url,
        toNull(item.file_type),
        toNull(item.file_size)
      ]
    );
  }
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
    `SELECT * FROM medical_records WHERE ${whereSql} ORDER BY created_at DESC`,
    params
  );
  res.json(rows);
});

router.get('/:id', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM medical_records WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Prontuario nao encontrado' });

  const [attachments] = await pool.query(
    `SELECT * FROM medical_record_attachments WHERE record_id = ? ORDER BY id ASC`,
    [req.params.id]
  );
  res.json({ ...rows[0], attachments });
});

router.post('/', authenticate, async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.patient_id || !data.record_type || !data.title) {
      return res.status(400).json({ error: 'Campos obrigatorios: patient_id, record_type, title' });
    }

    const recordType = normalizeRecordType(data.record_type);
    const [result] = await pool.query(
      `INSERT INTO medical_records
       (tenant_id, patient_id, creator_user_id, record_type, status, title, content, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenant_id,
        data.patient_id,
        req.user.user_id,
        recordType,
        data.status ?? 'Rascunho',
        data.title,
        toNull(data.content),
        data.tags ? JSON.stringify(data.tags) : null
      ]
    );
    if (data.attachments) {
      await insertAttachments(result.insertId, data.attachments);
    }
    res.status(201).json({ message: 'Prontuario criado', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.patient_id || !data.record_type || !data.title) {
      return res.status(400).json({ error: 'Campos obrigatorios: patient_id, record_type, title' });
    }

    const recordType = normalizeRecordType(data.record_type);
    const [result] = await pool.query(
      `UPDATE medical_records SET
        patient_id=?, record_type=?, status=?, title=?, content=?, tags=?
       WHERE id=? AND tenant_id=?`,
      [
        data.patient_id,
        recordType,
        data.status ?? 'Rascunho',
        data.title,
        toNull(data.content),
        data.tags ? JSON.stringify(data.tags) : null,
        req.params.id,
        req.user.tenant_id
      ]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Prontuario nao encontrado' });
    if (data.attachments) {
      const [recordRows] = await pool.query(
        `SELECT id FROM medical_records WHERE id = ? AND tenant_id = ?`,
        [req.params.id, req.user.tenant_id]
      );
      if (recordRows.length) {
        await pool.query(`DELETE FROM medical_record_attachments WHERE record_id = ?`, [req.params.id]);
        await insertAttachments(req.params.id, data.attachments);
      }
    }
    res.json({ message: 'Prontuario atualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  const [result] = await pool.query(
    `DELETE FROM medical_records WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Prontuario nao encontrado' });
  res.json({ message: 'Prontuario removido' });
});

router.post('/:id/attachments', authenticate, async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.file_name || !data.file_url) {
      return res.status(400).json({ error: 'Campos obrigatorios: file_name, file_url' });
    }

    const [recordRows] = await pool.query(
      `SELECT id FROM medical_records WHERE id = ? AND tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );
    if (!recordRows.length) return res.status(404).json({ error: 'Prontuario nao encontrado' });

    const [result] = await pool.query(
      `INSERT INTO medical_record_attachments (record_id, file_name, file_url, file_type, file_size)
       VALUES (?, ?, ?, ?, ?)`,
      [req.params.id, data.file_name, data.file_url, toNull(data.file_type), toNull(data.file_size)]
    );
    res.status(201).json({ message: 'Anexo adicionado', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/attachments/:attachmentId', authenticate, async (req, res) => {
  const [recordRows] = await pool.query(
    `SELECT id FROM medical_records WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (!recordRows.length) return res.status(404).json({ error: 'Prontuario nao encontrado' });

  const [result] = await pool.query(
    `DELETE FROM medical_record_attachments WHERE id = ? AND record_id = ?`,
    [req.params.attachmentId, req.params.id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Anexo nao encontrado' });
  res.json({ message: 'Anexo removido' });
});

export default router;


