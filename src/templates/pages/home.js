import { html, esc } from '../../lib/html.js';
import { gameHero, gameClient, welcomeRow } from '../game.js';
import { film } from '../film.js';
import PANELS from '../../config/panels.js';
import { btn, chip, icon, dial, meter, signupForm, productRender, faqList, specs, isnt, slips, timelineList, batchAction, wallSwitch, shiftLabel, shot, jarPhoto, founderFace } from '../components.js';

export const lines = (x) => (Array.isArray(x) ? x.map((s) => `<span class="ln">${s}</span>`).join(' ') : x);

/** Ritual step preview: dial + expandable step list. Shared by home and the RESET page. */
export function ritualPreview(ctx, { source = 'home' } = {}) {
  const r = ctx.content.ritual;
  const h = ctx.content.home?.ritual || {};
  const mm = (m) => String(m).padStart(2, '0');
  return html`<div class="preview" data-preview>
    ${dial(r.steps, { time: '20:00', caption: h.dialCaption || '', id: `dial-${source}` })}
    <div>
      <h3 class="visually-hidden">${h.previewLabel || r.stepsTitle}</h3>
      <ol class="steps">
        ${r.steps.map(
          (s, i) => html`<li>
            <button class="step-btn" type="button" data-step="${i}" aria-expanded="${i === 0}" aria-controls="pv-${source}-${s.id}">
              <span class="step-btn__min">${mm(s.minute)}</span><span class="step-btn__title">${s.title}</span>
            </button>
            <p class="step-btn__body" id="pv-${source}-${s.id}"${i === 0 ? '' : ' hidden'}>${s.body}</p>
          </li>`,
        )}
        <li><div class="step-btn step-btn--end"><span class="step-btn__min">20</span><span class="step-btn__title">${r.done.title}</span></div></li>
      </ol>
      <div class="preview__cta">${btn({ href: ctx.url('ritual'), label: ctx.ui.cta.ritualLong, size: 'xl', trackId: `${source}_ritual` })}</div>
    </div>
  </div>`;
}

/** The hero with the switch (used when the game is off). */
function classicHero(ctx, pingTrack) {
  const c = ctx.content.home;
  const { ui } = ctx;
  return html`<section class="hero" data-hero aria-labelledby="hero-title">
  <div class="hero__work-light" aria-hidden="true"></div>
  <div class="wrap">
    <div class="lanes" aria-hidden="true">
      ${c.hero.pings.map((lane, i) => `<div class="lane"><div class="lane__track" data-lane="${i}">${pingTrack(lane)}${pingTrack(lane)}</div></div>`)}
    </div>
    <div class="hero__body">
      <div class="timecard-row">
        <div class="timecard">
          <button class="timecard__cell timecard__edit" type="button" data-out-edit aria-expanded="false" aria-controls="out-editor"><span class="timecard__k">${c.hero.outLabel}</span><span class="timecard__v">${shiftLabel(`<span data-out-time>${esc(c.hero.out)}</span>`, '<span data-off-time>--:--</span>')}</span>${icon('edit')}<span class="visually-hidden">${ui.shift.outEdit}</span></button>
          <span class="timecard__cell" aria-hidden="true"><span class="timecard__k">${c.hero.nowLabel}</span><span class="timecard__v timecard__v--now" data-clock data-out="${esc(c.hero.out)}">--:--</span></span>
        </div>
        <form class="out-editor" id="out-editor" data-out-editor hidden>
          <label class="label" for="out-time">${ui.shift.outLabel}</label>
          <div class="out-editor__row"><input class="input out-editor__time" id="out-time" type="time" step="300" value="${esc(c.hero.out)}" required><button class="btn btn--primary btn--sm" type="submit">${ui.shift.outSave}</button><button class="btn btn--ghost btn--sm" type="button" data-out-cancel>${ui.shift.outCancel}</button></div>
          <p class="small muted">${ui.shift.outHint}</p>
        </form>
      </div>
      <div class="hero__grid">
        <h1 class="hero__title display" id="hero-title">
          <span class="hero__line hero__line--done">${c.hero.line1}</span>
          <span class="hero__line hero__line--on"><span class="hero__echo" aria-hidden="true">${c.hero.line2}</span><span class="hero__echo" aria-hidden="true">${c.hero.line2}</span><span class="hero__line-text">${c.hero.line2}</span></span>
        </h1>
        <div class="hero__switchbox">
          ${wallSwitch(ctx, { source: 'hero', cls: 'wallswitch--hero' })}
          <div class="hero__switchcopy">
            <p class="hero__switch-line">${shiftLabel(ui.shift.lineOn, `<span data-off-line>${ui.shift.offEvening}</span>`)}</p>
            <p class="hero__switch-meta">${shiftLabel(ui.shift.hintOn, `<span data-off-at></span><button class="hero__remind link" type="button" data-shift-remind hidden></button>`)}</p>
          </div>
        </div>
        <div class="hero__actions">
          ${btn({ href: ctx.url('ritual'), label: shiftLabel(ui.cta.ritual, ui.cta.ritualOff), size: 'xl', trackId: 'hero_primary', cls: 'hero__cta' })}
          <p class="hero__more"><a class="link" href="${ctx.url('reset')}" data-track="cta_click" data-track-id="hero_secondary">${ui.cta.meet}</a><span class="hero__micro">${c.hero.micro}</span></p>
          ${welcomeRow(ctx)}
        </div>
        <p class="hero__sub">${c.hero.sub}</p>
      </div>
    </div>
  </div>
</section>`;
}

