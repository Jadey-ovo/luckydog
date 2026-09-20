import worker, { prune } from './index.mjs';

// Sites owns resource wiring; its manifest does not configure Wrangler Cron Triggers.
// Expired records are inaccessible immediately (enforced by the shared API).
// Prune on subsequent API traffic, at most hourly per warm isolate, without a timer.
let nextCleanup = 0;
let cleanup;
export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname.startsWith('/api/') && Date.now() >= nextCleanup) {
      if (!cleanup) cleanup = prune(env.DB).then(() => { nextCleanup = Date.now() + 3600000; })
        .catch(() => { console.error('Luckydog expired-record cleanup failed; will retry on the next request'); })
        .finally(() => { cleanup = undefined; });
      ctx.waitUntil(cleanup);
    }
    return worker.fetch(request, env, ctx);
  },
  scheduled: worker.scheduled,
};
