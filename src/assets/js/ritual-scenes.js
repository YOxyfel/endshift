/* ENDSHIFT ritual visuals: one full-screen Canvas 2D scene per step.
   Nothing flashes. Every change is slow (seconds, not frames). With reduced motion or
   low-stim mode, scenes hold still except where the motion carries meaning (the breathing: the
   water's edge with each breath, and the sun going down with each breath out). */
(function () {
  'use strict';
  var ES = (window.ES = window.ES || {});

  function rng(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var clamp = function (x, a, b) {
    return x < a ? a : x > b ? b : x;
  };
  var smooth = function (a, b, x) {
    var t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  var lerp = function (a, b, t) {
    return a + (b - a) * t;
  };
  var mix = function (c1, c2, t) {
    return [Math.round(lerp(c1[0], c2[0], t)), Math.round(lerp(c1[1], c2[1], t)), Math.round(lerp(c1[2], c2[2], t))];
  };
  var rgba = function (c, a) {
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? 1 : a) + ')';
  };

  var FLUORO = [205, 231, 234];
  var AMBER = [242, 168, 75];
  var PAPER = [243, 240, 232];

  function Scenes(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d', { alpha: false });
    this.sprites = {};
    this.events = [];
    this.lastDrop = -1;
    this.resize();
    this.build();
  }

  Scenes.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.max(1, this.canvas.clientWidth);
    var h = Math.max(1, this.canvas.clientHeight);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
    this.u = Math.min(w, h) / 800; // size unit
  };

  // Soft round light, pre-rendered once per colour
  Scenes.prototype.sprite = function (c) {
    var key = c.join(',');
    if (this.sprites[key]) return this.sprites[key];
    var s = document.createElement('canvas');
    s.width = s.height = 128;
    var g = s.getContext('2d');
    var grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, rgba(c, 1));
    grad.addColorStop(0.35, rgba(c, 0.45));
    grad.addColorStop(1, rgba(c, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    this.sprites[key] = s;
    return s;
  };

  Scenes.prototype.glow = function (x, y, r, c, a) {
    if (a <= 0.002) return;
    var g = this.g;
    g.globalAlpha = a;
    g.drawImage(this.sprite(c), x - r, y - r, r * 2, r * 2);
    g.globalAlpha = 1;
  };

  Scenes.prototype.build = function () {
    var r = rng(20261008);
    // office windows: 9 columns x 14 rows, switch-off order
    var win = [];
    for (var y = 0; y < 14; y++) for (var x = 0; x < 9; x++) win.push({ x: x, y: y, tint: r(), off: r(), keep: false, dark: r() < 0.12 });
    [17, 58, 96].forEach(function (k) {
      win[k].keep = true;
      win[k].dark = false;
    });
    this.win = win;
    this.mistP = [];
    for (var m = 0; m < 26; m++) this.mistP.push({ x: r(), y: r(), s: 0.6 + r() * 1.4, v: 0.4 + r() * 0.8, ph: r() * 6.28, a: 0.05 + r() * 0.06 });
    this.drops = [];
    for (var d = 0; d < 80; d++) this.drops.push({ t: d * 5.6 + r() * 2.5, x: 0.2 + r() * 0.6, y: 0.16 + r() * 0.36 });
    this.notes = [];
    for (var n = 0; n < 13; n++) this.notes.push({ x: 0.12 + r() * 0.76, y: 0.12 + r() * 0.62, v: 0.6 + r() * 0.8, ph: r() * 6.28, sleep: 0.08 + (n / 13) * 0.78 + r() * 0.04, w: 0.55 + r() * 0.5 });
    this.emberP = [];
    for (var e = 0; e < 40; e++) this.emberP.push({ x: r(), y: r(), v: 0.4 + r() * 0.9, dx: (r() - 0.5) * 0.6, s: 0.6 + r() * 1.6, ph: r() * 6.28, sp: 0.15 + r() * 0.25 });
    this.stars = [];
    for (var s = 0; s < 70; s++) this.stars.push({ x: r(), y: r(), s: 0.4 + r() * 1.1, ph: r() * 6.28, sp: 0.12 + r() * 0.2 });
    this.motes = [];
    for (var q = 0; q < 14; q++) this.motes.push({ x: r(), y: r(), ph: r() * 6.28, v: 0.2 + r() * 0.4 });
  };

  /* ---------------------------------------------------------------- scenes */

  Scenes.prototype.office = function (f) {
    var g = this.g, w = this.w, h = this.h, u = this.u;
    var sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0a0f17');
    sky.addColorStop(1, '#131b25');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    // the street: buildings stand on a ground line, above the text area on phones
    var ground = h * (w < h ? 0.6 : 0.8);
    g.fillStyle = '#0d131b';
    g.fillRect(0, ground - h * 0.2, w * 0.22, h);
    g.fillRect(w * 0.8, ground - h * 0.26, w * 0.2, h);
    var bw = Math.min(w * 0.7, ground * 0.62);
    var bh = Math.min(ground * 0.86, bw * 1.35);
    var bx = (w - bw) / 2;
    var by = ground - bh;
    var lit = 0;
    var p = f.p;
    var cols = 9, rows = 14;
    var gx = bw / cols, gy = bh / rows;
    var states = this.win.map(function (o) {
      if (o.dark) return 0;
      if (o.keep) return 1;
      var at = 0.04 + o.off * 0.86;
      return 1 - smooth(at, at + 0.035, p);
    });
    states.forEach(function (s) {
      lit += s;
    });
    var frac = lit / this.win.length;
    this.glow(w / 2, by + bh * 0.4, bw * 1.1, FLUORO, 0.16 * frac);
    g.fillStyle = '#080c12';
    g.fillRect(bx, by, bw, bh);
    for (var k = 0; k < this.win.length; k++) {
      var o = this.win[k];
      var s = states[k];
      var x = bx + o.x * gx + gx * 0.18;
      var y = by + o.y * gy + gy * 0.22;
      var c = o.keep ? AMBER : mix(FLUORO, [235, 240, 236], o.tint);
      g.fillStyle = rgba([24, 30, 38]);
      g.fillRect(x, y, gx * 0.64, gy * 0.56);
      if (s > 0.01) {
        g.fillStyle = rgba(c, (o.keep ? 0.7 : 0.78) * s);
        g.fillRect(x, y, gx * 0.64, gy * 0.56);
      }
    }
    // street below the ground line
    g.fillStyle = '#06080c';
    g.fillRect(0, ground, w, h - ground);
    this.glow(w / 2, ground, bw * 0.9, FLUORO, 0.06 * frac);
  };

  Scenes.prototype.mist = function (f) {
    var g = this.g, w = this.w, h = this.h, u = this.u;
    var bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#15130f');
    bg.addColorStop(1, '#231b15');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    this.glow(w * 0.5, h * 1.02, Math.max(w, h) * 0.6, [214, 150, 90], 0.22);
    var t = f.still ? 0 : f.t;
    for (var i = 0; i < this.mistP.length; i++) {
      var m = this.mistP[i];
      var size = (140 + m.s * 120) * u;
      var y = ((m.y - t * m.v * 0.012) % 1.3 + 1.3) % 1.3;
      var x = m.x * w + Math.sin(t * 0.08 + m.ph) * 40 * u;
      this.glow(x, (y - 0.15) * h, size, [222, 214, 202], m.a * (0.6 + 0.4 * Math.sin(m.ph + t * 0.05)));
    }
  };

  Scenes.prototype.water = function (f) {
    var g = this.g, w = this.w, h = this.h, u = this.u;
    var bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#061016');
    bg.addColorStop(0.5, '#0a1920');
    bg.addColorStop(1, '#0c1f27');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    this.glow(w * 0.62, h * 0.28, Math.max(w, h) * 0.35, [120, 170, 190], 0.1);
    if (f.still) return;
    var t = f.t;
    var life = 9;
    for (var i = 0; i < this.drops.length; i++) {
      var d = this.drops[i];
      var age = t - d.t;
      if (age < 0) break;
      if (age > life) continue;
      if (i > this.lastDrop && age < 0.3) {
        this.lastDrop = i;
        this.events.push('drop');
      }
      var cx = d.x * w, cy = d.y * h;
      for (var k = 0; k < 3; k++) {
        var rad = (age * 34 - k * 16) * u * 1.4;
        if (rad <= 0) continue;
        var a = (1 - age / life) * (0.32 - k * 0.08);
        g.strokeStyle = 'rgba(176,214,224,' + a.toFixed(3) + ')';
        g.lineWidth = 1.3 * Math.max(1, u);
        g.beginPath();
        g.ellipse(cx, cy, rad, rad * 0.42, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }
  };

  Scenes.prototype.lamp = function (f) {
    var g = this.g, w = this.w, h = this.h, u = this.u;
    g.fillStyle = '#100c0a';
    g.fillRect(0, 0, w, h);
    var p = f.p;
    var ceiling = 1 - smooth(0.05, 0.45, p);
    var lamp = smooth(0.15, 0.6, p);
    this.glow(w / 2, -h * 0.1, Math.max(w, h) * 0.95, [226, 232, 230], 0.42 * ceiling);
    var lx = w * (w > h ? 0.3 : 0.5);
    var ly = h * 0.58;
    this.glow(lx, ly, Math.max(w, h) * 0.55, AMBER, 0.32 * lamp + 0.03);
    this.glow(lx, ly + 10 * u, 160 * u, [255, 214, 160], 0.5 * lamp);
    // lamp silhouette: shade, stem, base
    g.fillStyle = '#1b1410';
    g.beginPath();
    g.moveTo(lx - 70 * u, ly);
    g.lineTo(lx + 70 * u, ly);
    g.lineTo(lx + 42 * u, ly - 78 * u);
    g.lineTo(lx - 42 * u, ly - 78 * u);
    g.closePath();
    g.fill();
    g.fillStyle = rgba([255, 200, 140], 0.35 * lamp);
    g.fillRect(lx - 66 * u, ly - 3 * u, 132 * u, 3 * u);
    g.fillStyle = '#17110d';
    g.fillRect(lx - 3 * u, ly, 6 * u, 120 * u);
    g.fillRect(lx - 36 * u, ly + 120 * u, 72 * u, 8 * u);
    // floor pool
    this.glow(lx, ly + 132 * u, 260 * u, [200, 130, 70], 0.18 * lamp);
    if (!f.still) {
      for (var i = 0; i < this.motes.length; i++) {
        var m = this.motes[i];
        var mx = lx + (m.x - 0.5) * 300 * u + Math.sin(f.t * 0.1 + m.ph) * 20 * u;
        var my = ly + 60 * u + (m.y - 0.5) * 220 * u + Math.cos(f.t * 0.07 + m.ph) * 16 * u;
        this.glow(mx, my, 6 * u, [255, 220, 170], 0.5 * lamp * (0.5 + 0.5 * Math.sin(f.t * m.v + m.ph)));
      }
    }
  };

  Scenes.prototype.phone = function (f) {
    var g = this.g, w = this.w, h = this.h, u = this.u;
    var bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0a0c13');
    bg.addColorStop(1, '#0d1018');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    var t = f.still ? 0 : f.t;
    var pw = Math.min(w * 0.42, 300 * Math.max(u, 0.7));
    var ph = pw * 0.2;
    for (var i = 0; i < this.notes.length; i++) {
      var n = this.notes[i];
      var asleep = smooth(n.sleep, n.sleep + 0.08, f.p);
      var a = 1 - asleep;
      if (a < 0.01) continue;
      var x = n.x * (w - pw) + Math.sin(t * 0.12 + n.ph) * 10 * u;
      var y = n.y * h - t * n.v * 1.2 * u + asleep * 60 * u;
      var ww = pw * n.w;
      g.globalAlpha = a;
      g.fillStyle = 'rgba(205,231,234,0.07)';
      g.strokeStyle = 'rgba(205,231,234,0.32)';
      g.lineWidth = 1;
      g.beginPath();
      if (g.roundRect) g.roundRect(x, y, ww, ph, ph / 3);
      else g.rect(x, y, ww, ph);
      g.fill();
      g.stroke();
      g.fillStyle = 'rgba(205,231,234,0.75)';
      g.beginPath();
      g.arc(x + ph * 0.5, y + ph * 0.5, ph * 0.12, 0, 6.283);
      g.fill();
      g.fillStyle = 'rgba(205,231,234,0.25)';
      g.fillRect(x + ph * 0.9, y + ph * 0.32, ww * 0.55, ph * 0.12);
      g.fillRect(x + ph * 0.9, y + ph * 0.56, ww * 0.35, ph * 0.1);
      g.globalAlpha = 1;
    }
  };

  // The breathing scene: the ENDSHIFT mark at sundown, the same evening as the 3D one (a little
  // darker: this is the quiet version). Each breath out takes the sun a little lower, and the light
  // only goes down; the water's edge comes in as you breathe in and slides back as you breathe
  // out. When the sun is under, the sky goes dark and the stars come out one by one.
  // The sky from the horizon up (horizon, low, middle, high, top) at a low sun, the sun on the
  // sea, just set, and night:
  var DUSK = [
    [[219, 140, 71], [194, 102, 79], [115, 69, 105], [46, 41, 89], [19, 20, 48]],
    [[214, 94, 38], [158, 64, 69], [84, 41, 84], [33, 23, 64], [12, 12, 33]],
    [[158, 54, 26], [97, 36, 54], [48, 26, 66], [19, 15, 46], [8, 8, 23]],
    [[51, 17, 20], [17, 11, 28], [9, 9, 23], [6, 6, 18], [4, 4, 13]],
  ];
  var SAND = [[117, 79, 56], [92, 56, 46], [51, 31, 36], [10, 9, 14]];
  var duskAt = function (rows, k, i) {
    var a = Math.min(2, Math.floor(k)), t = clamp(k - a, 0, 1), c1 = i == null ? rows[a] : rows[a][i], c2 = i == null ? rows[a + 1] : rows[a + 1][i];
    return mix(c1, c2, t);
  };
  var dimC = function (c, m) {
    return [Math.round(c[0] * m), Math.round(c[1] * m), Math.round(c[2] * m)];
  };
  Scenes.prototype.horizon = function (f) {
    var g = this.g, w = this.w, h = this.h, u = this.u;
    var b = f.breath || { level: 0.3 };
    var sn = f.sun || { set: 0, dusk: 0, stars: 0 };
    var L = clamp(b.level, 0, 1);
    var hy = h * (w < h ? 0.5 : 0.58);
    var R = Math.max(30, Math.min(w, h) * 0.075);
    // where the evening is: 0 a low sun, 1 on the sea, 2 just set, 3 night (as in the 3D one)
    var H0 = 4.2, H1 = -1.15;
    var hR = lerp(H0, H1, sn.set);
    var sT = (H0 - 1) / (H0 - H1);
    var k = (sn.set < sT ? sn.set / sT : 1 + (sn.set - sT) / (1 - sT)) + sn.dusk;
    var kk = k / 3;
    var M = 0.52; // the quiet version
    var sky = g.createLinearGradient(0, 0, 0, hy);
    // (the stops from the horizon up; the gradient runs from the top down)
    [0, 0.16, 0.42, 0.75, 1].forEach(function (y, i) {
      sky.addColorStop(1 - y, rgba(dimC(duskAt(DUSK, k, i), M)));
    });
    g.fillStyle = sky;
    g.fillRect(0, 0, w, hy);
    var sunI = lerp(1, 0.6, sn.set);
    var sunC = mix(mix([255, 209, 133], [255, 143, 66], smooth(0.05, 0.75, sn.set)), [255, 102, 41], smooth(0.72, 1, sn.set));
    var cx = w / 2;
    var cy = hy - hR * R;
    // the evening star, then the rest, one by one
    var venus = clamp((0.4 - hR) / 0.6, 0, 1);
    var dark = smooth(0.9, 2.2, k);
    if (venus > 0.01) this.glow(cx - Math.min(w * 0.3, h * 0.24), hy * 0.58, 7 * u + 3, PAPER, 0.7 * venus);
    var n = this.stars.length;
    for (var i = 0; i < n; i++) {
      var s = this.stars[i];
      var on = clamp((sn.stars - (i / n) * 0.97) / 0.03, 0, 1) * dark;
      if (on < 0.01) continue;
      var tw = f.still ? 0.85 : 0.75 + 0.25 * Math.sin(f.T * s.sp + s.ph);
      g.fillStyle = 'rgba(243,240,232,' + (0.6 * on * tw * (1 - s.y * 0.5)).toFixed(3) + ')';
      var sz = Math.max(1, s.s * u * 2.4);
      g.fillRect(s.x * w, s.y * hy * 0.8, sz, sz);
    }
    // the sun's glow, and the sun, clipped to the sky (squashed a little near the sea)
    // (its colour in steps, so there are only a few glow sprites)
    var q = function (v) { return Math.round(v / 12) * 12; };
    this.glow(cx, Math.min(cy, hy), R * 3.4, [q(sunC[0]), q(sunC[1]), q(sunC[2])], 0.3 * sunI * smooth(-1.6, 0.4, hR) * (1 - 0.7 * sn.dusk));
    var vis = clamp((hR + 1) / 2, 0, 1);
    if (vis > 0) {
      var fl = lerp(1, 0.86, smooth(2.2, 0, hR));
      g.save();
      g.beginPath();
      g.rect(0, 0, w, hy);
      g.clip();
      var sun = g.createRadialGradient(cx, cy, R * 0.1, cx, cy, R);
      sun.addColorStop(0, rgba(dimC(mix(sunC, [255, 240, 214], 0.45), 0.55 + 0.45 * sunI)));
      sun.addColorStop(1, rgba(dimC(sunC, 0.5 + 0.45 * sunI)));
      g.fillStyle = sun;
      g.beginPath();
      g.ellipse(cx, cy, R, R * fl, 0, 0, 6.283);
      g.fill();
      g.restore();
    }
    // the water: the sky's light near the horizon, dark towards you
    var skyH = duskAt(DUSK, k, 0);
    var sea = g.createLinearGradient(0, hy, 0, h);
    sea.addColorStop(0, rgba(dimC(skyH, M * 0.6)));
    sea.addColorStop(1, rgba(dimC(duskAt(DUSK, k, 4), M * 0.4)));
    g.fillStyle = sea;
    g.fillRect(0, hy, w, h - hy);
    // the sun's road: slow shimmering lines under it, going as it goes
    var rI = sunI * clamp((hR + 1.05) / 1.8, 0, 1);
    if (rI > 0.01) {
      var len = 0.3 * (h - hy);
      var step = 4 * Math.max(1, u);
      for (var y = hy + 3; y < hy + len; y += step) {
        var d = (y - hy) / len;
        var width = R * (1.4 - d * 0.6);
        var jit = f.still ? 0 : Math.sin(f.T * 0.6 + y * 0.09) * R * 0.16;
        g.fillStyle = rgba(sunC, ((1 - d) * 0.32 * rI).toFixed(3));
        g.fillRect(cx - width / 2 + jit, y, width, step * 0.45);
      }
    }
    // the beach: the water's edge comes in as you breathe in and slides back as you breathe out
    var ye = h * (0.86 + 0.055 * L);
    var sand = dimC(duskAt(SAND, k), 0.75);
    g.fillStyle = rgba(sand);
    g.fillRect(0, ye, w, h - ye);
    var wet = g.createLinearGradient(0, ye, 0, ye + h * 0.05);
    wet.addColorStop(0, rgba(dimC(sand, 0.6)));
    wet.addColorStop(1, rgba(sand, 0));
    g.fillStyle = wet;
    g.fillRect(0, ye, w, h * 0.05);
    g.fillStyle = rgba(mix(skyH, PAPER, 0.4), (0.32 * (1 - 0.7 * kk)).toFixed(3));
    g.fillRect(0, ye - u, w, Math.max(1, u * 2));
    // the horizon line
    g.fillStyle = rgba(mix(sunC, skyH, 0.5), (0.3 * (1 - 0.75 * kk)).toFixed(3));
    g.fillRect(0, hy, w, Math.max(1, u * 1.5));
  };

  Scenes.prototype.embers = function (f) {
    var g = this.g, w = this.w, h = this.h, u = this.u;
    var bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#07070a');
    bg.addColorStop(1, '#120c09');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    this.glow(w / 2, h * 1.05, Math.max(w, h) * 0.6, [210, 120, 50], 0.28 * (1 - 0.5 * f.p));
    for (var s = 0; s < this.stars.length; s += 2) {
      var st = this.stars[s];
      g.fillStyle = 'rgba(243,240,232,' + (0.18 * (1 - st.y)).toFixed(3) + ')';
      g.fillRect(st.x * w, st.y * h * 0.5, st.s * u * 1.4, st.s * u * 1.4);
    }
    // embers slow down over the step
    var slow = 1 - 0.65 * f.p;
    var t = f.still ? 0 : f.t;
    for (var i = 0; i < this.emberP.length; i++) {
      var e = this.emberP[i];
      var y = (((e.y - t * e.v * 0.008 * slow) % 1) + 1) % 1;
      var x = e.x * w + Math.sin(t * 0.05 + e.ph) * 30 * u + e.dx * t * u;
      var tw = f.still ? 0.7 : 0.55 + 0.45 * Math.sin(t * e.sp + e.ph);
      this.glow(((x % w) + w) % w, y * h, (9 + e.s * 7) * u, [255, 170, 90], 0.8 * tw * (0.4 + y * 0.6) * (1 - 0.3 * f.p));
    }
  };

  /* --------------------------------------------------------------- render */

  // f = { scene, p, t, T, breath, prev, prevF, mix (0→1 crossfade), dim (0→1), still }
  Scenes.prototype.render = function (f) {
    var g = this.g;
    this.events.length = 0;
    if (f.prev && f.mix < 1) {
      this.draw(f.prev, f.prevF || f);
      g.globalAlpha = f.mix;
      this.drawOff(f.scene, f);
      g.globalAlpha = 1;
    } else {
      this.draw(f.scene, f);
    }
    var dark = clamp(f.dim, 0, 1);
    if (dark > 0.01) {
      g.fillStyle = 'rgba(0,0,0,' + dark.toFixed(3) + ')';
      g.fillRect(0, 0, this.w, this.h);
    }
    return this.events;
  };

  Scenes.prototype.draw = function (name, f) {
    (this[name] || this.office).call(this, f);
  };

  // Draws a scene with the current globalAlpha by rendering into an offscreen layer first
  Scenes.prototype.drawOff = function (name, f) {
    if (!this.layer) {
      this.layer = document.createElement('canvas');
      this.layerG = this.layer.getContext('2d');
    }
    var dpr = this.canvas.width / this.w;
    if (this.layer.width !== this.canvas.width || this.layer.height !== this.canvas.height) {
      this.layer.width = this.canvas.width;
      this.layer.height = this.canvas.height;
    }
    var main = this.g;
    var a = main.globalAlpha;
    this.g = this.layerG;
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw(name, f);
    this.g = main;
    main.globalAlpha = a;
    main.setTransform(1, 0, 0, 1, 0, 0);
    main.drawImage(this.layer, 0, 0);
    main.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  ES.RitualScenes = Scenes;
})();
