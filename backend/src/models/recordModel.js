const pool = require('../config/db');

const RECORD_TYPES = [
  'consultation',
  'diagnosis',
  'lab',
  'prescription',
  'medication',
  'appointment',
  'other',
];

async function createRecord({ userId, type, title, description, date, attachmentUrl, attachment_url }) {
  const finalAttachment = attachment_url !== undefined ? attachment_url : (attachmentUrl || null);
  const { rows } = await pool.query(
    `INSERT INTO public.medical_records (user_id, type, title, description, date, attachment_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, type, title, description, to_char(date, 'YYYY-MM-DD') AS date, attachment_url, created_at, updated_at`,
    [userId, type, title, description || null, date, finalAttachment]
  );
  return rows[0];
}

async function getAllForUser(userId, { type, recordIds, limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  // If specific recordIds are provided, query only those IDs belonging to this user
  if (recordIds && recordIds.length > 0) {
    const { rows } = await pool.query(
      `SELECT id, user_id, type, title, description, to_char(date, 'YYYY-MM-DD') AS date, attachment_url, created_at, updated_at
       FROM public.medical_records
       WHERE user_id = $1 AND id = ANY($2::uuid[])
       ORDER BY date DESC
       LIMIT $3 OFFSET $4`,
      [userId, recordIds, safeLimit, safeOffset]
    );
    return rows;
  }

  if (type) {
    const { rows } = await pool.query(
      `SELECT id, user_id, type, title, description, to_char(date, 'YYYY-MM-DD') AS date, attachment_url, created_at, updated_at
       FROM public.medical_records
       WHERE user_id = $1 AND type = $2
       ORDER BY date DESC
       LIMIT $3 OFFSET $4`,
      [userId, type, safeLimit, safeOffset]
    );
    return rows;
  }
  const { rows } = await pool.query(
    `SELECT id, user_id, type, title, description, to_char(date, 'YYYY-MM-DD') AS date, attachment_url, created_at, updated_at
     FROM public.medical_records
     WHERE user_id = $1
     ORDER BY date DESC
     LIMIT $2 OFFSET $3`,
    [userId, safeLimit, safeOffset]
  );
  return rows;
}

async function getOneForUser(userId, recordId) {
  const { rows } = await pool.query(
    `SELECT id, user_id, type, title, description, to_char(date, 'YYYY-MM-DD') AS date, attachment_url, created_at, updated_at
     FROM public.medical_records
     WHERE id = $1 AND user_id = $2`,
    [recordId, userId]
  );
  return rows[0] || null;
}

async function deleteForUser(userId, recordId) {
  const { rowCount } = await pool.query(
    `DELETE FROM public.medical_records WHERE id = $1 AND user_id = $2`,
    [recordId, userId]
  );
  return rowCount > 0;
}

// Used by the doctor share-access flow.
// Priority: specific record IDs > allowed types > all records
async function getAllForShare(userId, allowedTypes, recordIds, { limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  // Specific records selected — highest priority
  if (recordIds && recordIds.length > 0) {
    const { rows } = await pool.query(
      `SELECT id, type, title, description, to_char(date, 'YYYY-MM-DD') AS date, attachment_url, created_at
       FROM public.medical_records
       WHERE user_id = $1 AND id = ANY($2)
       ORDER BY date DESC
       LIMIT $3 OFFSET $4`,
      [userId, recordIds, safeLimit, safeOffset]
    );
    return rows;
  }

  // Filter by allowed types
  if (allowedTypes && allowedTypes.length > 0) {
    const { rows } = await pool.query(
      `SELECT id, type, title, description, to_char(date, 'YYYY-MM-DD') AS date, attachment_url, created_at
       FROM public.medical_records
       WHERE user_id = $1 AND type = ANY($2)
       ORDER BY date DESC
       LIMIT $3 OFFSET $4`,
      [userId, allowedTypes, safeLimit, safeOffset]
    );
    return rows;
  }

  // All records
  const { rows } = await pool.query(
    `SELECT id, type, title, description, to_char(date, 'YYYY-MM-DD') AS date, attachment_url, created_at
     FROM public.medical_records
     WHERE user_id = $1
     ORDER BY date DESC
     LIMIT $2 OFFSET $3`,
    [userId, safeLimit, safeOffset]
  );
  return rows;
}

/**
 * Validates whether all requested record IDs belong to the specified user via atomic SQL.
 * Returns true if all IDs belong to the user, false otherwise.
 */
async function verifyOwnership(userId, recordIds) {
  if (!Array.isArray(recordIds) || recordIds.length === 0) return true;
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM public.medical_records
     WHERE user_id = $1 AND id = ANY($2::uuid[])`,
    [userId, recordIds]
  );
  return rows[0].count === recordIds.length;
}

async function updateRecordForUser(userId, recordId, { type, title, description, date, attachmentUrl, attachment_url }) {
  const existing = await getOneForUser(userId, recordId);
  if (!existing) return null;

  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (type !== undefined) {
    if (!RECORD_TYPES.includes(type)) {
      const err = new Error(`type must be one of: ${RECORD_TYPES.join(', ')}`);
      err.status = 400;
      throw err;
    }
    updates.push(`type = $${paramIndex++}`);
    values.push(type);
  }

  if (title !== undefined) {
    const trimmedTitle = String(title).trim();
    if (!trimmedTitle) {
      const err = new Error('title cannot be empty');
      err.status = 400;
      throw err;
    }
    updates.push(`title = $${paramIndex++}`);
    values.push(trimmedTitle);
  }

  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(description ? String(description).trim() : null);
  }

  if (date !== undefined) {
    updates.push(`date = $${paramIndex++}`);
    values.push(date);
  }

  const newAttachment = attachment_url !== undefined ? attachment_url : attachmentUrl;
  if (newAttachment !== undefined) {
    // Guard: never store a temporary presigned/http URL as the permanent attachment key.
    // Only store R2 object keys (non-http paths) or explicit null/data URIs.
    const isPresignedUrl = typeof newAttachment === 'string' &&
      (newAttachment.startsWith('http://') || newAttachment.startsWith('https://'));
    if (!isPresignedUrl) {
      updates.push(`attachment_url = $${paramIndex++}`);
      values.push(newAttachment || null);
    }
    // If it's a presigned URL, we intentionally skip the update so the existing DB key is preserved.
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push(`updated_at = now()`);

  values.push(recordId);
  const recordIdParam = paramIndex++;
  values.push(userId);
  const userIdParam = paramIndex++;

  const { rows } = await pool.query(
    `UPDATE public.medical_records
     SET ${updates.join(', ')}
     WHERE id = $${recordIdParam} AND user_id = $${userIdParam}
     RETURNING id, user_id, type, title, description, to_char(date, 'YYYY-MM-DD') AS date, attachment_url, created_at, updated_at`,
    values
  );

  return rows[0] || null;
}

module.exports = {
  RECORD_TYPES,
  createRecord,
  getAllForUser,
  getOneForUser,
  deleteForUser,
  updateRecordForUser,
  getAllForShare,
  verifyOwnership,
};