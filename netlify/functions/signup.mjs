// Netlify Function → /api/signup (see server/core.mjs)
import { handleSignup } from '../../server/core.mjs';
export default (req) => handleSignup(req, process.env);
export const config = { path: '/api/signup' };
