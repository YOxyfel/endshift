import { html } from '../../lib/html.js';
import { specs } from '../components.js';

export default function cookies(ctx) {
  const c = ctx.content.cookies;
  const needsConsent = ctx.cfg.analytics.provider === 'ga4';
  const body = html`
<section class="page-intro">
  <div class="wrap">
    <h1 class="display page-intro__title">${c.title}</h1>
    <p class="lead page-intro__lead">${c.lead}</p>
  </div>
</section>
<section class="section section--flush-top" style="--depth:.5">
  <div class="wrap stack" style="--stack:var(--s-8)">
    <div class="prefs">
      ${needsConsent
        ? `<label class="switch" for="pref-analytics"><span class="switch__text"><span class="switch__title">${c.analytics.title}</span><span class="switch__hint">${c.analytics.hint}</span></span><input type="checkbox" id="pref-analytics" data-pref-analytics data-saved-msg="${c.analytics.saved}"></label>`
        : `<p class="switch"><span class="switch__text"><span class="switch__title">${ctx.ui.consent.title}</span><span class="switch__hint">${c.cookieless}</span></span>${c.notInUse ? `<span class="chip">${c.notInUse}</span>` : ''}</p>`}
      <label class="switch" for="pref-calm"><span class="switch__text"><span class="switch__title">${c.calm.title}</span><span class="switch__hint">${c.calm.hint}</span></span><input type="checkbox" id="pref-calm" data-pref-calm></label>
      ${c.clearTitle ? `<div class="switch switch--action"><span class="switch__text"><span class="switch__title">${c.clearTitle}</span><span class="switch__hint">${c.clearHint}</span></span><button class="btn btn--ghost btn--sm" type="button" data-clear-local data-done-msg="${c.cleared}">${c.clear}</button></div>` : ''}
    </div>
    <div class="split">
      <div><h2 class="section-title section-title--s">${c.storedTitle}</h2><p class="muted section-lead">${c.storedNote}</p></div>
      <div>
        ${specs(c.stored.map(([k, v]) => [`<code>${k}</code>`, v]))}
        ${c.clearTitle ? '' : `<p style="margin-top:var(--s-5)"><button class="btn btn--ghost btn--sm" type="button" data-clear-local data-done-msg="${c.cleared}">${c.clear}</button></p>`}
      </div>
    </div>
  </div>
</section>`;
  return { title: c.meta.title, description: c.meta.description, body };
}
