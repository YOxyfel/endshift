# Launch checklist

`npm run check` covers the config side. This list covers everything else. It's ordered by the product state you're moving into.

This isn't legal advice. Have a Bulgarian lawyer review the legal pages and the preorder model before taking money.

## Go live in one day

Everything below is already built and waiting for accounts. In order, about six hours:

**1. Domain and host (morning)**
- [ ] Buy the domain (a `.bg` registrar, or any other). Put the project in a private GitHub repository.
- [ ] Netlify → Add new site → Import from GitHub. Build command `npm run build`, publish directory `dist` (both are in `netlify.toml`, with the functions). Then Domain management → add your domain and follow the DNS steps. HTTPS turns on by itself.
- [ ] `site.config.js`: `siteUrl` (the real domain) and `contact.email` (an inbox you read).

**2. Mailing tool (midday)** – Brevo is the easier of the two for this setup (`docs/EMAILS.md`).
- [ ] Make the account, and authenticate your domain in it (the DKIM and DMARC records it shows you), or confirmation emails will land in spam.
- [ ] Create the founding list (and, if you want them apart, a ritual list), and the contact attributes `LOCALE`, `SOURCE`, `REWARD`, `LIST`, `JOB`, `REMIND_TIME`, `TZ`.
- [ ] Paste the confirmation email (0), the welcome emails (1–3) and the one reminder (R) from `docs/EMAILS.md`, in both languages, and build the automation described there.
- [ ] Netlify → Environment variables: `EMAIL_PROVIDER=brevo`, `EMAIL_API_KEY`, `LIST_BATCH` (and `LIST_RITUAL`), `BREVO_DOI_TEMPLATE`, `SITE_URL`.
- [ ] `site.config.js`: `forms.endpoint: '/api/signup'`, `batch.countEndpoint: '/api/count'`.

**3. Measuring and search (afternoon)**
- [ ] Plausible: add the site, set `analytics.provider: 'plausible'` and `domain`, and add the goals listed under "The weekly dashboard" in `docs/ANALYTICS.md`.
- [ ] `legal.processors`: Netlify (hosting), Brevo (email), Plausible (visit counts).
- [ ] `npm run build`, `npm run og`, `npm run build`, push. Then Search Console and the sitemap (`docs/SEARCH.md`).

**4. You (evening)**
- [ ] Your name, photo and a voice note (`docs/FOUNDER.md`). The name also goes into `{{founder_name}}` in the emails.
- [ ] Sign up once in each language from a phone, confirm, and check that your founder card appears with a number. Do the ritual once, start to finish. Share a link in a chat to see the card.

Later, when you want it: the phone reminder (`docs/REMINDERS.md`).

When you run ads: anything aimed at Bulgaria links to the Bulgarian pages (`/bg/…`), never the English ones, with `utm_` tags so you can tell the campaigns apart (and ad clicks skip the opening).

## Before the site goes public (state: `concept`)

- [ ] **Domain.** Set `siteUrl` in `site.config.js` and deploy (Cloudflare Pages or Netlify: `npm run build`, output `dist`).
- [x] **Fonts.** Self-hosted in `src/assets/fonts/` (see `scripts/fonts/README.md`). The site makes no requests to Google.
- [ ] **Email.** Set up a real address and update `contact.email`.
- [ ] **Signup endpoint.** The functions are ready (`server/core.mjs`, deployed automatically on Cloudflare Pages from `functions/` and on Netlify from `netlify/functions/`). Make a Brevo or MailerLite account, then set the environment variables listed at the top of `server/core.mjs` (`EMAIL_PROVIDER`, `EMAIL_API_KEY`, `LIST_BATCH`, `SITE_URL`, and for Brevo `BREVO_DOI_TEMPLATE`). Set `forms.endpoint: '/api/signup'` and `batch.countEndpoint: '/api/count'`. `npm run test:functions` checks the logic without a network. Until the endpoint is set, every form says clearly that it is in preview mode.
- [ ] **Emails.** Paste the confirmation email and the three welcome emails from `docs/EMAILS.md` (English and Bulgarian) into the mailing tool and build the automation described there. Sign up once in each language to see them arrive.
- [ ] **Analytics.** Plausible or Umami (cookieless). Set `analytics.provider` and `domain` or `scriptUrl`/`websiteId`. Turn on `debug` once to watch the events in the console, then switch it off. See `docs/ANALYTICS.md`.
- [ ] **Processors.** List every service that touches visitor data (host, mailing tool, analytics) in `legal.processors`. They appear in the privacy policy automatically.
- [ ] **Social.** Add `contact.instagram` / `contact.tiktok` handles. Your name, photo and voice: `docs/FOUNDER.md`.
- [ ] **Timeline.** Correct the statuses and add real dates in `src/config/timeline.js`. The current statuses were set from the brief.
- [ ] **Counter.** Update `batch.founderCount` and `batch.countUpdated` when you check signups, or set `batch.countEndpoint`.
- [ ] **Copy review.** Read every page once, out loud. Especially check the founder story, which is written in the first person from the brief and should sound like you.
- [ ] **Search Console.** Verify the domain and submit `/sitemap.xml`.
- [ ] **The game's reward.** The home page game promises `game.reward.percent` % off the first Batch #001 order to anyone who finds the switch and leaves an email. Decide the final terms (validity, one per person, not combined), have them checked with the rest of the legal pages, then set `game.reward.termsConfirmed = true`. Make sure the mailing tool keeps the `reward` tag from the signup, so the codes can be sent when preorders open. Set `percent: null` to switch the reward off everywhere.
- [ ] **Scroll the home page film once** on an older phone, an iPhone and a laptop, slowly and then fast. It is drawn live on the device. If it stutters, `PACE` and the beat lengths (`BEATS` in `film.js`) set how much scrolling each moment gets, and turning on Low-stim shows the plain comic instead. Also check it with the screen reader once: every word is in the page in story order. At the end, the sun should set cleanly behind the horizon and the RESET section should carry on from the dark ground with no visible seam. The dream is the heaviest part to draw: if it stutters on a phone, lower its resolution (`AU.scale` in `sizeAura`, `film.js`).
- [ ] **Do the ritual once, start to finish,** on an older phone and a laptop, then once more the next evening (the page should open on "End my shift"). The room and the breathing's warm place are drawn live: if the breathing stutters on a phone, lower the dream's resolution (`Dream.prototype.resize` in `evening-room.js`) or the room's (`sizeRoom` in `ritual.js`). Check one run with the phone on its side, one with reduced motion (flat scenes), and one with the screen locked during the breathing (it should keep time and go on by itself).
- [ ] **Play every game once** on a phone and a laptop (`/?job=bed`, `kitchen`, `ward`, `office`, `shop`, `clients`, `depot`), and once with the screen reader on. Change the week in `game.week` if a day suits another job better.
- [ ] **Music links.** Run `npm run music:check` (needs internet). It asks Spotify, YouTube and SoundCloud for every recommended pick in `src/config/music.js` and flags dead links. Once ENDSHIFT has its own playlists, add them under `music.ours`; they're shown first.

