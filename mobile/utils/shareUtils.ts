export type ShareScope = { record_ids?: string[] | null; allowed_types?: string[] | null };

export function shareScopeLabel(share?: ShareScope | null, pendingCount?: number | null): string {
  const count = share?.record_ids?.length || pendingCount;
  if (count) return `${count} selected record${count === 1 ? '' : 's'}`;
  if (share?.allowed_types?.length) return `${share.allowed_types.length} record categor${share.allowed_types.length === 1 ? 'y' : 'ies'}`;
  return 'All records';
}

export function isShareActive(share: { expires_at: string; revoked_at?: string | null }, now = Date.now()): boolean {
  return !share.revoked_at && new Date(share.expires_at).getTime() > now;
}
