import { html, esc, plain } from '../../lib/html.js';
import { chip, icon, signupForm, panelPoster } from '../components.js';

const SERVICES = ['spotify', 'youtube', 'soundcloud', 'apple'];
// the room in four moments: clock out at the desk, the lamp, the window, the bed
const PEEK = [['r1', 'clock-out'], ['r4', 'lights'], ['r6', 'breathe'], ['r7', 'quiet']];
// each step's drawn room (the same rooms as the run and the home film)
const STEP_VIEW = { 'clock-out': 'r1', change: 'r2', water: 'r3', lights: 'r4', phone: 'r5', breathe: 'r6', quiet: 'r7' };

// The five minutes of breathing as one drawn line (the 20-minute plan at the default 4 in / 6 out):
// a few easy breaths, six cyclic sighs (two breaths in, one long breath out), slow even breaths,
// then letting go. x is time (1000 = 300 s), y is how full the lungs are (down = full).
const BREATH = (() => {
  const W = 1000, T = 300, X = (t) => +((t / T) * W).toFixed(1);
  const base = 112, Y = (v) => +(base - v * 96).toFixed(1); // v: 0 empty .. 1 full
  let t = 0, v = 0.1, d = `M0 ${Y(0.1)}`;
  const to = (dt, nv) => {
    const x0 = X(t), x1 = X(t + dt), k = (x1 - x0) * 0.42;
    d += ` C${(x0 + k).toFixed(1)} ${Y(v)} ${(x1 - k).toFixed(1)} ${Y(nv)} ${x1} ${Y(nv)}`;
    t += dt; v = nv;
  };
  const bounds = [0];
  for (let i = 0; i < 6; i++) { to(2.2, 0.42); to(2.8, 0.1); } // arrive: 30 s of easy breaths
  bounds.push(X(t));
  for (let i = 0; i < 6; i++) { to(2.5, 0.72); to(1, 0.92); to(6, 0.06); to(0.5, 0.06); } // sighs: in, top-up, long out
  bounds.push(X(t));
  for (let i = 0; i < 18; i++) { to(4, 0.68); to(6, 0.1); } // slow rhythm, 4 in / 6 out
  bounds.push(X(t));
  const amp = [0.38, 0.3, 0.24, 0.18, 0.14, 0.1];
  for (let i = 0; i < 6; i++) { to(2.1, 0.1 + amp[i]); to(2.9, 0.1); } // letting go: smaller and smaller
  bounds.push(W);
  const widths = bounds.slice(1).map((x, k) => +(x - bounds[k]).toFixed(1));
  return { d, bounds, widths };
})();

