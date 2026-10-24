import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { resolveApiBase } from './apiBase';
import { KEYS, secure } from './storage';

export const API_BASE = resolveApiBase({
  explicit: process.env.EXPO_PUBLIC_API_URL,
  hostUri: Constants.expoConfig?.hostUri ?? null,
  webHost: Platform.OS === 'web' ? globalThis.location?.hostname ?? null : null,
  platform: Platform.OS,
});

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
  }
  get field() {
    return typeof this.details.field === 'string' ? this.details.field : undefined;
  }
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

let session: Session | null = null;
let generation = 0;
let refreshing: Promise<boolean> | null = null;
const expiredListeners = new Set<() => void>();

export const onSessionExpired = (fn: () => void) => {
  expiredListeners.add(fn);
  return () => void expiredListeners.delete(fn);
};

export async function setSession(next: Session | null) {
  session = next;
  generation++;
  if (next) await secure.set(KEYS.session, JSON.stringify(next));
  else await secure.remove(KEYS.session);
}

export async function restoreSession() {
  const raw = await secure.get(KEYS.session);
  session = raw ? (JSON.parse(raw) as Session) : null;
  return session;
}

export const hasSession = () => !!session;

async function raw(path: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 20_000);
  try {
    return await fetch(API_BASE + path, { ...init, signal: controller.signal });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw new ApiError(0, 'TIMEOUT', 'MedRec took too long to respond. Check your connection and try again.');
    throw new ApiError(0, 'NETWORK', "Can't reach MedRec. Check your internet connection and try again.");
  } finally {
    clearTimeout(timer);
  }
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON error page
  }
  if (!res.ok) {
    const e = data?.error ?? {};
    const { code, message, ...details } = e;
    throw new ApiError(res.status, code ?? 'HTTP_' + res.status, message ?? 'Something went wrong. Try again in a moment.', details);
  }
  return data as T;
}

/** One refresh at a time; concurrent 401s wait for the same rotation. */
async function refresh(): Promise<boolean> {
  if (!session) return false;
  refreshing ??= (async () => {
    const startedWith = generation;
    try {
      const res = await raw('/api/auth/refresh', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken: session!.refreshToken }),
      });
      const data = await parse<{ session: Session }>(res);
      if (generation === startedWith) await setSession(data.session);
      return true;
    } catch (err) {
      // Only a definite rejection ends the session; offline keeps it for later.
      if (err instanceof ApiError && err.status === 401 && generation === startedWith) {
        await setSession(null);
        expiredListeners.forEach((fn) => fn());
      }
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function request<T>(path: string, init: { method?: string; json?: unknown; body?: BodyInit; headers?: Record<string, string>; timeoutMs?: number; auth?: boolean } = {}): Promise<T> {
  const send = () => {
    const headers: Record<string, string> = { ...init.headers };
    if (init.json !== undefined) headers['content-type'] = 'application/json';
    if (init.auth !== false && session) headers.authorization = `Bearer ${session.accessToken}`;
    return raw(path, { method: init.method ?? 'GET', headers, body: init.json !== undefined ? JSON.stringify(init.json) : init.body, timeoutMs: init.timeoutMs });
  };
  let res = await send();
  if (res.status === 401 && init.auth !== false && session) {
    const body = await res.clone().json().catch(() => null);
    if (body?.error?.code === 'SESSION_EXPIRED' && (await refresh())) res = await send();
  }
  return parse<T>(res);
}
