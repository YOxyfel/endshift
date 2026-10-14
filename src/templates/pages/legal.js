import { html } from '../../lib/html.js';
import { notice } from '../components.js';

export default function legal(ctx) {
  const c = ctx.content[ctx.page.id];
  const { ui, cfg } = ctx;
  const body = html`
<section class="page-intro">
  <div class="wrap">
    <h1 class="display page-intro__title">${c.title}</h1>
    <p class="lead page-intro__lead">${c.lead}</p>
    <p class="small muted" style="margin-top:var(--s-4)">${ui.common.updated}: ${c.updated}</p>
    ${cfg.legal.draft ? `<div style="margin-top:var(--s-5)">${notice(ui.legal.draft, { iconName: 'alert' })}</div>` : ''}
  </div>
</section>
<section class="section section--flush-top legal" style="--depth:.5">
  <div class="wrap split">
    <nav aria-label="${ui.legal.contents}" class="split__sticky"><details class="toc-box" data-toc open><summary class="label toc-box__sum">${ui.legal.contents} <span class="muted">(${c.sections.length})</span></summary><ul class="toc">${c.sections.map((s) => `<li><a href="#${s.id}">${s.title}</a></li>`)}</ul></details></nav>
    <div class="prose">${c.sections.map((s) => html`<h2 id="${s.id}">${s.title}</h2>${s.body}`)}</div>
  </div>
</section>`;
  return { title: c.meta.title, description: c.meta.description, body };
}
