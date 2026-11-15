import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../lib/auth';
import { randomToken } from '../lib/crypto';
import { body } from '../lib/http';
import { PERSON_COLUMNS, personProfile, resolvePerson, type PersonRow } from '../lib/people';
import { logActivity } from '../lib/security';
import { HttpError, asUser, type AppEnv } from '../lib/types';
import { ProfilePatch } from './profile';

/** Family members kept by the account holder (DD-55). */
export const people = new Hono<AppEnv>();
people.use('*', requireAuth);

export const MAX_PEOPLE = 10;

const PersonFields = ProfilePatch.pick({
  name: true, dateOfBirth: true, sex: true, bloodType: true, allergies: true, conditions: true, medications: true,
  organDonor: true, emergencyContactName: true, emergencyContactPhone: true, emergencyContactRelation: true,
}).extend({ relation: z.string().trim().max(40).nullable().optional() });

const COLUMNS: Record<string, string> = {
  name: 'name', relation: 'relation', dateOfBirth: 'date_of_birth', sex: 'sex', bloodType: 'blood_type',
  allergies: 'allergies', conditions: 'conditions', medications: 'medications', organDonor: 'organ_donor',
  emergencyContactName: 'emergency_contact_name', emergencyContactPhone: 'emergency_contact_phone',
  emergencyContactRelation: 'emergency_contact_relation',
};

async function owned(c: Context<AppEnv>, id: string) {
  const person = await resolvePerson(c.get('services').db, c.get('userId'), id);
  if (!person) throw new HttpError(404, 'PERSON_NOT_FOUND', 'That family member was removed.');
  return person;
}

people.get('/', async (c) => {
  const { db } = c.get('services');
  const userId = c.get('userId');
  const rows = await db.query<PersonRow & { record_count: number }>(
    asUser(userId),
    `SELECT ${PERSON_COLUMNS}, (SELECT count(*)::int FROM records r WHERE r.person_id = p.id) AS record_count
       FROM people p WHERE p.user_id = $1 ORDER BY p.created_at`,
    [userId],
  );
  return c.json({ people: rows.map((r) => ({ ...personProfile(c.env, r), recordCount: r.record_count })) });
});

people.post('/', async (c) => {
  const input = await body(c, PersonFields.required({ name: true }));
  const { db } = c.get('services');
  const userId = c.get('userId');
  const [{ n } = { n: 0 }] = await db.query<{ n: number }>(asUser(userId), 'SELECT count(*)::int AS n FROM people WHERE user_id = $1', [userId]);
  if (n >= MAX_PEOPLE) throw new HttpError(422, 'TOO_MANY_PEOPLE', `You can keep records for up to ${MAX_PEOPLE} family members.`);
  const keys = Object.keys(COLUMNS).filter((k) => k in input);
  const [row] = await db.query<PersonRow>(
    asUser(userId),
    `INSERT INTO people (user_id, ${keys.map((k) => COLUMNS[k]).join(', ')}) VALUES ($1, ${keys.map((_, i) => `$${i + 2}`).join(', ')})
     RETURNING ${PERSON_COLUMNS}`,
    [userId, ...keys.map((k) => (input as Record<string, unknown>)[k] ?? null)],
  );
  await logActivity(db, { userId, kind: 'person_added', title: 'Family member added', detail: row!.name });
  return c.json({ person: { ...personProfile(c.env, row!), recordCount: 0 } }, 201);
});

people.get('/:id', async (c) => c.json({ person: personProfile(c.env, await owned(c, c.req.param('id'))) }));

people.patch('/:id', async (c) => {
  const patch = await body(c, PersonFields);
  const person = await owned(c, c.req.param('id'));
  const { db } = c.get('services');
  const userId = c.get('userId');
  const sets: string[] = [];
  const params: unknown[] = [person.id, userId];
  for (const [key, column] of Object.entries(COLUMNS)) {
    if (!(key in patch)) continue;
    params.push((patch as Record<string, unknown>)[key] ?? null);
    sets.push(`${column} = $${params.length}`);
  }
  const [row] = sets.length
    ? await db.query<PersonRow>(asUser(userId), `UPDATE people SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 AND user_id = $2 RETURNING ${PERSON_COLUMNS}`, params)
    : [person];
  return c.json({ person: personProfile(c.env, row!) });
});

/** Deletes the person with all their records, pages and share links. */
people.delete('/:id', async (c) => {
  const person = await owned(c, c.req.param('id'));
  const { db } = c.get('services');
  const userId = c.get('userId');
  const [result] = await db.query<{ keys: string[] }>(
    asUser(userId),
    `WITH f AS (SELECT rf.object_key FROM record_files rf JOIN records r ON r.id = rf.record_id WHERE r.person_id = $1 AND r.user_id = $2),
          d AS (DELETE FROM people WHERE id = $1 AND user_id = $2 RETURNING id)
     SELECT coalesce((SELECT array_agg(object_key) FROM f), '{}') AS keys FROM d`,
    [person.id, userId],
  );
  if (result?.keys.length) await c.env.VAULT.delete(result.keys);
  await logActivity(db, { userId, kind: 'person_removed', title: 'Family member removed', detail: person.name });
  return c.json({ deleted: true });
});

/** Public emergency page for a family member, like the account holder's own. */
people.put('/:id/emergency', async (c) => {
  const { enabled, rotate } = await body(c, z.object({ enabled: z.boolean(), rotate: z.boolean().default(false) }));
  const person = await owned(c, c.req.param('id'));
  const { db } = c.get('services');
  const userId = c.get('userId');
  const [row] = await db.query<PersonRow>(
    asUser(userId),
    `UPDATE people SET emergency_enabled = $3,
       emergency_slug = CASE WHEN $3 AND (emergency_slug IS NULL OR $4) THEN $5 ELSE emergency_slug END,
       updated_at = now() WHERE id = $1 AND user_id = $2 RETURNING ${PERSON_COLUMNS}`,
    [person.id, userId, enabled, rotate, randomToken(16)],
  );
  await logActivity(db, {
    userId,
    kind: 'emergency_updated',
    title: `${person.name}'s Medical ID ${enabled ? (rotate ? 'link replaced' : 'turned on') : 'turned off'}`,
  });
  return c.json({ person: personProfile(c.env, row!) });
});
