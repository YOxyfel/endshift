import { html, esc, attrs, plain } from '../lib/html.js';
import { sprite, icon, mark, btn, wallSwitch, shiftLabel } from './components.js';

const NAV_MAIN = ['ritual', 'reset', 'batch', 'story', 'faq'];
const NAV_MENU = ['ritual', 'reset', 'batch', 'formula', 'story', 'faq', 'journal', 'contact'];
const FOOT = {
  explore: ['ritual', 'reset', 'batch', 'formula', 'story', 'journal'],
  help: ['faq', 'contact', 'shipping'],
  legal: ['privacy', 'terms', 'cookies'],
};

// pages that live under a section in the nav: that section stays marked while you're on them
const PARENT = { formula: 'reset', 'ritual-card': 'ritual' };

function navLink(ctx, id) {
  const pid = ctx.page.id;
  const current = pid === id ? 'page' : PARENT[pid] === id || (id === 'journal' && pid.startsWith('guide-')) ? 'true' : null;
  return `<a href="${ctx.url(id)}"${current ? ` aria-current="${current}"` : ''}>${ctx.ui.nav[id]}</a>`;
}

function langLinks(ctx) {
  return ctx.otherLocales
    .map(
      (l) =>
        `<a class="lang-link" href="${l.href}" hreflang="${esc(l.htmlLang)}" lang="${esc(l.htmlLang)}" data-track="language_switch" data-track-id="${esc(l.code)}"><span aria-hidden="true">${esc(l.label)}</span><span class="visually-hidden">${esc(l.name)}</span></a>`,
    )
    .join('');
}

const calmToggle = (ctx, extra = '') =>
  `<button class="calm-toggle${extra}" type="button" data-calm-toggle aria-pressed="false" title="${esc(ctx.ui.calm.hint)}"><span class="calm-toggle__switch" aria-hidden="true"></span><span class="calm-toggle__label">${ctx.ui.calm.label}</span></button>`;

export function header(ctx) {
  const { ui } = ctx;
  return html`<header class="site-header${ctx.page.solidHeader ? ' is-solid' : ''}" data-header>
    <div class="wrap site-header__inner">
      <a class="wordmark" href="${ctx.url('home')}" aria-label="${esc(ctx.cfg.brandName)}, ${esc(ui.nav.home)}">${mark()}<span>${esc(ctx.cfg.brandName)}</span></a>
      <nav class="site-nav" aria-label="${esc(ui.nav.label)}"><ul>${NAV_MAIN.filter((id) => id !== 'ritual' || ctx.page.id === 'ritual' || ctx.page.id === 'ritual-card').map((id) => `<li>${navLink(ctx, id)}</li>`)}</ul></nav>
      <div class="header-tools">
        <span class="hdr-switch">${wallSwitch(ctx, { source: 'header', cls: 'wallswitch--mini' })}<span class="hdr-switch__label" aria-hidden="true" data-shift-label>${shiftLabel(ui.shift.labelOn, ui.shift.labelOff)}</span></span>
        ${ctx.page.id !== 'ritual' ? `<button class="sound-toggle" type="button" data-sound-toggle aria-pressed="false" aria-label="${esc(ui.sound.label)}" title="${esc(ui.sound.hint)}"><span class="sound-toggle__off">${icon('mute')}</span><span class="sound-toggle__on">${icon('sound')}</span></button>` : ''}
        ${langLinks(ctx)}
        ${ctx.page.id !== 'ritual' ? btn({ href: ctx.url('ritual'), label: shiftLabel(ui.cta.ritualShort, ui.cta.ritualShortOff), size: 'sm', trackId: 'header', cls: 'header-cta' }) : ''}
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="menu" data-menu-toggle><span class="visually-hidden" data-menu-label>${ui.menu.open}</span>${icon('menu')}</button>
      </div>
    </div>
  </header>
  <div class="menu-panel" id="menu" hidden data-menu>
    <nav class="menu-panel__nav" aria-label="${esc(ui.nav.label)}"><ul>${NAV_MENU.map((id) => `<li>${navLink(ctx, id)}</li>`)}</ul></nav>
    <div class="menu-panel__foot">
      ${ctx.page.id !== 'ritual' ? btn({ href: ctx.url('ritual'), label: shiftLabel(ui.cta.ritual, ui.cta.ritualOff), size: 'xl', trackId: 'menu', cls: 'btn--wide' }) : ''}
      <div class="menu-panel__tools">${calmToggle(ctx)}${langLinks(ctx)}</div>
    </div>
  </div>`;
}

