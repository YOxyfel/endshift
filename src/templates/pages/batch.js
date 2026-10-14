import { html, esc } from '../../lib/html.js';
import { btn, chip, icon, notice, meter, faqList, specs, batchAction, signupForm, shiftLabel } from '../components.js';
import { shot } from '../components.js';
import { STATUSES } from '../../lib/state.js';

const BENEFIT_ICONS = {
  founderNumber: 'person',
  batchCard: 'card',
  formulaVote: 'vote',
  buildUpdates: 'mail',
  earlyAccess: 'spark',
  founderDiscount: 'check',
  founderWall: 'person',
};

// The founders' crate: one place per founder, seen from above. Taken places have a cap on; the
// next free one has a dashed ring and its number.
function crateSvg(count, goal, label, stencil, lid = 'ENDSHIFT · BATCH #001') {
  const cols = goal >= 100 ? 15 : 10, rows = Math.ceil(goal / cols), cell = 58;
  const w = cols * cell + 130, h = rows * cell + 150;
  const gx = 65, gy = 80, gw = cols * cell, gh = rows * cell;
  const slots = [];
  for (let i = 0; i < goal; i++) {
    const x = gx + (i % cols) * cell + cell / 2, y = gy + Math.floor(i / cols) * cell + cell / 2;
    const cls = i < count ? ' is-taken' : i === count ? ' is-next' : '';
    slots.push(`<g class="slot${cls}" data-slot style="--i:${i}" transform="translate(${x} ${y})"><use href="#crate-hole"/><use class="slot__cap" href="#crate-cap"/><circle class="slot__ring" r="25"/><text class="slot__no" y="5" text-anchor="middle">${String(i + 1).padStart(3, '0')}</text></g>`);
  }
  // grain on the frame: long, slightly wavy lines
  const grain = Array.from({ length: 14 }, (_, i) => {
    const y = 14 + (i * (h - 28)) / 13, k = (i * 37) % 11;
    return `<path d="M14 ${y.toFixed(1)}C${w * 0.3} ${(y + k - 5).toFixed(1)} ${w * 0.6} ${(y - k + 6).toFixed(1)} ${w - 14} ${(y + 2).toFixed(1)}"/>`;
  }).join('');
  const corner = (x, y, sx, sy) => `<path transform="translate(${x} ${y}) scale(${sx} ${sy})" d="M0 0H64V16H16V64H0Z" fill="url(#crate-steel)" stroke="#0e0c0a" stroke-width="2"/><circle cx="${x + sx * 8}" cy="${y + sy * 8}" r="3" fill="#2a2724"/><circle cx="${x + sx * 40}" cy="${y + sy * 8}" r="3" fill="#2a2724"/><circle cx="${x + sx * 8}" cy="${y + sy * 40}" r="3" fill="#2a2724"/>`;
  return `<svg class="crate__svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">
    <defs>
      <linearGradient id="crate-wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a6240"/><stop offset=".5" stop-color="#704d31"/><stop offset="1" stop-color="#5a3c25"/></linearGradient>
      <linearGradient id="crate-steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9a9a94"/><stop offset=".5" stop-color="#5e5e5a"/><stop offset="1" stop-color="#3c3c39"/></linearGradient>
      <radialGradient id="crate-well" cx=".5" cy=".38" r=".62"><stop offset="0" stop-color="#050404"/><stop offset=".72" stop-color="#0d0b09"/><stop offset="1" stop-color="#2a1f16"/></radialGradient>
      <radialGradient id="crate-amber" cx=".38" cy=".34" r=".72"><stop offset="0" stop-color="#ffd59a"/><stop offset=".5" stop-color="#f2a84b"/><stop offset="1" stop-color="#a8722f"/></radialGradient>
      <g id="crate-hole"><rect x="-27" y="-27" width="54" height="54" fill="#33261b"/><path d="M-27 -27H27L22 -22H-22V22L-27 27Z" fill="#1d150f"/><circle r="22.5" fill="url(#crate-well)"/><circle r="22.5" fill="none" stroke="#4a3626" stroke-width="1.5"/></g>
      <g id="crate-cap"><circle r="21.5" fill="#000" opacity=".45" transform="translate(1.5 3)"/><circle r="21" fill="url(#crate-amber)"/><circle r="21" fill="none" stroke="#8a5a20" stroke-width="2.6" stroke-dasharray="2 2.3"/><circle r="15" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.2"/><path d="M-8.5 3a8.5 8.5 0 0 1 17 0z" fill="#1c1f22"/><rect x="-11.5" y="4" width="23" height="2.2" fill="#1c1f22"/></g>
    </defs>
    <rect x="8" y="8" width="${w - 16}" height="${h - 16}" rx="14" fill="url(#crate-wood)" stroke="#120f0c" stroke-width="6"/>
    <g fill="none" stroke="#4a3220" stroke-width="1.6" opacity=".55">${grain}</g>
    <path d="M8 ${(h * 0.33).toFixed(1)}H${w - 8}M8 ${(h * 0.66).toFixed(1)}H${w - 8}" stroke="#3e2a1b" stroke-width="3" opacity=".7"/>
    <rect x="30" y="30" width="${w - 60}" height="${h - 60}" rx="8" fill="#22180f" stroke="#120f0c" stroke-width="4"/>
    <rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" fill="#2c2017"/>
    ${slots.join('')}
    <g fill="none" stroke="#17110c" stroke-width="3">${Array.from({ length: cols - 1 }, (_, i) => `<path d="M${gx + (i + 1) * cell} ${gy}V${gy + gh}"/>`).join('')}${Array.from({ length: rows - 1 }, (_, i) => `<path d="M${gx} ${gy + (i + 1) * cell}H${gx + gw}"/>`).join('')}</g>
    ${corner(8, 8, 1, 1)}${corner(w - 8, 8, -1, 1)}${corner(8, h - 8, 1, -1)}${corner(w - 8, h - 8, -1, -1)}
    <text x="${w / 2}" y="60" text-anchor="middle" style="font-family:var(--font-display);font-weight:800;font-size:26px;letter-spacing:6px" fill="#e2bf92" opacity=".9">${esc(lid)}</text>
    <text x="${w / 2}" y="${h - 36}" text-anchor="middle" style="font-family:var(--font-display);font-weight:800;font-size:17px;letter-spacing:5px" fill="#c9a074" opacity=".55">${esc(stencil)}</text>
  </svg>`;
}
// The pallet: the whole first run, with the founders' block marked
function palletSvg(count, goal, moq, P) {
  const cols = 25, rows = Math.ceil(moq / cols), d = 18;
  const fRows = Math.ceil(goal / cols);
  const w = cols * d + 40, h = rows * d + 70;
  const taken = [];
  for (let i = 0; i < Math.min(count, goal); i++) taken.push(`<circle cx="${20 + (i % cols) * d + d / 2}" cy="${20 + Math.floor(i / cols) * d + d / 2}" r="6.4" fill="#f2a84b"/>`);
  return `<svg class="pallet__svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(P.aria)}">
    <defs><pattern id="pal-dot" width="${d}" height="${d}" patternUnits="userSpaceOnUse"><circle cx="${d / 2}" cy="${d / 2}" r="6.4" fill="#2b2f33"/></pattern>
    <pattern id="pal-dot-f" width="${d}" height="${d}" patternUnits="userSpaceOnUse"><circle cx="${d / 2}" cy="${d / 2}" r="6.4" fill="none" stroke="#f2a84b" stroke-width="1.6"/></pattern></defs>
    <rect x="20" y="20" width="${cols * d}" height="${rows * d}" fill="url(#pal-dot)"/>
    <rect x="20" y="20" width="${cols * d}" height="${fRows * d}" fill="#15181b"/>
    <rect x="20" y="20" width="${cols * d}" height="${fRows * d}" fill="url(#pal-dot-f)"/>
    <rect x="18" y="18" width="${cols * d + 4}" height="${fRows * d + 4}" rx="4" fill="none" stroke="#f2a84b" stroke-width="2"/>
    ${taken.join('')}
    <g fill="#7a5a3e"><rect x="10" y="${rows * d + 26}" width="${w - 20}" height="10" rx="2"/><rect x="24" y="${rows * d + 36}" width="40" height="18"/><rect x="${w / 2 - 20}" y="${rows * d + 36}" width="40" height="18"/><rect x="${w - 64}" y="${rows * d + 36}" width="40" height="18"/></g>
  </svg>
  <p class="pallet__key" aria-hidden="true"><span class="pallet__k pallet__k--f">${P.founders}</span><span class="pallet__k">${P.rest}</span></p>`;
}

