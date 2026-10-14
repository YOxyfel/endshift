// Netlify Function → /api/count (see server/core.mjs)
import { handleCount } from '../../server/core.mjs';
export default (req) => handleCount(req, process.env);
export const config = { path: '/api/count' };