export function footer(ctx) {
  const { ui, cfg } = ctx;
  const c = cfg.company;
  const companyLine = c.legalName
    ? [c.legalName, c.uic ? `${ui.footer.uic} ${c.uic}` : null, c.vat ? `${ui.footer.vat} ${c.vat}` : null, c.address]
        .filter(Boolean)
        .map(esc)
        .join(', ')
    : ui.footer.companyPending;
  const col = (key) =>
    html`<div class="site-footer__col site-footer__col--${key}"><h2>${ui.footer[key]}</h2><ul>${FOOT[key].map((id) => `<li><a href="${ctx.url(id)}">${ui.nav[id]}</a></li>`)}</ul></div>`;
  const socials = [
    cfg.contact.instagram && { label: 'Instagram', href: `https://instagram.com/${encodeURIComponent(cfg.contact.instagram)}` },
    cfg.contact.tiktok && { label: 'TikTok', href: `https://www.tiktok.com/@${encodeURIComponent(cfg.contact.tiktok)}` },
  ].filter(Boolean);
  return html`<footer class="site-footer">
    <div class="wrap">
      <div class="site-footer__top">
        <div class="site-footer__brand">
          <a class="wordmark" href="${ctx.url('home')}">${mark()}<span>${esc(cfg.brandName)}</span></a>
          <p class="site-footer__line">${ui.footer.line}</p>
          ${socials.length ? `<ul class="site-footer__social">${socials.map((s) => `<li><a href="${s.href}" target="_blank" rel="noopener">${s.label}</a></li>`).join('')}</ul>` : ''}
        </div>
        ${col('explore')}${col('help')}${col('legal')}
      </div>
      <div class="site-footer__legal">
        <div class="site-footer__tools">${calmToggle(ctx)}${langLinks(ctx)}</div>
        <p>${ui.footer.disclaimer}</p>
        <p>${companyLine}</p>
        <p>© ${new Date().getFullYear()} ${esc(cfg.brandName)}. ${ui.footer.madeIn}</p>
      </div>
    </div>
  </footer>`;
}

function stickyCta(ctx) {
  // not where it would interrupt reading or a form: guides, legal pages, contact, the print card
  if (['ritual', '404', 'ritual-card', 'contact'].includes(ctx.page.id) || ['article', 'legal', 'cookies'].includes(ctx.page.template)) return '';
  const { ui } = ctx;
  return html`<div class="sticky-cta" data-sticky-cta aria-hidden="true">
    ${btn({ href: ctx.url('ritual'), label: shiftLabel(ui.cta.sticky || ui.cta.ritual, ui.cta.stickyOff || ui.cta.ritualOff), trackId: 'sticky', attr: { tabindex: '-1' } })}
    <a class="sticky-cta__link" href="${ctx.url('batch')}" tabindex="-1" data-track="cta_click" data-track-id="sticky_batch">${ui.nav.batch}</a>
  </div>`;
}

function consentBar(ctx) {
  const a = ctx.cfg.analytics;
  if (a.provider !== 'ga4') return '';
  const { ui } = ctx;
  return html`<div class="consent" data-consent hidden role="region" aria-label="${esc(ui.consent.title)}">
    <p>${ui.consent.text} <a class="link" href="${ctx.url('cookies')}">${ui.nav.cookies}</a></p>
    <div class="cta-row"><button class="btn btn--primary btn--sm" type="button" data-consent-choice="yes">${ui.consent.yes}</button><button class="btn btn--ghost btn--sm" type="button" data-consent-choice="no">${ui.consent.no}</button></div>
  </div>`;
}

