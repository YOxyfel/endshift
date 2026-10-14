/* ENDSHIFT game: the pictures on things in the 3D rooms (screens, tickets, signs, tiles…),
   painted on small canvases and handed to the renderer as textures. Ink style: flat colour,
   a dark outline, a few lines of detail. */
(function () {
  'use strict';

  var ES = (window.ES = window.ES || {});
  var INK = '#0d0f14';
  var DISPLAY = '"Sofia Sans Extra Condensed", "Arial Narrow", "Roboto Condensed", sans-serif';
  var BODY = '"Sofia Sans", "Segoe UI", Roboto, Arial, sans-serif';
  var MONO = '"Courier New", Courier, monospace';

  function cv(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(2, Math.round(w));
    c.height = Math.max(2, Math.round(h));
    return c;
  }
  // a seeded random, so the same room looks the same every time
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return ((s >>> 0) % 100000) / 100000;
    };
  }
  function rr(x, c, X, Y, W, H, r) {
    x.beginPath();
    x.moveTo(X + r, Y);
    x.arcTo(X + W, Y, X + W, Y + H, r);
    x.arcTo(X + W, Y + H, X, Y + H, r);
    x.arcTo(X, Y + H, X, Y, r);
    x.arcTo(X, Y, X + W, Y, r);
    x.closePath();
    if (c) { x.fillStyle = c; x.fill(); }
  }
  function ink(x, w) { x.strokeStyle = INK; x.lineWidth = w || 2; x.lineJoin = 'round'; x.lineCap = 'round'; }
  function text(x, s, X, Y, font, col, align, maxW) {
    x.font = font;
    x.fillStyle = col || INK;
    x.textAlign = align || 'left';
    x.textBaseline = 'middle';
    if (maxW) x.fillText(s, X, Y, maxW);
    else x.fillText(s, X, Y);
  }

  var P = {};

  /* --- repeating surfaces (power-of-two sizes, so they tile) --- */
  P.tiles = function (o) {
    var c = cv(256, 256), x = c.getContext('2d'), n = o.n || 4, s = 256 / n, R = rng(o.seed || 3);
    x.fillStyle = o.base || '#dfe3e1';
    x.fillRect(0, 0, 256, 256);
    for (var i = 0; i < n; i++)
      for (var j = 0; j < n; j++) {
        var k = (R() - 0.5) * (o.jitter == null ? 0.06 : o.jitter);
        x.fillStyle = k > 0 ? 'rgba(255,255,255,' + k + ')' : 'rgba(0,0,0,' + -k + ')';
        x.fillRect(i * s, j * s, s, s);
        if (o.shine) {
          x.fillStyle = 'rgba(255,255,255,.18)';
          x.fillRect(i * s + s * 0.12, j * s + s * 0.12, s * 0.12, s * 0.5);
        }
      }
    x.fillStyle = o.grout || 'rgba(40,48,50,.55)';
    for (var g = 0; g <= n; g++) {
      x.fillRect(g * s - (o.gw || 2), 0, (o.gw || 2) * 2, 256);
      x.fillRect(0, g * s - (o.gw || 2), 256, (o.gw || 2) * 2);
    }
    return c;
  };
  P.planks = function (o) {
    var c = cv(512, 512), x = c.getContext('2d'), R = rng(o.seed || 7), n = 6, s = 512 / n;
    for (var i = 0; i < n; i++) {
      var off = R() * 512;
      for (var k = -1; k < 2; k++) {
        var y0 = off + k * 512 * 0.8;
        var tone = (R() - 0.5) * 0.14;
        x.fillStyle = o.base || '#7a5638';
        x.fillRect(i * s, y0, s, 512 * 0.8);
        x.fillStyle = tone > 0 ? 'rgba(255,230,200,' + tone + ')' : 'rgba(0,0,0,' + -tone + ')';
        x.fillRect(i * s, y0, s, 512 * 0.8);
        x.fillStyle = 'rgba(20,10,4,.55)';
        x.fillRect(i * s, y0 - 2, s, 4);
      }
      // grain
      x.strokeStyle = 'rgba(30,16,8,.22)';
      x.lineWidth = 1.2;
      for (var g = 0; g < 5; g++) {
        var gx = i * s + 8 + R() * (s - 16);
        x.beginPath();
        x.moveTo(gx, 0);
        x.bezierCurveTo(gx + 6, 170, gx - 6, 340, gx + 3, 512);
        x.stroke();
      }
      x.fillStyle = 'rgba(15,8,3,.7)';
      x.fillRect(i * s - 2, 0, 3, 512);
    }
    return c;
  };
  P.speckle = function (o) {
    var c = cv(256, 256), x = c.getContext('2d'), R = rng(o.seed || 11);
    x.fillStyle = o.base || '#8a9496';
    x.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 900; i++) {
      x.fillStyle = R() > 0.5 ? 'rgba(255,255,255,' + (0.08 + R() * 0.12) + ')' : 'rgba(0,0,0,' + (0.08 + R() * 0.14) + ')';
      var r = 0.8 + R() * 1.6;
      x.fillRect(R() * 256, R() * 256, r, r);
    }
    if (o.seam) {
      x.fillStyle = 'rgba(0,0,0,.25)';
      x.fillRect(0, 0, 256, 2);
      x.fillRect(0, 0, 2, 256);
    }
    return c;
  };
  // the ribs round a screw cap: n rounded ribs, each lit on one flank and dark in its groove
  P.ribs = function (o) {
    var n = o.n || 120, c = cv(1024, 16), x = c.getContext('2d'), w = 1024 / n;
    x.fillStyle = o.base;
    x.fillRect(0, 0, 1024, 16);
    for (var i = 0; i < n; i++) {
      var g = x.createLinearGradient(i * w, 0, (i + 1) * w, 0);
      g.addColorStop(0, o.dark);
      g.addColorStop(0.3, o.base);
      g.addColorStop(0.55, o.light);
      g.addColorStop(0.8, o.base);
      g.addColorStop(1, o.dark);
      x.fillStyle = g;
      x.fillRect(i * w, 0, w, 16);
    }
    return c;
  };
  P.stripes = function (o) {
    var c = cv(256, 256), x = c.getContext('2d');
    x.fillStyle = o.base;
    x.fillRect(0, 0, 256, 256);
    var n = o.n || 4;
    for (var i = 0; i < n; i++) {
      x.fillStyle = i % 2 ? o.a : o.b || o.base;
      x.fillRect((i * 256) / n, 0, 256 / n, 256);
    }
    if (o.shade) {
      var g = x.createLinearGradient(0, 0, 256 / n * 2, 0);
      for (var k = 0; k < n; k += 2) {
        g = x.createLinearGradient((k * 256) / n, 0, ((k + 2) * 256) / n, 0);
        g.addColorStop(0, 'rgba(0,0,0,.28)');
        g.addColorStop(0.5, 'rgba(255,255,255,.08)');
        g.addColorStop(1, 'rgba(0,0,0,.28)');
        x.fillStyle = g;
        x.fillRect((k * 256) / n, 0, (2 * 256) / n, 256);
      }
    }
    return c;
  };

  /* --- windows --- */
  P.city = function (w, h) {
    var c = cv(w, h), x = c.getContext('2d'), R = rng(21);
    var g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0a1430');
    g.addColorStop(0.6, '#1d2b52');
    g.addColorStop(1, '#3b3860');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    for (var s = 0; s < 40; s++) {
      x.fillStyle = 'rgba(230,236,255,' + (0.3 + R() * 0.6) + ')';
      x.fillRect(R() * w, R() * h * 0.45, 1.6, 1.6);
    }
    x.fillStyle = '#f2ecd0';
    x.beginPath();
    x.arc(w * 0.78, h * 0.18, w * 0.05, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#1d2b52';
    x.beginPath();
    x.arc(w * 0.795, h * 0.165, w * 0.045, 0, Math.PI * 2);
    x.fill();
    // three rows of buildings, nearer = darker and taller
    [[0.62, '#1a2036', 0.4], [0.45, '#11152a', 0.7], [0.25, '#0a0d1a', 1]].forEach(function (row, ri) {
      var X = -10;
      while (X < w) {
        var bw = w * (0.08 + R() * 0.12);
        var bh = h * (row[0] * (0.35 + R() * 0.4) + ri * 0.12);
        var top = h - bh;
        x.fillStyle = row[1];
        x.fillRect(X, top, bw, bh);
        ink(x, 2);
        x.strokeRect(X, top, bw, bh);
        // windows
        var cw = Math.max(5, bw / 6), ch = cw * 1.25;
        for (var yy = top + ch; yy < h - ch; yy += ch * 1.7)
          for (var xx = X + cw * 0.6; xx < X + bw - cw; xx += cw * 1.6) {
            var on = R() < 0.42 * row[2];
            if (!on) continue;
            x.fillStyle = R() < 0.7 ? 'rgba(255,214,140,.95)' : 'rgba(190,220,255,.85)';
            x.fillRect(xx, yy, cw * 0.8, ch * 0.8);
          }
        if (R() < 0.3) {
          x.fillStyle = '#0a0d1a';
          x.fillRect(X + bw * 0.45, top - h * 0.06, 3, h * 0.06);
          x.fillStyle = '#ff5a4a';
          x.fillRect(X + bw * 0.45 - 1.5, top - h * 0.065, 6, 6);
        }
        X += bw + R() * 6;
      }
    });
    return c;
  };
  P.dawn = function (w, h) {
    var c = cv(w, h), x = c.getContext('2d'), R = rng(5);
    var g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#6d86b8');
    g.addColorStop(0.45, '#e8a59a');
    g.addColorStop(0.75, '#ffc98a');
    g.addColorStop(1, '#ffdcae');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,240,200,.95)';
    x.beginPath();
    x.arc(w * 0.32, h * 0.72, w * 0.09, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = 'rgba(255,255,255,.35)';
    for (var k = 0; k < 5; k++) {
      x.beginPath();
      x.ellipse(R() * w, h * (0.15 + R() * 0.3), w * (0.08 + R() * 0.1), h * 0.025, 0, 0, Math.PI * 2);
      x.fill();
    }
    // roofs
    x.fillStyle = '#4a3f5c';
    x.beginPath();
    x.moveTo(0, h);
    var X = 0;
    while (X < w) {
      var bw = w * (0.1 + R() * 0.12), bh = h * (0.12 + R() * 0.18);
      x.lineTo(X, h - bh);
      if (R() < 0.5) x.lineTo(X + bw / 2, h - bh - h * 0.06);
      x.lineTo(X + bw, h - bh);
      X += bw;
    }
    x.lineTo(w, h);
    x.closePath();
    x.fill();
    ink(x, 2.5);
    x.stroke();
    // blinds, half up
    x.fillStyle = 'rgba(236,232,222,.9)';
    for (var y = 0; y < h * 0.34; y += h * 0.045) {
      x.fillRect(0, y, w, h * 0.03);
      x.fillStyle = 'rgba(0,0,0,.15)';
      x.fillRect(0, y + h * 0.026, w, h * 0.006);
      x.fillStyle = 'rgba(236,232,222,.9)';
    }
    x.fillStyle = 'rgba(30,30,30,.6)';
    x.fillRect(w * 0.2, 0, 2, h * 0.36);
    x.fillRect(w * 0.8, 0, 2, h * 0.36);
    return c;
  };

  /* --- screens --- */
  P.inbox = function (w, h, n) {
    var c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#dfe7f2';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#2f5ba8';
    x.fillRect(0, 0, w, h * 0.14);
    text(x, 'Inbox', w * 0.05, h * 0.07, '700 ' + Math.round(h * 0.08) + 'px ' + BODY, '#fff');
    rr(x, '#d9443a', w * 0.8, h * 0.025, w * 0.15, h * 0.09, h * 0.045);
    text(x, String(n || 12), w * 0.875, h * 0.072, '800 ' + Math.round(h * 0.07) + 'px ' + BODY, '#fff', 'center');
    for (var i = 0; i < 6; i++) {
      var y = h * (0.2 + i * 0.13);
      x.fillStyle = i < 3 ? '#1d2a3d' : '#7e8ea6';
      x.fillRect(w * 0.06, y, w * (0.3 + (i % 3) * 0.08), h * 0.035);
      x.fillStyle = '#9fb2cc';
      x.fillRect(w * 0.06, y + h * 0.055, w * (0.7 - (i % 2) * 0.15), h * 0.025);
      if (i < 3) {
        x.fillStyle = '#2f5ba8';
        x.beginPath();
        x.arc(w * 0.93, y + h * 0.03, h * 0.018, 0, 7);
        x.fill();
      }
    }
    return c;
  };
  var vitalsC = null;
  P.vitals = function (w, h, t) {
    var c = vitalsC && vitalsC.width === w ? vitalsC : (vitalsC = cv(w, h)), x = c.getContext('2d');
    x.fillStyle = '#071009';
    x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(73,240,143,.12)';
    x.lineWidth = 1;
    for (var gx = 0; gx < w; gx += w / 10) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, h); x.stroke(); }
    var head = ((t || 0) / 2200) % 1;
    x.lineWidth = Math.max(2, h * 0.025);
    x.strokeStyle = '#49f08f';
    x.beginPath();
    for (var i = 0; i <= 120; i++) {
      var u = i / 120;
      if (Math.abs(u - head) < 0.04) { x.stroke(); x.beginPath(); continue; }
      var ph = (u * 3) % 1;
      var yv = 0.36 - (ph > 0.42 && ph < 0.46 ? 0.18 : ph >= 0.46 && ph < 0.5 ? -0.2 : ph >= 0.5 && ph < 0.53 ? 0.06 : 0);
      if (i === 0) x.moveTo(u * w * 0.78, yv * h);
      else x.lineTo(u * w * 0.78, yv * h);
    }
    x.stroke();
    x.strokeStyle = '#49c8f0';
    x.beginPath();
    for (var k = 0; k <= 60; k++) {
      var v = k / 60;
      var yy = 0.72 - Math.max(0, Math.sin(v * Math.PI * 6)) * 0.12;
      if (k === 0) x.moveTo(v * w * 0.78, yy * h);
      else x.lineTo(v * w * 0.78, yy * h);
    }
    x.stroke();
    text(x, '72', w * 0.96, h * 0.24, '800 ' + Math.round(h * 0.24) + 'px ' + DISPLAY, '#49f08f', 'right');
    text(x, '98', w * 0.96, h * 0.66, '800 ' + Math.round(h * 0.2) + 'px ' + DISPLAY, '#49c8f0', 'right');
    text(x, 'BED 6', w * 0.04, h * 0.9, '700 ' + Math.round(h * 0.09) + 'px ' + BODY, 'rgba(73,240,143,.7)');
    return c;
  };
  P.digits = function (w, h, s) {
    var c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#0b0b0c';
    x.fillRect(0, 0, w, h);
    x.shadowColor = 'rgba(255,110,60,.9)';
    x.shadowBlur = h * 0.15;
    text(x, s, w / 2, h * 0.54, '800 ' + Math.round(h * 0.68) + 'px ' + DISPLAY, '#ff7d45', 'center');
    return c;
  };
  P.clock = function (w, h, hh, mm) {
    var c = cv(w, h), x = c.getContext('2d'), r = w / 2;
    x.fillStyle = '#f4f1e8';
    x.beginPath();
    x.arc(r, r, r * 0.94, 0, 7);
    x.fill();
    ink(x, r * 0.09);
    x.stroke();
    for (var i = 0; i < 12; i++) {
      var a = (i / 12) * Math.PI * 2;
      ink(x, i % 3 ? r * 0.025 : r * 0.05);
      x.beginPath();
      x.moveTo(r + Math.sin(a) * r * 0.72, r - Math.cos(a) * r * 0.72);
      x.lineTo(r + Math.sin(a) * r * 0.82, r - Math.cos(a) * r * 0.82);
      x.stroke();
    }
    var ah = ((hh % 12) + mm / 60) / 12 * Math.PI * 2, am = (mm / 60) * Math.PI * 2;
    ink(x, r * 0.08);
    x.beginPath(); x.moveTo(r, r); x.lineTo(r + Math.sin(ah) * r * 0.45, r - Math.cos(ah) * r * 0.45); x.stroke();
    ink(x, r * 0.05);
    x.beginPath(); x.moveTo(r, r); x.lineTo(r + Math.sin(am) * r * 0.66, r - Math.cos(am) * r * 0.66); x.stroke();
    x.fillStyle = '#d9443a';
    x.beginPath(); x.arc(r, r, r * 0.06, 0, 7); x.fill();
    return c;
  };

  /* --- paper --- */
  P.ticket = function (w, h, a, b, seed) {
    var c = cv(w, h), x = c.getContext('2d'), R = rng(seed || 1);
    x.fillStyle = '#f6f2e6';
    x.fillRect(0, 0, w, h);
    // torn bottom edge
    x.fillStyle = 'rgba(0,0,0,0)';
    x.clearRect(0, h - 6, w, 6);
    x.fillStyle = '#f6f2e6';
    x.beginPath();
    x.moveTo(0, h - 6);
    for (var i = 0; i <= 10; i++) x.lineTo((i / 10) * w, h - (i % 2 ? 1 : 6));
    x.lineTo(w, h - 6);
    x.fill();
    text(x, a, w * 0.08, h * 0.12, '800 ' + Math.round(w * 0.2) + 'px ' + MONO, '#1e1e1e');
    x.fillStyle = '#1e1e1e';
    x.fillRect(w * 0.08, h * 0.2, w * 0.84, 1.5);
    var words = String(b).split(' ');
    var line = '', y = h * 0.3;
    words.forEach(function (wd) {
      if ((line + ' ' + wd).trim().length > 9) {
        text(x, line.trim(), w * 0.08, y, '700 ' + Math.round(w * 0.14) + 'px ' + MONO, '#1e1e1e');
        y += h * 0.1;
        line = wd;
      } else line += ' ' + wd;
    });
    text(x, line.trim(), w * 0.08, y, '700 ' + Math.round(w * 0.14) + 'px ' + MONO, '#1e1e1e');
    x.fillStyle = 'rgba(0,0,0,.2)';
    for (var k = 0; k < 3; k++) x.fillRect(w * 0.08, h * (0.62 + k * 0.08), w * (0.5 + R() * 0.34), 2.5);
    if (R() < 0.4) {
      x.strokeStyle = 'rgba(200,40,30,.7)';
      x.lineWidth = 3;
      x.beginPath();
      x.arc(w * 0.75, h * 0.14, w * 0.14, 0, 7);
      x.stroke();
    }
    return c;
  };
  P.sheet = function (w, h, o) {
    var c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = o.paper || '#f6f3ea';
    x.fillRect(0, 0, w, h);
    if (o.clip) {
      rr(x, '#7a5a3a', 0, 0, w, h, w * 0.04);
      x.fillStyle = o.paper || '#f6f3ea';
      x.fillRect(w * 0.07, h * 0.08, w * 0.86, h * 0.88);
      rr(x, '#b9bec2', w * 0.3, -h * 0.01, w * 0.4, h * 0.08, 4);
    }
    var y = h * (o.clip ? 0.16 : 0.08);
    text(x, o.title, w * 0.12, y, '800 ' + Math.round(h * 0.075) + 'px ' + DISPLAY, o.titleCol || INK);
    y += h * 0.09;
    (o.lines || []).forEach(function (l, i) {
      if (l === '-') {
        x.fillStyle = 'rgba(0,0,0,.18)';
        x.fillRect(w * 0.12, y - 2, w * 0.76, 2);
        y += h * 0.05;
        return;
      }
      text(x, l, w * 0.12, y, (o.bold && o.bold(i) ? '800 ' : '600 ') + Math.round(h * (o.fs || 0.052)) + 'px ' + (o.mono ? MONO : BODY), o.col || '#26292c', 'left', w * 0.8);
      if (o.mark && o.mark(i)) {
        x.fillStyle = o.markCol || '#d9443a';
        x.fillRect(w * 0.12, y + h * 0.028, Math.min(w * 0.76, x.measureText(l).width), 2.5);
      }
      y += h * (o.lh || 0.075);
    });
    if (o.sign) {
      text(x, o.sign, w * 0.12, h * 0.9, 'italic 600 ' + Math.round(h * 0.05) + 'px ' + BODY, '#4a4a4a');
      ink(x, 1.5);
      x.beginPath();
      x.moveTo(w * 0.42, h * 0.92);
      x.lineTo(w * 0.86, h * 0.92);
      x.stroke();
    }
    return c;
  };
  P.board = function (w, h, title, rows) {
    var c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#9aa3a6';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#fbfbf8';
    x.fillRect(w * 0.025, h * 0.04, w * 0.95, h * 0.92);
    text(x, title, w * 0.05, h * 0.13, '800 ' + Math.round(h * 0.12) + 'px ' + DISPLAY, '#1f3e86');
    var cols = ['#1f3e86', '#c0392b', '#1f7a4d'];
    rows.forEach(function (r, i) {
      var col = i % 2, row = Math.floor(i / 2);
      var X = w * (0.05 + col * 0.48), Y = h * (0.32 + row * 0.2);
      text(x, r[0], X, Y, '800 ' + Math.round(h * 0.08) + 'px ' + DISPLAY, '#26292c');
      var off = x.measureText(r[0]).width + w * 0.02;
      text(x, r[1], X + off, Y, '600 ' + Math.round(h * 0.07) + 'px ' + BODY, cols[i % 3], 'left', w * 0.44 - off);
    });
    x.fillStyle = '#d9443a';
    x.fillRect(w * 0.84, h * 0.05, w * 0.12, h * 0.06);
    return c;
  };
  P.label = function (w, h, s, bg, fg) {
    var c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = bg || '#f4f1e8';
    x.fillRect(0, 0, w, h);
    text(x, s, w / 2, h / 2, '800 ' + Math.round(h * 0.42) + 'px ' + DISPLAY, fg || INK, 'center', w * 0.9);
    return c;
  };
  P.sign = function (w, h, lines, bg, fg, border) {
    var c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = bg;
    x.fillRect(0, 0, w, h);
    if (border) {
      x.strokeStyle = fg;
      x.lineWidth = h * 0.05;
      x.strokeRect(h * 0.08, h * 0.08, w - h * 0.16, h - h * 0.16);
    }
    var n = lines.length;
    lines.forEach(function (l, i) {
      text(x, l, w / 2, h * ((i + 1) / (n + 1)), '900 ' + Math.round((h / (n + 1)) * 0.8) + 'px ' + DISPLAY, fg, 'center', w * 0.86);
    });
    return c;
  };
  P.calls = function (w, h, on) {
    var c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#23282c';
    x.fillRect(0, 0, w, h);
    for (var i = 0; i < 8; i++) {
      var X = w * (0.04 + i * 0.12);
      var lit = i + 1 === on;
      rr(x, lit ? '#ff6a4a' : '#3a4045', X, h * 0.2, w * 0.1, h * 0.6, 4);
      text(x, String(i + 1), X + w * 0.05, h * 0.5, '800 ' + Math.round(h * 0.36) + 'px ' + DISPLAY, lit ? '#fff' : '#9aa0a5', 'center');
    }
    return c;
  };
  P.photo = function (w, h) {
    var c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#ece6d8';
    x.fillRect(0, 0, w, h);
    var m = w * 0.1;
    var g = x.createLinearGradient(0, m, 0, h - m);
    g.addColorStop(0, '#7fc4e6');
    g.addColorStop(0.55, '#bfe3f0');
    x.fillStyle = g;
    x.fillRect(m, m, w - 2 * m, h - 2 * m);
    x.fillStyle = '#2f84b0';
    x.fillRect(m, h * 0.55, w - 2 * m, h * 0.18);
    x.fillStyle = '#e7d29a';
    x.fillRect(m, h * 0.73, w - 2 * m, h * 0.27 - m);
    x.fillStyle = '#ffd36b';
    x.beginPath();
    x.arc(w * 0.7, h * 0.32, h * 0.1, 0, 7);
    x.fill();
    // two tiny people
    x.fillStyle = INK;
    [[0.35, 0.72], [0.42, 0.73]].forEach(function (p) {
      x.fillRect(w * p[0], h * (p[1] - 0.12), w * 0.03, h * 0.12);
      x.beginPath();
      x.arc(w * (p[0] + 0.015), h * (p[1] - 0.15), w * 0.022, 0, 7);
      x.fill();
    });
    ink(x, 3);
    x.strokeRect(m, m, w - 2 * m, h - 2 * m);
    return c;
  };
  P.print = function (w, h, lines) {
    var c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#f2ead6';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#d9583a';
    x.beginPath();
    x.arc(w / 2, h * 0.32, w * 0.2, Math.PI, 0);
    x.fill();
    x.fillRect(w * 0.18, h * 0.32, w * 0.64, 3);
    lines.forEach(function (l, i) {
      text(x, l, w / 2, h * (0.52 + i * 0.13), '900 ' + Math.round(h * 0.1) + 'px ' + DISPLAY, i === 1 ? '#d9583a' : INK, 'center', w * 0.86);
    });
    ink(x, w * 0.05);
    x.strokeRect(0, 0, w, h);
    return c;
  };
  P.notice = function (w, h, seed) {
    var c = cv(w, h), x = c.getContext('2d'), R = rng(seed || 9);
    x.fillStyle = '#b48a5a';
    x.fillRect(0, 0, w, h);
    for (var k = 0; k < 600; k++) {
      x.fillStyle = 'rgba(60,35,10,' + R() * 0.2 + ')';
      x.fillRect(R() * w, R() * h, 2, 2);
    }
    var papers = ['#f6f3ea', '#fff4a8', '#cfe8ff', '#f6f3ea', '#ffd1d1', '#f6f3ea'];
    for (var i = 0; i < 6; i++) {
      var pw = w * (0.22 + R() * 0.1), ph = h * (0.28 + R() * 0.12);
      var X = w * (0.04 + (i % 3) * 0.32) + R() * 6, Y = h * (0.06 + Math.floor(i / 3) * 0.48) + R() * 6;
      x.save();
      x.translate(X + pw / 2, Y + ph / 2);
      x.rotate((R() - 0.5) * 0.12);
      x.fillStyle = papers[i];
      x.fillRect(-pw / 2, -ph / 2, pw, ph);
      x.fillStyle = 'rgba(0,0,0,.25)';
      for (var l = 0; l < 4; l++) x.fillRect(-pw * 0.38, -ph * 0.25 + l * ph * 0.16, pw * (0.5 + R() * 0.25), 2);
      x.fillStyle = ['#d9443a', '#2f5ba8', '#f2a84b'][i % 3];
      x.beginPath();
      x.arc(0, -ph * 0.42, 4, 0, 7);
      x.fill();
      x.restore();
    }
    ink(x, 4);
    x.strokeRect(0, 0, w, h);
    return c;
  };

  /* --- furniture fronts --- */
  P.door = function (w, h, o) {
    var c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = o.base;
    x.fillRect(0, 0, w, h);
    ink(x, 3);
    x.globalAlpha = 0.5;
    x.strokeRect(w * 0.12, h * 0.06, w * 0.76, h * 0.38);
    x.strokeRect(w * 0.12, h * 0.52, w * 0.76, h * 0.42);
    x.globalAlpha = 1;
    rr(x, '#9a9da1', w * (o.left ? 0.08 : 0.74), h * 0.5, w * 0.18, h * 0.025, 4);
    ink(x, 2);
    x.stroke();
    return c;
  };
  P.wdoor = function (w, h) {
    var c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#c9d6d1';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#7f908b';
    x.fillRect(0, h * 0.86, w, h * 0.14);
    x.fillStyle = '#b5c9e0';
    x.beginPath();
    x.arc(w / 2, h * 0.3, w * 0.22, 0, 7);
    x.fill();
    ink(x, 4);
    x.stroke();
    x.fillStyle = 'rgba(255,255,255,.45)';
    x.fillRect(w * 0.38, h * 0.22, w * 0.06, h * 0.08);
    rr(x, '#9a9da1', w * 0.08, h * 0.48, w * 0.84, h * 0.03, 4);
    ink(x, 2);
    x.stroke();
    return c;
  };
  P.wardrobe = function (w, h) {
    var c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#6a5c50';
    x.fillRect(0, 0, w, h);
    ink(x, 3);
    x.strokeRect(w * 0.03, h * 0.02, w * 0.46, h * 0.96);
    x.strokeRect(w * 0.51, h * 0.02, w * 0.46, h * 0.96);
    // a mirror on the left door
    var g = x.createLinearGradient(0, 0, w * 0.4, h);
    g.addColorStop(0, '#8fa3b5');
    g.addColorStop(0.5, '#5d6f82');
    g.addColorStop(1, '#3d4a58');
    x.fillStyle = g;
    x.fillRect(w * 0.09, h * 0.08, w * 0.34, h * 0.6);
    x.strokeStyle = 'rgba(255,255,255,.4)';
    x.lineWidth = 3;
    x.beginPath(); x.moveTo(w * 0.14, h * 0.2); x.lineTo(w * 0.24, h * 0.12); x.stroke();
    x.beginPath(); x.moveTo(w * 0.14, h * 0.3); x.lineTo(w * 0.32, h * 0.16); x.stroke();
    ink(x, 3);
    x.strokeRect(w * 0.09, h * 0.08, w * 0.34, h * 0.6);
    x.fillStyle = '#c9c3b8';
    x.fillRect(w * 0.45, h * 0.46, w * 0.02, h * 0.08);
    x.fillRect(w * 0.53, h * 0.46, w * 0.02, h * 0.08);
    return c;
  };
  P.drawers = function (w, h, n, col) {
    var c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = col;
    x.fillRect(0, 0, w, h);
    for (var i = 0; i < n; i++) {
      var Y = h * (0.05 + (i * 0.9) / n);
      ink(x, 2.5);
      x.globalAlpha = 0.6;
      x.strokeRect(w * 0.06, Y, w * 0.88, (h * 0.9) / n - h * 0.03);
      x.globalAlpha = 1;
      rr(x, '#c9c3b8', w * 0.4, Y + (h * 0.9) / n / 2 - h * 0.02, w * 0.2, h * 0.03, 3);
    }
    return c;
  };
  P.stove = function (w, h) {
    var c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#5a6066';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#2a2d30';
    x.fillRect(0, 0, w, h * 0.16);
    for (var k = 0; k < 6; k++) {
      x.fillStyle = '#c9cdd0';
      x.beginPath();
      x.arc(w * (0.1 + k * 0.16), h * 0.08, h * 0.05, 0, 7);
      x.fill();
      ink(x, 1.5);
      x.stroke();
    }
    [0.04, 0.52].forEach(function (X) {
      ink(x, 3);
      x.strokeRect(w * X, h * 0.22, w * 0.44, h * 0.72);
      x.fillStyle = '#1b1d20';
      x.fillRect(w * (X + 0.05), h * 0.36, w * 0.34, h * 0.4);
      x.fillStyle = 'rgba(255,150,60,.18)';
      x.fillRect(w * (X + 0.05), h * 0.6, w * 0.34, h * 0.16);
      rr(x, '#b9bec2', w * (X + 0.04), h * 0.26, w * 0.36, h * 0.04, 4);
    });
    return c;
  };
  P.switchPlate = function (w, h, on, off) {
    var c = cv(w, h), x = c.getContext('2d');
    rr(x, '#e9e6de', 0, 0, w, h, w * 0.12);
    ink(x, w * 0.04);
    x.stroke();
    text(x, String(on || 'Work').toUpperCase(), w / 2, h * 0.12, '800 ' + Math.round(w * 0.13) + 'px ' + DISPLAY, '#5b5f63', 'center');
    text(x, String(off || 'Off').toUpperCase(), w / 2, h * 0.89, '800 ' + Math.round(w * 0.13) + 'px ' + DISPLAY, '#5b5f63', 'center');
    rr(x, '#cfcbc1', w * 0.24, h * 0.2, w * 0.52, h * 0.6, w * 0.06);
    ink(x, w * 0.025);
    x.stroke();
    return c;
  };
  P.rug = function (w, h) {
    var c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#7b4a43';
    x.fillRect(0, 0, w, h);
    x.strokeStyle = '#e3c58f';
    x.lineWidth = w * 0.02;
    x.strokeRect(w * 0.06, h * 0.08, w * 0.88, h * 0.84);
    x.lineWidth = w * 0.008;
    x.strokeRect(w * 0.1, h * 0.14, w * 0.8, h * 0.72);
    x.fillStyle = '#e3c58f';
    for (var i = 0; i < 5; i++) {
      x.save();
      x.translate(w * (0.2 + i * 0.15), h / 2);
      x.rotate(Math.PI / 4);
      x.fillRect(-w * 0.03, -w * 0.03, w * 0.06, w * 0.06);
      x.restore();
    }
    return c;
  };
  P.hatch = function (w, h) {
    var c = cv(w, h), x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#22160d');
    g.addColorStop(1, '#3b2614');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    // the empty restaurant: chairs up on tables, warm pendants
    for (var i = 0; i < 3; i++) {
      var X = w * (0.18 + i * 0.32);
      var rg = x.createRadialGradient(X, h * 0.25, 2, X, h * 0.25, w * 0.18);
      rg.addColorStop(0, 'rgba(255,200,120,.9)');
      rg.addColorStop(1, 'rgba(255,200,120,0)');
      x.fillStyle = rg;
      x.fillRect(X - w * 0.2, 0, w * 0.4, h * 0.7);
      x.fillStyle = '#120b06';
      x.fillRect(X - w * 0.1, h * 0.62, w * 0.2, h * 0.04);
      x.fillRect(X - w * 0.08, h * 0.66, w * 0.015, h * 0.3);
      x.fillRect(X + w * 0.065, h * 0.66, w * 0.015, h * 0.3);
      // chair upside down on the table
      x.fillRect(X - w * 0.05, h * 0.46, w * 0.1, h * 0.03);
      x.fillRect(X - w * 0.05, h * 0.36, w * 0.012, h * 0.1);
      x.fillRect(X + w * 0.038, h * 0.36, w * 0.012, h * 0.1);
    }
    return c;
  };
  P.chev = function (w, h) {
    var c = cv(w, h), x = c.getContext('2d');
    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.strokeStyle = INK;
    x.lineWidth = w * 0.2;
    x.beginPath();
    x.moveTo(w * 0.18, h * 0.66); x.lineTo(w * 0.5, h * 0.34); x.lineTo(w * 0.82, h * 0.66);
    x.stroke();
    x.strokeStyle = '#f2a84b';
    x.lineWidth = w * 0.12;
    x.stroke();
    return c;
  };
  P.arrow = function (w, h) {
    var c = cv(w, h), x = c.getContext('2d');
    x.beginPath();
    x.moveTo(w * 0.5, h * 0.95);
    x.lineTo(w * 0.1, h * 0.5);
    x.lineTo(w * 0.32, h * 0.5);
    x.lineTo(w * 0.32, h * 0.05);
    x.lineTo(w * 0.68, h * 0.05);
    x.lineTo(w * 0.68, h * 0.5);
    x.lineTo(w * 0.9, h * 0.5);
    x.closePath();
    x.fillStyle = '#f2a84b';
    x.fill();
    ink(x, w * 0.07);
    x.stroke();
    return c;
  };
  P.glow = function (w) {
    var c = cv(w, w), x = c.getContext('2d');
    var g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, w, w);
    return c;
  };
  P.leaf = function (w, h, col) {
    var c = cv(w, h), x = c.getContext('2d');
    x.beginPath();
    x.moveTo(w * 0.5, h * 0.98);
    x.bezierCurveTo(w * 0.02, h * 0.7, w * 0.08, h * 0.2, w * 0.5, h * 0.02);
    x.bezierCurveTo(w * 0.92, h * 0.2, w * 0.98, h * 0.7, w * 0.5, h * 0.98);
    x.fillStyle = col || '#3f7a4c';
    x.fill();
    ink(x, w * 0.05);
    x.stroke();
    x.strokeStyle = 'rgba(13,15,20,.6)';
    x.lineWidth = w * 0.03;
    x.beginPath();
    x.moveTo(w * 0.5, h * 0.95);
    x.quadraticCurveTo(w * 0.46, h * 0.5, w * 0.5, h * 0.1);
    x.stroke();
    return c;
  };
  P.badge = function (w, h, label) {
    var c = cv(w, h), x = c.getContext('2d');
    rr(x, '#f6f3ea', 0, 0, w, h, w * 0.08);
    x.fillStyle = '#2f5ba8';
    x.fillRect(0, 0, w, h * 0.25);
    text(x, label || 'STAFF', w / 2, h * 0.13, '800 ' + Math.round(h * 0.14) + 'px ' + DISPLAY, '#fff', 'center', w * 0.9);
    x.fillStyle = '#9aa3a6';
    x.fillRect(w * 0.1, h * 0.34, w * 0.3, h * 0.36);
    x.fillStyle = 'rgba(0,0,0,.4)';
    x.fillRect(w * 0.5, h * 0.4, w * 0.4, h * 0.06);
    x.fillRect(w * 0.5, h * 0.54, w * 0.3, h * 0.05);
    ink(x, 2);
    x.strokeRect(1, 1, w - 2, h - 2);
    return c;
  };


  /* --- the depot --- */
  P.concrete = function (o) {
    var c = cv(512, 512), x = c.getContext('2d'), R = rng(o.seed || 31);
    x.fillStyle = o.base || '#5d6062';
    x.fillRect(0, 0, 512, 512);
    for (var i = 0; i < 2600; i++) {
      x.fillStyle = R() > 0.5 ? 'rgba(255,255,255,' + R() * 0.07 + ')' : 'rgba(0,0,0,' + R() * 0.1 + ')';
      x.fillRect(R() * 512, R() * 512, 1 + R() * 2, 1 + R() * 2);
    }
    for (var k = 0; k < 5; k++) {
      var g = x.createRadialGradient(R() * 512, R() * 512, 2, 0, 0, 1);
      var cx = R() * 512, cy = R() * 512, rr2 = 20 + R() * 60;
      g = x.createRadialGradient(cx, cy, 2, cx, cy, rr2);
      g.addColorStop(0, 'rgba(10,10,12,.32)');
      g.addColorStop(1, 'rgba(10,10,12,0)');
      x.fillStyle = g;
      x.fillRect(cx - rr2, cy - rr2, rr2 * 2, rr2 * 2);
    }
    x.strokeStyle = 'rgba(0,0,0,.35)';
    x.lineWidth = 2;
    x.strokeRect(1, 1, 510, 510);
    return c;
  };
  P.hazard = function () {
    var c = cv(128, 128), x = c.getContext('2d');
    x.fillStyle = '#e1b229';
    x.fillRect(0, 0, 128, 128);
    x.fillStyle = '#16171a';
    for (var i = -2; i < 4; i++) {
      x.beginPath();
      x.moveTo(i * 64, 128);
      x.lineTo(i * 64 + 32, 128);
      x.lineTo(i * 64 + 160, 0);
      x.lineTo(i * 64 + 128, 0);
      x.closePath();
      x.fill();
    }
    return c;
  };
  P.slats = function (o) {
    var c = cv(256, 256), x = c.getContext('2d');
    x.fillStyle = o.base || '#7b8285';
    x.fillRect(0, 0, 256, 256);
    for (var y = 0; y < 256; y += 32) {
      x.fillStyle = 'rgba(255,255,255,.12)';
      x.fillRect(0, y + 3, 256, 5);
      x.fillStyle = 'rgba(0,0,0,.28)';
      x.fillRect(0, y + 24, 256, 8);
      x.fillStyle = 'rgba(13,15,20,.8)';
      x.fillRect(0, y + 30, 256, 2);
    }
    return c;
  };
  P.parcel = function (w, h, seed) {
    var c = cv(w, h), x = c.getContext('2d'), R = rng(seed || 2);
    x.fillStyle = ['#b07f4f', '#a27449', '#bb8b58'][seed % 3];
    x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(230,214,170,.6)';
    x.fillRect(w * 0.44, 0, w * 0.12, h);
    x.fillStyle = '#f2efe6';
    var lx = w * (0.1 + R() * 0.3), ly = h * (0.2 + R() * 0.3);
    x.fillRect(lx, ly, w * 0.36, h * 0.3);
    x.fillStyle = INK;
    for (var i = 0; i < 4; i++) x.fillRect(lx + w * 0.03, ly + h * (0.05 + i * 0.06), w * (0.12 + R() * 0.18), 2);
    for (var b = 0; b < 12; b++) x.fillRect(lx + w * 0.03 + b * w * 0.022, ly + h * 0.24, R() < 0.5 ? 2 : 4, h * 0.04);
    ink(x, 3);
    x.strokeRect(0, 0, w, h);
    return c;
  };
  P.vanBack = function (w, h, plate) {
    var c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#e9ebe7';
    x.fillRect(0, 0, w, h);
    ink(x, 4);
    x.beginPath(); x.moveTo(w / 2, h * 0.04); x.lineTo(w / 2, h * 0.8); x.stroke();
    x.strokeRect(w * 0.04, h * 0.04, w * 0.92, h * 0.76);
    rr(x, '#9aa0a3', w * 0.42, h * 0.42, w * 0.06, h * 0.08, 3);
    rr(x, '#9aa0a3', w * 0.52, h * 0.42, w * 0.06, h * 0.08, 3);
    x.fillStyle = '#c0392b';
    x.fillRect(w * 0.02, h * 0.55, w * 0.06, h * 0.18);
    x.fillRect(w * 0.92, h * 0.55, w * 0.06, h * 0.18);
    x.fillStyle = '#2f5ba8';
    x.fillRect(0, h * 0.2, w, h * 0.07);
    text(x, 'ENDSHIFT LOGISTICS', w / 2, h * 0.235, '900 ' + Math.round(h * 0.05) + 'px ' + DISPLAY, '#fff', 'center');
    x.fillStyle = '#26292c';
    x.fillRect(0, h * 0.82, w, h * 0.18);
    rr(x, '#f4f2ea', w * 0.36, h * 0.86, w * 0.28, h * 0.08, 4);
    text(x, plate || 'ES 0041', w / 2, h * 0.9, '800 ' + Math.round(h * 0.06) + 'px ' + DISPLAY, INK, 'center');
    return c;
  };
  P.vanSide = function (w, h) {
    var c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#e9ebe7';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#2f5ba8';
    x.fillRect(0, h * 0.3, w, h * 0.12);
    text(x, 'ENDSHIFT', w * 0.5, h * 0.36, '900 ' + Math.round(h * 0.1) + 'px ' + DISPLAY, '#fff', 'center');
    ink(x, 4);
    x.strokeRect(w * 0.3, h * 0.08, w * 0.42, h * 0.7);
    x.fillStyle = '#26292c';
    x.fillRect(0, h * 0.84, w, h * 0.16);
    return c;
  };
  P.lockers = function (w, h, n) {
    var c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = '#56708a';
    x.fillRect(0, 0, w, h);
    for (var i = 0; i < n; i++) {
      var X = (i * w) / n;
      ink(x, 3);
      x.strokeRect(X + 3, 3, w / n - 6, h - 6);
      x.fillStyle = 'rgba(13,15,20,.55)';
      for (var k = 0; k < 4; k++) x.fillRect(X + w / n * 0.25, h * (0.08 + k * 0.03), w / n * 0.5, h * 0.012);
      rr(x, '#c9c3b8', X + w / n * 0.72, h * 0.45, w / n * 0.1, h * 0.08, 3);
      rr(x, '#f2efe6', X + w / n * 0.3, h * 0.22, w / n * 0.4, h * 0.05, 2);
    }
    return c;
  };

  /* --- the story --- */
  P.street = function (w, h, seed) {
    var c = cv(w, h), x = c.getContext('2d'), R = rng(seed || 41);
    var g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0b1020');
    g.addColorStop(0.55, '#1a1622');
    g.addColorStop(1, '#2a1a14');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    // shopfronts going past, smeared by speed
    for (var i = 0; i < 9; i++) {
      var X = R() * w, Y = h * (0.45 + R() * 0.25), bw = w * (0.12 + R() * 0.2), bh = h * (0.12 + R() * 0.2);
      x.fillStyle = ['rgba(255,190,110,.55)', 'rgba(150,200,255,.35)', 'rgba(255,120,90,.4)'][i % 3];
      x.fillRect(X, Y, bw, bh);
      x.fillStyle = 'rgba(255,255,255,.08)';
      x.fillRect(X - bw * 0.5, Y + bh * 0.3, bw * 2, bh * 0.15);
    }
    // street lights
    for (var k = 0; k < 7; k++) {
      var sx = (k / 6) * w + R() * 20, sy = h * (0.12 + R() * 0.12), rr2 = h * (0.06 + R() * 0.05);
      var rg = x.createRadialGradient(sx, sy, 0, sx, sy, rr2 * 2.4);
      rg.addColorStop(0, 'rgba(255,200,120,.95)');
      rg.addColorStop(0.25, 'rgba(255,170,80,.45)');
      rg.addColorStop(1, 'rgba(255,170,80,0)');
      x.fillStyle = rg;
      x.fillRect(sx - rr2 * 2.4, sy - rr2 * 2.4, rr2 * 4.8, rr2 * 4.8);
    }
    // rain on the glass
    x.strokeStyle = 'rgba(220,230,255,.22)';
    x.lineWidth = 1.5;
    for (var d = 0; d < 60; d++) {
      var dx = R() * w, dy = R() * h;
      x.beginPath();
      x.moveTo(dx, dy);
      x.lineTo(dx - 6, dy + 14 + R() * 18);
      x.stroke();
    }
    return c;
  };
  P.mirror = function (w, h) {
    var c = cv(w, h), x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#9fb2c2');
    g.addColorStop(0.5, '#5d6f82');
    g.addColorStop(1, '#3a4656');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(255,255,255,.4)';
    x.lineWidth = w * 0.03;
    x.beginPath(); x.moveTo(w * 0.2, h * 0.3); x.lineTo(w * 0.45, h * 0.12); x.stroke();
    x.beginPath(); x.moveTo(w * 0.2, h * 0.45); x.lineTo(w * 0.62, h * 0.16); x.stroke();
    return c;
  };
  P.phoneScreen = function (w, h, o) {
    var c = cv(w, h), x = c.getContext('2d');
    x.fillStyle = o.bg || '#101a2c';
    x.fillRect(0, 0, w, h);
    if (o.ad) {
      x.fillStyle = '#f2ead6';
      x.fillRect(w * 0.06, h * 0.16, w * 0.88, h * 0.62);
      text(x, o.ad[0], w * 0.5, h * 0.32, '900 ' + Math.round(w * 0.13) + 'px ' + DISPLAY, INK, 'center', w * 0.8);
      text(x, o.ad[1], w * 0.5, h * 0.44, '900 ' + Math.round(w * 0.13) + 'px ' + DISPLAY, '#d9583a', 'center', w * 0.8);
      rr(x, '#2f5ba8', w * 0.2, h * 0.56, w * 0.6, h * 0.08, 6);
      text(x, o.ad[2], w * 0.5, h * 0.6, '800 ' + Math.round(w * 0.07) + 'px ' + BODY, '#fff', 'center', w * 0.55);
      text(x, o.ad[3], w * 0.5, h * 0.73, '600 ' + Math.round(w * 0.045) + 'px ' + BODY, '#6a665e', 'center', w * 0.8);
      text(x, o.sponsored || 'Sponsored', w * 0.08, h * 0.1, '700 ' + Math.round(w * 0.055) + 'px ' + BODY, '#9fb2cc');
    }
    if (o.note) {
      rr(x, 'rgba(255,255,255,.14)', w * 0.06, h * 0.08, w * 0.88, h * 0.16, 10);
      text(x, o.note[0], w * 0.12, h * 0.13, '800 ' + Math.round(w * 0.06) + 'px ' + BODY, '#9fc0ff');
      text(x, o.note[1], w * 0.12, h * 0.19, '600 ' + Math.round(w * 0.065) + 'px ' + BODY, '#eef3ff', 'left', w * 0.76);
    }
    return c;
  };
  P.jarLabel = function (o) {
    var c = cv(1024, 480), x = c.getContext('2d');
    // the label wraps the front of the jar: centred at u = 0.5
    var L = 320, R = 704, T = 110, B = 400;
    x.fillStyle = '#efebe1';
    x.fillRect(L, T, R - L, B - T);
    x.fillStyle = '#f2a84b';
    x.beginPath();
    x.arc(L + 44, T + 66, 26, Math.PI, 0);
    x.fill();
    x.fillStyle = '#141617';
    x.fillRect(L + 14, T + 68, 60, 4);
    text(x, 'ENDSHIFT', R - 20, T + 54, '800 30px ' + DISPLAY, '#141617', 'right');
    text(x, 'RESET', (L + R) / 2, T + 170, '900 150px ' + DISPLAY, '#141617', 'center', R - L - 40);
    x.fillStyle = 'rgba(20,22,23,.25)';
    x.fillRect(L + 20, T + 238, R - L - 40, 2);
    text(x, o.line1 || 'EVENING CAPSULE', L + 20, T + 262, '700 22px ' + DISPLAY, '#141617');
    text(x, o.line2 || 'CONCEPT · NOT FOR SALE', L + 20, T + 284, '700 20px ' + DISPLAY, '#6a665e');
    return c;
  };

  /* The RESET jar, direction C ("Off switch"): its printed front, the switch plate, the back and
     its box. Sizes are the jar's in cm × 100 (front and back 7.2 × 10.4 cm, the plate 2.5 × 3.9). */
  function sunMark(x, cx, cy, r) {
    x.fillStyle = '#f2a84b';
    x.beginPath();
    x.arc(cx, cy, r, Math.PI, 0);
    x.fill();
    x.fillStyle = '#1b1c1e';
    x.fillRect(cx - r * 1.14, cy + r * 0.16, r * 2.28, r * 0.24);
  }
  function spaced(x, s, X, Y, font, col, align, sp) {
    x.font = font;
    x.fillStyle = col;
    x.textBaseline = 'middle';
    if ('letterSpacing' in x) { x.letterSpacing = sp + 'px'; x.textAlign = align || 'left'; x.fillText(s, X, Y); x.letterSpacing = '0px'; return; }
    x.textAlign = align || 'left';
    x.fillText(s.split('').join(String.fromCharCode(8202)), X, Y);
  }
  P.cJarFront = function (o) {
    o = o || {};
    var c = cv(720, 1040), x = c.getContext('2d');
    x.fillStyle = '#efe8da';
    x.fillRect(0, 0, 720, 1040);
    // the brand at the top
    sunMark(x, 74, 132, 34);
    text(x, 'ENDSHIFT', 124, 132, '800 52px ' + DISPLAY, '#1b1c1e');
    spaced(x, o.kind || 'EVENING CAPSULE', 684, 214, '700 22px ' + DISPLAY, '#4a4740', 'right', 3);
    // (the switch plate stands on the left: x 40–290, y 355–745; it is the jar's own part)
    // RESET, and what it means
    x.save();
    x.translate(492, 540);
    var big = '900 210px ' + DISPLAY;
    x.font = big;
    var w = x.measureText('RESET').width, k = Math.min(1, 370 / w);
    x.scale(k, 1);
    text(x, 'RESET', 0, 0, big, '#1b1c1e', 'center');
    x.restore();
    text(x, o.tag || 'WORK: OFF.', 310, 690, '800 40px ' + DISPLAY, '#1b1c1e', 'left', 380);
    // the small print
    x.fillStyle = 'rgba(27,28,30,.55)';
    x.fillRect(40, 846, 640, 3);
    spaced(x, o.count || '30 CAPSULES · FOOD SUPPLEMENT', 40, 896, '700 25px ' + DISPLAY, '#1b1c1e', 'left', 3);
    spaced(x, o.concept || 'CONCEPT · NOT FOR SALE', 40, 948, '700 21px ' + DISPLAY, '#8a8478', 'left', 2);
    return c;
  };
  P.cJarPlate = function (o) {
    o = o || {};
    var c = cv(250, 390), x = c.getContext('2d');
    x.fillStyle = '#e7e0d1';
    x.fillRect(0, 0, 250, 390);
    x.strokeStyle = 'rgba(27,28,30,.18)';
    x.lineWidth = 3;
    x.strokeRect(10, 10, 230, 370);
    spaced(x, o.on || 'WORK', 125, 96, '800 34px ' + DISPLAY, '#3a3832', 'center', 3);
    spaced(x, o.off || 'OFF', 125, 330, '800 34px ' + DISPLAY, '#3a3832', 'center', 3);
    // the recess the rocker sits in
    rr(x, 'rgba(27,28,30,.22)', 66, 132, 118, 166, 10);
    return c;
  };
  P.cJarBack = function (o) {
    o = o || {};
    var c = cv(720, 1040), x = c.getContext('2d');
    x.fillStyle = '#efe8da';
    x.fillRect(0, 0, 720, 1040);
    text(x, o.line1 || 'YOUR SHIFT ENDED.', 40, 96, '900 66px ' + DISPLAY, '#1b1c1e', 'left', 640);
    text(x, o.line2 || "YOUR BRAIN DIDN'T.", 40, 166, '900 66px ' + DISPLAY, '#c9742f', 'left', 640);
    x.fillStyle = 'rgba(27,28,30,.55)';
    x.fillRect(40, 222, 640, 3);
    var rows = (o.rows || []).slice(0, 7);
    if (o.title) spaced(x, String(o.title).toUpperCase(), 40, 268, '800 28px ' + DISPLAY, '#1b1c1e', 'left', 2);
    rows.forEach(function (row, i) {
      var y = 326 + i * 62;
      text(x, String(row[0]).toUpperCase(), 40, y, '700 24px ' + DISPLAY, '#6a665e', 'left', 200);
      text(x, String(row[1]), 680, y, '600 25px ' + BODY, '#1b1c1e', 'right', 420);
      x.fillStyle = 'rgba(27,28,30,.14)';
      x.fillRect(40, y + 24, 640, 2);
    });
    // a code to the free ritual (a pattern, not a real code), and the small print
    var q = 150, qx = 40, qy = 800, R = rng(17);
    x.fillStyle = '#1b1c1e';
    for (var i = 0; i < 15; i++) for (var j = 0; j < 15; j++) if (R() > 0.52) x.fillRect(qx + i * 10, qy + j * 10, 10, 10);
    [[0, 0], [100, 0], [0, 100]].forEach(function (p) {
      x.fillStyle = '#efe8da'; x.fillRect(qx + p[0], qy + p[1], 50, 50);
      x.strokeStyle = '#1b1c1e'; x.lineWidth = 9; x.strokeRect(qx + p[0] + 4.5, qy + p[1] + 4.5, 41, 41);
      x.fillStyle = '#1b1c1e'; x.fillRect(qx + p[0] + 16, qy + p[1] + 16, 18, 18);
    });
    text(x, o.free || 'The free 20-minute ritual', 220, 840, '700 26px ' + BODY, '#1b1c1e', 'left', 460);
    text(x, o.url || 'endshift · free ritual', 220, 878, '600 22px ' + BODY, '#6a665e', 'left', 460);
    spaced(x, o.concept || 'CONCEPT · NOT FOR SALE', 220, 932, '700 21px ' + DISPLAY, '#8a8478', 'left', 2);
    return c;
  };
  // the jar's box: white card, the brand, RESET, sealed with amber WORK: OFF. tape
  P.cJarBox = function (o) {
    o = o || {};
    var c = cv(640, 1040), x = c.getContext('2d');
    x.fillStyle = '#f1ece2';
    x.fillRect(0, 0, 640, 1040);
    sunMark(x, 78, 150, 38);
    text(x, 'ENDSHIFT', 134, 150, '800 56px ' + DISPLAY, '#1b1c1e');
    x.save();
    x.translate(56, 560);
    var big = '900 230px ' + DISPLAY;
    x.font = big;
    var w = x.measureText('RESET').width, k = Math.min(1, 520 / w);
    x.scale(k, 1);
    text(x, 'RESET', 0, 0, big, '#1b1c1e', 'left');
    x.restore();
    text(x, o.tag || 'WORK: OFF.', 60, 700, '800 44px ' + DISPLAY, '#1b1c1e', 'left', 520);
    x.fillStyle = 'rgba(27,28,30,.5)';
    x.fillRect(60, 900, 520, 3);
    spaced(x, o.count || '30 CAPSULES · FOOD SUPPLEMENT', 60, 948, '700 25px ' + DISPLAY, '#1b1c1e', 'left', 3);
    return c;
  };
  P.cJarTape = function (o) {
    o = o || {};
    var c = cv(512, 64), x = c.getContext('2d');
    x.fillStyle = '#f2a84b';
    x.fillRect(0, 0, 512, 64);
    for (var i = 0; i < 4; i++) spaced(x, o.tag || 'WORK: OFF.', 20 + i * 128, 33, '800 26px ' + DISPLAY, '#1b1c1e', 'left', 2);
    return c;
  };

  /* The wall calendar in the hallway (and its full-screen twin in film.css: same proportions).
     o: { w, h (layout px), cw, ch (canvas px), title, sub, days[], times[], places[], imgs[],
     crossed (how many days have a red cross), ring (0–1 of the ring round the last day), tonight } */
  P.calendarLayout = function (w, h) {
    var mn = Math.min(w, h);
    var cols = w / h < 0.8 ? 2 : 3, rows = cols === 2 ? 3 : 2;
    var m = 0.04 * mn, rb = 0.055 * h, gap = 0.02 * mn;
    var gt = 0.215 * h;
    var cw = (w - 2 * m - gap * (cols - 1)) / cols, chh = (h - gt - m - gap * (rows - 1)) / rows;
    var cells = [];
    for (var i = 0; i < cols * rows; i++) {
      var cx = i % cols, cy = Math.floor(i / cols);
      cells.push({ x: m + cx * (cw + gap), y: gt + cy * (chh + gap), w: cw, h: chh });
    }
    return { cols: cols, rows: rows, m: m, rb: rb, gap: gap, gt: gt, cells: cells, title: Math.min(0.06 * h, 0.075 * w), sub: Math.min(0.026 * h, 0.04 * w), dow: Math.min(0.024 * h, 0.04 * w), time: Math.min(0.019 * h, 0.032 * w) };
  };
  P.calendar = function (o) {
    var w = o.w, h = o.h;
    var c = cv(o.cw || w, o.ch || h), x = c.getContext('2d');
    x.scale(c.width / w, c.height / h);
    var L = P.calendarLayout(w, h);
    var mn = Math.min(w, h);
    // paper
    x.fillStyle = '#f1e8d0';
    x.fillRect(0, 0, w, h);
    var r = rng(17);
    x.fillStyle = 'rgba(120,96,60,.07)';
    for (var g = 0; g < 900; g++) x.fillRect(r() * w, r() * h, 1.2, 1.2);
    // the binding: a dark strip, a row of rings
    x.fillStyle = '#2a2622';
    x.fillRect(0, 0, w, L.rb);
    var n = Math.max(6, Math.round(w / (L.rb * 1.4)));
    for (var k = 0; k < n; k++) {
      var rx = ((k + 0.5) / n) * w;
      x.fillStyle = '#0d0f14';
      x.beginPath();
      x.ellipse(rx, L.rb * 0.62, L.rb * 0.16, L.rb * 0.2, 0, 0, Math.PI * 2);
      x.fill();
      x.strokeStyle = '#b9b2a4';
      x.lineWidth = Math.max(1.5, L.rb * 0.07);
      x.beginPath();
      x.moveTo(rx, L.rb * 0.62);
      x.lineTo(rx, -2);
      x.stroke();
    }
    // the heading
    text(x, String(o.title || '').toUpperCase(), L.m, L.rb + L.m * 0.6 + L.title * 0.55, '900 ' + L.title.toFixed(1) + 'px ' + DISPLAY, INK, 'left', w - 2 * L.m);
    text(x, o.sub || '', L.m, L.rb + L.m * 0.6 + L.title * 1.12 + L.sub * 0.7, '700 ' + L.sub.toFixed(1) + 'px ' + BODY, '#4a443b', 'left', w - 2 * L.m);
    // the days
    var bw = Math.max(1.5, 0.004 * mn);
    L.cells.forEach(function (cl, i) {
      if (i >= (o.days || []).length) return;
      x.fillStyle = '#1b1d22';
      x.fillRect(cl.x, cl.y, cl.w, cl.h);
      var im = o.imgs && o.imgs[i];
      if (im && im.width > 2) {
        // cover
        var s = Math.max(cl.w / im.width, cl.h / im.height);
        var iw = im.width * s, ih = im.height * s;
        x.save();
        x.beginPath();
        x.rect(cl.x, cl.y, cl.w, cl.h);
        x.clip();
        x.drawImage(im, cl.x + (cl.w - iw) / 2, cl.y + (cl.h - ih) / 2, iw, ih);
        x.restore();
      }
      ink(x, bw);
      x.strokeRect(cl.x, cl.y, cl.w, cl.h);
      // day tab
      x.font = '800 ' + L.dow.toFixed(1) + 'px ' + DISPLAY;
      var dw = x.measureText(String(o.days[i]).toUpperCase()).width + L.dow * 0.9;
      var dh = L.dow * 1.45;
      x.fillStyle = '#f1e8d0';
      x.fillRect(cl.x + bw, cl.y + bw, dw, dh);
      ink(x, bw);
      x.strokeRect(cl.x + bw, cl.y + bw, dw, dh);
      text(x, String(o.days[i]).toUpperCase(), cl.x + bw + L.dow * 0.45, cl.y + bw + dh / 2 + 1, '800 ' + L.dow.toFixed(1) + 'px ' + DISPLAY, INK);
      // time stamp
      if (o.times && o.times[i]) {
        var t = o.times[i] + '  ' + String((o.places && o.places[i]) || '').toUpperCase();
        x.font = '800 ' + L.time.toFixed(1) + 'px ' + DISPLAY;
        var tw = Math.min(cl.w - 2 * bw - L.time, x.measureText(t).width + L.time * 1.1);
        var th = L.time * 1.6;
        x.fillStyle = '#f2a84b';
        x.fillRect(cl.x + bw + L.time * 0.4, cl.y + cl.h - th - L.time * 0.4, tw, th);
        ink(x, bw * 0.8);
        x.strokeRect(cl.x + bw + L.time * 0.4, cl.y + cl.h - th - L.time * 0.4, tw, th);
        text(x, t, cl.x + bw + L.time * 0.95, cl.y + cl.h - th / 2 - L.time * 0.4 + 1, '800 ' + L.time.toFixed(1) + 'px ' + DISPLAY, INK, 'left', tw - L.time * 1.1);
      }
      // red marker
      x.strokeStyle = 'rgba(208,40,40,.92)';
      x.lineCap = 'round';
      x.lineWidth = Math.max(2.5, 0.022 * Math.min(cl.w, cl.h));
      if (i < (o.crossed || 0)) {
        x.beginPath();
        x.moveTo(cl.x + cl.w * 0.14, cl.y + cl.h * 0.16);
        x.bezierCurveTo(cl.x + cl.w * 0.38, cl.y + cl.h * 0.4, cl.x + cl.w * 0.6, cl.y + cl.h * 0.6, cl.x + cl.w * 0.86, cl.y + cl.h * 0.84);
        x.moveTo(cl.x + cl.w * 0.84, cl.y + cl.h * 0.14);
        x.bezierCurveTo(cl.x + cl.w * 0.6, cl.y + cl.h * 0.4, cl.x + cl.w * 0.4, cl.y + cl.h * 0.62, cl.x + cl.w * 0.16, cl.y + cl.h * 0.86);
        x.stroke();
      }
      if (i === o.days.length - 1 && o.ring) {
        x.beginPath();
        x.ellipse(cl.x + cl.w / 2, cl.y + cl.h / 2, cl.w * 0.46, cl.h * 0.45, -0.05, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2.1 * o.ring);
        x.stroke();
      }
    });
    ink(x, Math.max(2, 0.006 * mn));
    x.strokeRect(1, 1, w - 2, h - 2);
    return c;
  };

  ES.inkPaint = P;
  ES.inkPaint.cv = cv;
  ES.inkPaint.rng = rng;
})();
