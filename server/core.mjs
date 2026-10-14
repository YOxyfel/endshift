/* ENDSHIFT: the two small server functions behind the site.
 *
 *   POST /api/signup   {email, list, source, locale, reward?, job?}  → adds the person to your mailing
 *                      tool with double opt-in (they get a confirmation email first)
 *   GET  /api/count    → {count, updated}: confirmed people on the founding list, cached 5 minutes
 *   GET  /api/confirmed → where the confirmation email's button lands: counts the founding list
 *                      right then and sends the person on to the site with their founder number
 *
 * The host adapters (functions/api/*.js for Cloudflare Pages, netlify/functions/*.mjs for
 * Netlify) only translate requests; everything happens here. No dependencies, standard fetch.
 *
 * Settings come from environment variables (set them in the host's dashboard, never in git):
 *   EMAIL_PROVIDER      "brevo" | "mailerlite"
 *   EMAIL_API_KEY       the provider's API key
 *   LIST_BATCH          list id (Brevo) or group id (MailerLite) for the founding list "batch-001"
 *   LIST_RITUAL         optional, for "ritual" signups (falls back to LIST_BATCH)
 *   LIST_UPDATES        optional, for "build-updates" (falls back to LIST_BATCH)
 *   BREVO_DOI_TEMPLATE  Brevo only: id of the double opt-in confirmation template
 *   SITE_URL            e.g. https://endshift.bg  (allowed origin, and where the confirm link lands)
 */

const LISTS = { 'batch-001': 'LIST_BATCH', ritual: 'LIST_RITUAL', 'build-updates': 'LIST_UPDATES', contact: null };
const isList = (l) => typeof l === 'string' && Object.prototype.hasOwnProperty.call(LISTS, l) && l !== 'contact';
const REWARDS = new Set(['switch-15']);
const JOBS = new Set(['kitchen', 'shop', 'office', 'ward', 'depot', 'clients', 'bed']);
const LOCALES = new Set(['en', 'bg']);
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const SOURCE = /^[a-z0-9][a-z0-9-]{0,47}$/;

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });

function allowedOrigin(req, env) {
  const origin = req.headers.get('origin');
  if (!origin) return true; // same-origin form posts from some browsers, server-to-server tests
  const site = (env.SITE_URL || '').replace(/\/$/, '');
  if (!site) return true;
  try {
    const o = new URL(origin), s = new URL(site);
    // the site itself, its www twin, and preview deployments on the same host family
    return o.host === s.host || o.host === `www.${s.host}` || `www.${o.host}` === s.host || /\.pages\.dev$|\.netlify\.app$/.test(o.host);
  } catch {
    return false;
  }
}

/** Checks a signup and returns the clean version, or {error}. */
export function cleanSignup(body) {
  if (!body || typeof body !== 'object') return { error: 'bad_request' };
  const email = String(body.email || '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) return { error: 'email' };
  const list = String(body.list || 'batch-001');
  if (!isList(list)) return { error: 'list' };
  const source = String(body.source || 'site').toLowerCase().slice(0, 48);
  const locale = LOCALES.has(body.locale) ? body.locale : 'en';
  const reward = body.reward && REWARDS.has(body.reward) ? body.reward : null;
  const job = body.job && JOBS.has(body.job) ? body.job : null;
  // one reminder email, if asked for: the time and the time zone it means
  const remind = typeof body.remind === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(body.remind) ? body.remind : null;
  const tz = remind && typeof body.tz === 'string' && body.tz.length < 48 && /^[A-Za-z]+(?:\/[A-Za-z0-9_+-]+){0,2}$/.test(body.tz) ? body.tz : null;
  if (body.company) return { error: 'spam' }; // the honeypot field
  return { email, list, source: SOURCE.test(source) ? source : 'site', locale, reward, job, remind, tz };
}

function listId(env, list) {
  const key = LISTS[list];
  return Number(env[key] || env.LIST_BATCH) || env[key] || env.LIST_BATCH;
}

/* Providers -------------------------------------------------------------------------- */

const providers = {
  // Brevo: double opt-in. The contact gets the confirmation email from your DOI template and
  // is added to the list only after clicking it.
  brevo: {
    async subscribe(env, s) {
      const res = await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
        method: 'POST',
        headers: { 'api-key': env.EMAIL_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email: s.email,
          includeListIds: [Number(listId(env, s.list))],
          templateId: Number(env.BREVO_DOI_TEMPLATE),
          // the button in the confirmation email → /api/confirmed → the site, with the founder number
          redirectionUrl: `${(env.SITE_URL || '').replace(/\/$/, '')}/api/confirmed?list=${s.list}&locale=${s.locale}`,
          attributes: { LOCALE: s.locale, SOURCE: s.source, REWARD: s.reward || '', LIST: s.list, JOB: s.job || '', REMIND_TIME: s.remind || '', TZ: s.tz || '' },
        }),
      });
      // 201 created, 204 already pending: both fine for the visitor
      if (res.ok) return { ok: true };
      const err = await res.json().catch(() => ({}));
      if (res.status === 400 && /duplicate|exist/i.test(err.message || '')) return { ok: true };
      return { ok: false, status: res.status, detail: err.code || err.message };
    },
    async count(env) {
      const res = await fetch(`https://api.brevo.com/v3/contacts/lists/${listId(env, 'batch-001')}`, {
        headers: { 'api-key': env.EMAIL_API_KEY, Accept: 'application/json' },
      });
      if (!res.ok) return null;
      const d = await res.json();
      return typeof d.uniqueSubscribers === 'number' ? d.uniqueSubscribers : d.totalSubscribers;
    },
  },

  // MailerLite (the new API). Turn on "Double opt-in for API and integrations" in the
  // account settings; status "unconfirmed" then sends the confirmation email.
  mailerlite: {
    async subscribe(env, s) {
      const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.EMAIL_API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email: s.email,
          groups: [String(listId(env, s.list))],
          status: 'unconfirmed',
          fields: { locale: s.locale, source: s.source, reward: s.reward || '', job: s.job || '', remind_time: s.remind || '', tz: s.tz || '' },
        }),
      });
      if (res.ok) return { ok: true };
      const err = await res.json().catch(() => ({}));
      return { ok: false, status: res.status, detail: err.message };
    },
    async count(env) {
      const res = await fetch(`https://connect.mailerlite.com/api/groups/${listId(env, 'batch-001')}`, {
        headers: { Authorization: `Bearer ${env.EMAIL_API_KEY}`, Accept: 'application/json' },
      });
      if (!res.ok) return null;
      const d = await res.json();
      return d.data && typeof d.data.active_count === 'number' ? d.data.active_count : null;
    },
  },
};

