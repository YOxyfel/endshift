#!/usr/bin/env node
/**
 * ENDSHIFT static site build. No framework, no runtime dependencies.
 *
 *   node build.mjs             → dist/          (clean URLs, for deployment)
 *   node build.mjs --preview   → dist-preview/  (relative links, opens from any folder or host)
 *   node build.mjs --check     → only run the config checks
 *   node build.mjs --artifact  → dist-artifact/ (preview build whose home page is a body fragment, for hosts
 *                                that wrap the page in their own document, e.g. a claude.ai artifact)
 *   node build.mjs --dev       → dist-dev/      (like dist, with scripts and styles left unminified, for debugging)
 *
 * esbuild (devDependency) is used for minifying CSS/JS when installed; otherwise files are copied as-is.
 */
import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { validate, deriveState } from './src/lib/state.js';
import { renderDocument } from './src/templates/layout.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const args = new Set(process.argv.slice(2));
const ARTIFACT = args.has('--artifact');
const PREVIEW = args.has('--preview') || ARTIFACT;
const CHECK_ONLY = args.has('--check');
const DEV = args.has('--dev') && !PREVIEW;
const OUT = path.join(ROOT, ARTIFACT ? 'dist-artifact' : PREVIEW ? 'dist-preview' : DEV ? 'dist-dev' : 'dist');

const load = async (p) => (await import(pathToFileURL(path.join(SRC, p)).href)).default;

const cfg = await load('config/site.config.js');
const formula = await load('config/formula.js');
const timeline = await load('config/timeline.js');
const music = await load('config/music.js');

/* ---------------------------------------------------------------------------
   Pages. `path` is the clean URL below the locale prefix.                    */

export const PAGES = [
  { id: 'home', path: '', template: 'home', priority: '1.0' },
  { id: 'ritual', path: 'ritual/', template: 'ritual', priority: '0.9' },
  { id: 'reset', path: 'reset/', template: 'reset', priority: '0.9' },
  { id: 'batch', path: 'founding-batch/', template: 'batch', priority: '0.8' },
  { id: 'story', path: 'story/', template: 'story', priority: '0.6' },
  { id: 'formula', path: 'formula/', template: 'formula', priority: '0.7' },
  { id: 'faq', path: 'faq/', template: 'faq', priority: '0.7' },
  { id: 'ritual-card', path: 'ritual/card/', template: 'ritualcard', priority: '0.3' },
  { id: 'journal', path: 'journal/', template: 'journal', priority: '0.5' },
  { id: 'guide-switch-off', path: 'journal/how-to-switch-off-after-work/', template: 'article', priority: '0.6' },
  { id: 'guide-night-shift', path: 'journal/after-a-night-shift/', template: 'article', priority: '0.6' },
  { id: 'guide-just-checking', path: 'journal/why-just-checking-never-is/', template: 'article', priority: '0.6' },
  { id: 'guide-magnesium', path: 'journal/magnesium/', template: 'article', priority: '0.6' },
  { id: 'guide-l-theanine', path: 'journal/l-theanine/', template: 'article', priority: '0.6' },
  { id: 'guide-melatonin', path: 'journal/melatonin-in-the-eu/', template: 'article', priority: '0.6' },
  { id: 'guide-valerian-passionflower', path: 'journal/valerian-and-passionflower/', template: 'article', priority: '0.6' },
  { id: 'contact', path: 'contact/', template: 'contact', priority: '0.4' },
  { id: 'shipping', path: 'shipping-returns/', template: 'legal', priority: '0.3' },
  { id: 'privacy', path: 'privacy/', template: 'legal', priority: '0.2' },
  { id: 'terms', path: 'terms/', template: 'legal', priority: '0.2' },
  { id: 'cookies', path: 'cookies/', template: 'cookies', priority: '0.2' },
  { id: 'system', path: 'system/', template: 'system', noindex: true, noContent: true, solidHeader: true },
  { id: '404', path: '404.html', template: 'notfound', noindex: true, file: true, solidHeader: true },
];

