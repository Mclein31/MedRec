import { signFilePath } from './security';
import { asUser, type Bindings, type Db } from './types';

export interface RecordRow {
  id: string;
  title: string;
  category: string;
  event_date: string | null;
  provider: string | null;
  facility: string | null;
  notes: string | null;
  ai: unknown;
  created_at: string;
  updated_at: string;
  sort_date: string;
  /** created_at as exact text; Date objects drop the microseconds Postgres keeps. */
  created_key: string;
  file_count: number;
  /** Family member the record belongs to; null for the account holder (DD-55). */
  person_id: string | null;
}

export interface FileRow {
  id: string;
  record_id: string | null;
  object_key: string;
  content_type: string;
  size_bytes: number;
  position: number;
}

export const RECORD_COLUMNS = `r.id, r.title, r.category, to_char(r.event_date, 'YYYY-MM-DD') AS event_date, r.provider, r.facility,
  r.notes, r.ai, r.created_at, r.updated_at, to_char(coalesce(r.event_date, r.created_at::date), 'YYYY-MM-DD') AS sort_date,
  r.created_at::text AS created_key, r.person_id,
  (SELECT count(*)::int FROM record_files f WHERE f.record_id = r.id) AS file_count`;

export function mapRecord(r: RecordRow) {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    eventDate: r.event_date,
    provider: r.provider,
    facility: r.facility,
    notes: r.notes,
    ai: r.ai ?? null,
    fileCount: r.file_count,
    personId: r.person_id ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * Signed, short-lived URLs for a record's pages. URLs are never stored or exported.
 * Pass `shareId` for links shown on a share page; they stop working when that share does.
 */
export async function signedFiles(env: Bindings, files: FileRow[], now: Date, ttlSeconds = 900, shareId?: string) {
  return Promise.all(
    files.map(async (f) => ({
      id: f.id,
      contentType: f.content_type,
      size: f.size_bytes,
      position: f.position,
      url: env.PUBLIC_URL + (await signFilePath(f.object_key, env.FILE_SIGNING_SECRET, ttlSeconds, now, shareId)),
    })),
  );
}

export async function filesFor(db: Db, userId: string, recordIds: string[]) {
  if (!recordIds.length) return new Map<string, FileRow[]>();
  const rows = await db.query<FileRow>(
    asUser(userId),
    `SELECT id, record_id, object_key, content_type, size_bytes, position FROM record_files
      WHERE user_id = $1 AND record_id = ANY($2::uuid[]) ORDER BY position, created_at`,
    [userId, recordIds],
  );
  const map = new Map<string, FileRow[]>();
  for (const f of rows) map.set(f.record_id!, [...(map.get(f.record_id!) ?? []), f]);
  return map;
}

// Keyset cursor: stable ordering even when records are added between pages.
export function encodeCursor(r: RecordRow) {
  return btoa(JSON.stringify([r.sort_date, r.created_key, r.id])).replace(/=+$/, '');
}

const CURSOR_DATE = /^\d{4}-\d{2}-\d{2}$/;
// Postgres timestamptz text, e.g. "2026-11-16 00:41:38.146492+08".
const CURSOR_TIMESTAMP = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d{1,6})?([+-]\d{2}(:?\d{2})?|Z)?$/;
const CURSOR_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Every part is checked so a tampered cursor is a 400, never a database error. */
export function decodeCursor(cursor: string): [string, string, string] | null {
  try {
    const v: unknown = JSON.parse(atob(cursor));
    if (!Array.isArray(v) || v.length !== 3) return null;
    const [date, created, id] = v as unknown[];
    if (typeof date === 'string' && typeof created === 'string' && typeof id === 'string' && CURSOR_DATE.test(date) && CURSOR_TIMESTAMP.test(created) && CURSOR_ID.test(id)) {
      return [date, created, id];
    }
  } catch {
    // fall through
  }
  return null;
}
