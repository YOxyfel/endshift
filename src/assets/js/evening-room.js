/* ENDSHIFT: the evening room, for the ritual.
   The same bedroom as the home page's film (the bedside table and its tray, the carafe and the
   glass, the RESET bottle, the pleated curtains, the lamp's warm motes, the drawer, the book), but
   driven by what you've done instead of by scrolling: every step's pose is a number from 0 to 1
   that the ritual sets. Plus a few things only the ritual has: a mug for tea, a record player,
   rain on the window some nights, the moon in its real phase, and the warm place for the breathing.

   film.js dresses the same room for the film; if something about the room changes there (where
   the table stands, what's on the tray), change it here too.

   ES.EveningRoom.Room(canvas, opts)  the room. opts: { props, strings, night: { seed, rain, moon, palette } }
   ES.EveningRoom.Dream(canvas)       the breathing visuals (a sea at sundown behind closed eyes; each breath out sets the sun a little lower)
   ES.EveningRoom.cams                where the camera stands for each step */
(function () {
  'use strict';

  var ES = (window.ES = window.ES || {});
  var Ink = ES.Ink, SC = ES.inkScenes, PT = ES.inkPaint;
  if (!Ink || !SC || !PT || !ES.inkStory || !ES.inkStory.bedroom) return;
  var M = Ink.M, DEG = Math.PI / 180;

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ease = {
    lin: function (t) { return t; },
    inOut: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    sine: function (t) { return 0.5 - 0.5 * Math.cos(Math.PI * t); },
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    in2: function (t) { return t * t; },
  };
  // a part of a 0–1 progress: 0 before a, 1 after b, eased between
  function part(k, a, b, e) { return (e || ease.inOut)(clamp((k - a) / Math.max(1e-6, b - a), 0, 1)); }
  function near(p, q, d) { return Math.abs(p[0] - q[0]) < d && Math.abs(p[1] - q[1]) < d && Math.abs(p[2] - q[2]) < d; }
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function addv(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function subv(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function scl(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function lerpv(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function alongY(d) {
    d = norm(d);
    var ax = cross([0, 1, 0], d), s = Math.hypot(ax[0], ax[1], ax[2]);
    if (s < 1e-5) return d[1] > 0 ? M.I3 : M.rotX(Math.PI);
    return M.axis(scl(ax, 1 / s), Math.acos(clamp(d[1], -1, 1)));
  }
  function seeded(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function hexRGB(h) { var c = Ink.hex(h); return [c[0], c[1], c[2]]; }

  // where things stand on the bedside table (top at 52.5; the tray's top at 53.7)
  var TOP = 52.5, TRAY = 53.7, PLEAT = 13;
  var BOTTLE = [-90, TRAY, 162], GLASS = [-104, TRAY, 153.5], CARAFE = [-110, TRAY, 165], PHONE = [-134, TOP + 0.5, 156];
  var DESK = 74; // the desk's top
  var LAMP = [-136, 83.5, 174]; // the bedside lamp's shade (moved to the back left corner)

  /* ------------------------------------------------------------------ cameras
     at: where you stand, to: what you look at; hf: horizontal field of view (vf: vertical). */
  var cams = {
    home: { at: [58, 140, -56], to: [-90, 90, 170], hf: 84 },
    desk: { at: [90, 134, -48], to: [152, 80, -104], hf: 64 },
    window: { at: [40, 140, 60], to: [180, 120, 78], hf: 72 },
    tray: { at: [-122, 94, 116], to: [-99, 60, 160], hf: 58 },
    bed: { at: [56, 144, -52], to: [-20, 120, 170], hf: 80 },
    // lower the lights: from the far corner, the big light in the ceiling and the bed under it
    lights: { at: [140, 128, -150], to: [-40, 172, 60], hf: 82 },
    drawer: { at: [-58, 94, 72], to: [-116, 47, 140], hf: 62 },
    dream: { at: [-12, 76, 158], to: [-90, 63, 162], vf: 40, dream: true },
    book: { at: [-13, 113, 79], to: [-38, 64, 112], hf: 54 },
    music: { at: [70, 128, -6], to: [150, 80, -42], hf: 60 },
    sit: { at: [10, 112, 40], to: [-10, 132, 170], hf: 74 },
    // breathing: sitting on the edge of the bed, the lamp on the bedside table in front of you
    sitbed: { at: [-56, 112, 104], to: [-112, 78, 160], hf: 70 },
    // the last step: lying down (propped up with a book, or flat looking up at the lights, or
    // across the room to the record player)
    lieread: { at: [-34, 96, 134], to: [-38, 62, 108], hf: 62 },
    lieup: { at: [-22, 76, 150], to: [-6, 150, 86], hf: 78 },
    liemusic: { at: [-24, 80, 152], to: [70, 106, 10], hf: 74 },
    pillow: { at: [-40, 77, 156], to: [-90, 62.5, 162], hf: 60, roll: 12 },
  };
  function lookAt(at, to) {
    var dx = to[0] - at[0], dy = to[1] - at[1], dz = to[2] - at[2];
    return { yaw: Math.atan2(dx, -dz) / DEG, pitch: Math.atan2(dy, Math.hypot(dx, dz)) / DEG };
  }
  // a camera ({ pos, yaw, pitch, roll, fovy }) from a preset, for a screen of this aspect
  function camOf(key, aspect) {
    return camAt(cams[key] || cams.home, aspect);
  }
  // a camera from any { at, to, hf | vf }
  function camAt(c, aspect) {
    var la = lookAt(c.at, c.to);
    var fov;
    if (c.vf) fov = c.vf * (c.dream && aspect < 1 ? lerp(1.42, 1, clamp((aspect - 0.46) / 0.54, 0, 1)) : 1) * DEG;
    else fov = clamp(2 * Math.atan(Math.tan((c.hf * DEG) / 2) / aspect), 34 * DEG, 84 * DEG);
    // the words sit at the bottom of the screen, so what you look at sits a little above the
    // middle: more on a phone held upright, where the card takes the lower part
    var up = c.dream ? 0.1 : lerp(0.08, 0.3, clamp((1 - aspect) / 0.5, 0, 1));
    var pitch = la.pitch - Math.atan(up * Math.tan(fov / 2)) / DEG;
    return { pos: c.at.slice(), yaw: la.yaw, pitch: pitch, roll: c.roll || 0, fovy: fov };
  }
  function blendCam(a, b, t) {
    var y0 = a.yaw, y1 = b.yaw;
    while (y1 - y0 > 180) y1 -= 360;
    while (y1 - y0 < -180) y1 += 360;
    return { pos: lerpv(a.pos, b.pos, t), yaw: lerp(y0, y1, t), pitch: lerp(a.pitch, b.pitch, t), roll: lerp(a.roll, b.roll, t), fovy: lerp(a.fovy, b.fovy, t) };
  }
  function camBasis(cam) {
    var y = cam.yaw * DEG, p = cam.pitch * DEG;
    var f = [Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p)];
    var r = [Math.cos(y), 0, Math.sin(y)];
    return { f: f, r: r, u: cross(r, f) };
  }

  /* ------------------------------------------------------------------ tonight
     A little different each evening: the moon in its real phase, rain some nights, where the
     lamp's motes drift, which windows across the street are still lit. */
  var PALETTES = {
    warm: ['#ffb347', '#ff5f8f', '#5fe0d0', '#ffd36e', '#ff7a59', '#ffc08a', '#f78fff', '#ff9a3c', '#ffe08a', '#ff6f61', '#ffa64d', '#b48cff', '#ffcc66', '#ff8fb1'],
    dusk: ['#ff9e7a', '#e46aa8', '#6fc8e8', '#ffcf8a', '#c27ae0', '#ff8fa6', '#8fa8ff', '#ffb07a', '#f2a6d8', '#ff7f6a', '#a68cff', '#ffd2a1', '#7fd1d8', '#ff9fc2'],
    aurora: ['#ffb347', '#ff6f9f', '#5fe0b8', '#9fe870', '#6fd0ff', '#ffd36e', '#c58cff', '#7ff0d0', '#ffe08a', '#ff8a7a', '#8fb8ff', '#b8f08a', '#ffcc66', '#e08cff'],
  };
  function tonight(date) {
    var d = date || new Date();
    var day = Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
    var r = seeded(day * 2654435761);
    // days since a known new moon (6 Jan 2000, 18:14 UTC), in a 29.53-day cycle
    var phase = (((d.getTime() / 86400000 - 10962.76) % 29.530588) + 29.530588) % 29.530588 / 29.530588;
    var keys = Object.keys(PALETTES);
    return { seed: day, rain: r() < 0.24, moon: phase, palette: keys[day % keys.length] };
  }

  // the street at night through the window, with the moon in tonight's phase and some windows lit
  function paintCity(w, h, o) {
    var c = PT.cv(w, h), x = c.getContext('2d'), R = seeded(21);
    var g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, o.rain ? '#141a2c' : '#0a1430');
    g.addColorStop(0.6, o.rain ? '#232b44' : '#1d2b52');
    g.addColorStop(1, '#3b3860');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    if (!o.rain) {
      for (var s = 0; s < 40; s++) {
        x.fillStyle = 'rgba(230,236,255,' + (0.3 + R() * 0.6) + ')';
        x.fillRect(R() * w, R() * h * 0.45, 1.6, 1.6);
      }
      // the moon: lit part = tonight's phase (0 new, 0.5 full)
      var mx = w * 0.78, my = h * 0.18, mr = w * 0.05, ph = o.moon == null ? 0.25 : o.moon;
      var lit = 1 - Math.abs(ph - 0.5) * 2; // 0 new … 1 full
      if (lit > 0.04) {
        var sky = o.rain ? '#232b44' : '#1d2b52';
        x.save();
        x.beginPath();
        x.arc(mx, my, mr, 0, Math.PI * 2);
        x.clip();
        x.fillStyle = '#f2ecd0';
        x.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
        // the dark half (waxing: lit on the right), then the terminator: an ellipse that is
        // dark for a crescent and light for a gibbous moon
        x.fillStyle = sky;
        if (ph < 0.5) x.fillRect(mx - mr, my - mr, mr, mr * 2);
        else x.fillRect(mx, my - mr, mr, mr * 2);
        var k = Math.cos(lit * Math.PI);
        x.beginPath();
        x.ellipse(mx, my, Math.max(0.01, Math.abs(k) * mr), mr, 0, 0, Math.PI * 2);
        x.fillStyle = k > 0 ? sky : '#f2ecd0';
        x.fill();
        x.restore();
      }
    }
    var lit2 = o.lit == null ? 1 : o.lit;
    var RW = seeded(o.seed || 5);
    [[0.62, '#1a2036', 0.4], [0.45, '#11152a', 0.7], [0.25, '#0a0d1a', 1]].forEach(function (row, ri) {
      var X = -10;
      while (X < w) {
        var bw = w * (0.08 + R() * 0.12);
        var bh = h * (row[0] * (0.35 + R() * 0.4) + ri * 0.12);
        var top = h - bh;
        x.fillStyle = row[1];
        x.fillRect(X, top, bw, bh);
        x.lineWidth = 2;
        x.strokeStyle = '#0b0d14';
        x.strokeRect(X, top, bw, bh);
        var cw = Math.max(5, bw / 6), ch = cw * 1.25;
        for (var yy = top + ch; yy < h - ch; yy += ch * 1.7)
          for (var xx = X + cw * 0.6; xx < X + bw - cw; xx += cw * 1.6) {
            var on = R() < 0.42 * row[2];
            var stay = RW() < lit2; // as the evening goes on, the street goes to bed too
            if (on && stay) {
              x.fillStyle = R() < 0.3 ? '#9cc0ff' : '#ffd890';
              x.fillRect(xx, yy, cw, ch);
            } else {
              R();
              x.fillStyle = 'rgba(255,255,255,0.04)';
              x.fillRect(xx, yy, cw, ch);
            }
          }
        X += bw + w * 0.01;
      }
    });
    return c;
  }

  // the record: grooves and a red label, so you can see it turn
  function paintRecord() {
    var c = PT.cv(256, 256), x = c.getContext('2d');
    x.fillStyle = '#121214';
    x.beginPath(); x.arc(128, 128, 126, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.08)';
    for (var r = 50; r < 124; r += 4) { x.lineWidth = 1; x.beginPath(); x.arc(128, 128, r, 0, Math.PI * 2); x.stroke(); }
    x.fillStyle = 'rgba(255,255,255,0.18)';
    x.beginPath(); x.moveTo(128, 128); x.arc(128, 128, 122, -0.5, -0.32); x.fill();
    x.fillStyle = '#c8442e';
    x.beginPath(); x.arc(128, 128, 40, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#f2e3c8';
    x.fillRect(110, 112, 36, 6);
    x.fillStyle = '#121214';
    x.beginPath(); x.arc(128, 128, 4, 0, Math.PI * 2); x.fill();
    return c;
  }

  /* ------------------------------------------------------------------ the room */
  function Room(canvas, opt) {
    opt = opt || {};
    this.ok = false;
    if (!Ink.supported()) return;
    var Rnd = null;
    try { Rnd = Ink.renderer(canvas); } catch (e) { Rnd = null; }
    if (!Rnd) return;
    this.Rnd = Rnd;
    this.props = opt.props || {};
    this.night = opt.night || tonight();
    var self = this;
    this.api = {
      objects: {},
      data: { props: this.props, time: '21:00' },
      hud: { switchLabel: '' },
      strings: opt.strings || {},
      clock: function () { return self.api.data.time; },
    };
    var D = ES.inkStory.bedroom;
    var B = new SC.Room(D.room, Rnd);
    SC.shell(B, D.room);
    D.build(B, D.room, this.api);
    this.B = B;
    this.D = D;
    this.K = {};
    this.notes = null;
    this.dress();
    this.ok = true;
  }
  var P = Room.prototype;

  P.dress = function () {
    var B = this.B, K = this.K, props = this.props, night = this.night, self = this;
    var add = function (o) { return B.add(o); };
    var gone = function (o) { o.hidden = true; o.gone = true; };
    B.objs.forEach(function (o) {
      if (o.name === 'jar' || o.name === 'book' || o.name === 'phonedown' || o.name === 'lidClosed') gone(o);
      if (o.geo === 'cyl' && near(o.pos, [-127, 57, 156], 3)) gone(o);
      if (o.geo === 'box' && near(o.pos, [-38, 62.6, 112], 1)) gone(o);
      if (o.name === 'lid') K.lid = o;
      if (o.name === 'laptopGlow') K.laptopGlow = o;
      if (o.map && B.tex.notepad && o.map === B.tex.notepad) K.notepad = o;
      if (o.map && B.tex.curtain && o.map === B.tex.curtain) gone(o);
      if (o.geo === 'cyl' && near(o.pos, [170.6, 234, 78], 2)) gone(o);
      if (o.map && B.tex.city && o.map === B.tex.city) K.city = o;
      if (o.geo === 'cyl' && o.c && Math.abs(o.c[0] - 0x2f / 255) < 0.01 && Math.abs(o.c[2] - 0xa8 / 255) < 0.01 && o.pos[1] > 74 && o.pos[1] < 76) gone(o);
      if (o.map && B.tex['drawers-bt'] && o.map === B.tex['drawers-bt']) gone(o);
      if (o.geo === 'cyl' && near(o.pos, [-128, 56.5, 182], 3)) gone(o);
      if (o.geo === 'cyl' && near(o.pos, [136, 75, -124], 2)) gone(o); // the pen lying by the notepad (ours writes)
      if (o.geo === 'box' && near(o.pos, [-104, 52.7, 179], 4) && o.s[0] < 10) gone(o);
      if (o.geo === 'box' && near(o.pos, [174.5, 159.5, 78], 1.2)) o.pos = [174.5, 159.5, 78];
      if (o.geo === 'box' && near(o.pos, [175, 159.5, 78], 1)) o.pos = [174.5, 159.5, 78];
      // the two books on the desk (they make way for the record player)
      if (o.geo === 'box' && o.pos[1] > 74 && o.pos[1] < 80 && near(o.pos, [158, 77, -50], 9) && o.s[0] > 14) { K.deskBooks = K.deskBooks || []; K.deskBooks.push(o); }
    });
    B.lights.forEach(function (l) {
      l.i0 = l.i == null ? 1 : l.i;
      if (l.name === 'laptop') K.laptopLight = l;
      if (l.c === '#7088cc') l.street = true;
      if (l.k === 'warm') l.grp = grpOf(l.p);
      if (near(l.p, [0, 175, 178], 1)) l.i0 = 0.12;
    });
    var fairy = [];
    B.objs.forEach(function (o) {
      if (o.kind === 'warm' || o.warmEmit != null) {
        o.grp = grpOf(o.pos);
        if (o.grp === 'fairy') fairy.push(o);
      }
    });
    fairy.forEach(function (o) {
      o.fi = clamp(Math.round((80 - o.pos[0]) / 18), 0, 8);
      if (o.bill) gone(o);
    });
    // the big light in the middle of the ceiling: warm white, on until "lower the lights"
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

    // the bedside table, the lamp moved to the back, the clock, the tray
    B.shadow(-116, 168, 84, 62, 0.45);
    add({ geo: 'box', pos: [-116, 25, 168], s: [64, 50, 44], color: '#4a3b31', border: 0.25 });
    add({ geo: 'box', pos: [-116, 51.25, 168.5], s: [67, 2.5, 45], color: '#5c4839', border: 0.25 });
    add({ geo: 'box', pos: [-116, 13, 145.4], s: [58, 18, 1.6], color: '#54443a', border: 0.22 });
    add({ geo: 'box', pos: [-116, 15, 144.3], s: [12, 1.6, 1.4], color: '#c9b48a', border: 0.12 });
    var LD = [-16, 0.5, 4], moved = [];
    var mv = function (o) { if (moved.indexOf(o) < 0) { moved.push(o); o.pos = addv(o.pos, LD); } };
    if (B.things.lamp) B.things.lamp.objs.forEach(mv);
    B.objs.forEach(function (o) { if (o.grp === 'lamp') mv(o); });
    B.lights.forEach(function (l) { if (l.grp === 'lamp') l.p = addv(l.p, LD); });
    if (B.things.clock) B.things.clock.objs.forEach(function (o) { o.pos = [-98, TOP + 4, 182]; });
    add({ geo: 'box', pos: [-101, TOP + 0.6, 160], s: [36, 1.2, 22], color: '#3b2b20', border: 0.2 });
    [[-101, 149.4, 36, 0.9], [-101, 170.6, 36, 0.9], [-118.6, 160, 0.9, 22], [-83.4, 160, 0.9, 22]].forEach(function (q) {
      add({ geo: 'box', pos: [q[0], TOP + 1.5, q[1]], s: [q[2], 1.8, q[3]], color: '#2c2018', border: 0.12 });
    });

    // the laptop lid, on its hinge
    if (K.lid) {
      var pl = Ink.place(K.lid);
      var up = M.apply3(pl.R, [0, 1, 0]);
      K.lidHinge = addv(pl.p, scl(up, -pl.s[1] / 2));
      var tgt = [-1, 0, 0];
      K.lidAxis = norm(cross(up, tgt));
      K.lidAngle = Math.acos(clamp(up[0] * tgt[0] + up[1] * tgt[1] + up[2] * tgt[2], -1, 1)) - 4 * DEG;
      K.lidEmit = K.lid.emit;
    }
    // the WORK switch, by the bed: already off (the ritual is the evening after the click)
    K.sw = SC.makeSwitch(B, { wall: 's', u: -118, v: 108 }, this.api);
    var swAxis = M.apply3(K.sw.rocker.R, [1, 0, 0]);
    var swx = { c: K.sw.pos, R: M.axis(swAxis, 24 * DEG) };
    K.sw.rocker.x = swx;
    K.sw.led.x = swx;
    K.sw.led.emit = 0;
    K.sw.glow.hidden = true;
    K.sw.glow.base = 0;

    // the desk lamp's reach, and a little warmth by the switch
    var dl = B.light({ p: [104, 150, -70], c: '#ffb070', i: 0.6, r: 300, k: 'warm' });
    dl.i0 = 0.6;
    dl.grp = 'desk';
    B.light({ p: [90, 150, 150], c: '#ff9f5a', i: 0.4, r: 300, k: 'warm' }).i0 = 0.4;

    // pleated curtains
    add({ geo: 'cyl', pos: [158, 237, 78], R: M.rotX(90 * DEG), s: [2.6, 160, 2.6], color: '#2a2c30', border: 0.2 });
    K.pleats = [];
    ['l', 'r'].forEach(function (side) {
      for (var j = 0; j < 7; j++) {
        var o = add({ geo: 'box', pos: [0, 0, 0], s: [PLEAT, 172, 0.8], color: j % 2 ? '#6a4c63' : '#7a5a72', border: 0.14 });
        o.side = side;
        o.j = j;
        K.pleats.push(o);
      }
    });

    // tonight's street, and rain on the window some nights
    if (K.city && B.tex.city) B.tex.city.update(paintCity(480, 470, { seed: night.seed, moon: night.moon, rain: night.rain, lit: 1 }));
    K.rain = [];
    if (night.rain) {
      var rr0 = seeded(night.seed + 3);
      for (var q = 0; q < 34; q++) {
        K.rain.push({
          o: add({ geo: 'card', pos: [173.4, 150, 78], R: M.rotY(-90 * DEG), s: [0.22, 4 + rr0() * 5, 1], color: '#cfe0f5', alpha: 0.32, blend: 'alpha', border: 0, hatch: 0, unlit: true, emit: 0.4 }),
          z: 14 + rr0() * 128, v: 30 + rr0() * 40, y0: rr0(), sp: 0.35 + rr0() * 0.5,
        });
      }
    }

    // warm light motes: at "lower the lights" they rise out of the bedside lamp and settle
    // through the whole room
    K.motes = new SC.Motes(B, { from: LAMP, box: [-165, 55, -120, 160, 215, 176], seed: 91 + (night.seed % 7) });

    // a carafe and a glass on the tray; a mug for tea instead, if that's your drink
    var glassLook = { color: '#e4f2fa', alpha: 0.42, blend: 'alpha', border: 0.32, hatch: 0, emit: 0.18 };
    var waterLook = { color: '#3f92da', alpha: 0.78, blend: 'alpha', border: 0.12, hatch: 0, emit: 0.38 };
    K.carafe = [
      add(Object.assign({ geo: 'cylHi', pos: [CARAFE[0], TRAY + 7.5, CARAFE[2]], s: [8.8, 15, 8.8] }, glassLook)),
      add(Object.assign({ geo: 'cylHi', pos: [CARAFE[0], TRAY + 16.6, CARAFE[2]], s: [5.4, 3.2, 5.4], taper: 0.82 }, glassLook)),
    ];
    K.carafeWater = add(Object.assign({ geo: 'cylHi', pos: [0, 0, 0], s: [8.2, 11, 8.2] }, waterLook));
    K.stream = add(Object.assign({ geo: 'cylHi', pos: [0, 0, 0], s: [1.3, 10, 1.3], hidden: true }, waterLook, { alpha: 0.88, emit: 0.5 }));
    K.glass = add(Object.assign({ geo: 'cylHi', pos: [GLASS[0], TRAY + 5.5, GLASS[2]], s: [6.4, 11, 6.4] }, glassLook));
    K.water = add(Object.assign({ geo: 'cylHi', pos: [0, 0, 0], s: [5.8, 0.2, 5.8], hidden: true }, waterLook));
    K.mug = [
      add({ geo: 'cylHi', pos: [GLASS[0], TRAY + 4.8, GLASS[2]], s: [8, 9.6, 8], color: '#d9c7a8', border: 0.25, hidden: true }),
      add({ geo: 'cylHi', pos: [GLASS[0], TRAY + 9.2, GLASS[2]], s: [7, 0.4, 7], color: '#8a5a2e', border: 0, hidden: true }),
      add({ geo: 'box', pos: [GLASS[0] + 5, TRAY + 5.2, GLASS[2]], s: [1.6, 5.4, 3.2], color: '#d9c7a8', border: 0.2, hidden: true }),
    ];
    K.steam = [0, 1, 2].map(function () {
      return add({ geo: 'card', pos: [GLASS[0], TRAY + 14, GLASS[2]], s: [4, 7, 1], color: '#f4efe6', shape: 1, soft: 0.9, blend: 'alpha', alpha: 0.18, border: 0, hatch: 0, unlit: true, bill: true, hidden: true });
    });

    // the RESET jar (direction C), at the back of the tray (the label says CONCEPT · NOT FOR SALE)
    K.jar = SC.cJar(B, BOTTLE, { front: { concept: props.jar2 } });
    K.bottle = K.jar.all;

    // the phone, face up and lit
    var scr = B.T('phonelit', function () { return PT.phoneScreen(200, 400, { note: props.phoneNote || ['Manager', 'You home? Quick one'] }); });
    var Rp = M.rotY(20 * DEG);
    K.phone = [
      add({ geo: 'box', pos: PHONE.slice(), R: Rp, s: [8, 1, 16], color: '#1b1d22', border: 0.18 }),
      add({ geo: 'card', pos: [PHONE[0], PHONE[1] + 0.52, PHONE[2]], R: M.mul3(Rp, M.rotX(-90 * DEG)), s: [7.2, 15, 1], color: '#101a2c', map: scr, emit: 0.95, emitDark: 0, border: 0.1, hatch: 0, decal: 2 }),
    ];
    K.phoneAxis = M.apply3(Rp, [0, 0, 1]);
    K.phoneLight = B.light({ p: [PHONE[0], 70, PHONE[2] - 6], c: '#9cc0ff', i: 0.3, r: 90, k: 'always' });
    K.drawer = [
      add({ geo: 'box', pos: [-116, 36.5, 145.2], s: [58, 17, 2.4], color: '#54443a', border: 0.25 }),
      add({ geo: 'box', pos: [-116, 39, 143.6], s: [12, 1.6, 1.6], color: '#c9b48a', border: 0.12 }),
      add({ geo: 'box', pos: [-116, 38.5, 166], s: [54, 12, 38], color: '#2e241e', border: 0.2 }),
    ];
    K.drawer.forEach(function (o) { o.p0 = o.pos.slice(); });

    // a book on the bed
    K.bookAt = [-38, 62.4, 112];
    // turned so you read it lying propped up on the pillows: the front cover opens to the left,
    // pages turn right to left
    K.bookR = M.rotY(-12 * DEG);
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
      return add(Object.assign({ geo: 'box', pos: addv(K.bookAt, M.apply3(K.bookR, local)), R: K.bookR, s: size, color: col, border: 0.18 }, extra || {}));
    }
    K.bookL = [bk([-7.75, 0.4, 0], [15.5, 0.8, 23], '#b0473a'), bk([-7.25, 1.5, 0], [14.5, 1.4, 21], '#f4eedf', { map: pageTex, mapFace: 2 })];
    K.bookRt = [bk([7.75, 0.4, 0], [15.5, 0.8, 23], '#b0473a'), bk([7.25, 1.5, 0], [14.5, 1.4, 21], '#f4eedf', { map: pageTex, mapFace: 2 })];
    K.bookHinge = addv(K.bookAt, M.apply3(K.bookR, [0, 2.2, 0]));
    K.bookAxis = M.apply3(K.bookR, [0, 0, 1]);
    K.pages = [0, 1, 2].map(function () { return bk([7.1, 2.3, 0], [14, 0.12, 20.4], '#f6f1e3', { map: pageTex, mapFace: -1, border: 0.1, hatch: 0.25, hidden: true }); });
    K.pageHinge = addv(K.bookAt, M.apply3(K.bookR, [0, 2.3, 0]));

    // a record player on the desk (shown when your quiet thing is music)
    var rec = B.T('record', paintRecord);
    var tp = [150, DESK, -40];
    K.turntable = [
      add({ geo: 'box', pos: [tp[0], DESK + 3, tp[2]], s: [32, 6, 28], color: '#6b4a32', border: 0.22, hidden: true }),
      add({ geo: 'cylHi', pos: [tp[0] - 2, DESK + 6.6, tp[2] + 1], s: [24, 1.2, 24], color: '#2a2c30', border: 0.15, hidden: true }),
      add({ geo: 'box', pos: [tp[0] + 11, DESK + 7.4, tp[2] - 6], s: [1.2, 1.2, 16], R: M.rotY(-24 * DEG), color: '#c9c3b8', border: 0.15, hidden: true }),
    ];
    K.record = add({ geo: 'card', pos: [tp[0] - 2, DESK + 7.3, tp[2] + 1], R: M.rotX(-90 * DEG), s: [22, 22, 1], color: '#ffffff', map: rec, mapAlpha: true, blend: 'alpha', shape: 1, border: 0.05, hatch: 0, hidden: true });
    K.recordC = [tp[0] - 2, DESK + 7.3, tp[2] + 1];
    // its strobe light: a little warm glow on the platter, so you can see it in the dark
    K.recLed = add({ geo: 'box', pos: [tp[0] + 12, DESK + 6.3, tp[2] + 11], s: [1.6, 0.8, 0.8], color: '#ff9a3c', emit: 1, emitDark: 0, border: 0, hatch: 0, hidden: true });
    K.recLight = B.light({ p: [tp[0] + 10, DESK + 14, tp[2] + 12], c: '#ffb070', i: 0, r: 120, k: 'always' });
    K.recLight.i0 = null;

    // a pen that writes on the notepad
    K.pen = add({ geo: 'cylHi', pos: [0, 0, 0], s: [1.1, 14, 1.1], color: '#2f5ba8', border: 0.15, hidden: true });
    K.penTip = add({ geo: 'cylHi', pos: [0, 0, 0], s: [1.1, 1.6, 1.1], taper: 0.15, color: '#d9d4c6', border: 0.1, hidden: true });
    if (K.notepad) {
      var np = Ink.place(K.notepad);
      K.npC = np.p;
      K.npX = M.apply3(np.R, [1, 0, 0]);
      K.npY = M.apply3(np.R, [0, 1, 0]);
      K.npZ = M.apply3(np.R, [0, 0, 1]);
      K.npS = np.s;
    }
    K.digits = B.tex.digits;

    // the dream's lights, and the moon before them
    K.fin = [
      B.light({ p: [0, 0, 0], c: '#f2a84b', i: 0, r: 120, k: 'always' }),
      B.light({ p: [0, 0, 0], c: '#d23a5a', i: 0, r: 120, k: 'always' }),
      B.light({ p: [0, 0, 0], c: '#2bb3b8', i: 0, r: 120, k: 'always' }),
      B.light({ p: [-50, 120, 115], c: '#7d93d6', i: 0, r: 220, k: 'always' }),
    ];
    K.finObjs = K.bottle.slice();
    this.notesShown = -1;
    this.cityLit = 1;
    self.clockShown = '';
  };

  function grpOf(p) {
    if (p[2] > 140 && p[0] < -95 && p[0] > -150 && p[1] < 100) return 'lamp';
    if (p[2] > 168 && p[1] > 140) return 'fairy';
    if (p[0] > 100 && p[2] < -80) return 'desk';
    return 'fill';
  }

  // the three orbs that stay, circling the bottle in the dream (the breath widens their circle)
  function finOrbit(i, time, wide) {
    var a = time * (0.35 + i * 0.12) + (i * Math.PI * 2) / 3, rad = 22 * (wide || 1);
    return [BOTTLE[0] + Math.cos(a) * rad, 67 + Math.sin(time * 0.5 + i) * 10, BOTTLE[2] + Math.sin(a) * rad];
  }

  P.setNotes = function (lines) {
    this.notes = lines && lines.length ? lines : null;
    this.notesShown = -1;
  };
  P.setCityLit = function (lit) {
    lit = Math.round(clamp(lit, 0, 1) * 10) / 10;
    if (lit === this.cityLit || !this.B.tex.city) return;
    this.cityLit = lit;
    this.B.tex.city.update(paintCity(480, 470, { seed: this.night.seed, moon: this.night.moon, rain: this.night.rain, lit: lit }));
  };
  P.setClock = function (ts) {
    if (ts === this.clockShown || !this.K.digits) return;
    this.clockShown = ts;
    this.api.data.time = ts;
    this.K.digits.update(PT.digits(160, 64, ts));
  };
  // push the light motes away from a point on screen (you can touch them once the lamp's light is out)
  P.nudge = function (sx, sy, cam) {
    var K = this.K, Rnd = this.Rnd;
    if (!K.motes || !cam) return;
    var b = camBasis(cam);
    K.motes.list.forEach(function (m) {
      if (!(m.v > 0.02)) return;
      var pr = Rnd.project(m.pos);
      if (pr.behind) return;
      var dx = pr.x - sx, dy = pr.y - sy, d = Math.hypot(dx, dy);
      var reach = Math.max(70, (pr.s || 3) * 30);
      if (d > reach) return;
      var k = (1 - d / reach) * 1.6;
      var dir = addv(scl(b.r, dx / (d || 1)), scl(b.u, -dy / (d || 1)));
      m.pt = addv(m.pt || [0, 0, 0], scl(dir, k));
    });
  };

  /* Pose: everything that moves, from numbers 0–1.
     p: { lid, write, curtains, pour, sip, drink ('water'|'tea'), drawer: { flip, open, into, shut },
          orbs: { come, out, dream, wide }, book: { open, pages }, quiet ('read'|'music'|'sit'), spin,
          face (the bottle's turn, degrees), float (how far it lifts in the dream), dreamOnly } */
  P.pose = function (p, time, cam, dt) {
    var K = this.K, B = this.B, self = this;
    // 1. the laptop closes; the list gets written (your own lines, if you typed them)
    if (K.lid) {
      var lk = clamp(p.lid || 0, 0, 1);
      K.lid.x = lk > 0 ? { c: K.lidHinge, R: M.axis(K.lidAxis, K.lidAngle * lk) } : null;
    }
    var notes = this.notes || this.props.notes || ['1. Call the supplier', '2. Finish the rota', '3. Reply to Dana', '-', 'Done for today.'];
    var total = notes.join('').length;
    var wk = clamp(p.write || 0, 0, 1);
    var n = Math.round(wk * total);
    var npTex = B.tex.notepad;
    if (n !== this.notesShown && npTex) {
      this.notesShown = n;
      var left = n, lines = [];
      for (var i = 0; i < notes.length && left > 0; i++) {
        var l = notes[i];
        lines.push(l === '-' ? '-' : l.slice(0, left));
        left -= l.length;
      }
      npTex.update(PT.sheet(200, 280, { title: this.props.notesTitle || 'TOMORROW', lines: lines, fs: 0.062, lh: 0.1, mono: false, col: '#2c3e70' }));
    }
    if (K.notepad) {
      var vis = wk > 0.001 && wk < 0.999;
      K.pen.hidden = K.penTip.hidden = !vis;
      if (vis) {
        var li = 0, acc = 0, ch = 0;
        for (var j = 0; j < notes.length; j++) {
          if (n <= acc + notes[j].length || j === notes.length - 1) { li = j; ch = n - acc; break; }
          acc += notes[j].length;
        }
        var fu = 0.12 + Math.min(0.76, ch * 0.62 * 0.062 * (280 / 200) * 0.72);
        var fv = 0.08 + 0.09 + li * 0.1;
        var wob = Math.sin(time * 40) * 0.006;
        var tip = addv(K.npC, addv(scl(K.npX, (fu - 0.5) * K.npS[0]), addv(scl(K.npY, (0.5 - fv - wob) * K.npS[1]), scl(K.npZ, K.npS[2] / 2 + 0.3))));
        var dir = norm([-0.55, 0.78, 0.3]);
        K.penTip.pos = addv(tip, scl(dir, 0.8));
        K.penTip.R = alongY(scl(dir, -1));
        K.pen.pos = addv(tip, scl(dir, 1.6 + 7));
        K.pen.R = alongY(dir);
      }
    }
    // 2. the curtains: an accordion, its halves meeting in the middle
    var F = B.frame('e');
    var ang = lerp(74, 41.6, clamp(p.curtains || 0, 0, 1)) * DEG, sp = PLEAT * Math.cos(ang);
    K.pleats.forEach(function (o) {
      var dr = o.side === 'l' ? 1 : -1, u0 = o.side === 'l' ? 10 : 146;
      var u = u0 + dr * sp * (o.j + 0.5);
      var a = (o.j % 2 ? 1 : -1) * dr * ang;
      var q = F.at(u, 22);
      o.pos = [q[0], 148, q[1]];
      o.R = M.rotY(-90 * DEG + a);
    });
    // rain running down the glass
    K.rain.forEach(function (r) {
      var y = 212 - ((r.y0 + time * r.sp) % 1) * 116;
      r.o.pos = [173.4, y, r.z];
      r.o.hidden = !!p.dreamOnly;
    });

    // 3. water (or tea): pour, sit and sip
    var tea = p.drink === 'tea';
    K.mug.forEach(function (o) { o.hidden = !tea; });
    [K.glass].concat(K.carafe).forEach(function (o) { o.hidden = tea; });
    var pour = p.pour || 0, sip = p.sip || 0;
    var lift = part(pour, 0, 0.18) * (1 - part(pour, 0.82, 1));
    var tilt = part(pour, 0.15, 0.32) * (1 - part(pour, 0.7, 0.86));
    var poured = part(pour, 0.28, 0.72, ease.lin);
    var c0 = [CARAFE[0], TRAY + 7.5, CARAFE[2]];
    var toGlass = norm([GLASS[0] - CARAFE[0], 0, GLASS[2] - CARAFE[2]]);
    var pourAxis = norm(cross([0, 1, 0], toGlass));
    var Rc = M.axis(pourAxis, 102 * DEG * tilt);
    var cPour = [GLASS[0] - toGlass[0] * 9, TRAY + 22, GLASS[2] - toGlass[2] * 9];
    var cNow = lerpv(c0, cPour, lift);
    var tC = subv(cNow, c0);
    K.carafe.forEach(function (o) { o.x = { c: c0, R: Rc, t: tC }; });
    var cwH = lerp(11, 6.2, poured);
    K.carafeWater.hidden = tea;
    K.carafeWater.pos = [c0[0], TRAY + 0.5 + cwH / 2, c0[2]];
    K.carafeWater.s = [8.2, cwH, 8.2];
    K.carafeWater.x = { c: c0, R: Rc, t: tC };
    var lip = addv(cNow, M.apply3(Rc, addv([0, 9.6, 0], scl(toGlass, 2.7))));
    var up2 = part(sip, 0, 0.35) * (1 - part(sip, 0.65, 1));
    var drunk = part(sip, 0.3, 0.7, ease.lin);
    var gh = Math.max(0.2, poured * 8.6 - drunk * 3.6);
    var surf = [GLASS[0], TRAY + 0.4 + gh, GLASS[2]];
    var pouring = !tea && pour > 0.3 && pour < 0.72;
    K.stream.hidden = !pouring;
    if (pouring) {
      var dv = subv(surf, lip), len = Math.hypot(dv[0], dv[1], dv[2]);
      K.stream.pos = lerpv(lip, surf, 0.5);
      K.stream.R = alongY(dv);
      K.stream.s = [1.3, len, 1.3];
    }
    K.water.hidden = tea || gh < 0.3;
    K.water.pos = [GLASS[0], TRAY + 0.4 + gh / 2, GLASS[2]];
    K.water.s = [5.8, gh, 5.8];
    var g0 = [GLASS[0], TRAY + 5.5, GLASS[2]];
    var gx = null;
    if (up2 > 0 && cam) {
      var bs = camBasis(cam);
      var to = addv(cam.pos, addv(scl(bs.f, 30), scl(bs.u, -6)));
      gx = { c: g0, R: M.axis(bs.r, -22 * DEG * up2), t: scl(subv(to, g0), up2) };
    }
    K.glass.x = gx;
    K.water.x = gx;
    K.mug.forEach(function (o) { o.x = gx; });
    var steamOn = tea && !p.dreamOnly;
    K.steam.forEach(function (o, i) {
      o.hidden = !steamOn;
      if (!steamOn) return;
      var k = (time * 0.18 + i / 3) % 1;
      var base = gx ? addv(g0, gx.t) : g0;
      o.pos = [base[0] + Math.sin(time * 0.7 + i * 2) * 1.2, base[1] + 6 + k * 12, base[2] + Math.cos(time * 0.6 + i) * 1.0];
      o.alpha = 0.2 * Math.sin(Math.PI * k) * (1 - drunk * 0.5);
      o.s = [3 + k * 4, 5 + k * 5, 1];
    });

    // 5. the phone: face down, into the drawer
    var dw = p.drawer || {};
    var flip = clamp(dw.flip || 0, 0, 1), open = clamp(dw.open || 0, 0, 1), into = clamp(dw.into || 0, 0, 1), shut = clamp(dw.shut || 0, 0, 1);
    // the drawer comes well out; the phone lifts off the table top and forward, clear of it, then
    // down into the open drawer (it never passes through the table), and goes in with the drawer
    var dz = -30 * open * (1 - shut);
    K.drawer.forEach(function (o) { o.pos = [o.p0[0], o.p0[1], o.p0[2] + dz]; });
    var ia = ease.inOut(clamp(into / 0.55, 0, 1)), ib = ease.inOut(clamp((into - 0.45) / 0.55, 0, 1));
    var pPos = [lerp(PHONE[0], -116, ia), lerp(lerp(PHONE[1], 66, ia), 45.1, ib) + Math.sin(Math.PI * flip) * 6, lerp(PHONE[2], 128, ia) + shut * 30];
    var Rflip = M.axis(K.phoneAxis, Math.PI * flip);
    K.phone.forEach(function (o) {
      o.x = { c: PHONE, R: Rflip, t: subv(pPos, PHONE) };
      o.hidden = shut > 0.98 || !!p.dreamOnly;
    });

    // 7. something quiet: a book opening, pages turning, or a record playing
    var quiet = p.quiet || 'read';
    var bo = p.book || {};
    var openB = clamp(bo.open || 0, 0, 1);
    K.bookL.forEach(function (o) { o.x = { c: K.bookHinge, R: M.axis(K.bookAxis, -Math.PI * (1 - openB)) }; });
    // pages: a number that keeps growing while you read; each whole number is a page, which lies
    // still for most of its time and turns over in the last part
    var pages = bo.pages || 0, turn = clamp(((pages % 1) - 0.72) / 0.28, 0, 1);
    K.pages.forEach(function (o, i) {
      // the one page that turns stays on the book between turns (it looks just like the page
      // under it), so nothing pops in or out
      o.hidden = i > 0 || openB < 0.95 || pages <= 0;
      o.x = { c: K.pageHinge, R: M.axis(K.bookAxis, Math.PI * ease.sine(turn) * 0.995) };
    });
    var music = quiet === 'music';
    K.turntable.forEach(function (o) { o.hidden = !music; });
    K.record.hidden = !music;
    (K.deskBooks || []).forEach(function (o) { o.hidden = music; });
    if (music) K.record.R = M.mul3(M.rotY((p.spin || 0) * 2 * Math.PI), M.rotX(-90 * DEG));
    K.recLed.hidden = !music;
    K.recLight.i = music && !p.dreamOnly ? 0.5 : 0;

    // 4. the lamp's light, as warm motes through the room; they go at lights out
    var ob = p.orbs || {};
    K.motes.update(clamp(ob.come || 0, 0, 1), clamp(ob.out || 0, 0, 1), time, dt);
    K.fin.forEach(function (l, i) { if (i < 3) l.p = finOrbit(i, time, 1); });

    // 6. the bottle: turned so you can read its label, and in the dream it lifts a little off
    // the tray (it only floats; nothing happens to it)
    var face = p.face || 0, fl = p.float || 0;
    var bxf = face || fl ? { c: BOTTLE, R: M.rotY(face * DEG), t: [0, fl, 0] } : null;
    K.bottle.forEach(function (o) { o.x = bxf; });
  };

  /* Light: { lamp, desk, fill, warmth, fairy, laptop, street, phone, night, moon, fin, dim } */
  P.light = function (st, time) {
    var K = this.K;
    this.B.objs.forEach(function (o) {
      if (o.gone) return;
      if (o.base != null && o.kind) {
        var f = o.kind === 'work' ? 0 : o.kind === 'warm' ? group(o, st) : 1;
        if (o === K.laptopGlow) f *= st.laptop;
        o.glow = o.base * f;
        o.hidden = o.glow < 0.003;
      }
      if (o.warmEmit != null) o.emit = o.warmEmit * group(o, st) + (o.baseEmit || 0);
    });
    this.B.lights.forEach(function (l) {
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
    K.fin.forEach(function (l, i) {
      l.i0 = null;
      if (i === 3) { l.i = st.moon * 0.9; return; }
      l.i = st.fin * (2.2 + 0.6 * Math.sin(time * 0.9 + i * 2));
    });
  };
  function group(o, st) {
    var g = o.grp || 'fill';
    if (g === 'fairy' && o.fi != null && !o.k) return clamp(st.fairy * 10 - o.fi, 0, 1);
    return st[g] == null ? 0 : st[g];
  }

  P.resize = function (W, H, dpr) { this.Rnd.resize(W, H, dpr); this.W = W; this.H = H; };
  P.project = function (pt) { return this.Rnd.project(pt); };
  // draw: the whole room, or (in the dream) just the bottle and the three orbs over the dream
  P.render = function (cam, st, time, only) {
    var B = this.B, K = this.K, D = this.D;
    this.light(st, time);
    var mix = function (a, b, t) { var x = Ink.hex(a), y = Ink.hex(b); return [lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)]; };
    var amb = mix(D.look.amb, '#8a6450', st.warmth * 0.75);
    var dk = 1 - 0.3 * (st.dim || 0);
    amb = [lerp(amb[0] * dk, 0.02, st.night), lerp(amb[1] * dk, 0.024, st.night), lerp(amb[2] * dk, 0.04, st.night)];
    var bgc = mix(D.look.bg, '#000000', st.night);
    this.Rnd.render(only ? K.finObjs : B.objs, {
      cam: cam,
      amb: only ? [0.03, 0.03, 0.05] : amb,
      ink: D.look.ink,
      dark: 1,
      warm: 1,
      bg: only ? [0, 0, 0, 0] : [bgc[0], bgc[1], bgc[2], 1],
      // hatching is the drawing's shading; in the dim and dark of the evening it stays light
      hatch: only ? 0.22 : st.hatch != null ? st.hatch : clamp(1 - 0.55 * (st.dim || 0) - 0.82 * (st.night || 0), 0.14, 1),
      grain: 0.04,
      cull: true,
      lights: only ? K.fin : B.lights,
    });
  };

  /* ------------------------------------------------------------------ the warm place, for breathing
     You sit on the edge of the bed and close your eyes; behind them a warm place comes out of the
     dark: a sea at sundown, the sun low over it, its road on the water, and a beach where a wave
     comes in as you breathe in and slides back as you breathe out. Then the light only goes down.
     Every breath out takes the sun a little lower (a long sigh further than a slow breath): it
     touches the sea, sits half under it (the ENDSHIFT mark), and slips under with the last
     breath, sometimes with a green spark. The sky goes from gold to rose to the dark blue of
     night, the clouds keep the last pink, the evening star comes out, then one star after
     another, and the sea calms down. As if seen through a camera: soft shafts of light from the
     sun, a few coloured ghosts of the lens in a line through the picture and an arc of colour,
     all of them fading with the sun. */
  var DFS = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 uRes; uniform float uTime; uniform float uIn; uniform vec4 uL; uniform float uFx; uniform float uBreath;',
    'uniform float uSet; uniform float uDusk; uniform float uStars; uniform vec2 uLens; uniform float uSeaT; uniform float uBright;',
    'float h21(vec2 p){ p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }',
    'float nz(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y); }',
    'float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 4; i++){ v += a * nz(p); p = m * p; a *= 0.5; } return v + 0.03; }',
    // the sky from the horizon (0) up (1) at four moments of the evening: a low sun, the sun on
    // the sea, just set, night
    'vec3 g5(float y, vec3 a, vec3 b, vec3 c, vec3 d, vec3 e){ vec3 k = mix(a, b, smoothstep(0.0, 0.16, y)); k = mix(k, c, smoothstep(0.12, 0.42, y)); k = mix(k, d, smoothstep(0.38, 0.76, y)); return mix(k, e, smoothstep(0.7, 1.0, y)); }',
    'vec3 skyA(float y){ return g5(y, vec3(0.86, 0.55, 0.28), vec3(0.76, 0.4, 0.31), vec3(0.45, 0.27, 0.41), vec3(0.18, 0.16, 0.35), vec3(0.075, 0.08, 0.19)); }',
    'vec3 skyB(float y){ return g5(y, vec3(0.84, 0.37, 0.15), vec3(0.62, 0.25, 0.27), vec3(0.33, 0.16, 0.33), vec3(0.13, 0.09, 0.25), vec3(0.048, 0.048, 0.13)); }',
    'vec3 skyC(float y){ return g5(y, vec3(0.62, 0.21, 0.1), vec3(0.38, 0.14, 0.21), vec3(0.19, 0.1, 0.26), vec3(0.075, 0.06, 0.18), vec3(0.03, 0.03, 0.09)); }',
    'vec3 skyD(float y){ return g5(y, vec3(0.2, 0.065, 0.08), vec3(0.065, 0.045, 0.11), vec3(0.035, 0.035, 0.09), vec3(0.022, 0.025, 0.07), vec3(0.014, 0.017, 0.05)); }',
    'vec3 skyK(float y, float k){ if (k < 1.0) return mix(skyA(y), skyB(y), k); if (k < 2.0) return mix(skyB(y), skyC(y), k - 1.0); return mix(skyC(y), skyD(y), min(1.0, k - 2.0)); }',
    'vec3 st4(float k, vec3 a, vec3 b, vec3 c, vec3 d){ return k < 1.0 ? mix(a, b, k) : k < 2.0 ? mix(b, c, k - 1.0) : mix(c, d, min(1.0, k - 2.0)); }',
    // the lens: six blades, so its ghosts are soft hexagons; the glass splits their rims into colours
    'float hexd(vec2 q){ q = mat2(0.94, 0.34, -0.34, 0.94) * q; q = abs(q); return max(q.x * 0.866 + q.y * 0.5, q.y); }',
    'vec3 ghost(vec2 p, vec2 c, float r, vec3 tint, float e){ float d = hexd(p - c);',
    '  vec3 m = vec3(smoothstep(r * 1.08 + e, r * 1.08 - e, d), smoothstep(r + e, r - e, d), smoothstep(r * 0.92 + e, r * 0.92 - e, d));',
    '  return tint * m * (0.35 + 0.65 * smoothstep(r * 0.45, r, d)); }',
    // shafts of light from the sun: three layers stacked, broad, finer and finest, each drifting slowly
    // (u is the direction from the sun: going round it, the noise goes round a circle, so it has no seam)
    'float shaft(vec2 u, float t){ return smoothstep(0.36, 0.84, nz(u * 5.0 + vec2(t * 0.012, 0.0))); }',
    'float shafts2(vec2 u, float t){ return (0.45 + 0.55 * smoothstep(0.4, 0.9, nz(u * 13.0 + vec2(4.0, t * 0.018 + 2.0)))) * (0.6 + 0.4 * nz(u * 31.0 + vec2(9.0, t * 0.026 + 5.0))); }',
    'vec3 mote(vec2 p, vec2 c, float r, vec3 col){ vec2 d = p - c; float q = dot(d, d) / (r * r); return col * (exp(-q) + 0.22 * exp(-q * 0.08)); }',
    'float sq(float x){ return x * x; }',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / uRes;',
    '  float asp = uRes.x / uRes.y;',
    '  vec2 p = vec2((uv.x - 0.5) * asp, uv.y);',
    '  float t = uTime, b = uBreath, px = 1.0 / uRes.y;',
    '  float hz = 0.42;',
    // the sun: its height over the sea in its own radii, from a low sun to just under
    '  float R = min(0.062, 0.11 * asp);',
    '  float H0 = 4.2, H1 = -1.15;',
    '  float hR = mix(H0, H1, uSet);',
    // how far into the evening: 0 a low sun, 1 the sun on the sea, 2 just set, 3 night
    '  float sT = (H0 - 1.0) / (H0 - H1);',
    '  float k = (uSet < sT ? uSet / sT : 1.0 + (uSet - sT) / (1.0 - sT)) + uDusk;',
    '  float kk = k / 3.0;',
    // the picture drifts a hair, like paint on water
    '  vec2 pw = p + (vec2(nz(p * 2.2 + vec2(0.0, t * 0.04)), nz(p * 2.2 + vec2(5.2, -t * 0.035))) - 0.5) * 0.007;',
    '  vec2 sc = vec2(0.0, hz + hR * R);',
    // low over the sea the air squashes the sun a little
    '  float fl = mix(1.0, 0.86, smoothstep(2.2, 0.0, hR));',
    '  vec2 dv = pw - sc;',
    '  float dl = length(vec2(dv.x, dv.y / fl));',
    '  float above = smoothstep(hz - 0.7 * px, hz + 0.7 * px, pw.y);',
    // the lower it gets, the less light it gives, and the redder
    '  float sunI = mix(1.0, 0.6, uSet);',
    '  vec3 sunC = mix(vec3(1.0, 0.82, 0.52), vec3(1.0, 0.56, 0.26), smoothstep(0.05, 0.75, uSet));',
    '  sunC = mix(sunC, vec3(1.0, 0.4, 0.16), smoothstep(0.72, 1.0, uSet));',
    '  float vis = clamp((hR + 1.0) * 0.5, 0.0, 1.0);',
    // the sky, brightest towards the sun (each half of the picture only works out its own half)
    '  float ys = clamp((pw.y - hz) / (1.0 - hz), 0.0, 1.0);',
    '  float az = exp(-sq(pw.x / (0.45 + 0.3 * asp)));',
    '  vec3 skyH = skyK(0.03, k);',
    '  vec3 lid = vec3(0.012, 0.01, 0.014);',
    '  vec3 upper = lid, lower = lid * 0.55;',
    '  float foam = 0.0;',
    '  if (pw.y > hz - 2.0 * px) {',
    '    vec3 sky = skyK(ys + (1.0 - az) * 0.16, k);',
    '    sky += sunC * (exp(-dl * dl * 26.0) * 0.22 + exp(-dl * 4.0) * 0.08) * sunI * smoothstep(-1.6, 0.4, hR) * (1.0 - 0.7 * uDusk) * uL.y;',
    // thin clouds lit from below: gold, then rose; after sunset they keep the last pink, then go dark
    '    float cn = fbm(vec2(pw.x * 1.2 + t * 0.008, pw.y * 7.5 - 2.0));',
    '    float cm = smoothstep(0.52, 0.78, cn) * smoothstep(0.02, 0.18, ys) * smoothstep(0.84, 0.36, ys);',
    '    vec3 cc = st4(k, vec3(1.0, 0.7, 0.46), vec3(0.94, 0.47, 0.4), vec3(0.7, 0.29, 0.42), vec3(0.05, 0.04, 0.085));',
    '    cc *= mix(1.0, 0.62, smoothstep(0.1, 0.7, ys)) * (0.8 + 0.4 * exp(-dl * 2.4));',
    '    sky = mix(sky, cc, cm * 0.7);',
    // the stars: the evening star first, as the sun is half under; then one after another
    '    float sz = max(0.0012, 0.8 * px);',
    '    float star = 0.0;',
    '    if (uStars > 0.0 && ys > 0.06) {',
    '      vec2 sg = floor(p * 46.0);',
    '      vec2 so = vec2(h21(sg + 7.1), h21(sg + 3.3)) * 0.7 + 0.15;',
    '      float rank = h21(sg + 11.9);',
    '      float sOn = step(0.91, h21(sg)) * clamp((uStars - rank * 0.97) / 0.03, 0.0, 1.0);',
    '      float sd = length(fract(p * 46.0) - so) / 46.0;',
    '      float tw = 0.8 + 0.2 * sin(t * (0.5 + rank * 1.1) + rank * 40.0);',
    '      star = sOn * exp(-sd * sd / (sz * sz)) * (0.35 + 0.65 * sq(h21(sg + 5.0))) * tw;',
    '    }',
    '    vec2 vp = vec2(-0.21 * asp - 0.02, hz + 0.19);',
    '    float vd = length(p - vp);',
    '    star += clamp((0.4 - hR) / 0.6, 0.0, 1.0) * (exp(-vd * vd / (sz * sz * 2.6)) * 1.2 + exp(-vd * 70.0) * 0.12);',
    '    float dark = 1.0 - smoothstep(0.05, 0.42, dot(sky, vec3(0.3, 0.55, 0.15)));',
    '    sky += vec3(1.0, 0.95, 0.88) * star * dark * smoothstep(0.06, 0.24, ys);',
    '    upper = mix(lid, sky, uL.x);',
    '  }',
    // the sea: the sky's light near the horizon, dark towards you, slow swells
    '  if (pw.y < hz + 2.0 * px) {',
    '    float yd = clamp((hz - pw.y) / hz, 0.0, 1.0);',
    '    float zz = 1.0 / (yd + 0.035);',
    '    vec3 sea = mix(skyH * 0.55, st4(k, vec3(0.17, 0.1, 0.1), vec3(0.13, 0.07, 0.09), vec3(0.075, 0.045, 0.08), vec3(0.02, 0.02, 0.04)), smoothstep(0.0, 0.5, yd));',
    '    float sw = sin(zz * 2.0 - uSeaT * 0.45 + nz(vec2(pw.x * 2.0, zz * 0.3)) * 3.0);',
    '    sea += skyH * smoothstep(0.84, 1.0, sw) * (1.0 - yd) * 0.12;',
    // the sun's road: broken and glittering, wider towards you; it goes as the sun goes
    '    float road = exp(-sq(pw.x / (0.02 + 0.22 * yd)));',
    '    float gl = smoothstep(0.58, 0.95, nz(vec2(pw.x * 16.0 / (0.25 + yd), zz * 1.3 - uSeaT * 0.5))) * (0.45 + 0.55 * nz(vec2(pw.x * 44.0 / (0.3 + yd), zz * 2.8 - uSeaT * 1.1)));',
    '    float rI = sunI * clamp((hR + 1.05) / 1.8, 0.0, 1.0);',
    '    sea += sunC * road * gl * 0.62 * rI * (1.0 - 0.9 * smoothstep(0.1, 0.45, yd));',
    '    sea += sunC * exp(-sq(pw.x / (R * 0.8))) * exp(-yd * 34.0) * 0.4 * rI;',
    // the beach: the edge of the water comes in as you breathe in and slides back as you breathe out
    '    float ye = 0.19 - 0.085 * b + 0.012 * sin(pw.x * 6.5 + uSeaT * 0.35) + 0.03 * (nz(vec2(pw.x * 2.4, uSeaT * 0.07)) - 0.5);',
    '    float shore = smoothstep(ye + 0.003, ye - 0.003, pw.y);',
    '    vec3 sandL = st4(k, vec3(0.3, 0.2, 0.15), vec3(0.24, 0.15, 0.12), vec3(0.14, 0.085, 0.1), vec3(0.035, 0.03, 0.045));',
    '    vec3 sand = sandL * (0.82 + 0.3 * nz(p * 40.0));',
    '    float wet = smoothstep(ye - 0.08, ye, pw.y);',
    '    sand = mix(sand, mix(sand * 0.5, skyH * 0.32, 0.45), wet);',
    '    sand += sunC * road * wet * 0.2 * rI;',
    '    foam = exp(-sq((pw.y - ye) / 0.006)) * (0.55 + 0.45 * nz(vec2(pw.x * 28.0, uSeaT * 0.6)));',
    '    foam += smoothstep(0.7, 0.95, nz(vec2(pw.x * 18.0, (pw.y - ye) * 55.0 - uSeaT * 0.5))) * smoothstep(ye + 0.045, ye, pw.y) * (1.0 - shore) * 0.35;',
    '    lower = mix(lid * 0.55, sea, uL.z);',
    '    lower = mix(lower, sand, shore * uL.w);',
    '  }',
    // put it together, each part coming in from the dark behind the eyes
    '  vec3 col = mix(lower, upper, above);',
    '  float hl = exp(-sq((pw.y - hz) / (1.2 * px + 0.002))) * 0.26 + exp(-sq((pw.y - hz) / 0.05)) * 0.09;',
    '  col += mix(sunC, skyH, 0.5) * hl * az * mix(1.0, 0.2, kk) * uL.x;',
    '  col += mix(skyH, vec3(1.0, 0.95, 0.88), 0.35) * foam * mix(0.62, 0.16, kk) * uL.w;',
    // the sun, and its last sliver going green for a moment, the way it sometimes does
    '  float disc = smoothstep(R + 0.8 * px, R - 0.8 * px, dl) * above;',
    '  float lq = clamp(dl / R, 0.0, 1.0);',
    '  vec3 sunD = sunC * (1.0 + 0.75 * (1.0 - lq * lq)) * (0.45 + 0.75 * sunI);',
    '  sunD = mix(sunD, vec3(0.4, 0.92, 0.5) * 0.7, smoothstep(-0.8, -0.92, hR) * smoothstep(-1.12, -1.0, hR) * 0.65);',
    '  col = mix(col, sunD, disc * uL.y);',
    '  col += sunC * (exp(-dl * dl * 40.0) * 0.5 + exp(-dl * 6.0) * 0.1) * sunI * smoothstep(-1.1, 0.2, hR) * uL.y;',
    // through a camera: shafts of light from the sun, split a hair into colours, three layers deep
    '  float rayI = uFx * 0.16 * sunI * (0.4 + 0.6 * smoothstep(-1.2, 0.5, hR)) * (1.0 - uDusk);',
    '  if (rayI > 0.0005 && pw.y > hz - 2.0 * px) {',
    '    float rd = length(dv);',
    '    vec2 u0 = dv / max(rd, 0.00001);',
    '    mat2 tw = mat2(0.9998, 0.02, -0.02, 0.9998);',
    '    float fall = exp(-rd * 2.4) * smoothstep(R * 0.6, R * 2.6, rd) * above * smoothstep(1.0, 0.5, ys);',
    '    vec3 sh = vec3(shaft(tw * u0, t), shaft(u0, t), shaft(u0 * tw, t)) * shafts2(u0, t);',
    '    col += mix(sunC, vec3(0.9, 0.5, 0.66), smoothstep(0.85, 1.0, uSet)) * sh * fall * rayI;',
    '  }',
    // and the lens's ghosts in a line from the sun through the picture, with an arc of colour
    '  float gI = uFx * sunI * vis * (1.0 - uDusk);',
    '  if (gI > 0.0005) {',
    '    vec2 lc = vec2(0.06 + 0.04 * asp, 0.53) + uLens;',
    '    vec2 ax = lc - sc;',
    '    float al = length(ax);',
    '    vec2 an = ax / al, q = p - sc;',
    '    float ra = dot(q, an);',
    // (only near their line)
    '    if (abs(q.x * an.y - q.y * an.x) < 0.085 && ra > 0.45 * al - 0.085 && ra < 2.46 * al + 0.085) {',
    '      float e = 1.4 * px;',
    '      vec3 gh = ghost(p, sc + ax * 0.45, 0.009, vec3(1.0, 0.72, 0.42), e) * 0.35;',
    '      gh += ghost(p, sc + ax * 0.82, 0.024, vec3(0.38, 0.86, 0.7), e) * 0.12;',
    '      gh += ghost(p, sc + ax * 1.18, 0.014, vec3(0.74, 0.52, 1.0), e) * 0.2;',
    '      gh += ghost(p, sc + ax * 1.56, 0.046, vec3(0.32, 0.72, 0.66), e) * 0.08;',
    '      gh += ghost(p, sc + ax * 1.96, 0.02, vec3(1.0, 0.5, 0.62), e) * 0.14;',
    '      gh += ghost(p, sc + ax * 2.46, 0.07, vec3(1.0, 0.66, 0.36), e) * 0.05;',
    '      col += gh * gI;',
    '    }',
    '    float rr = length(dv) / (5.2 * R);',
    '    if (abs(rr - 1.0) < 0.08) {',
    '      vec3 arc = clamp(1.0 - abs(vec3(rr - 1.035, rr - 1.0, rr - 0.965)) * 22.0, 0.0, 1.0);',
    '      col += arc * smoothstep(-0.1, 0.9, dot(normalize(dv + 0.00001), an)) * 0.045 * gI;',
    '    }',
    '  }',
    // three warm lights drifting up over the water (the orbs from the room)
    '  float m1 = fract(t * 0.011), m2 = fract(t * 0.011 + 0.37), m3 = fract(t * 0.011 + 0.71);',
    '  vec3 mo = mote(pw, vec2(-0.42 * asp + 0.1 * sin(t * 0.05), hz - 0.08 + 0.62 * m1), 0.011, vec3(1.0, 0.7, 0.3)) * sin(3.1416 * m1);',
    '  mo += mote(pw, vec2(0.3 * asp + 0.08 * sin(t * 0.04 + 2.0), hz - 0.12 + 0.62 * m2), 0.009, vec3(1.0, 0.45, 0.6)) * sin(3.1416 * m2);',
    '  mo += mote(pw, vec2(0.12 * asp + 0.09 * sin(t * 0.045 + 4.0), hz - 0.04 + 0.62 * m3), 0.008, vec3(0.4, 0.9, 0.82)) * sin(3.1416 * m3);',
    '  col += mo * uFx * 0.42 * mix(1.0, 0.3, kk);',
    // the light rolls off instead of glaring
    '  float mx = max(max(col.r, col.g), col.b);',
    '  col *= 1.08 * (1.0 - exp(-1.4 * mx)) / max(mx, 0.0001);',
    // your brightness: lower, the dark gets darker and the light less bright; higher, the opposite
    '  col = pow(max(col, vec3(0.0)), vec3(1.0 + (1.0 - uBright) * 0.8)) * uBright;',
    '  float g = h21(floor(gl_FragCoord.xy));',
    '  col *= 0.97 + 0.06 * g;',
    // the edges go first
    '  vec2 v = uv - 0.5;',
    '  col *= 1.0 - dot(v, v) * mix(0.9, 1.5, kk);',
    '  gl_FragColor = vec4(col * uIn, 1.0);',
    '}',
  ].join('\n');
  var DUN = ['uRes', 'uTime', 'uIn', 'uL', 'uFx', 'uBreath', 'uSet', 'uDusk', 'uStars', 'uLens', 'uSeaT', 'uBright'];

  function Dream(canvas) {
    this.ok = false;
    this.canvas = canvas;
    var gl = null;
    try { gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false }); } catch (e) {}
    if (!gl) return;
    var sh = function (type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { if (window.console) console.warn('dream', gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    var vs = sh(gl.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }');
    var fs = sh(gl.FRAGMENT_SHADER, DFS);
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
    DUN.forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
    this.gl = gl; this.pr = pr; this.buf = buf; this.U = U; this.a = gl.getAttribLocation(pr, 'a');
    this.scale = 0.5;
    this.ok = true;
  }
  Dream.prototype.resize = function (W, H) {
    if (!this.ok) return;
    var px = W * H;
    this.scale = (px > 1200000 ? 0.42 : px > 600000 ? 0.5 : 0.6) * (ES.lowEnd ? 0.8 : 1);
    this.canvas.width = Math.max(2, Math.round(W * this.scale));
    this.canvas.height = Math.max(2, Math.round(H * this.scale));
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.W = W; this.H = H;
  };
  /* u: { time, in, layers [sky, sun, sea, beach], fx (the camera's light), breath (0 out – 1 in),
     set (0 a low sun – 1 just under), dusk (0 just set – 1 night), stars (0–1), lens [x, y] (the
     camera in your hands), seaT (the sea's own clock: it slows down), bright (0.35–1.25) } */
  Dream.prototype.render = function (u) {
    if (!this.ok) return;
    var gl = this.gl, U = this.U;
    gl.useProgram(this.pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.enableVertexAttribArray(this.a);
    gl.vertexAttribPointer(this.a, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(U.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(U.uTime, u.time);
    gl.uniform1f(U.uIn, u.in);
    gl.uniform4f(U.uL, u.layers[0], u.layers[1], u.layers[2], u.layers[3]);
    gl.uniform1f(U.uFx, u.fx || 0);
    gl.uniform1f(U.uBreath, u.breath || 0);
    gl.uniform1f(U.uSet, u.set || 0);
    gl.uniform1f(U.uDusk, u.dusk || 0);
    gl.uniform1f(U.uStars, u.stars || 0);
    gl.uniform2f(U.uLens, u.lens ? u.lens[0] : 0, u.lens ? u.lens[1] : 0);
    gl.uniform1f(U.uSeaT, u.seaT == null ? u.time : u.seaT);
    gl.uniform1f(U.uBright, u.bright == null ? 0.8 : u.bright);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  ES.EveningRoom = {
    Room: Room,
    Dream: Dream,
    cams: cams,
    camOf: camOf,
    camAt: camAt,
    blendCam: blendCam,
    tonight: tonight,
    BOTTLE: BOTTLE,
    ease: ease,
    part: part,
    hexRGB: hexRGB,
  };
})();