export default function batch(ctx) {
  const c = ctx.content.batch;
  const { ui, state, cfg } = ctx;
  const faqAll = ctx.content.faq.groups.flatMap((g) => g.items);
  const faqItems = c.faqIds.map((id) => faqAll.find((f) => f.id === id)).filter(Boolean);

  const B = ui.benefits;
  const on = cfg.batch.benefits;
  const benefitItems = [
    on.founderNumber && ['founderNumber', B.founderNumber.title, B.founderNumber.text],
    on.batchCard && ['batchCard', B.batchCard.title, B.batchCard.text],
    on.formulaVote && ['formulaVote', B.formulaVote.title, B.formulaVote.text],
    on.buildUpdates && ['buildUpdates', B.buildUpdates.title, B.buildUpdates.text],
    on.earlyAccess && ['earlyAccess', B.earlyAccess.title, B.earlyAccess.text],
    on.founderDiscountPercent && ['founderDiscount', B.founderDiscount.title(on.founderDiscountPercent), B.founderDiscount.text],
    on.founderWall && ['founderWall', B.founderWall.title, B.founderWall.text],
  ].filter(Boolean);

  const card = c.benefits.card;

  const join = state.checkoutLive
    ? html`<div class="cta-row">${batchAction(ctx, { location: 'batch_page', size: 'xl' })}</div>`
    : html`<div id="join"><h2 class="h3" style="margin-bottom:var(--s-4)">${c.joinTitle}</h2>${signupForm(ctx, {
        source: 'batch-page',
        submit: state.action === 'updates' ? ui.cta.batchProduction : ui.cta.batchConcept,
        note: c.joinNote,
      })}</div>`;

  const body = html`<div class="comic">
<section class="page-intro page-intro--scene">
  <figure class="panel scene-band" data-panel>${shot(ctx, 'racks', { eager: true })}</figure>
  <div class="wrap batch__grid">
    <div>
      <p class="page-intro__chip">${chip(ui.status[state.status], state.statusIndex > 0 ? 'live' : '')}</p>
      <h1 class="lettering page-intro__title">${c.intro.title}</h1>
      <p class="lead page-intro__lead">${c.intro.lead}</p>
      <p class="prose" style="margin-top:var(--s-5)">${c.intro.text}</p>
    </div>
    <div class="batch__side">
      ${meter(ctx, { id: 'batch-meter' })}
      ${join}
    </div>
  </div>
</section>

<section class="section crate-sec" style="--depth:.12" aria-labelledby="crate-title">
  <div class="wrap crate__grid">
    <div class="crate__copy" data-crate-copy data-from="${cfg.batch.showCountFrom || 0}" data-early="${state.founderCount < (cfg.batch.showCountFrom || 0) ? 1 : 0}">
      <h2 class="section-title" id="crate-title">${c.crate.title}</h2>
      <p class="lead section-lead">${c.crate.lead}</p>
      <p class="crate__count" aria-hidden="true"><span data-crate-n>${state.founderCount}</span><span class="crate__goal">/ ${state.founderGoal}</span></p>
      <p class="crate__next"><span class="crate__dot" aria-hidden="true"></span>${c.crate.next('<span data-crate-next>' + String(state.founderCount + 1).padStart(3, '0') + '</span>')}</p>
      <div class="cta-row" style="margin-top:var(--s-5)">${state.checkoutLive ? batchAction(ctx, { location: 'batch_crate', size: 'lg' }) : `<a class="link crate__cta" href="#join" data-track="cta_click" data-track-id="batch_crate">${c.crate.cta}</a>`}</div>
    </div>
    <figure class="crate" data-crate>
      ${crateSvg(state.founderCount, state.founderGoal, c.crate.aria(state.founderCount, state.founderGoal), c.crate.stencil(state.founderGoal), c.crate.lid)}
      <figcaption class="small muted">${c.crate.caption}</figcaption>
    </figure>
  </div>
</section>

<section class="section section--tight" style="--depth:.2">
  <div class="wrap">
    <h2 class="section-title section-title--s" style="margin-bottom:var(--s-6)">${c.states.title}</h2>
    <ol class="states">
      ${c.states.items.map((s) => {
        const idx = STATUSES.indexOf(s.id);
        const cls = idx === state.statusIndex ? 'is-current' : idx < state.statusIndex ? 'is-past' : '';
        return html`<li class="state ${cls}"${idx === state.statusIndex ? ' aria-current="step"' : ''}>
          <p class="state__name">${s.name}</p>
          ${idx === state.statusIndex ? chip(c.states.current, 'now') : ''}
          <p class="state__text">${s.text}</p>
        </li>`;
      })}
    </ol>
  </div>
</section>

<section class="section" style="--depth:.35">
  <div class="wrap split">
    <h2 class="section-title">${c.why.title}</h2>
    <div>
      <div class="prose">${c.why.text.map((p) => `<p>${p}</p>`)}</div>
      <figure class="pallet">
        ${palletSvg(state.founderCount, state.founderGoal, cfg.batch.manufacturingMOQ, c.pallet)}
        <figcaption class="small muted">${c.pallet.caption}</figcaption>
      </figure>
      <div class="outcomes outcomes--in">
        <div class="outcome outcome--yes"><h3>${c.outcomes.yes.title}</h3><p>${c.outcomes.yes.text}</p></div>
        <div class="outcome"><h3>${c.outcomes.no.title}</h3><p>${c.outcomes.no.text}</p></div>
      </div>
    </div>
  </div>
</section>

<section class="section" style="--depth:.6">
  <div class="wrap split split--even">
    <div>
      <h2 class="section-title" style="margin-bottom:var(--s-4)">${c.benefits.title}</h2>
      <p class="muted" style="margin-bottom:var(--s-6)">${c.benefits.note}</p>
      <ul class="benefits">${benefitItems.map(([k, title, text]) => `<li>${icon(BENEFIT_ICONS[k])}<div><strong>${title}</strong><span>${text}</span></div></li>`)}</ul>
    </div>
    ${on.batchCard
      ? html`<figure class="foundercard-wrap" style="display:grid;justify-items:center;gap:var(--s-5);padding-top:var(--s-6)">
      <div class="foundercard" role="img" aria-label="${esc(c.benefits.cardCaption)}">
        <div class="foundercard__brand"><span>${card.brand}</span><span>${card.batch}</span></div>
        <p class="foundercard__title">${card.title}</p>
        <div class="foundercard__rows">${card.rows.map(([k, v]) => `<div class="foundercard__row"><span>${k}</span><span>${v}</span></div>`)}</div>
        <span class="foundercard__stamp" aria-hidden="true">${card.stamp}</span>
        <p class="foundercard__fine">${card.fine}</p>
      </div>
      <figcaption class="small muted">${c.benefits.cardCaption}</figcaption>
    </figure>`
      : ''}
  </div>
</section>

<section class="section" style="--depth:.75">
  <div class="wrap split">
    <div>
      <h2 class="section-title">${c.terms.title}</h2>
      ${!cfg.batch.preorderTermsConfirmed ? `<div style="margin-top:var(--s-5)">${notice(c.terms.draft)}</div>` : ''}
    </div>
    ${specs(c.terms.rows)}
  </div>
</section>

<section class="section" style="--depth:.9">
  <div class="wrap split">
    <h2 class="section-title">${c.faqTitle}</h2>
    <div>
      ${faqList(faqItems, { prefix: 'batch-faq' })}
      <div class="cta-row" style="margin-top:var(--s-7)">
        ${state.checkoutLive ? batchAction(ctx, { location: 'batch_final', size: 'lg' }) : `<a class="btn btn--primary btn--lg" href="#join" data-track="cta_click" data-track-id="batch_final">${ui.cta.batchConcept}</a>`}
        ${btn({ href: ctx.url('ritual'), label: shiftLabel(ui.cta.ritual, ui.cta.ritualOff), variant: 'ghost', size: 'lg', trackId: 'batch_final_ritual' })}
      </div>
    </div>
  </div>
</section>`;

  return { title: c.meta.title, description: c.meta.description, body: body + '</div>', styles: ['story', 'world'], scripts: ['ink', 'story', 'world'] };
}
