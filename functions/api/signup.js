// Cloudflare Pages Function → /api/signup (see server/core.mjs)
import { handleSignup } from '../../server/core.mjs';
export const onRequest = (ctx) => handleSignup(ctx.request, ctx.env);
