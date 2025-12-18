import express from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const toJson = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
};

// Buscar preferências do usuário logado
router.get('/me', authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT user_id, language, timezone, theme, notifications, integrations, ui_state, preferences,
            created_at, updated_at
     FROM user_preferences
     WHERE user_id = ?
     LIMIT 1`,
    [req.user.user_id]
  );

  if (!rows.length) return res.json(null);
  res.json(rows[0]);
});

// Atualizar preferências (upsert)
router.put('/me', authenticate, async (req, res) => {
  const data = req.body || {};

  await pool.query(
    `INSERT INTO user_preferences
     (user_id, language, timezone, theme, notifications, integrations, ui_state, preferences)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       language=VALUES(language),
       timezone=VALUES(timezone),
       theme=VALUES(theme),
       notifications=VALUES(notifications),
       integrations=VALUES(integrations),
       ui_state=VALUES(ui_state),
       preferences=VALUES(preferences)`,
    [
      req.user.user_id,
      data.language ?? null,
      data.timezone ?? null,
      data.theme ?? null,
      toJson(data.notifications),
      toJson(data.integrations),
      toJson(data.ui_state),
      toJson(data.preferences)
    ]
  );

  res.json({ message: 'Preferências atualizadas' });
});

export default router;
