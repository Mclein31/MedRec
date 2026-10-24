import { RECORD_COLUMNS, type RecordRow } from './records';
import { shareIdFromToken } from './security';
import { SYSTEM, asUser, type Bindings, type Db } from './types';

export interface ShareRow {
  id: string;
  user_id: string;
  label: string | null;
  scope: 'all' | 'categories' | 'records';
  categories: string[];
  record_ids: string[];
  expires_at: string;
  revoked_at: string | null;
  first_view_at: string | null;
  view_count: number;
  created_at: string;
}

export const DURATIONS_MINUTES = [15, 30, 60, 1440, 10080] as const;

export function shareState(s: ShareRow, now: Date): 'active' | 'expired' | 'revoked' {
  if (s.revoked_at) return 'revoked';
  return new Date(s.expires_at) > now ? 'active' : 'expired';
}

/** Resolves a public token to an open share, or null for anything invalid, expired or revoked. */
export async function openShare(db: Db, env: Bindings, token: string, now: Date) {
  const id = await shareIdFromToken(token, env.FILE_SIGNING_SECRET);
  if (!id) return null;
  const [share] = await db.query<ShareRow>(SYSTEM, 'SELECT * FROM shares WHERE id = $1', [id]);
  if (!share || shareState(share, now) !== 'active') return null;
  return share;
}

/** The records a share grants, newest first. The whole authorised scope, never a truncated page. */
export async function sharedRecords(db: Db, share: ShareRow) {
  const params: unknown[] = [share.user_id];
  let filter = '';
  if (share.scope === 'categories') filter = `AND r.category = ANY($${params.push(share.categories)}::text[])`;
  if (share.scope === 'records') filter = `AND r.id = ANY($${params.push(share.record_ids)}::uuid[])`;
  return db.query<RecordRow>(
    asUser(share.user_id),
    `SELECT ${RECORD_COLUMNS} FROM records r WHERE r.user_id = $1 ${filter}
      ORDER BY coalesce(r.event_date, r.created_at::date) DESC, r.created_at DESC, r.id DESC`,
    params,
  );
}

export function scopeLabel(share: Pick<ShareRow, 'scope' | 'categories' | 'record_ids'>, categoryNames: Record<string, string>) {
  if (share.scope === 'all') return 'Entire health vault';
  if (share.scope === 'records') return `${share.record_ids.length} selected ${share.record_ids.length === 1 ? 'record' : 'records'}`;
  return share.categories.map((k) => categoryNames[k] ?? k).join(', ');
}

export const CATEGORY_NAMES: Record<string, string> = {
  consultation: 'Consultations',
  lab: 'Lab results',
  prescription: 'Prescriptions',
  imaging: 'Imaging',
  vaccination: 'Vaccinations',
  hospitalization: 'Hospital stays',
  dental_vision: 'Dental & vision',
  other: 'Other',
};
