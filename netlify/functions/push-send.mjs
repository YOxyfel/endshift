// Netlify Scheduled Function: every 10 minutes, send the reminders that are due (server/push.mjs).
import { getStore } from '@netlify/blobs';
import { sendDue, blobsStore } from '../../server/push.mjs';
export default async () => {
  const r = await sendDue(process.env, blobsStore(getStore('push')));
  return new Response(JSON.stringify(r), { headers: { 'Content-Type': 'application/json' } });
};
export const config = { schedule: '*/10 * * * *' };
