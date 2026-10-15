import { html } from '../../lib/html.js';
import { btn, chip, notice, meter, dial, slips, faqList, specs, timelineList, productRender, icon, isnt } from '../components.js';
import { wallSwitch, pageStamp } from '../components.js';

// Living design system. Not indexed, not linked from the main nav. Change tokens in base.css.
const SWATCHES = [
  ['--night', 'Page ground, early evening'],
  ['--night-warm', 'Page ground, late evening'],
  ['--graphite', 'Surfaces'],
  ['--graphite-2', 'Raised surfaces'],
  ['--line', 'Borders, inactive dial'],
  ['--paper', 'Primary text'],
  ['--paper-2', 'Secondary text'],
  ['--fog', 'Muted text (7.8:1)'],
  ['--tungsten', 'Accent: live, now, actionable'],
  ['--tungsten-lo', 'Accent, completed'],
  ['--fluoro', 'Work-mode light (before states only)'],
  ['--alert', 'Errors, always with text'],
];

export default function system(ctx) {
  const r = ctx.content.ritual;
  const h = ctx.content.home;
  const body = html`
<section class="page-intro">
  <div class="wrap">
    ${pageStamp(ctx.ui.stamp.system)}
    <h1 class="display page-intro__title">Design system</h1>
    <p class="lead page-intro__lead">The ENDSHIFT kit: an evening, in tokens. Loud and cold at the top of a page, dim and warm at the bottom. Tungsten amber means live, now or actionable. Nothing else gets it.</p>
  </div>
</section>
<div class="wrap" style="padding-bottom:var(--s-10)">
  <section class="sys-block"><h2 class="h3">Colour</h2>
    <div class="swatches">${SWATCHES.map(([v, n]) => `<div class="swatch"><span class="swatch__chip" style="background:var(${v})"></span><strong>${n}</strong><code>${v}</code></div>`)}</div>
  </section>

  <section class="sys-block"><h2 class="h3">Type</h2>
    <p class="muted">Display: Sofia Sans Extra Condensed, 760–880. Body: Sofia Sans, 400–650. Both by Lettersoup, a type foundry in Sofia, with proper Bulgarian Cyrillic. Caps only for poster lines and buttons.</p>
    <div class="sys-type">
      <p class="display" style="font-size:var(--fs-hero)">Your brain didn’t.<small>--fs-hero · display · caps</small></p>
      <p class="display" style="font-size:var(--fs-display-l)">Batch #001<small>--fs-display-l</small></p>
      <p class="display display--mixed" style="font-size:var(--fs-display-m)">Physically home.<small>--fs-display-m · mixed case</small></p>
      <p class="display display--mixed display-s">Questions, answered plainly<small>--fs-display-s</small></p>
      <p class="h3">Step title, list heading<small>.h3</small></p>
      <p class="lead">Lead text. ENDSHIFT is a simple after-work reset built around one idea.<small>.lead</small></p>
      <p>Body text at 17–18px with 1.55 line height and a 62ch measure. Bulgarian sample: Смяната ти свърши. Мозъкът ти – не.<small>body</small></p>
    </div>
  </section>

  <section class="sys-block"><h2 class="h3">Buttons</h2>
    <div class="sys-row">${btn({ href: '#', label: 'Start the free reset', size: 'xl' })}${btn({ href: '#', label: 'Meet RESET', variant: 'ghost', size: 'xl' })}</div>
    <div class="sys-row">${btn({ href: '#', label: 'Primary' })}${btn({ href: '#', label: 'Ghost', variant: 'ghost' })}${btn({ href: '#', label: 'Quiet', variant: 'quiet', iconName: 'calendar' })}${btn({ href: '#', label: 'Small', size: 'sm' })}<a class="text-btn" href="#">Text action</a></div>
  </section>

  <section class="sys-block"><h2 class="h3">Status</h2>
    <div class="sys-row">${chip('In development')}${chip('Preorders open', 'live')}${chip('Not final', 'warm')}${chip('Done', 'done')}${chip('Now', 'now')}</div>
    ${notice('<strong>Notice.</strong> Used for drafts, previews and anything not final.')}
    ${notice('Formula subject to final confirmation', { loud: true, iconName: 'alert' })}
  </section>

  <section class="sys-block"><h2 class="h3">Forms</h2>
    <div class="grid-2">
      <div class="stack">
        <div class="field"><label class="label" for="sys-in">Email</label><input class="input" id="sys-in" placeholder="you@example.com"></div>
        <div class="field"><label class="label" for="sys-err">With an error</label><input class="input" id="sys-err" aria-invalid="true" value="name@"><p class="form-status" data-tone="error">Enter an email address like name@example.com.</p></div>
        <fieldset class="choices"><legend>Choice chips</legend><label class="choice"><input type="radio" name="sys-c" checked><span>I work late</span></label><label class="choice"><input type="radio" name="sys-c"><span>I study late</span></label></fieldset>
      </div>
      <div class="prefs"><label class="switch" for="sys-sw"><span class="switch__text"><span class="switch__title">Switch</span><span class="switch__hint">Settings and preferences</span></span><input type="checkbox" id="sys-sw" checked></label><label class="switch" for="sys-sw2"><span class="switch__text"><span class="switch__title">Off</span><span class="switch__hint">Default for anything that makes sound</span></span><input type="checkbox" id="sys-sw2"></label></div>
    </div>
  </section>

  <section class="sys-block"><h2 class="h3">Work-mode switch</h2><p class="muted">One state for the whole site, saved for the evening (until 05:00). Hero size and header size shown; the opening uses an extra-large copy. Flip, drag, or use Space, Enter and the arrow keys.</p><div class="sys-row" style="align-items:center;gap:var(--s-6)">${wallSwitch(ctx, { source: 'system', cls: 'wallswitch--hero' })}${wallSwitch(ctx, { source: 'system', cls: 'wallswitch--mini' })}</div></section>
  ${ctx.cfg.game?.enabled && ctx.content.game ? `<section class="sys-block"><h2 class="h3">The hero game</h2><p class="muted">One game a day on the home page (Monday → Sunday: ${ctx.cfg.game.week.join(', ')}). Open any of them here; a game played from these links doesn't count as today's.</p><ul class="sys-row" style="list-style:none;padding:0;gap:var(--s-3) var(--s-5)">${Object.entries(ctx.content.game.games).map(([id, g]) => `<li><a class="link" href="${ctx.url('home')}${ctx.url('home').includes('?') ? '&' : '?'}job=${id}">${g.job}</a> <span class="muted small">(${g.type === 'room' ? '3D room' : g.type === 'flood' ? 'message flood' : 'torch'})</span></li>`).join('')}</ul></section>` : ''}
  <section class="sys-block"><h2 class="h3">Counter and dial</h2>
    <div class="grid-2">${meter(ctx, { id: 'sys-meter' })}${dial(r.steps, { time: '20:00', caption: 'minutes, start to finish', id: 'sys-dial' })}</div>
  </section>

  <section class="sys-block"><h2 class="h3">Time-card slips</h2><p class="muted">Times appear only where the content really is a moment in time.</p></section>
</div>
${slips(h.recog.scenes.slice(0, 3), 'Example slips')}
<div class="wrap" style="padding-bottom:var(--s-10)">
  <section class="sys-block"><h2 class="h3">Rows, not cards</h2>${specs([['Format', 'Capsules'], ['Formula', `Being selected ${chip('Not final', 'warm')}`]])}${timelineList(ctx, ctx.timeline.slice(4, 6), { compact: true, offset: 4 })}</section>
  <section class="sys-block"><h2 class="h3">Is / isn’t</h2>${isnt({ isTitle: 'What it is', isntTitle: 'What it isn’t', is: ['A cue that the workday is over.'], isnt: ['A sleeping pill.'] })}</section>
  <section class="sys-block"><h2 class="h3">Disclosure</h2>${faqList([{ id: 'sys', q: 'What happens when I open this?', a: '<p>The answer, at reading width.</p>' }], { prefix: 'sys' })}</section>
  <section class="sys-block"><h2 class="h3">Product render</h2><div style="max-width:28rem">${productRender(ctx)}</div></section>
  <section class="sys-block"><h2 class="h3">Icons</h2><div class="sys-row">${['bus', 'bag', 'phone', 'receipt', 'laptop', 'moon', 'notebook', 'shirt', 'glass', 'lamp', 'dnd', 'breath', 'book', 'clock', 'calendar', 'mail', 'share', 'check', 'x', 'info', 'alert'].map((n) => `<span title="${n}">${icon(n)}</span>`)}</div></section>
  <section class="sys-block"><h2 class="h3">Motion and modes</h2>
    ${specs([
      ['Durations', '140 / 260 / 520 / 1100 ms. Interactive transitions lengthen with --depth further down a page.'],
      ['The one loud moment', 'Hero: notifications decelerate over 3.4 s and stop; the second headline settles from three copies into one.'],
      ['Ritual', 'The interface dims in four steps as the 20 minutes pass. Breathing ring follows the step clock, so pausing pauses it.'],
      ['Reduced motion', 'prefers-reduced-motion removes all movement; the hero renders settled.'],
      ['Low-stim mode', 'Header switch. No motion, no grain, softer contrast, warm ground everywhere. Saved per device.'],
      ['Focus', '3 px tungsten outline, 3 px offset (paper on tungsten buttons). Targets are 44 px or larger.'],
    ])}
  </section>
</div>`;
  return { title: 'Design system | ENDSHIFT', description: 'ENDSHIFT design tokens and components.', body };
}
