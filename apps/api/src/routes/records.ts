import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../lib/auth';
import { CATEGORIES, scanDocument } from '../lib/gemini';
import { body } from '../lib/http';
import { RECORD_COLUMNS, decodeCursor, encodeCursor, filesFor, mapRecord, signedFiles, type FileRow, type RecordRow } from '../lib/records';
import { logActivity, rateLimit } from '../lib/security';
import { HttpError, asUser, type AppEnv } from '../lib/types';
import { readUpload } from './uploads';

export const records = new Hono<AppEnv>();
records.use('*', requireAuth);

const Uuid = z.string().uuid();
const CivilDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
  .refine((v) => new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v, 'Enter a real calendar date.');

const AiSnapshot = z
  .object({
    summary: z.string().max(4000),
    findings: z.array(z.string().max(500)).max(50),
    medications: z.array(z.object({ name: z.string().max(200), dosage: z.string().max(200).nullable(), frequency: z.string().max(200).nullable() })).max(50),
    labValues: z
      .array(z.object({ name: z.string().max(200), value: z.string().max(100), unit: z.string().max(50).nullable(), range: z.string().max(100).nullable(), flag: z.enum(['low', 'normal', 'high', 'unknown']) }))
      .max(200),
    terms: z.array(z.object({ term: z.string().max(100), meaning: z.string().max(500) })).max(50),
    model: z.string().max(60),
  })
  .nullable();

const RecordFields = z.object({
  title: z.string().trim().min(1, 'Give the record a title.').max(160),
  category: z.enum(CATEGORIES),
  eventDate: CivilDate.nullable(),
  provider: z.string().trim().max(160).nullable(),
  facility: z.string().trim().max(160).nullable(),
  notes: z.string().trim().max(10_000).nullable(),
  ai: AiSnapshot,
});

const PAGE = 30;

records.get('/', async (c) => {
  const { db } = c.get('services');
  const userId = c.get('userId');
  const q = (c.req.query('q') ?? '').trim().slice(0, 100);
  const category = c.req.query('category');
  const limit = Math.min(Math.max(Number(c.req.query('limit') ?? PAGE) || PAGE, 1), 100);
  const cursor = c.req.query('cursor') ? decodeCursor(c.req.query('cursor')!) : null;
  if (c.req.query('cursor') && !cursor) throw new HttpError(400, 'BAD_CURSOR', 'This list is out of date. Refresh to continue.');
  if (category && !(CATEGORIES as readonly string[]).includes(category)) throw new HttpError(422, 'VALIDATION', 'category: unknown category');

  const params: unknown[] = [userId];
  const where = ['r.user_id = $1'];
  if (category) where.push(`r.category = $${params.push(category)}`);
  if (q) {
    // Full-text match, plus prefix matching on title/provider/facility for as-you-type search.
    const n = params.push(q);
    const like = params.push(`%${q.replace(/[\\%_]/g, (m) => '\\' + m)}%`);
    where.push(`(r.search @@ plainto_tsquery('simple', $${n}) OR r.title ILIKE $${like} OR r.provider ILIKE $${like} OR r.facility ILIKE $${like})`);
  }
  if (cursor) {
    const [d, created, id] = cursor;
    where.push(`(coalesce(r.event_date, r.created_at::date), r.created_at, r.id) < ($${params.push(d)}::date, $${params.push(created)}::timestamptz, $${params.push(id)}::uuid)`);
  }
  params.push(limit + 1);
  const rows = await db.query<RecordRow>(
    asUser(userId),
    `SELECT ${RECORD_COLUMNS} FROM records r WHERE ${where.join(' AND ')}
      ORDER BY coalesce(r.event_date, r.created_at::date) DESC, r.created_at DESC, r.id DESC LIMIT $${params.length}`,
    params,
  );
  const page = rows.slice(0, limit);
  return c.json({ records: page.map(mapRecord), nextCursor: rows.length > limit ? encodeCursor(page[page.length - 1]!) : null });
});

records.get('/summary', async (c) => {
  const { db } = c.get('services');
  const rows = await db.query<{ category: string; n: number; latest: string | null }>(
    asUser(c.get('userId')),
    `SELECT category, count(*)::int AS n, to_char(max(coalesce(event_date, created_at::date)), 'YYYY-MM-DD') AS latest
       FROM records WHERE user_id = $1 GROUP BY category`,
    [c.get('userId')],
  );
  const counts = Object.fromEntries(CATEGORIES.map((k) => [k, 0])) as Record<string, number>;
  for (const r of rows) counts[r.category] = r.n;
  return c.json({ total: rows.reduce((a, r) => a + r.n, 0), counts, latest: rows.flatMap((r) => (r.latest ? [r.latest] : [])).sort().pop() ?? null });
});

