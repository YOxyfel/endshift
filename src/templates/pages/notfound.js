import { html, esc } from '../../lib/html.js';
import { btn, shiftLabel } from '../components.js';

// A dark hallway, drawn in one-point perspective. Each door is a real link; the torch follows the
// pointer (or the focused door), and there's a light switch by the end door.
const DOORS = [
  { key: 'ritual', q: '60,171 170,203 170,591 60,661', box: [5, 24.4, 9.2, 70] },
  { key: 'reset', q: '260,228 320,245 320,494 260,533', box: [21.7, 32.6, 5, 43.6] },
  { key: 'batch', q: '1140,171 1030,203 1030,591 1140,661', box: [85.8, 24.4, 9.2, 70] },
  { key: 'story', q: '940,228 880,245 880,494 940,533', box: [73.3, 32.6, 5, 43.6] },
  { key: 'home', q: '560,300 640,300 640,430 560,430', box: [46.7, 42.9, 6.7, 18.6] },
];

// the strip of light under a door, along its bottom edge (the last two points of its quad)
function gap(q) {
  const p = q.split(' ').map((xy) => xy.split(',').map(Number));
  const [a, b] = [p[2], p[3]];
  return `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`;
}

function hall() {
  const boards = Array.from({ length: 9 }, (_, i) => {
    const t = (i + 1) / 10, x0 = 420 + (780 - 420) * t, xb = 1200 * t;
    return `<path d="M${x0.toFixed(1)} 430L${xb.toFixed(1)} 700"/>`;
  }).join('');
  const gaps = DOORS.map((d) => gap(d.q)).join('');
  return `<svg class="hallway__svg" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="hw-ceil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d0c0b"/><stop offset="1" stop-color="#1f1b17"/></linearGradient>
      <linearGradient id="hw-wl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#191612"/><stop offset="1" stop-color="#302922"/></linearGradient>
      <linearGradient id="hw-wr" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#171410"/><stop offset="1" stop-color="#2c261f"/></linearGradient>
      <linearGradient id="hw-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a241d"/><stop offset="1" stop-color="#110e0b"/></linearGradient>
      <linearGradient id="hw-door" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f3228"/><stop offset="1" stop-color="#2e241c"/></linearGradient>
      <radialGradient id="hw-pool" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3d6" stop-opacity=".28"/><stop offset="1" stop-color="#fff3d6" stop-opacity="0"/></radialGradient>
      <filter id="hw-blur" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="7"/></filter>
    </defs>
    <polygon points="0,0 1200,0 780,230 420,230" fill="url(#hw-ceil)"/>
    <polygon points="0,0 420,230 420,430 0,700" fill="url(#hw-wl)"/>
    <polygon points="1200,0 780,230 780,430 1200,700" fill="url(#hw-wr)"/>
    <polygon points="0,700 1200,700 780,430 420,430" fill="url(#hw-floor)"/>
    <rect x="420" y="230" width="360" height="200" fill="#24201a"/>
    <g stroke="#120f0c" stroke-width="2" opacity=".7">${boards}</g>
    <path d="M0 520L420 395M1200 520L780 395" stroke="#3a3229" stroke-width="3"/>
    <path d="M0 0L420 230M1200 0L780 230M0 700L420 430M1200 700L780 430" stroke="#0b0a09" stroke-width="2" opacity=".8"/>
    <g class="hallway__pool"><ellipse cx="600" cy="150" rx="420" ry="90" fill="url(#hw-pool)"/><ellipse cx="600" cy="560" rx="460" ry="120" fill="url(#hw-pool)"/></g>
    <g class="hallway__tube"><rect x="540" y="160" width="120" height="10" rx="5"/></g>
    ${DOORS.map((d) => `<polygon class="hallway__frame" points="${d.q}"/><polygon class="hallway__door" points="${d.q}" fill="url(#hw-door)"/>`).join('')}
    <g fill="#c9b48a" opacity=".55"><circle cx="152" cy="410" r="5"/><circle cx="310" cy="370" r="3"/><circle cx="1048" cy="410" r="5"/><circle cx="890" cy="370" r="3"/><circle cx="628" cy="368" r="2.5"/></g>
    <rect x="852" y="318" width="22" height="34" rx="3" fill="#e9e6de" opacity=".85"/>
    <g class="hallway__gaps"><path d="${gaps}" stroke="#ffb35c" stroke-width="16" opacity=".35" filter="url(#hw-blur)"/><path d="${gaps}" stroke="#ffc274" stroke-width="2.5"/></g>
  </svg>
  <svg class="hallway__glows" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
    <defs><filter id="hw-blur2" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="8"/></filter></defs>
    <path d="${gaps}" stroke="#ffad55" stroke-width="18" opacity=".32" filter="url(#hw-blur2)"/>
    <path d="${gaps}" stroke="#ffc274" stroke-width="2.2" opacity=".85"/>
    <rect x="852" y="318" width="22" height="34" rx="3" fill="none" stroke="#9fe0b0" stroke-width="1.5" opacity=".5"/>
  </svg>`;
}

export default function notfound(ctx) {
  const c = ctx.content.notfound;
  const { ui } = ctx;
  const label = { ritual: ui.nav.ritual, reset: ui.nav.reset, batch: ui.nav.batch, story: ui.nav.story, home: ui.common.backHome };
  const href = { ritual: ctx.url('ritual'), reset: ctx.url('reset'), batch: ctx.url('batch'), story: ctx.url('story'), home: ctx.url('home') };
  const body = html`
<section class="page-intro notfound" data-hallway>
  <div class="wrap">
    <p class="timecard" aria-hidden="true"><span class="timecard__cell"><span class="timecard__k">404</span><span class="timecard__v timecard__v--now">${c.stamp || 'Out'}</span></span></p>
    <h1 class="display page-intro__title" style="margin-top:var(--s-5);max-width:none">${c.title}</h1>
    <p class="lead page-intro__lead">${c.lead}</p>
    <div class="hallway" data-hall-scene>
      ${hall()}
      <nav class="hallway__doors" aria-label="${esc(c.hallway.doors)}">
        ${DOORS.map((d) => `<a class="hallway__link hallway__link--${d.key}" href="${esc(href[d.key])}" style="left:${d.box[0]}%;top:${d.box[1]}%;width:${d.box[2]}%;height:${d.box[3]}%" data-track="cta_click" data-track-id="404_door_${d.key}"><span>${label[d.key]}</span></a>`).join('')}
      </nav>
      <button class="hallway__switch" type="button" data-hall-switch aria-pressed="false"><span class="visually-hidden">${c.hallway.switch}</span></button>
      <div class="hallway__dark" aria-hidden="true"></div>
      <p class="hallway__hint">${c.hallway.hint}</p>
    </div>
    <nav class="hallway__list" aria-label="${esc(c.hallway.doors)}"><ul>${DOORS.map((d) => `<li><a href="${esc(href[d.key])}" data-track="cta_click" data-track-id="404_list_${d.key}">${label[d.key]}</a></li>`).join('')}</ul></nav>
    <div class="cta-row notfound__ctas" style="margin-top:var(--s-6)">
      ${btn({ href: ctx.url('ritual'), label: shiftLabel(ui.cta.ritual, ui.cta.ritualOff), size: 'xl', trackId: '404_ritual' })}
      ${btn({ href: ctx.url('home'), label: ui.common.backHome, variant: 'ghost', size: 'xl', trackId: '404_home' })}
    </div>
  </div>
</section>`;
  return { title: c.meta.title, description: c.meta.description, body, styles: ['world'], scripts: ['world'] };
}
