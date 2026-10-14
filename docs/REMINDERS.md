# Reminders: one nudge a day, at your own time

The ritual is a habit, so the end screen offers three ways to be reminded. All of them are opt-in, one message, and never a streak.

1. **Add to calendar** (works now, everywhere). A repeating calendar event, made on the device. Nothing is sent anywhere.
2. **Remind me on this phone** (Web Push). One notification a day at the reminder time, workdays only if ticked. It appears once you switch it on below.
3. **One reminder email** (with the mailing tool). A tick box on the ritual's email form: one email the next day at the reminder time.

## Web Push

Works in Chrome, Edge and Firefox on Android and computers, and in Safari on iPhone and iPad **only for the app added to the Home Screen** (iOS 16.4 and later). On an iPhone in the browser, the site explains that instead of showing the button.

### Switch it on (Netlify)

1. `npm run vapid`. It prints four environment variables and one line for `site.config.js`.
2. In Netlify → Site configuration → Environment variables, add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (a `mailto:` address you read) and `CRON_SECRET`.
3. In `src/config/site.config.js`, set `push: { publicKey: '…the public key…', endpoint: '/api/push' }`.
4. Deploy. `@netlify/blobs` (in `package.json`) stores the subscriptions; Netlify installs it during the build. `netlify/functions/push-send.mjs` runs every 10 minutes by itself and sends what's due.

### Switch it on (Cloudflare Pages)

1. Steps 1 and 3 above. Add the same four variables under Settings → Variables and Secrets.
2. Create a KV namespace and bind it to the Pages project as `PUSH`.
3. Pages has no schedule of its own, so something has to call `POST https://<your domain>/api/push-send` every 10 minutes with the header `X-Cron-Key: <CRON_SECRET>`. A tiny Cloudflare Worker with a cron trigger does it, or any free scheduler (cron-job.org, a GitHub Actions schedule).

### How it works

- The page asks for permission only when someone presses the button, subscribes with the public key, and sends the subscription, the time, the time zone and workdays/every day to `/api/push`.
- Every 10 minutes the scheduler sends each reminder that's due in that person's time zone, once a day. Phones that unsubscribed or uninstalled answer 404/410 and are deleted.
- The pushes carry no text (so nothing needs encrypting). The service worker shows the words the page saved in the visitor's language when they switched it on, and a tap opens the ritual.
- "Turn off" unsubscribes the phone and deletes the subscription. Nothing about the person is stored besides the push address, the time, the time zone and the language.

Privacy: list your host (and its storage) in `legal.processors`, and mention the reminder in the privacy policy before switching it on.

## The one reminder email

The ritual's email form ("Get the ritual + launch notice") has a tick box: "And one reminder email tomorrow, at the reminder time above". When it's ticked, the signup carries the time and time zone to the mailing tool:

- Brevo: contact attributes `REMIND_TIME` (e.g. `18:30`) and `TZ` (e.g. `Europe/Sofia`). Create both (text) under Contacts → Settings → Contact attributes.
- MailerLite: fields `remind_time` and `tz`.

The email's words are in `docs/EMAILS.md` (email R). In the tool, make an automation on the ritual list for contacts whose `REMIND_TIME` isn't empty: after they confirm, wait until the next day at that time if your tool can schedule from a contact field, or simply wait one day, then send email R once. Never repeat it.
