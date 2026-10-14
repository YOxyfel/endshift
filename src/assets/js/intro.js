/* ENDSHIFT opening montage (home page, first visit only).
   An ordinary evening plays back faster and faster: last email, bus, hallway,
   kitchen, the order printer, one more thing, bed. Every change of scene sends a
   dark wave across the screen, each stronger than the last. The final wave closes
   to black. In the dark, a switch's locator light; then the switch itself, big,
   and "All that's left is to switch off." Flipping it sets off the biggest wave,
   which opens onto the page while the switch flies to its place in the hero.
   Skip, scrolling or a key goes straight in instead (work mode still on).

   It only runs when the inline head script added `intro-pending` to <html>:
   first visit, motion allowed, low-stim off, no #hash. `?intro` in the URL replays it.
   Everything is drawn in code. Light levels stay low and nothing flashes. */
(function () {
  'use strict';

  var root = document.documentElement;
  if (!root.classList.contains('intro-pending')) return;

  var cfg = {};
  try {
    cfg = JSON.parse((document.getElementById('es-config') || {}).textContent || '{}');
  } catch (e) {}
  var I = cfg.intro;
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext && canvas.getContext('2d');

  function release() {
    root.classList.remove('intro-pending', 'intro-live');
    window.dispatchEvent(new CustomEvent('es:intro-reveal'));
    window.dispatchEvent(new CustomEvent('es:intro-done'));
  }
  // Nothing to play, or already scrolled down (a reload mid-page): show the page now.
  if (!I || !I.scenes || !I.scenes.length || !ctx || window.scrollY > 40) {
    release();
    return;
  }

  var track = function (name, props) {
    if (window.ES && window.ES.track) window.ES.track(name, props || {});
  };

  /* Timeline (ms) ------------------------------------------------------------ */
  var SCENES = I.scenes;
  var N = SCENES.length;
  // five drawn rooms, faster and faster: about six seconds to the switch
  var DUR = [1500, 1150, 950, 800, 700, 600, 520];
  var LEAD = 380; // the first scene opens out of black
  var starts = [];
  var tAcc = LEAD;
  for (var i = 0; i < N; i++) {
    starts.push(tAcc);
    tAcc += DUR[Math.min(i, DUR.length - 1)];
  }
  var END = tAcc;
  var dur = function (k) { return DUR[Math.min(k, DUR.length - 1)]; };
  // wave k sits between scene k and k+1; each one stronger than the last
  var strength = function (k) { return N > 2 ? 0.34 + 0.5 * (k / (N - 2)) : 0.6; };
  var closeLen = function (k) { return Math.min(dur(k) * 0.5, 420); };
  var openLen = function (k) { return Math.min(dur(k) * 0.55, 380); };
  var ringLen = function (k) { return 700 + 520 * strength(k); };

  var final = { at: END, close: 500, reveal: 1300 };
  // The page opens when the switch is flipped (or the gate is skipped): until then, never.
  var revealStart = Infinity;
  var revealAt = function () { return revealStart; };
  var frozen = null; // scene time frozen by a skip
  var ST = (cfg.strings && cfg.strings.shift) || {};

  // The drawn rooms (the same pictures as the story panels): each scene uses its picture once
  // it has loaded, and its line drawing until then
  var STILL = {}, stills = false;
  (function loadStills() {
    var P = I.stills || {};
    var big = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) > 900;
    SCENES.forEach(function (sc) {
      var u = sc.view && P[sc.view];
      if (!u || STILL[sc.view] === null) return;
      STILL[sc.view] = null;
      var im = new Image();
      im.decoding = 'async';
      im.onload = function () {
        // how bright the picture is decides how much it's dimmed: the clock has to read on every one
        try {
          var c = document.createElement('canvas');
          c.width = c.height = 8;
          var g = c.getContext('2d');
          g.drawImage(im, 0, 0, 8, 8);
          var d = g.getImageData(0, 0, 8, 8).data, sum = 0;
          for (var q = 0; q < d.length; q += 4) sum += 0.2126 * d[q] + 0.7152 * d[q + 1] + 0.0722 * d[q + 2];
          var lum = sum / 64 / 255;
          im.__dim = clamp((lum - 0.14) * 1.4, 0.04, 0.34);
          // a room that's darker than the rest gets its shadows lifted a little, so it still reads
          im.__lift = clamp((0.2 - lum) * 1.6, 0, 0.26);
        } catch (e) {
          im.__dim = 0.25;
        }
        STILL[sc.view] = im;
        stills = true;
      };
      im.src = big ? u.l : u.s;
    });
  })();

  /* Easing + colour ------------------------------------------------------------ */
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var easeIn = function (x) { return x * x; };
  var easeOut = function (x) { return 1 - (1 - x) * (1 - x); };
  var easeOut3 = function (x) { return 1 - Math.pow(1 - x, 3); };
  var easeInOut = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  var bounce = function (x) {
    var n = 7.5625, d = 2.75;
    if (x < 1 / d) return n * x * x;
    if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
    if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
    return n * (x -= 2.625 / d) * x + 0.984375;
  };
  var FL = [205, 231, 234]; // fluorescent
  var TU = [242, 168, 75]; // tungsten
  var SC = [150, 190, 255]; // screens
  var PA = [236, 235, 230]; // paper
  var INK = [128, 136, 140];
  var RED = [255, 98, 82];
  var GRN = [120, 230, 160];
  var BLACK = '#020203';
  var rgba = function (c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + clamp(a, 0, 1).toFixed(3) + ')'; };

  /* Canvas + overlay ------------------------------------------------------------- */
  var W = 0, H = 0, DPR = 1, CX = 0, CY = 0, S = 1, DIAG = 1;
  canvas.className = 'intro__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  var skipBtn = document.createElement('button');
  skipBtn.type = 'button';
  skipBtn.className = 'intro__skip';
  skipBtn.textContent = I.skip || 'Skip';

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    CX = W / 2;
    CY = H * 0.42;
    S = Math.min(W * 0.8, H * 0.5, 560);
    DIAG = Math.sqrt(W * W + H * H);
  }

  var displayFont = (getComputedStyle(root).getPropertyValue('--font-display') || '').trim() || '"Arial Narrow", sans-serif';
  var bodyFont = (getComputedStyle(root).getPropertyValue('--font-body') || '').trim() || 'system-ui, sans-serif';

  /* Drawing helpers (stage units: the stage is 100 units wide) ------------------- */
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function glow(x, y, r, c, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(c, a));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function stroke(c, a, w) {
    ctx.strokeStyle = rgba(c, a);
    ctx.lineWidth = w;
    ctx.stroke();
  }
  function fill(c, a) {
    ctx.fillStyle = rgba(c, a);
    ctx.fill();
  }
  function seg(x1, y1, x2, y2, c, a, w) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    stroke(c, a, w);
  }
  // The same person in every scene, seen from behind: head and shoulders.
  function person(x, y, s, rim, tilt) {
    tilt = tilt || 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(-19, 14);
    ctx.bezierCurveTo(-19, 2, -14, -2, -6, -3.5);
    ctx.lineTo(-4, -6);
    ctx.lineTo(4, -6);
    ctx.lineTo(6, -3.5);
    ctx.bezierCurveTo(14, -2, 19, 2, 19, 14);
    ctx.closePath();
    ctx.fillStyle = '#060708';
    ctx.fill();
    stroke(rim, 0.32, 0.55);
    ctx.beginPath();
    ctx.arc(tilt, -13 + Math.abs(tilt) * 0.3, 6.6, 0, Math.PI * 2);
    ctx.fillStyle = '#060708';
    ctx.fill();
    stroke(rim, 0.38, 0.55);
    ctx.restore();
  }
  function pill(x, y, w, h, c, a) {
    rr(x, y, w, h, h / 2);
    fill(c, a);
  }

  /* The seven scenes. lt = ms into the scene, p = 0..1 through it, T = seconds. */
  var draw = {
    work: function (lt, p, T) {
      // ceiling tube and its cold cone
      glow(0, -42, 46, FL, 0.16);
      seg(-28, -42, 28, -42, FL, 0.85, 1.3);
      ctx.beginPath();
      ctx.moveTo(-28, -41);
      ctx.lineTo(28, -41);
      ctx.lineTo(48, 26);
      ctx.lineTo(-48, 26);
      ctx.closePath();
      var cone = ctx.createLinearGradient(0, -41, 0, 26);
      cone.addColorStop(0, rgba(FL, 0.07));
      cone.addColorStop(1, rgba(FL, 0));
      ctx.fillStyle = cone;
      ctx.fill();
      seg(-50, 24, 50, 24, INK, 0.5, 0.6);
      // monitor
      glow(0, -6, 44, SC, 0.1);
      rr(-24, -21, 48, 30, 1.6);
      fill(SC, 0.13);
      stroke(FL, 0.45, 0.5);
      seg(0, 9, 0, 18, INK, 0.55, 1.2);
      seg(-7, 18.5, 7, 18.5, INK, 0.55, 1);
      // an email being finished
      var lens = [30, 36, 22, 33];
      for (var k = 0; k < 4; k++) {
        var grow = clamp(p * 4.2 - k * 0.8, 0, 1);
        if (grow <= 0) continue;
        ctx.fillStyle = rgba(PA, 0.32);
        ctx.fillRect(-19, -16 + k * 4.6, lens[k] * grow, 1.3);
      }
      if (Math.floor(T * 2.4) % 2) {
        ctx.fillStyle = rgba(PA, 0.7);
        ctx.fillRect(-19 + 33 * clamp(p * 4.2 - 2.4, 0, 1) + 0.6, -3, 0.5, 2.2);
      }
      rr(11, 2.5, 10, 3.6, 1.8);
      fill(FL, 0.35 + 0.25 * Math.max(0, Math.sin(T * 5)));
      // a new one lands before this one is sent
      if (p > 0.55) {
        var q = easeOut3(clamp((p - 0.55) / 0.2, 0, 1));
        pill(5, -19 + (1 - q) * -3, 17, 3.6, PA, 0.3 * q);
        ctx.beginPath();
        ctx.arc(8, -17.2 + (1 - q) * -3, 0.9, 0, Math.PI * 2);
        fill(RED, 0.8 * q);
      }
      person(0, 33, 1.05, FL);
    },

    bus: function (lt, p, T) {
      ctx.save();
      rr(-46, -32, 92, 50, 6);
      ctx.clip();
      // the city sliding past
      for (var k = 0; k < 7; k++) {
        var x = ((k * 31 - T * 120) % 140 + 140) % 140 - 70;
        glow(x, -14, 10, TU, 0.32);
        seg(x, -14, x + 16, -14, TU, 0.16, 1.4);
        ctx.beginPath();
        ctx.arc(x, -14, 0.9, 0, Math.PI * 2);
        fill(TU, 0.9);
      }
      for (var j = 0; j < 12; j++) {
        var bx = ((j * 13 - T * 45) % 156 + 156) % 156 - 78;
        ctx.fillStyle = rgba(INK, 0.22);
        ctx.fillRect(bx, -2 - (j % 3) * 4, 6, 8 + (j % 3) * 4);
      }
      ctx.restore();
      rr(-46, -32, 92, 50, 6);
      stroke(INK, 0.5, 0.8);
      seg(8, -32, 8, 18, INK, 0.4, 0.8);
      // handrail
      seg(-36, -45, -36, 46, INK, 0.45, 1.6);
      seg(-35.4, -45, -35.4, 46, PA, 0.08, 0.4);
      // head down over the phone: from behind, only its light shows
      glow(15, 27, 22, SC, 0.26);
      person(14, 41, 1, SC, 2.2);
      glow(15, 30, 8, SC, 0.18);
    },

    hallway: function (lt, p, T) {
      glow(-2, -44, 44, TU, 0.17);
      seg(-50, 31, 50, 31, INK, 0.45, 0.6);
      // the front door, just closed
      rr(-30, -38, 26, 69, 0.6);
      stroke(INK, 0.5, 0.8);
      ctx.beginPath();
      ctx.arc(-9, 0, 1, 0, Math.PI * 2);
      fill(PA, 0.4);
      // the work bag, dropped by the door
      rr(-47, 17, 14, 14, 2.5);
      fill([13, 15, 17], 1);
      stroke(INK, 0.45, 0.6);
      seg(-47, 22, -33, 22, INK, 0.35, 0.5);
      ctx.beginPath();
      ctx.arc(-40, 17, 4.5, Math.PI, 0);
      stroke(INK, 0.45, 0.7);
      // console table
      seg(10, 6, 48, 6, INK, 0.6, 1.1);
      seg(13, 6, 13, 31, INK, 0.4, 0.7);
      seg(45, 6, 45, 31, INK, 0.4, 0.7);
      // the bowl and the keys landing in it
      ctx.beginPath();
      ctx.ellipse(22, 4.6, 7, 2.2, 0, 0, Math.PI);
      stroke(INK, 0.55, 0.7);
      var drop = bounce(clamp(lt / 520, 0, 1));
      var ky = -24 + drop * 27;
      ctx.beginPath();
      ctx.arc(21, ky, 1.8, 0, Math.PI * 2);
      stroke(PA, 0.7, 0.6);
      seg(22.6, ky + 0.6, 27, ky + 2, PA, 0.6, 0.7);
      seg(25.4, ky + 1.5, 25.6, ky + 2.7, PA, 0.6, 0.5);
      // the phone on the table, still lit
      glow(37, 2, 16, SC, 0.2);
      rr(32, 2.2, 10, 3.6, 0.8);
      fill(SC, 0.5);
      ctx.beginPath();
      ctx.arc(41.4, 2.4, 1, 0, Math.PI * 2);
      fill(RED, 0.55 + 0.35 * Math.max(0, Math.sin(T * 6)));
      for (var k = 0; k < 3; k++) {
        var age = ((lt / 1000) * 1.1 + k / 3) % 1;
        pill(30, -4 - age * 30, 15, 3.4, PA, (1 - age) * 0.32 * clamp(lt / 200, 0, 1));
      }
    },

    kitchen: function (lt, p, T) {
      // extractor hood light
      ctx.beginPath();
      ctx.moveTo(-26, -42);
      ctx.lineTo(10, -42);
      ctx.lineTo(4, -32);
      ctx.lineTo(-20, -32);
      ctx.closePath();
      fill([12, 13, 15], 1);
      stroke(INK, 0.45, 0.6);
      glow(-8, -30, 30, TU, 0.24);
      seg(-50, 14, 50, 14, INK, 0.55, 0.9);
      seg(-50, 16.5, 50, 16.5, INK, 0.25, 0.5);
      // pot and steam
      rr(-20, 0, 24, 13, 2);
      fill([10, 11, 12], 1);
      stroke(INK, 0.6, 0.7);
      seg(-23, 3, -20, 3, INK, 0.6, 0.9);
      seg(4, 3, 7, 3, INK, 0.6, 0.9);
      seg(-21, 0, 5, 0, PA, 0.25, 0.6);
      for (var k = 0; k < 3; k++) {
        ctx.beginPath();
        for (var yy = 0; yy <= 24; yy += 2) {
          var x = -13 + k * 6 + Math.sin(T * 2.6 + yy * 0.28 + k * 1.7) * (1 + yy * 0.09);
          if (yy === 0) ctx.moveTo(x, -1 - yy);
          else ctx.lineTo(x, -1 - yy);
        }
        stroke(PA, 0.16, 0.7);
      }
      // the phone leaning on the backsplash, the chat still going
      glow(26, 0, 22, SC, 0.18);
      rr(19, -10, 13, 22, 2);
      fill(SC, 0.13);
      stroke(FL, 0.4, 0.5);
      var shown = Math.min(4, 1 + Math.floor(lt / 170));
      for (var b = 0; b < shown; b++) {
        var mine = b % 2 === 1;
        pill(mine ? 24.5 : 20.5, -7.5 + b * 4.2, b === 2 ? 8 : 6.5, 2.6, mine ? SC : PA, mine ? 0.6 : 0.35);
      }
      for (var d = 0; d < 3; d++) {
        var on = Math.floor(T * 6) % 3 === d;
        ctx.beginPath();
        ctx.arc(22 + d * 2, 9, 0.6, 0, Math.PI * 2);
        fill(PA, on ? 0.75 : 0.25);
      }
    },

    printer: function (lt, p, T) {
      // remembered, not seen: drawn a little ghostly
      ctx.globalAlpha *= 0.85;
      glow(0, -6, 44, PA, 0.06);
      // the ticket feeding out
      var hgt = 10 + easeOut(p) * 34;
      ctx.save();
      ctx.beginPath();
      ctx.rect(-11, 4 - hgt, 22, hgt);
      ctx.clip();
      ctx.fillStyle = rgba(PA, 0.13);
      ctx.fillRect(-9, 4 - hgt, 18, hgt);
      // printed lines ride up with the paper
      for (var k = 0; k < 16; k++) {
        var ly = 4 - hgt + 3 + k * 2.8;
        if (ly > 2) break;
        ctx.fillStyle = rgba(PA, k === 0 ? 0.45 : 0.3);
        ctx.fillRect(-7, ly, [12, 8, 14, 6, 11, 13, 7, 10][k % 8], k === 0 ? 1.4 : 0.9);
      }
      ctx.restore();
      ctx.beginPath();
      ctx.rect(-9, 4 - hgt, 18, hgt);
      stroke(PA, 0.28, 0.4);
      // the printer
      rr(-17, 4, 34, 18, 3);
      fill([11, 13, 14], 1);
      stroke(INK, 0.6, 0.7);
      seg(-11, 4.2, 11, 4.2, PA, 0.35, 0.8);
      var led = Math.floor(T * 4) % 2;
      ctx.beginPath();
      ctx.arc(12, 17, 1.1, 0, Math.PI * 2);
      fill(GRN, led ? 0.85 : 0.3);
      // the sound it makes, still
      for (var a = 0; a < 3; a++) {
        var age = ((lt / 1000) * 1.5 + a / 3) % 1;
        var r = 22 + age * 18;
        ctx.beginPath();
        ctx.arc(0, 12, r, -0.45, 0.45);
        stroke(PA, (1 - age) * 0.32, 0.6);
        ctx.beginPath();
        ctx.arc(0, 12, r, Math.PI - 0.45, Math.PI + 0.45);
        stroke(PA, (1 - age) * 0.32, 0.6);
      }
    },

    desk: function (lt, p, T) {
      seg(-50, 21, 50, 21, INK, 0.5, 0.7);
      // desk lamp
      ctx.beginPath();
      ctx.ellipse(-36, 20, 6, 1.6, 0, 0, Math.PI * 2);
      fill([14, 15, 17], 1);
      stroke(INK, 0.5, 0.6);
      ctx.beginPath();
      ctx.moveTo(-36, 19);
      ctx.lineTo(-30, -8);
      ctx.lineTo(-19, -17);
      stroke(INK, 0.55, 0.9);
      ctx.beginPath();
      ctx.moveTo(-25, -22);
      ctx.lineTo(-14, -20);
      ctx.lineTo(-17, -12);
      ctx.closePath();
      fill([18, 19, 21], 1);
      stroke(INK, 0.5, 0.6);
      ctx.beginPath();
      ctx.moveTo(-16, -15);
      ctx.lineTo(-30, 20);
      ctx.lineTo(4, 20);
      ctx.closePath();
      var cone = ctx.createLinearGradient(-15, -14, -12, 20);
      cone.addColorStop(0, rgba(TU, 0.16));
      cone.addColorStop(1, rgba(TU, 0.02));
      ctx.fillStyle = cone;
      ctx.fill();
      glow(-15.5, -14.5, 7, TU, 0.6);
      glow(-12, 20, 22, TU, 0.12);
      // the laptop and its list
      glow(12, -2, 34, SC, 0.12);
      rr(-3, -16, 30, 21, 1.2);
      fill(SC, 0.14);
      stroke(FL, 0.4, 0.5);
      seg(-7, 20, 31, 20, INK, 0.7, 1.4);
      var items = Math.min(5, 3 + Math.floor(p * 3));
      for (var k = 0; k < items; k++) {
        var y = -12.5 + k * 3.6;
        var done = k < 2 || (k === 2 && p > 0.5);
        ctx.beginPath();
        ctx.rect(0.5, y - 1, 2, 2);
        stroke(PA, 0.5, 0.35);
        if (done) {
          ctx.beginPath();
          ctx.moveTo(0.8, y);
          ctx.lineTo(1.4, y + 0.7);
          ctx.lineTo(2.6, y - 0.9);
          stroke(GRN, 0.8, 0.45);
        }
        ctx.fillStyle = rgba(PA, done ? 0.18 : 0.38);
        ctx.fillRect(4.5, y - 0.5, [16, 12, 18, 14, 10][k], 1);
      }
      // the mug, gone cold
      rr(35, 11, 7, 9, 1);
      stroke(INK, 0.55, 0.6);
      ctx.beginPath();
      ctx.arc(42.5, 15, 2.2, -Math.PI / 2, Math.PI / 2);
      stroke(INK, 0.5, 0.6);
      person(12, 40, 0.95, SC);
    },

    bed: function (lt, p, T) {
      // window and moonlight
      rr(-46, -40, 22, 26, 1);
      stroke(INK, 0.35, 0.6);
      seg(-35, -40, -35, -14, INK, 0.3, 0.5);
      seg(-46, -27, -24, -27, INK, 0.3, 0.5);
      glow(-35, -27, 20, FL, 0.06);
      // headboard, bed, blanket
      rr(-34, -8, 68, 12, 3);
      stroke(INK, 0.45, 0.7);
      ctx.beginPath();
      ctx.moveTo(-42, 32);
      ctx.lineTo(-42, 8);
      ctx.bezierCurveTo(-20, 4, -10, 12, 4, 9);
      ctx.bezierCurveTo(18, 6, 30, 12, 42, 8);
      ctx.lineTo(42, 32);
      fill([10, 11, 13], 1);
      stroke(INK, 0.4, 0.6);
      ctx.beginPath();
      ctx.ellipse(-16, 4, 11, 4, 0, 0, Math.PI * 2);
      fill([16, 17, 19], 1);
      // the face, lit from the phone
      glow(-13, -2, 20, SC, 0.24);
      glow(-10, -38, 24, SC, 0.05);
      ctx.beginPath();
      ctx.arc(-16, 0, 5.8, 0, Math.PI * 2);
      ctx.fillStyle = '#070809';
      ctx.fill();
      stroke(SC, 0.4, 0.5);
      seg(-6, 7, -9, -1, INK, 0.5, 1.6);
      rr(-12.5, -9.5, 9, 6, 1);
      fill(SC, 0.55);
      // thoughts that won't log off
      for (var k = 0; k < 4; k++) {
        var age = ((lt / 1000) * 1.3 + k / 4) % 1;
        var x = -6 + k * 7 + Math.sin(T * 1.8 + k) * 1.5;
        pill(x, -14 - age * 26, 9 + (k % 2) * 5, 3, PA, (1 - age) * 0.26 * clamp(lt / 160, 0, 1));
      }
    },
  };
  var WASH = { work: [FL, 0.1], bus: [TU, 0.08], hallway: [TU, 0.08], kitchen: [TU, 0.09], printer: [PA, 0.06], desk: [SC, 0.07], bed: [SC, 0.06] };

  /* Frame state ------------------------------------------------------------------- */
  function sceneAt(t) {
    for (var k = N - 1; k >= 0; k--) if (t >= starts[k]) return k;
    return 0;
  }
  // How far the dark has closed in at time t (0 = open, 1 = shut), and the label fade.
  function pulseAt(t) {
    var P = 0, label = 1;
    if (t < LEAD) {
      P = 1 - easeOut(t / LEAD);
      label = 1 - P;
      return { P: P, label: label };
    }
    var k = sceneAt(t);
    var into = t - starts[k];
    var B = starts[k] + dur(k);
    if (k < N - 1) {
      var c = closeLen(k);
      if (t > B - c) {
        var u = easeIn((t - (B - c)) / c);
        P = Math.max(P, strength(k) * u);
        label = Math.min(label, 1 - u);
      }
    }
    if (k > 0) {
      var o = openLen(k);
      if (into < o) {
        var v = 1 - easeOut(into / o);
        P = Math.max(P, strength(k - 1) * v);
        label = Math.min(label, 1 - v);
      }
    }
    return { P: P, label: label };
  }

  function drawScene(k, t, alpha, scale) {
    var sc = SCENES[k];
    var fn = draw[sc.scene] || draw.work;
    var lt = t - starts[k];
    var p = clamp(lt / dur(k), 0, 1);
    var im = sc.view && STILL[sc.view];
    if (im) {
      // the drawn room, full screen, pushing in slowly; darker than on the page so the clock reads
      ctx.save();
      ctx.globalAlpha = alpha;
      var z = scale * (1.03 + 0.07 * p);
      var r = Math.max(W / im.naturalWidth, H / im.naturalHeight) * z;
      var iw = im.naturalWidth * r, ih = im.naturalHeight * r;
      ctx.drawImage(im, CX - iw / 2, H / 2 - ih / 2, iw, ih);
      if (im.__lift) {
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = 'rgba(120,104,88,' + im.__lift.toFixed(3) + ')';
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.fillStyle = 'rgba(2,2,3,' + (im.__dim != null ? im.__dim : 0.25).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(CX, CY);
    ctx.scale((S / 100) * scale, (S / 100) * scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    fn(lt, p, t / 1000);
    ctx.restore();
  }

  function drawWash(k, a) {
    var w = WASH[SCENES[k].scene] || WASH.work;
    var g = ctx.createRadialGradient(CX, CY, 0, CX, CY, DIAG * 0.72);
    g.addColorStop(0, rgba(w[0], w[1] * a));
    g.addColorStop(0.45, rgba(w[0], w[1] * 0.45 * a));
    g.addColorStop(1, rgba(w[0], 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawVignette(P) {
    // a picture fills the screen, so its dark edge sits further out than a line drawing's
    var b0 = stills ? DIAG * 0.3 : S * 0.74, b1 = stills ? DIAG * 0.78 : S * 1.7;
    var r0 = Math.max(0, b0 * (1 - 0.94 * P));
    var r1 = r0 + 2 + (b1 - b0) * (1 - 0.62 * P);
    var g = ctx.createRadialGradient(CX, CY, r0, CX, CY, r1);
    g.addColorStop(0, 'rgba(2,2,3,0)');
    g.addColorStop(0.55, 'rgba(2,2,3,' + (0.55 + 0.4 * P).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(2,2,3,0.97)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // The wave that rolls out after every change of scene.
  function drawRing(k, t) {
    var born = starts[k + 1];
    var L = ringLen(k);
    var v = (t - born) / L;
    if (v <= 0 || v >= 1) return;
    var a = strength(k);
    var e = easeOut3(v);
    var R = S * 0.25 + (DIAG * 0.75 - S * 0.25) * e;
    var w = S * (0.16 + 0.55 * a) * (0.6 + 0.6 * e);
    var alpha = a * Math.pow(1 - v, 1.15);
    var out = R + w;
    var g = ctx.createRadialGradient(CX, CY, 0, CX, CY, out);
    var s0 = clamp((R - w) / out, 0, 1);
    var s1 = clamp((R - w * 0.25) / out, s0, 1);
    var s2 = clamp(R / out, s1, 1);
    var s3 = clamp((R + w * 0.45) / out, s2, 1);
    var wash = WASH[SCENES[k + 1].scene] || WASH.work;
    g.addColorStop(0, 'rgba(2,2,3,0)');
    g.addColorStop(s0, 'rgba(2,2,3,0)');
    g.addColorStop(s1, 'rgba(2,2,3,' + (alpha * 0.95).toFixed(3) + ')');
    g.addColorStop(s2, 'rgba(2,2,3,' + (alpha * 0.8).toFixed(3) + ')');
    g.addColorStop(s3, rgba(wash[0], alpha * 0.07));
    g.addColorStop(1, rgba(wash[0], 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  var minutes = SCENES.map(function (s) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(s.time || '');
    return m ? +m[1] * 60 + +m[2] : null;
  });
  for (var mi = 1; mi < minutes.length; mi++) {
    if (minutes[mi] != null && minutes[mi - 1] != null) while (minutes[mi] < minutes[mi - 1]) minutes[mi] += 1440;
  }
  function clockAt(k, p) {
    var a = minutes[k];
    if (a == null) return SCENES[k].time || '';
    var b = k + 1 < N && minutes[k + 1] != null ? minutes[k + 1] : a + 7;
    var m = Math.floor(a + (b - a) * p) % 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }

  function drawText(k, t, dim, labelA) {
    var p = clamp((t - starts[k]) / dur(k), 0, 1);
    var ts = clamp(S * 0.15, 40, 84);
    var ls = clamp(S * 0.05, 15, 23);
    var y = CY + S * 0.55 + ts * 0.92;
    ctx.save();
    if (stills) {
      // a soft dark pool under the clock, so it reads over the picture
      var gr = Math.max(W * 0.5, 260);
      var pg = ctx.createRadialGradient(CX, y - ts * 0.2, 0, CX, y - ts * 0.2, gr);
      pg.addColorStop(0, 'rgba(2,2,3,' + (0.82 * dim).toFixed(3) + ')');
      pg.addColorStop(0.55, 'rgba(2,2,3,' + (0.5 * dim).toFixed(3) + ')');
      pg.addColorStop(1, 'rgba(2,2,3,0)');
      ctx.fillStyle = pg;
      ctx.fillRect(CX - gr, y - ts * 0.2 - gr, gr * 2, gr * 2);
      // and a soft shadow on the letters themselves, for the bright spots (a lit screen behind)
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 16;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '800 ' + Math.round(ts) + 'px ' + displayFont;
    ctx.fillStyle = rgba(PA, 0.88 * dim);
    ctx.fillText(clockAt(k, p), CX, y);
    var label = SCENES[k].label || '';
    var size = ls;
    ctx.font = '600 ' + Math.round(size) + 'px ' + bodyFont;
    var maxW = W - 40;
    var mw = ctx.measureText(label).width;
    if (mw > maxW) {
      size = Math.max(12, size * (maxW / mw));
      ctx.font = '600 ' + Math.round(size) + 'px ' + bodyFont;
    }
    ctx.fillStyle = rgba([160, 167, 171], 0.95 * dim * labelA);
    ctx.fillText(label, CX, y + ls * 1.75);
    ctx.restore();
  }

  /* Loop ---------------------------------------------------------------------------- */
  var t = 0, last = 0, raf = 0, phase = 'montage', debugT = null, revealed = false;

  function render(now) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    var RA = revealAt();

    if (now >= RA) {
      // the last, biggest wave: black opening from the switch onto the page
      var v = clamp((now - RA) / final.reveal, 0, 1);
      var e = easeInOut(v);
      var Rh = DIAG * 1.3 * e;
      var F = Math.max(90, Rh * 0.6);
      ctx.fillStyle = BLACK;
      ctx.fillRect(0, 0, W, H);
      if (Rh > 0.5) {
        ctx.globalCompositeOperation = 'destination-out';
        var g = ctx.createRadialGradient(RCX, RCY, 0, RCX, RCY, Rh);
        g.addColorStop(0, 'rgba(0,0,0,1)');
        g.addColorStop(clamp((Rh - F) / Rh, 0, 0.999), 'rgba(0,0,0,1)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
        // an edge on the wave: warm if you switched off (the lamp coming on), cool if not
        var cr = ctx.createRadialGradient(RCX, RCY, Math.max(0, Rh - F * 0.7), RCX, RCY, Rh + F * 0.15);
        cr.addColorStop(0, rgba(TU, 0));
        cr.addColorStop(0.6, rgba(flipped ? TU : FL, (flipped ? 0.09 : 0.05) * (1 - v)));
        cr.addColorStop(1, rgba(TU, 0));
        ctx.fillStyle = cr;
        ctx.fillRect(0, 0, W, H);
      }
      canvas.style.opacity = String(1 - clamp((v - 0.72) / 0.28, 0, 1));
      return v >= 1;
    }

    ctx.fillStyle = BLACK;
    ctx.fillRect(0, 0, W, H);
    if (now >= final.at + final.close) {
      if (!gateShown && !noGate) showGate();
      return false; // the dark, with the switch in it
    }

    var st = frozen != null ? frozen : Math.min(now, END - 1);
    var k = sceneAt(st);
    var pu = pulseAt(st);
    var P = pu.P;
    var labelA = pu.label;
    if (now > final.at) {
      var fc = easeIn(clamp((now - final.at) / final.close, 0, 1));
      P = P + (1 - P) * fc;
      labelA *= 1 - fc;
    }

    drawWash(k, 1 - 0.65 * P);
    var scale = 1 - 0.07 * P;
    // just after a cut, the new scene settles back from a slight push-in
    if (k > 0) {
      var since = st - starts[k];
      if (since < 420) scale *= 1 + 0.05 * strength(k - 1) * (1 - easeOut(since / 420));
      if (since < 110) drawScene(k - 1, starts[k] - 1, (1 - since / 110) * (1 - 0.8 * P), scale);
    }
    drawScene(k, st, 1 - 0.8 * P, scale);
    drawVignette(P);
    for (var r = 0; r < N - 1; r++) drawRing(r, st);
    drawText(k, st, 1 - 0.75 * P, labelA);
    return false;
  }

  /* The gate: the switch alone in the dark ------------------------------------------- */
  var gate = null, sw = null, gateShown = false, noGate = false, leaving = false, flipped = false;
  var gateTimers = [];
  var RCX = 0, RCY = 0; // where the last wave opens from
  var inerted = [];

  function setInert(on) {
    if (on) {
      inerted = Array.prototype.slice.call(document.querySelectorAll('body > header, body > main, body > footer, body > .sticky-cta, body > .menu-panel'));
      inerted.forEach(function (el) {
        if ('inert' in el) el.inert = true;
        else el.setAttribute('aria-hidden', 'true');
      });
    } else {
      inerted.forEach(function (el) {
        if ('inert' in el) el.inert = false;
        else el.removeAttribute('aria-hidden');
      });
      inerted = [];
    }
  }

  // On a home page with the game, the switch isn't flipped here: it goes into the game.
  var gameMode = false, handing = false;
  function showGate() {
    gateShown = true;
    gameMode = !!(window.ES && window.ES.game && window.ES.game.handoffTarget);
    var src = gameMode ? document.querySelector('.site-header .wallswitch') : document.querySelector('[data-hero] .wallswitch--hero');
    if (!src || !(window.ES && window.ES.shift)) {
      revealStart = t + 60;
      return;
    }
    if (gameMode) return showHandoff(src);
    gate = document.createElement('div');
    gate.className = 'intro-gate';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-labelledby', 'intro-gate-line');
    var time = document.createElement('p');
    time.className = 'intro-gate__time';
    time.setAttribute('aria-hidden', 'true');
    time.textContent = clockAt(N - 1, 1);
    sw = src.cloneNode(true);
    sw.classList.remove('wallswitch--hero');
    sw.classList.add('wallswitch--xl', 'is-dark');
    sw.setAttribute('data-source', 'intro');
    sw.style.opacity = '0';
    var words = document.createElement('div');
    words.className = 'intro-gate__words';
    var line = document.createElement('p');
    line.className = 'intro-gate__line';
    line.id = 'intro-gate-line';
    line.textContent = ST.lineOn || '';
    var hint = document.createElement('p');
    hint.className = 'intro-gate__hint';
    hint.textContent = ST.gateHint || '';
    words.appendChild(line);
    words.appendChild(hint);
    gate.appendChild(time);
    gate.appendChild(sw);
    gate.appendChild(words);
    document.body.appendChild(gate);
    window.ES.shift.bind(sw);
    sw.addEventListener('es:flip', function (e) {
      if (e.detail && e.detail.off) enterSite(true);
    });
    setInert(true);
    // the switch takes focus (for keyboards and screen readers) without drawing a focus ring
    // until someone actually uses the keyboard
    root.classList.add('quiet-focus');
    track('intro_gate', {});
    // first only the locator light, then the plate around it, the clock, the words
    requestAnimationFrame(function () {
      sw.style.transition = 'opacity 1s ease';
      sw.style.opacity = '1';
    });
    gateTimers.push(setTimeout(function () {
      sw.classList.remove('is-dark');
      gate.classList.add('is-lit');
    }, 750));
    gateTimers.push(setTimeout(function () {
      gate.classList.add('is-worded');
      try { sw.focus({ preventScroll: true }); } catch (e) { sw.focus(); }
    }, 1300));
    gateTimers.push(setTimeout(function () { gate.classList.add('is-hinting'); }, 7300));
  }

  // The switch, big and lit, for a beat. Then work hides it: it flies into today's game.
  function showHandoff(src) {
    gate = document.createElement('div');
    gate.className = 'intro-gate intro-gate--handoff';
    gate.setAttribute('aria-hidden', 'true');
    var time = document.createElement('p');
    time.className = 'intro-gate__time';
    time.textContent = clockAt(N - 1, 1);
    sw = src.cloneNode(true);
    sw.classList.remove('wallswitch--mini');
    sw.classList.add('wallswitch--xl', 'is-dark', 'wallswitch--handoff');
    sw.removeAttribute('data-shift-switch');
    sw.tabIndex = -1;
    sw.style.opacity = '0';
    var words = document.createElement('div');
    words.className = 'intro-gate__words';
    var line = document.createElement('p');
    line.className = 'intro-gate__line';
    line.textContent = window.ES.game.handoffLine || '';
    words.appendChild(line);
    gate.appendChild(time);
    gate.appendChild(sw);
    gate.appendChild(words);
    document.body.appendChild(gate);
    sw.addEventListener('click', function () { enterSite(true); });
    track('intro_gate', { game: true });
    requestAnimationFrame(function () {
      sw.style.transition = 'opacity 1s ease';
      sw.style.opacity = '1';
    });
    gateTimers.push(setTimeout(function () {
      sw.classList.remove('is-dark');
      gate.classList.add('is-lit');
    }, 650));
    gateTimers.push(setTimeout(function () { gate.classList.add('is-worded'); }, 1100));
    gateTimers.push(setTimeout(function () { enterSite(true); }, 3000));
  }

  // The switch shrinks into its place in the game (or off the side it's hidden on) and is gone.
  function flyToGame() {
    var target = null;
    try { target = window.ES.game.handoffTarget(); } catch (e) {}
    var done = function () {
      removeGate();
      if (window.ES.game && window.ES.game.handoffDone) window.ES.game.handoffDone();
    };
    if (!sw || !target || typeof sw.animate !== 'function') return done();
    var from = sw.getBoundingClientRect();
    if (!from.width) return done();
    gate.classList.add('is-leaving');
    sw.style.transition = 'none';
    sw.style.position = 'fixed';
    sw.style.left = from.left + 'px';
    sw.style.top = from.top + 'px';
    sw.style.margin = '0';
    sw.style.zIndex = '98';
    var dx = target.x - (from.left + from.width / 2);
    var dy = target.y - (from.top + from.height / 2);
    var sc = Math.max(0.02, (target.size || 20) / from.height);
    var anim = sw.animate(
      [
        { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
        { transform: 'translate(' + (dx * 0.9).toFixed(1) + 'px, ' + (dy * 0.9).toFixed(1) + 'px) scale(' + (sc * 1.25).toFixed(4) + ')', opacity: 1, offset: 0.78 },
        { transform: 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px) scale(' + (sc * (target.visible ? 0.6 : 1)).toFixed(4) + ')', opacity: 0 },
      ],
      { duration: 1350, easing: 'cubic-bezier(0.6, 0, 0.2, 1)', fill: 'forwards' },
    );
    anim.onfinish = done;
    anim.oncancel = done;
  }

  function enterSite(didFlip) {
    if (leaving || revealed) return;
    leaving = true;
    if (gameMode) {
      handing = true;
      gateTimers.forEach(clearTimeout);
      if (gate) gate.classList.add('is-worded', 'is-lit');
      if (sw) sw.classList.remove('is-dark');
      track('intro_handoff', {});
      revealStart = t + 140;
      return;
    }
    flipped = didFlip;
    gateTimers.forEach(clearTimeout);
    if (gate) gate.classList.add('is-worded', 'is-lit');
    if (!didFlip) track('intro_enter', { how: 'skip' });
    // a flip gets a beat: the click, the light going warm. Then the wave.
    revealStart = t + (didFlip ? 560 : 120);
  }

  // The big switch travels to its place in the hero, landing as the page comes into focus.
  function fly() {
    var target = document.querySelector('[data-hero] .wallswitch--hero');
    if (!sw || !target) return removeGate();
    var hadFocus = document.activeElement === sw;
    var from = sw.getBoundingClientRect();
    var to = target.getBoundingClientRect();
    if (!from.width || !to.width) return removeGate();
    root.classList.add('intro-flying');
    gate.classList.add('is-leaving');
    sw.style.transition = 'none';
    sw.style.position = 'fixed';
    sw.style.left = from.left + 'px';
    sw.style.top = from.top + 'px';
    sw.style.margin = '0';
    sw.style.zIndex = '98';
    var dx = to.left + to.width / 2 - (from.left + from.width / 2);
    var dy = to.top + to.height / 2 - (from.top + from.height / 2);
    var sc = to.height / from.height;
    var offscreen = to.bottom > window.innerHeight || to.top < 0;
    var done = function () {
      root.classList.remove('intro-flying');
      removeGate();
      if (hadFocus) {
        try { target.focus({ preventScroll: true }); } catch (e) {}
        target.addEventListener('blur', function () { root.classList.remove('quiet-focus'); }, { once: true });
      } else root.classList.remove('quiet-focus');
    };
    if (typeof sw.animate !== 'function') return done();
    // (on a short screen where the hero's switch sits below the fold, it fades where it is)
    var anim = offscreen
      ? sw.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.92)' }], { duration: 900, easing: 'ease-out', fill: 'forwards' })
      : sw.animate(
          [
            { transform: 'translate(0px, 0px) scale(1)' },
            { transform: 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px) scale(' + sc.toFixed(4) + ')' },
          ],
          { duration: 1250, easing: 'cubic-bezier(0.6, 0, 0.15, 1)', fill: 'forwards' },
        );
    anim.onfinish = done;
    anim.oncancel = done;
  }

  function removeGate() {
    setInert(false);
    if (!root.classList.contains('intro-flying') && (!document.querySelector('[data-hero] .wallswitch--hero') || document.activeElement !== document.querySelector('[data-hero] .wallswitch--hero'))) root.classList.remove('quiet-focus');
    if (gate && gate.parentNode) gate.parentNode.removeChild(gate);
    gate = null;
  }

  function startReveal() {
    if (revealed) return;
    revealed = true;
    if (sw) {
      var r = sw.getBoundingClientRect();
      RCX = r.left + r.width / 2;
      RCY = r.top + r.height * 0.4;
    } else {
      RCX = W / 2;
      RCY = H * 0.42;
    }
    root.classList.remove('intro-pending', 'intro-live');
    root.classList.add('intro-reveal');
    skipBtn.classList.add('is-gone');
    canvas.style.pointerEvents = 'none';
    if (gate) {
      if (handing) flyToGame();
      else if (flipped || leaving) fly();
      else removeGate();
    }
    window.dispatchEvent(new CustomEvent('es:intro-reveal'));
    window.setTimeout(function () { root.classList.remove('intro-reveal'); }, 2600);
  }

  function finish() {
    cancelAnimationFrame(raf);
    detach();
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    if (skipBtn.parentNode) skipBtn.parentNode.removeChild(skipBtn);
    startReveal();
    window.dispatchEvent(new CustomEvent('es:intro-done'));
  }

  function loop(now) {
    // dt is capped, so a background tab resumes where it stopped instead of jumping
    var dt = last ? Math.min(50, now - last) : 16;
    last = now;
    if (debugT == null) t += dt;
    if (t >= revealAt()) startReveal();
    var done = render(t);
    if (done) {
      if (debugT == null) track('intro_complete', { skipped: skipped, flipped: flipped });
      finish();
      return;
    }
    raf = requestAnimationFrame(loop);
  }

  /* Skip, scroll, keys ---------------------------------------------------------------- */
  var skipped = false;
  var SCROLL_KEYS = /^( |Spacebar|ArrowUp|ArrowDown|PageUp|PageDown|Home|End)$/;
  var onSwitch = function (e) { return !!(sw && e && e.target && sw.contains(e.target)); };

  // During the montage: straight in, work mode still on.
  function skipMontage() {
    if (skipped || revealed || leaving) return;
    skipped = true;
    noGate = true;
    leaving = true;
    track('intro_skip', { scene: sceneAt(Math.min(t, END - 1)) + 1 });
    if (t < final.at) {
      frozen = Math.min(t, END - 1);
      final.at = t;
      final.close = 300;
    }
    revealStart = Math.max(t, final.at + final.close) + 40;
    final.reveal = 950;
  }
  function skipAny() {
    if (gateShown) enterSite(false);
    else skipMontage();
  }

  function onKey(e) {
    root.classList.remove('quiet-focus');
    if (revealed) return;
    if (e.altKey || e.metaKey || e.ctrlKey || e.key === 'Shift' || e.key === 'Tab') return;
    if (gateShown) {
      // Space, Enter and the arrows belong to the switch while it has focus
      if (!gameMode && onSwitch(e) && /^( |Spacebar|Enter|ArrowUp|ArrowDown)$/.test(e.key)) return;
      if (document.activeElement === skipBtn && (e.key === ' ' || e.key === 'Enter')) return;
      if (SCROLL_KEYS.test(e.key)) e.preventDefault();
      enterSite(false);
      return;
    }
    if (SCROLL_KEYS.test(e.key)) e.preventDefault();
    skipMontage();
  }
  // keep the page at the top while the montage is up, so it opens on the hero
  function onScrollish(e) {
    if (revealed) return;
    if (onSwitch(e)) return; // dragging the rocker
    if (e.cancelable) e.preventDefault();
    skipAny();
  }
  // A tap in the dark next to the switch doesn't throw you in: it shows the hint.
  function onCanvasDown() {
    if (revealed) return;
    if (gateShown) {
      if (gameMode) enterSite(true);
      else if (gate) gate.classList.add('is-hinting');
      return;
    }
    skipMontage();
  }

  var opts = { passive: false };
  function attach() {
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onScrollish, opts);
    window.addEventListener('touchmove', onScrollish, opts);
    window.addEventListener('resize', resize);
    window.addEventListener('es:calm', skipAny);
    canvas.addEventListener('pointerdown', onCanvasDown);
    skipBtn.addEventListener('click', skipAny);
  }
  function detach() {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('wheel', onScrollish, opts);
    window.removeEventListener('touchmove', onScrollish, opts);
    window.removeEventListener('resize', resize);
    window.removeEventListener('es:calm', skipAny);
  }

  /* Go ----------------------------------------------------------------------------------- */
  function begin() {
    resize();
    document.body.appendChild(canvas);
    document.body.appendChild(skipBtn);
    root.classList.add('intro-live');
    attach();
    track('intro_start', {});
    raf = requestAnimationFrame(loop);
  }

  // For checking frames by hand: ES.introDebug.seek(ms) freezes the montage at that moment.
  window.ES = window.ES || {};
  window.ES.introDebug = {
    seek: function (ms) {
      debugT = ms;
      t = ms;
      if (t >= revealAt()) startReveal();
      render(t);
    },
    resume: function () { debugT = null; },
    gateAt: function () { return final.at + final.close; },
    starts: starts,
  };

  // Give the display face a moment to arrive so the clock is drawn in it.
  var started = false;
  var go = function () {
    if (started) return;
    started = true;
    begin();
  };
  if (document.fonts && document.fonts.load) {
    document.fonts.load('800 64px ' + displayFont).then(go, go);
    window.setTimeout(go, 450);
  } else go();
})();