const locales = Object.entries(cfg.locales)
  .filter(([, l]) => l.enabled)
  .map(([code, l]) => ({ code, ...l }));
const DEF = cfg.defaultLocale;

const hasContent = (page, loc) =>
  page.noContent ? loc === DEF : existsSync(path.join(SRC, 'content', loc, `${page.template === 'notfound' ? 'notfound' : page.id}.js`));
const hasTemplate = (page) => existsSync(path.join(SRC, 'templates', 'pages', `${page.template}.js`));

const outFile = (page, loc) => (loc === DEF ? '' : `${loc}/`) + (page.file ? page.path : `${page.path}index.html`);

/* ---------------------------------------------------------------------------
   Checks                                                                      */

const { errors, warnings } = validate(cfg, formula);
// The founder's files named in the config have to be there: a broken photo reads as "unfinished"
{
  const F = cfg.founder || {};
  const files = [F.photo, ...[F.voice, F.video].flatMap((v) => (v && typeof v === 'object' ? Object.values(v) : [v]))].filter(Boolean);
  for (const f of files) if (!existsSync(path.join(SRC, 'assets/founder', f))) errors.push(`founder: "${f}" is set in site.config.js but isn’t in src/assets/founder/.`);
  if (!F.name) warnings.push('founder.name is empty: the story is signed “The founder”. Add your name, a photo and a voice note (see docs/FOUNDER.md).');
}
const state = deriveState(cfg);
const log = (s = '') => process.stdout.write(s + '\n');

log(`\nENDSHIFT build · status: ${cfg.product.status} · formula ${cfg.product.formulaConfirmed ? 'confirmed' : 'not confirmed'} · ${state.founderCount}/${state.founderGoal} ${state.counterKind === 'list' ? 'on the list' : 'founders'}`);
if (warnings.length) {
  log('\nLaunch to-dos:');
  warnings.forEach((w) => log(`  · ${w}`));
}
if (errors.length) {
  log('\nBuild stopped. These would make the site say something untrue:');
  errors.forEach((e) => log(`  ✗ ${e}`));
  log('');
  process.exit(1);
}
if (CHECK_ONLY) {
  log('\nConfig OK.\n');
  process.exit(0);
}

/* ---------------------------------------------------------------------------
   Assets                                                                      */

let esbuild = null;
try {
  if (!DEV) esbuild = await import('esbuild');
} catch {
  log('\n(esbuild not installed: CSS/JS are copied unminified. Run `npm install` to minify.)');
}

const hashes = {};
const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 10);

