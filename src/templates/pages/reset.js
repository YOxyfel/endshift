import { html, esc } from '../../lib/html.js';
import { btn, chip, meter, faqList, specs, batchAction, visibleIngredients, ingredientGuide, testimonials, signupForm, shiftLabel, shot, jarPhoto } from '../components.js';

export default function reset(ctx) {
  const c = ctx.content.reset;
  const { ui, state, cfg, formula, t } = ctx;
  const R = ctx.content.ritual;
  const F = ui.formula;
  const faqAll = ctx.content.faq.groups.flatMap((g) => g.items);
  const faqItems = c.faqIds.map((id) => faqAll.find((f) => f.id === id)).filter(Boolean);

  const melatonin = formula.ingredients.find((i) => i.id === 'melatonin');
  const melatoninLine = state.formulaConfirmed
    ? melatonin && melatonin.status === 'included'
      ? `${ctx.fmt.dose(melatonin)}`
      : c.summary.melatoninNone
    : `${c.summary.melatoninUndecided} ${chip(ui.common.notFinal, 'warm')}`;
  const rows = c.summary.rows.map(([k, v]) => [k, k === c.summary.melatoninLabel ? melatoninLine : v]);
  const mm = (m) => String(m).padStart(2, '0');
  const WATER = Math.max(0, R.steps.findIndex((s) => s.id === 'water'));
  const reviews = (cfg.socialProof?.testimonials || []).length;

  // One job: the jar (turn it), five facts, its place in the ritual, the shortlist, three
  // questions, and the batch with its form. Everything else is a link away.
  const body = html`<div class="comic">
<section class="page-intro page-intro--scene page-intro--product">
  <figure class="panel scene-band turntable" data-panel data-turntable>${shot(ctx, 'jarWide', { eager: true })}<canvas class="turntable__cv" data-tt-canvas aria-hidden="true"></canvas>
    <div class="turntable__ui" data-tt-ui hidden><label class="visually-hidden" for="tt-range">${c.turn.label}</label><input class="turntable__range" id="tt-range" type="range" min="0" max="359" step="1" value="0" data-tt-range><p class="turntable__hint" aria-hidden="true">${c.turn.hint}</p></div>
    <figcaption class="cap cap--note scene-band__note">${state.packagingFinal ? ui.product.renderCaption : ui.product.renderCaptionConcept}</figcaption></figure>
  <div class="wrap product__grid product__grid--facts">
    <div>
      <p class="product__overline">${c.hero.overline}</p>
      <h1 class="lettering product__name">${c.hero.title}</h1>
      <p class="lead product__lead">${c.hero.lead}</p>
      <p class="status-line">${chip(ui.status[state.status], state.statusIndex > 0 ? 'live' : '')}<span>${ui.statusLine[state.status]}</span></p>
      ${!state.formulaConfirmed ? `<p class="status-line product__formula">${chip(c.hero.formulaNotice, 'warm')}<span>${c.hero.formulaNoticeText}</span></p>` : ''}
      <div class="cta-row product__ctas">
        ${batchAction(ctx, { location: 'reset_hero', size: 'xl' })}
        ${btn({ href: ctx.url('ritual'), label: shiftLabel(ui.cta.ritual, ui.cta.ritualOff), variant: 'ghost', size: 'xl', trackId: 'reset_hero_ritual' })}
      </div>
    </div>
    <div class="spec-sheet product__facts">
      <h2 class="product__facts-title">${c.summary.title}</h2>
      ${specs(rows)}
    </div>
  </div>
</section>

<section class="section rstep-sec" style="--depth:.25" aria-labelledby="rstep-title">
  <div class="wrap split">
    <div>
      <h2 class="section-title" id="rstep-title">${c.step.title}</h2>
      <p class="lead section-lead">${c.step.text}</p>
      <p class="rstep__wont">${c.step.wont}</p>
    </div>
    <div>
      <ol class="rstep">${R.steps.map((s, i) => `<li class="rstep__i${i === WATER ? ' is-reset' : ''}"><span class="rstep__min">${mm(s.minute)}</span><span class="rstep__t">${s.title}</span>${i === WATER ? `<span class="rstep__tag">${c.step.tag}</span>` : ''}</li>`).join('')}</ol>
      <div class="rstep__how"><p>${c.step.how}</p><p class="small muted">${c.step.when}</p></div>
      <div class="cta-row rstep__cta">${btn({ href: ctx.url('ritual'), label: shiftLabel(ui.cta.ritual, ui.cta.ritualOff), size: 'lg', trackId: 'reset_step_ritual' })}<span class="small muted">${c.step.first}</span></div>
    </div>
  </div>
</section>

<section class="jar-band" aria-label="${esc(ui.product.photoNightCaption)}">
  ${jarPhoto(ctx, 'night', { alt: ui.product.photoNightAlt, sizes: '100vw', caption: ui.product.photoNightCaption })}
</section>

<section class="section section--tight" style="--depth:.45" id="ingredients">
  <div class="wrap split">
    <div>
      <h2 class="section-title section-title--s">${c.ingredients.title}</h2>
      ${!state.formulaConfirmed ? `<p style="margin-top:var(--s-4)">${chip(c.hero.formulaNotice, 'warm')}</p>` : ''}
    </div>
    <div>
      <p class="lead">${c.ingredients.lead}</p>
      <ul class="shortlist">${visibleIngredients(ctx)
        .map((i) => {
          const g = ingredientGuide(ctx, i.id);
          return `<li class="shortlist__i"><a class="shortlist__name" href="${ctx.url('formula', { hash: `ing-${i.id}` })}">${t(i.name)}</a>${chip(F.status[i.status] || i.status, i.status === 'included' ? 'live' : '')}${g ? `<a class="link shortlist__guide" href="${esc(g.href)}" data-track="cta_click" data-track-id="reset_guide_${esc(i.id)}">${c.ingredients.guides}</a>` : ''}</li>`;
        })
        .join('')}</ul>
      <p style="margin-top:var(--s-5)"><a class="link" href="${ctx.url('formula')}">${c.ingredients.more}</a></p>
    </div>
  </div>
</section>

<section class="section" style="--depth:.65">
  <div class="wrap split">
    <h2 class="section-title">${c.faqTitle}</h2>
    <div>
      ${faqList(faqItems, { prefix: 'reset-faq' })}
      <p style="margin-top:var(--s-6)"><a class="link" href="${ctx.url('faq')}">${ui.cta.allFaq}</a></p>
    </div>
  </div>
</section>
${
  reviews
    ? html`
<section class="section section--tight" style="--depth:.75">
  <div class="wrap split">
    <h2 class="section-title section-title--s">${c.reviews.title}</h2>
    ${testimonials(ctx, '')}
  </div>
</section>`
    : ''
}
<section class="section" style="--depth:.9" id="batch">
  <div class="wrap batch__grid">
    <div>
      <h2 class="section-title">${c.batch.title}</h2>
      <p class="lead section-lead">${c.batch.text}</p>
      <p class="small muted" style="margin-top:var(--s-4);max-width:46ch">${c.ship.line} <a class="link" href="${ctx.url('shipping')}">${c.ship.more}</a></p>
      <div class="cta-row" style="margin-top:var(--s-6)">${btn({ href: ctx.url('batch'), label: c.batch.more, variant: 'ghost', trackId: 'reset_batch_page' })}</div>
    </div>
    <div class="batch__side">
      ${meter(ctx, { id: 'reset-meter' })}
      ${state.checkoutLive ? `<div class="cta-row">${batchAction(ctx, { location: 'reset_batch', size: 'xl' })}</div>` : signupForm(ctx, { source: 'reset-batch', submit: ui.cta.batchConcept })}
    </div>
  </div>
</section>`;

  const jsonld = [];
  if (state.checkoutLive) {
    jsonld.push({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: cfg.product.fullName,
      brand: { '@type': 'Brand', name: cfg.brandName },
      description: c.hero.lead,
      image: ctx.og,
      offers: {
        '@type': 'Offer',
        price: cfg.product.price,
        priceCurrency: cfg.product.currency,
        availability: state.status === 'preorder' ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock',
        url: ctx.canonical,
      },
    });
  }

  // the turntable: the same concept bottle as the film and the ritual, its back label the spec sheet
  const props = Object.assign({}, ...Object.values(ctx.content.game?.games || {}).map((g) => g.props || {}), ctx.content.home?.story?.props || {});
  const client = { world: { turntable: { props, line1: props.jar1, line2: props.jar2, backTitle: c.turn.backTitle, back: c.turn.rows, front_: c.turn.front, back_: c.turn.back, front: 140 } } };
  return { title: c.meta.title, description: c.meta.description, body: body + '</div>', jsonld, client, styles: ['story', 'world'], scripts: ['ink', 'room', 'world', 'story'] };
}