## Before preorders open (state: `preorder`)

The build refuses this state until the starred items are in the config.

- [ ] ★ **Company.** Register the company and fill in `company.legalName`, `uic`, `vat` (if registered) and `address`.
- [ ] ★ **Formula final.** Set doses, `servingSize` and statuses in `formula.js`, then `product.formulaConfirmed = true`.
- [ ] **Health claims.** For each claim, check the exact wording and conditions against the [EU Register of nutrition and health claims](https://food.ec.europa.eu/food-safety/labelling-and-nutrition/nutrition-and-health-claims/eu-register-health-claims_en) and set `verified: true` only if the final dose qualifies. Magnesium claims need at least 15 % of the NRV (56.25 mg) per daily serving. The melatonin sleep-onset claim needs 1 mg taken close to bedtime.
- [ ] **Implied claims.** Have the marketing copy ("Your brain didn’t", "reset", "switch off") reviewed against Regulation (EC) 1924/2006, Art. 10(3): general wellbeing statements must be accompanied by an authorised specific claim. The site is written to keep RESET to "a step in a ritual", but a specialist should confirm.
- [ ] **BFSA registration.** Under the Bulgarian Food Act (2020), a food supplement must be entered in the BFSA (БАБХ) register before it is first sold in Bulgaria. The application includes the label and composition, and the sale date must be at least 14 days after submission. Confirm the current procedure with the BFSA or your manufacturer. Also check national limits for any melatonin dose.
- [ ] **Label.** The mandatory statements are in `formula.js → labelStatements`, plus allergens, net quantity, lot number and best-before date.
- [ ] ★ **Game codes.** Before preorders open, create the discount code(s) in the checkout and email them to everyone tagged `switch-15`. The terms on the site say the code works from the day preorders open.
- [ ] ★ **Price** (`product.price`) and **checkout** (`checkout.enabled`, `checkout.url`). In the checkout, the final button must make the obligation to pay clear ("Pay", "Order with obligation to pay"). Show shipping before payment. Never preselect a subscription.
- [ ] ★ **Dates.** Set `batch.estimatedDispatch` and `batch.goalDeadline`. EU consumer law requires delivery within 30 days unless a different date is agreed, so the dispatch estimate must be shown and accepted before payment. The site does that; make sure the checkout repeats it.
- [ ] ★ **Refund mechanics.** Make sure your payment provider can refund every preorder in one go if the goal is missed. Then set `batch.preorderTermsConfirmed = true`.
- [ ] ★ **Legal pages.** Have Terms, Privacy and Shipping & returns reviewed, then set `legal.draft = false` and update `legal.lastUpdated`.
- [ ] **Benefits.** Switch on only the founder benefits you can deliver (`batch.benefits`). Decide on `founderDiscountPercent`.
- [ ] **Purchase tracking.** Connect the checkout webhook to analytics and to the founder count (see `docs/ANALYTICS.md`).
- [ ] **Packaging.** Once it's real, set `product.packagingFinal = true` and replace the concept render with photography.

## Production and stock

- [ ] `product.status = 'production'` while the batch is made. Post updates to the timeline.
- [ ] `product.status = 'in_stock'` when it ships. Set `servingsConfirmed`, `shipping.cost` and `shipping.carrier`.
- [ ] **Manufacturer.** Publish `manufacturer.name`, `country`, and only current, verified `certifications`.
- [ ] **Reviews.** Add real reviews to `socialProof.testimonials`, with consent, date and source, and no medical claims in the quotes.
- [ ] **Shipping beyond Bulgaria.** Add regions to `shipping.regions`, register for VAT OSS if you sell to consumers in other EU countries, and check each country's supplement rules.
