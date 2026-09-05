const pool = require('../config/db');
const bcrypt = require('bcryptjs');

async function createUser({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO public.users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name.trim(), email.toLowerCase().trim(), passwordHash]
  );
  return rows[0];
}

async function findByEmail(email) {
  const { rows } = await pool.query(
    `SELECT u.id,
            u.name,
            u.email,
            COALESCE(u.password_hash, u.password) AS password_hash,
            COALESCE(u.token_version, 1) AS token_version,
            u.google_id,
            u.auth_provider,
            u.created_at,
            p.avatar_url
     FROM public.users u
     LEFT JOIN public.user_profiles p ON p.user_id = u.id
     WHERE u.email = $1`,
    [email.toLowerCase().trim()]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT u.id,
            u.name,
            u.email,
            COALESCE(u.password_hash, u.password) AS password_hash,
            COALESCE(u.token_version, 1) AS token_version,
            u.google_id,
            u.auth_provider,
            u.created_at,
            p.avatar_url
     FROM public.users u
     LEFT JOIN public.user_profiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findByGoogleId(googleId) {
  const { rows } = await pool.query(
    `SELECT u.id,
            u.name,
            u.email,
            COALESCE(u.password_hash, u.password) AS password_hash,
            COALESCE(u.token_version, 1) AS token_version,
            u.google_id,
            u.auth_provider,
            u.created_at,
            p.avatar_url
     FROM public.users u
     LEFT JOIN public.user_profiles p ON p.user_id = u.id
     WHERE u.google_id = $1`,
    [googleId]
  );
  return rows[0] || null;
}

async function createGoogleUser({ name, email, googleId, avatarUrl }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userRes = await client.query(
      `INSERT INTO public.users (name, email, password_hash, google_id, auth_provider)
       VALUES ($1, $2, NULL, $3, 'google')
       RETURNING id, name, email, google_id, token_version, created_at`,
      [name.trim(), email.toLowerCase().trim(), googleId]
    );
    const user = userRes.rows[0];

    // If Google provided an avatar, update the auto-provisioned profile
    if (avatarUrl) {
      await client.query(
        `UPDATE public.user_profiles
         SET avatar_url = $1, updated_at = now()
         WHERE user_id = $2`,
        [avatarUrl, user.id]
      );
    }
    await client.query('COMMIT');
    return { ...user, avatar_url: avatarUrl || null };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function linkGoogleAccount(userId, googleId) {
  const { rows } = await pool.query(
    `UPDATE public.users
     SET google_id = $1,
         auth_provider = 'google',
         updated_at = now()
     WHERE id = $2
     RETURNING id, name, email, google_id, token_version, created_at`,
    [googleId, userId]
  );
  return rows[0] || null;
}

async function updatePassword(id, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const { rows } = await pool.query(
    `UPDATE public.users
     SET password_hash = $1,
         token_version = token_version + 1,
         updated_at = now()
     WHERE id = $2
     RETURNING id`,
    [passwordHash, id]
  );
  return rows[0] || null;
}

async function deleteUser(id) {
  const { rowCount } = await pool.query(`DELETE FROM public.users WHERE id = $1`, [id]);
  return rowCount > 0;
}

async function incrementTokenVersion(id) {
  const { rows } = await pool.query(
    `UPDATE public.users
     SET token_version = COALESCE(token_version, 1) + 1,
         updated_at = now()
     WHERE id = $1
     RETURNING id, token_version`,
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  findByGoogleId,
  createGoogleUser,
  linkGoogleAccount,
  updatePassword,
  deleteUser,
  incrementTokenVersion,
};
