import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const toNull = (v) => (v === undefined || v === '' ? null : v);
const normalizeTags = (tags) => {
  if (!tags) return null;
  if (Array.isArray(tags)) return JSON.stringify(tags);
  if (typeof tags === 'string') return tags;
  return JSON.stringify(tags);
};

const getBoardById = async (boardId, tenantId) => {
  const [rows] = await pool.query(
    `SELECT * FROM case_study_boards WHERE id = ? AND tenant_id = ?`,
    [boardId, tenantId]
  );
  return rows[0] || null;
};

const getCardTenant = async (cardId, tenantId) => {
  const [rows] = await pool.query(
    `SELECT c.id
     FROM case_study_cards c
     JOIN case_study_boards b ON b.id = c.board_id
     WHERE c.id = ? AND b.tenant_id = ?`,
    [cardId, tenantId]
  );
  return rows.length > 0;
};

const getColumnTenant = async (columnId, tenantId, boardId = null) => {
  const [rows] = await pool.query(
    `SELECT c.id
     FROM case_study_columns c
     JOIN case_study_boards b ON b.id = c.board_id
     WHERE c.id = ? AND b.tenant_id = ?${boardId ? ' AND c.board_id = ?' : ''}`,
    boardId ? [columnId, tenantId, boardId] : [columnId, tenantId]
  );
  return rows.length > 0;
};

const getCardBoardId = async (cardId, tenantId) => {
  const [rows] = await pool.query(
    `SELECT c.board_id
     FROM case_study_cards c
     JOIN case_study_boards b ON b.id = c.board_id
     WHERE c.id = ? AND b.tenant_id = ?`,
    [cardId, tenantId]
  );
  return rows[0]?.board_id ?? null;
};

