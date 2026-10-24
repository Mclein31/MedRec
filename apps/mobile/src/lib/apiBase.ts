/**
 * Resolves the API origin. An explicit EXPO_PUBLIC_API_URL wins; otherwise
 * development follows the host Metro is served from (so a changed Wi-Fi
 * address never strands sign-in), using the Worker's dev port 8787.
 */
export function resolveApiBase(opts: { explicit?: string; hostUri?: string | null; webHost?: string | null; platform: string }): string {
  const explicit = opts.explicit?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  if (opts.platform === 'web' && opts.webHost) return `http://${opts.webHost}:8787`;
  const host = opts.hostUri?.split(':')[0];
  if (host) return `http://${opts.platform === 'android' && (host === 'localhost' || host === '127.0.0.1') ? '10.0.2.2' : host}:8787`;
  return opts.platform === 'android' ? 'http://10.0.2.2:8787' : 'http://localhost:8787';
}
