import { html, esc, attrs } from '../lib/html.js';
import PANELS from '../config/panels.js';

/* Icons ---------------------------------------------------------------------
   One 24px line set, 1.5 stroke, drawn for ENDSHIFT. Referenced via <use>. */

const ICONS = {
  menu: '<path d="M3.5 9h17M3.5 15h17"/>',
  music: '<path d="M9 17.5V5.5l11-2v12"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="15.5" r="2.5"/>',
  chevron: '<path d="M6 9.5l6 6 6-6"/>',
  edit: '<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M14.5 7.5l2 2"/>',
  print: '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8.5" rx="1.5"/><path d="M7 14h10v6.5H7z"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M5 19.5h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  bus: '<path d="M6 17V5.5A2.5 2.5 0 0 1 8.5 3h7A2.5 2.5 0 0 1 18 5.5V17"/><path d="M5 17h14M6 11h12M7.5 20v-3M16.5 20v-3"/><path d="M8.5 14h.01M15.5 14h.01"/>',
  bag: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8.5 7V5.5A2.5 2.5 0 0 1 11 3h2a2.5 2.5 0 0 1 2.5 2.5V7M3 12.5h18M10 12.5v2h4v-2"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
  receipt: '<path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21z"/><path d="M9 8h6M9 11.5h6M9 15h3.5"/>',
  laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19.5h20"/>',
  moon: '<path d="M19.5 14.2A7.8 7.8 0 1 1 9.8 4.5a6.2 6.2 0 0 0 9.7 9.7z"/>',
  notebook: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3M5 7H3.5M5 12H3.5M5 17H3.5"/>',
  shirt: '<path d="M8.5 3.5 4 6l1.8 4L8 9.2V20.5h8V9.2l2.2.8L20 6l-4.5-2.5a3.5 3.5 0 0 1-7 0z"/>',
  glass: '<path d="M6 3h12l-1.6 16.6a1.5 1.5 0 0 1-1.5 1.4H9.1a1.5 1.5 0 0 1-1.5-1.4z"/><path d="M6.6 9h10.8"/>',
  lamp: '<path d="M8 3h8l3.5 8h-15z"/><path d="M12 11v8M8 21h8"/>',
  dnd: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
  breath: '<path d="M3 9h10.5a2.75 2.75 0 1 0-2.75-2.75"/><path d="M3 15h13.5a2.75 2.75 0 1 1-2.75 2.75"/><path d="M3 12h16.5"/>',
  book: '<path d="M3.5 5.5A1.5 1.5 0 0 1 5 4h5a2 2 0 0 1 2 2v14a1.5 1.5 0 0 0-1.5-1.5h-7z"/><path d="M20.5 5.5A1.5 1.5 0 0 0 19 4h-5a2 2 0 0 0-2 2v14a1.5 1.5 0 0 1 1.5-1.5h7z"/>',
  check: '<path d="M4.5 12.5 9.5 17.5 19.5 7"/>',
  x: '<path d="M7 7l10 10M17 7 7 17"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.01"/>',
  alert: '<path d="M12 3.5 21.5 20h-19z"/><path d="M12 10v4.5M12 17.3v.01"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  pause: '<path d="M9 5.5v13M15 5.5v13"/>',
  next: '<path d="M6 5.5 15 12l-9 6.5z"/><path d="M18.5 5.5v13"/>',
  prev: '<path d="M18 5.5 9 12l9 6.5z"/><path d="M5.5 5.5v13"/>',
  restart: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4v4h4"/>',
  sound: '<path d="M4 9.5v5h3.5L12.5 19V5L7.5 9.5z"/><path d="M16 9.2a4 4 0 0 1 0 5.6M18.6 6.6a7.6 7.6 0 0 1 0 10.8"/>',
  mute: '<path d="M4 9.5v5h3.5L12.5 19V5L7.5 9.5z"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/>',
  voice: '<path d="M4.5 5.5h15v10h-8l-4.5 3.5v-3.5h-2.5z"/><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01"/>',
  share: '<path d="M12 3.5v11.5M8 7.5l4-4 4 4"/><path d="M5 12.5v6A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5v-6"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5V6A2.5 2.5 0 0 0 13 3.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/>',
  external: '<path d="M14 4h6v6M20 4l-8.5 8.5"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  shower: '<path d="M4 21V8a4 4 0 0 1 8 0"/><path d="M8.5 8h7"/><path d="M10 12v.8M13 12v.8M16 12v.8M11.5 15.5v.8M14.5 15.5v.8M13 19v.8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  person: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20.5a7 7 0 0 1 14 0"/>',
  vote: '<path d="M4 13.5h16v6H4z"/><path d="M8 13.5 12.5 4l5 2.3-3.4 7.2"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h6M7 14h10"/><circle cx="17" cy="9" r="1"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
  power: '<path d="M12 3v9"/><path d="M6.6 6.6a7.5 7.5 0 1 0 10.8 0"/>',
};