async function loadOwned(c: Context<AppEnv>, id: string) {
  if (!Uuid.safeParse(id).success) throw notFound();
  const { db } = c.get('services');
  const [row] = await db.query<RecordRow>(asUser(c.get('userId')), `SELECT ${RECORD_COLUMNS} FROM records r WHERE r.id = $1 AND r.user_id = $2`, [id, c.get('userId')]);
  if (!row) throw notFound();
  return row;
}

const notFound = () => new HttpError(404, 'NOT_FOUND', 'This record was deleted or never existed.');

records.get('/:id', async (c) => {
  const row = await loadOwned(c, c.req.param('id'));
  const { db, now } = c.get('services');
  const files = (await filesFor(db, c.get('userId'), [row.id])).get(row.id) ?? [];
  return c.json({ record: { ...mapRecord(row), files: await signedFiles(c.env, files, now()) } });
});

const MAX_PAGES = 20;
const MAX_DRAFTS = 40;
const SCAN_BYTES = 18 * 1024 * 1024; // Gemini's inline request limit is 20 MB.

/** Uploads one page as a draft (not yet attached to a record). */
records.post('/files', async (c) => {
  const userId = c.get('userId');
  const { db } = c.get('services');
  const [{ n } = { n: 0 }] = await db.query<{ n: number }>(
    asUser(userId),
    'SELECT count(*)::int AS n FROM record_files WHERE user_id = $1 AND record_id IS NULL',
    [userId],
  );
  if (n >= MAX_DRAFTS) throw new HttpError(429, 'TOO_MANY_DRAFTS', 'Save or discard the pages you already added before adding more.');
  const file = await readUpload(c, { images: true, pdf: true });
  const id = crypto.randomUUID();
  const key = `${userId}/records/${id}`;
  await c.env.VAULT.put(key, file.data, { httpMetadata: { contentType: file.contentType } });
  await db.query(
    asUser(userId),
    'INSERT INTO record_files (id, user_id, object_key, content_type, size_bytes) VALUES ($1, $2, $3, $4, $5)',
    [id, userId, key, file.contentType, file.size],
  );
  return c.json({ file: { id, contentType: file.contentType, size: file.size } }, 201);
});

async function ownedFiles(c: Context<AppEnv>, ids: string[], draftsOnly: boolean) {
  const { db } = c.get('services');
  const rows = await db.query<FileRow>(
    asUser(c.get('userId')),
    `SELECT id, record_id, object_key, content_type, size_bytes, position FROM record_files
      WHERE user_id = $1 AND id = ANY($2::uuid[]) ${draftsOnly ? 'AND record_id IS NULL' : ''}`,
    [c.get('userId'), ids],
  );
  if (rows.length !== new Set(ids).size) throw new HttpError(422, 'FILES_MISSING', 'Some pages are no longer available. Add them again.');
  return ids.map((id) => rows.find((r) => r.id === id)!);
}

/** Reads the pages with Gemini and returns suggested fields. Nothing is saved. */
records.post('/scan', async (c) => {
  const { fileIds } = await body(c, z.object({ fileIds: z.array(Uuid).min(1).max(MAX_PAGES) }));
  const s = c.get('services');
  await rateLimit(s.db, `scan:user:${c.get('userId')}`, 30, 3600, s.now());
  const files = await ownedFiles(c, fileIds, false);
  if (files.reduce((a, f) => a + f.size_bytes, 0) > SCAN_BYTES) {
    throw new HttpError(413, 'SCAN_TOO_LARGE', 'These pages are too large to read at once. Scan fewer pages, then add the rest.');
  }
  const parts = await Promise.all(
    files.map(async (f) => {
      const obj = await c.env.VAULT.get(f.object_key);
      if (!obj) throw new HttpError(422, 'FILES_MISSING', 'Some pages are no longer available. Add them again.');
      return { mimeType: f.content_type, data: await obj.arrayBuffer() };
    }),
  );
  return c.json({ draft: await scanDocument(c.env, s.fetch, parts) });
});

records.post('/', async (c) => {
  const input = await body(c, RecordFields.extend({ fileIds: z.array(Uuid).max(MAX_PAGES).default([]) }));
  const { db } = c.get('services');
  const userId = c.get('userId');
  if (input.fileIds.length) await ownedFiles(c, input.fileIds, true);
  const [created] = await db.query<{ id: string; attached: number }>(
    asUser(userId),
    `WITH r AS (
       INSERT INTO records (user_id, title, category, event_date, provider, facility, notes, ai)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id),
     f AS (
       UPDATE record_files rf SET record_id = r.id, position = array_position($9::uuid[], rf.id) - 1
         FROM r WHERE rf.id = ANY($9::uuid[]) AND rf.user_id = $1 AND rf.record_id IS NULL RETURNING rf.id)
     SELECT r.id, (SELECT count(*)::int FROM f) AS attached FROM r`,
    [userId, input.title, input.category, input.eventDate, input.provider, input.facility, input.notes, input.ai ? JSON.stringify(input.ai) : null, input.fileIds],
  );
  await logActivity(db, { userId, kind: 'record_added', title: 'Record added', meta: { recordId: created!.id } });
  const row = await loadOwned(c, created!.id);
  const files = (await filesFor(db, userId, [row.id])).get(row.id) ?? [];
  return c.json({ record: { ...mapRecord(row), files: await signedFiles(c.env, files, c.get('services').now()) } }, 201);
});