// Boards
router.get('/boards', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT b.*,
      (SELECT COUNT(*) FROM case_study_columns c WHERE c.board_id = b.id) AS column_count,
      (SELECT COUNT(*) FROM case_study_cards ca WHERE ca.board_id = b.id) AS card_count
     FROM case_study_boards b
     WHERE b.tenant_id = ?
     ORDER BY b.created_at DESC`,
    [req.user.tenant_id]
  );
  res.json(rows);
});

router.get('/boards/:id', authenticate, async (req, res) => {
  const board = await getBoardById(req.params.id, req.user.tenant_id);
  if (!board) return res.status(404).json({ error: 'Quadro nao encontrado' });

  const [columns] = await pool.query(
    `SELECT * FROM case_study_columns WHERE board_id = ? ORDER BY sort_order ASC, id ASC`,
    [req.params.id]
  );

  const [cards] = await pool.query(
    `SELECT c.*,
            p.full_name AS patient_name
     FROM case_study_cards c
     LEFT JOIN patients p ON p.id = c.patient_id
     WHERE c.board_id = ?
     ORDER BY c.sort_order ASC, c.id ASC`,
    [req.params.id]
  );

  res.json({ ...board, columns, cards });
});

router.post('/boards', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.title) return res.status(400).json({ error: 'Campos obrigatorios: title' });

  const [result] = await pool.query(
    `INSERT INTO case_study_boards
     (tenant_id, title, description, created_by)
     VALUES (?, ?, ?, ?)`,
    [req.user.tenant_id, data.title, toNull(data.description), req.user.user_id]
  );
  res.status(201).json({ message: 'Quadro criado', id: result.insertId });
});

router.put('/boards/:id', authenticate, async (req, res) => {
  const data = req.body || {};
  if (!data.title) return res.status(400).json({ error: 'Campos obrigatorios: title' });

  const [result] = await pool.query(
    `UPDATE case_study_boards SET title = ?, description = ?
     WHERE id = ? AND tenant_id = ?`,
    [data.title, toNull(data.description), req.params.id, req.user.tenant_id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Quadro nao encontrado' });
  res.json({ message: 'Quadro atualizado' });
});

router.delete('/boards/:id', authenticate, async (req, res) => {
  const [result] = await pool.query(
    `DELETE FROM case_study_boards WHERE id = ? AND tenant_id = ?`,
    [req.params.id, req.user.tenant_id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Quadro nao encontrado' });
  res.json({ message: 'Quadro removido' });
});

// Columns
router.get('/boards/:boardId/columns', authenticate, async (req, res) => {
  const board = await getBoardById(req.params.boardId, req.user.tenant_id);
  if (!board) return res.status(404).json({ error: 'Quadro nao encontrado' });

  const [rows] = await pool.query(
    `SELECT * FROM case_study_columns WHERE board_id = ? ORDER BY sort_order ASC, id ASC`,
    [req.params.boardId]
  );
  res.json(rows);
});

router.post('/boards/:boardId/columns', authenticate, async (req, res) => {
  const board = await getBoardById(req.params.boardId, req.user.tenant_id);
  if (!board) return res.status(404).json({ error: 'Quadro nao encontrado' });

  const data = req.body || {};
  if (!data.title) return res.status(400).json({ error: 'Campos obrigatorios: title' });

  const [result] = await pool.query(
    `INSERT INTO case_study_columns (board_id, title, color, sort_order)
     VALUES (?, ?, ?, ?)`,
    [req.params.boardId, data.title, toNull(data.color), data.sort_order ?? 0]
  );
  res.status(201).json({ message: 'Coluna criada', id: result.insertId });
});

router.put('/boards/:boardId/columns/:columnId', authenticate, async (req, res) => {
  const board = await getBoardById(req.params.boardId, req.user.tenant_id);
  if (!board) return res.status(404).json({ error: 'Quadro nao encontrado' });

  const data = req.body || {};
  if (!data.title) return res.status(400).json({ error: 'Campos obrigatorios: title' });

  const [result] = await pool.query(
    `UPDATE case_study_columns SET title = ?, color = ?, sort_order = ?
     WHERE id = ? AND board_id = ?`,
    [data.title, toNull(data.color), data.sort_order ?? 0, req.params.columnId, req.params.boardId]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Coluna nao encontrada' });
  res.json({ message: 'Coluna atualizada' });
});

router.delete('/boards/:boardId/columns/:columnId', authenticate, async (req, res) => {
  const board = await getBoardById(req.params.boardId, req.user.tenant_id);
  if (!board) return res.status(404).json({ error: 'Quadro nao encontrado' });

  const [result] = await pool.query(
    `DELETE FROM case_study_columns WHERE id = ? AND board_id = ?`,
    [req.params.columnId, req.params.boardId]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Coluna nao encontrada' });
  res.json({ message: 'Coluna removida' });
});

// Cards
router.get('/boards/:boardId/cards', authenticate, async (req, res) => {
  const board = await getBoardById(req.params.boardId, req.user.tenant_id);
  if (!board) return res.status(404).json({ error: 'Quadro nao encontrado' });

  const { column_id, patient_id, search } = req.query || {};
  const params = [req.params.boardId];
  let whereSql = 'c.board_id = ?';
  if (column_id) {
    whereSql += ' AND c.column_id = ?';
    params.push(column_id);
  }
  if (patient_id) {
    whereSql += ' AND c.patient_id = ?';
    params.push(patient_id);
  }
  if (search) {
    whereSql += ' AND (c.title LIKE ? OR c.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const [rows] = await pool.query(
    `SELECT c.*,
            p.full_name AS patient_name
     FROM case_study_cards c
     LEFT JOIN patients p ON p.id = c.patient_id
     WHERE ${whereSql}
     ORDER BY c.sort_order ASC, c.id ASC`,
    params
  );
  res.json(rows);
});

router.post('/boards/:boardId/cards', authenticate, async (req, res) => {
  const board = await getBoardById(req.params.boardId, req.user.tenant_id);
  if (!board) return res.status(404).json({ error: 'Quadro nao encontrado' });

  const data = req.body || {};
  if (!data.column_id) return res.status(400).json({ error: 'Campos obrigatorios: column_id' });

  const columnOk = await getColumnTenant(data.column_id, req.user.tenant_id, req.params.boardId);
  if (!columnOk) return res.status(400).json({ error: 'Coluna invalida' });

  const [result] = await pool.query(
    `INSERT INTO case_study_cards
     (board_id, column_id, patient_id, title, description, tags_json, sort_order, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.params.boardId,
      data.column_id,
      toNull(data.patient_id),
      toNull(data.title),
      toNull(data.description),
      normalizeTags(data.tags),
      data.sort_order ?? 0,
      req.user.user_id
    ]
  );
  res.status(201).json({ message: 'Card criado', id: result.insertId });
});

