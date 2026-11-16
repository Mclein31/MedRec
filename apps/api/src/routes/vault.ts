import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../lib/auth';
import { askRemy, summarizeHistory } from '../lib/gemini';
import { body } from '../lib/http';
import {
  graceCutoffDate,
  mapMedication,
  mapMedicationLog,
  MEDICATION_COLUMNS,
  MEDICATION_LOG_COLUMNS,
  type MedicationLogRow,
  type MedicationRow,
} from '../lib/medications';
import { PERSON_COLUMNS, PersonId, personFilter, personProfile, resolvePerson, type PersonRow } from '../lib/people';
import { RECORD_COLUMNS, mapRecord, type RecordRow } from '../lib/records';
import { aiBudget, rateLimit } from '../lib/security';
import { CATEGORY_NAMES } from '../lib/shares';
import { asUser, type AppEnv, type Db } from '../lib/types';
import { loadProfile } from './profile';

/** Activity feed, AI history summary and full export. */
export const vault = new Hono<AppEnv>();
vault.use('*', requireAuth);

vault.get('/activity', async (c) => {
  const { db } = c.get('services');
  const userId = c.get('userId');
  const before = Number(c.req.query('before') ?? '0');
  const rows = await db.query<{ id: string; kind: string; title: string; detail: string | null; meta: Record<string, unknown>; created_at: string; unread: boolean }>(
    asUser(userId),
    `SELECT a.id::text, a.kind, a.title, a.detail, a.meta, a.created_at, a.created_at > u.activity_seen_at AS unread
       FROM activity a JOIN users u ON u.id = a.user_id
      WHERE a.user_id = $1 AND ($2 = 0 OR a.id < $2) ORDER BY a.id DESC LIMIT 40`,
    [userId, Number.isSafeInteger(before) && before > 0 ? before : 0],
  );
  const [{ unread } = { unread: 0 }] = await db.query<{ unread: number }>(
    asUser(userId),
    'SELECT count(*)::int AS unread FROM activity a JOIN users u ON u.id = a.user_id WHERE a.user_id = $1 AND a.created_at > u.activity_seen_at',
    [userId],
  );
  return c.json({
    items: rows.map((r) => ({ id: r.id, kind: r.kind, title: r.title, detail: r.detail, meta: r.meta, createdAt: r.created_at, unread: r.unread })),
    unread,
    nextBefore: rows.length === 40 ? rows[rows.length - 1]!.id : null,
  });
});

vault.post('/activity/seen', async (c) => {
  const { db } = c.get('services');
  await db.query(asUser(c.get('userId')), 'UPDATE users SET activity_seen_at = now() WHERE id = $1', [c.get('userId')]);
  return c.json({ unread: 0 });
});

export const AI_RECORD_LIMIT = 25;

const MEAL_LABEL: Record<string, string> = {
  before_meal: 'before meal',
  with_meal: 'with food',
  after_meal: 'after meal',
};

