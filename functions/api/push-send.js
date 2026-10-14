// Cloudflare Pages Function → /api/push-send, for a scheduler to call every 10 minutes
// with the header X-Cron-Key: <CRON_SECRET> (Pages has no schedule of its own; see docs/REMINDERS.md).
import { handlePushSend, kvStore } from '../../server/push.mjs';
export const onRequest = (ctx) => handlePushSend(ctx.request, ctx.env, kvStore(ctx.env.PUSH));