// In production builds CSS/JS get content-hashed names (site.3f9a1c2b4d.css) so they can be
// cached forever. Preview builds keep plain names.
const assetNames = {};
async function writeAsset(rel, content, loader) {
  let out = content;
  if (esbuild && loader) {
    out = (await esbuild.transform(content, { loader, minify: true, target: loader === 'js' ? 'es2019' : undefined, legalComments: 'none' })).code;
  }
  const h = hash(out);
  const outRel = PREVIEW ? rel : rel.replace(/(\.[a-z0-9]+)$/, `.${h}$1`);
  const file = path.join(OUT, outRel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, out);
  hashes[rel] = h;
  assetNames[rel] = outRel;
  return out.length;
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const css = (
  await Promise.all(['base', 'components', 'sections'].map((f) => readFile(path.join(SRC, 'assets/css', `${f}.css`), 'utf8')))
).join('\n');
const sizes = {};
sizes['site.css'] = await writeAsset('assets/css/site.css', css, 'css');
sizes['ritual.css'] = await writeAsset('assets/css/ritual.css', await readFile(path.join(SRC, 'assets/css/ritual.css'), 'utf8'), 'css');
for (const extra of ['game', 'story', 'film', 'world', 'card']) {
  if (existsSync(path.join(SRC, `assets/css/${extra}.css`))) sizes[`${extra}.css`] = await writeAsset(`assets/css/${extra}.css`, await readFile(path.join(SRC, `assets/css/${extra}.css`), 'utf8'), 'css');
}
// JS bundles: files are concatenated in order (each is a self-contained IIFE)
const JS_BUNDLES = {
  site: ['site.js', 'ambient.js', 'shift.js', 'intro.js'],
  ritual: ['ritual-audio.js', 'ritual-scenes.js', 'ritual-music.js', 'ritual.js'],
  room: ['evening-room.js'],
  world: ['world.js'],
  ink: ['game-ink.js', 'game-paint.js', 'game-scenes.js'],
  game: ['game-fx.js', 'game-room.js', 'game-flood.js', 'game-torch.js', 'game.js'],
  story: ['story.js', 'film.js', 'film-watch.js'],
};
for (const [name, files] of Object.entries(JS_BUNDLES)) {
  const parts = [];
  for (const f of files) {
    const src = path.join(SRC, 'assets/js', f);
    if (existsSync(src)) parts.push(await readFile(src, 'utf8'));
  }
  if (parts.length) sizes[`${name}.js`] = await writeAsset(`assets/js/${name}.js`, parts.join('\n;\n'), 'js');
}
await cp(path.join(SRC, 'assets/img'), path.join(OUT, 'assets/img'), { recursive: true });
// A few sounds the pages use (the ritual's lock-screen controls need a playing track)
if (existsSync(path.join(SRC, 'assets/audio'))) await cp(path.join(SRC, 'assets/audio'), path.join(OUT, 'assets/audio'), { recursive: true });
// The founder's photo, voice note and video (only the files, not the notes about them)
if (existsSync(path.join(SRC, 'assets/founder')))
  await cp(path.join(SRC, 'assets/founder'), path.join(OUT, 'assets/founder'), { recursive: true, filter: (f) => !/\.md$/i.test(f) });

const fontsDir = path.join(SRC, 'assets/fonts');
const localFonts = cfg.fonts.source !== 'google' && existsSync(path.join(fontsDir, 'fonts.css'));
// Preload the display face for the page's script: Latin for English, Cyrillic for Bulgarian.
const fontPreload = {};
if (localFonts) {
  await cp(fontsDir, path.join(OUT, 'assets/fonts'), { recursive: true });
  for (const sub of ['latin', 'cyrillic']) {
    const f = `sofia-sans-extra-condensed-${sub}.woff2`;
    if (existsSync(path.join(fontsDir, f))) fontPreload[sub] = `assets/fonts/${f}`;
  }
}

/* ---------------------------------------------------------------------------
   Rendering                                                                   */

const deepMerge = (base, over) => {
  if (!over) return base;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && typeof v !== 'function' && base?.[k] && typeof base[k] === 'object' ? deepMerge(base[k], v) : v;
  }
  return out;
};

const templates = {};
for (const p of PAGES) {
  if (hasTemplate(p) && !templates[p.template]) templates[p.template] = await load(`templates/pages/${p.template}.js`);
}

const contentModules = {};
async function contentModule(loc, id) {
  const key = `${loc}/${id}`;
  if (!(key in contentModules)) {
    const f = path.join(SRC, 'content', loc, `${id}.js`);
    contentModules[key] = existsSync(f) ? await load(`content/${loc}/${id}.js`) : null;
  }
  return contentModules[key];
}

const contentIds = [...new Set(PAGES.filter((p) => !p.noContent).map((p) => (p.template === 'notfound' ? 'notfound' : p.id)))];

