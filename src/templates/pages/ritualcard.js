import { html, esc } from '../../lib/html.js';
import { icon, mark, panelPoster, pageStamp } from '../components.js';

/* The ritual on one A5 page, to print: the ritual asks you to put the phone down, but it lives
   on the phone. This lives by the door or the bed. */
export default function ritualCard(ctx) {
  const c = ctx.content['ritual-card'];
  const r = ctx.content.ritual;
  const mm = (m) => String(m).padStart(2, '0');
  const site = String(ctx.cfg.siteUrl).replace(/^https?:\/\//, '').replace(/\/$/, '');
  const ritualAbs = /\.example$/.test(site) ? '' : `${site}${ctx.url('ritual').replace(/\/index\.html$/, '/')}`;
  const body = html`
<section class="rcard-page">
  <div class="wrap rcard-tools">
    ${pageStamp(ctx.ui.stamp.ritualCard, { href: ctx.url('ritual') })}
    <p><a class="link" href="${ctx.url('ritual')}">${c.back}</a></p>
    <div class="cta-row">
      <button class="btn btn--primary" type="button" data-print>${icon('print')}<span>${c.print}</span></button>
    </div>
    <p class="small muted">${c.how}</p>
  </div>
  <article class="rcard" aria-labelledby="rcard-title">
    <header class="rcard__head">
      <p class="rcard__brand">${mark('rcard__mark')}<span>ENDSHIFT</span></p>
      <h1 class="rcard__title" id="rcard-title">${c.title}</h1>
      <p class="rcard__lead">${c.lead}</p>
    </header>
    <figure class="rcard__pic">${panelPoster(ctx, 'r4', { sizes: '30rem', eager: true })}</figure>
    <ol class="rcard__steps">${r.steps
      .map((s) => `<li class="rcard__step"><span class="rcard__min">${mm(s.minute)}</span><div><h2 class="rcard__name">${s.title}</h2><p class="rcard__do">${esc(c.steps[s.id] || '')}</p></div><span class="rcard__box" aria-hidden="true"></span></li>`)
      .join('')}</ol>
    <footer class="rcard__foot">${ritualAbs ? `<span>${c.foot}</span> <b>${esc(ritualAbs)}</b>` : `<span>${c.footPlain}</span>`}</footer>
  </article>
</section>`;
  return { title: c.meta.title, description: c.meta.description, body, styles: ['card'] };
}