function cleanInline(value: string) {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export function formatActiveMedicationLine(m: MedicationRow): string {
  const base = `${cleanInline(m.name)}${m.strength ? ` ${cleanInline(m.strength)}` : ''}`;
  const details: string[] = [];
  if (m.dose) details.push(cleanInline(m.dose));
  if (m.schedule_kind === 'daily_times' && m.times.length) {
    details.push(m.times.join(', '));
  } else if (m.schedule_kind === 'interval_hours' && m.interval_hours) {
    details.push(`every ${m.interval_hours} hours${m.times[0] ? ` from ${m.times[0]}` : ''}`);
  } else if (m.schedule_kind === 'as_needed') {
    details.push('as needed');
  }
  if (m.meal_timing && MEAL_LABEL[m.meal_timing]) {
    details.push(MEAL_LABEL[m.meal_timing]!);
  }
  if (m.end_date) details.push(`until ${spokenDate(m.end_date)}`);
  if (m.instructions) details.push(cleanInline(m.instructions).slice(0, 200));
  return details.length ? `${base} (${details.join(', ')})` : base;
}

async function loadActiveMedications(db: Db, userId: string, personId: string | null, now: Date) {
  return db.query<MedicationRow>(
    asUser(userId),
    `SELECT ${MEDICATION_COLUMNS} FROM medications m
      WHERE m.user_id = $1 AND ${personFilter('m', 2)}
        AND m.status = 'active' AND (m.end_date IS NULL OR m.end_date >= $3::date)
      ORDER BY m.created_at DESC LIMIT 50`,
    [userId, personId, graceCutoffDate(now)],
  );
}

/** Plain-text context for the model: profile facts plus the newest records. Never file URLs. */
export function historyContext(
  profile: Pick<Awaited<ReturnType<typeof loadProfile>>, 'allergies' | 'conditions' | 'medications' | 'bloodType'>,
  rows: RecordRow[],
  activeMedications: MedicationRow[] = [],
) {
  const lines = [
    `Allergies: ${profile.allergies.join(', ') || 'none recorded'}`,
    `Conditions: ${profile.conditions.join(', ') || 'none recorded'}`,
    `Medications: ${profile.medications.join(', ') || 'none recorded'}`,
    ...(activeMedications.length ? [`Active prescribed medications: ${activeMedications.map(formatActiveMedicationLine).join('; ')}`] : []),
    `Blood type: ${profile.bloodType ?? 'unknown'}`,
    '',
    ...rows.map((r) => {
      const ai = r.ai as { summary?: string } | null;
      return `- ${r.event_date ?? 'undated'} · ${CATEGORY_NAMES[r.category] ?? r.category} · ${r.title}` +
        `${r.provider ? ` · ${r.provider}` : ''}${r.facility ? ` · ${r.facility}` : ''}` +
        `${r.notes ? `\n  Notes: ${r.notes.slice(0, 600)}` : ''}${ai?.summary ? `\n  Summary: ${ai.summary.slice(0, 600)}` : ''}`;
    }),
  ];
  return lines.join('\n');
}

vault.post('/ai/summary', async (c) => {
  const s = c.get('services');
  const userId = c.get('userId');
  await rateLimit(s.db, `summary:user:${userId}`, 10, 3600, s.now());
  await aiBudget(s.db, c.env, s.now());
  const person = await resolvePerson(s.db, userId, ((await c.req.json().catch(() => null)) as { personId?: unknown } | null)?.personId);
  const profile = person ? personProfile(c.env, person) : await loadProfile(c, userId);
  const [rows, activeMeds] = await Promise.all([
    s.db.query<RecordRow>(
      asUser(userId),
      `SELECT ${RECORD_COLUMNS} FROM records r WHERE r.user_id = $1 AND ${personFilter('r', 3)}
        ORDER BY coalesce(r.event_date, r.created_at::date) DESC, r.created_at DESC LIMIT $2`,
      [userId, AI_RECORD_LIMIT + 1, person?.id ?? null],
    ),
    loadActiveMedications(s.db, userId, person?.id ?? null, s.now()),
  ]);
  const used = rows.slice(0, AI_RECORD_LIMIT);
  const summary = await summarizeHistory(c.env, s.fetch, historyContext(profile, used, activeMeds));
  // Disclose the cap rather than implying the summary covers everything.
  return c.json({ summary, basedOn: used.length, limited: rows.length > AI_RECORD_LIMIT });
});

export const ASK_RECORD_LIMIT = 60;
const ASK_CONTEXT_CHARS = 60_000;

type Snapshot = {
  summary?: string; findings?: string[]; terms?: { term: string; meaning: string }[];
  medications?: { name: string; dosage: string | null; frequency: string | null }[];
  labValues?: { name: string; value: string; unit: string | null; range: string | null; flag: string }[];
};

/** "May 20, 2026": written out on the server so the model copies dates instead of converting them (it got years wrong). */
export function spokenDate(value: string | Date | null) {
  if (!value) return 'undated';
  const iso = typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? 'undated' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** One record as model material, labelled R1, R2… so answers can cite it without seeing database ids. */
function recordMaterial(label: string, r: RecordRow, focused: boolean) {
  const ai = (r.ai ?? {}) as Snapshot;
  const lines = [
    `${label}${focused ? ' (the record the person is looking at)' : ''}: ${r.title} · ${CATEGORY_NAMES[r.category] ?? r.category} · ${spokenDate(r.event_date)}` +
      `${r.provider ? ` · ${r.provider}` : ''}${r.facility ? ` · ${r.facility}` : ''}`,
  ];
  if (ai.summary) lines.push(`  Summary: ${ai.summary.slice(0, 700)}`);
  if (ai.labValues?.length) lines.push(...ai.labValues.slice(0, 40).map((v) => `  Lab: ${v.name} = ${v.value}${v.unit ? ` ${v.unit}` : ''}${v.range ? ` (range ${v.range})` : ''}${v.flag && v.flag !== 'normal' && v.flag !== 'unknown' ? ` [${v.flag.toUpperCase()}]` : ''}`));
  if (ai.medications?.length) lines.push(...ai.medications.slice(0, 20).map((m) => `  Medication: ${m.name}${m.dosage ? `, ${m.dosage}` : ''}${m.frequency ? `, ${m.frequency}` : ''}`));
  if (ai.findings?.length) lines.push(...ai.findings.slice(0, 10).map((f) => `  Finding: ${f.slice(0, 300)}`));
  if (ai.terms?.length) lines.push(`  Terms explained: ${ai.terms.slice(0, 12).map((t) => `${t.term} = ${t.meaning.slice(0, 200)}`).join('; ')}`);
  if (r.notes) lines.push(`  Person's notes: ${r.notes.slice(0, 500)}`);
  if (!r.ai) lines.push('  (No AI reading saved for this record; only the details above are known.)');
  return lines.join('\n');
}

const AskInput = z.object({
  question: z.string().trim().min(1).max(500),
  history: z.array(z.object({ role: z.enum(['user', 'remy']), text: z.string().max(1500) })).max(6).default([]),
  recordId: z.string().uuid().optional(),
  personId: PersonId,
});

/** Ask Remy: answers from the person's own records via Gemini. Cited records are returned so the app can link them. */
vault.post('/ai/ask', async (c) => {
  const input = await body(c, AskInput);
  const s = c.get('services');
  const userId = c.get('userId');
  await rateLimit(s.db, `ask:user:${userId}`, 60, 3600, s.now());
  await aiBudget(s.db, c.env, s.now());
  // Remy answers about one person at a time: the account holder or the family member being viewed.
  const person = await resolvePerson(s.db, userId, input.personId);
  const profile = person ? personProfile(c.env, person) : await loadProfile(c, userId);
  const [rows, activeMeds] = await Promise.all([
    s.db.query<RecordRow>(
      asUser(userId),
      `SELECT ${RECORD_COLUMNS} FROM records r WHERE r.user_id = $1 AND ${personFilter('r', 4)}
        ORDER BY (r.id = $3::uuid) DESC, coalesce(r.event_date, r.created_at::date) DESC, r.created_at DESC LIMIT $2`,
      [userId, ASK_RECORD_LIMIT + 1, input.recordId ?? '00000000-0000-0000-0000-000000000000', person?.id ?? null],
    ),
    loadActiveMedications(s.db, userId, person?.id ?? null, s.now()),
  ]);
  const used = rows.slice(0, ASK_RECORD_LIMIT);
  const labels = new Map<string, RecordRow>();
  const head = [
    ...(person ? [`These are the records of ${person.name}${person.relation ? ` (the account holder's ${person.relation.toLowerCase()})` : ''}, kept by a family caregiver. Talk about ${person.name} in the third person.`] : []),
    `Name: ${profile.name}${profile.dateOfBirth ? ` · born ${spokenDate(profile.dateOfBirth)}` : ''}${profile.sex ? ` · ${profile.sex}` : ''}`,
    `Blood type: ${profile.bloodType ?? 'unknown'}`,
    `Allergies: ${profile.allergies.join(', ') || 'none recorded'}`,
    `Conditions: ${profile.conditions.join(', ') || 'none recorded'}`,
    `Medications (health details): ${profile.medications.join(', ') || 'none recorded'}`,
    `Active prescribed medications: ${activeMeds.length ? activeMeds.map(formatActiveMedicationLine).join('; ') : 'none recorded'}`,
    `Saved records: ${rows.length > ASK_RECORD_LIMIT ? `the newest ${ASK_RECORD_LIMIT} are below (more exist)` : used.length || 'none yet'}`,
  ];
  let material = head.join('\n');
  for (const [i, r] of used.entries()) {
    const label = `R${i + 1}`;
    const block = recordMaterial(label, r, r.id === input.recordId);
    if (material.length + block.length > ASK_CONTEXT_CHARS) break;
    labels.set(label, r);
    material += '\n\n' + block;
  }
  const reply = await askRemy(c.env, s.fetch, material, input.history, input.question);
  // Only records that were actually in the material can be cited.
  const cited = [...new Set(reply.recordIds.map((x) => x.trim().toUpperCase()))].map((l) => labels.get(l)).filter((r): r is RecordRow => !!r).slice(0, 4);
  return c.json({
    kind: reply.kind,
    answer: reply.answer.trim(),
    records: cited.map((r) => ({ id: r.id, title: r.title, category: r.category, eventDate: r.event_date, provider: r.provider, facility: r.facility })),
    followUps: reply.followUps.map((f) => f.trim()).filter(Boolean).slice(0, 3),
    basedOn: labels.size,
    model: reply.model,
  });
});

/** Everything the patient owns as JSON. Files are listed, not embedded; no signed URLs are included. */
vault.get('/export', async (c) => {
  const s = c.get('services');
  const userId = c.get('userId');
  const profile = await loadProfile(c, userId);
  const rows = await s.db.query<RecordRow>(
    asUser(userId),
    `SELECT ${RECORD_COLUMNS} FROM records r WHERE r.user_id = $1 ORDER BY coalesce(r.event_date, r.created_at::date) DESC, r.created_at DESC`,
    [userId],
  );
  const { avatarUrl: _a, emergency: _e, ...facts } = profile;
  const family = await s.db.query<PersonRow>(asUser(userId), `SELECT ${PERSON_COLUMNS} FROM people WHERE user_id = $1 ORDER BY created_at`, [userId]);
  const medRows = await s.db.query<MedicationRow>(
    asUser(userId),
    `SELECT ${MEDICATION_COLUMNS} FROM medications m WHERE m.user_id = $1 ORDER BY m.created_at DESC`,
    [userId],
  );
  const logRows = await s.db.query<MedicationLogRow>(
    asUser(userId),
    `SELECT ${MEDICATION_LOG_COLUMNS} FROM medication_logs l WHERE l.user_id = $1 ORDER BY l.scheduled_date DESC, l.scheduled_time DESC, l.acted_at DESC`,
    [userId],
  );
  c.header('content-disposition', `attachment; filename="medrec-export-${s.now().toISOString().slice(0, 10)}.json"`);
  return c.json({
    format: 'medrec-export',
    version: 2,
    exportedAt: s.now().toISOString(),
    profile: facts,
    familyMembers: family.map((p) => { const { emergency: _pe, avatarUrl: _pa, email: _pm, phone: _pp, heightCm: _ph, weightKg: _pw, ...rest } = personProfile(c.env, p); return rest; }),
    records: rows.map(mapRecord),
    medications: medRows.map(mapMedication),
    medicationLogs: logRows.map(mapMedicationLog),
    note: 'Attached page images and PDFs are not included in this file. Open each record in MedRec to download them.',
  });
});