export const sprite = () =>
  html`<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${Object.entries(ICONS).map(
    ([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`,
  )}</defs></svg>`;

export const icon = (name, cls = '') =>
  `<svg class="icon${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;

/** Brand mark: a light sitting on the horizon. */
export const mark = (cls = 'wordmark__mark') =>
  `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5.5 16.25a6.5 6.5 0 0 1 13 0z" fill="var(--tungsten)"/><path d="M2 19.25h20" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>`;

/* Buttons --------------------------------------------------------------------- */

export function btn({ href, label, variant = 'primary', size, track, trackId, external, iconName, cls = '', attr = {} }) {
  const classes = ['btn', `btn--${variant}`, size ? `btn--${size}` : '', cls].filter(Boolean).join(' ');
  const a = attrs({
    href,
    class: classes,
    'data-track': track || (trackId ? 'cta_click' : null),
    'data-track-id': trackId,
    target: external ? '_blank' : null,
    rel: external ? 'noopener' : null,
    ...attr,
  });
  return `<a ${a}>${iconName ? icon(iconName) : ''}<span>${label}</span></a>`;
}

/* The work-mode switch -----------------------------------------------------------
   One wall rocker, three sizes: in the opening (cloned by intro.js), in the home hero and
   in the header of every page. Its look follows html[data-shift] (set before first paint);
   shift.js keeps aria-checked in step and handles click, drag and keys. */
export function wallSwitch(ctx, { source = 'hero', cls = '' } = {}) {
  const t = ctx.ui.shift;
  return `<button class="wallswitch${cls ? ' ' + cls : ''}" type="button" role="switch" aria-checked="true" aria-label="${esc(t.name)}" title="${esc(t.toOff)}" data-shift-switch data-source="${esc(source)}"><span class="wallswitch__glow" aria-hidden="true"></span><span class="wallswitch__plate" aria-hidden="true"><span class="wallswitch__mark wallswitch__mark--on">${t.markOn}</span><span class="wallswitch__well"><span class="wallswitch__rocker"><span class="wallswitch__half wallswitch__half--top"></span><span class="wallswitch__half wallswitch__half--bot"></span><span class="wallswitch__led"></span></span></span><span class="wallswitch__mark wallswitch__mark--off">${t.markOff}</span></span></button>`;
}

// Two versions of a label; CSS shows the one that matches work mode on / off.
export const shiftLabel = (on, off) => `<span class="if-on">${on}</span><span class="if-off">${off}</span>`;

export const chip = (label, variant = '') => `<span class="chip${variant ? ' chip--' + variant : ''}">${label}</span>`;

export const notice = (body, { loud = false, iconName = 'info', cls = '' } = {}) =>
  html`<div class="notice${loud ? ' notice--loud' : ''}${cls ? ' ' + cls : ''}" role="note">${icon(iconName)}<div>${body}</div></div>`;

/* Product-state aware actions ------------------------------------------------- */

export function batchAction(ctx, { location = 'unknown', variant = 'primary', size } = {}) {
  const { state, cfg, ui } = ctx;
  if (state.action === 'preorder' || state.action === 'buy') {
    return btn({
      href: cfg.checkout.url,
      label: state.action === 'preorder' ? ui.cta.batchPreorder : ui.cta.batchInStock,
      variant,
      size,
      track: state.action === 'preorder' ? 'preorder_click' : 'checkout_initiated',
      trackId: location,
      attr: { rel: 'noopener' },
    });
  }
  const label = state.action === 'updates' ? ui.cta.batchProduction : ui.cta.batchConcept;
  return btn({ href: ctx.url('batch', { hash: 'join' }), label, variant, size, trackId: `batch_${location}` });
}

/* Email capture ---------------------------------------------------------------- */