export default function ritual(ctx) {
  const r = ctx.content.ritual;
  const b = r.breath;
  const { ui } = ctx;
  const mm = (m) => String(m).padStart(2, '0');
  const totalFull = r.steps.reduce((s, x) => s + x.seconds.full, 0);
  // the phone reminder appears once the site has its push keys (site.config.js → push)
  const pushOn = !!(ctx.cfg.push?.publicKey && ctx.mode === 'prod');

  const m = r.setup.music;
  const music = ctx.music;
  const fill = (t, map) => String(t).replace(/\{(\w)\}/g, (_, k) => map[k] ?? '');
  const pick = (it, service, ours = false) =>
    html`<li><button type="button" class="pick" data-pick="${esc(it.url)}" data-pick-id="${esc(it.id || 'ours-' + service)}" data-pick-title="${esc(it.title)}" aria-pressed="false"><span class="pick__title">${esc(it.title)}</span><span class="pick__meta">${ours ? m.oursLabel : fill(m.by, { n: esc(it.by) })}${it.tag && m.tags[it.tag] ? ` · ${m.tags[it.tag]}` : ''}</span></button></li>`;
  const servicePanel = (service) => {
    const list = [...(music.ours[service] ? [pick(music.ours[service], service, true)] : []), ...music.recommended[service].map((it) => pick(it, service))];
    return html`<div class="service-panel" data-service-panel="${service}"${service !== 'spotify' ? ' hidden' : ''}>
      <p class="small muted service-panel__note">${m.serviceNotes[service]}</p>
      ${list.length ? `<p class="label">${m.recommendedTitle}</p><ul class="picks">${list.join('')}</ul>` : `<p class="small muted">${m.noneYet}</p>`}
    </div>`;
  };

  const sw = (id, s, checked = false) =>
    html`<label class="switch" for="set-${id}"><span class="switch__text"><span class="switch__title">${s.title}</span><span class="switch__hint">${s.hint}</span>${s.credit ? html`<span class="switch__credit">${s.credit}</span>` : ''}</span><input type="checkbox" id="set-${id}" name="${id}"${checked ? ' checked' : ''}></label>`;

  // "Now with narration": a hand-drawn arrow and a note pointing at Adjust (EN only; the script
  // decides when it shows, and it's gone once read aloud is on)
  const vn = r.setup.voiceNudge;
  const nudge = (where) =>
    vn
      ? html`<button class="nudge nudge--${where}" type="button" data-nudge hidden aria-label="${esc(vn.aria)}"><svg class="nudge__arrow" viewBox="0 0 64 72" aria-hidden="true" focusable="false"><path class="nudge__spark" d="M30 9 25 3M38 6V0M46 9l5-6"/><path class="nudge__line" pathLength="1" d="M8 64C23 67 39 52 38 17"/><path class="nudge__head" pathLength="1" d="M29 27 38 14l8 12"/></svg><span class="nudge__text" aria-hidden="true"><span class="nudge__big">${vn.big}</span><span class="nudge__small">${vn.small}</span><span class="nudge__stars"><i></i><i></i><i></i></span></span></button>`
      : '';

  const body = html`
<section class="ritual" data-ritual aria-labelledby="ritual-title">
  <div class="wrap">

    <div class="ritual__view" data-view="setup">
      <div class="door" data-door hidden>
        <p class="door__evening" data-door-evening></p>
        <button class="door__btn" type="button" data-act="door">
          <span class="door__cta">${r.setup.door.cta}</span>
          <span class="door__sum" data-door-sum></span>
        </button>
        <div class="door__more">
          <button class="text-btn" type="button" data-act="door-short">${r.setup.door.short}</button>
          <span class="nudge-anchor"><button class="text-btn" type="button" data-act="door-adjust">${r.setup.adjust}</button>${nudge('door')}</span>
        </div>
        <div class="tonight-slip" data-tonight-slip hidden></div>
      </div>
      <div class="ritual__hero">
        <div class="ritual__hero-main">
        <header class="ritual__intro">
          <h1 class="display ritual__title" id="ritual-title">${r.intro.title}</h1>
          <p class="lead ritual__lead">${r.intro.lead}</p>
          <ul class="ritual__facts">${r.intro.facts.map((f) => `<li>${chip(f)}</li>`)}</ul>
        </header>
        <div class="ritual__resume" data-resume hidden>
          ${icon('clock')}
          <p data-resume-text></p>
          <div class="cta-row"><button class="btn btn--primary btn--sm" type="button" data-resume-go>${r.setup.resume}</button><button class="btn btn--ghost btn--sm" type="button" data-resume-discard>${r.setup.discard}</button></div>
        </div>

        <form class="ritual__form" data-setup>
          <div class="quickstart" data-quickstart>
            <p class="quickstart__label" data-quick-label>${r.setup.quickReady}</p>
            <p class="quickstart__summary" data-quick-summary aria-live="polite"></p>
            <div class="tonight-slip" data-tonight-slip hidden></div>
            <div class="quickstart__row">
              <button class="btn btn--primary btn--xl ritual__start" type="submit">${icon('play')}<span>${r.setup.startNow}</span></button>
              <button class="btn btn--ghost btn--xl quickstart__adjust" type="button" data-adjust-toggle aria-expanded="false" aria-controls="ritual-adjust"><span data-adjust-label>${r.setup.adjust}</span></button>
            </div>
            ${nudge('qs')}
          </div>
          <div class="ritual__adjust" id="ritual-adjust" data-adjust>
          <fieldset class="choices">
            <legend>${r.setup.versionLegend} <span class="muted">${r.setup.versionHint}</span></legend>
            ${r.setup.versions.map((v, i) => `<label class="choice"><input type="radio" name="version" value="${v.id}"${i === 0 ? ' checked' : ''}><span>${v.label}</span></label>`)}
          </fieldset>
          <fieldset class="choices">
            <legend>${r.setup.contextLegend} <span class="muted">${r.setup.contextHint}</span></legend>
            ${r.setup.contexts.map((c) => `<label class="choice"><input type="radio" name="context" value="${c.id}"><span>${c.label}</span></label>`)}
          </fieldset>
          <fieldset class="choices">
            <legend>${r.setup.lengthLegend}</legend>
            ${r.setup.lengths.map((l, i) => `<label class="choice"><input type="radio" name="length" value="${l.id}"${i === 0 ? ' checked' : ''}><span>${l.label}</span></label>`)}
          </fieldset>
          <fieldset class="choices">
            <legend>${r.setup.paceLegend} <span class="muted">${r.setup.paceHint}</span></legend>
            ${b.paces.map((p) => `<label class="choice"><input type="radio" name="pace" value="${p.id}"${p.default ? ' checked' : ''}><span>${p.label}</span></label>`)}
          </fieldset>
          <fieldset class="choices soundpick" data-soundpick>
            <legend>${m.legend} <span class="muted">${m.hint}</span></legend>
            ${m.modes.map((x) => `<label class="choice"><input type="radio" name="music" value="${x.id}"${x.id === 'endshift' ? ' checked' : ''}><span>${x.label}</span></label>`)}
            <div class="soundpick__panel" data-music-panel="endshift">
              <p class="small muted">${m.endshiftNote}</p>
              <div class="variants" role="radiogroup" aria-label="${esc(m.variantsLabel)}">
                ${m.variants.map(
                  (v, i) =>
                    html`<div class="variant"><label class="variant__pick"><input type="radio" name="variant" value="${v.id}"${i === 0 ? ' checked' : ''}><span class="variant__name">${v.name}</span><span class="variant__hint">${v.hint}</span></label><button class="variant__listen" type="button" data-listen="${v.id}" aria-pressed="false"><span class="variant__eq" aria-hidden="true"><i></i><i></i><i></i></span><span data-listen-label>${m.listen}</span><span class="visually-hidden">: ${v.name}</span></button></div>`,
                )}
              </div>
            </div>
            <div class="soundpick__panel" data-music-panel="own" hidden>
              <div class="services" role="radiogroup" aria-label="${esc(m.servicesLabel)}">
                ${SERVICES.map((sv) => `<label class="service"><input type="radio" name="service" value="${sv}"${sv === 'spotify' ? ' checked' : ''}><span>${m.services[sv]}</span></label>`)}
              </div>
              ${SERVICES.map(servicePanel)}
              <div class="paste">
                <label class="label" for="music-url">${m.pasteLabel}</label>
                <div class="paste__row"><input class="input" id="music-url" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="${esc(m.pastePlaceholder)}"><button class="btn btn--quiet btn--sm" type="button" data-music-paste>${m.pasteBtn}</button></div>
                <p class="paste__error" data-paste-error hidden>${icon('alert')}<span>${m.pasteError}</span></p>
              </div>
              <p class="small muted soundpick__privacy"><span data-music-privacy>${fill(m.privacy, { s: m.services.spotify })}</span> <a class="link" href="${ctx.url('privacy', { hash: 'music' })}">${m.privacyLink}</a></p>
              ${sw('bells', m.bells, true)}
              ${sw('fade', m.fade, true)}
            </div>
          </fieldset>
          <div class="ritual__settings">
            <p class="label">${r.setup.settingsTitle}</p>
            ${sw('binaural', r.setup.settings.binaural)}
            ${sw('speak', r.setup.settings.speak)}
            ${sw('haptics', r.setup.settings.haptics, true)}
            ${sw('wake', r.setup.settings.wake, true)}
          </div>
          <button class="btn btn--primary btn--xl ritual__start" type="submit">${icon('play')}<span>${r.setup.start}</span></button>
          </div>
        </form>
          ${r.nearby ? html`<div class="nearby">
            <p class="nearby__title">${r.nearby.title}</p>
            <ul class="nearby__list">${r.nearby.items.map((it) => `<li>${icon(it.icon)}<span>${it.text}</span></li>`)}</ul>
          </div>` : ''}
        </div>
        <div class="ritual__hero-side">
          ${r.peek ? html`<figure class="room-peek" role="img" aria-label="${esc(r.peek.aria)}">
            <div class="room-peek__frame">${PEEK.map(([view, id], k) => {
              const st = r.steps.find((x) => x.id === id);
              return `<div class="room-peek__shot" style="--k:${k}">${panelPoster(ctx, view, { sizes: '(min-width: 960px) 46vw, 92vw', eager: k === 0 })}${st ? `<span class="room-peek__cap" aria-hidden="true"><b>${mm(st.minute)}</b> ${st.title}</span>` : ''}</div>`;
            }).join('')}</div>
            <figcaption class="room-peek__note">${r.peek.caption}</figcaption>
          </figure>` : ''}
        </div>
      </div>

      <div class="ritual__plan">
        <h2 class="section-title plan__head">${r.stepsTitle}</h2>
        <div class="dimrail" aria-hidden="true">
          <div class="dimrail__bar">${r.steps.map((s, k) => `<span class="dimrail__seg" style="--w:${s.seconds.full};--k:${k}"><b>${s.title}</b></span>`).join('')}</div>
          <div class="dimrail__ticks">${r.steps.map((s) => `<span style="--w:${s.seconds.full}">${mm(s.minute)}</span>`).join('')}<span class="dimrail__end">${mm(Math.round(totalFull / 60))}</span></div>
          ${r.railNote ? `<p class="dimrail__note">${r.railNote}</p>` : ''}
        </div>
        <ol class="board">
          ${r.steps.map(
            (s) => html`<li class="board__step${s.kind === 'breath' ? ' board__step--breath' : ''}">
            <figure class="board__frame">${STEP_VIEW[s.id] ? panelPoster(ctx, STEP_VIEW[s.id], { sizes: s.kind === 'breath' ? '(min-width: 1000px) 48vw, (min-width: 600px) 46vw, 8rem' : '(min-width: 1000px) 24vw, (min-width: 600px) 46vw, 8rem' }) : ''}<span class="board__min" aria-hidden="true">${mm(s.minute)}</span></figure>
            <div class="board__text">
              <h3 class="board__title"><span class="visually-hidden">${mm(s.minute)}: </span>${s.title}</h3>
              <p class="board__body">${s.body}</p>
            </div>
          </li>`,
          )}
        </ol>
        <div class="board__end">
          <p class="board__over"><span aria-hidden="true">${mm(Math.round(totalFull / 60))}</span> ${r.done.title}</p>
          <button class="btn btn--primary btn--lg board__start" type="button" data-act="door">${icon('play')}<span>${r.setup.start}</span></button>
          <p class="board__first">${r.setup.door.first}</p>
          ${r.cardLink ? `<p class="plan__card"><a class="link" href="${ctx.url('ritual-card')}" data-track="cta_click" data-track-id="ritual_card">${r.cardLink}</a></p>` : ''}
        </div>
      </div>
    </div>

    <div class="ritual__view ritual__done" data-view="done" hidden>
      <p class="done__stamp" aria-hidden="true"><span>${r.done.stamp}</span> <span data-done-time>--:--</span></p>
      <h2 class="display done__title" tabindex="-1" data-done-title>${r.done.title}</h2>
      <p class="lead done__lead"><span data-done-clocked></span> <span data-done-count></span></p>
      <div class="cta-row done__ctas">
        <button class="btn btn--primary" type="button" data-act="restart">${icon('restart')}<span>${r.done.restart}</span></button>
        <button class="btn btn--ghost" type="button" data-share data-share-url="${esc(ctx.canonical)}" data-share-text="${esc(r.done.shareText)}">${icon('share')}<span>${r.done.share}</span></button>
        <a class="text-btn" href="${ctx.url('reset')}" data-track="cta_click" data-track-id="ritual_done_reset">${r.done.seeReset}</a>
      </div>
      <div class="done__grid">
        <div class="done__block evlog" data-evlog>
          <h3 class="h3">${r.done.logTitle}</h3>
          <p class="evlog__month" data-evlog-month></p>
          <div class="evlog__grid" data-evlog-grid aria-hidden="true"></div>
          <p class="small muted">${r.done.logNote}</p>
        </div>
        <div class="done__block outcard" data-outcard>
          <h3 class="h3">${r.done.cardTitle}</h3>
          <p class="muted">${r.done.cardText}</p>
          <div class="outcard__preview" data-outcard-preview hidden><img alt="" data-outcard-img></div>
          <div class="cta-row">
            <button class="btn btn--primary" type="button" data-outcard-make>${icon('spark')}<span>${r.done.cardMake}</span></button>
            <button class="btn btn--ghost" type="button" data-outcard-share hidden>${icon('share')}<span>${r.done.cardShare}</span></button>
            <a class="btn btn--quiet" data-outcard-save hidden download="endshift-out.png" href="#">${icon('download')}<span>${r.done.cardSave}</span></a>
          </div>
        </div>
        <div class="done__block" data-install hidden>
          <h3 class="h3">${r.done.installTitle}</h3>
          <p class="muted">${r.done.installText}</p>
          <button class="btn btn--ghost" type="button" data-install-btn hidden>${r.done.installBtn}</button>
          <p class="small muted" data-install-ios hidden>${r.done.installIos}</p>
        </div>
        <div class="done__block">
          <h3 class="h3">${r.done.reminderTitle}</h3>
          <p class="muted">${r.done.reminderText}</p>
          <div class="reminder">
            <div class="field"><label class="label" for="reminder-time">${r.done.reminderTime}</label><input class="input reminder__time" id="reminder-time" type="time" value="18:00" data-reminder-time></div>
            <label class="reminder__check"><input type="checkbox" id="reminder-weekdays" data-reminder-weekdays> <span>${r.done.weekdays}</span></label>
            <button class="btn btn--quiet" type="button" data-act="ics">${icon('calendar')}<span>${r.done.reminderBtn}</span></button>
          </div>
          ${pushOn ? html`<div class="push" data-push hidden>
            <button class="btn btn--ghost" type="button" data-push-on>${icon('clock')}<span>${r.done.push.on}</span></button>
            <p class="push__set" data-push-set hidden>${icon('check')}<span data-push-text></span> <button class="link link-btn" type="button" data-push-off>${r.done.push.off}</button></p>
            <p class="small muted" data-push-note>${r.done.push.note}</p>
          </div>` : ''}
        </div>
        <div class="done__block">
          <h3 class="h3">${r.done.emailTitle}</h3>
          ${signupForm(ctx, { source: 'ritual-done', list: 'ritual', submit: ui.signup.submit, note: r.done.emailNote, fields: r.done.remindEmail ? `<label class="signup__remind"><input type="checkbox" name="remind_on" data-remind-email><span>${r.done.remindEmail}</span></label>` : '' })}
        </div>
      </div>
      <p class="small muted done__saved">${r.done.saved}</p>
    </div>
  </div>
</section>

<section class="section guide" aria-labelledby="guide-title" data-hide-sticky>
  <div class="wrap">
    <div class="guide__head">
      <h2 class="section-title" id="guide-title">${r.guide.title}</h2>
      <p class="lead section-lead">${r.guide.lead}</p>
    </div>
    <div class="guide__structure">
      <h3 class="h3">${r.guide.structureTitle}</h3>
      <figure class="breathline"${r.guide.lineAria ? ` role="img" aria-label="${esc(r.guide.lineAria)}"` : ''}>
        <svg class="breathline__svg" viewBox="0 0 1000 130" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          ${BREATH.bounds.slice(1, -1).map((x) => `<line class="breathline__cut" x1="${x}" x2="${x}" y1="6" y2="124"/>`).join('')}
          <path class="breathline__path" d="${BREATH.d}"/>
        </svg>
        <div class="breathline__labels" aria-hidden="true">${r.guide.structure.map((st, k) => `<span style="--w:${BREATH.widths[k]}"><b>${st.time}</b></span>`).join('')}</div>
      </figure>
      <ol class="guide__phases">
        ${r.guide.structure.map((st) => html`<li><span class="guide__time">${st.time}</span><div><p class="guide__phase">${st.title}</p><p>${st.text}</p></div></li>`)}
      </ol>
      <p class="care-note">${icon('info')}<span>${r.guide.safety}</span></p>
    </div>
    <ul class="guide__points">
      ${r.guide.points.map((pt) => html`<li class="guide__point"><h3>${pt.title}</h3><p>${pt.text}</p></li>`)}
    </ul>
  </div>
</section>

<section class="section why" aria-labelledby="why-title" data-hide-sticky>
  <div class="wrap why__grid">
    <div class="why__head">
      <h2 class="section-title" id="why-title">${r.why.title}</h2>
      ${r.why.body
        .map((p, k) => ({ p, about: (r.why.about || [])[k] }))
        .filter((x) => !x.about)
        .map((x, k) => `<p class="${k === 0 ? 'lead why__lead' : 'why__note'}">${x.p}</p>`)
        .join('')}
    </div>
    <div class="why__body">
      <ul class="findings">${r.why.body
        .map((p, k) => ({ p, about: (r.why.about || [])[k] }))
        .filter((x) => x.about)
        .map((x) => {
          const st = r.steps.find((s) => s.id === x.about);
          const tag = st ? `${icon(st.icon)}<span>${mm(st.minute)}</span> ${st.title}` : x.about === 'binaural' ? `${icon('sound')} ${r.setup.settings.binaural.title}` : '';
          return `<li class="finding"><p class="finding__tag">${tag}</p><p class="finding__text">${x.p}</p></li>`;
        })
        .join('')}</ul>
      <details class="why__sources">
        <summary>${r.why.sourcesTitle} <span class="muted">(${r.why.sources.length})</span></summary>
        <ol class="sources">${r.why.sources.map((src) => `<li>${src.text} <a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.url.replace('https://', ''))}</a></li>`)}</ol>
      </details>
    </div>
  </div>
</section>

<aside class="music-dock" data-music-dock hidden aria-label="${esc(m.dock.label)}">
  <div class="music-dock__bar">
    <span class="music-dock__eq" aria-hidden="true"><i></i><i></i><i></i></span>
    <p class="music-dock__title"><span class="music-dock__service" data-dock-service></span><span class="music-dock__name" data-dock-title></span></p>
    <button class="music-dock__btn" type="button" data-dock-toggle aria-expanded="true">${icon('chevron')}<span class="visually-hidden" data-dock-toggle-label>${m.dock.collapse}</span></button>
    <button class="music-dock__btn" type="button" data-dock-remove>${icon('x')}<span class="visually-hidden">${m.dock.remove}</span></button>
  </div>
  <p class="music-dock__note" data-dock-note hidden aria-live="polite"></p>
  <div class="music-dock__frame" data-dock-frame></div>
</aside>

<div class="immersive" data-immersive hidden role="dialog" aria-labelledby="im-title">
  <canvas class="immersive__dream" data-dream aria-hidden="true"></canvas>
  <canvas class="immersive__room" data-room aria-hidden="true"></canvas>
  <canvas class="immersive__canvas" data-canvas aria-hidden="true"></canvas>
  <div class="im-lids" data-lids aria-hidden="true"><i></i><i></i></div>
  <div class="immersive__intro" data-intro aria-hidden="true">
    <p class="im-stamp"><span>${r.run.stamp}</span> <span data-intro-time>--:--</span></p>
    <p class="im-intro-note" data-intro-note>${r.run.headphones}</p>
  </div>
  <div class="immersive__top">
    <ol class="im-pips" data-pips aria-hidden="true">${r.steps.map(() => '<li></li>').join('')}</ol>
    <p class="im-clock tabular" data-im-clock aria-hidden="true"></p>
    <p class="visually-hidden" data-im-count></p>
    <div class="im-top-actions">
      <button class="im-btn" type="button" data-act="sound" aria-pressed="true">${icon('sound')}<span class="visually-hidden">${r.run.sound}</span></button>
      <button class="im-btn im-btn--menu" type="button" data-act="menu" aria-expanded="false" aria-controls="im-menu"><span aria-hidden="true">•••</span><span class="visually-hidden">${r.run.menu}</span></button>
    </div>
  </div>
  <div class="im-menu" id="im-menu" data-menu hidden>
    <label class="im-menu__guide"><input type="checkbox" data-guide><span><span class="im-menu__title">${r.run.guide}</span><span class="im-menu__hint">${r.run.guideHint}</span></span></label>
    <button class="im-menu__btn" type="button" data-act="toggle">${icon('pause')}<span data-toggle-label>${r.run.pause}</span></button>
    <button class="im-menu__btn" type="button" data-act="prev">${icon('prev')}<span>${r.run.back}</span></button>
    <button class="im-menu__btn" type="button" data-act="next">${icon('next')}<span>${r.run.skip}</span></button>
    <button class="im-menu__btn" type="button" data-act="end"><span>${r.run.end}</span></button>
  </div>
  <div class="immersive__breath" data-breath-ui aria-hidden="true">
    <p class="im-phase" data-phase></p>
    <p class="im-cue" data-cue></p>
    <p class="im-cue-sub" data-cue-sub></p>
  </div>
  <div class="im-card" data-card>
    <p class="im-count" data-im-count-v aria-hidden="true"></p>
    <p class="im-icon" data-im-icon aria-hidden="true"></p>
    <h2 class="im-title" id="im-title" tabindex="-1" data-im-title></h2>
    <p class="im-do" data-im-body></p>
    <div class="im-choices" data-choices></div>
    <div class="im-park" data-park hidden>
      <label class="im-park__label" for="im-park-text">${r.run.park.label}</label>
      <textarea class="im-park__text" id="im-park-text" rows="3" data-park-text placeholder="${esc(r.run.park.placeholder)}" maxlength="180"></textarea>
      <p class="im-park__note">${r.run.park.saved}</p>
    </div>
    <p class="im-note" data-im-note hidden></p>
    <details class="im-why" data-why><summary>${r.run.why}</summary><p data-im-why></p></details>
    <p class="im-tip" data-im-tip hidden></p>
  </div>
  <div class="im-dock" data-dock>
    <button class="im-done" type="button" data-act="done">
      <svg class="im-done__ring" viewBox="0 0 240 68" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect class="im-done__track" x="2" y="2" width="236" height="64" rx="32" pathLength="1"/><rect class="im-done__fill" data-ring x="2" y="2" width="236" height="64" rx="32" pathLength="1"/></svg>
      <span class="im-done__label" data-done-label>${r.run.done}</span>
      <svg class="im-done__tick" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4.5 12.8l4.7 4.7L19.8 6.9" pathLength="1"/></svg>
    </button>
    <p class="im-done__sub tabular" data-done-sub></p>
    <label class="im-bright">
      <span class="visually-hidden">${r.run.bright}</span>
      <svg class="im-bright__sun im-bright__sun--lo" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.2"/></svg>
      <input type="range" min="0.35" max="1.25" step="0.05" value="0.8" data-bright aria-valuetext="80%" title="${esc(r.run.bright)}">
      <svg class="im-bright__sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.6"/><path d="M12 1.8v3.2M12 19v3.2M1.8 12h3.2M19 12h3.2M4.8 4.8l2.3 2.3M16.9 16.9l2.3 2.3M4.8 19.2l2.3-2.3M16.9 7.1l2.3-2.3"/></svg>
    </label>
  </div>
  <div class="immersive__end" aria-hidden="true">
    <p class="im-stamp"><span>${r.run.stamp}</span> <span data-end-time>--:--</span></p>
    <p class="im-end-title">${r.done.title}</p>
    <p class="im-end-note"><span data-end-note></span> ${r.run.endNote}</p>
    <button class="btn btn--ghost btn--xl im-end-btn" type="button" data-act="leave">${r.run.leave}</button>
  </div>
  <p class="im-keys">${r.run.shortcuts}</p>
  <p class="visually-hidden" aria-live="polite" data-live></p>
</div>`;

  return {
    title: r.meta.title,
    description: r.meta.description,
    body,
    styles: ['ritual'],
    scripts: ['ink', 'room', 'ritual'],
    client: {
      ritual: {
        steps: r.steps,
        breath: b,
        run: { ...r.run, stepOf: null, announce: null, nextIn: null, aboutMin: null, aboutSec: null, evening: null },
        door: { ...r.setup.door, evening: null },
        log: { days: r.done.logDays },
        // words on things in the room (the same room as the home page's film)
        props: Object.assign({}, ...Object.values(ctx.content.game?.games || {}).map((g) => g.props || {}), ctx.content.home?.story?.props || {}),
        done: {
          reminderEvent: r.done.reminderEvent,
          reminderDesc: r.done.reminderDesc,
          cardAlt: r.done.cardAlt,
          cardOver: r.done.cardOver,
          cardMinutes: r.done.cardMinutes,
          cardMinute: r.done.cardMinute,
          cardRitual: r.done.cardRitual,
          stamp: r.done.stamp,
          site: ctx.cfg.siteUrl.replace(/^https?:\/\//, ''),
        },
        setup: { quickReady: r.setup.quickReady, quickSame: r.setup.quickSame, adjust: r.setup.adjust, adjustHide: r.setup.adjustHide },
        tpl: {
          stepOf: r.run.stepOf('{i}', '{n}'),
          announce: r.run.announce('{i}', '{n}', '{t}'),
          resumeText: r.setup.resumeText('{t}', '{l}'),
          clocked: r.done.clocked('{t}'),
          count1: r.done.count(1),
          countN: r.done.count(99).replace('99', '{n}'),
          nextIn: r.run.nextIn('{t}'),
          aboutMin: r.run.aboutMin('{m}'),
          aboutSec: r.run.aboutSec('{s}'),
          evening: r.run.evening('{n}'),
          doorEvening: r.setup.door.evening('{n}'),
        },
        url: ctx.canonical,
        ...(pushOn
          ? {
              push: {
                key: ctx.cfg.push.publicKey,
                endpoint: ctx.cfg.push.endpoint || '/api/push',
                title: r.done.push.title,
                body: r.done.push.body,
                url: ctx.url('ritual', { query: 'utm_source=reminder&utm_medium=push' }),
                set: r.done.push.set,
                daily: r.done.push.daily,
                workdays: r.done.push.workdays,
                ios: r.done.push.ios,
                denied: r.done.push.denied,
                failed: r.done.push.failed,
              },
            }
          : {}),
        // the recorded voice (content → voice): clip names become asset URLs
        voice: r.voice
          ? {
              versions: r.voice.versions,
              skipChoices: r.voice.skipChoices,
              rhythmCues: r.voice.rhythmCues,
              steps: Object.fromEntries(Object.entries(r.voice.steps).map(([k, f]) => [k, ctx.asset(`assets/audio/narration/${r.voice.dir}/${f}`)])),
              cues: Object.fromEntries(
                Object.entries(r.voice.cues).map(([k, f]) => [k, Array.isArray(f) ? f.map((x) => ctx.asset(`assets/audio/narration/${r.voice.dir}/${x}`)) : ctx.asset(`assets/audio/narration/${r.voice.dir}/${f}`)]),
              ),
            }
          : null,
        // lock-screen controls: a quiet track to hang them on, the room as the artwork
        media: {
          quiet: ctx.asset('assets/audio/quiet.mp3'),
          album: plain(r.intro.title),
          art: [
            { src: ctx.asset(`assets/img/panels/r4-640.webp`), sizes: '640x400', type: 'image/webp' },
            { src: ctx.asset('assets/img/icon-512.png'), sizes: '512x512', type: 'image/png' },
          ],
        },
        music: {
          privacy: m.privacy,
          custom: m.custom,
          services: m.services,
          listen: m.listen,
          stop: m.stop,
          dock: { ...m.dock, services: m.services },
        },
      },
    },
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: plain(r.intro.title),
        description: plain(r.intro.lead),
        totalTime: `PT${Math.round(totalFull / 60)}M`,
        estimatedCost: { '@type': 'MonetaryAmount', currency: ctx.cfg.product.currency, value: '0' },
        step: r.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: plain(s.title), text: plain(s.body) })),
      },
    ],
  };
}
