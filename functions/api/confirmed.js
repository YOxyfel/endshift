// Cloudflare Pages Function → /api/confirmed (see server/core.mjs)
import { handleConfirmed } from '../../server/core.mjs';
export const onRequest = (ctx) => handleConfirmed(ctx.request, ctx.env);
