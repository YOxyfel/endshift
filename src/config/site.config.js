/**
 * ENDSHIFT — the one file to edit when product facts change.
 *
 * Every value that is not final yet lives here, not in the page templates.
 * Run `npm run build`: the build checks these values and refuses to publish
 * anything dishonest (e.g. a "Preorder" button with no price or checkout).
 *
 * Quick reference
 *   product.status         "concept" | "preorder" | "production" | "in_stock"
 *   product.price          number in EUR, or null until decided
 *   product.formulaConfirmed   false until the manufacturer formula is signed off
 *   batch.founderCount     update by hand (or set batch.countEndpoint)
 *   batch.estimatedDispatch    e.g. "March 2027", or null
 *   company.*              must be filled in before any payment is taken
 */

export default {
  brandName: 'ENDSHIFT',
  tagline: 'Your shift ended. Your brain didn’t.',

  // The usual end of a working day. The hero time card shows it, and the work-mode switch
  // uses it to tell daytime ("still on shift?") from the evening. "HH:MM", 24-hour.
  shiftOut: '18:00',

  // The 7-second opening on a visitor's first home page view (it ends by handing the switch
  // to the game). Visitors from a campaign link (utm_*, gclid, fbclid, ttclid, msclkid) and
  // phones in data-saver mode go straight to the page.
  opening: { enabled: true, skipForCampaigns: true },

  // Simple A/B tests. Each visitor gets one variant per active test (kept on their device),
  // the page gets html[data-exp-<name>="<variant>"] before it paints, and every analytics
  // event carries x_<name>: <variant>, so any funnel can be split by variant.
  // Turn one on, let it run for a few hundred visits per variant, compare, turn it off.
  experiments: {
    teaser: { active: false, variants: ['reward', 'plain'] }, // "Find it: 15% off…" under the game's mission, or not
    opening: { active: false, variants: ['montage', 'none'] }, // the opening on a first visit, or straight to the game
    inshort: { active: false, variants: ['show', 'hide'] }, // the three-line summary right after the game, or straight into the film
  },

  // The home page tells one evening as a graphic novel. Its panels (and the scene openers on
  // RESET, Batch #001 and Story) are drawn in the browser from the game's rooms. Any panel can
  // be swapped for a clip or a still: media: { hall: '/assets/media/hall.mp4' } (local files, or
  // full URLs: their sites are added to the security policy). Panel names: hall, bus, sofa,
  // tickets, desk, bed, lineWork, lineEve, r1 … r7 (the ritual steps), jar, ad, end, jarWide,
  // racks, build. Never show a generated jar as the real product, or generated people as customers.
  story: {
    media: {},
  },

  // The home page hero is a small game: find the switch and clock out. One game a day,
  // the same for everyone on that day. Games and their words live in src/content/<locale>/game.js.
  game: {
    enabled: true, // false → the classic hero with the switch
    // Monday → Sunday
    week: ['office', 'kitchen', 'depot', 'ward', 'shop', 'bed', 'clients'],
    urlParam: true, // ?job=ward plays a given game (for ads, sharing and testing)
    reward: {
      // A real promise: honour it at checkout. null → no reward is mentioned anywhere.
      percent: 15,
      tag: 'switch-15', // sent with the signup, so the code can be issued when preorders open
      expiresDays: 30, // the code works for this many days after preorders open; null → no limit
      termsConfirmed: false, // true once the reward terms on the Terms page are final
    },
  },

  // Production URL, no trailing slash. Used for canonical URLs, sitemap and Open Graph.
  siteUrl: 'https://endshift.example',

  // ---------------------------------------------------------------------------
  // Languages. A page is built for a locale only when src/content/<locale>/<page>.js exists.
  // English and Bulgarian are both complete.
  defaultLocale: 'en',
  locales: {
    en: { enabled: true, label: 'EN', name: 'English', htmlLang: 'en', ogLocale: 'en_GB' },
    bg: { enabled: true, label: 'БГ', name: 'Български', htmlLang: 'bg', ogLocale: 'bg_BG' },
  },

  // ---------------------------------------------------------------------------
  product: {
    name: 'RESET',
    fullName: 'ENDSHIFT RESET',
    // concept    → no payments, founding list (waitlist) only
    // preorder   → paid preorders through checkout.url
    // production → preorders closed, batch being made
    // in_stock   → normal purchase
    status: 'concept',
    format: 'capsules',
    servings: 30, // planned; shown as "planned" until servingsConfirmed
    servingsConfirmed: false,
    price: null, // e.g. 27.9
    targetPriceRange: null, // e.g. "€24–29" to show an honest range before the final price
    currency: 'EUR',
    formulaConfirmed: false, // see src/config/formula.js
    packagingFinal: false, // false → product visuals are labelled "concept render"
  },

  // ---------------------------------------------------------------------------
  batch: {
    id: '001',
    founderGoal: 150,
    founderCount: 0, // in "concept" this counts founding-list signups; from "preorder" on, paid founders
    countUpdated: '2026-10-08', // ISO date the count was last checked by a human
    countEndpoint: null, // optional URL returning {"count": 42}; the page refreshes the number from it
    showCountFrom: 20, // below this many, pages lead with "Nº 001 is free" instead of showing a near-zero count
    manufacturingMOQ: 500,
    goalDeadline: null, // e.g. "2027-01-31" once preorders open
    productionLeadTime: null, // e.g. "6–8 weeks" once the manufacturer confirms
    estimatedDispatch: null, // e.g. "March 2027"
    // Set to true only when the preorder terms below are final and published in Terms.
    preorderTermsConfirmed: false,
    refund: {
      ifGoalMissed: 'full', // every preorder refunded in full if the goal isn't reached by goalDeadline
      cancelBeforeDispatch: true, // founders can cancel for a full refund until their order ships
    },
    // Only switch on what you can actually deliver.
    benefits: {
      founderNumber: true, // "Founder No. 014"
      batchCard: true, // digital Batch #001 card
      formulaVote: true, // vote on formula and packaging decisions
      buildUpdates: true, // private build updates by email
      earlyAccess: true, // first access to future ENDSHIFT products
      founderDiscountPercent: null, // e.g. 10 → "10% off for life". null hides it.
      founderWall: false, // opt-in public list of founders
    },
  },

  // Payments. Leave disabled until company details, terms and price are final.
  checkout: {
    enabled: false,
    url: null, // e.g. a Stripe Payment Link or Shopify checkout URL
    provider: null, // "stripe" | "shopify" | ...
  },

  // Email capture. Any endpoint that accepts JSON POST {email, list, locale, source} works
  // (your own function, Formspree, Buttondown, Brevo, MailerLite proxy...).
  // While null, forms run in preview mode and say clearly that nothing was sent.
  forms: {
    endpoint: null,
    doubleOptIn: true,
  },

  // Analytics. "none" | "plausible" | "umami" | "ga4"
  // Plausible and Umami are cookieless (no consent banner needed in most setups).
  // GA4 sets cookies, so it only loads after the visitor opts in on the Cookie preferences page.
  analytics: {
    provider: 'none',
    domain: null, // plausible: your domain
    scriptUrl: null, // umami: script URL
    websiteId: null, // umami website id / ga4 measurement id
    debug: false, // true → log every event to the console
  },

  // Fonts. "auto" uses self-hosted files when src/assets/fonts/fonts.css exists
  // (run `npm run fonts` once), otherwise Google Fonts.
  fonts: { source: 'auto' },

  // The ritual's "remind me on this phone" (Web Push). Hidden until publicKey is set:
  // `npm run vapid` makes the keys, docs/REMINDERS.md has the rest.
  push: { publicKey: null, endpoint: '/api/push' },

  // ---------------------------------------------------------------------------
  contact: {
    email: 'hello@endshift.example',
    responseTime: { en: 'within two working days', bg: 'до два работни дни' }, // per language
    instagram: null, // e.g. "endshift.co" (handle without @)
    tiktok: null,
  },

  // Legal entity. Must be complete before status moves past "concept".
  company: {
    legalName: null, // e.g. "Endshift Ltd." / „Ендшифт" ЕООД
    uic: null, // ЕИК / UIC
    vat: null,
    address: null,
    country: 'Bulgaria',
  },

  manufacturer: {
    name: null, // published once the contract is signed
    country: null,
    certifications: [], // e.g. ["ISO 22000", "HACCP"] — only verified, current certificates
  },

  shipping: {
    regions: ['Bulgaria'], // add "European Union" when ready
    cost: null, // e.g. "€3.90 in Bulgaria"
    freeOver: null, // e.g. 40
    carrier: null, // e.g. "Speedy / Econt"
  },

  // The person behind it. Everything here is optional; set what you have (see docs/FOUNDER.md).
  // Files go in src/assets/founder/. Until a name is set, the story is signed "The founder"
  // and no founder block is shown.
  founder: {
    name: null, // your first name, e.g. "Ivan": signs the story ("Ivan, founder") and the founder block
    photo: null, // e.g. "founder.jpg": portrait 4:5, at least 800×1000. Shown round on the home page, larger on Story
    photoAlt: { en: null, bg: null }, // what's in the photo, e.g. "Ivan behind the counter after a closing shift"
    line: { en: null, bg: null }, // one sentence under your name: your own shifts, e.g. "Eight years of closing shifts in retail."
    voice: null, // e.g. "voice-en.mp3" or { en: "voice-en.mp3", bg: "voice-bg.mp3" }: a 30–90 s voice note
    video: null, // e.g. "founder.mp4" (≤ 60 s, H.264, ≤ 10 MB) or { en, bg }: plays on the Story page
    transcript: { en: null, bg: null }, // what you say in the voice note or video, for people who can't play it
    videoUrl: null, // or a link to the video on YouTube/Instagram/TikTok instead (opens on the platform)
  },

  legal: {
    draft: true, // true → legal pages show a "draft" banner
    lastUpdated: '2026-10-08',
    // Every service that handles visitor data, listed by name in the privacy policy.
    // { name: "Netlify", purpose: "Website hosting", location: "EU/US (SCCs)" }
    processors: [],
  },

  // Real feedback only. Each entry needs consent: true, a date and where it came from.
  // { quote: "...", name: "Maria, courier", date: "2026-11-02", source: "email", consent: true }
  socialProof: {
    testimonials: [],
  },
};