function fontsHead(ctx) {
  if (ctx.fonts.local) {
    const pre = ctx.fonts.preload[ctx.locale === 'bg' ? 'cyrillic' : 'latin'];
    return `${pre ? `<link rel="preload" href="${ctx.asset(pre)}" as="font" type="font/woff2" crossorigin>` : ''}<link rel="stylesheet" href="${ctx.asset('assets/fonts/fonts.css')}">`;
  }
  return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sofia+Sans+Extra+Condensed:wght@500..900&family=Sofia+Sans:ital,wght@0,300..750;1,400..600&display=swap">`;
}

// Breadcrumbs for search results: ENDSHIFT › Journal › the guide, ENDSHIFT › Free ritual › the card
function breadcrumbs(ctx, page) {
  if (ctx.page.id === 'home' || ctx.page.noindex || ctx.mode !== 'prod') return null;
  const nav = ctx.ui.nav || {};
  const NAME = { ritual: nav.ritual, reset: nav.reset, batch: nav.batch, story: nav.story, formula: nav.formula, faq: nav.faq, journal: nav.journal, contact: nav.contact, shipping: nav.shipping, privacy: nav.privacy, terms: nav.terms, cookies: nav.cookies };
  const abs = (id) => `${ctx.cfg.siteUrl}${ctx.url(id)}`;
  const own = (NAME[ctx.page.id] || plain(page.title).replace(/\s*\|\s*ENDSHIFT$/, '')).trim();
  const parent = ctx.page.id.startsWith('guide-') ? 'journal' : ctx.page.id === 'ritual-card' ? 'ritual' : null;
  const items = [{ name: ctx.cfg.brandName, item: abs('home') }, ...(parent ? [{ name: NAME[parent], item: abs(parent) }] : []), { name: own, item: ctx.canonical }];
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.item })) };
}

function headTags(ctx, page) {
  const { cfg } = ctx;
  // A host that wraps the home page (artifact preview) lists it by this short name.
  const title = ctx.fragment ? `${cfg.brandName} Website` : page.title;
  const desc = plain(page.description);
  const ogImage = ctx.og || `${cfg.siteUrl}/assets/img/og.png`;
  const alternates = ctx.alternates
    .map((a) => `<link rel="alternate" hreflang="${esc(a.htmlLang)}" href="${esc(a.abs)}">`)
    .join('');
  const xDefault = ctx.alternates.find((a) => a.code === cfg.defaultLocale);
  return html`<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${ctx.page.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${esc(ctx.canonical)}">`}
