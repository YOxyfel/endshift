// Checks the signup, count and confirmation functions against a fake mailing tool (no network, no keys).
//   node scripts/test-functions.mjs
import { handleSignup, handleCount, handleConfirmed, cleanSignup } from '../server/core.mjs';
import { handlePush, sendDue, due, vapidHeader, memoryStore, b64u } from '../server/push.mjs';

let calls = [];
let reply = { status: 201, body: {} };
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url, init, body: init.body ? JSON.parse(init.body) : null });
  return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { 'Content-Type': 'application/json' } });
};

const env = { EMAIL_PROVIDER: 'brevo', EMAIL_API_KEY: 'test', LIST_BATCH: '7', BREVO_DOI_TEMPLATE: '3', SITE_URL: 'https://endshift.bg' };
const post = (body, headers = {}) =>
  new Request('https://endshift.bg/api/signup', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://endshift.bg', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });

let failed = 0;
const ok = (name, cond) => {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failed++;
};

// validation
ok('rejects a bad email', cleanSignup({ email: 'nope' }).error === 'email');
ok('rejects an unknown list', cleanSignup({ email: 'a@b.co', list: 'x' }).error === 'list');
ok('rejects a list name from Object.prototype', cleanSignup({ email: 'a@b.co', list: 'constructor' }).error === 'list');
ok('keeps a known job', cleanSignup({ email: 'a@b.co', job: 'ward' }).job === 'ward');
ok('drops an unknown job', cleanSignup({ email: 'a@b.co', job: 'astronaut' }).job === null);
ok('keeps a reminder time and its time zone', (() => { const c = cleanSignup({ email: 'a@b.co', remind: '18:30', tz: 'Europe/Sofia' }); return c.remind === '18:30' && c.tz === 'Europe/Sofia'; })());
ok('drops a reminder time that isn\'t one', cleanSignup({ email: 'a@b.co', remind: '7pm', tz: 'Europe/Sofia' }).remind === null);
ok('drops an unknown reward', cleanSignup({ email: 'a@b.co', reward: 'free-100' }).reward === null);
ok('keeps the game reward', cleanSignup({ email: 'A@B.co ', reward: 'switch-15' }).reward === 'switch-15');
ok('lower-cases and trims the email', cleanSignup({ email: ' A@B.co ' }).email === 'a@b.co');

// signup, Brevo
let r = await handleSignup(post({ email: 'maria@example.com', list: 'batch-001', source: 'game-bed', locale: 'bg', reward: 'switch-15' }), env);
ok('signup answers 200', r.status === 200);
const c = calls.at(-1);
ok('calls Brevo double opt-in', c.url.endsWith('/contacts/doubleOptinConfirmation'));
ok('sends list, template and attributes', c.body.includeListIds[0] === 7 && c.body.templateId === 3 && c.body.attributes.REWARD === 'switch-15' && c.body.attributes.LOCALE === 'bg');
ok('confirm link goes through /api/confirmed with list and language', c.body.redirectionUrl === 'https://endshift.bg/api/confirmed?list=batch-001&locale=bg');
r = await handleSignup(post({ email: 'x@example.com' }, { Origin: 'https://evil.example' }), env);
ok('refuses other origins', r.status === 403);
r = await handleSignup(post({ email: 'x@example.com', company: 'Bot Ltd' }), env);
ok('honeypot: quiet 200, nothing sent', r.status === 200 && calls.length === 1);
r = await handleSignup(post('{nope'), env);
ok('bad JSON → 400', r.status === 400);
r = await handleSignup(post({ email: 'x@example.com' }), {});
ok('no provider set → 503', r.status === 503);
reply = { status: 400, body: { code: 'invalid_parameter', message: 'Contact already exist' } };
r = await handleSignup(post({ email: 'again@example.com' }), env);
ok('already on the list → still fine for the visitor', r.status === 200);
reply = { status: 500, body: {} };
r = await handleSignup(post({ email: 'y@example.com' }), env);
ok('provider down → 502', r.status === 502);

// count
reply = { status: 200, body: { uniqueSubscribers: 42, totalSubscribers: 44 } };
r = await handleCount(new Request('https://endshift.bg/api/count'), env);
const d = await r.json();
ok('count from Brevo', r.status === 200 && d.count === 42 && /max-age=300/.test(r.headers.get('cache-control')));

// confirmation landing: counts the list right then and passes the number on
reply = { status: 200, body: { uniqueSubscribers: 37, totalSubscribers: 38 } };
r = await handleConfirmed(new Request('https://endshift.bg/api/confirmed?list=batch-001&locale=bg'), env);
ok('confirmed: 302 to the Bulgarian home with the founder number', r.status === 302 && r.headers.get('location') === 'https://endshift.bg/bg/?confirmed=1&list=batch-001&n=37');
r = await handleConfirmed(new Request('https://endshift.bg/api/confirmed?list=ritual&locale=en'), env);
ok('confirmed: other lists get no number', r.headers.get('location') === 'https://endshift.bg/?confirmed=1&list=ritual');
r = await handleConfirmed(new Request('https://endshift.bg/api/confirmed?list=%3Cscript%3E&locale=xx'), env);
ok('confirmed: unknown list and language fall back safely', r.headers.get('location') === 'https://endshift.bg/?confirmed=1&list=batch-001&n=37');
reply = { status: 500, body: {} };
r = await handleConfirmed(new Request('https://endshift.bg/api/confirmed'), env);
ok('confirmed: count unavailable → still lands, no number', r.status === 302 && r.headers.get('location') === 'https://endshift.bg/?confirmed=1&list=batch-001');
r = await handleConfirmed(new Request('https://endshift.bg/api/confirmed'), {});
ok('confirmed: no provider configured → still lands', r.status === 302 && /confirmed=1/.test(r.headers.get('location')));

// MailerLite
const ml = { EMAIL_PROVIDER: 'mailerlite', EMAIL_API_KEY: 't', LIST_BATCH: '1234567', SITE_URL: 'https://endshift.bg' };
reply = { status: 201, body: { data: {} } };
r = await handleSignup(post({ email: 'ivo@example.com', source: 'home-batch', locale: 'en' }), ml);
const m = calls.at(-1);
ok('MailerLite: subscriber created as unconfirmed in the group', r.status === 200 && m.url.endsWith('/api/subscribers') && m.body.status === 'unconfirmed' && m.body.groups[0] === '1234567');
reply = { status: 200, body: { data: { active_count: 17 } } };
r = await handleCount(new Request('https://endshift.bg/api/count'), ml);
ok('MailerLite: count', (await r.json()).count === 17);

// phone reminders (Web Push)
{
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pub = b64u.enc(await crypto.subtle.exportKey('raw', pair.publicKey));
  const d = (await crypto.subtle.exportKey('jwk', pair.privateKey)).d;
  const penv = { VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: d, VAPID_SUBJECT: 'mailto:test@endshift.bg', SITE_URL: 'https://endshift.bg', CRON_SECRET: 's' };
  const h = await vapidHeader('https://fcm.googleapis.com/fcm/send/abc', penv);
  const [, jwt] = h.match(/^vapid t=([^,]+), k=/);
  const [hd, bd, sg] = jwt.split('.');
  const verified = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pair.publicKey, b64u.dec(sg), new TextEncoder().encode(`${hd}.${bd}`));
  const claims = JSON.parse(new TextDecoder().decode(b64u.dec(bd)));
  ok('push: VAPID header is a valid ES256 JWT for the push service', verified && claims.aud === 'https://fcm.googleapis.com' && h.endsWith(`k=${pub}`));

  // 13 Oct 2026 is a Tuesday; Sofia is UTC+3 in October
  const tue = new Date('2026-10-13T15:05:00Z');
  ok('push: due five minutes after 18:00 in Sofia', due({ time: '18:00', tz: 'Europe/Sofia', days: 'daily', last: null }, tue) === '2026-10-13');
  ok('push: not twice the same day', due({ time: '18:00', tz: 'Europe/Sofia', days: 'daily', last: '2026-10-13' }, tue) === false);
  ok('push: not before the time', due({ time: '18:30', tz: 'Europe/Sofia', days: 'daily', last: null }, tue) === false);
  ok('push: workdays only skips Saturday', due({ time: '18:00', tz: 'Europe/Sofia', days: 'workdays', last: null }, new Date('2026-10-17T15:05:00Z')) === false);

  const store = memoryStore();
  const preq = (body) => new Request('https://endshift.bg/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://endshift.bg' }, body: JSON.stringify(body) });
  const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'x', auth: 'y' } };
  let pr = await handlePush(preq({ action: 'on', subscription, time: '18:00', tz: 'Europe/Sofia', days: 'workdays', locale: 'bg' }), penv, store);
  ok('push: switching on stores one reminder', pr.status === 200 && store._m.size === 1 && [...store._m.values()][0].days === 'workdays');
  pr = await handlePush(preq({ action: 'on', subscription: { endpoint: 'https://evil.example/x' }, time: '18:00' }), penv, store);
  ok('push: refuses anything that isn\'t a push service', pr.status === 400);
  pr = await handlePush(preq({ action: 'on', subscription, time: '25:00' }), penv, store);
  ok('push: refuses a time that isn\'t one', pr.status === 400);
  pr = await handlePush(preq({ action: 'on', subscription, time: '18:00' }), {}, store);
  ok('push: not configured → 503', pr.status === 503);

  calls = [];
  reply = { status: 201, body: {} };
  let r1 = await sendDue(penv, store, tue);
  ok('push: sends what is due, with VAPID and no payload', r1.sent === 1 && calls.length === 1 && /^vapid t=/.test(calls[0].init.headers.Authorization) && !calls[0].init.body);
  r1 = await sendDue(penv, store, new Date('2026-10-13T15:10:00Z'));
  ok('push: then not again that day', r1.sent === 0 && calls.length === 1);
  reply = { status: 410, body: {} };
  r1 = await sendDue(penv, store, new Date('2026-10-14T15:01:00Z'));
  ok('push: a phone that unsubscribed is forgotten', r1.gone === 1 && store._m.size === 0);
  await handlePush(preq({ action: 'on', subscription, time: '18:00', tz: 'Europe/Sofia' }), penv, store);
  pr = await handlePush(preq({ action: 'off', endpoint: subscription.endpoint }), penv, store);
  ok('push: switching off removes it', pr.status === 200 && store._m.size === 0);
}

console.log(failed ? `\n${failed} failed` : '\nAll good.');
process.exit(failed ? 1 : 0);
