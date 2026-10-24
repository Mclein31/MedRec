import { ApiError } from './http';

/** The server already writes actionable messages; this only covers non-API failures. */
export function messageFor(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Something went wrong. Try again in a moment.';
}

export const fieldError = (err: unknown, field: string) => (err instanceof ApiError && err.field === field ? err.message : null);