function makeFmt(loc, ui) {
  const intlLocale = loc === 'bg' ? 'bg-BG' : 'en-GB';
  const money = new Intl.NumberFormat(intlLocale, { style: 'currency', currency: cfg.product.currency });
  const dateF = new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'long', year: 'numeric' });
  return {
    date: (iso) => dateF.format(new Date(`${iso}T12:00:00`)),
    price: (n) => money.format(n),
    priceLine: () =>
      state.hasPrice ? ui.price.exact(money.format(cfg.product.price)) : cfg.product.targetPriceRange ? ui.price.range(cfg.product.targetPriceRange) : ui.price.none,
    dose: (ing) => (ing.dose == null ? '' : `${ing.dose} ${ing.unit}`),
    benefitsList: () => {
      const b = cfg.batch.benefits;
      const B = ui.benefits;
      const list = [
        b.founderNumber && B.founderNumber.short,
        b.batchCard && B.batchCard.short,
        b.formulaVote && B.formulaVote.short,
        b.buildUpdates && B.buildUpdates.short,
        b.earlyAccess && B.earlyAccess.short,
        b.founderDiscountPercent && B.founderDiscount.short(b.founderDiscountPercent),
        b.founderWall && B.founderWall.short,
      ].filter(Boolean);
      if (!list.length) return '';
      return list.length === 1 ? list[0] : `${list.slice(0, -1).join(', ')} ${B.and} ${list.at(-1)}`;
    },
  };
}

/**
 * Line-break hygiene on the rendered page's text (never inside tags, scripts, styles or <pre>):
 * - a number stays with the word or unit after it ("156 mg", "20 minutes", "150 founders");
 * - "Nº 001" / "№ 001" stay together;
 * - a spaced dash stays at the end of the line, never at the start of the next;
 * - Bulgarian: one-letter words (с, в, и, а, у, к, о) stay with the next word.
 */
