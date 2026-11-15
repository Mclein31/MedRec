import { z } from 'zod';
import { HttpError, asUser, type AppEnv, type Db } from './types';

/**
 * Caregiver profiles (DD-55). Every person-scoped request carries an optional `personId`:
 * absent, empty or "me" means the account holder; anything else must be a family member
 * the account owns. Records and shares store it as person_id (NULL = account holder).
 */
export interface PersonRow {
  id: string;
  user_id: string;
  name: string;
  relation: string | null;
  date_of_birth: string | null;
  sex: string | null;
  blood_type: string | null;
  allergies: string[];
  conditions: string[];
  medications: string[];
  organ_donor: boolean | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;
  emergency_enabled: boolean;
  emergency_slug: string | null;
}

export const PERSON_COLUMNS = `id, user_id, name, relation, to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth, sex, blood_type,
  allergies, conditions, medications, organ_donor, emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
  emergency_enabled, emergency_slug`;

export const PersonId = z
  .union([z.string().uuid(), z.literal('me'), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v && v !== 'me' ? v : null));

/** The family member a request is about, or null for the account holder. Unknown ids are 404, never someone else's. */
export async function resolvePerson(db: Db, userId: string, raw: unknown): Promise<PersonRow | null> {
  const parsed = PersonId.safeParse(raw ?? undefined);
  if (!parsed.success) throw new HttpError(404, 'PERSON_NOT_FOUND', 'That family member was removed. Switch to someone else.');
  if (!parsed.data) return null;
  const [row] = await db.query<PersonRow>(asUser(userId), `SELECT ${PERSON_COLUMNS} FROM people WHERE id = $1 AND user_id = $2`, [parsed.data, userId]);
  if (!row) throw new HttpError(404, 'PERSON_NOT_FOUND', 'That family member was removed. Switch to someone else.');
  return row;
}

/** SQL condition matching rows that belong to the person (NULL-safe for the account holder). */
export function personFilter(alias: string, param: number) {
  return `${alias}.person_id IS NOT DISTINCT FROM $${param}::uuid`;
}

/** Same shape as the account holder's profile, so Medical ID, sharing and Remy can treat everyone alike. */
export function personProfile(env: AppEnv['Bindings'], p: PersonRow) {
  return {
    id: p.id,
    relation: p.relation,
    name: p.name,
    email: null as string | null,
    dateOfBirth: p.date_of_birth,
    sex: p.sex,
    bloodType: p.blood_type,
    heightCm: null as number | null,
    weightKg: null as number | null,
    allergies: p.allergies,
    conditions: p.conditions,
    medications: p.medications,
    organDonor: p.organ_donor,
    phone: null as string | null,
    emergencyContactName: p.emergency_contact_name,
    emergencyContactPhone: p.emergency_contact_phone,
    emergencyContactRelation: p.emergency_contact_relation,
    avatarUrl: null as string | null,
    emergency: { enabled: p.emergency_enabled, url: p.emergency_enabled && p.emergency_slug ? `${env.PUBLIC_URL}/e/${p.emergency_slug}` : null },
  };
}
