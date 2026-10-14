import { html, esc, plain } from '../../lib/html.js';
import { btn } from '../components.js';

export default function article(ctx) {
  const c = ctx.content[ctx.page.id];
  const j = ctx.content.journal;
  const tonight = c.tonight && j && j.tonight
    ? html`<section class="tonight" data-tonight data-guide="${esc(ctx.page.id)}" aria-labelledby="tonight-title">
        <h2 class="h3" id="tonight-title">${j.tonight.title}</h2>
        <p class="muted">${j.tonight.lead}</p>
        <ul class="tonight__list">${c.tonight.map((it) => `<li><label class="tonight__item"><input type="checkbox" data-tonight-item value="${esc(it)}"><span class="tonight__t"><span>${it}</span></span></label></li>`)}</ul>
        <p class="small muted">${j.tonight.saved}</p>
      </section>`
    : '';
  // two more guides to read next: from the same group on the journal index (the evening, or the
  // ingredient shortlist), topped up from the rest
  const group = (j?.groups || []).find((g) => g.ids.includes(ctx.page.id));
  const pool = [...(group ? group.ids : []), ...((j?.posts || []).map((p) => p.id))];
  const next = j?.readNext
    ? [...new Set(pool)].filter((id) => id !== ctx.page.id && ctx.content[id]?.title).slice(0, 2).map((id) => ({ id, ...ctx.content[id] }))
    : [];
  const body = html`
<div class="reading-lamp" data-lamp aria-hidden="true">
  <div class="reading-lamp__light"></div>
  <svg class="reading-lamp__lamp" viewBox="0 0 260 420" focusable="false">
    <defs>
      <linearGradient id="rl-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a4d50"/><stop offset=".5" stop-color="#2a2c2e"/><stop offset="1" stop-color="#17181a"/></linearGradient>
      <linearGradient id="rl-shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1d1f21"/><stop offset=".35" stop-color="#3b3e41"/><stop offset=".6" stop-color="#26282a"/><stop offset="1" stop-color="#121314"/></linearGradient>
      <radialGradient id="rl-bulb" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff4dc"/><stop offset=".35" stop-color="#ffcf8a"/><stop offset="1" stop-color="#ffb066" stop-opacity="0"/></radialGradient>
    </defs>
    <rect x="232" y="18" width="20" height="78" rx="5" fill="url(#rl-metal)"/>
    <circle cx="242" cy="34" r="2.5" fill="#0c0d0e"/><circle cx="242" cy="80" r="2.5" fill="#0c0d0e"/>
    <path d="M236 57L152 92L112 168" fill="none" stroke="#2c2e30" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M236 57L152 92L112 168" fill="none" stroke="#55595c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/>
    <circle cx="152" cy="92" r="7" fill="url(#rl-metal)" stroke="#0c0d0e" stroke-width="1.5"/>
    <circle cx="236" cy="57" r="6" fill="url(#rl-metal)" stroke="#0c0d0e" stroke-width="1.5"/>
    <g transform="translate(104 196) rotate(34)">
      <circle class="reading-lamp__halo" cx="0" cy="34" r="70" fill="url(#rl-bulb)"/>
      <path d="M-20 -42H20L54 30H-54Z" fill="url(#rl-shade)" stroke="#0c0d0e" stroke-width="2"/>
      <path d="M-20 -42H20" stroke="#6a6e72" stroke-width="2" opacity=".6"/>
      <ellipse cx="0" cy="30" rx="54" ry="11" fill="#141516"/>
      <ellipse class="reading-lamp__glow" cx="0" cy="30" rx="51" ry="9.5" fill="#ffd9a0"/>
      <circle cx="0" cy="-48" r="9" fill="url(#rl-metal)" stroke="#0c0d0e" stroke-width="1.5"/>
    </g>
  </svg>
</div>
<article data-article>
  <header class="page-intro">
    <div class="wrap"><div class="article-head">
      <p><a class="link small" href="${ctx.url('journal')}">${ctx.ui.nav.journal}</a></p>
      <h1 class="display article-head__title" style="margin-top:var(--s-4)">${c.title}</h1>
      <p class="lead page-intro__lead">${c.dek}</p>
      <p class="article-head__meta"><time datetime="${c.date}">${ctx.fmt.date(c.date)}</time>, ${j ? j.readTime(c.readTime) : ''}</p>
    </div></div>
  </header>
  <div class="section section--flush-top" style="--depth:.5">
    <div class="wrap article-layout${tonight ? ' article-layout--aside' : ''}">
      <div class="prose">${c.body}</div>
      ${tonight ? `<aside class="article-aside">${tonight}</aside>` : ''}
      <div class="cta-row article-cta">${btn({ href: ctx.url('ritual'), label: c.cta, size: 'xl', trackId: 'guide_ritual' })}</div>
      <div class="prose article-sources">
        <h2>${c.sourcesTitle}</h2>
        <ol class="sources">${c.sources.map((s) => `<li>${s.text} <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url.replace('https://', ''))}</a></li>`)}</ol>
        <p class="small muted">${c.disclaimer}</p>
      </div>
      ${next.length ? html`<nav class="read-next" aria-labelledby="read-next-title">
        <h2 class="read-next__title" id="read-next-title">${j.readNext}</h2>
        <ul class="read-next__list">${next.map((n) => `<li><a class="read-next__item" href="${ctx.url(n.id)}" data-track="cta_click" data-track-id="guide_next"><span class="read-next__name">${n.title}</span><span class="read-next__meta">${j.readTime(n.readTime)}</span></a></li>`)}</ul>
        <p><a class="link" href="${ctx.url('journal')}">${j.all}</a></p>
      </nav>` : ''}
    </div>
  </div>
</article>`;
  return {
    title: c.meta.title,
    description: c.meta.description,
    body,
    ogType: 'article',
    styles: ['world'],
    scripts: ['world'],
    jsonld: [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: plain(c.title),
        description: plain(c.dek),
        datePublished: c.date,
        dateModified: c.date,
        inLanguage: ctx.localeInfo.htmlLang,
        author: { '@type': 'Organization', name: ctx.cfg.brandName },
        publisher: { '@type': 'Organization', name: ctx.cfg.brandName, logo: { '@type': 'ImageObject', url: `${ctx.cfg.siteUrl}/assets/img/apple-touch-icon.png` } },
        mainEntityOfPage: ctx.canonical,
        citation: c.sources.map((s) => s.url),
      },
    ],
  };
}
