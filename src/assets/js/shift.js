/* ENDSHIFT work-mode switch. One state for the whole site: work mode on, or switched off
   for the evening. The inline head script reads it before first paint and sets
   html[data-shift]; CSS does the looks. This file handles the switches (click, drag, keys),
   the sound and haptics of the flip, the time-aware lines, the "work comes back" pings,
   a calendar reminder for daytime visitors, other open tabs, and analytics.

   Off lasts for the evening: until 05:00 the next morning. */
(function () {
  'use strict';

  var root = document.documentElement;
  var ES = (window.ES = window.ES || {});
  var CFG = ES.config;
  if (!CFG) {
    try {
      CFG = JSON.parse((document.getElementById('es-config') || {}).textContent || '{}');
    } catch (e) {
      CFG = {};
    }
  }
  var T = (CFG.strings && CFG.strings.shift) || {};
  // The usual end of shift: the visitor's own (set on the hero time card), else the site default
  var OUT_KEY = 'es:out';
  var DEFAULT_OUT = CFG.shiftOut || '18:00';
  var OUT = DEFAULT_OUT;
  try {
    var savedOut = localStorage.getItem(OUT_KEY);
    if (/^\d{2}:\d{2}$/.test(savedOut || '')) OUT = savedOut;
  } catch (e) {}
  var KEY = 'es:shift';
  var EVENING = 18e6; // the "evening" runs until 05:00: compare dates shifted back five hours

  var qsa = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var hhmm = function (d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  var fill = function (s, o) {
    return String(s || '').replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; });
  };
  var calm = function () { return root.getAttribute('data-calm') === 'on'; };
  var track = function (n, p) { if (ES.track) ES.track(n, p || {}); };

  function readStored() {
    try {
      var w = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (w && w.off && new Date(w.at - EVENING).toDateString() === new Date(Date.now() - EVENING).toDateString()) return w;
    } catch (e) {}
    return null;
  }
  var stored = readStored();
  var off = root.getAttribute('data-shift') === 'off';
  var offAt = off && stored ? new Date(stored.at) : null;

  // 'day' (06:00 until the usual end of shift), 'night' (00:00–05:00) or 'evening'
  function period(d) {
    var m = d.getHours() * 60 + d.getMinutes();
    var o = OUT.split(':');
    var om = +o[0] * 60 + +o[1];
    if (m < 300) return 'night';
    if (m >= 360 && m < om) return 'day';
    return 'evening';
  }

  /* Text that depends on when you switched off ------------------------------------- */
  function renderText() {
    var when = offAt || new Date();
    var p = period(when);
    var line = p === 'day' ? fill(T.offDay, { now: hhmm(when) }) : p === 'night' ? fill(T.offNight, { now: hhmm(when) }) : T.offEvening;
    qsa('[data-off-line]').forEach(function (el) { el.textContent = line; });
    qsa('[data-off-time]').forEach(function (el) { el.textContent = offAt ? hhmm(offAt) : '--:--'; });
    qsa('[data-off-at]').forEach(function (el) { el.textContent = offAt ? fill(T.offAt, { t: hhmm(offAt) }) : ''; });
    qsa('[data-shift-remind]').forEach(function (el) {
      el.hidden = !off || p !== 'day';
      el.textContent = fill(T.remind, { out: OUT });
    });
  }

  function sync() {
    qsa('[data-shift-switch]').forEach(function (b) {
      b.setAttribute('aria-checked', off ? 'false' : 'true');
      b.title = off ? T.toOn || '' : T.toOff || '';
    });
  }

  /* Live region ---------------------------------------------------------------------- */
  var live = document.createElement('div');
  live.className = 'visually-hidden';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  document.body.appendChild(live);
  function announce(msg) {
    live.textContent = '';
    setTimeout(function () { live.textContent = msg; }, 60);
  }

  /* Sound: a rocker's two-stage click, and the office tube's hum dying (or striking) ------- */
  var ac = null, out = null, noise = null;
  function audio() {
    if (calm()) return null;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!ac) {
        ac = new AC();
        out = ac.createGain();
        out.gain.value = 0.7;
        var comp = ac.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.ratio.value = 4;
        // a small room, so the click has a wall behind it
        var verb = ac.createConvolver();
        var len = Math.floor(ac.sampleRate * 0.35);
        var ir = ac.createBuffer(2, len, ac.sampleRate);
        for (var ch = 0; ch < 2; ch++) {
          var d = ir.getChannelData(ch);
          for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
        }
        verb.buffer = ir;
        var wet = ac.createGain();
        wet.gain.value = 0.22;
        out.connect(comp);
        out.connect(verb);
        verb.connect(wet);
        wet.connect(comp);
        comp.connect(ac.destination);
        var n = Math.floor(ac.sampleRate * 0.3);
        noise = ac.createBuffer(1, n, ac.sampleRate);
        var nd = noise.getChannelData(0);
        for (var k = 0; k < n; k++) nd[k] = Math.random() * 2 - 1;
      }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    } catch (e) {
      return null;
    }
  }
  function env(g, t, peak, attack, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tick(a, t, f, peak, dur) {
    var s = a.createBufferSource();
    s.buffer = noise;
    var bp = a.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = 1.3;
    var g = a.createGain();
    env(g, t, peak, 0.0015, dur);
    s.connect(bp);
    bp.connect(g);
    g.connect(out);
    s.start(t);
    s.stop(t + dur + 0.03);
  }
  function tone(a, t, type, f0, f1, peak, attack, dur) {
    var o = a.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    var g = a.createGain();
    env(g, t, peak, attack, dur);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  function clack(a, t, toOff) {
    tick(a, t, toOff ? 2500 : 3100, 0.22, 0.014); // the paddle starts to give
    tick(a, t + 0.026, toOff ? 1800 : 2300, 0.6, 0.035); // and snaps over
    tick(a, t + 0.027, 5400, 0.14, 0.01);
    tone(a, t + 0.026, 'sine', toOff ? 150 : 190, 55, 0.5, 0.003, 0.1); // the body of the switch
  }
  function hum(a, t, strike) {
    var g = a.createGain();
    g.gain.value = 0.0001;
    var lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1600;
    lp.connect(g);
    g.connect(out);
    var L = 0.055;
    var end = strike ? t + 3 : t + 1.25;
    var parts = [[100, 'sine', 0.55], [200, 'sine', 0.22], [300, 'sine', 0.09], [100, 'sawtooth', 0.045]];
    parts.forEach(function (h) {
      var o = a.createOscillator();
      o.type = h[1];
      o.frequency.value = h[0];
      var og = a.createGain();
      og.gain.value = h[2];
      o.connect(og);
      og.connect(lp);
      if (!strike) {
        o.detune.setValueAtTime(0, t + 0.08);
        o.detune.linearRampToValueAtTime(-45, t + 1.1);
      }
      o.start(t);
      o.stop(end);
    });
    if (strike) {
      // a tube striking: starter ticks, two flickers, then it settles and fades out of the way
      tick(a, t + 0.01, 3900, 0.07, 0.012);
      tick(a, t + 0.18, 3700, 0.05, 0.012);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(L * 0.8, t + 0.04);
      g.gain.setValueAtTime(L * 0.8, t + 0.1);
      g.gain.exponentialRampToValueAtTime(L * 0.15, t + 0.13);
      g.gain.exponentialRampToValueAtTime(L, t + 0.2);
      g.gain.exponentialRampToValueAtTime(L * 0.3, t + 0.26);
      g.gain.exponentialRampToValueAtTime(L, t + 0.34);
      g.gain.setValueAtTime(L, t + 1.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.9);
    } else {
      // you hear it for a moment, then it collapses
      g.gain.setValueAtTime(L, t);
      g.gain.setValueAtTime(L, t + 0.07);
      g.gain.exponentialRampToValueAtTime(L * 0.22, t + 0.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    }
  }
  // After the hum dies, a low, warm chord fades in and away: the lamp.
  function lamp(a, t) {
    [146.83, 220, 293.66].forEach(function (f, i) {
      tone(a, t + i * 0.08, 'sine', f, f, 0.03 - i * 0.006, 0.9, 3.2);
    });
  }
  function playFlip(a, toOff) {
    var t = a.currentTime + 0.01;
    clack(a, t, toOff);
    hum(a, t + 0.03, !toOff);
    if (toOff) lamp(a, t + 0.5);
  }
  // A flip by dragging on a touch screen happens before the browser counts it as a tap, so
  // sound may not be allowed yet. Then it plays the moment the finger lifts.
  var pending = null;
  function flushPending() {
    if (!pending) return;
    var p = pending;
    pending = null;
    var a = audio();
    if (!a || performance.now() - p.at > 1500) return;
    var go = function () {
      if (a.state === 'running') playFlip(a, p.toOff);
    };
    if (a.state === 'running') go();
    else if (a.resume) a.resume().then(go, function () {});
  }
  ['pointerup', 'touchend', 'keydown'].forEach(function (ev) { window.addEventListener(ev, flushPending, true); });
  function flipSound(toOff) {
    var a = audio();
    if (!a) return false;
    if (a.state !== 'running') {
      pending = { toOff: toOff, at: performance.now() };
      // inside a click this resolves straight away; after a touch drag it waits for the lift
      if (a.resume) {
        a.resume().then(function () {
          if (pending && a.state === 'running') {
            var p = pending;
            pending = null;
            playFlip(a, p.toOff);
          }
        }, function () {});
      }
      return false;
    }
    playFlip(a, toOff);
    return true;
  }
  function blip(i) {
    var a = audio();
    if (!a) return;
    var t = a.currentTime + 0.01;
    tone(a, t, 'sine', 880 + i * 60, 880 + i * 60, 0.05, 0.004, 0.12);
    tone(a, t + 0.09, 'sine', 1320 + i * 90, 1320 + i * 90, 0.04, 0.004, 0.16);
  }
  // Small sounds for the home page game (only ever after a tap, so audio is allowed)
  function noiseSweep(a, t, f0, f1, peak, dur, q) {
    var s = a.createBufferSource();
    s.buffer = noise;
    s.loop = true;
    var bp = a.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q || 0.9;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    var g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp);
    bp.connect(g);
    g.connect(out);
    s.start(t);
    s.stop(t + dur + 0.05);
  }
  var sfx = {
    flip: function (toOff) { return flipSound(toOff !== false); },
    blip: function (i) { blip(i || 0); },
    // a soft knock: touching something that isn't the switch
    tap: function () {
      var a = audio();
      if (!a || a.state !== 'running') return;
      var t = a.currentTime + 0.005;
      tick(a, t, 900, 0.18, 0.03);
      tone(a, t, 'sine', 210, 120, 0.12, 0.002, 0.09);
    },
    // paper, cloth, things moving out of the way
    rustle: function () {
      var a = audio();
      if (!a || a.state !== 'running') return;
      noiseSweep(a, a.currentTime + 0.01, 2400, 5200, 0.12, 0.35, 0.7);
    },
    // the world coming apart, or a curtain pulled away
    sweep: function (dur) {
      var a = audio();
      if (!a || a.state !== 'running') return;
      var t = a.currentTime + 0.02;
      dur = dur || 1.8;
      noiseSweep(a, t, 180, 1400, 0.16, dur, 0.6);
      tone(a, t, 'sine', 62, 40, 0.22, 0.4, dur);
    },
    buzz: function () {
      var a = audio();
      if (!a || a.state !== 'running') return;
      var t = a.currentTime + 0.01;
      tone(a, t, 'sawtooth', 120, 118, 0.025, 0.01, 0.16);
      tone(a, t + 0.22, 'sawtooth', 120, 118, 0.025, 0.01, 0.16);
    },
  };

  function haptic(toOff) {
    if (calm() || !navigator.vibrate) return;
    try {
      navigator.vibrate(toOff ? [10, 40, 22] : [12]);
    } catch (e) {}
  }

  /* Work comes back: a couple of notifications slide in when work mode is switched on ---- */
  var stack = null;
  var pingTimers = [];
  function pings() {
    var list = (T.pings || []).slice();
    if (!list.length || calm()) return;
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'workpings';
      stack.setAttribute('aria-hidden', 'true');
      document.body.appendChild(stack);
    }
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    list.slice(0, 2).forEach(function (p, i) {
      pingTimers.push(
        setTimeout(function () {
          if (off) return;
          var el = document.createElement('div');
          el.className = 'workping';
          var dot = document.createElement('span');
          dot.className = 'workping__dot';
          var who = document.createElement('b');
          who.textContent = p[0];
          var what = document.createElement('span');
          what.textContent = ' ' + p[1];
          el.appendChild(dot);
          el.appendChild(who);
          el.appendChild(what);
          stack.appendChild(el);
          requestAnimationFrame(function () {
            requestAnimationFrame(function () { el.classList.add('is-in'); });
          });
          blip(i);
          pingTimers.push(setTimeout(function () { dismiss(el, false); }, 4300 + i * 700));
        }, 700 + i * 950),
      );
    });
  }
  function dismiss(el, asleep) {
    if (!el.parentNode || el.classList.contains('is-out')) return;
    el.classList.add('is-out');
    if (asleep) el.classList.add('is-asleep');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 900);
  }
  function sleepPings() {
    pingTimers.forEach(clearTimeout);
    pingTimers = [];
    if (stack) qsa('.workping', stack).forEach(function (el, i) { setTimeout(function () { dismiss(el, true); }, i * 120); });
  }

  /* The state ------------------------------------------------------------------------- */
  var changeT = 0;
  function set(nextOff, opts) {
    opts = opts || {};
    nextOff = !!nextOff;
    if (nextOff === off) return;
    off = nextOff;
    offAt = off ? (opts.at ? new Date(opts.at) : new Date()) : null;
    if (!opts.fromStorage) {
      try {
        localStorage.setItem(KEY, JSON.stringify({ off: off, at: offAt ? offAt.getTime() : Date.now() }));
      } catch (e) {}
    }
    root.classList.add('shift-changing');
    root.classList.toggle('shift-to-off', off);
    root.classList.toggle('shift-to-on', !off);
    clearTimeout(changeT);
    changeT = setTimeout(function () { root.classList.remove('shift-changing', 'shift-to-off', 'shift-to-on'); }, 2600);
    root.setAttribute('data-shift', off ? 'off' : 'on');
    sync();
    renderText();
    if (!opts.silent) {
      flipSound(off);
      haptic(off);
    }
    if (off) sleepPings();
    else if (!opts.silent) pings();
    if (!opts.quiet) announce(off ? fill(T.announceOff, { t: hhmm(offAt) }) : T.announceOn || '');
    // say it on screen too when the little switch in the header is used (it's easy to miss what it did)
    if (opts.source === 'header' && ES.toast && (off ? T.toastOff : T.toastOn)) ES.toast(off ? T.toastOff : T.toastOn);
    window.dispatchEvent(new CustomEvent('es:shift', { detail: { off: off, source: opts.source || 'api', silent: !!opts.silent } }));
    if (opts.source && opts.source !== 'tab') track('shift_switch', { state: off ? 'off' : 'on', source: opts.source, period: period(new Date()) });
  }

  /* The words next to the header switch ("Work: on") flip it too */
  qsa('[data-shift-label]').forEach(function (l) {
    l.addEventListener('click', function () {
      var sw = l.parentNode && l.parentNode.querySelector('[data-shift-switch]');
      if (sw) sw.click();
    });
  });

  /* Switches: click or Space/Enter, drag the rocker, or arrow keys ---------------------- */
  function bind(b) {
    if (!b || b.__shiftBound) return;
    b.__shiftBound = true;
    var startY = 0, h = 1, dragging = false, moved = false, suppress = false, pid = null;
    var source = function () { return b.getAttribute('data-source') || 'switch'; };
    var flip = function () {
      b.classList.add('is-used');
      set(!off, { source: source() });
      b.dispatchEvent(new CustomEvent('es:flip', { bubbles: true, detail: { off: off } }));
    };
    var release = function () {
      b.style.removeProperty('--drag');
      b.classList.remove('is-dragging');
      try { if (pid != null) b.releasePointerCapture(pid); } catch (e) {}
      pid = null;
    };
    b.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      startY = e.clientY;
      h = b.getBoundingClientRect().height || 1;
      dragging = true;
      moved = false;
      pid = e.pointerId;
      try { b.setPointerCapture(pid); } catch (er) {}
    });
    b.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dy = e.clientY - startY;
      if (Math.abs(dy) > 5) moved = true;
      if (!moved) return;
      // pull down to switch off, push up to switch back on
      var p = Math.max(0, Math.min(1, (dy * (off ? -1 : 1)) / (h * 0.3)));
      b.classList.add('is-dragging');
      b.style.setProperty('--drag', p.toFixed(3));
      if (p >= 1) {
        dragging = false;
        suppress = true;
        release();
        flip();
      }
    });
    b.addEventListener('pointerup', function () {
      if (!dragging) return;
      dragging = false;
      if (moved) suppress = true; // let go before it snapped: it springs back
      release();
    });
    b.addEventListener('pointercancel', function () {
      dragging = false;
      release();
    });
    b.addEventListener('click', function () {
      if (suppress) {
        suppress = false;
        return;
      }
      flip();
    });
    b.addEventListener('keydown', function (e) {
      if ((e.key === 'ArrowDown' && !off) || (e.key === 'ArrowUp' && off)) {
        e.preventDefault();
        flip();
      }
    });
  }

  /* Still on shift? A calendar reminder for the usual end of the working day ----------- */
  function remind() {
    var d = new Date();
    var o = OUT.split(':');
    d.setHours(+o[0], +o[1], 0, 0);
    if (d <= new Date()) d.setDate(d.getDate() + 1);
    var local = function (x) { return x.getFullYear() + pad(x.getMonth() + 1) + pad(x.getDate()) + 'T' + pad(x.getHours()) + pad(x.getMinutes()) + '00'; };
    var utc = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    var url = '';
    try { url = new URL((CFG.urls && CFG.urls.ritual) || './', location.href).href; } catch (e) {}
    var ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ENDSHIFT//switch//EN', 'BEGIN:VEVENT',
      'UID:' + Date.now() + '-switch@endshift', 'DTSTAMP:' + utc, 'DTSTART:' + local(d), 'DURATION:PT20M',
      'SUMMARY:' + (T.remindTitle || 'ENDSHIFT'), url ? 'URL:' + url : '', url ? 'DESCRIPTION:' + url : '',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', 'DESCRIPTION:' + (T.remindTitle || 'ENDSHIFT'), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');
    try {
      var blob = new Blob([ics], { type: 'text/calendar' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'endshift-switch-off.ics';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 1000);
    } catch (e) {}
    track('shift_remind', { out: OUT });
  }

  /* Go ------------------------------------------------------------------------------------- */
  qsa('[data-shift-switch]').forEach(bind);
  qsa('[data-shift-remind]').forEach(function (b) { b.addEventListener('click', remind); });
  sync();
  renderText();

  // Another tab switched: follow it quietly.
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY) return;
    var w = readStored();
    set(!!w, { silent: true, quiet: true, fromStorage: true, source: 'tab', at: w && w.at });
  });

  /* Your end of shift: tap OUT on the hero time card to change it -------------------- */
  function setOut(v, quietly) {
    if (!/^\d{2}:\d{2}$/.test(v || '')) return;
    OUT = v;
    try { localStorage.setItem(OUT_KEY, v); } catch (e) {}
    qsa('[data-out-time]').forEach(function (el) { el.textContent = v; });
    qsa('[data-clock]').forEach(function (el) { el.setAttribute('data-out', v); });
    renderText();
    window.dispatchEvent(new CustomEvent('es:out', { detail: { out: v } }));
    if (!quietly) {
      announce(fill(T.outSaved, { t: v }));
      track('out_time_set', { hour: +v.split(':')[0] });
    }
  }
  qsa('[data-out-time]').forEach(function (el) { el.textContent = OUT; });
  qsa('[data-clock]').forEach(function (el) { el.setAttribute('data-out', OUT); });
  var outBtn = document.querySelector('[data-out-edit]');
  var outForm = document.querySelector('[data-out-editor]');
  if (outBtn && outForm) {
    var outInput = outForm.querySelector('input[type="time"]');
    var openEditor = function (open) {
      outForm.hidden = !open;
      outBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        outInput.value = OUT;
        outInput.focus();
      }
    };
    outBtn.addEventListener('click', function () { openEditor(outForm.hidden); });
    outForm.addEventListener('submit', function (e) {
      e.preventDefault();
      setOut(outInput.value);
      openEditor(false);
      outBtn.focus();
    });
    outForm.querySelector('[data-out-cancel]').addEventListener('click', function () {
      openEditor(false);
      outBtn.focus();
    });
    outForm.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        openEditor(false);
        outBtn.focus();
      }
    });
  }

  ES.shift = {
    out: function () { return OUT; },
    hasOwnOut: function () { return OUT !== DEFAULT_OUT || (function () { try { return !!localStorage.getItem(OUT_KEY); } catch (e) { return false; } })(); },
    setOut: setOut,
    isOff: function () { return off; },
    offAt: function () { return offAt; },
    set: set,
    bind: bind,
    period: period,
    sfx: sfx,
    haptic: haptic,
  };
})();
