/** Civil dates (YYYY-MM-DD) are formatted in UTC so they never shift a day. */
export function formatDate(iso: string | null, opts: { year?: boolean } = {}) {
  if (!iso) return 'Undated';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  const sameYear = d.getUTCFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: opts.year || !sameYear ? 'numeric' : undefined, timeZone: 'UTC' });
}

export function timeAgo(isoTimestamp: string, now = Date.now()) {
  const s = Math.round((now - new Date(isoTimestamp).getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return new Date(isoTimestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function timeLeft(isoTimestamp: string, now = Date.now()) {
  const s = Math.max(0, Math.round((new Date(isoTimestamp).getTime() - now) / 1000));
  if (s <= 0) return 'Expired';
  if (s < 3600) {
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')} left`;
  }
  if (s < 48 * 3600) return `${Math.round(s / 3600)} h left`;
  return `${Math.round(s / 86400)} days left`;
}

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Accepts YYYY-MM-DD only when it is a real calendar date. */
export function isCivilDate(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