records.patch('/:id', async (c) => {
  const patch = await body(c, RecordFields.partial());
  const row = await loadOwned(c, c.req.param('id'));
  const { db, now } = c.get('services');
  const userId = c.get('userId');
  const columns: Record<string, string> = { title: 'title', category: 'category', eventDate: 'event_date', provider: 'provider', facility: 'facility', notes: 'notes', ai: 'ai' };
  const sets: string[] = [];
  const params: unknown[] = [row.id, userId];
  for (const [key, column] of Object.entries(columns)) {
    if (!(key in patch)) continue;
    const value = (patch as Record<string, unknown>)[key];
    params.push(key === 'ai' && value ? JSON.stringify(value) : value);
    sets.push(`${column} = $${params.length}`);
  }
  if (sets.length) await db.query(asUser(userId), `UPDATE records SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 AND user_id = $2`, params);
  const fresh = await loadOwned(c, row.id);
  const files = (await filesFor(db, userId, [row.id])).get(row.id) ?? [];
  return c.json({ record: { ...mapRecord(fresh), files: await signedFiles(c.env, files, now()) } });
});

records.delete('/:id', async (c) => {
  const row = await loadOwned(c, c.req.param('id'));
  const { db } = c.get('services');
  const userId = c.get('userId');
  const [result] = await db.query<{ keys: string[] }>(
    asUser(userId),
    `WITH f AS (SELECT object_key FROM record_files WHERE record_id = $1 AND user_id = $2),
          d AS (DELETE FROM records WHERE id = $1 AND user_id = $2 RETURNING id)
     SELECT coalesce((SELECT array_agg(object_key) FROM f), '{}') AS keys FROM d`,
    [row.id, userId],
  );
  if (result?.keys.length) await c.env.VAULT.delete(result.keys);
  await logActivity(db, { userId, kind: 'record_deleted', title: 'Record deleted' });
  return c.json({ deleted: true });
});

/** Attaches draft pages to an existing record, after its current pages. */
records.post('/:id/files', async (c) => {
  const { fileIds } = await body(c, z.object({ fileIds: z.array(Uuid).min(1).max(MAX_PAGES) }));
  const row = await loadOwned(c, c.req.param('id'));
  if (row.file_count + fileIds.length > MAX_PAGES) throw new HttpError(422, 'TOO_MANY_PAGES', `A record can hold up to ${MAX_PAGES} pages.`);
  await ownedFiles(c, fileIds, true);
  const { db, now } = c.get('services');
  const userId = c.get('userId');
  await db.query(
    asUser(userId),
    `UPDATE record_files SET record_id = $1, position = $3 + array_position($4::uuid[], id) - 1
      WHERE user_id = $2 AND id = ANY($4::uuid[]) AND record_id IS NULL`,
    [row.id, userId, row.file_count, fileIds],
  );
  await db.query(asUser(userId), 'UPDATE records SET updated_at = now() WHERE id = $1', [row.id]);
  const files = (await filesFor(db, userId, [row.id])).get(row.id) ?? [];
  return c.json({ files: await signedFiles(c.env, files, now()) });
});

records.delete('/:id/files/:fileId', async (c) => {
  const row = await loadOwned(c, c.req.param('id'));
  const fileId = c.req.param('fileId');
  if (!Uuid.safeParse(fileId).success) throw new HttpError(404, 'NOT_FOUND', 'That page was already removed.');
  const { db } = c.get('services');
  const [gone] = await db.query<{ object_key: string }>(
    asUser(c.get('userId')),
    'DELETE FROM record_files WHERE id = $1 AND record_id = $2 AND user_id = $3 RETURNING object_key',
    [fileId, row.id, c.get('userId')],
  );
  if (!gone) throw new HttpError(404, 'NOT_FOUND', 'That page was already removed.');
  await c.env.VAULT.delete(gone.object_key);
  return c.json({ deleted: true });
});

/** Discards a draft page that was never saved to a record. */
records.delete('/files/:fileId', async (c) => {
  const fileId = c.req.param('fileId');
  if (!Uuid.safeParse(fileId).success) throw new HttpError(404, 'NOT_FOUND', 'That page was already removed.');
  const { db } = c.get('services');
  const [gone] = await db.query<{ object_key: string }>(
    asUser(c.get('userId')),
    'DELETE FROM record_files WHERE id = $1 AND user_id = $2 AND record_id IS NULL RETURNING object_key',
    [fileId, c.get('userId')],
  );
  if (gone) await c.env.VAULT.delete(gone.object_key);
  return c.json({ deleted: true });
});
