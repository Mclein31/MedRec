import { cleanup, createApp, defaultServices } from './app';
import type { Bindings } from './lib/types';

const app = createApp();

export default {
  fetch: app.fetch,
  async scheduled(_controller: ScheduledController, env: Bindings, ctx: ExecutionContext) {
    if (!env.DATABASE_URL) return console.warn('[cleanup] skipped: DATABASE_URL secret not set yet');
    ctx.waitUntil(cleanup(env, defaultServices(env)).then((r) => console.log(`[cleanup] ${JSON.stringify(r)}`)));
  },
} satisfies ExportedHandler<Bindings>;