${ctx.page.noindex ? '' : alternates}
${!ctx.page.noindex && xDefault && ctx.alternates.length > 1 ? `<link rel="alternate" hreflang="x-default" href="${esc(xDefault.abs)}">` : ''}
<meta name="theme-color" content="#0f1112">
<meta name="color-scheme" content="dark">
<meta property="og:site_name" content="${esc(cfg.brandName)}">
<meta property="og:type" content="${page.ogType || 'website'}">
<meta property="og:title" content="${esc(page.ogTitle || title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(ctx.canonical)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="${esc(ctx.localeInfo.ogLocale)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${ctx.asset('assets/img/favicon.svg')}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${ctx.asset('assets/img/apple-touch-icon.png')}">
<link rel="manifest" href="${ctx.asset('manifest.webmanifest')}">
${fontsHead(ctx)}
<link rel="stylesheet" href="${ctx.asset('assets/css/site.css')}">
${page.styles?.map((s) => `<link rel="stylesheet" href="${ctx.asset(`assets/css/${s}.css`)}">`)}
<script>${initScript(ctx)}</script>
${[...(page.jsonld || []), breadcrumbs(ctx, page)].filter(Boolean).map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`)}`;
}

// Runs before first paint. Sets low-stim / motion classes and, on the home page, decides
// whether the opening montage plays (first visit, motion allowed, no #hash; `?intro` replays it).
const initScript = (ctx) => {
  const home = ctx.page.id === 'home';
  // Active experiments: assign each visitor a variant before first paint (see site.config.js)
  const exps = Object.fromEntries(Object.entries(ctx.cfg.experiments || {}).filter(([, e]) => e.active && e.variants?.length > 1).map(([k, e]) => [k.toLowerCase(), e.variants]));
  const expJs = Object.keys(exps).length
    ? `try{var X=${JSON.stringify(exps)},E=JSON.parse(localStorage.getItem('es:exp')||'{}');for(var k in X){if(X[k].indexOf(E[k])<0)E[k]=X[k][Math.floor(Math.random()*X[k].length)];d.setAttribute('data-exp-'+k,E[k])}localStorage.setItem('es:exp',JSON.stringify(E))}catch(e){}`
    : '';
  // Work mode stays off for the rest of the evening: until 05:00 the next morning.
  return `(function(){var d=document.documentElement,c=false,s='x',m=false,o=false;d.classList.add('js');d.lang=${JSON.stringify(ctx.localeInfo.htmlLang)};try{c=localStorage.getItem('es:calm')==='on';s=localStorage.getItem('es:opening');if(s===null)localStorage.setItem('es:opening','${home ? 'played' : 'skipped'}');var w=JSON.parse(localStorage.getItem('es:shift')||'null');if(w&&w.off&&new Date(w.at-18e6).toDateString()===new Date(Date.now()-18e6).toDateString())o=true}catch(e){}d.setAttribute('data-shift',o?'off':'on');${expJs}if(c)d.setAttribute('data-calm','on');else if(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)){d.classList.add('motion-ok');m=true}${
    home && ctx.cfg.opening?.enabled !== false
      ? `var q=location.search,ad=(${ctx.cfg.opening?.skipForCampaigns === false ? 'false' : '/[?&](utm_[a-z]+|gclid|fbclid|ttclid|msclkid)=/.test(q)||!!(navigator.connection&&navigator.connection.saveData)'})||/[?&]confirmed=/.test(q);if(m&&((s===null&&!ad&&d.getAttribute('data-exp-opening')!=='none')||/[?&]intro\\b/.test(q))&&!location.hash&&window.HTMLCanvasElement)d.classList.add('intro-pending')`
      : ''
  }})();`;
};

function clientConfig(ctx, page) {
  const { cfg, ui } = ctx;
  const data = {
    locale: ctx.locale,
    htmlLang: ctx.localeInfo.htmlLang,
    page: ctx.page.id,
    forms: { endpoint: cfg.forms.endpoint },
    analytics: cfg.analytics,
    countEndpoint: cfg.batch.countEndpoint,
    urls: { ritual: ctx.url('ritual'), cookies: ctx.url('cookies'), batch: ctx.url('batch') },
    strings: { signup: ui.signup, toast: ui.toast, calm: ui.calm, sound: ui.sound, menu: ui.menu, shift: ui.shift, meter: { live: ui.meter.live }, joined: ui.joined },
    batch: { goal: cfg.batch.founderGoal },
    // the domain printed on the founder card (left off while it's still the placeholder)
    site: /\.example$/.test(String(cfg.siteUrl || '').replace(/\/$/, '')) ? '' : String(cfg.siteUrl || '').replace(/^https?:\/\//, '').replace(/\/$/, ''),
    shiftOut: cfg.shiftOut,
    sw: ctx.mode === 'prod' ? '/sw.js' : null,
    ...(page.client || {}),
  };
  return `<script type="application/json" id="es-config">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

export function renderDocument(ctx, page) {
  const body = html`<a class="skip-link" href="#main">${ctx.ui.skip}</a>
${sprite()}
${header(ctx)}
<main id="main" tabindex="-1" data-page="${esc(ctx.page.id)}">
${page.body}
</main>
${footer(ctx)}
${stickyCta(ctx)}
${consentBar(ctx)}
<div class="toast" data-toast role="status" aria-live="polite"></div>
<div class="grain" aria-hidden="true"></div>
${clientConfig(ctx, page)}
<script src="${ctx.asset('assets/js/site.js')}" defer></script>
${page.scripts?.map((s) => `<script src="${ctx.asset(`assets/js/${s}.js`)}" defer></script>`)}`;

  if (ctx.fragment) {
    // Preview build: the artifact host wraps this file in its own document skeleton.
    return `${headTags(ctx, page)}\n${body}\n`;
  }
  return `<!doctype html>
<html ${attrs({ lang: ctx.localeInfo.htmlLang, dir: 'ltr' })}>
<head>
${headTags(ctx, page)}
</head>
<body>
${body}
</body>
</html>
`;
}
