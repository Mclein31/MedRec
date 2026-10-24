type ApiEnvironment = {
  configuredUrl?: string;
  development: boolean;
  platform: string;
  metroHost?: string;
  webHostname?: string;
};

/** Explicit deployment URLs win; local development follows Metro's current host. */
export function resolveApiBaseUrl({ configuredUrl, development, platform, metroHost, webHostname }: ApiEnvironment): string {
  const configured = configuredUrl?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  if (development) {
    if (platform === 'web' && webHostname) return `http://${webHostname}:4000/api`;
    if (metroHost) {
      // Metro supplies host:port. Parse its authority directly because React
      // Native's URL.hostname shim does not correctly support bracketed IPv6.
      const hostname = metroHost.trim().match(/^(\[[0-9a-z:.%_-]+\]|[a-z0-9.-]+)(?::\d+)?$/i)?.[1];
      if (hostname) {
        const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
        const host = platform === 'android' && loopback ? '10.0.2.2' : hostname;
        return `http://${host}:4000/api`;
      }
    }
  }
  return platform === 'android' ? 'http://10.0.2.2:4000/api' : 'http://localhost:4000/api';
}
