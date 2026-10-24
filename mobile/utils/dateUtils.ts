/**
 * Calculates patient age from a date of birth string.
 * Returns null if string is empty/invalid or results in negative age.
 */
export function calculateAge(dobStr?: string | null): number | null {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

/**
 * Formats a date string into a long date (e.g. "August 31, 2026").
 * Supports explicit timezone (defaults to UTC for clinical dates).
 */
export function formatDateLong(
  dateStr?: string | null,
  fallback = 'Not specified',
  timeZone: string | undefined = 'UTC'
): string {
  if (!dateStr) return fallback;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    ...(timeZone ? { timeZone } : {}),
  });
}

/**
 * Formats a date string into a short date (e.g. "Aug 31, 2026" or "Aug 31").
 */
export function formatDateShort(
  dateStr?: string | null,
  fallback = 'Not set',
  includeYear = true,
  timeZone: string | undefined = undefined
): string {
  if (!dateStr) return fallback;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' } : {}),
    ...(timeZone ? { timeZone } : {}),
  });
}

/**
 * Formats a date string into a coarse time ago string (e.g. "Today", "2 days ago", "1 month ago").
 */
export function formatTimeAgo(dateStr?: string | null): string {
  if (!dateStr) return 'Recently';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 24) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return '1 month ago';
  if (diffMonths < 12) return `${diffMonths} months ago`;
  return `${Math.floor(diffMonths / 12)} years ago`;
}
/** Local calendar date, without shifting the patient's day through UTC. */
export function todayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function isValidRecordDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
