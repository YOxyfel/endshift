import { html, esc } from '../lib/html.js';
import { btn, icon, signupForm, chip, shot } from './components.js';

/* The home page hero as a game: find the switch, clock out.
   The page ships the frame (title, mission, controls) and the evening behind it; the
   game itself is built in the browser by game.js (one game a day, picked on the device). */

// The city on the horizon, in ink, a few windows still lit
const skyline = (() => {
  let x = 0, d = '', lit = '';
  let seed = 11;
  const r = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  while (x < 1600) {
    const w = 40 + Math.round(r() * 90), h = 40 + Math.round(r() * 150);
    d += `M${x} 220V${220 - h}h${w}V220z`;
    for (let wy = 220 - h + 12; wy < 210; wy += 18)
      for (let wx = x + 8; wx < x + w - 10; wx += 16) if (r() < 0.16) lit += `M${wx} ${wy}h7v9h-7z`;
    x += w + Math.round(r() * 6);
  }
  return `<svg class="after__city" viewBox="0 0 1600 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="${d}" fill="#0b0d10"/><path d="${lit}" fill="#f2a84b" opacity=".8"/></svg>`;
})();

/** "Evening 3?" and a way straight in, for someone who has done the ritual on this device
    (site.js fills the number and shows it). */
export function welcomeRow(ctx) {
  const w = ctx.content.home?.welcome;
  if (!w) return '';
  return html`<div class="welcome-row" data-welcome hidden><p class="welcome-row__q" data-welcome-q data-tpl="${esc(w.back('{n}'))}"></p>${btn({ href: ctx.url('ritual', { query: 'app=1' }), label: w.cta, size: 'sm', trackId: 'home_welcome' })}</div>`;
}

export function gameHero(ctx) {
  const g = ctx.content.game;
  const c = ctx.content.home;
  const { ui, cfg } = ctx;
  const R = g.reward;
  const A = g.after;
  const termsDraft = !cfg.game.reward?.termsConfirmed;

  const reward = R
    ? html`<div class="after__card after__card--reward" data-reward-card>
        <p class="after__kicker">${R.kicker}</p>
        <h3 class="after__reward-title">${R.title}</h3>
        <p class="after__text">${R.text}</p>
        <div data-reward-form>${signupForm(ctx, { source: 'game', submit: R.submit, note: R.note, label: R.label, reward: cfg.game.reward.tag, doneTitle: R.doneTitle, doneText: R.doneText })}</div>
        <p class="after__claimed" data-reward-claimed hidden>${icon('check')}<span>${R.claimed}</span></p>
        <p class="after__terms">${R.terms}. <a class="link" href="${ctx.url('terms', { hash: 'game-reward' })}">${R.termsLink}</a>${termsDraft ? ` ${chip(R.draft, 'warm')}` : ''}</p>
      </div>`
    : '';

  return html`<section class="game" id="game" data-game data-hero aria-labelledby="hero-title">
  <div class="game__view" data-game-view></div>
  <div class="game__hud" data-game-hud>
    <div class="game__top">
      <p class="game__tag"><span class="game__tag-day">${g.hud.today}</span><span class="game__tag-job" data-game-job></span><span class="game__tag-time" data-game-clock aria-hidden="true"></span></p>
      <h1 class="game__title display" id="hero-title"><span class="game__l1">${c.hero.line1}</span> <span class="game__l2">${c.hero.line2}</span></h1>
      <p class="game__mission" data-game-mission></p>
      ${R ? `<p class="game__teaser">${g.hud.teaser}</p>` : ''}
      ${welcomeRow(ctx)}
      <div class="game__nojs">
        <p>${c.hero.sub}</p>
        <p class="small muted">${g.hud.noJs}</p>
        <div class="cta-row">${btn({ href: ctx.url('ritual'), label: ui.cta.ritual, size: 'xl', trackId: 'hero_primary' })}</div>
      </div>
      <p class="visually-hidden" data-game-how></p>
    </div>
    <div class="game__bottom">
      <p class="game__say" data-game-say role="status" aria-live="polite"></p>
      <div class="game__bar">
        <button class="game__btn game__btn--hint" type="button" data-game-hint>${icon('info')}<span>${g.hud.hint}</span></button>
        <span class="game__timer" data-game-timer aria-hidden="true">0:00</span>
        <a class="game__skip" href="#in-short" data-game-skip>${g.hud.skip}</a>
      </div>
    </div>
  </div>

  <div class="after" data-game-after hidden>
    <div class="after__splash">
      <div class="after__sky" aria-hidden="true"><span class="after__sun"></span><span class="after__ripples"><i></i><i></i><i></i><i></i></span>${skyline}<span class="after__horizon"></span></div>
      <div class="wrap after__head">
        <p class="after__stamp" aria-hidden="true"><span>${A.stamp}</span><span data-after-time>--:--</span></p>
        <h2 class="lettering after__title" id="after-title" tabindex="-1">${A.title}</h2>
        <p class="cap after__found" data-after-found></p>
        <p class="after__lead">${A.lead}</p>
      </div>
    </div>
    <div class="wrap after__panels">
      ${reward}
      <div class="after__card after__card--ritual">
        <div class="after__shot" data-panel>${shot(ctx, 'r4', { sizes: '(min-width: 900px) 30vw, 90vw' })}</div>
        <div class="after__body">
          <h3 class="after__card-title">${A.ritualTitle}</h3>
          <p class="after__text">${A.ritualText}</p>
          <div class="cta-row">${btn({ href: ctx.url('ritual'), label: ui.cta.ritual, size: 'lg', trackId: 'game_after_ritual' })}</div>
        </div>
      </div>
      <div class="after__card after__card--reset">
        <div class="after__shot" data-panel>${shot(ctx, 'jar', { sizes: '(min-width: 900px) 30vw, 90vw' })}</div>
        <div class="after__body">
          <h3 class="after__card-title">${A.resetTitle} ${chip(A.concept, 'warm')}</h3>
          <p class="after__text">${A.resetText}</p>
          <a class="link" href="${ctx.url('reset')}" data-track="cta_click" data-track-id="game_after_reset">${A.resetLink}</a>
        </div>
      </div>
      <div class="after__fits">
        <h3 class="after__card-title" data-after-fits-title>${A.fitsTitle}</h3>
        <p class="after__text" data-after-fits></p>
      </div>
      <div class="after__foot">
        <p class="cap after__tomorrow" data-after-tomorrow></p>
        <div class="after__actions">
          <button class="btn btn--ghost btn--sm" type="button" data-game-replay>${icon('restart')}<span>${A.replay}</span></button>
          <a class="link" href="#in-short" data-track="cta_click" data-track-id="game_after_continue">${A.continue}</a>
        </div>
      </div>
    </div>
  </div>
</section>`;
}

/** What game.js needs in the browser. Functions become strings with {placeholders}. */
export function gameClient(ctx) {
  const g = ctx.content.game;
  const cfg = ctx.cfg.game;
  return {
    week: cfg.week,
    urlParam: cfg.urlParam,
    reward: g.reward && cfg.reward?.percent ? { percent: cfg.reward.percent, tag: cfg.reward.tag } : null,
    hud: { ...g.hud, won: g.hud.won('{t}') },
    after: { found: g.after.found('{t}', '{job}'), again: g.after.again('{t}'), tomorrow: g.after.tomorrow('{job}'), off: g.after.off, today: g.after.today('{job}'), play: g.after.play, replay: g.after.replay },
    games: g.games,
  };
}
