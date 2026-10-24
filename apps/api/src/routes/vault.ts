import { Hono } from 'hono';
import { requireAuth } from '../lib/auth';
import { summarizeHistory } from '../lib/gemini';
import { RECORD_COLUMNS, mapRecord, type RecordRow } from '../lib/records';
import { rateLimit } from '../lib/security';
import { CATEGORY_NAMES } from '../lib/shares';
import { asUser, type AppEnv } from '../lib/types';
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

/** Plain-text context for the model: profile facts plus the newest records. Never file URLs. */
export function historyContext(profile: Awaited<ReturnType<typeof loadProfile>>, rows: RecordRow[]) {
  const lines = [
    `Allergies: ${profile.allergies.join(', ') || 'none recorded'}`,
    `Conditions: ${profile.conditions.join(', ') || 'none recorded'}`,
    `Medications: ${profile.medications.join(', ') || 'none recorded'}`,
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
  const profile = await loadProfile(c, userId);
  const rows = await s.db.query<RecordRow>(
    asUser(userId),
    `SELECT ${RECORD_COLUMNS} FROM records r WHERE r.user_id = $1
      ORDER BY coalesce(r.event_date, r.created_at::date) DESC, r.created_at DESC LIMIT $2`,
    [userId, AI_RECORD_LIMIT + 1],
  );
  const used = rows.slice(0, AI_RECORD_LIMIT);
  const summary = await summarizeHistory(c.env, s.fetch, historyContext(profile, used));
  // Disclose the cap rather than implying the summary covers everything.
  return c.json({ summary, basedOn: used.length, limited: rows.length > AI_RECORD_LIMIT });
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
  c.header('content-disposition', `attachment; filename="medrec-export-${s.now().toISOString().slice(0, 10)}.json"`);
  return c.json({
    format: 'medrec-export',
    version: 2,
    exportedAt: s.now().toISOString(),
    profile: facts,
    records: rows.map(mapRecord),
    note: 'Attached page images and PDFs are not included in this file. Open each record in MedRec to download them.',
  });
});
