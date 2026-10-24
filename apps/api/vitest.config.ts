import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic', importSource: 'hono/jsx' } },
  resolve: { alias: { 'cloudflare:sockets': fileURLToPath(new URL('./test/socketsStub.ts', import.meta.url)) } },
  test: { globalSetup: ['./test/globalSetup.ts'], fileParallelism: false, testTimeout: 20_000, hookTimeout: 60_000 },
});
