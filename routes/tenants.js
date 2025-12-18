import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * Helpers
 */
function toBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') return ['true', '1', 'yes', 'sim'].includes(v.toLowerCase());
  return undefined;
}

function pickDefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

/**
 * POST /tenants
 * Super admin cria tenant + cria user admin inicial
 */
router.post('/', authenticate, authorize('super_admin'), async (req, res) => {
  const { company_name, admin_name, admin_email, password, plan_type } = req.body || {};

  if (!company_name || !admin_name || !admin_email || !password) {
    return res.status(400).json({ error: 'Campos obrigatórios: company_name, admin_name, admin_email, password' });
  }

  const hash = await bcrypt.hash(password, 10);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // (opcional) evita tenant duplicado por e-mail admin
    // você pode ajustar a regra como preferir
    const [existingTenant] = await conn.query(
      `SELECT id FROM tenants WHERE admin_email = ? LIMIT 1`,
      [admin_email]
    );
    if (existingTenant.length) {
      await conn.rollback();
      return res.status(409).json({ error: 'Já existe um tenant com este admin_email' });
    }

    const [tenantResult] = await conn.query(
      `INSERT INTO tenants (company_name, admin_name, admin_email, admin_password_hash, plan_type)
       VALUES (?, ?, ?, ?, ?)`,
      [company_name, admin_name, admin_email, hash, plan_type ?? 'mensal']
    );

    const tenantId = tenantResult.insertId;

    const [userResult] = await conn.query(
      `INSERT INTO users (tenant_id, role, name, email, password_hash, is_active)
       VALUES (?, 'admin', ?, ?, ?, TRUE)`,
      [tenantId, admin_name, admin_email, hash]
    );

    await conn.commit();

    res.status(201).json({
      message: 'Tenant + admin criados',
      tenant_id: tenantId,
      admin_user_id: userResult.insertId
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

/**
 * GET /tenants
 * Lista tenants
 */
router.get('/', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, company_name, admin_name, admin_email, plan_type, created_at
       FROM tenants
       ORDER BY id DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /tenants/:id
 * Buscar tenant por id
 */
router.get('/:id', authenticate, authorize('super_admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT id, company_name, admin_name, admin_email, plan_type, created_at
       FROM tenants
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Tenant não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /tenants/:id
 * Atualização completa (requer enviar todos os campos principais)
 */
router.put('/:id', authenticate, authorize('super_admin'), async (req, res) => {
  const { id } = req.params;
  const { company_name, admin_name, admin_email, plan_type } = req.body || {};

  if (!company_name || !admin_name || !admin_email || !plan_type) {
    return res.status(400).json({
      error: 'Campos obrigatórios: company_name, admin_name, admin_email, plan_type'
    });
  }

  try {
    const [result] = await pool.query(
      `UPDATE tenants
       SET company_name = ?, admin_name = ?, admin_email = ?, plan_type = ?
       WHERE id = ?`,
      [company_name, admin_name, admin_email, plan_type, id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Tenant não encontrado' });

    const [rows] = await pool.query(
      `SELECT id, company_name, admin_name, admin_email, plan_type, created_at
       FROM tenants
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    res.json({ message: 'Tenant atualizado', tenant: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /tenants/:id
 * Atualização parcial (envia só o que quer mudar)
 */
router.patch('/:id', authenticate, authorize('super_admin'), async (req, res) => {
  const { id } = req.params;
  const { company_name, admin_name, admin_email, plan_type } = req.body || {};

  const payload = pickDefined({ company_name, admin_name, admin_email, plan_type });

  if (!Object.keys(payload).length) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  }

  // monta SQL dinamicamente com segurança
  const fields = Object.keys(payload);
  const sets = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => payload[f]);

  try {
    const [result] = await pool.query(
      `UPDATE tenants SET ${sets} WHERE id = ?`,
      [...values, id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Tenant não encontrado' });

    const [rows] = await pool.query(
      `SELECT id, company_name, admin_name, admin_email, plan_type, created_at
       FROM tenants
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    res.json({ message: 'Tenant atualizado (patch)', tenant: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /tenants/:id/admin-password
 * Reset de senha do admin do tenant (atualiza tenants.admin_password_hash e users.password_hash do admin)
 */
router.patch('/:id/admin-password', authenticate, authorize('super_admin'), async (req, res) => {
  const { id } = req.params;
  const { password } = req.body || {};

  if (!password) return res.status(400).json({ error: 'password é obrigatório' });

  const hash = await bcrypt.hash(password, 10);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [tenantRows] = await conn.query(`SELECT id, admin_email FROM tenants WHERE id = ? LIMIT 1`, [id]);
    if (!tenantRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Tenant não encontrado' });
    }

    const adminEmail = tenantRows[0].admin_email;

    await conn.query(
      `UPDATE tenants SET admin_password_hash = ? WHERE id = ?`,
      [hash, id]
    );

    // atualiza o user admin desse tenant (se existir)
    await conn.query(
      `UPDATE users
       SET password_hash = ?
       WHERE tenant_id = ? AND role = 'admin' AND email = ?
       LIMIT 1`,
      [hash, id, adminEmail]
    );

    await conn.commit();
    res.json({ message: 'Senha do admin atualizada' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

/**
 * DELETE /tenants/:id
 * Deleta tenant e (opcionalmente) dados relacionados
 * ⚠️ Se você não tiver ON DELETE CASCADE no banco, precisa deletar manualmente
 */
router.delete('/:id', authenticate, authorize('super_admin'), async (req, res) => {
  const { id } = req.params;

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // ver se existe
    const [tenantRows] = await conn.query(`SELECT id FROM tenants WHERE id = ? LIMIT 1`, [id]);
    if (!tenantRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Tenant não encontrado' });
    }

    // Ajuste conforme sua modelagem:
    // Se tiver tabelas com tenant_id e sem cascade, delete na ordem certa.
    // Exemplo (descomente se fizer sentido no seu schema):
    // await conn.query(`DELETE FROM sessions WHERE tenant_id = ?`, [id]);
    // await conn.query(`DELETE FROM appointments WHERE tenant_id = ?`, [id]);
    // await conn.query(`DELETE FROM patients WHERE tenant_id = ?`, [id]);
    await conn.query(`DELETE FROM users WHERE tenant_id = ?`, [id]);

    const [result] = await conn.query(`DELETE FROM tenants WHERE id = ?`, [id]);

    await conn.commit();
    res.json({ message: 'Tenant removido', deleted: result.affectedRows });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

export default router;
