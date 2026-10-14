/* ENDSHIFT home page: the evening as one continuous shot.

   The page scrolls; the camera moves. One sticky stage holds a WebGL canvas (the ink renderer,
   game-ink.js) and the words. Scroll position maps to a time T in "screens" (one screen of
   scrolling = 1), and everything on stage is a pure function of T: where the camera is, which
   lamp is on, how far the laptop lid has closed, which words show. Scroll back and it all
   plays backwards.

   The story, in beats:
     hallway (walk in, thoughts float past, turn to the wall calendar)
     → the calendar fills the screen and becomes the week (six evenings, crossed off)
     → tonight's square zooms up into the bedroom: lights off, but work still on (notifications
       float round the dark room); look round with the torch, find the WORK switch, press it
     → the work-lit picture cracks and falls away: the same room, warm
     → the ritual, announced, then seven framed steps, each acted out in the room and stamped
       DONE (at step 4 the big light goes off and the lamp's light comes out as warm motes that
       fill the room, with the camera following them; after the click the light only ever goes down)
     → lights out, lie down, two slow blinks (dark behind the eyelids), and the room melts
       into the dream around the RESET bottle: its colours run into the marbling
     → the dream: the day's things drift through and come apart (notifications, the calendar's
       crosses, tomorrow's list folding into a paper boat, the WORK switch), then it settles
     → the little sun printed on the label lights up, the bottle melts into the dream, the swirl
       lays down into a sky and that sun sets over an ink horizon; night, one line, and the
       RESET section below starts on the same dark ground.

   Without WebGL, with reduced motion or in low-stimulation mode none of this runs: the beats
   are plain comic panels (film.css), drawn by story.js. */
