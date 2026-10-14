// Cloudflare Pages Function → /api/count (see server/core.mjs)
import { handleCount } from '../../server/core.mjs';
export const onRequest = (ctx) => handleCount(ctx.request, ctx.env);
