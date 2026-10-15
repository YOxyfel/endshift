import { html, esc, attrs, plain } from '../lib/html.js';
import { sprite, icon, mark, btn, wallSwitch, shiftLabel, panelPoster, signupForm } from './components.js';

/* The ring: the site's pages in one fixed order, the same in the header, the menu, the footer and
   the bubble sphere, and the direction a page turn slides in (site.js, view transitions). A page
   under another (Formula under RESET, a guide under the Journal) sits just after its parent. */
export const RING = ['home', 'ritual', 'reset', 'formula', 'batch', 'story', 'journal', 'faq', 'contact', 'shipping', 'privacy', 'terms', 'cookies', 'system'];
export const ringIndex = (id) => {
  if (id === 'ritual-card') return RING.indexOf('ritual') + 0.5;
  if (id.startsWith('guide-')) return RING.indexOf('journal') + 0.5;
  const i = RING.indexOf(id);
  return i < 0 ? RING.length : i;
};
// the header's links (the ritual is the button beside them), the menu's, and the footer's columns
const NAV_MAIN = ['reset', 'batch', 'story', 'journal', 'faq'];
const NAV_MENU = ['ritual', 'reset', 'formula', 'batch', 'story', 'journal', 'faq', 'contact'];
const FOOT = {
  explore: ['ritual', 'reset', 'formula', 'batch', 'story', 'journal'],
  help: ['faq', 'contact', 'shipping'],
  legal: ['privacy', 'terms', 'cookies'],
};

// pages that live under a section in the nav: that section stays marked while you're on them
const PARENT = { formula: 'reset', 'ritual-card': 'ritual' };

