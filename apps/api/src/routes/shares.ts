import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../lib/auth';
import { CATEGORIES } from '../lib/gemini';
import { logActivity, rateLimit, shareToken } from '../lib/security';
import { CATEGORY_NAMES, DURATIONS_MINUTES, scopeLabel, shareState, type ShareRow } from '../lib/shares';
import { HttpError, asUser, type AppEnv } from '../lib/types';

export const shares = new Hono<AppEnv>();
shares.use('*', requireAuth);

const CreateShare = z.discriminatedUnion('scope', [
  z.object({ scope: z.literal('all') }),
  z.object({ scope: z.literal('categories'), categories: z.array(z.enum(CATEGORIES)).min(1, 'Choose at least one category.').max(CATEGORIES.length) }),
  z.object({ scope: z.literal('records'), recordIds: z.array(z.string().uuid()).min(1, 'Choose at least one record.').max(200) }),
]);

const Options = z.object({
  label: z.string().trim().max(80).optional(),
  minutes: z.number().refine((m) => (DURATIONS_MINUTES as readonly number[]).includes(m), 'Choose 15 min, 30 min, 1 hour, 1 day or 7 days.'),
});

async function present(c: { env: AppEnv['Bindings']; get: (k: 'services') => AppEnv['Variables']['services'] }, s: ShareRow) {
  const state = shareState(s, c.get('services').now());
  return {
    id: s.id,
    label: s.label,
    scope: s.scope,
    scopeLabel: scopeLabel(s, CATEGORY_NAMES),
    categories: s.categories,
    recordCount: s.scope === 'records' ? s.record_ids.length : null,
    expiresAt: s.expires_at,
    createdAt: s.created_at,
    revokedAt: s.revoked_at,
    firstViewAt: s.first_view_at,
    viewCount: s.view_count,
    state,
    // The link is only handed out while it still works.
    url: state === 'active' ? `${c.env.PUBLIC_URL}/s/${await shareToken(s.id, c.env.FILE_SIGNING_SECRET)}` : null,
  };
}

shares.post('/', async (c) => {
  const raw = await c.req.json().catch(() => null);
  const scope = CreateShare.safeParse(raw);
  if (!scope.success) throw new HttpError(422, 'VALIDATION', scope.error.issues[0]?.message ?? 'Choose what to share.');
  const opts = Options.safeParse(raw);
  if (!opts.success) throw new HttpError(422, 'VALIDATION', opts.error.issues[0]?.message ?? 'Choose how long to share.');
  const { db, now } = c.get('services');
  const userId = c.get('userId');
  await rateLimit(db, `share:user:${userId}`, 30, 3600, now());

  const recordIds = scope.data.scope === 'records' ? [...new Set(scope.data.recordIds)] : [];
  if (recordIds.length) {
    const [{ n } = { n: 0 }] = await db.query<{ n: number }>(asUser(userId), 'SELECT count(*)::int AS n FROM records WHERE user_id = $1 AND id = ANY($2::uuid[])', [userId, recordIds]);
    if (n !== recordIds.length) throw new HttpError(422, 'RECORDS_MISSING', 'Some selected records were deleted. Choose again.');
  }
  const [share] = await db.query<ShareRow>(
    asUser(userId),
    `INSERT INTO shares (user_id, label, scope, categories, record_ids, expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      userId,
      opts.data.label || null,
      scope.data.scope,
      scope.data.scope === 'categories' ? [...new Set(scope.data.categories)] : [],
      recordIds,
      new Date(now().getTime() + opts.data.minutes * 60_000).toISOString(),
    ],
  );
  await logActivity(db, { userId, kind: 'share_created', title: 'Share link created', detail: scopeLabel(share!, CATEGORY_NAMES), meta: { shareId: share!.id } });
  return c.json({ share: await present(c, share!) }, 201);
});

shares.get('/', async (c) => {
  const { db } = c.get('services');
  const rows = await db.query<ShareRow>(asUser(c.get('userId')), 'SELECT * FROM shares WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [c.get('userId')]);
  const all = await Promise.all(rows.map((r) => present(c, r)));
  return c.json({ active: all.filter((s) => s.state === 'active'), history: all.filter((s) => s.state !== 'active') });
});

shares.delete('/:id', async (c) => {
  const id = c.req.param('id');
  if (!z.string().uuid().safeParse(id).success) throw new HttpError(404, 'NOT_FOUND', 'That share no longer exists.');
  const { db } = c.get('services');
  const userId = c.get('userId');
  const [row] = await db.query<ShareRow>(asUser(userId), 'UPDATE shares SET revoked_at = coalesce(revoked_at, now()) WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId]);
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'That share no longer exists.');
  await logActivity(db, { userId, kind: 'share_revoked', title: 'Share link turned off', meta: { shareId: id } });
  return c.json({ share: await present(c, row) });
});

/** One tap to close every open link. */
shares.post('/revoke-all', async (c) => {
  const { db } = c.get('services');
  const userId = c.get('userId');
  const rows = await db.query(asUser(userId), 'UPDATE shares SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now() RETURNING id', [userId]);
  if (rows.length) await logActivity(db, { userId, kind: 'share_revoked', title: 'All share links turned off', meta: { count: rows.length } });
  return c.json({ revoked: rows.length });
});
