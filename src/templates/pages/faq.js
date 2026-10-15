import { html, plain } from '../../lib/html.js';
import { faqList, icon, panelPoster, pageStamp, posterPreload } from '../components.js';
const fill = (parts, n) => parts.map((t) => t.replace('{n}', String(n)));

export default function faqPage(ctx) {
  const c = ctx.content.faq;
  const A = c.aside;
  const nq = c.groups.reduce((n, g) => n + g.items.length, 0);
  const body = html`
<section class="page-intro page-intro--scene">
  <figure class="panel scene-band scene-band--still" data-panel>${panelPoster(ctx, 'bed', { eager: true })}${pageStamp(fill(ctx.ui.stamp.faq, nq))}</figure>
  <div class="wrap">
    <h1 class="lettering page-intro__title">${c.intro.title}</h1>
    <p class="lead page-intro__lead">${c.intro.lead} <a class="link" href="${ctx.url('contact')}">${ctx.ui.nav.contact}</a></p>
    <nav class="faq-jump" aria-label="${ctx.ui.nav.faq}"><ul>${c.groups.map((g) => `<li><a class="link" href="#${g.id}">${g.title}</a></li>`)}</ul></nav>
  </div>
</section>
<section class="section section--flush-top" style="--depth:.4">
  <div class="wrap faq-layout">
    <div class="faq-main">
      ${c.groups.map(
        (g) => html`<div class="faq__group" id="${g.id}"><h2 class="faq__group-title">${g.title}</h2>${faqList(g.items, { prefix: g.id })}</div>`,
      )}
    </div>
    <aside class="faq-aside">
      <nav class="faq-aside__nav" aria-label="${A.topics}" data-faq-topics>
        <p class="faq-aside__k">${A.topics}</p>
        <ul>${c.groups.map((g) => `<li><a href="#${g.id}" data-topic="${g.id}">${g.title}</a></li>`)}</ul>
      </nav>
      <div class="ask-card">
        <p class="ask-card__t">${A.askTitle}</p>
        <p class="ask-card__x">${A.askText}</p>
        <a class="btn btn--ghost btn--sm" href="${ctx.url('contact')}" data-track="cta_click" data-track-id="faq_ask">${icon('mail')}<span>${A.ask}</span></a>
      </div>
    </aside>
  </div>
</section>`;

  return {
    title: c.meta.title,
    description: c.meta.description,
    body,
    styles: ['story'],
    preload: [posterPreload(ctx, 'bed')],
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: c.groups.flatMap((g) => g.items).map((i) => ({ '@type': 'Question', name: plain(i.q), acceptedAnswer: { '@type': 'Answer', text: plain(i.a) } })),
      },
    ],
  };
}
