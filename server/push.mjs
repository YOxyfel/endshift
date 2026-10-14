/* ENDSHIFT: the reminder on your phone (Web Push).
 *
 * One notification a day at the time you chose, from the installed app or the browser.
 * Never more, no streaks, off with one tap.
 *
 *   POST /api/push       {action: 'on', subscription, time: '18:00', tz: 'Europe/Sofia', days: 'daily'|'workdays', locale}
 *                        {action: 'off', endpoint}
 *   POST /api/push-send  sends what's due now. Header `X-Cron-Key: <CRON_SECRET>`.
 *                        Netlify runs it every 10 minutes by itself (netlify/functions/push-send.mjs);
 *                        anywhere else, call it from any scheduler (see docs/REMINDERS.md).
 *
 * The pushes carry no payload, so there's nothing to encrypt: the service worker shows the words
 * the page saved when you switched the reminder on (in your language).
 *
 * Settings (environment variables):
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY   from `node scripts/vapid.mjs`
 *   VAPID_SUBJECT                         mailto:you@yourdomain (push services contact you here if something's wrong)
 *   CRON_SECRET                           any long random string, for /api/push-send
 *   SITE_URL                              allowed origin
 * Storage: Netlify Blobs (store "push"), or a Cloudflare KV namespace bound as PUSH.
 */

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const TZ = /^[A-Za-z]+(?:\/[A-Za-z0-9_+-]+){0,2}$/;
// only real push services (so this can't be used to make the server call anything else)
const PUSH_HOSTS = /^https:\/\/(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)\//;

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

/* base64url, without Buffer (runs on Node and on Workers) */
export const b64u = {
  enc(bytes) {
    const b = new Uint8Array(bytes);
    let s = '';
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  dec(str) {
    const s = String(str).replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(s + '==='.slice((s.length + 3) % 4));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  },
};
const utf8 = (s) => new TextEncoder().encode(s);

async function sha256(s) {
  return b64u.enc(await crypto.subtle.digest('SHA-256', utf8(s)));
}

/** The VAPID Authorization header for one push service (a JWT signed with ES256). */
export async function vapidHeader(endpoint, env, now = Date.now()) {
  const pub = b64u.dec(env.VAPID_PUBLIC_KEY);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error('VAPID_PUBLIC_KEY must be an uncompressed P-256 point (65 bytes, base64url)');
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x: b64u.enc(pub.slice(1, 33)), y: b64u.enc(pub.slice(33, 65)), d: env.VAPID_PRIVATE_KEY, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const head = b64u.enc(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u.enc(utf8(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'mailto:hello@example.com' })));
  // Web Crypto gives ECDSA signatures as raw r‖s, which is what a JWT wants
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, utf8(`${head}.${body}`));
  return `vapid t=${head}.${body}.${b64u.enc(sig)}, k=${env.VAPID_PUBLIC_KEY}`;
}

/** The time where the person is: date, minutes past midnight, weekday. */
export function localNow(tz, now) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: +p.hour * 60 + +p.minute, weekday: p.weekday };
}

/** Is this reminder due now? Once a day, inside the window after its time, workdays if asked. */
export function due(rec, now, windowMin = 15) {
  let L;
  try {
    L = localNow(rec.tz, now);
  } catch {
    L = localNow('Europe/Sofia', now);
  }
  if (rec.last === L.date) return false;
  if (rec.days === 'workdays' && (L.weekday === 'Sat' || L.weekday === 'Sun')) return false;
  const [h, m] = rec.time.split(':').map(Number);
  const d = L.minutes - (h * 60 + m);
  return d >= 0 && d < windowMin ? L.date : false;
}

