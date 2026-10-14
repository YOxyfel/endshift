/* ENDSHIFT: comic panels drawn from the rooms of the game.
   Panels (<canvas data-shot>) are shots of the same rooms as the game (game-scenes.js), drawn
   by one shared off-screen renderer and copied into each panel's canvas when they come near.
   Chapters with data-pin pin while you scroll through them (--p goes 0 → 1). The home page's
   evening is one continuous shot instead: film.js (it uses ES.storyShoot for the calendar).

   Without WebGL the panels keep their drawn-in-CSS fallbacks; without motion nothing pins
   and everything is simply there. */
(function () {
  'use strict';

  var ES = (window.ES = window.ES || {});
  var root = document.documentElement;
  var story = document.querySelector('[data-story]');
  if (!story && !document.querySelector('[data-shot]')) return;
  var CFG = {};
  try { CFG = JSON.parse((document.getElementById('es-config') || {}).textContent || '{}'); } catch (e) {}
  var S = CFG.story || {};
  var motion = function () { return root.classList.contains('motion-ok') && root.getAttribute('data-calm') !== 'on'; };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var DEG = Math.PI / 180;

  /* ------------------------------------------------------------------ shots */
  var Ink = ES.Ink, SC = ES.inkScenes;
  var can = !!(Ink && SC && ES.inkStory && Ink.supported());
  if (can) root.classList.add('has-shots');

  // what the scenes need from the game's world: words on props, the time on clocks
  var api = {
    objects: {},
    data: { props: S.props || {}, time: '23:48' },
    hud: { switchLabel: '' },
    strings: CFG.strings || {},
    clock: function () { return api.data.time; },
  };
  var Rnd = null, glc = null, built = {};
  function renderer() {
    if (Rnd) return Rnd;
    glc = document.createElement('canvas');
    Rnd = Ink.renderer(glc);
    if (!Rnd) can = false;
    return Rnd;
  }
  function scene(id) {
    if (built[id]) return built[id];
    var D = ES.inkStory[id];
    if (!D) return null;
    var B = new SC.Room(D.room, renderer());
    SC.shell(B, D.room);
    D.build(B, D.room, api);
    if (id === 'bedroom') B.sw = SC.makeSwitch(B, SC.SCENES.bed.sw, api);
    built[id] = { B: B, D: D };
    return built[id];
  }
  function lookAt(at, to) {
    var dx = to[0] - at[0], dy = to[1] - at[1], dz = to[2] - at[2];
    return { yaw: Math.atan2(dx, -dz) / DEG, pitch: Math.atan2(dy, Math.hypot(dx, dz)) / DEG };
  }

  // The panels: which room, from where, with which lights
  var GAME_BED = { x: 10, z: 148, eye: 92, yaw: 62, pitch: 6 };
  var V = {
    hall: { scene: 'hall', light: { dark: 0 } },
    bus: { scene: 'bus', light: { dark: 0 } },
    sofa: { scene: 'sofa', light: { dark: 0 } },
    home: { scene: 'home', light: { dark: 0 } },
    tickets: { scene: 'kitchen', at: [-30, 138, -80], to: [-10, 130, -195], light: { dark: 0 } },
    desk: { scene: 'bedroom', at: [70, 140, -10], to: [160, 82, -84], light: { dark: 1, warm: 0.35 }, closed: true },
    bed: { scene: 'bedroom', cam: GAME_BED, light: { dark: 1, warm: 0 } },
    lineWork: { scene: 'bedroom', at: [110, 150, -110], to: [-60, 80, 160], light: { dark: 0 }, hfov: 80 },
    lineEve: { scene: 'bedroom', at: [110, 150, -110], to: [-60, 80, 160], light: { dark: 1, warm: 1 }, hfov: 80, off: true, closed: true },
    r1: { scene: 'bedroom', at: [104, 126, -70], to: [150, 74, -118], light: { dark: 1, warm: 1 }, hfov: 56, closed: true },
    r2: { scene: 'bedroom', at: [60, 140, 60], to: [-150, 96, -24], light: { dark: 1, warm: 1 }, hfov: 66, closed: true },
    r3: { scene: 'bedroom', at: [-86, 90, 104], to: [-124, 58, 158], light: { dark: 1, warm: 1 }, hfov: 50 },
    r4: { scene: 'bedroom', at: [-56, 112, 100], to: [-120, 84, 172], light: { dark: 1, warm: 1 }, hfov: 56 },
    r5: { scene: 'bedroom', at: [-100, 120, 118], to: [-112, 53, 157], light: { dark: 1, warm: 1 }, hfov: 48 },
    // 6. something quiet (the book), 7. breathe (the window, the last thing before lights out)
    r6: { scene: 'bedroom', at: [60, 128, 110], to: [180, 150, 70], light: { dark: 1, warm: 1 }, hfov: 66 },
    r7: { scene: 'bedroom', at: [24, 112, 60], to: [-38, 62, 112], light: { dark: 1, warm: 1 }, hfov: 56, closed: true },
    jar: { scene: 'bedroom', at: [-62, 80, 112], to: [-98, 62, 158], light: { dark: 1, warm: 1 }, hfov: 40, jar: true },
    ad: { scene: 'sofa', at: [-30, 74, 34], to: [-20, 44, 2], light: { dark: 0 }, hfov: 42, ad: true },
    jarWide: { scene: 'bedroom', at: [-28, 104, 70], to: [-104, 66, 168], light: { dark: 1, warm: 1 }, hfov: 64, jar: true },
    racks: { scene: 'depot', at: [-300, 190, 250], to: [290, 110, -150], light: { dark: 0 }, hfov: 84 },
    build: { scene: 'bedroom', at: [60, 150, 10], to: [168, 84, -90], light: { dark: 1, warm: 1 }, hfov: 70 },
    end: { scene: 'bedroom', at: [60, 140, -60], to: [-90, 90, 170], light: { dark: 1, warm: 1 }, hfov: 84, off: true, closed: true },
  };

  // light a built room for a view (glows, lamps, the switch)
  function prep(B, v) {
    var L = v.light || {};
    var dark = L.dark || 0, warm = L.warm || 0;
    B.objs.forEach(function (o) {
      if (o.kind && o.base != null) {
        var f = o.kind === 'work' ? 1 - dark : o.kind === 'warm' ? warm : 1;
        o.glow = o.base * f;
        o.hidden = o.glow < 0.003;
      }
      if (o.warmEmit != null) o.emit = o.warmEmit * warm + (o.baseEmit || 0);
      // the jar only where the panel is about it; the laptop shut in the evening
      if (o.name === 'jar') o.hidden = !v.jar;
      else if (o.name === 'lid') o.hidden = !!v.closed;
      else if (o.name === 'lidClosed') o.hidden = !v.closed;
      else if (o.name === 'laptopGlow') o.hidden = !!v.closed;
    });
    var sw = B.sw;
    if (sw) {
      var axis = Ink.M.apply3(sw.rocker.R, [1, 0, 0]);
      var x = v.off ? { c: sw.pos, R: Ink.M.axis(axis, 24 * DEG) } : null;
      sw.rocker.x = x;
      sw.led.x = x;
      sw.led.emit = v.off ? 0 : 1;
      sw.glow.base = v.off ? 0 : 0.6;
      sw.arrow.alpha = 0;
    }
    return { dark: dark, warm: warm };
  }

  // the phone on the coffee table, showing the ad that started it all
  var adBuilt = false;
  function addAd(B) {
    if (adBuilt) return;
    adBuilt = true;
    var t = B.T('adscreen', function () { return ES.inkPaint.phoneScreen(200, 400, { ad: S.ad || ['MAKE YOUR', 'OWN PRODUCT', 'Get a quote', '*Minimum order 500 units'], sponsored: S.sponsored }); });
    B.add(Ink.obj({ geo: 'box', pos: [-20, 44.6, 2], R: Ink.M.mul3(Ink.M.rotY(-14 * DEG), Ink.M.rotX(-90 * DEG)), s: [9, 18, 1], color: '#101a2c', map: t, mapFace: 4, emit: 0.95, emitDark: 0, border: 0.2 }));
    B.lights.push({ p: [-20, 70, 2], c: '#c9dcff', i: 0.5, r: 120, k: 'always' });
  }

  // draw one view at w×h css px into a 2D canvas
  function shoot(name, out) {
    var v = V[name];
    if (!v || !can) return false;
    var sc = scene(v.scene);
    if (!sc || !Rnd) return false;
    var B = sc.B, D = sc.D;
    if (v.ad) addAd(B);
    var rc = out.getBoundingClientRect();
    var w = Math.max(2, rc.width), h = Math.max(2, rc.height);
    var dpr = (ES.dprCap ? ES.dprCap(w * h > 900000 ? 1.25 : 1.6) : Math.min(window.devicePixelRatio || 1, w * h > 900000 ? 1.25 : 1.6));
    Rnd.resize(w, h, dpr);
    var cam;
    if (v.cam) cam = { pos: [v.cam.x, v.cam.eye, v.cam.z], yaw: v.cam.yaw, pitch: v.cam.pitch };
    else if (v.at) { var la = lookAt(v.at, v.to); cam = { pos: v.at, yaw: la.yaw, pitch: la.pitch }; }
    else cam = { pos: [D.cam.x, D.cam.eye, D.cam.z], yaw: D.cam.yaw, pitch: D.cam.pitch };
    var hf = (v.hfov || 72) * DEG;
    var vf = 2 * Math.atan(Math.tan(hf / 2) / (w / h));
    cam.fovy = clamp(vf, 34 * DEG, 84 * DEG);
    cam.roll = 0;
    var L = prep(B, v);
    var bg = Ink.hex(D.look.bg);
    var lights = B.lights.filter(function (l) { return !(v.closed && l.name === 'laptop'); });
    Rnd.render(B.objs, { cam: cam, amb: D.look.amb, ink: D.look.ink, dark: L.dark, warm: L.warm, bg: [bg[0], bg[1], bg[2], 1], hatch: 1, grain: 0.04, cull: true, lights: lights });
    if (out.width !== glc.width || out.height !== glc.height) {
      out.width = glc.width;
      out.height = glc.height;
    }
    try { out.getContext('2d').drawImage(glc, 0, 0); } catch (e) { return false; }
    out.classList.add('is-shot');
    out.closest('[data-panel]') && out.closest('[data-panel]').classList.add('is-drawn');
    return true;
  }
  ES.storyShoot = shoot;

  // shots are taken when their panel comes near, one per frame, and again after a resize
  var queue = [], busy = false;
  function enqueue(c) {
    if (c.__queued) return;
    c.__queued = true;
    queue.push(c);
    pump();
  }
  function pump() {
    if (busy || !queue.length) return;
    busy = true;
    requestAnimationFrame(function () {
      var c = queue.shift();
      c.__queued = false;
      if (c.isConnected && c.getBoundingClientRect().width) {
        shoot(c.getAttribute('data-shot'), c);
        c.__w = c.getBoundingClientRect().width;
        c.__h = c.getBoundingClientRect().height;
      }
      busy = false;
      pump();
    });
  }
  var shotsList = [];
  if (can) {
    shotsList = Array.prototype.slice.call(document.querySelectorAll('canvas[data-shot]'));
    // Saving data, or a small device: the drawn posters stay, nothing is drawn live (the RESET
    // turntable and the home film decide for themselves)
    if (ES.lowPower)
      shotsList = shotsList.filter(function (c) {
        var fb = c.previousElementSibling;
        return !(fb && fb.classList.contains('has-poster'));
      });
    var io = 'IntersectionObserver' in window
      ? new IntersectionObserver(function (en) {
          en.forEach(function (e) {
            e.target.__near = e.isIntersecting;
            if (e.isIntersecting && (!e.target.__w || e.target.__dirty)) {
              e.target.__dirty = false;
              enqueue(e.target);
            }
          });
        }, { rootMargin: '120% 0px 120% 0px' })
      : null;
    shotsList.forEach(function (c) { if (io) io.observe(c); else enqueue(c); });
    ES.storyObserve = function (c) { if (io) io.observe(c); else enqueue(c); };
    var rt = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        shotsList.forEach(function (c) {
          var r = c.getBoundingClientRect();
          if (Math.abs(r.width - (c.__w || 0)) < 2 && Math.abs(r.height - (c.__h || 0)) < 2) return;
          if (c.__near) enqueue(c);
          else c.__dirty = true;
        });
      }, 220);
    });
    // words on props look right once the fonts are in
    if (document.fonts && document.fonts.ready)
      document.fonts.ready.then(function () {
        Object.keys(built).forEach(function (k) {
          var B = built[k].B;
          Object.keys(B.tex).forEach(function (t) { var x = B.tex[t]; if (x.make && !/^(glow|floor|ceil|wall-|duvet|curtain|radiator|steel|grate|leaf|street|seatfab|slats|hazard)/.test(t)) x.update(x.make()); });
        });
        shotsList.forEach(function (c) { if (c.__w) { if (c.__near) enqueue(c); else c.__dirty = true; } });
      });
  }

  /* ------------------------------------------------------------------ pinned chapters */
  var pins = Array.prototype.slice.call(document.querySelectorAll('[data-pin]'));
  var hooks = [];
  function measure() {
    var vh = window.innerHeight;
    var on = motion();
    pins.forEach(function (el) {
      el.classList.toggle('is-pinned', on);
      if (!on) {
        el.style.setProperty('--p', '1');
        return;
      }
      var r = el.getBoundingClientRect();
      var span = Math.max(1, r.height - vh);
      var p = clamp(-r.top / span, 0, 1);
      if (el.__p === undefined || Math.abs(el.__p - p) > 0.0005) {
        el.__p = p;
        el.style.setProperty('--p', p.toFixed(4));
        hooks.forEach(function (h) { if (h.el === el) h.fn(p); });
      }
    });
  }
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; measure(); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('es:calm', function () { pins.forEach(function (el) { el.__p = undefined; }); measure(); });

  measure();
  if (document.readyState !== 'complete') window.addEventListener('load', measure);
})();
