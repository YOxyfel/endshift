import { html, esc } from '../../lib/html.js';
import { notice, ingredientRow, visibleIngredients, vialGlass, batchAction, panelPoster, pageStamp, posterPreload } from '../components.js';

// One vial per ingredient, standing in a wooden rack: empty, with a question mark, until its dose
// is confirmed and published (the glass itself is vialGlass, shared with the journal's covers).
function vial(ctx, ing, i) {
  const { ui, t, state, fmt } = ctx;
  const F = ui.formula;
  const known = state.formulaConfirmed && ing.dose != null;
  const fill = known ? Math.max(0.18, Math.min(1, ing.nrvPercent ? ing.nrvPercent / 100 : 0.6)) : 0;
  return `<li class="vials__item"><a class="vial vial--${esc(ing.status)}${known ? ' has-dose' : ''}" href="#ing-${esc(ing.id)}" style="--i:${i};--fill:${fill.toFixed(2)}">
    ${vialGlass(ctx, ing)}
    <span class="vial__tag"><span class="vial__name">${t(ing.name)}</span><span class="vial__status">${F.status[ing.status] || ing.status}</span><span class="vial__dose">${known ? esc(fmt.dose(ing)) : F.doseTbc}</span></span>
  </a></li>`;
}

export default function formulaPage(ctx) {
  const c = ctx.content.formula;
  const { state, formula, t } = ctx;
  const labelStatements = formula.labelStatements[ctx.locale] || formula.labelStatements.en;

  const body = html`
<section class="page-intro page-intro--scene">
  <figure class="panel scene-band scene-band--still" data-panel>${panelPoster(ctx, 'jar', { eager: true })}${pageStamp(ctx.ui.stamp.formula, { href: ctx.url('reset') })}</figure>
  <div class="wrap">
    <h1 class="lettering page-intro__title">${c.intro.title}</h1>
    <p class="lead page-intro__lead">${c.intro.lead}</p>
    ${!state.formulaConfirmed ? `<div style="margin-top:var(--s-6)">${notice(c.intro.notice, { loud: true, iconName: 'alert' })}<p class="small muted" style="margin-top:var(--s-3)">${c.intro.noticeText}</p></div>` : ''}
  </div>
</section>

<section class="section section--flush-top vials-sec" style="--depth:.12" aria-labelledby="vials-title">
  <div class="wrap">
    <div class="section-head">
      <h2 class="section-title section-title--s" id="vials-title">${c.vials.title}</h2>
      <p class="muted">${c.vials.lead}</p>
    </div>
    <ul class="vials" data-vials>${visibleIngredients(ctx).map((ing, i) => vial(ctx, ing, i)).join('')}</ul>
  </div>
</section>

<section class="section" style="--depth:.2">
  <div class="wrap">
    <h2 class="section-title" style="margin-bottom:var(--s-7)">${c.rules.title}</h2>
    <ul class="rules">${c.rules.items.map((r) => html`<li><h3>${r.title}</h3><p>${r.text}</p></li>`)}</ul>
  </div>
</section>

<section class="section" style="--depth:.5">
  <div class="wrap">
    <div class="section-head">
      <h2 class="section-title">${c.list.title}</h2>
      ${c.list.lead ? `<p class="lead">${c.list.lead}</p>` : ''}
    </div>
    <div class="ingredients">${visibleIngredients(ctx).map((i) => ingredientRow(ctx, i))}</div>
  </div>
</section>

<section class="section" style="--depth:.8">
  <div class="wrap split">
    <div>
      <h2 class="section-title">${c.label.title}</h2>
      <p class="lead section-lead">${c.label.lead}</p>
    </div>
    <div class="label-paper"><p class="label-paper__k">${c.label.back}</p><ul class="label-list">${labelStatements.map((s) => `<li>${s}</li>`)}</ul></div>
  </div>
</section>

<section class="section section--tight formula-end" style="--depth:.9">
  <div class="wrap">
    ${c.end ? html`<div class="formula-end__box">
      <h2 class="section-title section-title--s">${c.end.title}</h2>
      <p class="lead">${c.end.text}</p>
      <div class="cta-row">${batchAction(ctx, { location: 'formula_end', size: 'lg' })}<a class="link" href="${ctx.url('reset')}" data-track="cta_click" data-track-id="formula_back_reset">${c.end.back}</a></div>
    </div>` : ''}
    <p class="formula-end__wrong small muted">${c.wrong} <a class="link" href="${ctx.url('contact')}">${c.wrongLink}</a></p>
  </div>
</section>`;

  return { title: c.meta.title, description: c.meta.description, body, styles: ['story', 'world'], scripts: ['world'], preload: [posterPreload(ctx, 'jar')] };
}
