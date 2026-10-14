import { html } from '../lib/html.js';
import { btn, chip, shot } from './components.js';

/* The home page evening as one continuous shot (assets/js/film.js moves the camera as you
   scroll). Every beat is also a plain comic panel with its words, which is what you get
   without WebGL, with reduced motion or in low-stimulation mode. Words that appear and
   disappear carry data-show="<beat> <t>|<beat> <t>" (when, in the film's timeline); words
   pinned to something in the room carry data-anchor="<room>:x,y,z" (centimetres). */

// red marker on the calendar: a cross for each evening gone, a ring round tonight
const CROSS = `<svg class="cal__mark cal__mark--x" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path pathLength="1" d="M14 16 C 38 40, 60 60, 86 84"/><path pathLength="1" d="M84 14 C 60 40, 40 62, 16 86"/></svg>`;
const RING = `<svg class="cal__mark cal__mark--ring" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path pathLength="1" d="M52 5 C 82 4, 97 26, 95 52 C 93 80, 70 96, 46 95 C 19 93, 4 72, 6 47 C 8 22, 28 5, 61 9"/></svg>`;

const ln = (lines) => lines.map((l) => `<span class="ln">${l}</span>`).join('');
const show = (a, b) => `data-show="${a}|${b}"`;

export function film(ctx) {
  const c = ctx.content.home;
  const S = c.story;
  const F = S.film;
  const r = ctx.content.ritual;
  const { ui, state } = ctx;
  const sc = c.recog.scenes;
  const views = ['bus', 'hall', 'sofa', 'tickets', 'desk', 'bed'];
  const mm = (m) => String(m).padStart(2, '0');
  // where the thoughts float in the hallway, as you walk past them
  const thoughtsAt = ['28,150,100', '-34,118,40', '32,146,-24', '-26,104,-80'];
  // one at a time, so each one reads and they never pile up on a phone
  const thoughtsWhen = [['hall_in .25', 'hall_in .7'], ['hall_in .72', 'hall_walk .14'], ['hall_walk .16', 'hall_walk .36'], ['hall_walk .38', 'hall_walk .72']];
  const tonight = sc[5];
  // the work notifications float round the dark bedroom, wherever you look
  const pingsAt = ['88,126,56', '150,150,114', '112,112,83', '126,120,154', '90,100,16', '-10,150,10', '-30,170,60'];
  const until = (i) => (i < r.steps.length - 1 ? r.steps[i + 1].minute : 20);

  return html`<section class="film" id="after-game" data-film data-hide-sticky aria-labelledby="film-title">
  <div class="film__stage" data-film-stage>
    <canvas class="film__aura" data-film-aura aria-hidden="true"></canvas>
    <canvas class="film__gl" data-film-gl aria-hidden="true"></canvas>
    <canvas class="film__fx" data-film-fx aria-hidden="true"></canvas>
    <div class="film__zoom" data-film-zoom aria-hidden="true"><canvas></canvas></div>
    <div class="film__frame" data-film-frame aria-hidden="true">
      <div class="ff__edge">
        <p class="ff__head"><span class="ff__n" data-ff-n></span><span class="ff__t" data-ff-t></span><span class="ff__time" data-ff-time></span></p>
        <ol class="ff__pips">${r.steps.map(() => '<li></li>').join('')}</ol>
      </div>
    </div>
    <div class="film__lids" data-film-lids aria-hidden="true"><i></i><i></i></div>
    <div class="film__breath" data-film-breath aria-hidden="true"><i></i><span data-film-breath-word>${F.breathIn}</span></div>

    <article class="beat beat--hall">
      <figure class="panel beat__panel" data-panel>${shot(ctx, 'hall')}</figure>
      <div class="beat__text">
        <p class="cap cap--stamp fi fi--stamp" ${show('hall_in 0', 'hall_walk .4')}>${S.home.stamp}</p>
        <h2 class="lettering fi fi--title hall__title" id="film-title" ${show('hall_in 0', 'hall_walk .3')}>${ln(c.recog.title)}</h2>
        <ul class="thoughts" role="list">${c.recog.lines
          .slice(0, 4)
          .map((l, i) => `<li class="bubble bubble--think fi fi--pin" data-anchor="hall:${thoughtsAt[i]}" ${show(thoughtsWhen[i][0], thoughtsWhen[i][1])}>${l}</li>`)
          .join('')}</ul>
        <p class="sfx sfx--buzz fi fi--pin" aria-hidden="true" data-anchor="hall:92,92,20" ${show('hall_in .55', 'hall_walk .62')}>${S.home.sfx}</p>
        <p class="cap cap--big fi fi--end" ${show('hall_walk .62', 'hall_turn .5')}>${c.recog.lines[4]}</p>
      </div>
    </article>

    <article class="beat beat--cal">
      <div class="cal" data-film-cal>
        <div class="cal__rings" aria-hidden="true"></div>
        <header class="cal__head">
          <h2 class="cal__title">${F.calendar.title}</h2>
          <p class="cal__sub">${F.calendar.sub}</p>
        </header>
        <ol class="cal__grid" aria-label="${c.recog.scenesLabel}">${sc
          .map(
            (s, i) => html`<li class="cal__day${i === 5 ? ' cal__day--tonight' : ''}" data-cal-day="${i}">
              <div class="cal__cell">
                <div class="cal__shot" data-panel>${shot(ctx, views[i], { sizes: '(min-width: 900px) 31vw, 45vw' })}${i === 5 ? '<canvas class="cal__live" data-film-tonight aria-hidden="true"></canvas>' : ''}</div>
                <p class="cal__dow">${F.calendar.days[i]}</p>
                <p class="cap cap--stamp cal__time"><time>${s.time}</time><span class="cal__place">${s.place}</span></p>
                ${i === 5 ? RING + `<p class="cal__tonight" aria-hidden="true">${F.calendar.tonight}</p>` : CROSS}
              </div>
              <p class="bubble bubble--think cal__thought">${s.text}</p>
            </li>`,
          )
          .join('')}</ol>
      </div>
    </article>

    <article class="beat beat--bed">
      <figure class="panel beat__panel" data-panel>${shot(ctx, 'bed')}</figure>
      <div class="beat__text">
        <p class="cap cap--stamp fi fi--stamp" ${show('bed_wake 0', 'bed_wake .75')}>${tonight.time} · ${tonight.place}</p>
        <p class="bubble bubble--think fi fi--mid" ${show('bed_wake .04', 'bed_wake .42')}>${tonight.text}</p>
        <p class="cap cap--big fi fi--low" ${show('bed_wake .38', 'bed_wake .7')}>${F.bed.lit}</p>
        <p class="cap fi fi--low" ${show('bed_wake .72', 'bed_search .1')}>${F.bed.up}</p>
        <ul class="wpings" role="list">${F.pings
          .map((pg, i) => `<li class="wping fi fi--pin" data-anchor="bed:${pingsAt[i]}" ${show(`bed_wake ${(0.3 + i * 0.05).toFixed(2)}`, 'bed_click .42')}><b>${pg.from}</b><span>${pg.text}</span></li>`)
          .join('')}</ul>
        <p class="cap fi fi--low" ${show('bed_search .14', 'bed_search .3')}>${F.bed.left}</p>
        <p class="cap fi fi--low" ${show('bed_search .36', 'bed_search .5')}>${F.bed.right}</p>
        <p class="bubble bubble--say fi fi--pin" data-anchor="bed:150,14,-92" ${show('bed_search .6', 'bed_search .8')}>${F.bed.under}</p>
        <p class="lettering fi fi--pin fi--found" data-anchor="bed:118,132,190" ${show('bed_search .9', 'bed_walk .45')}>${F.bed.found}</p>
      </div>
    </article>

    <article class="beat beat--line">
      <figure class="panel beat__panel" data-panel>${shot(ctx, 'lineEve')}</figure>
      <div class="beat__text">
        <p class="sfx sfx--click fi fi--pin" aria-hidden="true" data-anchor="bed:118,124,190" ${show('bed_click .38', 'crack .3')}>${F.bed.sfx}</p>
        <p class="lettering fi fi--off" ${show('crack .06', 'crack .6')}>${F.bed.off}</p>
        <p class="cap cap--big fi fi--stamp" ${show('crack .66', 'reveal .14')}>${S.line.after}</p>
        <h2 class="lettering fi fi--idea" ${show('reveal .2', 'reveal .64')}>${c.idea.title}</h2>
        <ol class="idea fi" ${show('reveal .32', 'reveal .64')}>${c.idea.steps
          .map((st) => `<li class="idea__w idea__w--${st.key}"><span class="idea__word">${st.word}</span><span class="idea__note">${st.note}</span></li>`)
          .join('')}</ol>
        <div class="coda fi" ${show('reveal .68', 'rit_in .12')}>${c.idea.coda.map((l) => `<p class="cap">${l}</p>`).join('')}</div>
      </div>
    </article>

    <article class="beat beat--ritual">
      <div class="beat__text">
        <div class="rintro fi" data-film-rintro ${show('rit_in .14', 's1 .1')}>
          <p class="cap cap--stamp rintro__k">${F.ritual.kicker}</p>
          <h2 class="lettering rintro__title">${ln(F.ritual.start)}</h2>
          <ol class="rintro__steps">${r.steps.map((x, i) => `<li style="--i:${i}"><span>${i + 1}</span>${x.title}</li>`).join('')}</ol>
          <p class="cap rintro__free" style="--i:7">${c.ritual.title.join(' ')}</p>
        </div>
        <ol class="rsteps">${r.steps
          .map(
            (x, i) => html`<li class="rstep fi" data-min="${x.minute}" data-title="${x.title}" data-from="${mm(x.minute)}:00" data-to="${mm(until(i))}:00" ${i === 3 ? show('s4 .06', 's4 .22') : show(`s${i + 1} .2`, `s${i + 1} .92`)}>
              <figure class="panel beat__panel" data-panel>${shot(ctx, `r${i + 1}`)}</figure>
              <div class="rstep__card">
                <p class="cap cap--stamp rstep__min">${F.ritual.step.replace('{n}', i + 1)} · ${mm(x.minute)}:00 → ${mm(until(i))}:00</p>
                <h3 class="rstep__title">${x.title}</h3>
                <p class="rstep__do">${F.steps[i].do}</p>
                <p class="rstep__why"><b>${F.ritual.why}</b> ${F.steps[i].why}</p>
                ${i === 2 ? `<p class="rstep__opt"><b>${F.ritual.optional}</b> ${F.reset}</p>` : ''}
              </div>
            </li>`,
          )
          .join('')}</ol>
        <div class="rdone fi" ${show('rit_done .06', 'out .2')}>
          <p class="lettering rdone__title">${r.done.title}</p>
          <div class="rdone__copy">${c.ritual.copy.map((l) => `<p>${l}</p>`).join('')}</div>
          <div class="rdone__cta">${btn({ href: ctx.url('ritual'), label: ui.cta.ritualLong, size: 'xl', trackId: 'home_ritual' })}</div>
        </div>
      </div>
    </article>

    <article class="beat beat--out">
      <figure class="panel beat__panel" data-panel>${shot(ctx, 'end')}</figure>
      <div class="beat__text">
        <p class="cap cap--big fi fi--low" ${show('out .18', 'out .7')}>${F.out.line}</p>
        <p class="cap fi fi--low2" ${show('out .5', 'sleep .28')}>${F.out.sub}</p>
      </div>
    </article>

    <article class="beat beat--finale">
      <figure class="panel beat__panel" data-panel>${shot(ctx, 'jar')}</figure>
      <div class="beat__text">
        <p class="fi fi--endline" ${show('sun .64', 'end 1')}><span class="lettering">${F.end}</span></p>
        <p class="fi fi--zero" ${show('end .5', 'end 1')}>${F.zero}</p>
        <p class="fi fi--chip" ${show('finale .1', 'sun .3')}>${chip(state.packagingFinal ? ui.product.renderCaption : ui.product.renderCaptionConcept, state.packagingFinal ? '' : 'warm')}</p>
      </div>
    </article>

    <div class="film__hud" aria-hidden="true">
      <span class="film__bar"><i data-film-bar></i></span>
    </div>
    <p class="film__hint" aria-hidden="true" data-film-hint>${F.hint}</p>
    <a class="film__skip" href="#after-film" data-film-skip data-track="cta_click" data-track-id="film_skip">${F.skip}</a>
  </div>
</section>`;
}
