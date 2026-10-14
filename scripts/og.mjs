#!/usr/bin/env node
/**
 * npm run og: draw the share cards (1200×630), one per page and language, into src/assets/img/og/.
 *
 * Each card is a drawn room from the site (the panel posters in src/assets/img/panels/), or the
 * vials for the formula and the ingredient guides, with the page's own title and first line,
 * set in the site's fonts. Run it after `npm run build` (it reads the titles from dist/), then
 * build again so the cards are copied and linked. Pages without a card use the home page's.
 *
 * Needs Playwright: npm i -D playwright && npx playwright install chromium
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'src/assets/img/og');
const { chromium } = await import('playwright').catch(() => {
  console.error('Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
});
if (!existsSync(path.join(DIST, 'index.html'))) {
  console.error('Build the site first: npm run build');
  process.exit(1);
}
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href).then((m) => m.default ?? m);
const cfg = await imp('src/config/site.config.js');
const formula = await imp('src/config/formula.js');
const PANELS = await imp('src/config/panels.js');
const { vialGlass, guideCoverSpec } = await import(pathToFileURL(path.join(ROOT, 'src/templates/components.js')).href);

// Which picture each page gets (the guides take their journal cover)
const CARDS = [
  { id: 'home', path: '', pic: { view: 'tickets' } },
  { id: 'reset', path: 'reset/', pic: { photo: 'photos/reset-jar-night-1536.webp' } },
  { id: 'batch', path: 'founding-batch/', pic: { view: 'racks' } },
  { id: 'ritual', path: 'ritual/', pic: { view: 'r4' } },
  { id: 'ritual-card', path: 'ritual/card/', pic: { view: 'r1' } },
  { id: 'formula', path: 'formula/', pic: { vials: formula.ingredients.filter((i) => i.status !== 'removed').map((i) => i.id) } },
  { id: 'story', path: 'story/', pic: { view: 'build' } },
  { id: 'journal', path: 'journal/', pic: { view: 'r7' } },
  { id: 'faq', path: 'faq/', pic: { view: 'lineEve' } },
  { id: 'guide-switch-off', path: 'journal/how-to-switch-off-after-work/' },
  { id: 'guide-night-shift', path: 'journal/after-a-night-shift/' },
  { id: 'guide-just-checking', path: 'journal/why-just-checking-never-is/' },
  { id: 'guide-magnesium', path: 'journal/magnesium/' },
  { id: 'guide-l-theanine', path: 'journal/l-theanine/' },
  { id: 'guide-melatonin', path: 'journal/melatonin-in-the-eu/' },
  { id: 'guide-valerian-passionflower', path: 'journal/valerian-and-passionflower/' },
];

const b64 = async (f, type) => `data:${type};base64,${(await readFile(f)).toString('base64')}`;
const fontFace = async (fam, file, w) => `@font-face{font-family:'${fam}';font-weight:${w};src:url(${await b64(path.join(ROOT, 'src/assets/fonts', file), 'font/woff2')}) format('woff2')}`;
const FONTS = (
  await Promise.all([
    fontFace('Sofia Sans Extra Condensed', 'sofia-sans-extra-condensed-latin.woff2', '500 900'),
    fontFace('Sofia Sans Extra Condensed', 'sofia-sans-extra-condensed-cyrillic.woff2', '500 900'),
    fontFace('Sofia Sans', 'sofia-sans-latin.woff2', '300 750'),
    fontFace('Sofia Sans', 'sofia-sans-cyrillic.woff2', '300 750'),
  ])
).join('');

const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
// the first sentence, or the first words that fit, cut at a word
const firstLine = (s) => {
  const m = s.match(/^.{20,130}?[.!?](\s|$)/);
  if (m) return m[0].trim();
  const cut = s.slice(0, 118);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:\s]+$/, '') + '…';
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

async function picture(spec, loc) {
  if (spec.photo) return `<img class="pic" src="${await b64(path.join(ROOT, 'src/assets/img', spec.photo), 'image/webp')}">`;
  if (spec.view) {
    const name = `${spec.view}${loc === 'bg' && PANELS.bg.includes(spec.view) ? '-bg' : ''}-1280.webp`;
    return `<img class="pic" src="${await b64(path.join(ROOT, 'src/assets/img/panels', name), 'image/webp')}">`;
  }
  const ctx = { state: { formulaConfirmed: !!cfg.product.formulaConfirmed } };
  const t = (o) => (o && typeof o === 'object' ? o[loc] || o.en : o);
  const ings = spec.vials.map((id) => formula.ingredients.find((i) => i.id === id)).filter(Boolean);
  return `<div class="vials n${ings.length}"><span class="shelf"></span>${ings.map((ing) => `<span class="vial">${vialGlass(ctx, ing, 'og-')}<span class="tag">${esc(t(ing.name))}</span></span>`).join('')}</div>`;
}

const page = (o) => `<!doctype html><html lang="${o.lang}"><head><meta charset="utf-8"><style>
${FONTS}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;background:#0f1112;color:#f3f0e8;font-family:'Sofia Sans',sans-serif;position:relative}
.art{position:absolute;left:430px;top:0;right:0;bottom:0;overflow:hidden;background:#0e1015}
.pic{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.art::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#0f1112 0%,rgba(15,17,18,.86) 12%,rgba(15,17,18,.25) 38%,rgba(15,17,18,0) 60%),linear-gradient(0deg,rgba(15,17,18,.55),rgba(15,17,18,0) 34%)}
.vials{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;gap:56px;padding:0 40px 92px 160px;background:radial-gradient(60% 80% at 70% 0%,rgba(255,196,126,.32),transparent 70%),linear-gradient(180deg,#19150f,#0c0b0a)}
.vials.n1{gap:0}.vials.n5{gap:30px}
.shelf{position:absolute;left:140px;right:40px;bottom:132px;height:12px;border-radius:2px;background:linear-gradient(180deg,#8a6240,#5a3c25);box-shadow:0 10px 22px rgba(0,0,0,.6)}
.vial{position:relative;z-index:1;display:grid;justify-items:center;gap:8px}
.vial svg{display:block;height:390px;width:auto;overflow:visible}
.vials.n5 .vial svg{height:300px}
.vial__tube{stroke:rgba(230,240,248,.62);stroke-width:2}.vial__lip{stroke:rgba(230,240,248,.7);stroke-width:3;stroke-linecap:round}
.vial__ticks{stroke:rgba(230,240,248,.35);stroke-width:1.4}.vial__shadow{fill:rgba(0,0,0,.5)}
.vial__cork{fill:#b08a5a;stroke:#5a4028;stroke-width:1.5}.vial__cork-line{stroke:rgba(90,64,40,.5);stroke-width:1.2}
.vial__shine{fill:none;stroke:rgba(255,255,255,.34);stroke-width:3;stroke-linecap:round}.vial__liquid{display:none}
.vial__q{font-family:'Sofia Sans Extra Condensed';font-weight:900;font-size:34px;fill:rgba(243,240,232,.38)}
.tag{padding:5px 10px 3px;border-radius:3px;background:#efe8d6;color:#1c1f22;font:800 22px/1 'Sofia Sans Extra Condensed';white-space:nowrap}
.copy{position:absolute;left:64px;top:58px;bottom:58px;width:560px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:12px;font:880 30px/1 'Sofia Sans Extra Condensed';letter-spacing:.06em}
h1{margin-top:auto;font:860 92px/.9 'Sofia Sans Extra Condensed';text-transform:uppercase;letter-spacing:-.005em;text-wrap:balance;white-space:pre-line;text-shadow:0 2px 30px rgba(0,0,0,.6)}
.line{margin-top:20px;max-width:30ch;font-size:25px;line-height:1.35;color:#d2cfc6;text-shadow:0 1px 14px rgba(0,0,0,.7)}
.url{margin-top:26px;font:800 22px/1 'Sofia Sans Extra Condensed';letter-spacing:.14em;color:#a7aaa8;text-transform:uppercase}
</style></head><body>
<div class="art">${o.pic}</div>
<div class="copy">
<p class="brand"><svg width="34" height="34" viewBox="0 0 24 24"><path d="M5.5 16.25a6.5 6.5 0 0 1 13 0z" fill="#f2a84b"/><path d="M2 19.25h20" stroke="#f3f0e8" stroke-width="2"/></svg>${esc(cfg.brandName)}</p>
<h1>${esc(o.title)}</h1>
${o.line ? `<p class="line">${esc(o.line)}</p>` : ''}
${o.url ? `<p class="url">${esc(o.url)}</p>` : ''}
</div></body></html>`;

await mkdir(OUT, { recursive: true });
const host = /\.example$/.test(String(cfg.siteUrl).replace(/\/$/, '')) ? '' : String(cfg.siteUrl).replace(/^https?:\/\//, '').replace(/\/$/, '');
const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } });
let n = 0;
for (const [code, l] of Object.entries(cfg.locales)) {
  if (!l.enabled) continue;
  for (const card of CARDS) {
    const file = path.join(DIST, code === cfg.defaultLocale ? '' : code, card.path, 'index.html');
    if (!existsSync(file)) continue;
    const html = await readFile(file, 'utf8');
    // the title's own lines stay lines (the home page's two)
    const h1 = strip(((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '').replace(/<\/span>\s*<span class="game__l2">/, '\u0001')).replace(/\s*\u0001\s*/, '\n');
    const desc = strip((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
    const spec = card.pic || (guideCoverSpec(card.id) ? (guideCoverSpec(card.id).view ? { view: guideCoverSpec(card.id).view } : { vials: guideCoverSpec(card.id).vials }) : { view: 'r4' });
    await tab.setContent(page({ lang: l.htmlLang, title: h1, line: firstLine(desc), url: host, pic: await picture(spec, code) }), { waitUntil: 'load' });
    await tab.evaluate(async () => {
      await document.fonts.ready;
      // the title shrinks until it fits above the line
      const h = document.querySelector('h1'), c = document.querySelector('.copy');
      let size = 92;
      while ((h.scrollWidth > h.clientWidth + 1 || c.scrollHeight > c.clientHeight + 1) && size > 44) h.style.fontSize = `${(size -= 4)}px`;
    });
    const out = path.join(OUT, `${card.id}${code === cfg.defaultLocale ? '' : `-${code}`}.jpg`);
    await writeFile(out, await tab.screenshot({ type: 'jpeg', quality: 86 }));
    n++;
    console.log('  wrote', path.relative(ROOT, out));
  }
}
await browser.close();
console.log(`\n${n} share cards. Run npm run build again to publish them.`);
