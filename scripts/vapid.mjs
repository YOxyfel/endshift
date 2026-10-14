#!/usr/bin/env node
/**
 * node scripts/vapid.mjs: make the key pair for the phone reminders (Web Push, VAPID).
 * Put the two keys in your host's environment variables, and the public one in
 * site.config.js → push.publicKey. Keep the private key out of git.
 */
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const pub = await crypto.subtle.exportKey('raw', pair.publicKey);
const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
console.log(`
Environment variables (host dashboard):
  VAPID_PUBLIC_KEY=${b64u(pub)}
  VAPID_PRIVATE_KEY=${jwk.d}
  VAPID_SUBJECT=mailto:hello@yourdomain
  CRON_SECRET=${b64u(crypto.getRandomValues(new Uint8Array(24)))}

site.config.js:
  push: { publicKey: '${b64u(pub)}' },
`);