function navLink(ctx, id, mark) {
  const pid = ctx.page.id;
  const current = pid === id ? 'page' : PARENT[pid] === id || (id === 'journal' && pid.startsWith('guide-')) ? 'true' : null;
  // (the mark under the current link has a name, so a page turn slides it to the next word)
  return `<a href="${ctx.url(id)}"${current ? ` aria-current="${current}"` : ''}>${ctx.ui.nav[id]}${current && mark ? '<i class="site-nav__mark" aria-hidden="true"></i>' : ''}</a>`;
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
      <nav class="site-nav" aria-label="${esc(ui.nav.label)}"><ul>${NAV_MAIN.map((id) => `<li>${navLink(ctx, id, true)}</li>`)}</ul></nav>
      <div class="header-tools">
        <span class="hdr-switch">${wallSwitch(ctx, { source: 'header', cls: 'wallswitch--mini' })}<span class="hdr-switch__label" aria-hidden="true" data-shift-label>${shiftLabel(ui.shift.labelOn, ui.shift.labelOff)}</span></span>
        ${langLinks(ctx)}
        ${ctx.page.id === 'ritual'
          ? btn({ href: '#ritual-start', label: `${shiftLabel(ui.cta.ritualShort, ui.cta.ritualShortOff)}<span class="if-here">${ui.cta.startNow}</span>`, size: 'sm', trackId: 'header_start', cls: 'header-cta', attr: { 'aria-current': 'page' } })
          : btn({ href: ctx.url('ritual'), label: shiftLabel(ui.cta.ritualShort, ui.cta.ritualShortOff), size: 'sm', trackId: 'header', cls: 'header-cta' })}
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

/* Where next: the same hand-off above the footer on every page, so each side of the site ends by
   turning to the next one (the next page on the ring, and the ritual, tonight). The home page ends
   on its own finale, the print card and the 404 have their own ways on. */
const NEXT = { ritual: 'reset', reset: 'formula', formula: 'batch', batch: 'story', story: 'journal', journal: 'faq', faq: 'contact', contact: 'home', shipping: 'faq', privacy: 'faq', terms: 'faq', cookies: 'privacy' };
// the scene each side opens on, dimmed behind its card (the legal pages have none: a plain card)
const SCENE = { home: 'hall', ritual: 'r4', reset: 'jarWide', formula: 'jar', batch: 'racks', story: 'build', journal: 'lineEve', faq: 'bed', contact: 'r1' };
export function whereNext(ctx) {
  const pid = ctx.page.id;
  if (['home', 'ritual-card', '404', 'system'].includes(pid)) return '';
  const nextId = NEXT[pid] || (pid.startsWith('guide-') ? 'faq' : 'ritual');
  const { ui } = ctx;
  const N = ui.next;
  const go = ctx.content.home?.inShort?.go?.items || [];
  const line = (id) => N.lines[id] || (go.find((g) => g.to === id && !g.hash) || {}).text || '';
  const name = (id) => (id === 'home' ? N.home : ui.nav[id]);
  const card = (k, id, label) => {
    const view = SCENE[id];
    return `<li><a class="where-next__card${view ? ' where-next__card--scene' : ''}" href="${ctx.url(id)}" data-track="cta_click" data-track-id="next_${k}">${
      view ? `<span class="where-next__shot" aria-hidden="true">${panelPoster(ctx, view, { sizes: '(min-width: 640px) 50vw, 100vw' })}</span>` : ''
    }<span class="where-next__text"><span class="where-next__k">${label}</span><span class="where-next__name">${name(id)}</span><span class="where-next__line">${line(id)}</span></span></a></li>`;
  };
  return html`<nav class="where-next" aria-label="${esc(N.title)}">
    <div class="wrap where-next__inner">
      <p class="where-next__title">${N.title}</p>
      <ul class="where-next__list">
        ${card('ring', nextId, N.next)}
        ${nextId !== 'ritual' && pid !== 'ritual' ? card('ritual', 'ritual', shiftLabel(N.tonight, N.tonightOff)) : card('home', 'home', N.start)}
      </ul>
    </div>
  </nav>`;
}

/* Still on shift: the layer work mode uses while it's on (onshift.js draws the slips, the meeting
   and the rest into it). The 50% claim is real markup, so the site's form handling binds it. Not
   on the ritual, Contact, the legal pages, the print card or the design-system page. */
const ONSHIFT_OFF = ['ritual', 'ritual-card', 'contact', 'shipping', 'privacy', 'terms', 'cookies', 'system', '404'];
const onshiftOn = (ctx) => !!(ctx.content.onshift && ctx.cfg.onshift?.enabled && !ONSHIFT_OFF.includes(ctx.page.id));
function onshiftLayer(ctx) {
  if (!onshiftOn(ctx)) return '';
  const o = ctx.content.onshift;
  const R = ctx.cfg.onshift.reward;
  const cl = o.overtime.claim;
  const claim = R?.percent
    ? html`<div class="os-claim" data-os-claim hidden role="dialog" aria-modal="true" aria-labelledby="os-claim-title">
      <p class="os-claim__stamp" aria-hidden="true">${cl.stamp}</p>
      <h2 class="os-claim__title" id="os-claim-title" tabindex="-1">${cl.title}</h2>
      <p class="os-claim__text">${cl.text}</p>
      ${signupForm(ctx, { source: 'overtime', submit: cl.submit, label: cl.label, note: cl.note, reward: R.tag, doneTitle: cl.doneTitle, doneText: cl.doneText })}
      <p class="small muted os-claim__terms">${cl.terms} <a class="link" href="${ctx.url('terms', { hash: 'overtime' })}">${cl.termsLink}</a></p>
      <div class="cta-row"><button class="btn btn--ghost" type="button" data-os-clockout>${icon('power')}<span>${o.clockOut}</span></button></div>
    </div>`
    : '';
  return html`<div class="onshift" data-onshift hidden>${claim}</div>`;
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
${page.preload?.filter(Boolean).map((p) => `<link rel="preload" href="${ctx.asset(p.href)}" as="${p.as || 'image'}"${p.srcset ? ` imagesrcset="${p.srcset}" imagesizes="${p.sizes || '100vw'}"` : ''}>`)}
<link rel="stylesheet" href="${ctx.asset('assets/css/site.css')}">
${page.styles?.map((s) => `<link rel="stylesheet" href="${ctx.asset(`assets/css/${s}.css`)}">`)}
<link rel="expect" href="#es-end" blocking="render">
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
  // The turn (site.js): the side we come from left its place on the ring in sessionStorage;
  // compared with this side's place, that sets the direction the page slides (data-turn).
  // Where the side opens: a link opens it at the top; back, forward and reload where you left it
  // (site.js noted that under the history entry's key). The browser's own restoration is off, so
  // nothing else can carry a scroll position over; the place is set before the first paint
  // (pagereveal), and again at DOMContentLoaded and load unless you've already moved.
  const ring = ringIndex(ctx.page.id);
  const placeJs =
    "try{history.scrollRestoration='manual'}catch(e){}var nt='push',pk='';try{if(window.navigation&&navigation.activation)nt=navigation.activation.navigationType;else{var ne=performance.getEntriesByType('navigation')[0];nt=ne&&ne.type==='back_forward'?'traverse':ne&&ne.type==='reload'?'reload':'push'}if(window.navigation&&navigation.currentEntry&&navigation.currentEntry.key)pk=navigation.currentEntry.key}catch(e){}if(!pk)pk=location.pathname+location.search;var sp=0;if(nt==='traverse'||nt==='reload'){try{sp=+(JSON.parse(sessionStorage.getItem('es:pos')||'{}')[pk])||0}catch(e){}}var moved=false;['wheel','touchstart','keydown','pointerdown'].forEach(function(t){addEventListener(t,function(){moved=true},{passive:true,once:true})});var place=function(){if(moved||(location.hash&&nt!=='traverse'))return;if(Math.abs((window.pageYOffset||0)-sp)>1)window.scrollTo(0,sp)};var rv=0;addEventListener('pagereveal',function(){if(++rv===1)place()});addEventListener('DOMContentLoaded',place);addEventListener('load',place);";
  return `(function(){var d=document.documentElement,c=false,s='x',m=false,o=false;d.classList.add('js');d.lang=${JSON.stringify(ctx.localeInfo.htmlLang)};try{c=localStorage.getItem('es:calm')==='on';s=localStorage.getItem('es:opening');if(s===null)localStorage.setItem('es:opening','${home ? 'played' : 'skipped'}');var w=JSON.parse(localStorage.getItem('es:shift')||'null');if(w&&w.off&&new Date(w.at-18e6).toDateString()===new Date(Date.now()-18e6).toDateString())o=true}catch(e){}d.setAttribute('data-shift',o?'off':'on');${expJs}if(c)d.setAttribute('data-calm','on');else if(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)){d.classList.add('motion-ok');m=true}try{var R=JSON.parse(sessionStorage.getItem('es:ring')||'null');if(R&&Date.now()-R.at<6e4)d.setAttribute('data-turn',!m||R.r===${ring}?'same':R.r<${ring}?'next':'back')}catch(e){}${placeJs}${
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
    strings: { signup: ui.signup, toast: ui.toast, calm: ui.calm, menu: ui.menu, shift: ui.shift, meter: { live: ui.meter.live }, joined: ui.joined },
    batch: { goal: cfg.batch.founderGoal },
    // the domain printed on the founder card (left off while it's still the placeholder)
    site: /\.example$/.test(String(cfg.siteUrl || '').replace(/\/$/, '')) ? '' : String(cfg.siteUrl || '').replace(/^https?:\/\//, '').replace(/\/$/, ''),
    shiftOut: cfg.shiftOut,
    ...(onshiftOn(ctx) ? { onshift: { ...ctx.content.onshift, reward: cfg.onshift.reward || null } } : {}),
    sw: ctx.mode === 'prod' ? '/sw.js' : null,
    ...(page.client || {}),
  };
  return `<script type="application/json" id="es-config">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

export function renderDocument(ctx, page) {
  const body = html`<a class="skip-link" href="#main">${ctx.ui.skip}</a>
${sprite()}
${header(ctx)}
<main id="main" tabindex="-1" data-page="${esc(ctx.page.id)}" data-ring="${ringIndex(ctx.page.id)}">
${page.body}
</main>
${whereNext(ctx)}
${footer(ctx)}
${stickyCta(ctx)}
${onshiftLayer(ctx)}
${consentBar(ctx)}
<div class="toast" data-toast role="status" aria-live="polite"></div>
<div class="grain" aria-hidden="true"></div>
${clientConfig(ctx, page)}
<script src="${ctx.asset('assets/js/site.js')}" defer></script>
${page.scripts?.map((s) => `<script src="${ctx.asset(`assets/js/${s}.js`)}" defer></script>`)}
<span id="es-end" hidden></span>`;

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
