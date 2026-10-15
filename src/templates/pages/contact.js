import { html, esc } from '../../lib/html.js';
import { copyField, icon, panelPoster, pageStamp, posterPreload } from '../components.js';

export default function contact(ctx) {
  const c = ctx.content.contact;
  const { cfg, ui } = ctx;
  const co = cfg.company;
  const socials = [
    cfg.contact.instagram && `<a class="link" href="https://instagram.com/${encodeURIComponent(cfg.contact.instagram)}" target="_blank" rel="noopener">Instagram</a>`,
    cfg.contact.tiktok && `<a class="link" href="https://www.tiktok.com/@${encodeURIComponent(cfg.contact.tiktok)}" target="_blank" rel="noopener">TikTok</a>`,
  ].filter(Boolean);
  const f = c.form;

  const body = html`
<section class="page-intro page-intro--scene">
  <figure class="panel scene-band scene-band--still" data-panel>${panelPoster(ctx, 'r1', { eager: true })}${pageStamp(ui.stamp.contact)}</figure>
  <div class="wrap">
    <h1 class="lettering page-intro__title">${c.intro.title}</h1>
    <p class="lead page-intro__lead">${c.intro.lead}</p>
  </div>
</section>
<section class="section section--flush-top" style="--depth:.4">
  <div class="wrap contact-grid">
    <div class="stack" style="--stack:var(--s-7)">
      <div class="stack" style="--stack:var(--s-3)">
        <h2 class="h3">${c.email.title}</h2>
        ${copyField(ctx, cfg.contact.email)}
        <p class="muted small">${c.email.note}</p>
        ${socials.length ? `<p>${c.social} ${socials.join(' · ')}</p>` : ''}
      </div>
      <div class="stack" style="--stack:var(--s-3)">
        <h2 class="h3">${c.company.title}</h2>
        ${co.legalName
          ? `<address class="company"><span>${esc(co.legalName)}</span>${co.uic ? `<span>${ui.footer.uic} ${esc(co.uic)}</span>` : ''}${co.vat ? `<span>${ui.footer.vat} ${esc(co.vat)}</span>` : ''}${co.address ? `<span>${esc(co.address)}</span>` : ''}<span>${esc(co.country)}</span></address>`
          : `<p class="muted">${c.company.pending}</p>`}
      </div>
      <p class="care-note" style="margin-top:var(--s-7)">${icon('info')}<span>${c.medical}</span></p>
    </div>

    <form class="contact-form" data-contact-form novalidate data-done="${esc(f.done)}" data-done-text="${esc(f.doneText)}" data-preview="${esc(f.preview)}" data-error-message="${esc(f.errorMessage)}">
      <h2 class="h3">${f.title}</h2>
      <div class="field"><label class="label" for="c-name">${f.name} <span class="muted">${f.nameHint}</span></label><input class="input" id="c-name" name="name" autocomplete="name"></div>
      <div class="field"><label class="label" for="c-email">${f.email}</label><input class="input" id="c-email" name="email" type="email" inputmode="email" autocomplete="email" required></div>
      <div class="field"><label class="label" for="c-topic">${f.topic}</label><select class="select input" id="c-topic" name="topic">${f.topicPick ? `<option value="" selected>${f.topicPick}</option>` : ''}${f.topics.map((t) => `<option>${t}</option>`)}</select></div>
      <div class="field"><label class="label" for="c-message">${f.message}</label><textarea class="textarea" id="c-message" name="message" required></textarea></div>
      <div class="hp-field" aria-hidden="true"><label for="c-hp">Leave empty</label><input id="c-hp" name="company" tabindex="-1" autocomplete="off"></div>
      <p class="signup__note">${f.privacy} <a class="link" href="${ctx.url('privacy')}">${ui.nav.privacy}</a>.</p>
      <p class="form-status" role="status" aria-live="polite"></p>
      <div><button class="btn btn--primary contact-form__submit" type="submit">${f.submit}</button></div>
    </form>
  </div>
</section>`;
  return { title: c.meta.title, description: c.meta.description, body, styles: ['story'], preload: [posterPreload(ctx, 'r1')] };
}