/* Storage: the same four calls over Netlify Blobs or Cloudflare KV ------------------------- */
export function blobsStore(store) {
  return {
    get: (k) => store.get(k, { type: 'json' }),
    set: (k, v) => store.setJSON(k, v),
    del: (k) => store.delete(k),
    async list() {
      const { blobs } = await store.list({ prefix: 'sub:' });
      const out = [];
      for (const b of blobs) {
        const v = await store.get(b.key, { type: 'json' });
        if (v) out.push([b.key, v]);
      }
      return out;
    },
  };
}
export function kvStore(kv) {
  if (!kv) return null;
  return {
    get: async (k) => JSON.parse((await kv.get(k)) || 'null'),
    set: (k, v) => kv.put(k, JSON.stringify(v)),
    del: (k) => kv.delete(k),
    async list() {
      const out = [];
      let cursor;
      do {
        const r = await kv.list({ prefix: 'sub:', cursor });
        for (const k of r.keys) {
          const v = await kv.get(k.name);
          if (v) out.push([k.name, JSON.parse(v)]);
        }
        cursor = r.list_complete ? null : r.cursor;
      } while (cursor);
      return out;
    },
  };
}
export function memoryStore() {
  const m = new Map();
  return { get: async (k) => m.get(k) ?? null, set: async (k, v) => void m.set(k, v), del: async (k) => void m.delete(k), list: async () => [...m.entries()], _m: m };
}

function allowedOrigin(req, env) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const site = (env.SITE_URL || '').replace(/\/$/, '');
  if (!site) return true;
  try {
    const o = new URL(origin), s = new URL(site);
    return o.host === s.host || o.host === `www.${s.host}` || `www.${o.host}` === s.host || /\.pages\.dev$|\.netlify\.app$/.test(o.host);
  } catch {
    return false;
  }
}

/** POST /api/push: switch the reminder on or off. */
export async function handlePush(req, env, store) {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method' });
  if (!allowedOrigin(req, env)) return json(403, { ok: false, error: 'origin' });
  if (!store || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return json(503, { ok: false, error: 'not_configured' });
  const raw = await req.text();
  if (raw.length > 4000) return json(413, { ok: false, error: 'size' });
  let b;
  try {
    b = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, error: 'json' });
  }
  if (b.action === 'off') {
    if (typeof b.endpoint !== 'string' || !PUSH_HOSTS.test(b.endpoint)) return json(400, { ok: false, error: 'endpoint' });
    await store.del(`sub:${await sha256(b.endpoint)}`);
    return json(200, { ok: true });
  }
  const sub = b.subscription || {};
  if (typeof sub.endpoint !== 'string' || sub.endpoint.length > 1000 || !PUSH_HOSTS.test(sub.endpoint)) return json(400, { ok: false, error: 'endpoint' });
  if (!TIME.test(b.time || '')) return json(400, { ok: false, error: 'time' });
  const tz = typeof b.tz === 'string' && b.tz.length < 48 && TZ.test(b.tz) ? b.tz : 'Europe/Sofia';
  try {
    localNow(tz, new Date());
  } catch {
    return json(400, { ok: false, error: 'tz' });
  }
  const rec = { endpoint: sub.endpoint, time: b.time, tz, days: b.days === 'workdays' ? 'workdays' : 'daily', locale: b.locale === 'bg' ? 'bg' : 'en', since: new Date().toISOString(), last: null };
  await store.set(`sub:${await sha256(sub.endpoint)}`, rec);
  return json(200, { ok: true });
}

/** Sends every reminder that's due now. Returns how many went out and how many were dropped. */
export async function sendDue(env, store, now = new Date()) {
  if (!store || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return { sent: 0, gone: 0, error: 'not_configured' };
  let sent = 0, gone = 0;
  for (const [key, rec] of await store.list()) {
    const day = due(rec, now);
    if (!day) continue;
    try {
      const res = await fetch(rec.endpoint, {
        method: 'POST',
        headers: { TTL: '3600', Urgency: 'normal', Authorization: await vapidHeader(rec.endpoint, env, now.getTime()), 'Content-Length': '0' },
      });
      if (res.status === 404 || res.status === 410) {
        // the phone unsubscribed or the app was removed: forget it
        await store.del(key);
        gone++;
      } else if (res.ok) {
        await store.set(key, { ...rec, last: day });
        sent++;
      }
    } catch {
      // try again at the next run inside the window
    }
  }
  return { sent, gone };
}

/** POST /api/push-send (for a scheduler): needs the CRON_SECRET. */
export async function handlePushSend(req, env, store) {
  if (!env.CRON_SECRET || req.headers.get('x-cron-key') !== env.CRON_SECRET) return json(403, { ok: false });
  return json(200, { ok: true, ...(await sendDue(env, store)) });
}
