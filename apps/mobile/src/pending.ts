import type { Challenge } from './lib/api';

/** Hands the current code challenge to the code screen without putting it in the URL. */
let pending: { challenge: Challenge; email: string } | null = null;
export const setPending = (p: typeof pending) => void (pending = p);
export const getPending = () => pending;
