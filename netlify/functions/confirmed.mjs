// Netlify Function → /api/confirmed (see server/core.mjs)
import { handleConfirmed } from '../../server/core.mjs';
export default (req) => handleConfirmed(req, process.env);
export const config = { path: '/api/confirmed' };
