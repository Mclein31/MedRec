const pool = require('../config/db');
const userModel = require('./userModel');

async function getProfileByUserId(userId) {
  const query = `
    SELECT
      u.id AS user_id,
      u.name,
      u.email,
      u.created_at AS member_since,
      p.id AS profile_id,
      to_char(p.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
      p.biological_sex,
      p.height,
      p.weight,
      p.blood_type,
      p.allergies,
      p.medical_conditions,
      p.medications_summary,
      p.emergency_contact_name,
      p.emergency_contact_relationship,
      p.emergency_contact_phone,
      p.phone,
      p.address,
      p.avatar_url,
      p.organ_donor,
      p.updated_at AS profile_updated_at,
      (SELECT COUNT(*)::int FROM public.medical_records mr WHERE mr.user_id = u.id) AS records_count,
      (SELECT COUNT(*)::int FROM public.shared_access sa WHERE sa.user_id = u.id AND sa.revoked_at IS NULL AND sa.expires_at > now()) AS active_shares_count
    FROM public.users u
    LEFT JOIN public.user_profiles p ON p.user_id = u.id
    WHERE u.id = $1
  `;

  const { rows } = await pool.query(query, [userId]);
  return rows[0] || null;
}

const ALLOWED_PROFILE_COLUMNS = [
  'full_name',
  'date_of_birth',
  'biological_sex',
  'height',
  'weight',
  'blood_type',
  'allergies',
  'medical_conditions',
  'medications_summary',
  'emergency_contact_name',
  'emergency_contact_relationship',
  'emergency_contact_phone',
  'phone',
  'address',
  'avatar_url',
  'organ_donor',
];

async function upsertProfile(userId, data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Normalize avatar_url alias if passed as avatarUrl
    const payload = { ...data };
    if (payload.avatarUrl !== undefined && payload.avatar_url === undefined) {
      payload.avatar_url = payload.avatarUrl;
    }
    if (payload.name !== undefined && payload.full_name === undefined) {
      payload.full_name = payload.name;
    }

    // 1. Update user name if explicitly provided
    if (payload.full_name !== undefined && payload.full_name !== null && String(payload.full_name).trim() !== '') {
      await client.query(
        `UPDATE public.users
         SET name = $1,
             updated_at = now()
         WHERE id = $2`,
        [String(payload.full_name).trim(), userId]
      );
    }

    // 2. Check if a profile record already exists for this user
    const existing = await client.query(
      `SELECT id FROM public.user_profiles WHERE user_id = $1`,
      [userId]
    );

    if (existing.rows.length === 0) {
      // Create new profile record with provided columns
      const insertCols = ['user_id'];
      const insertPlaceholders = ['$1'];
      const insertValues = [userId];
      let colIdx = 2;

      for (const col of ALLOWED_PROFILE_COLUMNS) {
        if (col in payload && payload[col] !== undefined) {
          insertCols.push(col);
          insertPlaceholders.push(`$${colIdx++}`);
          insertValues.push(payload[col]);
        }
      }

      insertCols.push('updated_at');
      insertPlaceholders.push('now()');

      const insertQuery = `
        INSERT INTO public.user_profiles (${insertCols.join(', ')})
        VALUES (${insertPlaceholders.join(', ')})
        RETURNING *
      `;
      await client.query(insertQuery, insertValues);
    } else {
      // Partial update: dynamically update ONLY fields explicitly present in payload
      const setClauses = [];
      const updateValues = [];
      let colIdx = 1;

      for (const col of ALLOWED_PROFILE_COLUMNS) {
        if (col in payload && payload[col] !== undefined) {
          setClauses.push(`${col} = $${colIdx++}`);
          updateValues.push(payload[col]);
        }
      }

      if (setClauses.length > 0) {
        setClauses.push('updated_at = now()');
        updateValues.push(userId);
        const updateQuery = `
          UPDATE public.user_profiles
          SET ${setClauses.join(', ')}
          WHERE user_id = $${colIdx}
          RETURNING *
        `;
        await client.query(updateQuery, updateValues);
      }
    }

    await client.query('COMMIT');
    return await getProfileByUserId(userId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateUserPassword(userId, newPassword) {
  return await userModel.updatePassword(userId, newPassword);
}

async function deleteUserAccount(userId) {
  return await userModel.deleteUser(userId);
}

module.exports = {
  getProfileByUserId,
  upsertProfile,
  updateUserPassword,
  deleteUserAccount,
};