export default function home(ctx) {
  const c = ctx.content.home;
  const S = c.story;
  const { ui, cfg, state } = ctx;
  const faqAll = ctx.content.faq ? ctx.content.faq.groups.flatMap((g) => g.items) : [];
  const faqItems = c.faq.items || c.faq.ids.map((id) => faqAll.find((f) => f.id === id)).filter(Boolean);
  // Founder teaser: the step being worked on now, one before, one after.
  const tl = ctx.timeline;
  const nowIdx = Math.max(0, tl.findIndex((e) => e.status === 'now'));
  const start = Math.max(0, nowIdx - 1);
  const teaser = tl.slice(start, start + 3);

  const pingTrack = (lane) => lane.map((p, i) => `<span class="ping" style="--i:${i}">${p}</span>`).join('');
  const useGame = !!(cfg.game?.enabled && ctx.content.game);
  const goal = state.founderGoal;
  const founders = Math.min(state.founderCount, goal);

  const Q = c.inShort;
  const pageId = (to) => to.replace(/-/g, '_');
  // "Skip the walkthrough": every page as a bubble on a sphere. Positions are in % of the sphere's
  // width (cqw), so the layout works without JS; site.js only adds the lean towards the pointer.
  // d = diameter, dd = diameter when enlarged, (ix, iy) = the nudge towards the middle when
  // enlarged (so edge bubbles don't grow off the sphere), z = how much it leans (depth).
  const slot = (s) => {
    if (s === 'c') return { x: 50, y: 50, d: 29, dd: 39, ux: 0, uy: 0, ix: 0, iy: 0, z: 1 };
    const a = (-90 + s * 45) * (Math.PI / 180);
    const even = s % 2 === 0;
    const r = even ? 34 : 36.5;
    const ux = Math.cos(a), uy = Math.sin(a);
    const f = (n) => +n.toFixed(2);
    return { x: f(50 + r * ux), y: f(50 + r * uy), d: even ? 21.5 : 19.5, dd: even ? 36 : 35, ux: f(ux), uy: f(uy), ix: f(-ux * 4), iy: f(-uy * 4), z: even ? 0.72 : 0.58 };
  };
  const orbit = (go) => html`<nav class="in-short__go" aria-labelledby="in-short-go">
        <h3 class="in-short__go-title" id="in-short-go">${go.title}</h3>
        <div class="orbit" data-orbit>
          <div class="orbit__glow" aria-hidden="true"></div>
          <svg class="orbit__wire" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><ellipse data-lat cx="50" cy="50" rx="48" ry="13"/><ellipse data-mer="0" cx="50" cy="50" rx="0.1" ry="48"/><ellipse data-mer="1" cx="50" cy="50" rx="27" ry="48"/><ellipse data-mer="2" cx="50" cy="50" rx="44" ry="48"/></svg>
          <ul class="orbit__list">${go.items.map((g) => {
            const p = slot(g.slot);
            return `<li class="orbit__item" data-orbit-item data-z="${p.z}" data-ux="${p.ux}" data-uy="${p.uy}" style="--x:${p.x};--y:${p.y}"><a class="orb${g.slot === 'c' ? ' orb--main' : ''}" style="--d:${p.d};--dd:${p.dd};--ix:${p.ix};--iy:${p.iy}" href="${ctx.url(g.to, { hash: g.hash })}" data-track="cta_click" data-track-id="in_short_go_${pageId(g.to)}${g.hash ? `_${g.hash}` : ''}"><span class="orb__name">${g.name}</span><span class="orb__text">${g.text}</span></a></li>`;
          })}</ul>
        </div>
      </nav>`;
  const body = html`
${useGame ? gameHero(ctx) : classicHero(ctx, pingTrack)}
<section class="in-short" id="in-short" aria-labelledby="in-short-title">
  <div class="wrap in-short__inner">
    <div class="in-short__head">
      <p class="in-short__kicker">${Q.kicker}</p>
      <h2 class="in-short__title" id="in-short-title">${Q.title}</h2>
      ${Q.go ? orbit(Q.go) : ''}
    </div>
    <div class="in-short__body">
      <ol class="in-short__list">${Q.items.map((it) => html`<li class="in-short__row"><span class="in-short__k">${it.k}</span><span class="in-short__v">${it.v}</span></li>`)}</ol>
      <div class="cta-row in-short__ctas">
        ${btn({ href: ctx.url('ritual'), label: shiftLabel(ui.cta.ritual, ui.cta.ritualOff), size: 'lg', trackId: 'in_short_ritual' })}
        ${state.checkoutLive ? batchAction(ctx, { location: 'in_short', variant: 'ghost', size: 'lg' }) : btn({ href: ctx.url('batch', { hash: 'join' }), label: ui.cta.batchConcept, variant: 'ghost', size: 'lg', trackId: 'in_short_batch' })}
      </div>
      ${useGame ? html`<div class="jobpick" data-jobpick>
        <p class="jobpick__q">${Q.jobQ}</p>
        <div class="jobpick__chips" role="group" aria-label="${esc(Q.jobQ)}">${Q.jobs.map(([id, label]) => `<button class="jobpick__chip" type="button" data-job="${id}" aria-pressed="false">${label}</button>`).join('')}</div>
        <p class="jobpick__hint" data-jobpick-hint data-saved="${esc(Q.jobSaved)}">${Q.jobHint}</p>
      </div>` : ''}
      <a class="in-short__film" href="#after-game" data-track="cta_click" data-track-id="in_short_film">${Q.film} <span aria-hidden="true">↓</span></a>
    </div>
  </div>
</section>
<div class="story" data-story>

${film(ctx)}

<section class="ch ch--reset" id="after-film" aria-labelledby="product-title">
  <div class="wrap reset__page">
    ${jarPhoto(ctx, 'studio', { alt: ui.product.photoStudioAlt, sizes: '(min-width: 900px) 44vw, 92vw', caption: ui.product.photoCaption, cls: 'reset__panel reset__photo' })}
    <div class="reset__text">
      <p class="cap cap--stamp">${S.reset.stamp}</p>
      <p class="reset__overline">${c.product.overline}</p>
      <h2 class="lettering reset__name" id="product-title">${c.product.name}</h2>
      <p class="lead reset__lead">${c.product.lead}</p>
      <div class="spec-sheet">
        ${specs(
          c.product.specs.map(([k, v]) =>
            k === c.product.specs[3][0] && !state.formulaConfirmed ? [k, `${v} ${chip(ui.common.notFinal, 'warm')}`] : [k, v],
          ),
        )}
      </div>
      <p class="status-line">${chip(ui.status[state.status], state.statusIndex > 0 ? 'live' : '')}<span>${ui.statusLine[state.status]}</span></p>
      <div class="cta-row reset__ctas">
        ${batchAction(ctx, { location: 'home_product' })}
        <a class="text-btn" href="${ctx.url('reset')}" data-track="cta_click" data-track-id="home_product_more">${c.product.seeMore}</a>
      </div>
    </div>
  </div>
</section>

<section class="ch ch--notmagic" aria-labelledby="notmagic-title">
  <div class="wrap">
    <p class="cap cap--stamp">${S.notMagic.stamp}</p>
    <h2 class="lettering nm__title" id="notmagic-title">${c.notMagic.title.map((l) => `<span class="ln">${l}</span>`)}</h2>
    <p class="lead nm__lead">${c.notMagic.lead}</p>
    <div class="nm__grid">
      <div class="nm__panel nm__panel--is"><h3 class="nm__h">${c.notMagic.isTitle}</h3><ul>${c.notMagic.is.map((x) => `<li>${icon('check')}<span>${x}</span></li>`)}</ul></div>
      <div class="nm__panel nm__panel--isnt"><h3 class="nm__h">${c.notMagic.isntTitle}</h3><ul>${c.notMagic.isnt.map((x) => `<li>${icon('x')}<span>${x}</span></li>`)}</ul></div>
    </div>
    <p class="cap cap--care">${icon('info')}<span>${c.notMagic.care}</span></p>
    <p class="nm__formula">${c.notMagic.formulaLine} <a class="link" href="${ctx.url('formula')}" data-track="cta_click" data-track-id="home_formula">${ui.cta.formula}</a></p>
  </div>
</section>

<section class="ch ch--batch" aria-labelledby="batch-title">
  <div class="wrap batch__page">
    <div class="batch__board">
      <p class="cap cap--stamp">${S.batch.stamp}</p>
      <div class="slots" aria-hidden="true" style="--goal:${goal}">${Array.from({ length: goal }, (_, i) => `<i${i < founders ? ' class="is-taken"' : ''}></i>`).join('')}</div>
      <p class="slots__legend">${state.founderCount < (cfg.batch.showCountFrom || 0) && S.batch.slotsEarly ? S.batch.slotsEarly(goal) : S.batch.slots(founders, goal)}</p>
      ${meter(ctx, { id: 'home-meter' })}
    </div>
    <div class="batch__text">
      <h2 class="lettering batch__title" id="batch-title">${c.batch.title}</h2>
      <p class="lead batch__lead">${c.batch.lead}</p>
      <ol class="how">${c.batch.how.map((s2) => html`<li class="how__item"><div><p class="how__title">${s2.title}</p><p class="how__text">${s2.text}</p></div></li>`)}</ol>
      ${state.checkoutLive
        ? html`<div class="cta-row">${batchAction(ctx, { location: 'home_batch', size: 'xl' })}</div>`
        : html`<div class="cap-box"><h3 class="cap-box__title">${c.batch.formTitle}</h3>${signupForm(ctx, { source: 'home-batch', submit: state.action === 'updates' ? ui.cta.batchProduction : ui.cta.batchConcept })}</div>`}
      <p class="batch__more"><a class="link" href="${ctx.url('batch')}" data-track="cta_click" data-track-id="home_batch_more">${c.batch.more}</a></p>
    </div>
  </div>
</section>

<section class="ch ch--founder" aria-labelledby="founder-title">
  <div class="wrap">
    <p class="cap cap--stamp">${S.founder.stamp}</p>
    <h2 class="lettering founder__title" id="founder-title">${c.founder.title}</h2>
    <ol class="fstrip">
      <li class="fpanel fpanel--ad"><div class="fpanel__shot" data-panel>${shot(ctx, 'ad', { sizes: '(min-width: 900px) 25vw, 90vw' })}</div><p class="cap">${c.founder.panels[0]}</p></li>
      <li class="fpanel fpanel--quote"><p class="cap">${c.founder.panels[1].lead}</p><p class="bubble bubble--say">${c.founder.panels[1].bubble}</p></li>
      <li class="fpanel fpanel--cap"><p class="cap cap--big">${c.founder.panels[2]}</p></li>
      <li class="fpanel fpanel--beat"><p class="lettering fpanel__beat">${c.founder.beat}</p><p class="cap">${c.founder.story[1]}</p><p class="founder__sign">${founderFace(ctx)}${c.founder.sign}</p></li>
    </ol>
    <div class="founder__after">
      ${timelineList(ctx, teaser, { compact: true, offset: start })}
      <div class="cta-row founder__ctas">${btn({ href: ctx.url('story'), label: ui.cta.follow, variant: 'ghost', trackId: 'home_follow' })}</div>
    </div>
  </div>
</section>

<section class="ch ch--letters" aria-labelledby="faq-title">
  <div class="wrap letters">
    <div class="letters__head">
      <p class="cap cap--stamp">${S.letters.stamp}</p>
      <h2 class="lettering letters__title" id="faq-title">${c.faq.title}</h2>
    </div>
    ${faqList(faqItems, { prefix: 'home-faq' })}
    <p class="letters__more"><a class="link" href="${ctx.url('faq')}">${ui.cta.allFaq}</a></p>
  </div>
</section>

<section class="ch ch--end" aria-labelledby="finale-title">
  <figure class="panel panel--bleed" data-panel>${shot(ctx, 'end')}</figure>
  <div class="ch__layer end__layer">
    <h2 class="lettering end__title" id="finale-title">${c.finale.title.map((l) => `<span class="ln">${l}</span>`)}</h2>
    <div class="cta-row end__ctas">
      ${btn({ href: ctx.url('ritual'), label: shiftLabel(ui.cta.ritual, ui.cta.ritualOff), size: 'xl', trackId: 'final_ritual' })}
      ${state.checkoutLive
        ? batchAction(ctx, { location: 'final', variant: 'ghost', size: 'xl' })
        : btn({ href: ctx.url('batch', { hash: 'join' }), label: ui.cta.joinBatch, variant: 'ghost', size: 'xl', trackId: 'final_batch' })}
    </div>
    <p class="end__mark" aria-hidden="true">${S.end.mark} <small>${S.end.sub}</small></p>
  </div>
</section>

</div>`;

  return {
    title: c.meta.title,
    description: c.meta.description,
    body,
    client: {
      // the opening: its scenes, and the drawn room for each (small and large)
      ...(c.intro
        ? {
            intro: {
              ...c.intro,
              stills: Object.fromEntries(
                c.intro.scenes
                  .filter((sc) => sc.view && PANELS.views.includes(sc.view))
                  .map((sc) => {
                    const base = `assets/img/panels/${sc.view}${ctx.locale === 'bg' && PANELS.bg.includes(sc.view) ? '-bg' : ''}`;
                    return [sc.view, { s: ctx.asset(`${base}-640.webp`), l: ctx.asset(`${base}-1280.webp`) }];
                  }),
              ),
            },
          }
        : {}),
      ...(useGame ? { game: gameClient(ctx) } : {}),
      // words on things in the rooms: the game's (per job) and the story's own
      story: {
        props: Object.assign({}, ...Object.values(ctx.content.game?.games || {}).map((g) => g.props || {}), S.props, {
          calendar: { title: S.film.calendar.title, sub: S.film.calendar.sub, days: S.film.calendar.days, times: c.recog.scenes.map((s) => s.time), places: c.recog.scenes.map((s) => s.place) },
        }),
        ad: S.ad,
        sponsored: S.sponsored,
        film: { breathIn: S.film.breathIn, breathOut: S.film.breathOut, step: S.film.ritual.step },
      },
    },
    styles: useGame ? ['game', 'story', 'film'] : ['story', 'film'],
    scripts: useGame ? ['ink', 'game', 'story'] : ['ink', 'story'],
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: cfg.brandName,
        url: cfg.siteUrl,
        logo: `${cfg.siteUrl}/assets/img/apple-touch-icon.png`,
        email: cfg.contact.email,
        ...(cfg.company.legalName ? { legalName: cfg.company.legalName } : {}),
      },
      { '@context': 'https://schema.org', '@type': 'WebSite', name: cfg.brandName, url: cfg.siteUrl, inLanguage: ctx.localeInfo.htmlLang },
    ],
  };
}
