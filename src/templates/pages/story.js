import { html, esc } from '../../lib/html.js';
import { chip, icon, specs, signupForm, timelineList, shot, founderBlock } from '../components.js';

export default function story(ctx) {
  const c = ctx.content.story;
  const H = (ctx.content.home && ctx.content.home.story) || {};
  const { cfg } = ctx;
  const socials = [
    cfg.contact.instagram && `<a class="link" href="https://instagram.com/${encodeURIComponent(cfg.contact.instagram)}" target="_blank" rel="noopener" data-track="story_engage" data-track-id="instagram">Instagram</a>`,
    cfg.contact.tiktok && `<a class="link" href="https://www.tiktok.com/@${encodeURIComponent(cfg.contact.tiktok)}" target="_blank" rel="noopener" data-track="story_engage" data-track-id="tiktok">TikTok</a>`,
  ].filter(Boolean);

  const body = html`<div class="comic">
<section class="page-intro page-intro--scene">
  <figure class="panel scene-band" data-panel>${shot(ctx, 'build', { eager: true })}</figure>
  <div class="wrap">
    <h1 class="lettering page-intro__title">${c.intro.title}</h1>
    <p class="lead page-intro__lead">${c.intro.lead}</p>
  </div>
</section>

<section class="section section--after-intro" style="--depth:.15">
  <div class="wrap split">
    <h2 class="display display--mixed founder__title">${c.note.title}</h2>
    <div class="founder__story" style="margin-top:0">
      ${c.note.text.map((p) => `<p>${p}</p>`)}
      ${founderBlock(ctx, c.note.sign)}
      ${c.note.video ? `<p><a class="link" href="${esc(cfg.founder.videoUrl)}" target="_blank" rel="noopener" data-track="story_engage" data-track-id="video">${c.note.video}</a></p>` : ''}
    </div>
  </div>
</section>

<section class="section" style="--depth:.35">
  <div class="wrap split decided">
    <h2 class="section-title">${c.decided.title}</h2>
    ${specs(c.decided.rows.map(([k, v, done]) => [k, `<span>${v}</span>${chip(done ? c.decided.yes : c.decided.no, done ? 'done' : 'warm')}`]))}
  </div>
</section>

<section class="section" style="--depth:.6" data-story-timeline>
  <div class="wrap">
    <div class="section-head">
      <h2 class="section-title">${c.timeline.title}</h2>
      <p class="muted">${c.timeline.lead}</p>
    </div>
    <div class="board" data-pinboard>
      <svg class="board__string" data-string aria-hidden="true" focusable="false"><path d="" pathLength="1"/></svg>
      <div class="board__extras" aria-hidden="true">
        <div class="board__ad"><span class="board__ad-k">${esc(H.sponsored || 'Sponsored')}</span>${(H.ad || []).map((l, i) => `<span class="board__ad-l board__ad-l--${i}">${esc(l)}</span>`).join('')}</div>
        <div class="board__mail"><span class="board__mail-from">${c.board.from}</span><span class="board__mail-line">${c.board.line}</span></div>
        <div class="board__sticky">${c.board.note}</div>
      </div>
      ${timelineList(ctx, ctx.timeline, { track: true, board: true })}
    </div>
  </div>
</section>

<section class="section" style="--depth:.85" id="follow">
  <div class="wrap split">
    <div>
      <h2 class="section-title">${c.follow.title}</h2>
      <p class="lead section-lead">${c.follow.text}</p>
      ${socials.length ? `<p style="margin-top:var(--s-5)">${c.follow.social} ${socials.join(' · ')}</p>` : ''}
    </div>
    <div style="align-self:end">${signupForm(ctx, { source: 'story', list: 'build-updates' })}</div>
  </div>
</section>`;

  return { title: c.meta.title, description: c.meta.description, body: body + '</div>', styles: ['story', 'world'], scripts: ['ink', 'story', 'world'] };
}
