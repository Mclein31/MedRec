const pool = require('../config/db');

async function createShare({
  userId,
  token,
  expiresAt,
  allowedTypes,
  recordIds,
}) {
  const { rows } = await pool.query(
    `INSERT INTO public.shared_access (user_id, token, expires_at, allowed_types, record_ids)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, token, expires_at, allowed_types, record_ids, created_at`,
    [userId, token, expiresAt, allowedTypes || null, recordIds || null]
  );
  return rows[0];
}

async function findActiveByToken(token) {
  const { rows } = await pool.query(
    `SELECT * FROM public.shared_access
     WHERE token = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [token]
  );
  return rows[0] || null;
}

async function findActiveByTokenWithUser(token) {
  const { rows } = await pool.query(
    `SELECT sa.*, u.name AS patient_name, u.email AS patient_email
     FROM public.shared_access sa
     JOIN public.users u ON u.id = sa.user_id
     WHERE sa.token = $1 AND sa.revoked_at IS NULL AND sa.expires_at > now()`,
    [token]
  );
  return rows[0] || null;
}

async function terminateByToken(token) {
  const { rows } = await pool.query(
    `UPDATE public.shared_access
     SET revoked_at = now()
     WHERE token = $1 AND revoked_at IS NULL AND expires_at > now()
     RETURNING id, user_id, token, revoked_at`,
    [token]
  );
  return rows[0] || null;
}

async function revoke(userId, shareId) {
  const { rowCount } = await pool.query(
    `UPDATE public.shared_access SET revoked_at = now()
     WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
    [shareId, userId]
  );
  return rowCount > 0;
}

async function listForUser(userId, { limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  const { rows } = await pool.query(
    `SELECT id, token, expires_at, allowed_types, record_ids, revoked_at, created_at
     FROM public.shared_access WHERE user_id = $1 ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, safeLimit, safeOffset]
  );
  return rows;
}

async function pruneExcessActiveShares(userId, keepCount = 4) {
  const safeKeepCount = Math.max(0, Number(keepCount) || 0);
  const { rows } = await pool.query(
    `WITH active_shares AS (
       SELECT id
       FROM public.shared_access
       WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now()
       ORDER BY created_at DESC
       OFFSET $2
     )
     UPDATE public.shared_access
     SET revoked_at = now()
     WHERE id IN (SELECT id FROM active_shares)
     RETURNING id, token`,
    [userId, safeKeepCount]
  );
  return rows;
}

async function countActiveForUser(userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM public.shared_access
     WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [userId]
  );
  return rows[0]?.count || 0;
}

module.exports = {
  createShare,
  findActiveByToken,
  findActiveByTokenWithUser,
  terminateByToken,
  revoke,
  listForUser,
  pruneExcessActiveShares,
  countActiveForUser,
};