router.get('/cards/:id', authenticate, async (req, res) => {
  const ok = await getCardTenant(req.params.id, req.user.tenant_id);
  if (!ok) return res.status(404).json({ error: 'Card nao encontrado' });

  const [rows] = await pool.query(
    `SELECT c.*,
            p.full_name AS patient_name
     FROM case_study_cards c
     LEFT JOIN patients p ON p.id = c.patient_id
     WHERE c.id = ?`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Card nao encontrado' });

  const [comments] = await pool.query(
    `SELECT cc.*, u.name AS author_name
     FROM case_study_comments cc
     LEFT JOIN users u ON u.id = cc.author_user_id
     WHERE cc.card_id = ?
     ORDER BY cc.id ASC`,
    [req.params.id]
  );

  const [attachments] = await pool.query(
    `SELECT * FROM case_study_attachments WHERE card_id = ? ORDER BY id ASC`,
    [req.params.id]
  );

  res.json({ ...rows[0], comments, attachments });
});

router.put('/cards/:id', authenticate, async (req, res) => {
  const ok = await getCardTenant(req.params.id, req.user.tenant_id);
  if (!ok) return res.status(404).json({ error: 'Card nao encontrado' });

  const data = req.body || {};
  if (!data.column_id) return res.status(400).json({ error: 'Campos obrigatorios: column_id' });

  const cardBoardId = await getCardBoardId(req.params.id, req.user.tenant_id);
  if (!cardBoardId) return res.status(404).json({ error: 'Card nao encontrado' });

  const columnOk = await getColumnTenant(data.column_id, req.user.tenant_id, cardBoardId);
  if (!columnOk) return res.status(400).json({ error: 'Coluna invalida' });

  const [result] = await pool.query(
    `UPDATE case_study_cards SET
      column_id = ?,
      patient_id = ?,
      title = ?,
      description = ?,
      tags_json = ?,
      sort_order = ?
     WHERE id = ?`,
    [
      data.column_id,
      toNull(data.patient_id),
      toNull(data.title),
      toNull(data.description),
      normalizeTags(data.tags),
      data.sort_order ?? 0,
      req.params.id
    ]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Card nao encontrado' });
  res.json({ message: 'Card atualizado' });
});

router.patch('/cards/:id', authenticate, async (req, res) => {
  const ok = await getCardTenant(req.params.id, req.user.tenant_id);
  if (!ok) return res.status(404).json({ error: 'Card nao encontrado' });

  const data = req.body || {};
  const fields = [];
  const params = [];

  if (data.column_id) {
    const cardBoardId = await getCardBoardId(req.params.id, req.user.tenant_id);
    if (!cardBoardId) return res.status(404).json({ error: 'Card nao encontrado' });

    const columnOk = await getColumnTenant(data.column_id, req.user.tenant_id, cardBoardId);
    if (!columnOk) return res.status(400).json({ error: 'Coluna invalida' });
    fields.push('column_id = ?');
    params.push(data.column_id);
  }
  if (data.patient_id !== undefined) {
    fields.push('patient_id = ?');
    params.push(toNull(data.patient_id));
  }
  if (data.title !== undefined) {
    fields.push('title = ?');
    params.push(toNull(data.title));
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    params.push(toNull(data.description));
  }
  if (data.tags !== undefined) {
    fields.push('tags_json = ?');
    params.push(normalizeTags(data.tags));
  }
  if (data.sort_order !== undefined) {
    fields.push('sort_order = ?');
    params.push(data.sort_order);
  }

  if (!fields.length) return res.json({ message: 'Sem alteracoes' });

  params.push(req.params.id);
  const [result] = await pool.query(
    `UPDATE case_study_cards SET ${fields.join(', ')} WHERE id = ?`,
    params
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Card nao encontrado' });
  res.json({ message: 'Card atualizado' });
});

router.patch('/cards/:id/move', authenticate, async (req, res) => {
  const ok = await getCardTenant(req.params.id, req.user.tenant_id);
  if (!ok) return res.status(404).json({ error: 'Card nao encontrado' });

  const data = req.body || {};
  if (!data.column_id) return res.status(400).json({ error: 'Campos obrigatorios: column_id' });

  const cardBoardId = await getCardBoardId(req.params.id, req.user.tenant_id);
  if (!cardBoardId) return res.status(404).json({ error: 'Card nao encontrado' });

  const columnOk = await getColumnTenant(data.column_id, req.user.tenant_id, cardBoardId);
  if (!columnOk) return res.status(400).json({ error: 'Coluna invalida' });

  await pool.query(
    `UPDATE case_study_cards SET column_id = ?, sort_order = ?
     WHERE id = ?`,
    [data.column_id, data.sort_order ?? 0, req.params.id]
  );
  res.json({ message: 'Card movido' });
});

router.delete('/cards/:id', authenticate, async (req, res) => {
  const ok = await getCardTenant(req.params.id, req.user.tenant_id);
  if (!ok) return res.status(404).json({ error: 'Card nao encontrado' });

  const [result] = await pool.query(
    `DELETE FROM case_study_cards WHERE id = ?`,
    [req.params.id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Card nao encontrado' });
  res.json({ message: 'Card removido' });
});

// Comments
router.get('/cards/:id/comments', authenticate, async (req, res) => {
  const ok = await getCardTenant(req.params.id, req.user.tenant_id);
  if (!ok) return res.status(404).json({ error: 'Card nao encontrado' });

  const [rows] = await pool.query(
    `SELECT cc.*, u.name AS author_name
     FROM case_study_comments cc
     LEFT JOIN users u ON u.id = cc.author_user_id
     WHERE cc.card_id = ?
     ORDER BY cc.id ASC`,
    [req.params.id]
  );
  res.json(rows);
});

router.post('/cards/:id/comments', authenticate, async (req, res) => {
  const ok = await getCardTenant(req.params.id, req.user.tenant_id);
  if (!ok) return res.status(404).json({ error: 'Card nao encontrado' });

  const data = req.body || {};
  if (!data.comment_text) return res.status(400).json({ error: 'Campos obrigatorios: comment_text' });

  const [result] = await pool.query(
    `INSERT INTO case_study_comments (card_id, author_user_id, comment_text)
     VALUES (?, ?, ?)`,
    [req.params.id, req.user.user_id, data.comment_text]
  );
  res.status(201).json({ message: 'Comentario criado', id: result.insertId });
});

router.delete('/cards/:id/comments/:commentId', authenticate, async (req, res) => {
  const ok = await getCardTenant(req.params.id, req.user.tenant_id);
  if (!ok) return res.status(404).json({ error: 'Card nao encontrado' });

  const [result] = await pool.query(
    `DELETE FROM case_study_comments WHERE id = ? AND card_id = ?`,
    [req.params.commentId, req.params.id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Comentario nao encontrado' });
  res.json({ message: 'Comentario removido' });
});

// Attachments
router.get('/cards/:id/attachments', authenticate, async (req, res) => {
  const ok = await getCardTenant(req.params.id, req.user.tenant_id);
  if (!ok) return res.status(404).json({ error: 'Card nao encontrado' });

  const [rows] = await pool.query(
    `SELECT * FROM case_study_attachments WHERE card_id = ? ORDER BY id ASC`,
    [req.params.id]
  );
  res.json(rows);
});

router.post('/cards/:id/attachments', authenticate, async (req, res) => {
  const ok = await getCardTenant(req.params.id, req.user.tenant_id);
  if (!ok) return res.status(404).json({ error: 'Card nao encontrado' });

  const data = req.body || {};
  if (!data.file_name || !data.file_url) {
    return res.status(400).json({ error: 'Campos obrigatorios: file_name, file_url' });
  }

  const [result] = await pool.query(
    `INSERT INTO case_study_attachments (card_id, file_name, file_url, file_type, file_size)
     VALUES (?, ?, ?, ?, ?)`,
    [req.params.id, data.file_name, data.file_url, toNull(data.file_type), toNull(data.file_size)]
  );
  res.status(201).json({ message: 'Anexo criado', id: result.insertId });
});

router.delete('/cards/:id/attachments/:attachmentId', authenticate, async (req, res) => {
  const ok = await getCardTenant(req.params.id, req.user.tenant_id);
  if (!ok) return res.status(404).json({ error: 'Card nao encontrado' });

  const [result] = await pool.query(
    `DELETE FROM case_study_attachments WHERE id = ? AND card_id = ?`,
    [req.params.attachmentId, req.params.id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Anexo nao encontrado' });
  res.json({ message: 'Anexo removido' });
});

export default router;