let formSeq = 0;
export function signupForm(ctx, { source, list = 'batch-001', submit, note, label, reward, doneTitle, doneText, fields = '', variant = 'primary' } = {}) {
  const { ui } = ctx;
  const id = `signup-${source || ++formSeq}`;
  const extra = attrs({ 'data-reward': reward, 'data-done-title': doneTitle, 'data-done-text': doneText });
  return html`<form class="signup" data-signup data-list="${esc(list)}" data-source="${esc(source)}"${extra ? ' ' + extra : ''} novalidate>
    <label class="label signup__label" for="${id}">${label || ui.signup.label}</label>
    <div class="signup__row">
      <input class="input" id="${id}" name="email" type="email" inputmode="email" autocomplete="email" placeholder="${esc(ui.signup.placeholder)}" required aria-describedby="${id}-note ${id}-status">
      <button class="btn btn--${variant}" type="submit">${submit || ui.signup.submit}</button>
    </div>
    ${fields}
    <div class="hp-field" aria-hidden="true"><label for="${id}-hp">Leave empty</label><input id="${id}-hp" name="company" type="text" tabindex="-1" autocomplete="off"></div>
    <p class="signup__note" id="${id}-note">${note || ui.signup.note} <a class="link" href="${ctx.url('privacy')}">${ui.nav.privacy}</a>.</p>
    <p class="form-status" id="${id}-status" role="status" aria-live="polite"></p>
  </form>`;
}

/* Founding-batch meter ----------------------------------------------------------- */

export function meter(ctx, { id = 'meter' } = {}) {
  const { state, ui, cfg } = ctx;
  const label = state.counterKind === 'list' ? ui.meter.listLabel : ui.meter.foundersLabel;
  const pct = state.pct.toFixed(1);
  // While the list is small, a near-zero number says "nobody wants this": lead with the next free number instead.
  const from = cfg.batch.showCountFrom || 0;
  const early = state.founderCount < from;
  const next = String(state.founderCount + 1).padStart(3, '0');
  return html`<div class="meter" data-meter data-goal="${state.founderGoal}" data-from="${from}" data-early="${early ? 1 : 0}">
    <div class="meter__early">
      <p class="meter__next"><span class="meter__no">Nº</span> <span data-founder-next>${next}</span></p>
      <p class="meter__label">${ui.meter.early(state.founderGoal)}</p>
    </div>
    <div class="meter__live">
      <p class="meter__count" aria-hidden="true"><span class="meter__num" data-founder-count>${state.founderCount}</span><span class="meter__goal">/ ${state.founderGoal}</span></p>
      <p class="meter__label" id="${id}-label"><span class="visually-hidden">${state.founderCount} / ${state.founderGoal}: </span>${label(state.founderCount, state.founderGoal)}</p>
      <div class="meter__bar" role="progressbar" aria-labelledby="${id}-label" aria-valuemin="0" aria-valuemax="${state.founderGoal}" aria-valuenow="${state.founderCount}" style="--pct:${pct}%">
        <span class="meter__fill"></span><span class="meter__ticks"></span>
      </div>
      <div class="meter__scale" aria-hidden="true"><span>0</span><span>${Math.round(state.founderGoal / 3)}</span><span>${Math.round((state.founderGoal * 2) / 3)}</span><span>${state.founderGoal}</span></div>
      ${cfg.batch.countUpdated ? `<p class="meter__source">${ui.meter.source(ctx.fmt.date(cfg.batch.countUpdated))}</p>` : ''}
    </div>
  </div>`;
}

/* Ritual dial ------------------------------------------------------------------- */

const polar = (cx, cy, r, deg) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
};