function provider(env) {
  const p = providers[String(env.EMAIL_PROVIDER || '').toLowerCase()];
  return p && env.EMAIL_API_KEY ? p : null;
}

/* Handlers ----------------------------------------------------------------------------- */

export async function handleSignup(req, env) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method' }, { Allow: 'POST' });
  if (!allowedOrigin(req, env)) return json(403, { ok: false, error: 'origin' });
  if (!(req.headers.get('content-type') || '').includes('application/json')) return json(415, { ok: false, error: 'type' });
  const raw = await req.text();
  if (raw.length > 2000) return json(413, { ok: false, error: 'size' });
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, error: 'json' });
  }
  const s = cleanSignup(body);
  if (s.error === 'spam') return json(200, { ok: true }); // say nothing useful to bots
  if (s.error) return json(400, { ok: false, error: s.error });
  const p = provider(env);
  if (!p) return json(503, { ok: false, error: 'not_configured' });
  try {
    const r = await p.subscribe(env, s);
    if (r.ok) return json(200, { ok: true, doubleOptIn: true });
    console.error('signup provider error', r.status, r.detail);
    return json(502, { ok: false, error: 'provider' });
  } catch (e) {
    console.error('signup failed', e && e.message);
    return json(502, { ok: false, error: 'provider' });
  }
}

export async function handleCount(req, env) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(405, { ok: false }, { Allow: 'GET' });
  const p = provider(env);
  if (!p) return json(503, { ok: false, error: 'not_configured' });
  try {
    const count = await p.count(env);
    if (typeof count !== 'number') return json(502, { ok: false, error: 'provider' });
    return json(200, { count, updated: new Date().toISOString() }, { 'Cache-Control': 'public, max-age=300, s-maxage=300' });
  } catch {
    return json(502, { ok: false, error: 'provider' });
  }
}

/**
 * GET /api/confirmed?list=batch-001&locale=bg: the confirmation email's button lands here (Brevo
 * sets it per contact; for MailerLite, set it as the confirmation redirect in the dashboard).
 * The founding list is counted right then, so the person who just confirmed is the last one in,
 * and they're sent on to the site: /bg/?confirmed=1&list=batch-001&n=37. The site shows their
 * founder card. If the count can't be read, they still land on the site, just without a number.
 */
export async function handleConfirmed(req, env) {
  const url = new URL(req.url);
  const q = url.searchParams;
  const site = (env.SITE_URL || url.origin).replace(/\/$/, '');
  const locale = LOCALES.has(q.get('locale')) ? q.get('locale') : 'en';
  const list = isList(q.get('list')) ? q.get('list') : 'batch-001';
  const to = new URL(`${site}/${locale === 'bg' ? 'bg/' : ''}`);
  to.searchParams.set('confirmed', '1');
  to.searchParams.set('list', list);
  const p = provider(env);
  if (list === 'batch-001' && p) {
    try {
      const n = await p.count(env);
      if (typeof n === 'number' && n > 0) to.searchParams.set('n', String(n));
    } catch {
      // no number this time; the visitor still gets to the site
    }
  }
  return new Response(null, { status: 302, headers: { Location: to.href, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
