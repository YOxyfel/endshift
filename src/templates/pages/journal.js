import { html } from '../../lib/html.js';
import { guideCover, guideCoverSpec, panelPoster, pageStamp, posterPreload } from '../components.js';
const fill = (parts, n) => parts.map((t) => t.replace('{n}', String(n)));

export default function journal(ctx) {
  const c = ctx.content.journal;
  const posts = c.posts.map((p) => ({ id: p.id, ...ctx.content[p.id] })).filter((p) => p.title);
  const byId = Object.fromEntries(posts.map((p) => [p.id, p]));
  const groups = c.groups ? c.groups.map((g) => ({ ...g, posts: g.ids.map((id) => byId[id]).filter(Boolean) })) : [{ posts }];
  const row = (p, h) =>
    html`<li class="post-row${guideCoverSpec(p.id) ? ' post-row--cover' : ''}">${guideCoverSpec(p.id) ? `<a class="post-row__cover" href="${ctx.url(p.id)}" tabindex="-1" aria-hidden="true">${guideCover(ctx, p.id)}</a>` : ''}<div class="post-row__text"><a href="${ctx.url(p.id)}"><${h} class="post-row__title">${p.title}</${h}></a><p class="prose">${p.dek}</p><p class="post-row__meta"><time datetime="${p.date}">${ctx.fmt.date(p.date)}</time>, ${c.readTime(p.readTime)}</p></div></li>`;
  const body = html`
<section class="page-intro page-intro--scene">
  <figure class="panel scene-band scene-band--still" data-panel>${panelPoster(ctx, 'lineEve', { eager: true })}${pageStamp(fill(ctx.ui.stamp.journal, posts.length))}</figure>
  <div class="wrap">
    <h1 class="lettering page-intro__title">${c.title}</h1>
    <p class="lead page-intro__lead">${c.lead}</p>
  </div>
</section>
<section class="section section--flush-top" style="--depth:.4">
  <div class="wrap">
    ${groups.map((g) => (g.title
      ? html`<div class="post-group"><div class="post-group__head"><h2 class="section-title section-title--s">${g.title}</h2>${g.note ? `<p class="muted">${g.note}</p>` : ''}</div><ul class="posts">${g.posts.map((p) => row(p, 'h3'))}</ul></div>`
      : html`<ul class="posts">${g.posts.map((p) => row(p, 'h2'))}</ul>`))}
  </div>
</section>
<section class="section" style="--depth:.7">
  <div class="wrap split">
    <h2 class="section-title section-title--s">${c.plannedTitle}</h2>
    <ul class="planned">${c.planned.map((t) => `<li><span>${t}</span><span class="planned__note">${c.plannedNote}</span></li>`)}</ul>
  </div>
</section>`;
  return { title: c.meta.title, description: c.meta.description, body, styles: ['story'], preload: [posterPreload(ctx, 'lineEve')] };
}
