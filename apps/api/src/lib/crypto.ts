const enc = new TextEncoder();

export function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64url(value: string): Uint8Array<ArrayBuffer> {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(n));
}

export function randomToken(n = 32): string {
  return b64url(randomBytes(n));
}

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256(value: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(value)));
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

export async function hmac(secret: string, value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(value)));
}

export function safeEqual(a: string | Uint8Array, b: string | Uint8Array): boolean {
  const x = typeof a === 'string' ? enc.encode(a) : a;
  const y = typeof b === 'string' ? enc.encode(b) : b;
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i]! ^ y[i]!;
  return diff === 0;
}

// Workers cap PBKDF2 at 100k iterations; the cost is stored per hash so it can be raised later.
const PBKDF2_ITERATIONS = 100_000;

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${b64url(salt)}$${b64url(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iter, salt, hash] = stored.split('$');
  if (scheme !== 'pbkdf2-sha256' || !iter || !salt || !hash) return false;
  const actual = await pbkdf2(password, fromB64url(salt), Number(iter));
  return safeEqual(actual, fromB64url(hash));
}

/** Uniform 6-digit code (rejection sampling avoids modulo bias). */
export function otpCode(): string {
  const limit = Math.floor(0xffffffff / 1_000_000) * 1_000_000;
  for (;;) {
    const [n] = crypto.getRandomValues(new Uint32Array(1));
    if (n! < limit) return String(n! % 1_000_000).padStart(6, '0');
  }
}

export async function signJwt(payload: Record<string, unknown>, secret: string, ttlSeconds: number, now: Date) {
  const iat = Math.floor(now.getTime() / 1000);
  const header = b64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64url(enc.encode(JSON.stringify({ ...payload, iat, exp: iat + ttlSeconds })));
  const sig = b64url(await hmac(secret, `${header}.${body}`));
  return `${header}.${body}.${sig}`;
}

export async function verifyJwt<T extends Record<string, unknown>>(token: string, secret: string, now: Date): Promise<T | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts as [string, string, string];
  try {
    const head = JSON.parse(new TextDecoder().decode(fromB64url(header)));
    if (head.alg !== 'HS256') return null;
    const expected = await hmac(secret, `${header}.${body}`);
    if (!safeEqual(expected, fromB64url(sig))) return null;
    const claims = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    if (typeof claims.exp !== 'number' || claims.exp * 1000 <= now.getTime()) return null;
    return claims as T;
  } catch {
    return null;
  }
}
