// Cloudflare Pages Function → /api/push (see server/push.mjs). Bind a KV namespace as PUSH.
import { handlePush, kvStore } from '../../server/push.mjs';
export const onRequest = (ctx) => handlePush(ctx.request, ctx.env, kvStore(ctx.env.PUSH));