function typeset(html, locale) {
  const NB = ' ';
  const fix = (s) => {
    let t = s
      .replace(/(\d)[ ](?=[A-Za-zА-Яа-яµ%°])/g, `$1${NB}`)
      .replace(/(Nº|№|No\.)[ ](?=\d)/g, `$1${NB}`)
      .replace(/[ ]([–—])[ ]/g, `${NB}$1 `);
    if (locale === 'bg') t = t.replace(/(?<=^|[\s(„“"«—–-])([сСвВиИаАуУкКоО])[ ](?=\S)/g, `$1${NB}`);
    return t;
  };
  let out = '';
  let skip = null; // the tag we're inside and must leave alone
  for (const part of html.split(/(<[^>]+>)/)) {
    if (part.startsWith('<')) {
      const m = /^<(\/?)(script|style|pre|textarea)\b/i.exec(part);
      if (m) skip = m[1] ? null : m[2].toLowerCase();
      out += part;
    } else out += skip ? part : fix(part);
  }
  return out;
}

const rendered = [];
const inlineScriptHashes = new Set();
const sha256 = (str) => createHash('sha256').update(str, 'utf8').digest('base64');

for (const loc of locales) {
  const enUiFn = await contentModule(DEF, 'ui');
  const locUiFn = loc.code === DEF ? null : await contentModule(loc.code, 'ui');
  const ui = deepMerge(enUiFn({ cfg, state }), locUiFn ? locUiFn({ cfg, state }) : null);
  const fmt = makeFmt(loc.code, ui);
  const t = (obj) => (obj == null ? '' : typeof obj === 'string' ? obj : (obj[loc.code] ?? obj[DEF] ?? ''));

  for (const page of PAGES) {
    if (!hasContent(page, loc.code) || !hasTemplate(page)) continue;
    const file = outFile(page, loc.code);

    const url = (id, { locale = loc.code, hash: h, query: q } = {}) => {
      const target = PAGES.find((p) => p.id === id);
      if (!target) throw new Error(`Unknown page id "${id}"`);
      const l = hasContent(target, locale) ? locale : DEF;
      let href;
      if (ARTIFACT && target.id === 'home' && l === DEF) {
        // The host serves the wrapped home page at the root, so link to the directory.
        href = path.posix.relative(path.posix.dirname(file), '.') || '.';
        href = href === '.' ? './' : `${href}/`;
      } else if (PREVIEW) {
        href = path.posix.relative(path.posix.dirname(file), outFile(target, l)) || 'index.html';
      } else {
        href = `/${l === DEF ? '' : `${l}/`}${target.path}`;
      }
      return href + (q ? `?${q}` : '') + (h ? `#${h}` : '');
    };
    const asset = (rel) => (PREVIEW ? path.posix.relative(path.posix.dirname(file), assetNames[rel] || rel) : `/${assetNames[rel] || rel}`);

    const absFor = (l) => `${cfg.siteUrl}/${l === DEF ? '' : `${l}/`}${page.path}`;
    const alternates = locales.filter((l) => hasContent(page, l.code)).map((l) => ({ code: l.code, htmlLang: l.htmlLang, abs: absFor(l.code) }));
    const otherLocales = locales
      .filter((l) => l.code !== loc.code)
      .map((l) => ({ ...l, href: hasContent(page, l.code) ? url(page.id, { locale: l.code }) : url('home', { locale: l.code }) }));

    const ctx = {
      cfg,
      formula,
      timeline,
      music,
      state,
      ui,
      fmt,
      t,
      url,
      asset,
      page,
      locale: loc.code,
      localeInfo: loc,
      defaultLocale: DEF,
      mode: PREVIEW ? 'preview' : 'prod',
      fragment: ARTIFACT && file === 'index.html',
      canonical: absFor(loc.code),
      alternates,
      otherLocales,
      fonts: { local: localFonts, preload: fontPreload },
      // the page's drawn share card (npm run og), else the home page's
      og: (() => {
        const suffix = loc.code === DEF ? '' : `-${loc.code}`;
        const pick = [`${page.id}${suffix}`, `home${suffix}`, page.id, 'home'].find((n) => existsSync(path.join(SRC, 'assets/img/og', `${n}.jpg`)));
        return pick ? `${cfg.siteUrl}/assets/img/og/${pick}.jpg` : `${cfg.siteUrl}/assets/img/og.png`;
      })(),
      content: {},
    };
    const contentArgs = { cfg, state, fmt, formula, timeline, url, t, locale: loc.code, ui };
    for (const id of contentIds) {
      const mod = (await contentModule(loc.code, id)) || (id === page.id ? null : null);
      if (mod) ctx.content[id] = mod(contentArgs);
    }
    // The home page game: the locale's words over the English ones (anything not translated stays English).
    {
      const en = await contentModule(DEF, 'game');
      const lo = loc.code === DEF ? null : await contentModule(loc.code, 'game');
      if (en) ctx.content.game = deepMerge(en(contentArgs), lo ? lo(contentArgs) : null);
    }
    // Shared content a page depends on (e.g. ritual steps on home) falls back to the default locale.
    for (const id of ['ritual', 'faq']) {
      if (!ctx.content[id]) {
        const mod = await contentModule(DEF, id);
        if (mod) ctx.content[id] = mod({ ...contentArgs, locale: DEF });
      }
    }

    const result = templates[page.template](ctx);
    const htmlOut = typeset(renderDocument(ctx, result), loc.code);
    for (const m of htmlOut.matchAll(/<script>([\s\S]*?)<\/script>/g)) inlineScriptHashes.add(sha256(m[1]));
    const dest = path.join(OUT, file);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, htmlOut);
    rendered.push({ page, loc: loc.code, file, size: htmlOut.length, abs: absFor(loc.code), alternates });
  }
}

/* ---------------------------------------------------------------------------
   Sitemap, robots, manifest, host headers                                       */

const indexable = rendered.filter((r) => !r.page.noindex);
const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${indexable
  .map(
    (r) => `  <url>
    <loc>${r.abs}</loc>
    <lastmod>${today}</lastmod>
    <priority>${r.page.priority || '0.5'}</priority>
${r.alternates.length > 1 ? r.alternates.map((a) => `    <xhtml:link rel="alternate" hreflang="${a.htmlLang}" href="${a.abs}"/>`).join('\n') + '\n' : ''}  </url>`,
  )
  .join('\n')}
</urlset>
`;
await writeFile(path.join(OUT, 'sitemap.xml'), sitemap);
await writeFile(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /system/\n\nSitemap: ${cfg.siteUrl}/sitemap.xml\n`);
await writeFile(
  path.join(OUT, 'manifest.webmanifest'),
  JSON.stringify(
    {
      name: cfg.brandName,
      short_name: cfg.brandName,
      description: cfg.tagline,
      id: '/',
      start_url: PREVIEW ? './index.html' : '/ritual/?app=1',
      scope: PREVIEW ? './' : '/',
      display: 'standalone',
      lang: cfg.defaultLocale,
      background_color: '#0f1112',
      theme_color: '#0f1112',
      shortcuts: PREVIEW ? undefined : [{ name: 'Start the ritual', short_name: 'Ritual', url: '/ritual/?app=1' }],
      icons: [
        { src: PREVIEW ? 'assets/img/apple-touch-icon.png' : '/assets/img/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        { src: PREVIEW ? 'assets/img/icon-512.png' : '/assets/img/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: PREVIEW ? 'assets/img/favicon.svg' : '/assets/img/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      ],
    },
    null,
    2,
  ),
);
/* Offline: a small service worker (production builds only). Pages are network-first, so
   visitors always get the latest; hashed assets are cache-first. The home page and the ritual
   (both languages) and everything they load are stored at install, so the ritual works offline. */
if (!PREVIEW) {
  const swVersion = createHash('sha1').update(JSON.stringify(assetNames) + rendered.length).digest('hex').slice(0, 10);
  const precache = ['/', '/ritual/', ...locales.filter((l) => l.code !== DEF).flatMap((l) => [`/${l.code}/`, `/${l.code}/ritual/`])];
  const offlineHtml = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline | ${cfg.brandName}</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0f1112;color:#f3f0e8;font:18px/1.5 system-ui,sans-serif;text-align:center;padding:24px"><div><p style="font-size:28px;font-weight:700;margin:0 0 8px">You’re offline.</p><p style="margin:0 0 24px;color:#a7aaa8">The ritual still works without a connection.</p><a href="/ritual/" style="display:inline-block;padding:14px 24px;background:#f2a84b;color:#0f1112;text-decoration:none;font-weight:700;border-radius:3px">Open the ritual</a></div></body></html>`;
  const sw = `/* ${cfg.brandName} service worker, generated by build.mjs */
const VERSION = ${JSON.stringify(swVersion)};
const CACHE = 'endshift-' + VERSION;
const PRECACHE = ${JSON.stringify(precache)};
const OFFLINE = ${JSON.stringify(offlineHtml)};

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const url of PRECACHE) {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) continue;
        await cache.put(url, res.clone());
        const html = await res.text();
        const assets = [...html.matchAll(/(?:href|src)="(\\/(?:assets\\/[^"#?]+|manifest\\.webmanifest))"/g)].map((m) => m[1]);
        await Promise.all([...new Set(assets)].map((a) => cache.add(a).catch(() => {})));
      } catch (e) {}
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('endshift-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

// The ritual reminder (Web Push): the push carries no words; the page saved them when it was switched on
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let m = { title: 'ENDSHIFT', body: '', url: '/ritual/' };
    try {
      const r = await caches.match('/__es-push.json');
      if (r) m = Object.assign(m, await r.json());
    } catch (e) {}
    await self.registration.showNotification(m.title, { body: m.body, icon: '/assets/img/icon-512.png', tag: 'endshift-ritual', data: { url: m.url } });
  })());
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/ritual/', self.location.origin).href;
  event.waitUntil((async () => {
    for (const c of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) {
      if (new URL(c.url).pathname === new URL(url).pathname && 'focus' in c) return c.focus();
    }
    return self.clients.openWindow(url);
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isPage = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isPage) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (e) {
        return (await cache.match(req, { ignoreSearch: true })) || new Response(OFFLINE, { headers: { 'content-type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })());
  }
});
`;
  await writeFile(path.join(OUT, 'sw.js'), sw);
}

/* Security + cache headers (Netlify and Cloudflare Pages read dist/_headers).
   The Content-Security-Policy is generated from the config, so switching analytics or the
   form endpoint never silently breaks the site. The one inline script is allowed by hash. */
if (!PREVIEW) {
  const origin = (u) => {
    try {
      return new URL(u).origin;
    } catch {
      return null;
    }
  };
  const a = cfg.analytics;
  const scriptSrc = new Set(["'self'"]);
  const connectSrc = new Set(["'self'"]);
  const imgSrc = new Set(["'self'", 'data:', 'blob:']); // blob: = the OUT card preview drawn on the device
  for (const h of inlineScriptHashes) scriptSrc.add(`'sha256-${h}'`);
  if (a.provider === 'plausible') {
    scriptSrc.add('https://plausible.io');
    connectSrc.add('https://plausible.io');
  } else if (a.provider === 'umami' && origin(a.scriptUrl)) {
    scriptSrc.add(origin(a.scriptUrl));
    connectSrc.add(origin(a.scriptUrl));
  } else if (a.provider === 'ga4') {
    scriptSrc.add('https://www.googletagmanager.com');
    ['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com'].forEach((x) => connectSrc.add(x));
    imgSrc.add('https://*.google-analytics.com').add('https://*.googletagmanager.com');
  }
  [cfg.forms.endpoint, cfg.batch.countEndpoint].map(origin).filter(Boolean).forEach((o) => connectSrc.add(o));
  // story panels replaced by clips or stills hosted elsewhere
  const mediaSrc = new Set(["'self'"]);
  Object.values(cfg.story?.media || {})
    .map((m) => origin(m?.src || m))
    .filter(Boolean)
    .forEach((o) => {
      imgSrc.add(o);
      mediaSrc.add(o);
    });
  // Music players for the ritual: loaded only when a visitor picks one
  const frameSrc = new Set(["'self'"]);
  if (music.enabled) {
    ['https://open.spotify.com', 'https://www.youtube.com', 'https://w.soundcloud.com'].forEach((x) => scriptSrc.add(x));
    ['https://open.spotify.com', 'https://www.youtube-nocookie.com', 'https://www.youtube.com', 'https://w.soundcloud.com', 'https://embed.music.apple.com'].forEach((x) => frameSrc.add(x));
  }
  const fontSrc = localFonts ? "'self'" : "'self' https://fonts.gstatic.com";
  const styleSrc = localFonts ? "'self' 'unsafe-inline'" : "'self' 'unsafe-inline' https://fonts.googleapis.com";
  const csp = [
    "default-src 'self'",
    `script-src ${[...scriptSrc].join(' ')}`,
    `style-src ${styleSrc}`,
    `font-src ${fontSrc}`,
    `img-src ${[...imgSrc].join(' ')}`,
    `media-src ${[...mediaSrc].join(' ')}`,
    `connect-src ${[...connectSrc].join(' ')}`,
    `frame-src ${[...frameSrc].join(' ')}`,
    "manifest-src 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
  const headers = `/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Cross-Origin-Opener-Policy: same-origin-allow-popups

/sw.js
  Cache-Control: no-cache

/assets/css/*
  Cache-Control: public, max-age=31536000, immutable

/assets/js/*
  Cache-Control: public, max-age=31536000, immutable

/assets/fonts/*
  Cache-Control: public, max-age=2592000

/assets/img/*
  Cache-Control: public, max-age=86400

/assets/founder/*
  Cache-Control: public, max-age=86400

/assets/audio/*
  Cache-Control: public, max-age=2592000
`;
  await writeFile(path.join(OUT, '_headers'), headers);
}

/* ---------------------------------------------------------------------------   */

log(`\nBuilt ${rendered.length} pages → ${path.relative(ROOT, OUT)}/`);
for (const r of rendered) log(`  ${r.file.padEnd(52)} ${(r.size / 1024).toFixed(1).padStart(6)} KB`);
log(`\nAssets: ${Object.entries(sizes).map(([k, v]) => `${k} ${(v / 1024).toFixed(1)} KB`).join(' · ')}`);
log(`Fonts: ${localFonts ? 'self-hosted' : 'Google Fonts (run `npm run fonts` to self-host)'}\n`);