(function () {
  'use strict';

  var ES = (window.ES = window.ES || {});
  var root = document.documentElement;
  var film = document.querySelector('[data-film]');
  if (!film) return;
  var Ink = ES.Ink, SC = ES.inkScenes, PT = ES.inkPaint;
  var M = Ink ? Ink.M : null;
  var CFG = {};
  try { CFG = JSON.parse((document.getElementById('es-config') || {}).textContent || '{}'); } catch (e) {}
  var S = CFG.story || {};
  var PROPS = S.props || {};
  var FW = S.film || {};

  var DEG = Math.PI / 180;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ease = {
    lin: function (t) { return t; },
    inOut: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    sine: function (t) { return 0.5 - 0.5 * Math.cos(Math.PI * t); },
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    in: function (t) { return t * t * t; },
    in2: function (t) { return t * t; },
  };
  function motion() { return root.classList.contains('motion-ok') && root.getAttribute('data-calm') !== 'on'; }
  // (a device saving data or power gets the drawn comic instead of the live film)
  var able = !ES.lowPower && !!(Ink && SC && PT && ES.inkStory && ES.inkStory.hall && ES.inkStory.bedroom && Ink.supported());

  /* ------------------------------------------------------------------ the timeline
     Beat lengths are in screens of scrolling. Inside each ritual step: the camera travels
     (0–.15), the frame comes in (.14–.24), the step is done (.24–.76), a check (.78), time to
     read, and the frame goes as the camera moves on (.9–.98). */
  var PACE = 1;
  var BEATS = [
    ['hall_in', 0.6], ['hall_walk', 1.25], ['hall_turn', 0.9],
    ['cal_in', 0.5], ['cal_fill', 1.8], ['cal_zoom', 0.8],
    ['bed_wake', 1.2], ['bed_search', 2.3], ['bed_walk', 0.9], ['bed_click', 0.6],
    ['crack', 1.1], ['reveal', 1.3],
    ['rit_in', 1.0], ['s1', 1.35], ['s2', 1.15], ['s3', 1.9], ['s4', 2.6], ['s5', 1.35], ['s6', 1.4], ['s7', 1.25], ['rit_done', 0.9],
    ['out', 1.3], ['sleep', 1.4], ['finale', 3.6], ['sun', 2.2], ['end', 1.3],
  ];
  var TL = {}, TOTAL = 0;
  BEATS.forEach(function (b) {
    var len = b[1] * PACE;
    TL[b[0]] = { s: TOTAL, len: len, e: TOTAL + len };
    TOTAL += len;
  });
  // global time of a moment inside a beat
  function G(id, t) { var b = TL[id]; return b ? b.s + b.len * (t || 0) : 0; }
  // 0 → 1 between two moments
  function span(T, a, b, e) { return (e || ease.inOut)(clamp((T - a) / Math.max(1e-6, b - a), 0, 1)); }
  // a value along keys [[T, v], …], eased between them, held outside
  function kf(T, keys, e) {
    if (T <= keys[0][0]) return keys[0][1];
    for (var i = 0; i < keys.length - 1; i++) {
      if (T < keys[i + 1][0]) return lerp(keys[i][1], keys[i + 1][1], (e || ease.inOut)((T - keys[i][0]) / Math.max(1e-6, keys[i + 1][0] - keys[i][0])));
    }
    return keys[keys.length - 1][1];
  }
  // a moment inside ritual step n (1–7)
  function SG(n, t) { return G('s' + n, t); }

  /* ------------------------------------------------------------------ the stage */
  var stage = film.querySelector('[data-film-stage]');
  var glc = film.querySelector('[data-film-gl]');
  var fxc = film.querySelector('[data-film-fx]');
  var auc = film.querySelector('[data-film-aura]');
  var lidsEl = film.querySelector('[data-film-lids]');
  var breathEl = film.querySelector('[data-film-breath]');
  var breathWord = film.querySelector('[data-film-breath-word]');
  var calEl = film.querySelector('[data-film-cal]');
  var days = Array.prototype.slice.call(film.querySelectorAll('[data-cal-day]'));
  var tonightCv = film.querySelector('[data-film-tonight]');
  var zoomEl = film.querySelector('[data-film-zoom]');
  var zoomCv = zoomEl && zoomEl.querySelector('canvas');
  var barEl = film.querySelector('[data-film-bar]');
  var hintEl = film.querySelector('[data-film-hint]');
  var frameEl = film.querySelector('[data-film-frame]');
  var ffN = film.querySelector('[data-ff-n]');
  var ffT = film.querySelector('[data-ff-t]');
  var ffTime = film.querySelector('[data-ff-time]');
  var ffPips = frameEl ? Array.prototype.slice.call(frameEl.querySelectorAll('.ff__pips li')) : [];
  var rintroEl = film.querySelector('[data-film-rintro]');
  var steps = Array.prototype.slice.call(film.querySelectorAll('.rstep'));

  var FADE = 0.14;
  var items = Array.prototype.slice.call(film.querySelectorAll('[data-show]')).map(function (el) {
    var sp = el.getAttribute('data-show').split('|').map(function (s) {
      var q = s.trim().split(/\s+/);
      return G(q[0], parseFloat(q[1]) || 0);
    });
    var an = el.getAttribute('data-anchor');
    var anchor = null;
    if (an) {
      var k = an.split(':');
      anchor = { room: k[0], p: k[1].split(',').map(Number) };
    }
    return { el: el, a: sp[0], b: sp[1], anchor: anchor, soft: el.classList.contains('wping'), live: !!el.querySelector('a, button, input, select, textarea'), o: -1, tf: '' };
  });

  /* ------------------------------------------------------------------ the rooms */
  var Rnd = null, built = false, R = {}, K = {};
  var api = {
    objects: {},
    data: { props: PROPS, time: '00:40' },
    hud: { switchLabel: '' },
    strings: CFG.strings || {},
    clock: function () { return api.data.time; },
  };
  function room(id) {
    var D = ES.inkStory[id];
    var B = new SC.Room(D.room, Rnd);
    SC.shell(B, D.room);
    D.build(B, D.room, api);
    return { B: B, D: D };
  }
  function near(p, q, d) { return Math.abs(p[0] - q[0]) < d && Math.abs(p[1] - q[1]) < d && Math.abs(p[2] - q[2]) < d; }
  function add(B, o) { return B.add(o); }
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function addv(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function subv(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function scl(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function lerpv(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  // a rotation that turns the y axis to point along d
  function alongY(d) {
    d = norm(d);
    var ax = cross([0, 1, 0], d), s = Math.hypot(ax[0], ax[1], ax[2]);
    if (s < 1e-5) return d[1] > 0 ? M.I3 : M.rotX(Math.PI);
    return M.axis(scl(ax, 1 / s), Math.acos(clamp(d[1], -1, 1)));
  }
  function camBasis(cam) {
    var y = cam.yaw * DEG, p = cam.pitch * DEG;
    var f = [Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p)];
    var r = [Math.cos(y), 0, Math.sin(y)];
    return { f: f, r: r, u: cross(r, f) };
  }

  function dressHall(H) {
    var B = H.B;
    B.objs.forEach(function (o) {
      if (o.name === 'calendar') K.cal = o;
      if (o.map && B.tex.phonenote && o.map === B.tex.phonenote) K.hallPhone = o;
    });
    if (K.hallPhone) K.hallPhone.p0 = K.hallPhone.pos.slice();
  }

  // Where things stand on the new bedside table (top at 52.5; the tray's top at 53.7)
  var TOP = 52.5, TRAY = 53.7, PLEAT = 13;
  var BOTTLE = [-90, TRAY, 162], GLASS = [-104, TRAY, 153.5], CARAFE = [-110, TRAY, 165], PHONE = [-134, TOP + 0.5, 156];
  var CAPSULE_AT = [-95, TRAY + 1.15, 154.6];

  function dressBed(Rm) {
    var B = Rm.B;
    K.B = B;
    var gone = function (o) { o.hidden = true; o.gone = true; };
    // what the story's still shots use, the film replaces with things that move
    B.objs.forEach(function (o) {
      if (o.name === 'jar' || o.name === 'book' || o.name === 'phonedown' || o.name === 'lidClosed') gone(o);
      if (o.geo === 'cyl' && near(o.pos, [-127, 57, 156], 3)) gone(o); // the glass
      if (o.geo === 'box' && near(o.pos, [-38, 62.6, 112], 1)) gone(o); // the book's cover
      if (o.name === 'lid') K.lid = o;
      if (o.name === 'laptopGlow') K.laptopGlow = o;
      if (o.map && B.tex.notepad && o.map === B.tex.notepad) K.notepad = o;
      if (o.map && B.tex.curtain && o.map === B.tex.curtain) gone(o); // stiff curtains: pleated ones below
      if (o.geo === 'cyl' && near(o.pos, [170.6, 234, 78], 2)) gone(o); // their rail
      if (o.map && B.tex.city && o.map === B.tex.city) K.city = o;
      if (o.geo === 'cyl' && o.c && Math.abs(o.c[0] - 0x2f / 255) < 0.01 && Math.abs(o.c[2] - 0xa8 / 255) < 0.01 && o.pos[1] > 74 && o.pos[1] < 76) gone(o); // the story's pen
      // the game's bedside table, its mug and charger: a bigger, tidier table below
      if (o.map && B.tex['drawers-bt'] && o.map === B.tex['drawers-bt']) gone(o);
      if (o.geo === 'cyl' && near(o.pos, [-128, 56.5, 182], 3)) gone(o);
      if (o.geo === 'box' && near(o.pos, [-104, 52.7, 179], 4) && o.s[0] < 10) gone(o);
    });
    B.lights.forEach(function (l) {
      l.i0 = l.i == null ? 1 : l.i;
      if (l.name === 'laptop') K.laptopLight = l;
      if (l.c === '#7088cc') l.street = true;
      if (l.k === 'warm') l.grp = grpOf(l.p);
      // the game's light over the bed washed the wall: just a breath of it now, with the fairy lights
      if (near(l.p, [0, 175, 178], 1)) l.i0 = 0.12;
    });
    // the window's cross: the bar across sits a little in front of the upright, so they don't fight
    B.objs.forEach(function (o) {
      if (o.geo === 'box' && near(o.pos, [175, 159.5, 78], 1)) o.pos = [174.5, 159.5, 78];
    });
    // the warm things, sorted into lamps: the bedside lamp, the fairy lights, the desk lamp, the rest
    var fairy = [];
    B.objs.forEach(function (o) {
      if (o.kind === 'warm' || o.warmEmit != null) {
        o.grp = grpOf(o.pos);
        if (o.grp === 'fairy') fairy.push(o);
      }
    });
    fairy.forEach(function (o) {
      o.fi = clamp(Math.round((80 - o.pos[0]) / 18), 0, 8);
      // their glows lit up the wall above the bed: the orbs below take over
      if (o.bill) gone(o);
    });
    // the big light in the middle of the ceiling: a home's warm white, on from the moment the
    // work view breaks until step 4, when it goes off and the bedside lamp takes over
    B.objs.forEach(function (o) {
      if (o.geo === 'cyl' && near(o.pos, [0, 246, -20], 2)) {
        o.emitDark = 0; o.warmEmit = 1; o.baseEmit = 0.02; o.grp = 'bigDisc'; o.c = Ink.hex('#fff4e2');
      } else if (o.kind === 'work' && o.base != null && near(o.pos, [0, 236, -20], 3)) {
        o.kind = 'warm'; o.grp = 'big'; o.c = Ink.hex('#ffe0b4'); o.base = 0.4;
      } else if (o.kind === 'work' && o.base != null && near(o.pos, [0, 0.3, -20], 2)) {
        o.kind = 'warm'; o.grp = 'big'; o.c = Ink.hex('#ffe0b4'); o.base = 0.05;
      }
    });
    B.lights.forEach(function (l) {
      if (l.k === 'work' && near(l.p, [0, 220, -20], 2)) { l.k = 'warm'; l.grp = 'big'; l.c = '#ffe6c8'; l.i0 = 1.75; }
    });

    /* the bedside table: 64 cm, a lamp at the back, the clock beside it, a tray for the ritual */
    B.shadow(-116, 168, 84, 62, 0.45);
    add(B, { geo: 'box', pos: [-116, 25, 168], s: [64, 50, 44], color: '#4a3b31', border: 0.25 });
    add(B, { geo: 'box', pos: [-116, 51.25, 168.5], s: [67, 2.5, 45], color: '#5c4839', border: 0.25 });
    add(B, { geo: 'box', pos: [-116, 13, 145.4], s: [58, 18, 1.6], color: '#54443a', border: 0.22 });
    add(B, { geo: 'box', pos: [-116, 15, 144.3], s: [12, 1.6, 1.4], color: '#c9b48a', border: 0.12 });
    // the lamp and its light move to the back left corner, the clock to the back right
    var LD = [-16, 0.5, 4], moved = [];
    var mv = function (o) { if (moved.indexOf(o) < 0) { moved.push(o); o.pos = addv(o.pos, LD); } };
    if (B.things.lamp) B.things.lamp.objs.forEach(mv);
    B.objs.forEach(function (o) { if (o.grp === 'lamp') mv(o); });
    B.lights.forEach(function (l) { if (l.grp === 'lamp') l.p = addv(l.p, LD); });
    if (B.things.clock) B.things.clock.objs.forEach(function (o) { o.pos = [-98, TOP + 4, 182]; });
    // the tray
    add(B, { geo: 'box', pos: [-101, TOP + 0.6, 160], s: [36, 1.2, 22], color: '#3b2b20', border: 0.2 });
    [[-101, 149.4, 36, 0.9], [-101, 170.6, 36, 0.9], [-118.6, 160, 0.9, 22], [-83.4, 160, 0.9, 22]].forEach(function (q) {
      add(B, { geo: 'box', pos: [q[0], TOP + 1.5, q[1]], s: [q[2], 1.8, q[3]], color: '#2c2018', border: 0.12 });
    });

    // the laptop lid closes on its hinge
    if (K.lid) {
      var pl = Ink.place(K.lid);
      var up = M.apply3(pl.R, [0, 1, 0]);
      K.lidHinge = addv(pl.p, scl(up, -pl.s[1] / 2));
      var tgt = [-1, 0, 0];
      K.lidAxis = norm(cross(up, tgt));
      K.lidAngle = Math.acos(clamp(up[0] * tgt[0] + up[1] * tgt[1] + up[2] * tgt[2], -1, 1)) - 4 * DEG;
      K.lidEmit = K.lid.emit;
    }

    // the WORK switch, on the wall by the bed: just out of sight from the pillow
    K.sw = SC.makeSwitch(B, { wall: 's', u: -118, v: 108 }, api);
    K.swAxis = M.apply3(K.sw.rocker.R, [1, 0, 0]);
    K.swPoint = [118, 108, 187.6];

    // under the desk: one sock, some dust
    add(B, { geo: 'box', pos: [150, 1.35, -92], R: M.rotY(64 * DEG), s: [5.4, 2.7, 15], color: '#d9583a', border: 0.18, hatch: 0.3 });
    add(B, { geo: 'box', pos: [143.2, 1.1, -97.6], R: M.mul3(M.rotY(4 * DEG), M.rotZ(-3 * DEG)), s: [5.1, 2.2, 8.6], color: '#cf5034', border: 0.18, hatch: 0.3 });
    add(B, { geo: 'box', pos: [153.3, 1.55, -90.35], R: M.rotY(64 * DEG), s: [5.9, 3.1, 2.4], color: '#f1e8d0', border: 0.15, hatch: 0.3 });
    add(B, { geo: 'card', pos: [166, 0.3, -104], R: M.rotX(-90 * DEG), s: [5, 4, 1], color: '#8a8f96', shape: 1, soft: 0.8, blend: 'alpha', alpha: 0.35, border: 0, hatch: 0 });
    // a crumpled receipt: a few facets, not a cube
    add(B, { geo: 'box', pos: [138, 2.1, -78], R: M.mul3(M.rotY(40 * DEG), M.rotZ(24 * DEG)), s: [4.4, 3.6, 4.0], color: '#f6f3ea', border: 0.16 });
    add(B, { geo: 'box', pos: [138.3, 2.3, -78.2], R: M.mul3(M.rotY(-12 * DEG), M.rotX(38 * DEG)), s: [3.9, 3.9, 3.7], color: '#ece6d6', border: 0.16 });
    add(B, { geo: 'box', pos: [137.7, 2.0, -77.6], R: M.mul3(M.rotY(74 * DEG), M.rotZ(-30 * DEG)), s: [3.6, 3.4, 4.2], color: '#f2ede0', border: 0.16 });

    // after the click the light comes from lamps you can see: the bedside lamp, the desk lamp
    // (which reaches the desk a little further with this), and a little warmth by the switch
    var dl = B.light({ p: [104, 150, -70], c: '#ffb070', i: 0.6, r: 300, k: 'warm' });
    dl.i0 = 0.6;
    dl.grp = 'desk';
    B.light({ p: [90, 150, 150], c: '#ff9f5a', i: 0.4, r: 300, k: 'warm' }).i0 = 0.4;

    // pleated curtains on a rail in front of the sill: bunched open, spread closed
    add(B, { geo: 'cyl', pos: [158, 237, 78], R: M.rotX(90 * DEG), s: [2.6, 160, 2.6], color: '#2a2c30', border: 0.2 });
    K.pleats = [];
    ['l', 'r'].forEach(function (side) {
      for (var j = 0; j < 7; j++) {
        var o = add(B, { geo: 'box', pos: [0, 0, 0], s: [PLEAT, 172, 0.8], color: j % 2 ? '#6a4c63' : '#7a5a72', border: 0.14 });
        o.side = side;
        o.j = j;
        K.pleats.push(o);
      }
    });

    // the lamp's light: at "lower the lights" it comes out of the bedside lamp as slow warm motes
    // that settle through the whole room. At lights out they fade; three of them stay on as the
    // dream's lights (warm until the dream, then its amber, rose and teal) and float over to the
    // bottle: the first of the dream.
    K.motes = new SC.Motes(B, { from: [-136, 83.5, 174], box: [-165, 55, -120, 160, 215, 176], seed: 91 });
    var orbCols = ['#ffb347', '#ff5f8f', '#5fe0d0'];
    var rr = seeded(77);
    K.orbs = orbCols.map(function (c, i) {
      var mkGlow = function (size, col, base) {
        var o = B.glow([0, 0, 0], size, col, base, 'orb');
        o.hidden = true;
        return o;
      };
      return {
        n: i, m: i, dc: Ink.hex(c), keep: true, r: 4.2 + rr() * 2.4, p: [rr() * 6.3, rr() * 6.3, rr() * 6.3],
        halo: mkGlow(18, c, 0), core: mkGlow(3, '#fff4e0', 0), tint: mkGlow(6, c, 0),
      };
    });

    // a carafe and a glass on the tray
    var glassLook = { color: '#e4f2fa', alpha: 0.42, blend: 'alpha', border: 0.32, hatch: 0, emit: 0.18 };
    var waterLook = { color: '#3f92da', alpha: 0.78, blend: 'alpha', border: 0.12, hatch: 0, emit: 0.38 };
    K.carafe = [
      add(B, Object.assign({ geo: 'cylHi', pos: [CARAFE[0], TRAY + 7.5, CARAFE[2]], s: [8.8, 15, 8.8] }, glassLook)),
      add(B, Object.assign({ geo: 'cylHi', pos: [CARAFE[0], TRAY + 16.6, CARAFE[2]], s: [5.4, 3.2, 5.4], taper: 0.82 }, glassLook)),
    ];
    K.carafeWater = add(B, Object.assign({ geo: 'cylHi', pos: [0, 0, 0], s: [8.2, 11, 8.2] }, waterLook));
    K.stream = add(B, Object.assign({ geo: 'cylHi', pos: [0, 0, 0], s: [0.9, 10, 0.9], hidden: true }, waterLook, { alpha: 0.88, emit: 0.5 }));
    K.glass = add(B, Object.assign({ geo: 'cylHi', pos: [GLASS[0], TRAY + 5.5, GLASS[2]], s: [6.4, 11, 6.4] }, glassLook));
    K.water = add(B, Object.assign({ geo: 'cylHi', pos: [0, 0, 0], s: [5.8, 0.2, 5.8], hidden: true }, waterLook));

    // the RESET jar, direction C (the concept: packaging isn't final, the label says so)
    K.bc = BOTTLE;
    K.jar = SC.cJar(B, BOTTLE, { front: { concept: PROPS.jar2 } });
    K.bottle = K.jar.body;
    K.cap = K.jar.cap;
    // one capsule
    K.capsule = [
      add(B, { geo: 'cylHi', pos: [0, 0.95, 0], s: [2.3, 1.9, 2.3], color: '#f2a84b', border: 0.12, hidden: true }),
      add(B, { geo: 'cylHi', pos: [0, -0.95, 0], s: [2.3, 1.9, 2.3], color: '#efe6d2', border: 0.12, hidden: true }),
    ];

    // the phone, face up and lit, at the front left
    var scr = B.T('phonelit', function () { return PT.phoneScreen(200, 400, { note: PROPS.phoneNote || ['Manager', 'You home? Quick one'] }); });
    K.pc = PHONE;
    var Rp = M.rotY(20 * DEG);
    K.phone = [
      add(B, { geo: 'box', pos: PHONE.slice(), R: Rp, s: [8, 1, 16], color: '#1b1d22', border: 0.18 }),
      add(B, { geo: 'card', pos: [PHONE[0], PHONE[1] + 0.52, PHONE[2]], R: M.mul3(Rp, M.rotX(-90 * DEG)), s: [7.2, 15, 1], color: '#101a2c', map: scr, emit: 0.95, emitDark: 0, border: 0.1, hatch: 0, decal: 2 }),
    ];
    K.phoneAxis = M.apply3(Rp, [0, 0, 1]);
    K.phoneLight = B.light({ p: [PHONE[0], 70, PHONE[2] - 6], c: '#9cc0ff', i: 0.3, r: 90, k: 'always' });

    // the top drawer, for the phone
    K.drawer = [
      add(B, { geo: 'box', pos: [-116, 36.5, 145.2], s: [58, 17, 2.4], color: '#54443a', border: 0.25 }),
      add(B, { geo: 'box', pos: [-116, 39, 143.6], s: [12, 1.6, 1.6], color: '#c9b48a', border: 0.12 }),
      add(B, { geo: 'box', pos: [-116, 38.5, 166], s: [54, 12, 38], color: '#2e241e', border: 0.2 }),
    ];
    K.drawer.forEach(function (o) { o.p0 = o.pos.slice(); });

    // a book on the bed: closed, then open, then turning pages
    K.bookAt = [-38, 62.4, 112];
    // turned so you read it from your side: the front cover opens to the left, pages turn right to left
    K.bookR = M.rotY(160 * DEG);
    var pageTex = B.T('bookpage', function () {
      var c = PT.cv(256, 360), x = c.getContext('2d');
      x.fillStyle = '#f4eedf';
      x.fillRect(0, 0, 256, 360);
      x.fillStyle = 'rgba(40,36,30,.5)';
      for (var i = 0; i < 17; i++) {
        var w = i % 6 === 5 ? 90 + (i * 37) % 80 : 196 - ((i * 23) % 30);
        x.fillRect(30, 36 + i * 17.5, w, 5);
      }
      return c;
    });
    function bk(local, size, col, extra) {
      return add(B, Object.assign({ geo: 'box', pos: addv(K.bookAt, M.apply3(K.bookR, local)), R: K.bookR, s: size, color: col, border: 0.18 }, extra || {}));
    }
    K.bookL = [bk([-7.75, 0.4, 0], [15.5, 0.8, 23], '#b0473a'), bk([-7.25, 1.5, 0], [14.5, 1.4, 21], '#f4eedf', { map: pageTex, mapFace: 2 })];
    K.bookRt = [bk([7.75, 0.4, 0], [15.5, 0.8, 23], '#b0473a'), bk([7.25, 1.5, 0], [14.5, 1.4, 21], '#f4eedf', { map: pageTex, mapFace: 2 })];
    K.bookHinge = addv(K.bookAt, M.apply3(K.bookR, [0, 2.2, 0]));
    K.bookAxis = M.apply3(K.bookR, [0, 0, 1]);
    K.pages = [0, 1, 2].map(function () { return bk([7.1, 2.3, 0], [14, 0.12, 20.4], '#f6f1e3', { map: pageTex, mapFace: -1, border: 0.1, hatch: 0.25, hidden: true }); });
    K.pageHinge = addv(K.bookAt, M.apply3(K.bookR, [0, 2.3, 0]));

    // a pen that writes on the notepad
    K.pen = add(B, { geo: 'cylHi', pos: [0, 0, 0], s: [1.1, 14, 1.1], color: '#2f5ba8', border: 0.15 });
    K.penTip = add(B, { geo: 'cylHi', pos: [0, 0, 0], s: [1.1, 1.6, 1.1], taper: 0.15, color: '#d9d4c6', border: 0.1 });
    if (K.notepad) {
      var np = Ink.place(K.notepad);
      K.npC = np.p;
      K.npX = M.apply3(np.R, [1, 0, 0]);
      K.npY = M.apply3(np.R, [0, 1, 0]);
      K.npZ = M.apply3(np.R, [0, 0, 1]);
      K.npS = np.s;
    }
    // the alarm clock's digits follow the evening
    K.digits = B.tex.digits;

    // colour for the dream: lights that wander round the bottle, and moonlight before them
    K.fin = [
      B.light({ p: [0, 0, 0], c: '#f2a84b', i: 0, r: 120, k: 'always' }),
      B.light({ p: [0, 0, 0], c: '#d23a5a', i: 0, r: 120, k: 'always' }),
      B.light({ p: [0, 0, 0], c: '#2bb3b8', i: 0, r: 120, k: 'always' }),
      B.light({ p: [-50, 120, 115], c: '#7d93d6', i: 0, r: 220, k: 'always' }),
    ];
    K.finObjs = K.bottle.concat(K.cap);
    K.orbs.forEach(function (ob) { if (ob.keep) K.finObjs.push(ob.halo, ob.tint, ob.core); });
    dressDream(B);
  }
  /* ------------------------------------------------------------------ the dream: the day lets go
     Things the evening already showed drift through the dream and come apart in it (their edges
     glow and their colour runs into the currents): the notifications, the calendar's red crosses,
     tomorrow's list (it folds into a paper boat and sails off), the WORK switch. The bottle stays
     where it is; nothing touches it. */
  var FD = '"Sofia Sans Extra Condensed", "Arial Narrow", "Roboto Condensed", sans-serif';
  var FB = '"Sofia Sans", "Segoe UI", Roboto, Arial, sans-serif';
  function rrect(x, x0, y0, w, h, r) {
    x.beginPath();
    x.moveTo(x0 + r, y0);
    x.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
    x.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
    x.arcTo(x0, y0 + h, x0, y0, r);
    x.arcTo(x0, y0, x0 + w, y0, r);
    x.closePath();
  }
  function fitFont(x, str, maxW, size, weight, fam) {
    var f = size;
    do { x.font = weight + ' ' + f + 'px ' + fam; f -= 2; } while (x.measureText(str).width > maxW && f > 12);
  }
  var DP = {
    ping: function (from, text) {
      var c = PT.cv(640, 168), x = c.getContext('2d');
      rrect(x, 6, 6, 628, 156, 30);
      x.fillStyle = 'rgba(16,24,38,0.96)';
      x.fill();
      x.lineWidth = 6;
      x.strokeStyle = '#0b0d10';
      x.stroke();
      x.fillStyle = '#6fb3ff';
      x.fillRect(24, 32, 9, 104);
      x.textBaseline = 'middle';
      x.fillStyle = '#8fc3ff';
      fitFont(x, String(from).toUpperCase(), 560, 32, '800', FD);
      x.fillText(String(from).toUpperCase(), 56, 54);
      x.fillStyle = '#e6f0fb';
      fitFont(x, text, 556, 48, '700', FB);
      x.fillText(text, 56, 112);
      return c;
    },
    cross: function () {
      var c = PT.cv(256, 256), x = c.getContext('2d');
      x.strokeStyle = 'rgba(208,40,40,0.96)';
      x.lineWidth = 26;
      x.lineCap = 'round';
      x.beginPath(); x.moveTo(42, 46); x.bezierCurveTo(100, 100, 150, 150, 214, 212); x.stroke();
      x.beginPath(); x.moveTo(212, 40); x.bezierCurveTo(150, 100, 104, 158, 44, 216); x.stroke();
      return c;
    },
    paper: function (title, lines) {
      var c = PT.cv(384, 512), x = c.getContext('2d');
      x.fillStyle = '#f6f3ea';
      x.fillRect(0, 0, 384, 512);
      x.strokeStyle = 'rgba(80,110,170,0.28)';
      x.lineWidth = 2;
      for (var y = 124; y < 500; y += 46) { x.beginPath(); x.moveTo(24, y); x.lineTo(360, y); x.stroke(); }
      x.fillStyle = '#2c3e70';
      x.textBaseline = 'alphabetic';
      fitFont(x, title, 330, 56, '900', FD);
      x.fillText(title, 28, 88);
      x.font = 'italic 600 30px ' + FB;
      lines.filter(function (l) { return l !== '-'; }).slice(0, 7).forEach(function (l, i) { x.fillText(l, 30, 166 + i * 46, 326); });
      return c;
    },
    boat: function () {
      var c = PT.cv(384, 256), x = c.getContext('2d');
      x.lineJoin = 'round';
      x.lineWidth = 9;
      x.strokeStyle = '#141617';
      x.fillStyle = '#f6f3ea';
      x.beginPath(); x.moveTo(18, 148); x.lineTo(366, 148); x.lineTo(300, 236); x.lineTo(84, 236); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = '#ece5d3';
      x.beginPath(); x.moveTo(96, 148); x.lineTo(192, 20); x.lineTo(288, 148); x.closePath(); x.fill(); x.stroke();
      x.lineWidth = 4;
      x.strokeStyle = 'rgba(20,22,23,0.45)';
      x.beginPath(); x.moveTo(192, 22); x.lineTo(192, 146); x.moveTo(86, 234); x.lineTo(132, 150); x.moveTo(298, 234); x.lineTo(252, 150); x.stroke();
      x.strokeStyle = 'rgba(80,110,170,0.4)';
      x.lineWidth = 3;
      for (var i = 0; i < 2; i++) { x.beginPath(); x.moveTo(120 + i * 12, 176 + i * 22); x.lineTo(270 - i * 12, 176 + i * 22); x.stroke(); }
      return c;
    },
  };
  function dressDream(B) {
    var noOrb = function (o) { o.hidden = true; K.finObjs.push(o); return o; };
    var card = function (tex, w, h, extra) {
      return noOrb(add(B, Object.assign({ geo: 'card', pos: [0, 0, 0], s: [w, h, 1], color: '#ffffff', map: tex, border: 0, hatch: 0 }, extra || {})));
    };
    var pings = [].slice.call(film.querySelectorAll('.wping')).slice(0, 4).map(function (li) {
      var b = li.querySelector('b'), sp = li.querySelector('span');
      return [b ? b.textContent : '', sp ? sp.textContent : ''];
    });
    if (!pings.length) pings = [['Manager', 'Can you cover Saturday?'], ['Work chat', '14 unread'], ['Mail', 'Re: Re: Re: deadline'], ['Dana', 'Did you send the file?']];
    K.dream = {};
    K.dream.pings = pings.map(function (pg, i) {
      var tex = B.T('dping' + i, function () { return DP.ping(pg[0], pg[1]); });
      return card(tex, 13, 3.41, { mapAlpha: true, blend: 'alpha', unlit: true, disC: [0.42, 0.78, 1] });
    });
    var ctex = B.T('dcross', function () { return DP.cross(); });
    K.dream.crosses = [0, 1, 2, 3, 4].map(function () { return card(ctex, 6.4, 6.4, { mapAlpha: true, blend: 'alpha', unlit: true, disC: [1, 0.42, 0.32] }); });
    var notes = PROPS.notes || ['1. Call the supplier', '2. Finish the rota', '3. Reply to Dana', '-', 'Done for today.'];
    var ptex = B.T('dpaper', function () { return DP.paper(PROPS.notesTitle || 'TOMORROW', notes); });
    K.dream.paper = card(ptex, 10.5, 14, { border: 0.12, emit: 0.55, disC: [1, 0.74, 0.4] });
    var btex = B.T('dboat', function () { return DP.boat(); });
    K.dream.boat = card(btex, 12, 8, { mapAlpha: true, blend: 'alpha', emit: 0.5, disC: [1, 0.74, 0.4] });
    var plate = B.tex['switch-plate'];
    K.dream.plate = noOrb(add(B, { geo: 'box', pos: [0, 0, 0], s: [9, 14, 1.1], color: '#e9e6de', map: plate, mapFace: 4, border: 0.22, emit: 0.45, disC: [1, 0.55, 0.62] }));
    K.dream.rocker = noOrb(add(B, { geo: 'box', pos: [0, 0, 0], s: [4.6, 7.6, 1.2], color: '#f3f1ea', border: 0.18, emit: 0.45, disC: [1, 0.55, 0.62] }));
    // the sun printed on the label, lighting up
    K.sunGlow = noOrb(B.glow([0, 0, 0], 3, '#ffb347', 0, 'orb'));
    K.sunCore = noOrb(B.glow([0, 0, 0], 1, '#fff1d0', 0, 'orb'));
  }
  var dreamBleed = [];
  function moveDream(T, time, cam) {
    if (!K.dream) return;
    var D = K.dream;
    dreamBleed = [];
    var halfH = 50 * Math.tan((20 * dreamFov) * DEG);
    var por = aspect < 0.9;
    var hw = halfH * Math.min(aspect, 1.7) * (por ? 0.8 : 0.64), hh = por ? halfH * 0.7 : 12.5;
    var sc = Math.min(1, 0.55 + aspect * 0.42);
    // r, u: where on screen (cm at the bottle's distance, so nearer things don't drift off the edges); d: nearer
    var W2 = function (r, u, d) { var k = (50 - d) / 50; return [BOTTLE[0] + d, 67 + u * k, BOTTLE[2] - r * k]; };
    var face = function (roll) { return M.mul3(M.rotY(90 * DEG), M.rotZ(roll)); };
    var loc = function (a, b) { return (T - G('finale', a)) / (G('finale', b) - G('finale', a)); };
    var bleed = function (o, k, size, c) {
      if (k <= 0.01 || !Rnd) return;
      var pr = Rnd.project(o.pos);
      if (pr.behind) return;
      dreamBleed.push({ x: pr.x, y: pr.y, r: Math.max(20, (pr.s || 4) * size), k: k, c: c });
    };
    var put = function (o, sv, pos, R, base, dis) {
      var on = sv > 0 && sv < 1;
      o.hidden = !on || dis >= 0.995;
      if (!on) return;
      o.pos = pos;
      o.R = R;
      o.s = [base[0] * sc, base[1] * sc, base[2]];
      o.dis = dis;
    };
    // 1. the notifications: they circle the bottle once and come apart into blue ink
    var th0 = [2.5, -0.5, 3.7, 0.9], dep = [12, -8, 6, 16];
    D.pings.forEach(function (o, i) {
      var a = 0.1 + i * 0.045, sv = loc(a, a + 0.2);
      var th = th0[i] + sv * 1.5, rad = 1 - 0.22 * sv;
      var dis = ease.in(clamp((sv - 0.42) / 0.58, 0, 1));
      o.alpha = clamp(sv / 0.1, 0, 1);
      // on a tall screen they cross above and below the bottle instead of circling it
      var pos = por ? W2(lerp(-hw * 1.5, hw * 0.9, sv) * (i % 2 ? -1 : 1), (i % 2 ? -1 : 1) * hh * (0.72 + 0.1 * (i >> 1)), dep[i]) : W2(Math.cos(th) * hw * rad, Math.sin(th) * 15.5 * rad, dep[i]);
      put(o, sv, pos, face(Math.sin(th) * 0.12), [13, 3.41, 1], dis);
      if (!o.hidden) bleed(o, Math.sin(Math.PI * dis) * 0.8, 9, [0.25, 0.55, 1]);
    });
    // 2. the calendar's red crosses float up and unravel into red ribbons
    var r0 = [-0.75, -0.32, 0.08, 0.5, 0.86], d2 = [10, -6, 4, 14, -10];
    D.crosses.forEach(function (o, i) {
      var a = 0.3 + i * 0.03, sv = loc(a, a + 0.2);
      var dis = ease.in(clamp((sv - 0.3) / 0.65, 0, 1));
      o.alpha = clamp(sv / 0.1, 0, 1);
      put(o, sv, W2(r0[i] * hw, lerp(-hh * 1.25, hh * 0.75, sv), Math.abs(r0[i]) < (por ? 0.6 : 0.35) ? -14 : d2[i]), face(sv * 1.4 + i), [6.4, 6.4, 1], dis);
      if (!o.hidden) bleed(o, Math.sin(Math.PI * dis) * 0.9, 6, [1, 0.18, 0.2]);
    });
    // 3. tomorrow's list drifts in, folds into a paper boat, and the boat sails off
    var sv = loc(0.46, 0.72);
    var drift = ease.inOut(clamp(sv / 0.6, 0, 1));
    var pp = por
      ? W2(lerp(-hw * 1.6, -hw * 0.1, drift), hh * 0.86 + Math.sin(time * 0.9) * 0.4, 10)
      : W2(lerp(-hw * 1.4, -hw * 0.85, drift), lerp(3, -1, drift) + Math.sin(time * 0.9) * 0.4, lerp(8, 6, drift));
    var fold = clamp((sv - 0.36) / 0.2, 0, 1);
    D.paper.alpha = 1;
    put(D.paper, sv, pp, face(0.15 - 0.12 * drift), [10.5, 14, 1], fold);
    if (!D.paper.hidden) bleed(D.paper, Math.sin(Math.PI * fold) * 0.7, 10, [1, 0.7, 0.35]);
    var sail = ease.inOut(clamp((sv - 0.6) / 0.4, 0, 1));
    var bp = por
      ? W2(lerp(-hw * 0.1, hw * 0.5, sail), hh * lerp(0.86, 0.95, sail) + Math.sin(time * 1.3) * 0.5, lerp(10, -60, sail))
      : W2(lerp(-hw * 0.85, -hw * 0.95, sail), lerp(-1, hh * 0.3, sail) + Math.sin(time * 1.3) * 0.5, lerp(6, -60, sail));
    var bdis = Math.max(1 - clamp((sv - 0.46) / 0.14, 0, 1), clamp((sv - 0.86) / 0.14, 0, 1));
    D.boat.alpha = 1;
    put(D.boat, sv > 0.44 ? sv : 0, bp, face(Math.sin(time * 1.1) * 0.06), [12, 8, 1], bdis);
    // 4. the WORK switch tumbles away into the dark, OFF
    var sw = loc(0.64, 0.82);
    var k4 = ease.in2(clamp(sw, 0, 1));
    var Rs = M.mul3(face(-0.2), M.axis(norm([0.35, 1, 0.2]), sw * 5));
    var ps = por
      ? W2(lerp(hw * 0.5, -hw * 0.2, k4), lerp(-hh * 0.68, -hh * 0.5, k4), lerp(6, -80, k4))
      : W2(lerp(hw * 0.62, hw * 0.2, k4), lerp(hh * 0.22, hh * 0.3, k4), lerp(6, -80, k4));
    var sdis = ease.in(clamp((sw - 0.5) / 0.5, 0, 1));
    put(D.plate, sw, ps, Rs, [9, 14, 1.1], sdis);
    put(D.rocker, sw, addv(ps, scl(M.apply3(Rs, [0, 0, 1]), 1.15 * sc)), M.mul3(Rs, M.rotX(12 * DEG)), [4.6, 7.6, 1.2], sdis);
    if (!D.plate.hidden) bleed(D.plate, Math.sin(Math.PI * sdis) * 0.8, 8, [1, 0.35, 0.5]);
    // the strongest four colour the currents
    dreamBleed.sort(function (x, y) { return y.k - x.k; });
    dreamBleed = dreamBleed.slice(0, 4);
    // the sun on the label lights up as it turns to you
    var sg = span(T, G('sun', 0.06), G('sun', 0.28));
    [K.sunGlow, K.sunCore].forEach(function (o) { o.hidden = sg <= 0.001 || T >= MELT + 0.05; });
    if (sg > 0.001 && cam) {
      var spt = sunPoint(T, time, cam.pos);
      var toCam = norm(subv(cam.pos, spt));
      var gp = addv(spt, scl(toCam, 0.6));
      K.sunGlow.pos = gp; K.sunCore.pos = gp;
      K.sunGlow.s = [2 + 7 * sg, 2 + 7 * sg, 1]; K.sunCore.s = [1.2 + 0.6 * sg, 1.2 + 0.6 * sg, 1];
      K.sunGlow.base = 1.1 * sg; K.sunCore.base = 1.2 * sg;
    }
  }

  // where the dream's three lights (and the orbs that carry them) circle the bottle
  function finOrbit(i, time) {
    var a = time * (0.35 + i * 0.12) + (i * Math.PI * 2) / 3;
    return [BOTTLE[0] + Math.cos(a) * 22, 67 + Math.sin(time * 0.5 + i) * 10, BOTTLE[2] + Math.sin(a) * 22];
  }
  function grpOf(p) {
    if (p[2] > 140 && p[0] < -95 && p[0] > -150 && p[1] < 100) return 'lamp';
    if (p[2] > 168 && p[1] > 140) return 'fairy';
    if (p[0] > 100 && p[2] < -80) return 'desk';
    return 'fill';
  }

  function build() {
    if (built) return !!Rnd;
    built = true;
    try {
      Rnd = Ink.renderer(glc);
    } catch (e) { Rnd = null; }
    if (!Rnd) { able = false; return false; }
    R.hall = room('hall');
    R.bed = room('bedroom');
    dressHall(R.hall);
    dressBed(R.bed);
    initAura();
    return true;
  }

  /* ------------------------------------------------------------------ the camera */
  function lookAt(at, to) {
    var dx = to[0] - at[0], dy = to[1] - at[1], dz = to[2] - at[2];
    return { yaw: Math.atan2(dx, -dz) / DEG, pitch: Math.atan2(dy, Math.hypot(dx, dz)) / DEG };
  }
  function keys(list) {
    var prev = null, hf = 72;
    list.forEach(function (k) {
      if (k.at) k.p = k.at;
      if (k.to) { var la = lookAt(k.p, k.to); k.yaw = la.yaw; k.pitch = la.pitch; }
      if (prev != null) {
        while (k.yaw - prev > 180) k.yaw -= 360;
        while (k.yaw - prev < -180) k.yaw += 360;
      }
      prev = k.yaw;
      if (k.roll == null) k.roll = 0;
      if (k.hf == null && k.vf == null) k.hf = hf;
      else if (k.hf != null) hf = k.hf;
    });
    return list;
  }
  function cr(p0, p1, p2, p3, t) {
    var t2 = t * t, t3 = t2 * t, o = [];
    for (var k = 0; k < 3; k++) o.push(0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
    return o;
  }
  var aspect = 1;
  function fovy(k) {
    if (k.vf) return k.vf * DEG;
    var v = 2 * Math.atan(Math.tan((k.hf * DEG) / 2) / aspect);
    return clamp(v, 34 * DEG, 84 * DEG);
  }
  function camAt(list, T) {
    var n = list.length, i = 0;
    if (T <= list[0].T) i = 0;
    else while (i < n - 2 && T >= list[i + 1].T) i++;
    var a = list[i], b = list[Math.min(n - 1, i + 1)];
    var u = clamp((T - a.T) / Math.max(1e-6, b.T - a.T), 0, 1);
    var e = ease[a.e || 'inOut'](u);
    var still = Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1], a.p[2] - b.p[2]) < 0.5;
    var p = still ? a.p.slice() : cr((list[i - 1] || a).p, a.p, b.p, (list[i + 2] || b).p, e);
    var yaw = lerp(a.yaw, b.yaw, e), pitch = lerp(a.pitch, b.pitch, e), roll = lerp(a.roll, b.roll, e);
    if (a.walk && !still) {
      // footsteps: the head bobs and sways a little, step by step
      var dist = Math.hypot(a.p[0] - b.p[0], a.p[2] - b.p[2]) * e;
      var ph = (dist / 64) * Math.PI * 2;
      var env = Math.sqrt(Math.sin(Math.PI * u));
      p[1] += Math.sin(ph) * 1.5 * env;
      roll += Math.sin(ph / 2) * 0.55 * env;
      yaw += Math.sin(ph / 2) * 0.35 * env;
    }
    return { pos: p, yaw: yaw, pitch: pitch, roll: roll, fovy: lerp(fovy(a), fovy(b), e) };
  }

  // The calendar fills the frame below the site header at this vertical field of view.
  var CAL_H = 64, CAL_VF = 50, CAL_X = 110 - 1.6, CAL_Y = 140;
  var W = 1, H = 1, dpr = 1, curT = 0;
  var HH = 0; // header height, px
  var KH = hallKeys();
  function hallKeys() {
    var hf = Math.max(0.5, (H - HH) / H);
    var d = CAL_H / (hf * 2 * Math.tan((CAL_VF * DEG) / 2));
    var frameH = 2 * d * Math.tan((CAL_VF * DEG) / 2);
    var y = CAL_Y + ((HH / 2) / H) * frameH;
    return keys([
      { T: G('hall_in', 0), p: [-10, 160, 205], yaw: 3, pitch: -7, hf: 74 },
      { T: G('hall_in', 1), p: [-14, 160, 186], yaw: 1, pitch: -6, e: 'in2', walk: true },
      { T: G('hall_walk', 0.5), p: [-30, 160, 104], yaw: -3, pitch: -4, e: 'lin', walk: true },
      { T: G('hall_walk', 1), p: [-26, 160, 4], yaw: 8, pitch: -2, e: 'inOut', walk: true },
      { T: G('hall_turn', 0.55), p: [-2, 150, -72], yaw: 66, pitch: -1, hf: 66 },
      { T: G('hall_turn', 1), p: [CAL_X - d, y, -100], yaw: 90, pitch: 0, vf: CAL_VF },
      { T: G('cal_in', 1), p: [CAL_X - d, y, -100], yaw: 90, pitch: 0, vf: CAL_VF },
    ]);
  }

  // the little sun printed on the label: how far round the bottle from the label's middle (degrees)
  // and how high (cm above the bottom)
  // (the jar's front faces the camera at the end, the sun of the logo on it: no extra turn)
  var SUN_TURN = 0;
  var BED0 = { p: [10, 92, 148], yaw: 62, pitch: 6, hf: 72 };
  var KB = keys([
    { T: G('bed_wake', 0), p: BED0.p, yaw: BED0.yaw, pitch: BED0.pitch, hf: BED0.hf },
    { T: G('bed_wake', 0.4), p: [10, 93, 146], yaw: 63, pitch: 5 },
    { T: G('bed_wake', 0.72), p: [54, 128, 110], yaw: 58, pitch: -5 },
    { T: G('bed_wake', 1), p: [100, 160, 60], yaw: 50, pitch: -7 },
    { T: G('bed_search', 0.12), p: [100, 160, 60], yaw: -66, pitch: -10 },
    { T: G('bed_search', 0.3), p: [100, 160, 60], yaw: -60, pitch: -8 },
    { T: G('bed_search', 0.42), p: [104, 160, 58], yaw: 103, pitch: -6 },
    { T: G('bed_search', 0.52), p: [104, 160, 56], yaw: 99, pitch: -8 },
    { T: G('bed_search', 0.57), p: [106, 132, -30], to: [160, 50, -96], hf: 76 },
    { T: G('bed_search', 0.62), p: [105, 70, -90], to: [160, 10, -92], hf: 78 },
    { T: G('bed_search', 0.67), p: [104, 38, -108], to: [160, 3, -90], hf: 80 },
    { T: G('bed_search', 0.8), p: [106, 34, -111], to: [160, 2, -90] },
    { T: G('bed_search', 0.85), p: [108, 80, -70], to: [140, 70, 10], hf: 76 },
    { T: G('bed_search', 0.9), p: [112, 156, 22], yaw: 116, pitch: -8, hf: 72 },
    { T: G('bed_search', 1), p: [112, 158, 24], yaw: 178, pitch: -12 },
    { T: G('bed_walk', 0.08), p: [112, 158, 26], yaw: 178, pitch: -12, walk: true, e: 'inOut' },
    { T: G('bed_walk', 0.7), p: [118, 132, 145], yaw: 180, pitch: -28, hf: 64 },
    // the press: lean in, and back
    { T: G('bed_click', 0.1), p: [118, 132, 145], yaw: 180, pitch: -28, hf: 64, e: 'in2' },
    { T: G('bed_click', 0.38), p: [118, 128, 158], yaw: 180, pitch: -34, hf: 60, e: 'out' },
    { T: G('bed_click', 0.7), p: [118, 131, 149], yaw: 180, pitch: -29, hf: 63 },
    { T: G('crack', 1), p: [118, 131, 149], yaw: 180, pitch: -29, hf: 63 },
    { T: G('reveal', 0.5), p: [114, 150, 30], yaw: 198, pitch: -14, hf: 74 },
    { T: G('reveal', 1), at: [110, 150, -110], to: [-60, 80, 160], hf: 80 },
    { T: G('rit_in', 1), at: [104, 148, -100], to: [-60, 80, 160], hf: 80 },
    // 1. clock out: the laptop, then the list
    { T: SG(1, 0.15), at: [88, 138, -40], to: [160, 84, -88], hf: 64 },
    { T: SG(1, 0.44), at: [92, 134, -50], to: [158, 82, -90], hf: 60 },
    { T: SG(1, 0.5), at: [104, 126, -76], to: [146, 74, -118], hf: 52 },
    { T: SG(1, 0.92), at: [106, 124, -80], to: [146, 74, -120], hf: 50 },
    // 2. the room: the curtains
    { T: SG(2, 0.15), at: [40, 140, 60], to: [180, 120, 78], hf: 72 },
    { T: SG(2, 0.92), at: [46, 138, 62], to: [180, 118, 78], hf: 70 },
    // 3. water: low, from the side of the tray
    { T: SG(3, 0.14), at: [-123, 95, 115], to: [-99, 60, 160], hf: 58 },
    { T: SG(3, 0.92), at: [-121, 93, 118], to: [-98, 60, 160], hf: 56 },
    // 4. the lights: up at the big light as it goes off; a beat of dark; down and in to the bedside
    // lamp as it clicks on; then its light comes out as warm motes and the camera follows them out
    { T: SG(4, 0.0), at: [16, 146, 6], to: [-84, 92, 150], hf: 80 },
    { T: SG(4, 0.07), at: [140, 128, -150], to: [-40, 184, 60], hf: 82 },
    { T: SG(4, 0.15), at: [136, 128, -146], to: [-40, 186, 60], hf: 80 },
    { T: SG(4, 0.2), at: [112, 122, -110], to: [-112, 106, 150], hf: 70 },
    { T: SG(4, 0.26), at: [-12, 114, 50], to: [-132, 92, 170], hf: 60 },
    { T: SG(4, 0.31), at: [-64, 106, 116], to: [-136, 88, 174], hf: 54 },
    { T: SG(4, 0.42), at: [-58, 112, 106], to: [-120, 96, 168], hf: 60 },
    { T: SG(4, 0.56), at: [-52, 116, 100], to: [-100, 108, 160], hf: 62 },
    { T: SG(4, 0.69), at: [-30, 124, 86], to: [-80, 124, 156], hf: 68 },
    { T: SG(4, 0.83), at: [14, 136, 46], to: [-56, 118, 160], hf: 74 },
    { T: SG(4, 0.96), at: [56, 146, -46], to: [-24, 112, 160], hf: 82 },
    // 5. the phone, into the drawer
    { T: SG(5, 0.15), at: [-58, 94, 72], to: [-116, 47, 140], hf: 62 },
    { T: SG(5, 0.92), at: [-60, 93, 74], to: [-116, 46, 140], hf: 61 },
    // 6. breathe, sitting on the bed
    { T: SG(6, 0.15), at: [20, 110, 112], to: [150, 112, 30], hf: 70 },
    { T: SG(6, 0.92), at: [22, 110, 110], to: [150, 112, 30], hf: 70 },
    // 7. lie down with a book (the last thing before lights out)
    { T: SG(7, 0.15), at: [-12, 114, 78], to: [-38, 64, 112], hf: 56 },
    { T: SG(7, 0.92), at: [-14, 112, 80], to: [-38, 64, 112], hf: 54 },
    { T: G('rit_done', 0.3), at: [60, 140, -60], to: [-90, 90, 170], hf: 84 },
    { T: G('rit_done', 1), at: [58, 140, -56], to: [-90, 90, 170], hf: 84 },
    // lights out, lie down, fall asleep
    { T: G('out', 0.3), at: [56, 138, -50], to: [-90, 90, 170], hf: 84 },
    { T: G('out', 0.66), at: [-6, 110, 100], to: [-92, 64, 162], hf: 70 },
    { T: G('out', 1), p: [-40, 77, 156], to: [-90, 62.5, 162], roll: 14, hf: 60 },
    { T: G('sleep', 0.5), p: [-41, 76, 156], to: [-90, 63, 162], roll: 10, hf: 58 },
    { T: G('sleep', 1), p: [-43, 72, 158], to: [-90, 64, 162], roll: 4, vf: 42, vf0: 42 },
    { T: G('finale', 0.4), p: [-42, 66, 160], to: [-90, 62, 162], roll: 0, vf: 40, vf0: 40 },
    { T: G('finale', 0.7), p: [-44, 67, 164], to: [-90, 62.3, 162], roll: -2, vf: 41, vf0: 41 },
    { T: G('finale', 1), p: [-40, 64, 161], to: [-90, 62, 162], roll: 0, vf: 40, vf0: 40 },
    // the sun on the label: a little closer, then still while the bottle melts into the dream
    { T: G('sun', 0.3), p: [-54, 62.4, 162], to: [-90, 62, 162], roll: 0, vf: 36, vf0: 36 },
    { T: G('end', 1), p: [-54, 62.4, 162], to: [-90, 62, 162], roll: 0, vf: 36, vf0: 36 },
  ]);
  // on a tall screen the dream's view opens up, so the bottle doesn't fill the width
  var dreamFov = 1;
  function dreamKeys() {
    dreamFov = aspect < 1 ? lerp(1.42, 1, clamp((aspect - 0.46) / 0.54, 0, 1)) : 1;
    KB.forEach(function (k) { if (k.vf0) k.vf = k.vf0 * dreamFov; });
  }

  /* ------------------------------------------------------------------ what's on in the bedroom */
  var CLICK = G('bed_click', 0.38);
  var LIGHT = G('crack', 0);
  var SNAP = G('sleep', 0.3); // eyes shut: from here the room is a picture, and the bottle is drawn alone
  // a bedside lamp clicking on: up, a little stutter, then full
  function lampClick(k) {
    if (k <= 0) return 0;
    if (k < 0.2) return (k / 0.2) * 0.8;
    if (k < 0.32) return lerp(0.8, 0.35, (k - 0.2) / 0.12);
    if (k < 0.5) return lerp(0.35, 0.95, (k - 0.32) / 0.18);
    return lerp(0.95, 1, ease.sine(clamp((k - 0.5) / 0.5, 0, 1)));
  }
  function bedState(T) {
    var st = { dark: 1 };
    var after = T >= LIGHT;
    // after the click: the big light and the desk lamp, until step 4. There the big light goes off
    // (a beat of dark), the bedside lamp clicks on, and its light comes out as warm motes; then lights out
    var OFF = SG(4, 0.15), ON = SG(4, 0.235);
    st.big = after ? kf(T, [[LIGHT, 0.4], [G('crack', 0.5), 1], [OFF, 1], [OFF + 0.012, 0]]) : 0;
    st.bigDisc = after ? kf(T, [[LIGHT, 0.4], [G('crack', 0.5), 1], [OFF, 1], [OFF + 0.012, 0.3], [SG(4, 0.2), 0]]) : 0;
    st.lamp = T < ON ? 0 : T < G('out', 0.18) ? lampClick(span(T, ON, SG(4, 0.275), ease.lin)) : kf(T, [[G('out', 0.18), 1], [G('out', 0.36), 0]]);
    st.fill = after ? kf(T, [[LIGHT, 0.2], [G('crack', 0.6), 0.56], [OFF, 0.56], [OFF + 0.012, 0.08], [ON, 0.08], [SG(4, 0.32), 0.42], [G('out', 0.1), 0.42], [G('out', 0.4), 0]]) : 0;
    st.warmth = after ? kf(T, [[LIGHT, 0], [G('crack', 0.6), 0.55], [OFF, 0.55], [SG(4, 0.32), 1], [G('out', 0.2), 1], [G('out', 0.5), 0]]) : 0;
    st.dim = kf(T, [[OFF, 0], [OFF + 0.012, 0.85], [SG(4, 0.32), 1]]);
    st.fairy = 0; // the string lights stay off: the lamp's own light fills the room
    st.desk = after ? kf(T, [[LIGHT, 0], [G('crack', 0.5), 0.8], [OFF, 0.8], [OFF + 0.012, 0]]) : 0;
    st.laptop = kf(T, [[SG(1, 0.24), 1], [SG(1, 0.44), 0]]);
    st.street = kf(T, [[SG(2, 0.28), 1], [SG(2, 0.72), 0.14], [G('out', 0.5), 0.14], [SNAP, 0]]);
    st.torch = T < CLICK ? kf(T, [[G('bed_wake', 0.62), 0], [G('bed_wake', 0.74), 1]]) : kf(T, [[LIGHT + 0.02, 1], [LIGHT + 0.3, 0]]);
    st.phone = kf(T, [[SG(5, 0.24), 1], [SG(5, 0.36), 0]]);
    st.night = span(T, G('out', 0.3), SNAP, ease.sine);
    st.moon = span(T, G('out', 0.35), G('out', 0.8), ease.sine) * (1 - span(T, G('finale', 0.1), G('finale', 0.4), ease.sine));
    st.fin = span(T, G('sleep', 0.7), G('finale', 0.2), ease.sine);
    return st;
  }
  function group(o, st) {
    var g = o.grp || 'fill';
    if (g === 'fairy' && o.fi != null && !o.k) return clamp(st.fairy * 10 - o.fi, 0, 1);
    return st[g] == null ? 0 : st[g];
  }
  function lightBed(B, st, time) {
    B.objs.forEach(function (o) {
      if (o.gone) return;
      if (o.base != null && o.kind) {
        var f = o.kind === 'work' ? 0 : o.kind === 'warm' ? group(o, st) : 1;
        if (o === K.laptopGlow) f *= st.laptop;
        o.glow = o.base * f;
        o.hidden = o.glow < 0.003;
      }
      if (o.warmEmit != null) o.emit = o.warmEmit * group(o, st) + (o.baseEmit || 0);
    });
    B.lights.forEach(function (l) {
      if (l.i0 == null) return;
      var f = l.k === 'warm' ? group(l, st) : 1;
      if (l === K.laptopLight) f *= st.laptop;
      if (l.street) f *= st.street;
      l.i = l.i0 * f * (1 - st.night * (l.k === 'always' ? 0.85 : 0));
    });
    if (K.lid) K.lid.emit = K.lidEmit * st.laptop;
    if (K.city) K.city.emit = 0.92 * (0.15 + 0.85 * st.street);
    K.phoneLight.i = 0.3 * st.phone * (1 - st.night);
    K.phone[1].emit = 0.95 * st.phone;
    // the switch's LED: a slow amber pulse until it's pressed
    var sw = K.sw;
    if (sw) {
      var on = curT < CLICK;
      sw.led.emit = on ? 1 : 0;
      sw.glow.base = on ? 0.42 + 0.18 * Math.sin(time * 2.4) : 0;
      sw.glow.glow = sw.glow.base;
      sw.glow.hidden = !on;
      var x = on ? null : { c: sw.pos, R: M.axis(K.swAxis, 24 * DEG) };
      sw.rocker.x = x;
      sw.led.x = x;
    }
    // the dream's lights circle the bottle (they're the three orbs that stayed); the moon comes first
    K.fin.forEach(function (l, i) {
      l.i0 = null;
      if (i === 3) { l.i = st.moon * 0.9; return; }
      l.p = finOrbit(i, time);
      l.i = st.fin * (2.2 + 0.6 * Math.sin(time * 0.9 + i * 2));
    });
  }

  /* ------------------------------------------------------------------ things that move */
  var notesShown = -1, clockShown = '';
  // pleated curtains fold like an accordion: each pleat meets the next at its edge (spacing =
  // width × cos angle), and closed, the two halves meet in the middle of the window
  function curtains(k) {
    var F = K.B.frame('e');
    var ang = lerp(74, 41.6, k) * DEG, sp = PLEAT * Math.cos(ang);
    K.pleats.forEach(function (o) {
      var dir = o.side === 'l' ? 1 : -1, u0 = o.side === 'l' ? 10 : 146;
      var u = u0 + dir * sp * (o.j + 0.5);
      var a = (o.j % 2 ? 1 : -1) * dir * ang;
      var p = F.at(u, 22);
      o.pos = [p[0], 148, p[1]];
      o.R = M.rotY(-90 * DEG + a);
    });
  }

  function bottleFace(T) {
    // the label towards you at the water, then towards the pillow from lights out
    return kf(T, [[SG(3, 0), 214], [SG(3, 0.95), 214], [G('rit_done', 0.5), 139], [G('out', 0.5), 139], [G('out', 1), 92]]);
  }
  function bottleFloat(T, time) {
    var calm = 1 - span(T, G('sun', 0), G('sun', 0.25));
    return span(T, G('sleep', 0.6), G('finale', 0.5), ease.sine) * 3.2 + Math.sin(time * 0.8) * 0.35 * span(T, G('finale', 0.2), G('finale', 0.5)) * calm;
  }
  function bottleSpin(T, time) {
    // one slow turn in the dream; then a little more, so the sun on the label faces you
    var k = span(T, G('finale', 0.08), G('finale', 0.9), ease.inOut);
    var calm = 1 - span(T, G('finale', 0.85), G('sun', 0.2));
    return k * 360 + SUN_TURN * span(T, G('sun', 0), G('sun', 0.28)) + Math.sin(time * 0.4) * 4 * span(T, G('finale', 0.1), G('finale', 0.3)) * calm;
  }
  function moveBed(T, time, cam) {
    // 1. the laptop closes, the list gets written
    if (K.lid) {
      var lk = span(T, SG(1, 0.24), SG(1, 0.44));
      K.lid.x = lk > 0 ? { c: K.lidHinge, R: M.axis(K.lidAxis, K.lidAngle * lk) } : null;
    }
    var notes = PROPS.notes || ['1. Call the supplier', '2. Finish the rota', '3. Reply to Dana', '-', 'Done for today.'];
    var total = notes.join('').length;
    var wk = span(T, SG(1, 0.48), SG(1, 0.76), ease.lin);
    var n = Math.round(wk * total);
    var npTex = K.B.tex.notepad;
    if (n !== notesShown && npTex) {
      notesShown = n;
      var left = n, lines = [];
      for (var i = 0; i < notes.length && left > 0; i++) {
        var l = notes[i];
        lines.push(l === '-' ? '-' : l.slice(0, left));
        left -= l.length;
      }
      npTex.update(PT.sheet(200, 280, { title: PROPS.notesTitle || 'TOMORROW', lines: lines, fs: 0.062, lh: 0.1, mono: false, col: '#2c3e70' }));
    }
    // the pen follows the writing
    if (K.notepad) {
      var vis = T > SG(1, 0.44) && T < SG(2, 0.12);
      K.pen.hidden = K.penTip.hidden = !vis;
      if (vis) {
        var li = 0, acc = 0, ch = 0;
        for (var j = 0; j < notes.length; j++) {
          if (n <= acc + notes[j].length || j === notes.length - 1) { li = j; ch = n - acc; break; }
          acc += notes[j].length;
        }
        var fu = 0.12 + Math.min(0.76, ch * 0.62 * 0.062 * (280 / 200) * 0.72);
        var fv = 0.08 + 0.09 + li * 0.1;
        if (wk >= 1) { fu = 0.8; fv = 0.86; }
        var wob = wk > 0 && wk < 1 ? Math.sin(T * 220) * 0.006 : 0;
        var tip = addv(K.npC, addv(scl(K.npX, (fu - 0.5) * K.npS[0]), addv(scl(K.npY, (0.5 - fv - wob) * K.npS[1]), scl(K.npZ, K.npS[2] / 2 + 0.3))));
        var dir = norm([-0.55, 0.78, 0.3]);
        K.penTip.pos = addv(tip, scl(dir, 0.8));
        K.penTip.R = alongY(scl(dir, -1));
        K.pen.pos = addv(tip, scl(dir, 1.6 + 7));
        K.pen.R = alongY(dir);
      }
    }
    // 2. the curtains close
    curtains(span(T, SG(2, 0.26), SG(2, 0.72)));

    // 3. water: pour from the carafe, sit and sip; then, optionally, RESET
    var lift = span(T, SG(3, 0.24), SG(3, 0.3)) * (1 - span(T, SG(3, 0.44), SG(3, 0.5)));
    var tilt = span(T, SG(3, 0.29), SG(3, 0.34)) * (1 - span(T, SG(3, 0.41), SG(3, 0.45)));
    var poured = span(T, SG(3, 0.32), SG(3, 0.42), ease.lin);
    var c0 = [CARAFE[0], TRAY + 7.5, CARAFE[2]];
    var toGlass = norm([GLASS[0] - CARAFE[0], 0, GLASS[2] - CARAFE[2]]);
    var pourAxis = norm(cross([0, 1, 0], toGlass));
    var Rc = M.axis(pourAxis, 102 * DEG * tilt);
    var cPour = [GLASS[0] - toGlass[0] * 9, TRAY + 22, GLASS[2] - toGlass[2] * 9];
    var cNow = lerpv(c0, cPour, lift);
    var tC = subv(cNow, c0);
    K.carafe.forEach(function (o) { o.x = { c: c0, R: Rc, t: tC }; });
    var cwH = lerp(11, 6.2, poured);
    K.carafeWater.pos = [c0[0], TRAY + 0.5 + cwH / 2, c0[2]];
    K.carafeWater.s = [8.2, cwH, 8.2];
    K.carafeWater.x = { c: c0, R: Rc, t: tC };
    // the stream, from the lip to the glass
    var lip = addv(cNow, M.apply3(Rc, addv([0, 9.6, 0], scl(toGlass, 2.7))));
    var sip = span(T, SG(3, 0.5), SG(3, 0.56)) * (1 - span(T, SG(3, 0.62), SG(3, 0.68)));
    var drunk = span(T, SG(3, 0.56), SG(3, 0.62));
    var gh = Math.max(0.2, poured * 8.6 - drunk * 3.6);
    var surf = [GLASS[0], TRAY + 0.4 + gh, GLASS[2]];
    var pouring = T > SG(3, 0.32) && T < SG(3, 0.42);
    K.stream.hidden = !pouring;
    if (pouring) {
      var dv = subv(surf, lip), len = Math.hypot(dv[0], dv[1], dv[2]);
      K.stream.pos = lerpv(lip, surf, 0.5);
      K.stream.R = alongY(dv);
      K.stream.s = [1.3, len, 1.3];
    }
    K.water.hidden = gh < 0.3;
    K.water.pos = [GLASS[0], TRAY + 0.4 + gh / 2, GLASS[2]];
    K.water.s = [5.8, gh, 5.8];
    // the sip: the glass comes up to you and goes back
    var g0 = [GLASS[0], TRAY + 5.5, GLASS[2]];
    var gx = null;
    if (sip > 0 && cam) {
      var bs = camBasis(cam);
      var to = addv(cam.pos, addv(scl(bs.f, 30), scl(bs.u, -6)));
      gx = { c: g0, R: M.axis(bs.r, -22 * DEG * sip), t: scl(subv(to, g0), sip) };
    }
    K.glass.x = gx;
    K.water.x = gx;
    // RESET: the cap spins off, one capsule comes out, the cap goes back on
    var face = bottleFace(T), spin = bottleSpin(T, time), fl = bottleFloat(T, time);
    var Rb = M.rotY((face + spin) * DEG);
    var bxc = [BOTTLE[0], BOTTLE[1], BOTTLE[2]];
    K.bottle.forEach(function (o) { o.x = { c: bxc, R: Rb, t: [0, fl, 0] }; });
    var unscrew = span(T, SG(3, 0.68), SG(3, 0.73)), aside = span(T, SG(3, 0.72), SG(3, 0.76));
    var kb = 1 - span(T, SG(3, 0.82), SG(3, 0.88));
    var capC = [BOTTLE[0], BOTTLE[1] + K.jar.capY, BOTTLE[2]];
    var capTilt = M.axis([-0.79, 0, 0.62], -26 * DEG * aside * kb);
    var capSpin = -unscrew * 540 * kb * DEG;
    K.cap.forEach(function (o) {
      o.x = { c: capC, R: M.mul3(capTilt, M.mul3(Rb, M.rotY(capSpin))), t: [6 * aside * kb, fl + (unscrew * 2.2 + aside * 2.4) * kb, 5.2 * aside * kb] };
    });
    var ck = span(T, SG(3, 0.74), SG(3, 0.82), ease.lin);
    var showCap = T > SG(3, 0.74) && T < G('out', 0.5);
    var from = [BOTTLE[0], BOTTLE[1] + K.jar.H + 1.6, BOTTLE[2]];
    var cp = [lerp(from[0], CAPSULE_AT[0], ck), lerp(from[1], CAPSULE_AT[1], ck) + Math.sin(Math.PI * ck) * 6, lerp(from[2], CAPSULE_AT[2], ck)];
    var cR = M.mul3(M.rotY((30 + ck * 200) * DEG), M.rotZ((90 + (1 - ck) * 160) * DEG));
    K.capsule.forEach(function (o) {
      o.hidden = !showCap;
      o.x = { c: [0, 0, 0], R: cR, t: cp };
    });
    // 5. the phone: face down, into the drawer
    var flip = span(T, SG(5, 0.24), SG(5, 0.38));
    var open = span(T, SG(5, 0.4), SG(5, 0.48)) * (1 - span(T, SG(5, 0.64), SG(5, 0.74)));
    var dz = -30 * open;
    K.drawer.forEach(function (o) { o.pos = [o.p0[0], o.p0[1], o.p0[2] + dz]; });
    var into = span(T, SG(5, 0.5), SG(5, 0.62));
    var shut = span(T, SG(5, 0.64), SG(5, 0.74));
    var ia = ease.inOut(clamp(into / 0.55, 0, 1)), ib = ease.inOut(clamp((into - 0.45) / 0.55, 0, 1));
    var pPos = [lerp(PHONE[0], -116, ia), lerp(lerp(PHONE[1], 66, ia), 45.1, ib) + Math.sin(Math.PI * flip) * 6, lerp(PHONE[2], 128, ia) + shut * 30];
    var Rflip = M.axis(K.phoneAxis, Math.PI * flip);
    K.phone.forEach(function (o) {
      o.x = { c: PHONE, R: Rflip, t: subv(pPos, PHONE) };
      o.hidden = shut > 0.98;
    });
    // 7. lying down with a book: it opens and three pages turn
    var openB = span(T, SG(7, 0.22), SG(7, 0.4));
    K.bookL.forEach(function (o) { o.x = { c: K.bookHinge, R: M.axis(K.bookAxis, -Math.PI * (1 - openB)) }; });
    K.pages.forEach(function (o, i) {
      var pk = span(T, SG(7, 0.44 + i * 0.12), SG(7, 0.55 + i * 0.12), ease.sine);
      o.hidden = !(pk > 0 && pk < 1);
      o.x = { c: K.pageHinge, R: M.axis(K.bookAxis, Math.PI * pk * 0.995) };
    });
    // 4. the lamp's light, as warm motes filling the room; at lights out they fade, and three
    // stay on as the dream's lights and float over to the bottle to circle it in the dream
    var come = span(T, SG(4, 0.29), SG(4, 0.88), ease.lin);
    var outK = span(T, G('out', 0.15), G('out', 0.45));
    var toDream = span(T, G('out', 0.55), G('sleep', 0.85), ease.sine);
    K.motes.update(come, outK, time, 0.016);
    var warmC = Ink.hex('#ffc27a');
    K.orbs.forEach(function (ob) {
      var m = K.motes.list[ob.m];
      var t = time;
      var p = lerpv(m.pos, finOrbit(ob.n, t), toDream);
      var vis = span(T, G('out', 0.1), G('out', 0.4)) * (1 - span(T, G('sun', 0.08), G('sun', 0.26)));
      var col = lerpv(warmC, ob.dc, toDream);
      var pulse = 1 + 0.16 * Math.sin(t * 1.5 + ob.p[0] * 3) + 0.05 * Math.sin(t * 4.1 + ob.p[1]);
      var grow = 0.35 + 0.65 * toDream;
      var hs = 34 * pulse * grow, cs = ob.r * (0.9 + 0.1 * pulse) * (0.6 + 0.4 * grow);
      ob.halo.pos = p; ob.tint.pos = p; ob.core.pos = p;
      ob.halo.c = col; ob.tint.c = col;
      ob.halo.s = [hs, hs, 1]; ob.tint.s = [cs * 2.6, cs * 2.6, 1]; ob.core.s = [cs, cs, 1];
      ob.halo.base = 0.34 * vis; ob.tint.base = 0.95 * vis; ob.core.base = 0.9 * vis;
    });
    moveDream(T, time, cam);
    // the bedside clock
    var mins = Math.round(kf(T, [[G('bed_wake', 0), 40], [G('rit_in', 0), 44], [G('rit_done', 0), 64], [G('out', 1), 66]], ease.lin));
    var hh = Math.floor(mins / 60), m2 = mins % 60;
    var ts = '0' + hh + ':' + (m2 < 10 ? '0' : '') + m2;
    if (ts !== clockShown && K.digits) {
      clockShown = ts;
      api.data.time = ts;
      K.digits.update(PT.digits(160, 64, ts));
    }
  }

  /* ------------------------------------------------------------------ drawing a frame */
  function mixHex(a, b, t) {
    var x = Ink.hex(a), y = Ink.hex(b);
    return [lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)];
  }
  function renderHall(cam, time, T) {
    var H0 = R.hall, B = H0.B;
    if (K.hallPhone) {
      // a phone buzzing on a table: two short buzzes, a rest
      var ph = time % 1.3, buzz = ph < 0.2 || (ph > 0.32 && ph < 0.52);
      var bz = buzz && T > G('hall_in', 0.55) && T < G('hall_walk', 0.62) ? Math.sin(time * 62) * 0.22 : 0;
      K.hallPhone.pos = [K.hallPhone.p0[0], K.hallPhone.p0[1], K.hallPhone.p0[2] + bz];
    }
    var bg = Ink.hex(H0.D.look.bg);
    Rnd.render(B.objs, { cam: cam, amb: H0.D.look.amb, ink: H0.D.look.ink, dark: 0, warm: 0, bg: [bg[0], bg[1], bg[2], 1], hatch: 1, grain: 0.04, cull: true, lights: B.lights });
  }
  function torchOf(cam, k) {
    if (k <= 0.01) return null;
    var b = camBasis(cam);
    var pos = addv(cam.pos, addv(scl(b.r, 7), [0, -9, 0]));
    return { p: pos, d: norm(addv(b.f, [0, -0.04, 0])), c: '#fff1d8', i: 1.55 * k, a: 19, soft: 0.07 };
  }
  function renderBed(cam, st, T, time, opt) {
    opt = opt || {};
    var Bm = R.bed, B = Bm.B;
    lightBed(B, st, time);
    var amb = mixHex(Bm.D.look.amb, '#8a6450', st.warmth * 0.75);
    var dk = 1 - 0.3 * (st.dim || 0);
    amb = [lerp(amb[0] * dk, 0.02, st.night), lerp(amb[1] * dk, 0.024, st.night), lerp(amb[2] * dk, 0.04, st.night)];
    var bgc = mixHex(Bm.D.look.bg, '#000000', st.night);
    var only = opt.bottleOnly;
    Rnd.render(only ? K.finObjs : B.objs, {
      cam: cam,
      amb: only ? [0.03, 0.03, 0.05] : amb,
      ink: Bm.D.look.ink,
      dark: 1,
      warm: 1,
      bg: only ? [0, 0, 0, 0] : [bgc[0], bgc[1], bgc[2], 1],
      // hatching is the drawing's shading; in the dark (before the click, dimmed, at night) it stays light
      hatch: only ? 0.22 : clamp(1 - (T < LIGHT ? 0.45 : 0) - 0.55 * (st.dim || 0) - 0.82 * (st.night || 0), 0.14, 1),
      grain: 0.04,
      cull: true,
      lights: only ? K.fin : B.lights,
      spot: torchOf(cam, st.torch),
    });
  }

  function roomAt(T) {
    if (T < G('cal_in', 0.75)) return 'hall';
    if (T >= G('bed_wake', 0)) return 'bed';
    return null;
  }

  var shown = {};
  function vis(el, key, on) {
    if (!el || shown[key] === on) return;
    shown[key] = on;
    el.style.visibility = on ? 'visible' : 'hidden';
  }

  var lastCam = null, lastRoom = null, pressed = false;
  // the switch in the film is the site's switch too: once pressed, the evening's on
  function press(T) {
    if (pressed || T < CLICK) return;
    pressed = true;
    if (ES.shift && ES.shift.isOff && !ES.shift.isOff()) ES.shift.set(true, { source: 'story', silent: true, quiet: true });
    if (ES.track) ES.track('story_switch', { how: 'film' });
  }
  function frame(T, time) {
    if (!Rnd) return;
    curT = T;
    press(T);
    var rm = roomAt(T);
    var cam = null;
    if (rm === 'hall') {
      cam = camAt(KH, T);
      renderHall(cam, time, T);
    } else if (rm === 'bed') {
      cam = camAt(KB, T);
      if (T >= SNAP && T < G('finale', 0.4)) dreamSnapshot();
      if (T >= G('sun', 0.2) && T < G('sun', 0.7)) bottleSnapshot(cam, time);
      moveBed(T, time, cam);
      renderBed(cam, bedState(T), T, time, { bottleOnly: T >= SNAP });
    }
    lastCam = cam;
    lastRoom = rm;
    // once the bottle has melted into the dream (the dream's canvas draws it from then on), the 3D can go
    vis(glc, 'gl', !!rm && T < MELT);
    words(T, rm);
    calendar(T);
    shatter(T, cam);
    overlays(T, time);
    aura(T, time);
  }

  /* ------------------------------------------------------------------ words on the stage */
  var HEAD = 72;
  function measureItems() {
    HEAD = Math.max(56, (document.querySelector('.site-header') || { offsetHeight: 64 }).offsetHeight + 8);
    items.forEach(function (it) {
      if (it.anchor) {
        it.w = it.el.offsetWidth;
        it.h = it.el.offsetHeight;
      }
    });
  }
  function words(T, rm) {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var o = (it.a <= 0.0001 ? 1 : clamp((T - it.a) / FADE, 0, 1)) * (it.b >= TOTAL - 0.0001 ? 1 : clamp((it.b - T) / FADE, 0, 1));
      o = o * o * (3 - 2 * o);
      var tf = '';
      if (it.anchor) {
        if (o > 0 && rm === it.anchor.room && Rnd) {
          var pr = Rnd.project(it.anchor.p);
          var cp = lastCam ? lastCam.pos : [0, 0, 0];
          var dist = Math.hypot(it.anchor.p[0] - cp[0], it.anchor.p[1] - cp[1], it.anchor.p[2] - cp[2]);
          if (pr.behind || pr.z < 12 || dist < 40) o = 0;
          else {
            var sc = clamp(Math.sqrt(220 / dist), 0.7, 1.35);
            if (dist < 90) o *= clamp((dist - 40) / 50, 0, 1);
            // things hanging in the air are only there while you can see where they hang
            if (it.soft) o *= clamp(1 - Math.max(-pr.x, pr.x - W, HEAD - pr.y, pr.y - H) / 240, 0, 1);
            var w = it.w * sc, h = it.h * sc;
            var x = clamp(pr.x - w / 2, 12, W - w - 12);
            var y = clamp(pr.y - h, HEAD, H - h - 16);
            tf = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + sc.toFixed(3) + ')';
          }
        } else o = 0;
      } else if (o < 1) tf = 'translate3d(0,' + ((1 - o) * 14).toFixed(1) + 'px,0)';
      if (Math.abs(o - it.o) > 0.002 || tf !== it.tf) {
        it.el.style.opacity = o.toFixed(3);
        it.el.style.transform = tf;
        var v = o > 0.01;
        if (it.live || v !== it.v) { it.v = v; it.el.style.visibility = v ? 'visible' : 'hidden'; }
        it.o = o;
        it.tf = tf;
      }
    }
  }

  /* ------------------------------------------------------------------ the calendar */
  var calRect = null;
  function setVar(el, k, v) {
    var s = v.toFixed(3);
    if (el['__' + k] === s) return;
    el['__' + k] = s;
    el.style.setProperty(k, s);
  }
  function calendar(T) {
    if (!calEl) return;
    var on = T >= G('cal_in', 0) && T < G('bed_wake', 0);
    vis(calEl, 'cal', on);
    if (!on) return;
    var fin = span(T, G('cal_in', 0), G('cal_in', 0.65), ease.sine);
    var zk = span(T, G('cal_zoom', 0.08), G('cal_zoom', 1), ease.inOut);
    var fade = span(T, G('cal_zoom', 0.35), G('cal_zoom', 0.9), ease.sine);
    calEl.style.opacity = (fin * (1 - fade)).toFixed(3);
    // the calendar comes towards you as you dive into tonight's square
    if (zk > 0 && calRect) {
      calEl.style.transformOrigin = calRect.cx.toFixed(0) + 'px ' + calRect.cy.toFixed(0) + 'px';
      calEl.style.transform = 'scale(' + (1 + zk * 2.4).toFixed(3) + ')';
    } else calEl.style.transform = '';
    var k = (T - G('cal_fill', 0)) / TL.cal_fill.len;
    days.forEach(function (li, i) {
      var a0 = 0.04 + i * 0.15, a1 = a0 + 0.15;
      var act = i < 5 ? clamp((k - a0) / 0.03, 0, 1) * clamp((a1 - k) / 0.03, 0, 1) : clamp((k - a0) / 0.03, 0, 1);
      var mark = i < 5 ? clamp((k - (a1 - 0.07)) / 0.06, 0, 1) : clamp((k - 0.86) / 0.11, 0, 1);
      setVar(li, '--a', act);
      setVar(li, '--d', mark);
      var z = act > 0.01 ? '4' : '';
      if (li.__z !== z) { li.__z = z; li.style.zIndex = z; }
    });
  }
  function measureCal() {
    if (!calEl) return;
    var cell = calEl.querySelector('.cal__day--tonight .cal__shot');
    if (!cell) return;
    var prev = calEl.style.transform;
    calEl.style.transform = '';
    var sr = stage.getBoundingClientRect(), cr2 = cell.getBoundingClientRect();
    calEl.style.transform = prev;
    calRect = { x: cr2.left - sr.left, y: cr2.top - sr.top, w: cr2.width, h: cr2.height };
    calRect.cx = calRect.x + calRect.w / 2;
    calRect.cy = calRect.y + calRect.h / 2;
  }
  // the zoom: tonight's square grows to fill the screen; the room is behind it
  function zoom(T) {
    if (!zoomEl) return;
    var on = T >= G('cal_zoom', 0.08) && T < G('bed_wake', 0) && calRect;
    vis(zoomEl, 'zoom', !!on);
    if (!on) return;
    var zk = span(T, G('cal_zoom', 0.08), G('cal_zoom', 1), ease.inOut);
    var s = 1 + zk * 2.4;
    var x0 = calRect.cx - (calRect.w * s) / 2, y0 = calRect.cy - (calRect.h * s) / 2;
    var g = span(T, G('cal_zoom', 0.08), G('cal_zoom', 1), ease.in2);
    var x = lerp(x0, 0, g), y = lerp(y0, 0, g), w = lerp(calRect.w * s, W, g), h = lerp(calRect.h * s, H, g);
    zoomEl.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
    zoomEl.style.width = w.toFixed(1) + 'px';
    zoomEl.style.height = h.toFixed(1) + 'px';
  }

  /* ------------------------------------------------------------------ the crack */
  var fx = fxc ? fxc.getContext('2d') : null;
  var snap = null, snapKey = '', tris = null, fxOn = false;
  function seeded(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function makeShards(ox, oy) {
    var r = seeded(1207);
    var cols = W > 700 ? 8 : 5, rows = H > 700 ? 7 : 6;
    var P = [];
    for (var j = 0; j <= rows; j++) {
      P[j] = [];
      for (var i = 0; i <= cols; i++) {
        var jx = i === 0 || i === cols ? 0 : (r() - 0.5) * 0.75;
        var jy = j === 0 || j === rows ? 0 : (r() - 0.5) * 0.75;
        P[j][i] = [((i + jx) / cols) * W, ((j + jy) / rows) * H];
      }
    }
    // pull the nearest point onto the switch: that's where it breaks from
    var bi = 0, bj = 0, bd = Infinity;
    for (var j2 = 1; j2 < rows; j2++) for (var i2 = 1; i2 < cols; i2++) {
      var dd = Math.hypot(P[j2][i2][0] - ox, P[j2][i2][1] - oy);
      if (dd < bd) { bd = dd; bi = i2; bj = j2; }
    }
    P[bj][bi] = [ox, oy];
    var out = [], maxD = 1;
    for (var y = 0; y < rows; y++)
      for (var x = 0; x < cols; x++) {
        var a = P[y][x], b = P[y][x + 1], c = P[y + 1][x + 1], d = P[y + 1][x];
        var ts = r() < 0.5 ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]];
        ts.forEach(function (t) {
          var cx = (t[0][0] + t[1][0] + t[2][0]) / 3, cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
          var dx = cx - ox, dy = cy - oy, dist = Math.hypot(dx, dy) || 1;
          maxD = Math.max(maxD, dist);
          var push = 0.08 * W + r() * 0.2 * W;
          out.push({ t: t, cx: cx, cy: cy, dist: dist, dx: (dx / dist) * push, dy: (dy / dist) * push * 0.5 + H * (0.35 + r() * 0.5), rot: (r() - 0.5) * 1.3 });
        });
      }
    out.forEach(function (s) { s.delay = (s.dist / maxD) * 0.42; });
    out.maxD = maxD;
    return out;
  }
  function snapshot() {
    var key = W + 'x' + H + 'x' + dpr;
    if (snap && snapKey === key) return snap;
    snapKey = key;
    var T0 = LIGHT - 0.001;
    var cam = camAt(KB, T0);
    var prevT = curT;
    curT = T0;
    moveBed(T0, 0, cam);
    renderBed(cam, bedState(T0), T0, 0, {});
    curT = prevT;
    snap = snap || document.createElement('canvas');
    snap.width = glc.width;
    snap.height = glc.height;
    snap.getContext('2d').drawImage(glc, 0, 0);
    var sp = Rnd.project(K.swPoint);
    tris = makeShards(sp.x || W / 2, sp.y || H / 2);
    return snap;
  }
  function shatter(T, cam) {
    if (!fx) return;
    var on = T >= LIGHT && T < G('crack', 1) && lastRoom === 'bed';
    if (!on) {
      if (fxOn) { fx.clearRect(0, 0, fxc.width, fxc.height); fxOn = false; }
      vis(fxc, 'fx', false);
      return;
    }
    vis(fxc, 'fx', true);
    fxOn = true;
    var img = snap;
    if (!img || !tris) {
      snapshot();
      img = snap;
      // the main canvas was used for the snapshot: draw this frame's room again
      var now = performance.now() / 1000;
      moveBed(T, now, cam);
      renderBed(cam, bedState(T), T, now, {});
    }
    var k = (T - LIGHT) / (G('crack', 1) - LIGHT);
    var sx = fxc.width / W;
    fx.setTransform(1, 0, 0, 1, 0, 0);
    fx.clearRect(0, 0, fxc.width, fxc.height);
    fx.setTransform(sx, 0, 0, sx, 0, 0);
    var crackK = clamp(k / 0.3, 0, 1);
    var fall = clamp((k - 0.26) / 0.74, 0, 1);
    var shake = k < 0.12 ? (1 - k / 0.12) * 5 : 0;
    var jx = shake ? Math.sin(T * 900) * shake : 0, jy = shake ? Math.cos(T * 700) * shake : 0;
    var R0 = crackK * tris.maxD * 1.1;
    for (var i = 0; i < tris.length; i++) {
      var s = tris[i];
      var f = clamp((fall - s.delay) / 0.5, 0, 1);
      if (f >= 1) continue;
      var g = f * f;
      fx.save();
      fx.translate(s.cx + s.dx * f + jx, s.cy + s.dy * g + jy);
      fx.rotate(s.rot * g);
      fx.scale(1 - 0.12 * f, 1 - 0.12 * f);
      fx.translate(-s.cx, -s.cy);
      fx.beginPath();
      fx.moveTo(s.t[0][0], s.t[0][1]);
      fx.lineTo(s.t[1][0], s.t[1][1]);
      fx.lineTo(s.t[2][0], s.t[2][1]);
      fx.closePath();
      fx.save();
      fx.clip();
      fx.globalAlpha = 1 - f * f * f;
      fx.drawImage(img, 0, 0, W, H);
      fx.restore();
      // the cracks: ink, with a glint
      if (s.dist < R0 || f > 0) {
        fx.globalAlpha = 1 - f;
        fx.lineJoin = 'round';
        fx.strokeStyle = 'rgba(11,13,16,.95)';
        fx.lineWidth = 2.4;
        fx.stroke();
        fx.strokeStyle = 'rgba(255,240,215,.55)';
        fx.lineWidth = 0.9;
        fx.stroke();
      }
      fx.restore();
    }
  }

  /* ------------------------------------------------------------------ lids, breath, the ritual's frame, bar */
  var last = {};
  function setOnce(k, v, fn) { if (last[k] === v) return; last[k] = v; fn(v); }
  var stepLabel = FW.step || 'Step {n} / 7';
  var stepNow = -2;
  // each step's frame: in, out. When you scroll past the step's moment (s) it's done: a tick pops
  // up on the step's tab and its diamond fills, right where you're already looking. Step 4 steps
  // aside while the lamp's light fills the room, then comes back for its tick.
  var FWIN = {
    def: { a: 0.14, b: 0.24, c: 0.9, d: 0.98, s: 0.68 },
    4: { a: 0.05, b: 0.1, h0: 0.2, h1: 0.25, r0: 0.84, r1: 0.87, c: 0.965, d: 0.995, s: 0.87 },
    // breathing: done once the last breath is out
    6: { a: 0.14, b: 0.24, c: 0.96, d: 0.995, s: 0.89 },
  };
  function ritualFrame(T) {
    if (!frameEl) return;
    var cur = -1, fo = 0, slam = 0;
    for (var i = 0; i < 7; i++) {
      var n = i + 1;
      if (T >= SG(n, 0) && T < SG(n, 1)) {
        var w = FWIN[n] || FWIN.def;
        cur = i;
        fo = span(T, SG(n, w.a), SG(n, w.b), ease.sine) * (1 - span(T, SG(n, w.c), SG(n, w.d), ease.sine));
        if (w.h0) fo *= 1 - span(T, SG(n, w.h0), SG(n, w.h1), ease.sine) * (1 - span(T, SG(n, w.r0), SG(n, w.r1), ease.sine));
        slam = T >= SG(n, w.s) ? 1 : 0;
      }
    }
    setOnce('fo', fo.toFixed(3), function (v) {
      frameEl.style.opacity = v;
      frameEl.style.visibility = +v > 0.004 ? 'visible' : 'hidden';
    });
    if (cur >= 0 && cur !== stepNow) {
      stepNow = cur;
      var li = steps[cur];
      if (ffN) ffN.textContent = stepLabel.replace('{n}', cur + 1);
      if (ffT) ffT.textContent = li ? li.getAttribute('data-title') : '';
      if (ffTime) ffTime.textContent = li ? li.getAttribute('data-from') + ' → ' + li.getAttribute('data-to') : '';
    }
    ffPips.forEach(function (p, j) {
      var st = j < cur || (j === cur && slam) ? 'done' : j === cur ? 'now' : '';
      if (p.__s !== st) { p.__s = st; p.className = st; }
    });
    setOnce('ffdone', cur + ':' + slam, function () { frameEl.classList.toggle('is-done', !!slam); });
  }
  function overlays(T, time) {
    zoom(T);
    ritualFrame(T);
    // the ritual's list of steps, one by one
    if (rintroEl) setOnce('rk', span(T, G('rit_in', 0.2), G('rit_in', 0.75), ease.lin).toFixed(3), function (v) { rintroEl.style.setProperty('--k', v); });
    // eyelids: heavy, two slow blinks, and the eyes open again into the dream
    var lid = kf(T, [[G('out', 0.55), 0], [G('out', 0.8), 0.5], [G('out', 0.92), 0.3], [G('sleep', 0.1), 1], [G('sleep', 0.18), 0.32], [G('sleep', 0.3), 1], [G('sleep', 0.42), 0.4], [G('sleep', 0.58), 0.55], [G('sleep', 0.9), 0]]);
    setOnce('lid', lid.toFixed(3), function (v) { lidsEl.style.setProperty('--lid', v); lidsEl.style.visibility = +v > 0.002 ? 'visible' : 'hidden'; });
    // (behind the eyelids it's simply dark: no colours until the dream)
    // breathing: three slow breaths
    var bOn = T > SG(6, 0.2) && T < SG(6, 0.9);
    var bk = clamp((T - SG(6, 0.24)) / (SG(6, 0.86) - SG(6, 0.24)), 0, 1) * 3;
    var phase = bk % 1;
    var b = Math.sin(Math.PI * phase);
    var bo = span(T, SG(6, 0.2), SG(6, 0.26)) * (1 - span(T, SG(6, 0.84), SG(6, 0.9)));
    setOnce('br', bOn ? b.toFixed(3) + '|' + bo.toFixed(2) : 'off', function () {
      breathEl.style.visibility = bOn ? 'visible' : 'hidden';
      breathEl.style.setProperty('--b', b.toFixed(3));
      breathEl.style.opacity = bo.toFixed(3);
    });
    setOnce('bw', phase < 0.5 ? 'in' : 'out', function (v) { if (breathWord) breathWord.textContent = v === 'in' ? FW.breathIn || 'In' : FW.breathOut || 'Out'; });
    setOnce('bar', (T / TOTAL).toFixed(3), function (v) { if (barEl) barEl.style.transform = 'scaleX(' + v + ')'; });
    if (hintEl) setOnce('hint', T < 0.25 ? 1 : 0, function (v) { hintEl.style.opacity = v; });
    // the shade over the room goes as the sky takes over; once it's night, the bar and the skip link too
    setOnce('scrim', (1 - span(T, G('sun', 0.3), G('sun', 0.6))).toFixed(3), function (v) { stage.style.setProperty('--scrim', v); });
    setOnce('ending', T > G('sun', 0.9) ? 1 : 0, function (v) { stage.classList.toggle('is-ending', !!v); });
  }

  /* ------------------------------------------------------------------ the dream
     A second, small canvas behind the bottle. First it shows the room as you last saw it,
     and pulls it round and into the bottle; then ink dropped in water, marbled, circling. */
  var AU = null;
  var MELT = G('sun', 0.3); // from here the bottle is a picture in the dream, melting
  var AFS = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 uRes; uniform float uTime; uniform float uP; uniform vec2 uC; uniform float uR;',
    'uniform sampler2D uRoom; uniform float uMelt; uniform float uMix; uniform float uCalm;',
    'uniform sampler2D uBot; uniform float uBMelt; uniform float uBOn;',
    'uniform vec4 uM[4]; uniform vec3 uMC[4];',
    'uniform float uSky; uniform vec2 uSunC; uniform float uSunR; uniform float uSunG; uniform float uHor; uniform float uHorW; uniform float uSet;',
    'float h21(vec2 p){ p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }',
    'float nz(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y); }',
    'float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 5; i++){ v += a * nz(p); p = m * p; a *= 0.5; } return v; }',
    // the room as your eyes close: it turns towards the bottle and runs along the dream's own currents
    'vec3 meltRoom(vec2 px, vec2 w1, vec2 w2){',
    '  vec2 d = px - uC;',
    '  float r = length(d) / uR;',
    '  float s = uMelt;',
    '  float a = s * 2.8 / (0.6 + r * 0.22);',
    '  float pull = 1.0 + s * s * (0.8 + 0.08 * r);',
    '  vec2 ds = mat2(cos(a), sin(a), -sin(a), cos(a)) * d * pull;',
    '  ds += ((w2 - 0.5) * 6.0 + (w1 - 0.5) * 2.5) * uR * s * s;',
    '  vec3 acc = vec3(0.0);',
    '  for (int i = 0; i < 6; i++){',
    '    float k = 1.0 + float(i) * 0.05 * s;',
    '    acc += texture2D(uRoom, clamp((uC + ds * k) / uRes, 0.0, 1.0)).rgb;',
    '  }',
    '  return acc / 6.0 * (1.0 + 2.4 * s);',
    '}',
    'void main(){',
    '  vec2 px = gl_FragCoord.xy;',
    '  vec2 d = (px - uC) / uR;',
    '  float r = length(d);',
    '  float an = atan(d.y, d.x);',
    '  float t = uTime;',
    '  float sw = (0.4 + 2.4 * uP) / (0.9 + 0.32 * r);',
    '  float a2 = an + sw + t * (0.05 + 0.06 * uP);',
    '  vec2 q = vec2(cos(a2), sin(a2)) * r * 0.3;',
    // at the end the swirl lays down into a sky: the same currents, in bands
    '  q = mix(q, vec2(px.x / uRes.y * 1.6 + t * 0.03, (px.y - uHor) / uRes.y * 6.0), uSky);',
    '  vec2 w1 = vec2(fbm(q + vec2(0.0, t * 0.05)), fbm(q + vec2(5.2, 1.3) - t * 0.04));',
    '  vec2 w2 = vec2(fbm(q + 3.2 * w1 + vec2(1.7, 9.2) + t * 0.03), fbm(q + 3.2 * w1 + vec2(8.3, 2.8) - t * 0.025));',
    '  float f = fbm(q + (2.4 + 2.8 * uP) * w2);',
    '  vec3 ink = vec3(0.03, 0.028, 0.05);',
    '  vec3 col = mix(ink, vec3(0.13, 0.1, 0.33), smoothstep(0.15, 0.55, f));',
    '  col = mix(col, vec3(0.04, 0.42, 0.46), smoothstep(0.38, 0.76, w1.y) * 0.9);',
    '  col = mix(col, vec3(0.74, 0.12, 0.24), smoothstep(0.5, 0.84, w2.x) * (0.55 + 0.45 * uP));',
    '  col = mix(col, vec3(0.46, 0.2, 0.64), smoothstep(0.56, 0.9, w1.x) * 0.6);',
    '  col = mix(col, vec3(0.96, 0.62, 0.24), smoothstep(0.57, 0.86, f) * (0.55 + 0.45 * uP));',
    '  col += vec3(1.0, 0.86, 0.55) * pow(smoothstep(0.68, 0.98, f), 3.0) * (0.4 + 0.9 * uP);',
    '  float k = f * (9.0 + 9.0 * uP) + w2.y * 2.0;',
    '  float ln = abs(fract(k) - 0.5);',
    '  col = mix(col, ink, (1.0 - smoothstep(0.025, 0.08, ln)) * (0.22 + 0.48 * uP));',
    // settling: deeper, cooler
    '  col = mix(col, col * vec3(0.72, 0.86, 1.18), uCalm * 0.5);',
    '  float bot = 1.0 - uSky;',
    '  float core = exp(-r * r * 0.32);',
    '  col += vec3(0.96, 0.62, 0.24) * core * (0.3 + 0.7 * uP) * bot;',
    '  float rays = pow(abs(sin(an * 7.0 + f * 4.0 - t * 0.12)), 22.0) * smoothstep(8.0, 0.9, r) * smoothstep(0.15, 0.7, uP);',
    '  col += vec3(1.0, 0.86, 0.55) * rays * 0.5 * bot;',
    '  vec2 sp = q * 9.0 + vec2(0.0, -t * 0.45);',
    '  vec2 cl = floor(sp); vec2 fr = fract(sp) - 0.5;',
    '  vec2 off = vec2(h21(cl + 3.1), h21(cl + 7.7)) - 0.5;',
    '  float spark = smoothstep(0.1, 0.0, length(fr - off * 0.6)) * step(0.78, h21(cl)) * smoothstep(9.0, 1.4, r);',
    '  col += vec3(1.0, 0.86, 0.55) * spark * (0.25 + 1.0 * uP) * (1.0 - 0.6 * uSky);',
    // things from the day, coming apart: their colour runs into the currents
    '  for (int i = 0; i < 4; i++){',
    '    if (uM[i].w > 0.0) {',
    '      float dm = length(px - uM[i].xy) / max(uM[i].z, 1.0);',
    '      float l2 = abs(fract(f * 12.0 + w1.x * 4.0) - 0.5);',
    '      col += uMC[i] * exp(-dm * dm * 1.4) * uM[i].w * (0.3 + 0.7 * (1.0 - smoothstep(0.04, 0.22, l2)));',
    '    }',
    '  }',
    // the dream reaches the edges of the screen at once (no dark gap after the room)
    '  float reach = mix(5.0, 16.0, smoothstep(0.0, 1.0, uP));',
    '  col *= mix(smoothstep(reach, reach * 0.22, r) * 0.92 + 0.08 * core, 1.0, uSky);',
    // out of the room: its colours run into the dream's
    '  vec3 outc = col;',
    '  if (uMix < 0.999) {',
    '    vec3 rm = meltRoom(px, w1, w2);',
    '    float lum = dot(rm, vec3(0.3, 0.59, 0.11));',
    '    rm = mix(rm, rm * 0.35 + col * (0.5 + 3.0 * lum), smoothstep(0.15, 1.0, uMelt) * 0.75);',
    '    outc = mix(rm, col, uMix);',
    '  }',
    // the bottle, melting into it at the end
    '  if (uBOn > 0.5) {',
    '    float s = uBMelt;',
    '    vec2 bp = px + ((w2 - 0.5) * 7.0 + (w1 - 0.5) * 3.0) * uR * s * s;',
    '    vec4 b = texture2D(uBot, clamp(bp / uRes, 0.0, 1.0));',
    '    outc = mix(outc, b.rgb, b.a * (1.0 - smoothstep(0.3, 1.0, s)));',
    '  }',
    // the sunset: a sky, the sun from the label, an ink horizon, then night
    '  if (uSky > 0.0) {',
    '    float hy = px.y - uHor;',
    '    float above = smoothstep(-1.0, 1.0, hy);',
    '    vec3 sunC = vec3(1.0, 0.66, 0.28);',
    '    float hz = clamp(hy / (uRes.y * 0.55), 0.0, 1.0);',
    '    vec3 grad = mix(vec3(0.95, 0.42, 0.22), vec3(0.16, 0.12, 0.34), pow(hz, 0.6));',
    '    vec3 sky = mix(outc, outc * 0.55 + grad * 0.6, 0.55);',
    '    vec3 night = vec3(0.035, 0.043, 0.085) + vec3(0.2, 0.09, 0.05) * exp(-max(hy, 0.0) / (uRes.y * 0.06)) * (1.0 - uSet * 0.8);',
    '    vec2 sc = floor(px / 1.5);',
    '    night += vec3(0.9, 0.9, 1.0) * step(0.9965, h21(sc + 7.0)) * smoothstep(0.0, 0.25, hz) * (0.55 + 0.45 * sin(t * 2.0 + h21(sc) * 30.0)) * 0.75;',
    '    sky = mix(sky, night, uSet);',
    '    vec2 sd = (px - uSunC) / max(uSunR, 1.0);',
    '    float sl = length(sd);',
    '    float disc = (1.0 - smoothstep(0.95, 1.03, sl)) * above;',
    '    sky = mix(sky, mix(sunC, vec3(1.0, 0.86, 0.55), clamp(sd.y * 0.5 + 0.5, 0.0, 1.0)), disc * uSunG);',
    '    sky += sunC * (exp(-sl * sl * 0.07) * 0.45 + exp(-sl * sl * 0.5) * 0.35) * uSunG * above * (1.0 - uSet * 0.7);',
    '    vec3 ground = vec3(0.047, 0.051, 0.0706);',
    '    float refl = exp(-pow((px.x - uSunC.x) / (uSunR * 1.3 + 1.0), 2.0)) * exp(hy / (uRes.y * 0.12)) * (0.6 + 0.4 * sin(hy * 0.9 + t * 3.0));',
    '    ground += sunC * refl * 0.35 * uSunG * (1.0 - uSet);',
    '    vec3 scene = mix(sky, mix(ground, sky, above), smoothstep(0.0, 0.6, uHorW));',
    // the horizon, inked from the middle outwards, lit along its top while the sun is up
    '    float hw = step(abs(px.x - uRes.x * 0.5), uHorW * uRes.x * 0.5 + 1.0);',
    '    scene = mix(scene, vec3(0.02, 0.022, 0.03), (1.0 - smoothstep(0.8, 2.2, abs(hy))) * hw);',
    '    scene += sunC * exp(-pow((hy - 2.5) / 1.4, 2.0)) * hw * 0.35 * uSunG * (1.0 - uSet);',
    '    outc = mix(outc, scene, uSky);',
    '  }',
    '  float g = h21(floor(px));',
    '  outc *= 0.93 + 0.14 * g;',
    '  vec2 v = px / uRes - 0.5;',
    '  outc *= 1.0 - dot(v, v) * 0.85 * (1.0 - uSky);',
    '  gl_FragColor = vec4(outc, 1.0);',
    '}',
  ].join('\n');
  var AUN = ['uRes', 'uTime', 'uP', 'uC', 'uR', 'uRoom', 'uMelt', 'uMix', 'uCalm', 'uBot', 'uBMelt', 'uBOn', 'uM', 'uMC', 'uSky', 'uSunC', 'uSunR', 'uSunG', 'uHor', 'uHorW', 'uSet'];
  function mkTex(gl) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
  }
  function initAura() {
    if (!auc) return;
    var gl = null;
    try { gl = auc.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false }) || auc.getContext('experimental-webgl'); } catch (e) {}
    if (!gl) return;
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { if (window.console) console.warn('dream', gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    var vs = sh(gl.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }');
    var fs = sh(gl.FRAGMENT_SHADER, AFS);
    if (!vs || !fs) return;
    var pr = gl.createProgram();
    gl.attachShader(pr, vs);
    gl.attachShader(pr, fs);
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var U = {};
    AUN.forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
    AU = { gl: gl, pr: pr, buf: buf, U: U, a: gl.getAttribLocation(pr, 'a'), scale: 0.5, tex: mkTex(gl), bot: mkTex(gl), t: 0, lt: 0, m: new Float32Array(16), mc: new Float32Array(12) };
  }
  function sizeAura() {
    if (!AU) return;
    var px = W * H;
    AU.scale = px > 1200000 ? 0.46 : px > 600000 ? 0.54 : 0.66;
    auc.width = Math.max(2, Math.round(W * AU.scale));
    auc.height = Math.max(2, Math.round(H * AU.scale));
    AU.gl.viewport(0, 0, auc.width, auc.height);
  }
  function upload(tex) {
    var gl = AU.gl;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, glc); } catch (e) {}
  }
  // the room at the moment your eyes close, without the bottle: the dream pulls it in
  var dreamKey = '';
  function dreamSnapshot() {
    if (!AU) return;
    var key = W + 'x' + H + 'x' + dpr;
    if (dreamKey === key) return;
    dreamKey = key;
    var c0 = camAt(KB, SNAP - 0.001);
    var prevT = curT;
    curT = SNAP - 0.001;
    moveBed(curT, 0, c0);
    var hid = K.finObjs.map(function (o) { var h = o.hidden; o.hidden = true; return h; });
    renderBed(c0, bedState(curT), curT, 0, {});
    K.finObjs.forEach(function (o, i) { o.hidden = hid[i]; });
    curT = prevT;
    upload(AU.tex);
  }
  // the bottle as it stands when the sun on its label lights up: from there the dream draws it, melting
  var botKey = '', sunMark = null;
  // where the logo's sun is on the jar's front, as the jar stands at T
  function sunPoint(T, time) {
    var Rb = M.rotY((bottleFace(T) + bottleSpin(T, time)) * DEG);
    var p = M.apply3(Rb, K.jar.sun);
    return [BOTTLE[0] + p[0], BOTTLE[1] + p[1] + bottleFloat(T, time), BOTTLE[2] + p[2]];
  }
  function bottleSnapshot(cam, time) {
    if (!AU) return;
    var key = W + 'x' + H + 'x' + dpr;
    if (botKey === key) return;
    botKey = key;
    var T0 = MELT - 0.001;
    var c0 = camAt(KB, T0);
    var prevT = curT;
    curT = T0;
    moveBed(T0, 0, c0);
    renderBed(c0, bedState(T0), T0, 0, { bottleOnly: true });
    var sp = sunPoint(T0, 0);
    var a = Rnd.project(sp), b = Rnd.project([sp[0], sp[1] + 0.85, sp[2]]);
    sunMark = { x: a.x, y: a.y, r: Math.max(2, Math.abs(a.y - b.y)) };
    curT = prevT;
    upload(AU.bot);
    // the main canvas was used for the snapshot: draw this frame again
    moveBed(curT, time, cam);
    renderBed(cam, bedState(curT), curT, time, { bottleOnly: true });
  }
  function aura(T, time) {
    var on = !!AU && T >= SNAP && lastRoom === 'bed';
    vis(auc, 'aura', on);
    if (!on) return;
    // the dream's own clock: it slows down as the dream settles
    var dt = AU.lt ? clamp(time - AU.lt, 0, 0.1) : 0;
    AU.lt = time;
    var calm = span(T, G('finale', 0.74), G('finale', 0.98));
    AU.t += dt * (1 - 0.55 * calm);
    var melt = span(T, G('sleep', 0.4), G('finale', 0.2), ease.sine);
    var mix = span(T, G('finale', 0.05), G('finale', 0.32), ease.sine);
    var p = span(T, G('finale', 0), G('finale', 0.3), ease.sine);
    var s = AU.scale;
    // the bottle's centre and size on screen (from MELT it's the picture's, which no longer moves)
    var c = Rnd.project([BOTTLE[0], BOTTLE[1] + 9 + bottleFloat(T, time), BOTTLE[2]]);
    var rr = (c.s || 4) * 6.5;
    // the sunset
    var sky = span(T, G('sun', 0.35), G('sun', 0.66), ease.sine);
    var horW = span(T, G('sun', 0.44), G('sun', 0.64), ease.out);
    // the sun sets, and (the reset) comes back up to the line: the ENDSHIFT mark, the day at zero
    var rise = span(T, G('end', 0.12), G('end', 0.62), ease.sine);
    var set = span(T, G('sun', 0.66), G('sun', 0.95), ease.sine) * (1 - 0.5 * rise);
    var bOn = T >= G('sun', 0.27) && sunMark;
    var bm = span(T, MELT, G('sun', 0.5), ease.sine);
    var sunG = span(T, G('sun', 0.27), G('sun', 0.33));
    var hor = H * 0.42; // the horizon, from the bottom of the screen
    var R1 = Math.min(W, H) * 0.12;
    var mv = span(T, G('sun', 0.33), G('sun', 0.6), ease.inOut);
    var down = span(T, G('sun', 0.62), G('sun', 0.9), ease.sine);
    var m0 = sunMark || { x: W / 2, y: H / 2, r: 4 };
    var sx = lerp(m0.x, W / 2, mv);
    var syB = lerp(H - m0.y, hor + R1 * 0.45, mv) - down * R1 * 1.75 + rise * R1 * 1.3;
    var sr = lerp(m0.r, R1, ease.in2(mv));
    var gl = AU.gl, U = AU.U;
    gl.useProgram(AU.pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, AU.buf);
    gl.enableVertexAttribArray(AU.a);
    gl.vertexAttribPointer(AU.a, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, AU.tex);
    gl.uniform1i(U.uRoom, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, AU.bot);
    gl.uniform1i(U.uBot, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform2f(U.uRes, auc.width, auc.height);
    gl.uniform1f(U.uTime, AU.t);
    gl.uniform1f(U.uP, p);
    gl.uniform1f(U.uMelt, melt);
    gl.uniform1f(U.uMix, mix);
    gl.uniform1f(U.uCalm, calm);
    gl.uniform2f(U.uC, (c.x || W / 2) * s, (H - (c.y || H / 2)) * s);
    gl.uniform1f(U.uR, Math.max(8, rr * s));
    gl.uniform1f(U.uBOn, bOn ? 1 : 0);
    gl.uniform1f(U.uBMelt, bm);
    // the day's things coming apart (set by moveDream)
    for (var i = 0; i < 4; i++) {
      var mm = dreamBleed[i];
      AU.m[i * 4] = mm ? mm.x * s : 0;
      AU.m[i * 4 + 1] = mm ? (H - mm.y) * s : 0;
      AU.m[i * 4 + 2] = mm ? mm.r * s : 1;
      AU.m[i * 4 + 3] = mm ? mm.k : 0;
      AU.mc[i * 3] = mm ? mm.c[0] : 0;
      AU.mc[i * 3 + 1] = mm ? mm.c[1] : 0;
      AU.mc[i * 3 + 2] = mm ? mm.c[2] : 0;
    }
    gl.uniform4fv(U.uM, AU.m);
    gl.uniform3fv(U.uMC, AU.mc);
    gl.uniform1f(U.uSky, sky);
    gl.uniform2f(U.uSunC, sx * s, syB * s);
    gl.uniform1f(U.uSunR, sr * s);
    gl.uniform1f(U.uSunG, sunG);
    gl.uniform1f(U.uHor, hor * s);
    gl.uniform1f(U.uHorW, horW);
    gl.uniform1f(U.uSet, set);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* ------------------------------------------------------------------ tonight's square */
  function drawTonight() {
    if (!Rnd || !tonightCv) return;
    var T0 = G('bed_wake', 0);
    var prevT = curT;
    curT = T0;
    var c0 = camAt(KB, T0);
    moveBed(T0, 0, c0);
    renderBed(c0, bedState(T0), T0, 0, {});
    curT = prevT;
    [tonightCv, zoomCv].forEach(function (c) {
      if (!c) return;
      c.width = glc.width;
      c.height = glc.height;
      c.getContext('2d').drawImage(glc, 0, 0);
    });
  }
  // the hallway calendar: the same page as the full-screen one, with this week's pictures in it
  function paintCalendar() {
    if (!K.cal || !R.hall) return;
    var ci = PROPS.calendar || {};
    var imgs = days.map(function (li, i) {
      if (i === 5) return tonightCv;
      var c = li.querySelector('canvas[data-shot]');
      if (c && !c.classList.contains('is-shot') && ES.storyShoot) {
        try { ES.storyShoot(c.getAttribute('data-shot'), c); } catch (e) {}
        var r = c.getBoundingClientRect();
        c.__w = r.width;
        c.__h = r.height;
      }
      return c && c.classList.contains('is-shot') ? c : null;
    });
    var ch = Math.max(100, H - HH);
    var a = clamp(W / ch, 0.42, 2.4);
    K.cal.s = [CAL_H * a, CAL_H, 1.6];
    K.cal.pos = [K.cal.pos[0], CAL_Y, K.cal.pos[2]];
    K.cal.emit = 0.62;
    K.cal.emitDark = 0;
    K.cal.hatch = 0.25;
    var cv = PT.calendar({ w: W, h: ch, cw: 1024, ch: 1024, title: ci.title, sub: ci.sub, days: ci.days || [], times: ci.times, places: ci.places, imgs: imgs });
    if (K.calTex) K.calTex.update(cv);
    else K.calTex = Rnd.texture(cv, true);
    K.cal.map = K.calTex;
  }

  // long titles are squeezed to fit, like the painted calendar does
  function fit(el) {
    if (!el) return;
    el.style.transform = '';
    var avail = el.parentNode.clientWidth, need = el.scrollWidth;
    if (need > avail + 1) {
      el.style.transformOrigin = '0 50%';
      el.style.transform = 'scaleX(' + (avail / need).toFixed(3) + ')';
    }
  }
  // the red marker strokes, redrawn to each square's shape so the pen stays round
  function marks() {
    film.querySelectorAll('.cal__mark').forEach(function (svg) {
      var r = svg.getBoundingClientRect();
      var w = Math.max(10, r.width), h = Math.max(10, r.height);
      svg.setAttribute('viewBox', '0 0 ' + w.toFixed(1) + ' ' + h.toFixed(1));
      var ps = svg.querySelectorAll('path');
      var f = function (x, y) { return (x * w).toFixed(1) + ' ' + (y * h).toFixed(1); };
      if (svg.classList.contains('cal__mark--x')) {
        ps[0].setAttribute('d', 'M' + f(0.14, 0.16) + ' C ' + f(0.38, 0.4) + ', ' + f(0.6, 0.6) + ', ' + f(0.86, 0.84));
        ps[1].setAttribute('d', 'M' + f(0.84, 0.14) + ' C ' + f(0.6, 0.4) + ', ' + f(0.4, 0.62) + ', ' + f(0.16, 0.86));
      } else {
        ps[0].setAttribute('d', 'M' + f(0.52, 0.05) + ' C ' + f(0.82, 0.04) + ', ' + f(0.97, 0.26) + ', ' + f(0.95, 0.52) + ' C ' + f(0.93, 0.8) + ', ' + f(0.7, 0.96) + ', ' + f(0.46, 0.95) + ' C ' + f(0.19, 0.93) + ', ' + f(0.04, 0.72) + ', ' + f(0.06, 0.47) + ' C ' + f(0.08, 0.22) + ', ' + f(0.28, 0.05) + ', ' + f(0.61, 0.09));
      }
    });
  }

  /* ------------------------------------------------------------------ scroll, size, mode */
  var on = false, inView = false, nearby = false, buildQueued = false;
  var vw = 0, vh = 0, top = 0;
  var target = 0, cur = 0, raf = 0, lastNow = 0;
  function want() { return able && motion(); }
  function layout(force) {
    if (!on) return;
    var nw = window.innerWidth, nh = window.innerHeight;
    // phones resize the viewport as the address bar comes and goes: ignore small height changes
    if (!force && nw === vw && Math.abs(nh - vh) < 140) return;
    vw = nw;
    vh = nh;
    film.style.height = Math.round((TOTAL + 1) * vh) + 'px';
    stage.style.height = vh + 'px';
    W = stage.clientWidth || vw;
    H = vh;
    aspect = W / H;
    var hd = document.querySelector('.site-header');
    HH = hd ? Math.round(hd.getBoundingClientRect().height) : 0;
    film.style.setProperty('--film-top', HH + 'px');
    KH = hallKeys();
    dreamKeys();
    marks();
    if (calEl) { fit(calEl.querySelector('.cal__title')); fit(calEl.querySelector('.cal__sub')); }
    top = film.getBoundingClientRect().top + (window.scrollY || window.pageYOffset);
    if (Rnd) {
      dpr = (ES.dprCap ? ES.dprCap(W * H > 1100000 ? 1.25 : 1.75) : Math.min(window.devicePixelRatio || 1, W * H > 1100000 ? 1.25 : 1.75));
      Rnd.resize(W, H, dpr);
      if (fxc) { fxc.width = Math.round(W * Math.min(dpr, 1.5)); fxc.height = Math.round(H * Math.min(dpr, 1.5)); }
      sizeAura();
      snap = null;
      tris = null;
      dreamKey = '';
      botKey = '';
      measureCal();
      drawTonight();
      paintCalendar();
    }
    measureItems();
    scroll();
    cur = target;
    kick();
  }
  function scroll() {
    if (!on) return;
    var y = window.scrollY || window.pageYOffset;
    target = clamp((y - top) / Math.max(1, vh), 0, TOTAL);
    // the rooms are built once you've started down the page (not while the game is loading),
    // in a quiet moment if the browser offers one
    if (!built && !buildQueued && (nearby || Math.abs(y - top) < vh * 2) && (y > vh * 0.3 || y > top - vh * 1.5)) {
      buildQueued = true;
      var go = function () {
        if (build()) layout(true);
        else setMode();
      };
      if (window.requestIdleCallback && Math.abs(y - top) > vh * 0.8) requestIdleCallback(go, { timeout: 900 });
      else go();
      return;
    }
    if (!built) return;
    kick();
  }
  function needsTime(T) {
    // (and all the while the lamp's motes are out, so they drift smoothly even when you stop scrolling)
    return (T > G('hall_in', 0.5) && T < G('hall_walk', 0.65)) || (T > G('bed_wake', 0) && T < G('bed_wake', 0.42)) || (T > G('bed_search', 0.6) && T < CLICK) || T > SG(4, 0.2);
  }
  function kick() { if (!raf && on) raf = requestAnimationFrame(tick); }
  function tick(now) {
    raf = 0;
    if (!on || !Rnd) return;
    var dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0.016;
    lastNow = now;
    var d = target - cur;
    if (Math.abs(d) > 2.5) cur = target - (d > 0 ? 0.6 : -0.6);
    cur += (target - cur) * (1 - Math.exp(-dt * 8));
    if (Math.abs(target - cur) < 0.0005) cur = target;
    if (inView) frame(cur, now / 1000);
    var timed = inView && needsTime(cur);
    if (cur !== target || timed) kick();
    else lastNow = 0;
  }

  function setMode() {
    var w = want();
    if (w === on) return;
    on = w;
    film.classList.toggle('is-film', on);
    root.classList.toggle('has-film', on);
    if (on) {
      vw = 0;
      layout(true);
    } else {
      film.style.height = '';
      stage.style.height = '';
      items.forEach(function (it) { it.el.style.opacity = ''; it.el.style.transform = ''; it.el.style.visibility = ''; it.o = -1; it.v = undefined; it.tf = ''; });
      stage.classList.remove('is-ending');
      stage.style.removeProperty('--scrim');
      if (calEl) {
        calEl.style.opacity = '';
        calEl.style.transform = '';
        calEl.style.visibility = '';
        ['.cal__title', '.cal__sub'].forEach(function (q) { var e = calEl.querySelector(q); if (e) e.style.transform = ''; });
      }
      [glc, fxc, auc, zoomEl, frameEl].forEach(function (el) { if (el) el.style.visibility = ''; });
      shown = {};
      last = {};
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        inView = e.isIntersecting;
        if (inView) kick();
      });
    }).observe(film);
    new IntersectionObserver(
      function (en) {
        en.forEach(function (e) {
          nearby = e.isIntersecting;
          if (nearby) scroll();
        });
      },
      { rootMargin: '150% 0px 150% 0px' },
    ).observe(film);
  } else {
    inView = nearby = true;
  }
  window.addEventListener('scroll', scroll, { passive: true });
  var rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { layout(false); }, 160);
  });
  window.addEventListener('orientationchange', function () { setTimeout(function () { layout(true); }, 300); });
  window.addEventListener('es:calm', setMode);
  window.addEventListener('load', function () { if (on) layout(true); });
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(function () {
      if (!on) return;
      measureItems();
      if (Rnd) paintCalendar();
      kick();
    });
  // the skip link lands below the film, wherever you are in it
  var skip = film.querySelector('[data-film-skip]');
  if (skip)
    skip.addEventListener('click', function () {
      cur = target = TOTAL;
    });

  setMode();
  ES.film = { G: G, TOTAL: TOTAL, beats: TL, at: function () { return cur; }, project: function (p) { return Rnd ? Rnd.project(p) : null; }, debug: function () { return { R: R, K: K }; } };
})();
