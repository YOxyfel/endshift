/* ENDSHIFT: small experiences that make each page its own place in the same world.
   - RESET: the concept bottle on the nightstand, turnable (drag it, or the slider / arrow keys);
     its back label is the spec sheet.
   - Batch #001: the crate of 150 fills with the real count; the 500-bottle pallet behind it.
   - Story: the founder's pinboard; a red string runs from pin to pin, oldest first.
   - Formula: the vials, one per ingredient (they fill only once doses are confirmed).
   - Guides: a reading lamp that dims as you read, and "take this into tonight" (saved on this
     device; the ritual's first step shows it).
   - 404: a dark hallway; the torch follows your pointer or the focused door, or find the switch.
   Every one leaves a plain page behind it: no WebGL, reduced motion or low-stim just show the
   page as it was. Nothing here sends anything anywhere. */
(function () {
  'use strict';

  var ES = (window.ES = window.ES || {});
  var root = document.documentElement;
  var CFG = {};
  try { CFG = JSON.parse((document.getElementById('es-config') || {}).textContent || '{}'); } catch (e) {}
  var WCFG = CFG.world || {};
  var qs = function (s, el) { return (el || document).querySelector(s); };
  var qsa = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var still = function () { return !!(ES.reducedMotion && ES.reducedMotion()); };
  var calm = function () { return root.getAttribute('data-calm') === 'on'; };
  var store = ES.store || { get: function () { return null; }, set: function () {} };
  var track = ES.track || function () {};
  var DEG = Math.PI / 180;
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var today = function () { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  function inView(el, cb, opt) {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver(function (es) { es.forEach(function (e) { cb(e.isIntersecting, e); }); }, opt || { threshold: 0.15 }).observe(el);
  }

  /* ------------------------------------------------------------------ RESET: the turntable */
  function turntable(el) {
    var ER = ES.EveningRoom, Ink = ES.Ink;
    if (!ER || !Ink || !Ink.supported()) return;
    var T = WCFG.turntable || {};
    var cv = qs('[data-tt-canvas]', el), ui = qs('[data-tt-ui]', el), range = qs('[data-tt-range]', el);
    if (!cv || !range) return;
    var room = null;
    try { room = new ER.Room(cv, { props: T.props || {}, strings: CFG.strings || {}, night: ER.tonight() }); } catch (e) { room = null; }
    if (!room || !room.ok) return;
    // the jar's back label is the spec sheet
    var PT = ES.inkPaint;
    var specLabel = function () { return PT.cJarBack({ title: T.backTitle, rows: T.back, concept: T.line2 }); };
    var build = function () { if (room.K.jar) room.K.jar.back.map = room.B.T('jarlabel-spec', specLabel); };
    build();
    // the still shot behind it isn't needed any more (story.js would draw it)
    var still0 = qs('[data-shot]', el);
    if (still0) still0.removeAttribute('data-shot');
    // once the page's fonts are in, paint the label again with them
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () {
      ['jarlabel-spec', 'cjar-front', 'cjar-plate'].forEach(function (k) { var t = room.B.tex[k]; if (t && t.make) t.update(t.make()); });
      dirty = true;
    });
    el.classList.add('is-live');
    ui.hidden = false;

    var FRONT = +T.front || 0; // the bottle's turn that shows the front to this camera
    var ang = 0, vel = 0, target = null, drag = null, lastUser = -1e9, dirty = true, on = false, raf = 0, last = 0, clockT = 0;
    var P = { lid: 1, write: 1, curtains: 1, pour: 1, sip: 0, drink: 'water', drawer: { flip: 1, open: 0, into: 1, shut: 1 }, orbs: { come: 1, out: 0, dream: 0, wide: 1 }, book: { open: 0, pages: 0 }, quiet: 'read', spin: 0, face: FRONT, float: 0, dreamOnly: false };
    var L = { lamp: 1, desk: 0, fill: 0.5, dim: 0.85, warmth: 1, fairy: 1, laptop: 0, street: 0.16, phone: 0, night: 0.12, moon: 0, fin: 0, hatch: 0.5 };
    var cam = null;
    function look(at, to, vf) {
      var dx = to[0] - at[0], dy = to[1] - at[1], dz = to[2] - at[2];
      return { pos: at.slice(), yaw: Math.atan2(dx, -dz) / DEG, pitch: Math.atan2(dy, Math.hypot(dx, dz)) / DEG, roll: 0, fovy: vf * DEG };
    }
    function size() {
      var w = el.clientWidth, h = el.clientHeight;
      room.resize(w, h, (ES.dprCap ? ES.dprCap(w * h > 900000 ? 1.25 : 1.75) : Math.min(window.devicePixelRatio || 1, w * h > 900000 ? 1.25 : 1.75)));
      var a = w / h;
      // closer on a phone, so the bottle isn't a speck; a little to the right on wide screens
      cam = a < 1.2 ? look([-67, 68, 114], [-90, 61.5, 161], 34) : look([-66, 68, 117], [-94, 61, 160], 30);
      dirty = true;
    }
    function label(a) {
      var d = ((Math.round(a) % 360) + 360) % 360;
      range.value = d;
      range.setAttribute('aria-valuetext', d < 45 || d > 315 ? T.front_ || 'Front' : d > 135 && d < 225 ? T.back_ || 'Back' : d + '°');
    }
    function frame(now) {
      raf = 0;
      if (!on) return;
      var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      var moving = !!drag || Math.abs(vel) > 0.5 || target != null;
      var auto = !still() && !calm() && now - lastUser > 4000;
      if (target != null) {
        var d = ((target - ang + 540) % 360) - 180;
        ang += d * Math.min(1, dt * 7);
        if (Math.abs(d) < 0.3) { ang = target; target = null; }
      } else if (!drag) {
        ang += vel * dt; vel *= Math.pow(0.04, dt);
        if (auto) ang += 9 * dt;
      }
      clockT += dt;
      if (moving || auto || dirty || !still()) {
        P.face = FRONT + ang;
        room.pose(P, clockT, cam, dt);
        room.render(cam, L, clockT, false);
        label(ang);
        dirty = false;
      }
      if (moving || auto || !still()) raf = requestAnimationFrame(frame);
    }
    function kick() { if (on && !raf) { last = 0; raf = requestAnimationFrame(frame); } }
    cv.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, a: ang, t: performance.now() }; vel = 0; target = null; lastUser = performance.now();
      try { cv.setPointerCapture(e.pointerId); } catch (er) {}
      el.classList.add('is-turning');
      kick();
    });
    cv.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var now = performance.now(), na = drag.a + (e.clientX - drag.x) * 0.45;
      vel = (na - ang) / Math.max(0.016, (now - drag.t) / 1000); drag.t = now;
      ang = na; lastUser = now; dirty = true; kick();
    });
    var up = function () { if (!drag) return; drag = null; vel = clamp(vel, -540, 540); lastUser = performance.now(); el.classList.remove('is-turning'); track('reset_turn', {}); kick(); };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    range.addEventListener('input', function () { target = +range.value; lastUser = performance.now(); kick(); });
    window.addEventListener('resize', function () { size(); kick(); });
    size();
    inView(el, function (v) { on = v; if (v) { dirty = true; kick(); } });
    ES.worldDebug = ES.worldDebug || {};
    ES.worldDebug.turn = function (a) { ang = a; vel = 0; target = null; lastUser = performance.now(); dirty = true; kick(); };
  }

  /* ------------------------------------------------------------------ Batch #001: the crate */
  function crate(el) {
    var slots = qsa('[data-slot]', el);
    var go = function () { el.classList.add('is-in'); };
    if (still() || calm()) go();
    else inView(el, function (v) { if (v) go(); }, { threshold: 0.3 });
    // the live count, when there is one (site.js fetches it)
    window.addEventListener('es:count', function (e) {
      var n = e.detail && e.detail.count;
      if (typeof n !== 'number') return;
      slots.forEach(function (s, i) { s.classList.toggle('is-taken', i < n); s.classList.toggle('is-next', i === n); });
      qsa('[data-crate-n]', document).forEach(function (t) { t.textContent = n; });
      qsa('[data-crate-next]', document).forEach(function (t) { t.textContent = String(n + 1).padStart(3, '0'); });
      qsa('[data-crate-copy]', document).forEach(function (c) { c.setAttribute('data-early', n < (+c.getAttribute('data-from') || 0) ? '1' : '0'); });
    });
  }

  /* ------------------------------------------------------------------ Story: the pinboard */
  // The red string runs pin to pin, oldest first. It never crosses a card's words: along a row it
  // goes straight across the tops; down to the next row it goes round the outside of the card,
  // through the gap between the rows, wound round little brass tacks at each corner. Each card's
  // pin goes in once the card has landed, and the length of string to it after that. Positions
  // come from the layout (not the screen), so cards still dropping in don't throw it off.
  function pinboard(el) {
    var svg = qs('[data-string]', el);
    var cards = qsa('[data-track-item]', el);
    if (!svg || cards.length < 2) return;
    var f = function (n) { return n.toFixed(1); };
    function box(node) {
      var x = 0, y = 0, n = node;
      while (n && n !== el) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      return { l: x, t: y, r: x + node.offsetWidth, b: y + node.offsetHeight, w: node.offsetWidth, h: node.offsetHeight };
    }
    function pinAt(card, B) {
      // the pin sits at the top centre; the card's tilt moves that a few pixels
      var r = parseFloat(getComputedStyle(card).getPropertyValue('--r')) || 0;
      return { x: B.l + B.w / 2 + (B.h / 2) * Math.sin(r * DEG), y: B.t };
    }
    function route(pts) {
      var d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
      for (var i = 1; i < pts.length - 1; i++) {
        var p = pts[i], a = pts[i - 1], b = pts[i + 1];
        var la = Math.hypot(p[0] - a[0], p[1] - a[1]) || 1, lb = Math.hypot(b[0] - p[0], b[1] - p[1]) || 1;
        var k = Math.min(9, la / 2, lb / 2);
        d += ' L' + f(p[0] - (p[0] - a[0]) / la * k) + ' ' + f(p[1] - (p[1] - a[1]) / la * k) +
          ' Q' + f(p[0]) + ' ' + f(p[1]) + ' ' + f(p[0] + (b[0] - p[0]) / lb * k) + ' ' + f(p[1] + (b[1] - p[1]) / lb * k);
      }
      var z = pts[pts.length - 1];
      return d + ' L' + f(z[0]) + ' ' + f(z[1]);
    }
    function sync() {
      qsa('[data-seg]', svg).forEach(function (s) {
        var i = +s.getAttribute('data-seg');
        s.classList.toggle('is-on', cards[i].classList.contains('is-pinned') && cards[i + 1].classList.contains('is-pinned'));
      });
      qsa('[data-card]', svg).forEach(function (s) { s.classList.toggle('is-on', cards[+s.getAttribute('data-card')].classList.contains('is-pinned')); });
    }
    function draw() {
      var W = el.offsetWidth, H = el.offsetHeight, FR = 15;
      if (!W) return;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var B = cards.map(box), P = cards.map(function (c, i) { return pinAt(c, B[i]); });
      var out = '<defs>' +
        '<radialGradient id="bp-red" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#ff9a80"/><stop offset=".55" stop-color="#c9452a"/><stop offset="1" stop-color="#6e1f12"/></radialGradient>' +
        '<radialGradient id="bp-amber" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#ffe6b5"/><stop offset=".55" stop-color="#f2a84b"/><stop offset="1" stop-color="#94621f"/></radialGradient>' +
        '<radialGradient id="bp-grey" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#e2ded4"/><stop offset=".55" stop-color="#8a8478"/><stop offset="1" stop-color="#45423b"/></radialGradient>' +
        '<radialGradient id="bp-brass" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#fff0c4"/><stop offset=".6" stop-color="#b8913f"/><stop offset="1" stop-color="#5e4718"/></radialGradient>' +
        '</defs>';
      var segs = '', tacks = '', pins = '';
      for (var i = 0; i < cards.length - 1; i++) {
        var A = B[i], N = B[i + 1], pa = P[i], pb = P[i + 1], d;
        if (Math.abs(pa.y - pb.y) < 40) {
          var sag = Math.min(9, Math.abs(pb.x - pa.x) * 0.03);
          d = 'M' + f(pa.x) + ' ' + f(pa.y) + ' Q' + f((pa.x + pb.x) / 2) + ' ' + f((pa.y + pb.y) / 2 + sag) + ' ' + f(pb.x) + ' ' + f(pb.y);
        } else {
          // round the side away from where the string came in (so it never doubles back over
          // itself); with nothing to go by, the side with more room, taking turns when it's even
          var roomR = W - FR - A.r, roomL = A.l - FR;
          B.forEach(function (o) {
            if (o === A || o.b < A.t + 10 || o.t > A.b - 10) return;
            if (o.l >= A.r - 2) roomR = Math.min(roomR, o.l - A.r);
            if (o.r <= A.l + 2) roomL = Math.min(roomL, A.l - o.r);
          });
          var prev = i > 0 && Math.abs(P[i - 1].y - pa.y) < 40 ? P[i - 1] : null;
          var right = prev ? prev.x < pa.x : Math.abs(roomR - roomL) < 4 ? i % 2 === 0 : roomR > roomL;
          var cx = right ? A.r + Math.min(15, roomR / 2) : A.l - Math.min(15, roomL / 2);
          var gy = N.t > A.b ? (A.b + N.t) / 2 : Math.max(A.b, N.b) + 12;
          d = route([[pa.x, pa.y], [cx, pa.y], [cx, gy], [pb.x, pb.y]]);
          [[cx, pa.y], [cx, gy]].forEach(function (t) { tacks += '<circle class="board__tack" data-seg="' + i + '" cx="' + f(t[0]) + '" cy="' + f(t[1]) + '" r="4.5" fill="url(#bp-brass)"/>'; });
        }
        segs += '<path class="board__seg" data-seg="' + i + '" pathLength="1" d="' + d + '"/>';
      }
      cards.forEach(function (c, i) {
        var g = c.classList.contains('timeline__item--now') ? 'amber' : c.classList.contains('timeline__item--next') ? 'grey' : 'red';
        pins += '<circle class="board__pin" data-card="' + i + '" cx="' + f(P[i].x) + '" cy="' + f(P[i].y) + '" r="9" fill="url(#bp-' + g + ')"/>';
      });
      svg.innerHTML = out + segs + tacks + pins;
      sync();
    }
    var redraw = function () { clearTimeout(redraw.t); redraw.t = setTimeout(draw, 120); };
    el.classList.add('is-strung');
    draw();
    window.addEventListener('resize', redraw);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    if (window.ResizeObserver) new ResizeObserver(redraw).observe(el);
    if (still() || calm()) { cards.forEach(function (c) { c.classList.add('is-pinned'); }); sync(); return; }
    cards.forEach(function (c) { inView(c, function (v) { if (v && !c.classList.contains('is-pinned')) { c.classList.add('is-pinned'); setTimeout(sync, 50); } }, { threshold: 0.35 }); });
  }

  /* ------------------------------------------------------------------ Formula: the vials */
  function vials(el) {
    if (still() || calm()) { el.classList.add('is-in'); return; }
    inView(el, function (v) { if (v) el.classList.add('is-in'); }, { threshold: 0.3 });
  }

  /* ------------------------------------------------------------------ Guides: the lamp, and tonight */
  function lamp(el) {
    var art = qs('[data-article]') || document.body;
    var end = qs('[data-tonight]');
    var set = function () {
      var r = art.getBoundingClientRect(), vh = window.innerHeight;
      var p = clamp((vh * 0.4 - r.top) / Math.max(1, r.height - vh * 0.5), 0, 1);
      if (end && end.getBoundingClientRect().top < vh * 0.6) p = 1;
      el.style.setProperty('--lamp', (1 - p * 0.82).toFixed(3));
    };
    set();
    window.addEventListener('scroll', set, { passive: true });
    window.addEventListener('resize', set);
  }
  function tonight(el) {
    var guide = el.getAttribute('data-guide');
    var boxes = qsa('[data-tonight-item]', el);
    var saved = null;
    try { saved = JSON.parse(store.get('es:tonight') || 'null'); } catch (e) {}
    if (saved && saved.d === today() && saved.guide === guide) boxes.forEach(function (b) { b.checked = saved.items.indexOf(b.value) >= 0; });
    el.addEventListener('change', function () {
      var items = boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
      store.set('es:tonight', JSON.stringify({ d: today(), guide: guide, items: items }));
      track('guide_tonight', { guide: guide, items: items.length });
    });
  }

  /* ------------------------------------------------------------------ 404: the dark hallway */
  function hallway(el) {
    var scene = qs('[data-hall-scene]', el);
    var sw = qs('[data-hall-switch]', el);
    var set = function (x, y) { scene.style.setProperty('--tx', x + 'px'); scene.style.setProperty('--ty', y + 'px'); };
    var r0 = scene.getBoundingClientRect();
    set(r0.width * 0.5, r0.height * 0.55);
    scene.addEventListener('pointermove', function (e) { var r = scene.getBoundingClientRect(); set(e.clientX - r.left, e.clientY - r.top); });
    scene.addEventListener('pointerdown', function (e) { var r = scene.getBoundingClientRect(); set(e.clientX - r.left, e.clientY - r.top); });
    qsa('a, button', scene).forEach(function (a) {
      a.addEventListener('focus', function () { var r = scene.getBoundingClientRect(), b = a.getBoundingClientRect(); set(b.left - r.left + b.width / 2, b.top - r.top + b.height / 2); });
    });
    if (sw) sw.addEventListener('click', function () {
      var lit = !scene.classList.contains('is-lit');
      scene.classList.toggle('is-lit', lit);
      sw.setAttribute('aria-pressed', lit ? 'true' : 'false');
      track('404_switch', { on: lit });
    });
    scene.classList.add('is-dark');
    // no torch without a pointer: on touch screens and small phones the light is simply on
    var mouse = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!mouse || window.innerWidth <= 640) {
      scene.classList.add('is-lit');
      if (sw) sw.setAttribute('aria-pressed', 'true');
    }
  }

  qsa('[data-turntable]').forEach(turntable);
  qsa('[data-crate]').forEach(crate);
  qsa('[data-pinboard]').forEach(pinboard);
  qsa('[data-vials]').forEach(vials);
  qsa('[data-lamp]').forEach(lamp);
  qsa('[data-tonight]').forEach(tonight);
  qsa('[data-hallway]').forEach(hallway);
})();
