// Netlify Function → /api/push (see server/push.mjs). Subscriptions live in Netlify Blobs.
import { getStore } from '@netlify/blobs';
import { handlePush, blobsStore } from '../../server/push.mjs';
export default (req) => handlePush(req, process.env, blobsStore(getStore('push')));
export const config = { path: '/api/push' };