const arc = (cx, cy, r, a0, a1) => {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

/** steps: [{ minute, duration (seconds) }]. Draws one arc per step, scaled to its duration. */
export function dial(steps, { time = '20:00', caption = '', labels = true, id = 'dial' } = {}) {
  const total = steps.reduce((s, x) => s + x.duration, 0);
  const cx = 140;
  const cy = 140;
  const r = 104;
  const gap = 2.4;
  let acc = 0;
  const segs = steps.map((st, i) => {
    const a0 = (acc / total) * 360 + gap / 2;
    acc += st.duration;
    const a1 = (acc / total) * 360 - gap / 2;
    const d = arc(cx, cy, r, a0, a1);
    const startDeg = a0 - gap / 2;
    const [tx0, ty0] = polar(cx, cy, r + 9, startDeg);
    const [tx1, ty1] = polar(cx, cy, r + 15, startDeg);
    const [lx, ly] = polar(cx, cy, r + 27, startDeg);
    return `<g class="dial__seg" data-seg="${i}"><path class="dial__track" d="${d}"/><path class="dial__fill" d="${d}" pathLength="1"/>${
      labels
        ? `<line class="dial__tick" x1="${tx0.toFixed(1)}" y1="${ty0.toFixed(1)}" x2="${tx1.toFixed(1)}" y2="${ty1.toFixed(1)}"/><text class="dial__label" x="${lx.toFixed(1)}" y="${(ly + 4.5).toFixed(1)}" text-anchor="middle">${String(st.minute).padStart(2, '0')}</text>`
        : ''
    }</g>`;
  });
  return html`<div class="dial" id="${id}">
    <svg viewBox="0 0 280 280" aria-hidden="true" focusable="false">${segs}</svg>
    <div class="dial__center"><p class="dial__time" data-dial-time>${time}</p><p class="dial__caption" data-dial-caption>${caption}</p></div>
  </div>`;
}

/* A panel: a shot of one of the ENDSHIFT rooms (drawn in the browser by story.js), with a
   drawn-in-CSS stand-in for browsers without WebGL. A clip or still can replace any shot:
   put its URL in cfg.story.media[view] (see README, "Story media"). */
// The drawn poster for a panel (src/config/panels.js): under the live drawing while it loads,
// and the picture itself where 3D can't run.
export function panelPoster(ctx, view, { sizes = '100vw', eager = false } = {}) {
  if (!PANELS.views.includes(view)) return '';
  const base = `assets/img/panels/${view}${ctx.locale === 'bg' && PANELS.bg.includes(view) ? '-bg' : ''}`;
  const set = PANELS.w.map((w) => `${ctx.asset(`${base}-${w}.webp`)} ${w}w`).join(', ');
  const big = PANELS.w[PANELS.w.length - 1];
  return `<img class="shot-poster" src="${ctx.asset(`${base}-${big}.webp`)}" srcset="${set}" sizes="${sizes}" width="${big}" height="${Math.round(big * PANELS.ratio)}" alt="" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}>`;
}

// For the head: preload a page's first poster, so the picture is there on the first paint and a
// page turn lands on a finished page (see layout.js, page.preload)
export function posterPreload(ctx, view, sizes = '100vw') {
  if (!PANELS.views.includes(view)) return null;
  const base = `assets/img/panels/${view}${ctx.locale === 'bg' && PANELS.bg.includes(view) ? '-bg' : ''}`;
  const big = PANELS.w[PANELS.w.length - 1];
  return { href: `${base}-${big}.webp`, srcset: PANELS.w.map((w) => `${ctx.asset(`${base}-${w}.webp`)} ${w}w`).join(', '), sizes };
}

/* The stamp: a time-card chip at the top of every page, in the film's own style ("19:25 · Home"),
   so each side of the site opens the same way: a stamp, then the title. `parts` are joined with
   a dot; a link makes it a way back to the page's section. */
export function pageStamp(parts, { href = '', cls = '' } = {}) {
  const inner = parts.filter(Boolean).map((t, i) => `${i ? '<span class="page-stamp__dot" aria-hidden="true">·</span>' : ''}<span>${t}</span>`).join('');
  return href ? `<a class="page-stamp ${cls}" href="${href}">${inner}</a>` : `<p class="page-stamp ${cls}">${inner}</p>`;
}

export function shot(ctx, view, { fallback = '', sizes = '100vw', eager = false } = {}) {
  const m = ctx.cfg.story?.media?.[view];
  const media = m
    ? /\.(mp4|webm)(\?|$)/i.test(m.src || m)
      ? `<video class="shot-media" src="${esc(m.src || m)}" muted autoplay loop playsinline preload="none" aria-hidden="true"></video>`
      : `<img class="shot-media" src="${esc(m.src || m)}" alt="" loading="lazy" decoding="async">`
    : '';
  const poster = m ? '' : panelPoster(ctx, view, { sizes, eager });
  return `<span class="shot-fb shot-fb--${view}${poster ? ' has-poster' : ''}" aria-hidden="true">${poster || fallback}</span>${m ? media : `<canvas class="shot" data-shot="${view}" aria-hidden="true"></canvas>`}`;
}

/* Photos of the jar --------------------------------------------------------------
   Concept images of the planned jar (packaging direction C) until real photos exist: WebP with
   a JPEG fallback, two sizes each, always captioned as concept images. */
const JAR_PHOTOS = { studio: { w: [640, 1136], r: 1408 / 1136 }, night: { w: [800, 1536], r: 1024 / 1536 } };
export function jarPhoto(ctx, name, { alt = '', sizes = '100vw', cls = '', caption = '', eager = false } = {}) {
  const P = JAR_PHOTOS[name];
  const base = `assets/img/photos/reset-jar-${name}`;
  const set = (ext) => P.w.map((w) => `${ctx.asset(`${base}-${w}.${ext}`)} ${w}w`).join(', ');
  const big = P.w[P.w.length - 1];
  return `<figure class="jar-photo jar-photo--${name}${cls ? ` ${cls}` : ''}"><picture><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img src="${ctx.asset(`${base}-${big}.jpg`)}" srcset="${set('jpg')}" sizes="${sizes}" width="${big}" height="${Math.round(big * P.r)}" alt="${esc(alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}></picture>${caption ? `<figcaption class="jar-photo__cap">${caption}</figcaption>` : ''}</figure>`;
}

/* The founder --------------------------------------------------------------------
   Name, photo, a line about their own shifts, a voice note, a video: each one shows up
   only once it's set in site.config.js (files in src/assets/founder/, see docs/FOUNDER.md). */

const byLocale = (v, locale) => (v && typeof v === 'object' ? v[locale] || v.en || null : v || null);

export function founderMedia(ctx) {
  const F = ctx.cfg.founder || {};
  const L = ctx.locale;
  const file = (f) => (f ? ctx.asset(`assets/founder/${f}`) : null);
  return {
    name: F.name || null,
    photo: file(F.photo),
    alt: byLocale(F.photoAlt, L) || '',
    line: byLocale(F.line, L),
    voice: file(byLocale(F.voice, L)),
    video: file(byLocale(F.video, L)),
    transcript: byLocale(F.transcript, L),
  };
}

/** The signature under the story; grows into a small founder block as things are added. */
export function founderBlock(ctx, sign) {
  const M = founderMedia(ctx);
  const U = ctx.ui.founder || {};
  if (!M.photo && !M.line && !M.voice && !M.video) return `<p class="founder__sign">${sign}</p>`;
  return html`<figure class="fblock">
    ${M.photo ? `<img class="fblock__photo" src="${esc(M.photo)}" alt="${esc(M.alt)}" loading="lazy" decoding="async">` : ''}
    <figcaption class="fblock__cap">
      <p class="founder__sign fblock__name">${sign}</p>
      ${M.line ? `<p class="fblock__line">${esc(M.line)}</p>` : ''}
      ${M.voice ? `<div class="fblock__voice" data-voice><button class="btn btn--ghost btn--sm" type="button" data-voice-play aria-pressed="false">${icon('play')}<span data-voice-label data-play="${esc(U.listen)}" data-pause="${esc(U.pause)}">${U.listen}</span></button><span class="fblock__bar" aria-hidden="true"><i data-voice-bar></i></span><audio preload="none" src="${esc(M.voice)}"></audio></div>` : ''}
      ${M.video ? `<video class="fblock__video" src="${esc(M.video)}" controls playsinline preload="none"${M.photo ? ` poster="${esc(M.photo)}"` : ''}></video>` : ''}
      ${M.transcript && (M.voice || M.video) ? `<details class="fblock__transcript"><summary>${U.transcript}</summary><p>${esc(M.transcript)}</p></details>` : ''}
    </figcaption>
  </figure>`;
}

/** A small round photo before the signature, when there is one. */
export function founderFace(ctx) {
  const M = founderMedia(ctx);
  return M.photo ? `<img class="founder__face" src="${esc(M.photo)}" alt="" loading="lazy" decoding="async">` : '';
}

/* Product concept render ---------------------------------------------------------- */

export function productRender(ctx, { caption = true } = {}) {
  const { ui, cfg, state } = ctx;
  const servings = cfg.product.servings;
  const svg = `<svg viewBox="0 0 300 420" role="img" aria-labelledby="bottle-title">
    <title id="bottle-title">${esc(state.packagingFinal ? ui.product.renderAlt : ui.product.renderAltConcept)}</title>
    <defs>
      <linearGradient id="b-body" x1="0" x2="1">
        <stop offset="0" stop-color="#2a2e31"/><stop offset=".18" stop-color="#1a1d20"/><stop offset=".7" stop-color="#121416"/><stop offset="1" stop-color="#1c1f22"/>
      </linearGradient>
      <linearGradient id="b-cap" x1="0" x2="1">
        <stop offset="0" stop-color="#34383b"/><stop offset=".5" stop-color="#202326"/><stop offset="1" stop-color="#2b2f32"/>
      </linearGradient>
      <linearGradient id="b-rim" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#f2a84b" stop-opacity="0"/><stop offset=".45" stop-color="#f2a84b" stop-opacity=".75"/><stop offset="1" stop-color="#f2a84b" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <ellipse cx="150" cy="402" rx="112" ry="10" fill="#000" opacity=".45"/>
    <rect x="86" y="30" width="128" height="62" rx="9" fill="url(#b-cap)"/>
    ${Array.from({ length: 15 }, (_, i) => `<path d="M${94 + i * 8} 36v50" stroke="#000" stroke-opacity=".28" stroke-width="2"/>`).join('')}
    <rect x="96" y="88" width="108" height="14" rx="3" fill="#15181a"/>
    <rect x="58" y="98" width="184" height="300" rx="30" fill="url(#b-body)"/>
    <rect x="70" y="112" width="10" height="250" rx="5" fill="#fff" opacity=".05"/>
    <rect x="236" y="130" width="3" height="240" rx="1.5" fill="url(#b-rim)"/>
    <rect x="58" y="168" width="184" height="168" fill="#efebe1"/>
    <path d="M76 200a14 14 0 0 1 28 0z" fill="#f2a84b"/>
    <path d="M72 204.5h36" stroke="#141617" stroke-width="2.5"/>
    <text x="226" y="202" text-anchor="end" class="bottle-label-small" font-size="12.5" fill="#141617">ENDSHIFT</text>
    <text x="74" y="274" class="bottle-label-word" font-size="76" fill="#141617" textLength="152" lengthAdjust="spacingAndGlyphs">RESET</text>
    <path d="M74 290h152" stroke="#141617" stroke-opacity=".25" stroke-width="1"/>
    <text x="74" y="310" class="bottle-label-small" font-size="11" fill="#141617">${esc(ui.product.labelLine1(servings))}</text>
    <text x="74" y="325" class="bottle-label-small" font-size="11" fill="#6a665e">${esc(ui.product.labelLine2)}</text>
  </svg>`;
  return html`<figure class="stage">
    <span class="stage__floor"></span>
    ${svg}
    ${caption ? `<figcaption class="stage__caption">${chip(state.packagingFinal ? ui.product.renderCaption : ui.product.renderCaptionConcept, state.packagingFinal ? '' : 'warm')}</figcaption>` : ''}
  </figure>`;
}

/* FAQ ---------------------------------------------------------------------------- */

export const faqList = (items, { prefix = 'faq' } = {}) =>
  html`<div class="faq">${items.map(
    (it) => html`<details class="faq__item" id="${prefix}-${it.id}" data-faq="${esc(it.id)}">
      <summary class="faq__q"><span>${it.q}</span><span class="faq__sign" aria-hidden="true"></span></summary>
      <div class="faq__a">${it.a}</div>
    </details>`,
  )}</div>`;

/* Specs / definition rows ------------------------------------------------------------ */

export const specs = (rows, cls = '') =>
  html`<dl class="specs${cls ? ' ' + cls : ''}">${rows
    .filter(Boolean)
    .map(([k, v]) => html`<div class="specs__row"><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>`;

/* Is / isn't ------------------------------------------------------------------------- */

export const isnt = ({ isTitle, isntTitle, is, isnt: not }) =>
  html`<div class="isnt">
    <div class="isnt__col"><h3 class="h3">${isTitle}</h3><ul class="isnt__list isnt__list--yes">${is.map((x) => `<li>${icon('check')}<span>${x}</span></li>`)}</ul></div>
    <div class="isnt__col"><h3 class="h3">${isntTitle}</h3><ul class="isnt__list isnt__list--no">${not.map((x) => `<li>${icon('x')}<span>${x}</span></li>`)}</ul></div>
  </div>`;

/* Time-card slips (recognition scenes) ----------------------------------------------- */

export const slips = (scenes, label) =>
  html`<ol class="slips" aria-label="${esc(label)}" tabindex="0">${scenes.map(
    (s) => html`<li><article class="slip">
      <p class="slip__time"><time>${s.time}</time></p>
      <p class="slip__place">${icon(s.icon)}<span>${s.place}</span></p>
      <p class="slip__text">${s.text}</p>
    </article></li>`,
  )}</ol>`;

/* Build timeline ----------------------------------------------------------------------- */

export function timelineList(ctx, entries, { compact = false, offset = 0, track = false, board = false } = {}) {
  const { ui, t } = ctx;
  return html`<ol class="timeline${compact ? ' timeline--compact' : ''}${board ? ' timeline--board' : ''}"${track ? ' data-progress="track"' : ''}>${entries.map((e, i) => {
    const n = String(offset + i + 1).padStart(2, '0');
    const statusChip =
      e.status === 'done' ? chip(ui.timeline.done, 'done') : e.status === 'now' ? chip(ui.timeline.now, 'now') : chip(ui.timeline.next);
    return html`<li class="timeline__item timeline__item--${e.status}"${track ? ' data-track-item' : ''}${board ? ` style="--i:${i}"` : ''}>
      ${board ? '<span class="pin" aria-hidden="true"></span>' : ''}<span class="timeline__idx" aria-hidden="true">${n}</span>
      <div class="timeline__head">
        <h3 class="timeline__title">${t(e.title)}</h3>
        <div>${statusChip}</div>
        ${e.date ? `<time class="timeline__date" datetime="${esc(e.date)}">${ctx.fmt.date(e.date)}</time>` : ''}
      </div>
      <div class="timeline__body">
        <p>${t(e.note)}</p>
        ${e.decision ? `<p class="timeline__decision"><span>${ui.timeline.decision}</span> ${t(e.decision)}</p>` : ''}
        ${e.media ? `<p><a class="link" href="${esc(e.media.url)}" target="_blank" rel="noopener" data-track="story_engage" data-track-id="media_${esc(e.id)}">${esc(e.media.label)}</a></p>` : ''}
      </div>
    </li>`;
  })}</ol>`;
}

/* Copyable email ---------------------------------------------------------------------- */

export const copyField = (ctx, value) =>
  html`<div class="copy-field"><a class="copy-field__value" href="mailto:${esc(value)}">${esc(value)}</a><button class="btn btn--quiet btn--sm" type="button" data-copy="${esc(value)}">${icon('copy')}<span>${ctx.ui.common.copy}</span></button></div>`;

/* Ingredients -------------------------------------------------------------------------- */

export function ingredientRow(ctx, ing, { compact = false } = {}) {
  const { ui, t, state, fmt } = ctx;
  const F = ui.formula;
  const statusChip = chip(F.status[ing.status] || ing.status, ing.status === 'included' ? 'live' : ing.status === 'undecided' ? '' : 'warm');
  const dose =
    state.formulaConfirmed && ing.dose != null
      ? `<p class="ingredient__dose">${esc(fmt.dose(ing))}${ing.nrvPercent ? ` <span class="muted small">${ing.nrvPercent}% ${F.nrv}</span>` : ''}</p>`
      : `<p class="ingredient__dose ingredient__dose--tbc">${F.doseTbc}</p>`;
  const name = t(ing.name) + (ing.form && state.formulaConfirmed ? ` <span class="muted small">(${esc(ing.form)})</span>` : '');
  if (compact) {
    return html`<article class="ingredient">
      <div class="ingredient__head"><h3 class="ingredient__name">${t(ing.name)}</h3><div>${statusChip}</div></div>
      <div><p>${t(ing.what)}</p>${dose}<p class="small" style="margin-top:var(--s-2)"><a class="link" href="${ctx.url('formula', { hash: `ing-${ing.id}` })}">${F.readMore}</a></p></div>
    </article>`;
  }
  const guide = ingredientGuide(ctx, ing.id);
  const claims = (ing.claims || []).filter((c) => c.verified && state.formulaConfirmed);
  const say = claims.length
    ? claims.map((c) => `<p class="claim">${t(c.text)}<span class="claim__cond">${t(c.condition)}</span></p>`).join('')
    : `<p>${(ing.claims || []).length ? F.claimPending : F.noClaim}</p>`;
  // what it is, why it's here, safety and the guide stay open; the claims and sources fold away
  return html`<article class="ingredient" id="ing-${esc(ing.id)}">
    <div class="ingredient__head"><h3 class="ingredient__name">${name}</h3><div>${statusChip}</div>${dose}</div>
    ${specs([
      [F.what, `<p>${t(ing.what)}</p>`],
      [ing.status === 'included' ? F.whyIncluded : F.whyCandidate, `<p>${t(ing.why)}</p>`],
      [F.safety, `<p>${t(ing.cautions)}</p>`],
      guide ? [F.guide, `<p><a class="link" href="${esc(guide.href)}" data-track="cta_click" data-track-id="formula_guide_${esc(ing.id)}">${guide.title}</a></p>`] : null,
    ])}
    <details class="ingredient__more">
      <summary>${F.claimsTitle}${icon('chevron')}</summary>
      ${specs([
        [F.say, say],
        [F.notPromise, `<p>${t(ing.notPromise)}</p>`],
        ing.readMore ? [F.readMore, `<p><a class="link" href="${esc(ing.readMore.url)}" target="_blank" rel="noopener">${esc(ing.readMore.label)}</a></p>`] : null,
      ])}
    </details>
  </article>`;
}

export const visibleIngredients = (ctx) => ctx.formula.ingredients.filter((i) => i.status !== 'removed');

/** A vial's glass, graduated, empty with a "?" until the dose is published (formula page, covers). */
export function vialGlass(ctx, ing, prefix = '') {
  const known = ctx.state.formulaConfirmed && ing.dose != null;
  const id = esc(prefix + ing.id);
  const ticks = Array.from({ length: 7 }, (_, k) => {
    const y = 186 - k * 22, long = k % 2 === 0;
    return `<path d="M${long ? 36 : 40} ${y}H47"/>`;
  }).join('');
  return `<svg class="vial__glass" viewBox="0 0 64 230" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="vc-${id}"><path d="M17 34H47V194A15 15 0 0 1 17 194Z"/></clipPath>
        <linearGradient id="vg-${id}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".22" stop-color="#fff" stop-opacity=".04"/><stop offset=".7" stop-color="#fff" stop-opacity=".02"/><stop offset="1" stop-color="#fff" stop-opacity=".16"/></linearGradient>
        <linearGradient id="vl-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffcf86"/><stop offset=".3" stop-color="#f2a84b"/><stop offset="1" stop-color="#b8701f"/></linearGradient>
      </defs>
      <ellipse class="vial__shadow" cx="32" cy="212" rx="20" ry="4"/>
      <g clip-path="url(#vc-${id})"><rect class="vial__liquid" x="10" y="34" width="44" height="180" fill="url(#vl-${id})"/></g>
      <path class="vial__tube" d="M14 30H50V194A18 18 0 0 1 14 194Z" fill="url(#vg-${id})"/>
      <g class="vial__ticks">${ticks}</g>
      <path class="vial__lip" d="M11 30H53"/>
      <rect class="vial__cork" x="18" y="4" width="28" height="30" rx="4"/>
      <path class="vial__cork-line" d="M20 13H44M20 22H44"/>
      <path class="vial__shine" d="M21 46V182"/>
      ${known ? '' : '<text class="vial__q" x="29" y="140" text-anchor="middle">?</text>'}
    </svg>`;
}

// Covers for the journal: a drawn room for the evening guides, the vials for the ingredient ones
const GUIDE_COVERS = {
  'guide-switch-off': { view: 'r4' },
  'guide-night-shift': { view: 'bus' },
  'guide-just-checking': { view: 'desk' },
  'guide-magnesium': { vials: ['magnesium'] },
  'guide-l-theanine': { vials: ['l-theanine'] },
  'guide-melatonin': { vials: ['melatonin'] },
  'guide-valerian-passionflower': { vials: ['valerian', 'passionflower'] },
};
export const guideCoverSpec = (id) => GUIDE_COVERS[id] || null;
export function guideCover(ctx, id, { sizes = '(min-width: 900px) 22rem, 92vw' } = {}) {
  const G = GUIDE_COVERS[id];
  if (!G) return '';
  if (G.view) return `<span class="cover cover--shot" aria-hidden="true">${panelPoster(ctx, G.view, { sizes })}</span>`;
  const ings = G.vials.map((v) => ctx.formula.ingredients.find((i) => i.id === v)).filter(Boolean);
  return `<span class="cover cover--vials" aria-hidden="true"><span class="cover__shelf"></span>${ings
    .map((ing) => `<span class="cover__vial">${vialGlass(ctx, ing, 'cv-')}<span class="cover__tag">${ctx.t(ing.name)}</span></span>`)
    .join('')}</span>`;
}

// The journal guide for an ingredient, when there is one (the guides link back to Formula)
const GUIDES = { magnesium: 'guide-magnesium', 'l-theanine': 'guide-l-theanine', melatonin: 'guide-melatonin', valerian: 'guide-valerian-passionflower', passionflower: 'guide-valerian-passionflower' };
export function ingredientGuide(ctx, id) {
  const page = GUIDES[id];
  const c = page && ctx.content[page];
  return c ? { href: ctx.url(page), title: c.title, page } : null;
}

/* Testimonials (real ones only; validated at build) --------------------------------------- */

export function testimonials(ctx, emptyText) {
  const list = ctx.cfg.socialProof.testimonials || [];
  if (!list.length) return `<p class="lead">${emptyText}</p>`;
  return html`<ul class="quotes">${list.map(
    (q) => html`<li><blockquote class="quote"><p>“${esc(q.quote)}”</p><footer>${esc(q.name)}, <time datetime="${esc(q.date)}">${ctx.fmt.date(q.date)}</time></footer></blockquote></li>`,
  )}</ul>`;
}
