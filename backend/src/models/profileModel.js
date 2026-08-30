const pool = require('../config/db');

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
      (SELECT COUNT(*)::int FROM medical_records mr WHERE mr.user_id = u.id) AS records_count,
      (SELECT COUNT(*)::int FROM shared_access sa WHERE sa.user_id = u.id AND sa.revoked_at IS NULL AND sa.expires_at > now()) AS active_shares_count
    FROM users u
    LEFT JOIN user_profiles p ON p.user_id = u.id
    WHERE u.id = $1
  `;

  const { rows } = await pool.query(query, [userId]);
  return rows[0] || null;
}

async function upsertProfile(userId, data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (data.name !== undefined && data.name !== null && data.name.trim() !== '') {
      await client.query(
        `UPDATE users SET name = $1, updated_at = now() WHERE id = $2`,
        [data.name.trim(), userId]
      );
    }

    const rawAvatar = data.avatar_url !== undefined ? data.avatar_url : data.avatarUrl;

    const query = `
      INSERT INTO user_profiles (
        user_id,
        date_of_birth,
        biological_sex,
        blood_type,
        allergies,
        medical_conditions,
        medications_summary,
        emergency_contact_name,
        emergency_contact_relationship,
        emergency_contact_phone,
        phone,
        address,
        avatar_url,
        organ_donor,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        date_of_birth = EXCLUDED.date_of_birth,
        biological_sex = EXCLUDED.biological_sex,
        blood_type = EXCLUDED.blood_type,
        allergies = EXCLUDED.allergies,
        medical_conditions = EXCLUDED.medical_conditions,
        medications_summary = EXCLUDED.medications_summary,
        emergency_contact_name = EXCLUDED.emergency_contact_name,
        emergency_contact_relationship = EXCLUDED.emergency_contact_relationship,
        emergency_contact_phone = EXCLUDED.emergency_contact_phone,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
        organ_donor = EXCLUDED.organ_donor,
        updated_at = now()
      RETURNING *
    `;

    const values = [
      userId,
      data.date_of_birth || null,
      data.biological_sex || null,
      data.blood_type || null,
      data.allergies !== undefined ? data.allergies : null,
      data.medical_conditions !== undefined ? data.medical_conditions : null,
      data.medications_summary !== undefined ? data.medications_summary : null,
      data.emergency_contact_name !== undefined ? data.emergency_contact_name : null,
      data.emergency_contact_relationship !== undefined ? data.emergency_contact_relationship : null,
      data.emergency_contact_phone !== undefined ? data.emergency_contact_phone : null,
      data.phone !== undefined ? data.phone : null,
      data.address !== undefined ? data.address : null,
      rawAvatar !== undefined ? rawAvatar : null,
      data.organ_donor !== undefined ? Boolean(data.organ_donor) : false,
    ];

    await client.query(query, values);
    await client.query('COMMIT');

    return await getProfileByUserId(userId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateUserPassword(userId, passwordHash) {
  const { rows } = await pool.query(
    `UPDATE users SET password = $1, updated_at = now() WHERE id = $2 RETURNING id, email`,
    [passwordHash, userId]
  );
  return rows[0] || null;
}

async function deleteUserAccount(userId) {
  const { rowCount } = await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
  return rowCount > 0;
}

module.exports = {
  getProfileByUserId,
  upsertProfile,
  updateUserPassword,
  deleteUserAccount,
};
