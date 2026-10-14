import { html } from '../../lib/html.js';
import { guideCover, guideCoverSpec } from '../components.js';

export default function journal(ctx) {
  const c = ctx.content.journal;
  const posts = c.posts.map((p) => ({ id: p.id, ...ctx.content[p.id] })).filter((p) => p.title);
  const body = html`
<section class="page-intro">
  <div class="wrap">
    <h1 class="display page-intro__title">${c.title}</h1>
    <p class="lead page-intro__lead">${c.lead}</p>
  </div>
</section>
<section class="section section--flush-top" style="--depth:.4">
  <div class="wrap">
    <ul class="posts">${posts.map(
      (p) => html`<li class="post-row${guideCoverSpec(p.id) ? ' post-row--cover' : ''}">${guideCoverSpec(p.id) ? `<a class="post-row__cover" href="${ctx.url(p.id)}" tabindex="-1" aria-hidden="true">${guideCover(ctx, p.id)}</a>` : ''}<div class="post-row__text"><a href="${ctx.url(p.id)}"><h2 class="post-row__title">${p.title}</h2></a><p class="prose">${p.dek}</p><p class="post-row__meta"><time datetime="${p.date}">${ctx.fmt.date(p.date)}</time>, ${c.readTime(p.readTime)}</p></div></li>`,
    )}</ul>
  </div>
</section>
<section class="section" style="--depth:.7">
  <div class="wrap split">
    <h2 class="section-title section-title--s">${c.plannedTitle}</h2>
    <ul class="planned">${c.planned.map((t) => `<li><span>${t}</span><span class="chip">${c.plannedNote}</span></li>`)}</ul>
  </div>
</section>`;
  return { title: c.meta.title, description: c.meta.description, body };
}
