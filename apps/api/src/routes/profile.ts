import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../lib/auth';
import { randomToken } from '../lib/crypto';
import { body } from '../lib/http';
import { logActivity, signFilePath } from '../lib/security';
import { HttpError, asUser, type AppEnv } from '../lib/types';
import { readUpload } from './uploads';

export const profile = new Hono<AppEnv>();
profile.use('*', requireAuth);

const ListItem = z.string().trim().min(1).max(120);
const Phone = z.string().trim().max(32).regex(/^[+\d\s()-]*$/, 'Use digits, spaces, +, ( ) or -.');
const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v && d <= new Date();
  }, 'Enter a real date that is not in the future.');

export const ProfilePatch = z
  .object({
    name: z.string().trim().min(1).max(100),
    dateOfBirth: IsoDate.nullable(),
    sex: z.enum(['female', 'male', 'intersex', 'unspecified']).nullable(),
    bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']).nullable(),
    heightCm: z.number().min(30).max(272).nullable(),
    weightKg: z.number().min(1).max(500).nullable(),
    allergies: z.array(ListItem).max(50),
    conditions: z.array(ListItem).max(50),
    medications: z.array(ListItem).max(50),
    organDonor: z.boolean().nullable(),
    phone: Phone.nullable(),
    emergencyContactName: z.string().trim().max(100).nullable(),
    emergencyContactPhone: Phone.nullable(),
    emergencyContactRelation: z.string().trim().max(50).nullable(),
  })
  .partial();

const COLUMNS: Record<string, string> = {
  dateOfBirth: 'date_of_birth', sex: 'sex', bloodType: 'blood_type', heightCm: 'height_cm', weightKg: 'weight_kg',
  allergies: 'allergies', conditions: 'conditions', medications: 'medications', organDonor: 'organ_donor', phone: 'phone',
  emergencyContactName: 'emergency_contact_name', emergencyContactPhone: 'emergency_contact_phone',
  emergencyContactRelation: 'emergency_contact_relation',
};

export interface ProfileRow {
  name: string; email: string; date_of_birth: string | null; sex: string | null; blood_type: string | null;
  height_cm: string | null; weight_kg: string | null; allergies: string[]; conditions: string[]; medications: string[];
  organ_donor: boolean | null; phone: string | null; emergency_contact_name: string | null; emergency_contact_phone: string | null;
  emergency_contact_relation: string | null; avatar_key: string | null; emergency_enabled: boolean; emergency_slug: string | null;
}

export async function loadProfile(c: { get: (k: 'services') => AppEnv['Variables']['services']; env: AppEnv['Bindings'] }, userId: string) {
  const { db, now } = c.get('services');
  const [p] = await db.query<ProfileRow>(
    asUser(userId),
    `SELECT u.name, u.email, to_char(p.date_of_birth, 'YYYY-MM-DD') AS date_of_birth, p.sex, p.blood_type, p.height_cm, p.weight_kg,
            p.allergies, p.conditions, p.medications, p.organ_donor, p.phone, p.emergency_contact_name, p.emergency_contact_phone,
            p.emergency_contact_relation, p.avatar_key, p.emergency_enabled, p.emergency_slug
       FROM users u JOIN profiles p ON p.user_id = u.id WHERE u.id = $1`,
    [userId],
  );
  if (!p) throw new HttpError(404, 'NOT_FOUND', 'Profile not found.');
  return {
    name: p.name,
    email: p.email,
    dateOfBirth: p.date_of_birth,
    sex: p.sex,
    bloodType: p.blood_type,
    heightCm: p.height_cm === null ? null : Number(p.height_cm),
    weightKg: p.weight_kg === null ? null : Number(p.weight_kg),
    allergies: p.allergies,
    conditions: p.conditions,
    medications: p.medications,
    organDonor: p.organ_donor,
    phone: p.phone,
    emergencyContactName: p.emergency_contact_name,
    emergencyContactPhone: p.emergency_contact_phone,
    emergencyContactRelation: p.emergency_contact_relation,
    avatarUrl: p.avatar_key ? c.env.PUBLIC_URL + (await signFilePath(p.avatar_key, c.env.FILE_SIGNING_SECRET, 3600, now())) : null,
    emergency: {
      enabled: p.emergency_enabled,
      url: p.emergency_enabled && p.emergency_slug ? `${c.env.PUBLIC_URL}/e/${p.emergency_slug}` : null,
    },
  };
}

profile.get('/', async (c) => c.json({ profile: await loadProfile(c, c.get('userId')) }));

profile.patch('/', async (c) => {
  const patch = await body(c, ProfilePatch);
  const { db } = c.get('services');
  const userId = c.get('userId');
  const sets: string[] = [];
  const params: unknown[] = [userId];
  for (const [key, column] of Object.entries(COLUMNS)) {
    if (key in patch) {
      params.push((patch as Record<string, unknown>)[key]);
      sets.push(`${column} = $${params.length}`);
    }
  }
  if (sets.length) await db.query(asUser(userId), `UPDATE profiles SET ${sets.join(', ')}, updated_at = now() WHERE user_id = $1`, params);
  if (patch.name) await db.query(asUser(userId), 'UPDATE users SET name = $2, updated_at = now() WHERE id = $1', [userId, patch.name]);
  return c.json({ profile: await loadProfile(c, userId) });
});

/** Turns the public emergency card on or off. Rotating issues a new link and kills the old one. */
profile.put('/emergency', async (c) => {
  const { enabled, rotate } = await body(c, z.object({ enabled: z.boolean(), rotate: z.boolean().default(false) }));
  const { db } = c.get('services');
  const userId = c.get('userId');
  await db.query(
    asUser(userId),
    `UPDATE profiles SET emergency_enabled = $2,
       emergency_slug = CASE WHEN $2 AND (emergency_slug IS NULL OR $3) THEN $4 ELSE emergency_slug END,
       updated_at = now() WHERE user_id = $1`,
    [userId, enabled, rotate, randomToken(16)],
  );
  await logActivity(db, {
    userId,
    kind: 'emergency_updated',
    title: enabled ? (rotate ? 'Medical ID link replaced' : 'Medical ID turned on') : 'Medical ID turned off',
  });
  return c.json({ profile: await loadProfile(c, userId) });
});

profile.put('/avatar', async (c) => {
  const userId = c.get('userId');
  const file = await readUpload(c, { images: true, pdf: false, maxBytes: 5 * 1024 * 1024 });
  const key = `${userId}/avatar/${crypto.randomUUID()}`;
  const { db } = c.get('services');
  await c.env.VAULT.put(key, file.data, { httpMetadata: { contentType: file.contentType } });
  const [old] = await db.query<{ avatar_key: string | null }>(
    asUser(userId),
    `UPDATE profiles p SET avatar_key = $2, updated_at = now() FROM profiles prev
      WHERE p.user_id = $1 AND prev.user_id = p.user_id RETURNING prev.avatar_key`,
    [userId, key],
  );
  if (old?.avatar_key) await c.env.VAULT.delete(old.avatar_key);
  return c.json({ profile: await loadProfile(c, userId) });
});

profile.delete('/avatar', async (c) => {
  const userId = c.get('userId');
  const { db } = c.get('services');
  const [old] = await db.query<{ avatar_key: string | null }>(
    asUser(userId),
    `UPDATE profiles p SET avatar_key = NULL FROM profiles prev
      WHERE p.user_id = $1 AND prev.user_id = p.user_id RETURNING prev.avatar_key`,
    [userId],
  );
  if (old?.avatar_key) await c.env.VAULT.delete(old.avatar_key);
  return c.json({ profile: await loadProfile(c, userId) });
});
