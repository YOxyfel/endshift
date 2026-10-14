/* ENDSHIFT home page: "Watch with sound".

   The film (film.js) moves as you scroll. This plays it by itself, like a video: it scrolls the
   page at an easy pace, comes to rest on each line while the line is read out, and runs a quiet
   soundtrack under it: the drone of a working evening until the switch, then a warm chord, the
   small sounds of the ritual, the dream, the sunset.

   The voice is the recorded narration when there is one for this language (config
   story.watch.clips: f01…f38, as in the narration script), otherwise the device's own speech
   voice, otherwise none: the words are on screen anyway, and each line is held long enough to
   read it.

   Scrolling (wheel, a swipe, the arrow keys) pauses it where it is; Play carries on from wherever
   the film is. A tap on the picture pauses and plays, Space too; ← and → go a line back or on;
   Escape stops. It is only offered where the film itself runs (html.has-film). */
(function () {
  'use strict';

  var ES = (window.ES = window.ES || {});
  var root = document.documentElement;
  var film = document.querySelector('[data-film]');
  var bar = film && film.querySelector('[data-watch]');
  if (!film || !bar || !ES.film) return;
  var F = ES.film;
  var stage = film.querySelector('[data-film-stage]') || film;
  var CFG = {};
  try { CFG = JSON.parse((document.getElementById('es-config') || {}).textContent || '{}'); } catch (e) {}
  var WC = (CFG.story && CFG.story.watch) || {};
  var LANG = (WC.lang || root.lang || 'en').replace('_', '-');
  var CLIPS = WC.clips || {};

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var track = function (name, props) { if (ES.track) ES.track(name, props || {}); };
  var scrollNow = function () { return window.scrollY || window.pageYOffset || 0; };
  var mmss = function (s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  var playBtn = bar.querySelector('[data-watch-play]');
  var pos = bar.querySelector('[data-watch-pos]');
  var nowEl = bar.querySelector('[data-watch-now]');
  var totEl = bar.querySelector('[data-watch-total]');
  var voiceBtn = bar.querySelector('[data-watch-voice]');
  var soundBtn = bar.querySelector('[data-watch-sound]');
  var closeBtn = bar.querySelector('[data-watch-close]');
  var skipEl = film.querySelector('[data-film-skip]');
  var filmBtn = film.querySelector('.film__watch');

  // Voice and sound, as this viewer left them (this device only)
  var PREF = 'es:watch';
  var pref = { voice: true, sound: true };
  try {
    var saved = JSON.parse(localStorage.getItem(PREF) || 'null');
    if (saved) { pref.voice = saved.voice !== false; pref.sound = saved.sound !== false; }
  } catch (e) {}
  function savePref() { try { localStorage.setItem(PREF, JSON.stringify(pref)); } catch (e) {} }

  /* ------------------------------------------------------------------ the lines
     Each [data-say] is a line: when it is fully on screen (s), the last moment it still is (by),
     and the point the film may not pass until it has been said (hold): its own last moment, or
     the moment the next line starts to come in, whichever is first. */
  var cues = null, beats = null;
  function at(spec) {
    return spec.split('|').map(function (x) {
      var q = x.trim().split(/\s+/);
      return F.G(q[0], parseFloat(q[1]) || 0);
    });
  }
  function buildCues() {
    var FADE = F.FADE || 0.14;
    var list = Array.prototype.slice.call(film.querySelectorAll('[data-say]')).map(function (el, i) {
      var a, b, s, by, w;
      if (el.hasAttribute('data-say-at')) {
        w = at(el.getAttribute('data-say-at'));
        a = s = w[0];
        by = w[1];
      } else {
        w = at(el.getAttribute('data-show') || 'hall_in 0|hall_in 0');
        a = w[0];
        b = w[1];
        s = a <= 0.0001 ? a : a + FADE * 0.7;
        by = b >= F.TOTAL - 0.0001 ? F.TOTAL : b - FADE;
        if (by < s) s = by = (a + b) / 2;
      }
      var text = (el.getAttribute('data-say-text') || el.textContent || '').replace(/\s+/g, ' ').trim();
      return { id: el.getAttribute('data-say'), el: el, text: text, soft: el.hasAttribute('data-say-soft'), a: a, s: s, by: by, n: i };
    });
    list.sort(function (x, y) { return x.s - y.s || x.n - y.n; });
    list.forEach(function (c, k) {
      var nx = list[k + 1];
      c.k = k;
      c.hold = nx ? Math.max(c.s, Math.min(c.by, nx.a > c.s ? nx.a : nx.s)) : c.by;
    });
    beats = Object.keys(F.beats).map(function (k) { return { id: k, s: F.beats[k].s, e: F.beats[k].e }; }).sort(function (x, y) { return x.s - y.s; });
    return list;
  }
  function beatAt(T) {
    if (!beats) return '';
    for (var i = 0; i < beats.length; i++) if (T < beats[i].e) return beats[i].id;
    return beats[beats.length - 1].id;
  }

  /* ------------------------------------------------------------------ pace
     Screens of film per second between lines, a little slower where there is something to watch
     (the walk in, the crack, the three breaths, eyes closing, the sunset) and a little quicker
     through the zoom. */
  var V = 0.3, TS = 1; // (TS: a faster clock, for testing)
  var PACE = { hall_in: 0.7, cal_in: 0.85, cal_zoom: 1.15, bed_click: 0.8, crack: 0.75, reveal: 0.9, s6: 0.6, rit_done: 0.85, out: 0.85, sleep: 0.6, finale: 1.05, sun: 0.8, end: 0.7, coda: 0.8 };
  function cruise(T) { return V * (PACE[beatAt(T)] || 1); }
  function readTime(c) { return clamp(0.9 + c.text.split(/\s+/).length * 0.28, 1.4, 9); }
  function speakTime(c) { return c.text.length / (c.soft ? 12 : 13.5) + 0.4; }
  function lineTime(c) { return mode(c) === 'none' ? readTime(c) : speakTime(c); }

  // the clock: how long the film takes up to film time T, played like this (an estimate: the
  // voice sets the real pace). Sampled every .02 screens.
  var EST = null, STEP = 0.02;
  function estimate() {
    var n = Math.ceil(F.TOTAL / STEP) + 1, t = 0.6, k = 0;
    EST = new Float32Array(n + 1);
    for (var i = 0; i <= n; i++) {
      var T = Math.min(F.TOTAL, i * STEP);
      while (k < cues.length && cues[k].s <= T) {
        var c = cues[k++];
        t += Math.max(0, lineTime(c) + 0.3 - (c.hold - c.s) / cruise(c.s)) + 0.35;
      }
      EST[i] = t;
      t += STEP / cruise(T);
    }
    EST[n] += 2.5;
  }
  function est(T) {
    var x = clamp(T, 0, F.TOTAL) / STEP, i = Math.floor(x), f = x - i;
    if (i >= EST.length - 1) return EST[EST.length - 1];
    return EST[i] + (EST[i + 1] - EST[i]) * f;
  }
  function inv(t) {
    for (var i = 1; i < EST.length; i++) {
      if (EST[i] >= t) {
        var f = (t - EST[i - 1]) / Math.max(1e-6, EST[i] - EST[i - 1]);
        return clamp((i - 1 + clamp(f, 0, 1)) * STEP, 0, F.TOTAL);
      }
    }
    return F.TOTAL;
  }

  /* ------------------------------------------------------------------ the voice */
  var synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  var sv = null, voicesTried = false, synthFails = 0;
  var JUNK = /compact|eloquence|espeak|zarvox|albert|bad news|bahh|bells|boing|bubbles|cellos|whisper|wobble|trinoids|jester|organ|superstar|good news|deranged|hysterical|ralph|fred|junior|kathy|princess|grandma|grandpa|rocko|shelley|flo\b|eddy|reed|sandy/i;
  function pickVoice() {
    if (!synth) return null;
    var vs = [];
    try { vs = synth.getVoices() || []; } catch (e) {}
    var L = LANG.toLowerCase(), base = L.split('-')[0], best = null, bs = -1e9;
    vs.forEach(function (v) {
      var vl = String(v.lang || '').toLowerCase().replace('_', '-');
      if (vl.split('-')[0] !== base) return;
      var nm = v.name || '', s = 0;
      if (vl === L) s += 20;
      if (/natural|neural|premium|enhanced|online|wavenet|studio|siri/i.test(nm)) s += 40;
      if (base === 'en' && /uk english male|daniel|ryan|arthur|george|oliver|thomas|libby|sonia|serena|kate|jamie/i.test(nm)) s += 12;
      if (/google/i.test(nm)) s += 8;
      if (JUNK.test(nm)) s -= 60;
      if (v.localService) s += 2;
      if (v['default']) s += 1;
      if (s > bs) { bs = s; best = v; }
    });
    return best;
  }
  function loadVoices() {
    sv = pickVoice();
    voicesTried = true;
    voiceUi();
  }
  if (synth) {
    try {
      if (synth.addEventListener) synth.addEventListener('voiceschanged', loadVoices);
      else synth.onvoiceschanged = loadVoices;
    } catch (e) {}
  }
  function hasClip(c) { return !!CLIPS[c.id]; }
  // the device's own speech voice only if the config asks for it (story.watch.deviceVoice): next
  // to the recorded narration it sounds robotic, so by default the film is the recorded voice or
  // no voice (the words on screen and the soundtrack)
  var DEVICE = WC.deviceVoice === true;
  function deviceOk() { return !!(DEVICE && synth && sv && synthFails < 2); }
  function mode(c) {
    if (!pref.voice) return 'none';
    if (c && hasClip(c) && ac) return 'clip';
    return deviceOk() ? 'device' : 'none';
  }
  function voiceKind() {
    for (var k in CLIPS) if (CLIPS.hasOwnProperty(k)) return 'clip';
    return deviceOk() ? 'device' : 'none';
  }

  var token = 0, utts = [], clipSrc = null, sayTimer = 0, buffers = {}, cancelledAt = 0;
  function stopVoice() {
    token++;
    clearTimeout(sayTimer);
    if (synth) {
      try {
        if (synth.speaking || synth.pending) cancelledAt = performance.now();
        synth.cancel();
      } catch (e) {}
    }
    utts = [];
    if (clipSrc) { try { clipSrc.onended = null; clipSrc.stop(); } catch (e) {} clipSrc = null; }
  }
  function decode(buf) {
    return new Promise(function (ok, no) {
      try {
        var p = ac.decodeAudioData(buf, ok, no);
        if (p && p.then) p.then(ok, no);
      } catch (e) { no(e); }
    });
  }
  function loadClip(id) {
    if (!buffers[id]) {
      buffers[id] = fetch(CLIPS[id])
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(decode);
      buffers[id]['catch'](function () {});
    }
    return buffers[id];
  }
  function preload(k) {
    if (!ac) return;
    for (var j = k; j < Math.min(cues.length, k + 3); j++) if (hasClip(cues[j])) loadClip(cues[j].id);
  }
  // say a line, then call done() once (whatever happens)
  function say(c, done) {
    stopVoice();
    var my = token, t0 = performance.now(), m = mode(c);
    var floor = readTime(c) * (m === 'none' ? 1 : 0.55) * 1000;
    var called = false;
    var finish = function () {
      if (called || my !== token) return;
      called = true;
      // a line is never gone before it can be read, even if the voice was quick (or silent)
      var left = floor - (performance.now() - t0);
      if (left > 30) sayTimer = setTimeout(function () { if (my === token) done(); }, left / TS);
      else done();
    };
    if (m === 'clip') {
      loadClip(c.id).then(function (buf) {
        if (my !== token) return;
        var s = ac.createBufferSource();
        s.buffer = buf;
        s.connect(voiceBus);
        s.onended = function () { if (clipSrc === s) clipSrc = null; finish(); };
        clipSrc = s;
        s.start();
      }, function () {
        if (my !== token) return;
        if (deviceOk()) device(c, my, finish);
        else sayTimer = setTimeout(finish, (readTime(c) * 1000) / TS);
      });
    } else if (m === 'device') device(c, my, finish);
    else sayTimer = setTimeout(finish, (readTime(c) * 1000) / TS);
    preload(c.k + 1);
  }
  function device(c, my, finish) {
    // one sentence at a time: some browsers cut a long utterance off part way
    var parts = c.text.match(/[^.!?…]+[.!?…]+[”"»]?|[^.!?…]+$/g) || [c.text];
    var left = parts.length, quick = performance.now();
    var watchdog = setTimeout(finish, (speakTime(c) * 2.2 + 3) * 1000);
    // (speaking straight after a cancel can be swallowed: give it a moment)
    var wait = Math.max(0, 80 - (performance.now() - cancelledAt));
    if (wait > 0) {
      setTimeout(function () { if (my === token) queue(); }, wait);
      return;
    }
    queue();
    function queue() {
    parts.forEach(function (p) {
      var u = new SpeechSynthesisUtterance(p.trim());
      u.lang = sv ? sv.lang : LANG;
      if (sv) u.voice = sv;
      u.rate = c.soft ? 0.86 : 0.95;
      u.pitch = c.soft ? 0.96 : 1;
      u.volume = c.soft ? 0.85 : 1;
      u.onend = function () {
        if (my !== token) return;
        if (--left <= 0) { clearTimeout(watchdog); finish(); }
      };
      u.onerror = function (e) {
        if (my !== token) return;
        var why = e && e.error;
        if (why === 'interrupted' || why === 'canceled') return;
        // a voice that fails straight away twice is no voice: carry on without it
        if (performance.now() - quick < 400) { synthFails++; voiceUi(); }
        clearTimeout(watchdog);
        finish();
      };
      utts.push(u);
      try { synth.speak(u); } catch (e) { clearTimeout(watchdog); finish(); }
    });
    }
  }

  /* ------------------------------------------------------------------ the soundtrack */
  var ac = null, master = null, bedBus = null, sfxBus = null, voiceBus = null, noise = null, white = null, L = {}, lastLv = 0;
  var SFX_LV = 1.3; // the small sounds, a little forward of the music
  function audio() {
    if (ac) {
      if (ac.state === 'suspended' && ac.resume) ac.resume();
      return ac;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ac = new AC(); } catch (e) { return (ac = null); }
    var comp = ac.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 3;
    comp.connect(ac.destination);
    master = ac.createGain();
    master.gain.value = 0;
    master.connect(comp);
    bedBus = ac.createGain();
    bedBus.gain.value = 1;
    bedBus.connect(master);
    sfxBus = ac.createGain();
    sfxBus.gain.value = SFX_LV;
    sfxBus.connect(master);
    voiceBus = ac.createGain();
    voiceBus.gain.value = 1;
    voiceBus.connect(comp);
    // a little room for the small sounds
    var verb = ac.createConvolver(), n = Math.floor(ac.sampleRate * 1.6), ir = ac.createBuffer(2, n, ac.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = ir.getChannelData(ch);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6);
    }
    verb.buffer = ir;
    var wet = ac.createGain();
    wet.gain.value = 0.28;
    sfxBus.connect(verb);
    verb.connect(wet);
    wet.connect(master);
    // brown noise, two seconds, looped: the room
    var nn = ac.sampleRate * 2;
    noise = ac.createBuffer(1, nn, ac.sampleRate);
    var nd = noise.getChannelData(0), last = 0;
    for (var k = 0; k < nn; k++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      nd[k] = last * 3.2;
    }
    // and white noise, a second: the bright small sounds (paper, glass, a pen, breath)
    white = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    var wd = white.getChannelData(0);
    for (var w = 0; w < wd.length; w++) wd[w] = Math.random() * 2 - 1;
    layers();
    return ac;
  }
  function gain(v, to) { var g = ac.createGain(); g.gain.value = v; g.connect(to); return g; }
  function osc(type, f, to, det) { var o = ac.createOscillator(); o.type = type; o.frequency.value = f; if (det) o.detune.value = det; o.connect(to); o.start(); return o; }
  function layers() {
    // the room: a low, soft noise
    L.room = gain(0, bedBus);
    var rlp = ac.createBiquadFilter();
    rlp.type = 'lowpass';
    rlp.frequency.value = 380;
    rlp.connect(L.room);
    var rs = ac.createBufferSource();
    rs.buffer = noise;
    rs.loop = true;
    rs.connect(rlp);
    rs.start();
    // the working evening: a low drone that won't settle
    L.drone = gain(0, bedBus);
    var dlp = ac.createBiquadFilter();
    dlp.type = 'lowpass';
    dlp.frequency.value = 240;
    dlp.Q.value = 2;
    dlp.connect(L.drone);
    var dm = gain(0.33, dlp);
    osc('sawtooth', 55, dm);
    osc('sawtooth', 55, dm, 9);
    osc('sine', 110, gain(0.6, dlp), -4);
    osc('sine', 0.09, gain(70, dlp.frequency));
    // after the switch: a warm open chord (D, A, C#, E, F#), slowly breathing
    L.pad = gain(0, bedBus);
    L.padF = ac.createBiquadFilter();
    L.padF.type = 'lowpass';
    L.padF.frequency.value = 900;
    L.padF.Q.value = 0.6;
    L.padF.connect(L.pad);
    var pm = gain(0.14, L.padF);
    [146.83, 220, 277.18, 329.63, 369.99].forEach(function (f, i) {
      osc('triangle', f, pm, -5 + i);
      osc('sine', f, pm, 6 - i);
    });
    var trem = gain(0.025, pm.gain);
    osc('sine', 0.13, trem);
    // the dream: high, quiet, shimmering
    L.dream = gain(0, bedBus);
    var dg = gain(0.2, L.dream);
    [587.33, 739.99, 880].forEach(function (f, i) {
      var g = gain(0.33, dg);
      osc('sine', f, g, i * 3);
      osc('sine', 0.07 + i * 0.05, gain(0.22, g.gain));
    });
    // two small sounds that last as long as the picture does: the water poured, and breathing
    L.pour = noiseLayer(1000, 0.7);
    L.breath = noiseLayer(900, 0.55);
  }
  function noiseLayer(f, q) {
    var g = gain(0, sfxBus), bp = ac.createBiquadFilter(), lp = ac.createBiquadFilter(), s = ac.createBufferSource();
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = q;
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    s.buffer = white;
    s.loop = true;
    s.connect(bp);
    bp.connect(lp);
    lp.connect(g);
    s.start();
    g.f = bp.frequency;
    return g;
  }
  // the levels of the soundtrack at film time T
  function levels(T) {
    var G = F.G;
    var k = function (keys) {
      if (T <= keys[0][0]) return keys[0][1];
      for (var i = 0; i < keys.length - 1; i++) {
        if (T < keys[i + 1][0]) {
          var f = (T - keys[i][0]) / Math.max(1e-6, keys[i + 1][0] - keys[i][0]);
          return keys[i][1] + (keys[i + 1][1] - keys[i][1]) * (0.5 - 0.5 * Math.cos(Math.PI * f));
        }
      }
      return keys[keys.length - 1][1];
    };
    var click = G('bed_click', 0.4);
    // breathing: three breaths, in (brighter) and out (lower, longer), as the circle grows and shrinks
    var b0 = G('s6', 0.24), b1 = G('s6', 0.86), br = 0, brF = 900;
    if (T > b0 && T < b1) {
      var ph = (((T - b0) / (b1 - b0)) * 3) % 1;
      if (ph < 0.5) { br = 0.075 * Math.sin(2 * Math.PI * ph); brF = 1350; }
      else { br = 0.09 * Math.sin(2 * Math.PI * (ph - 0.5)); brF = 700; }
    }
    return {
      pour: k([[G('s3', 0.318), 0], [G('s3', 0.335), 0.11], [G('s3', 0.405), 0.09], [G('s3', 0.422), 0]]),
      pourF: k([[G('s3', 0.32), 850], [G('s3', 0.42), 1600]]),
      breath: br,
      breathF: brF,
      room: k([[0, 0.05], [click, 0.06], [click + 0.05, 0.03], [G('out', 0.4), 0.025], [G('sleep', 0.6), 0], [F.TOTAL, 0]]),
      drone: k([[0, 0], [G('hall_in', 0.6), 0.05], [G('cal_fill', 0), 0.035], [G('bed_wake', 0.3), 0.06], [G('bed_search', 0.9), 0.075], [click, 0.075], [click + 0.04, 0]]),
      pad: k([[0, 0], [G('crack', 0.25), 0], [G('reveal', 0.3), 0.06], [G('s6', 0), 0.06], [G('s6', 0.5), 0.045], [G('out', 0.3), 0.04], [G('sleep', 0.6), 0.025], [G('finale', 0.3), 0.04], [G('sun', 0.5), 0.06], [G('end', 0.7), 0.05], [F.TOTAL, 0.04]]),
      padF: k([[0, 700], [G('reveal', 0.3), 1000], [G('out', 0.3), 900], [G('sleep', 0.6), 480], [G('finale', 0.3), 1300], [G('sun', 0.6), 1900], [F.TOTAL, 1500]]),
      dream: k([[0, 0], [G('sleep', 0.6), 0], [G('finale', 0.25), 0.03], [G('finale', 0.9), 0.022], [G('sun', 0.45), 0], [F.TOTAL, 0]]),
    };
  }
  function soundTo(T, speaking, force) {
    if (!ac || !L.room) return;
    var now = performance.now();
    if (!force && now - lastLv < 50) return;
    lastLv = now;
    var t = ac.currentTime, lv = levels(T);
    L.room.gain.setTargetAtTime(lv.room, t, 0.4);
    L.drone.gain.setTargetAtTime(lv.drone, t, lv.drone < 0.01 ? 0.05 : 0.5);
    L.pad.gain.setTargetAtTime(lv.pad, t, 0.6);
    L.padF.frequency.setTargetAtTime(lv.padF, t, 0.8);
    L.dream.gain.setTargetAtTime(lv.dream, t, 0.8);
    // (these two only while the picture moves: held on a line, the water and the breath wait too)
    var mv = st.playing ? clamp(st.v / (0.1 * TS), 0, 1) : 0;
    L.pour.gain.setTargetAtTime(lv.pour * mv, t, 0.04);
    L.pour.f.setTargetAtTime(lv.pourF, t, 0.08);
    L.breath.gain.setTargetAtTime(lv.breath * mv, t, 0.09);
    L.breath.f.setTargetAtTime(lv.breathF, t, 0.12);
    sfxBus.gain.setTargetAtTime(speaking ? SFX_LV * 0.8 : SFX_LV, t, 0.25);
    var on = st.on && (st.playing || st.waiting) && pref.sound;
    master.gain.setTargetAtTime(on ? 1 : 0, t, on ? 0.35 : 0.12);
    // the music steps back while a line is said
    bedBus.gain.setTargetAtTime(speaking ? 0.55 : 1, t, 0.3);
    voiceBus.gain.setTargetAtTime(st.playing ? 1 : 0, t, 0.05);
  }

  // the small sounds, each once as the film passes it
  function env(g, t, peak, a, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  }
  // into the sound bus, a little to one side if asked
  function out(node, pan) {
    if (pan && ac.createStereoPanner) {
      var p = ac.createStereoPanner();
      p.pan.value = pan;
      node.connect(p);
      p.connect(sfxBus);
    } else node.connect(sfxBus);
  }
  function tick(t, f, peak, dur, q) {
    var s = ac.createBufferSource();
    s.buffer = noise;
    var bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = q || 1.3;
    var g = ac.createGain();
    env(g, t, peak, 0.0015, dur);
    s.connect(bp);
    bp.connect(g);
    g.connect(sfxBus);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.05);
  }
  // a burst of filtered noise: o = { w: white, f, f1 (glide to), q, type, peak, a (attack), dur, pan }
  function hit(t, o) {
    var s = ac.createBufferSource();
    s.buffer = o.w ? white : noise;
    s.loop = true;
    var f = ac.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.f, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    f.Q.value = o.q || 1;
    var g = ac.createGain();
    env(g, t, o.peak, o.a || 0.002, o.dur);
    s.connect(f);
    f.connect(g);
    out(g, o.pan);
    s.start(t, Math.random() * 0.9);
    s.stop(t + o.dur + 0.05);
  }
  function tone(t, type, f0, f1, peak, a, dur, to, pan) {
    var o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    var g = ac.createGain();
    env(g, t, peak, a, dur);
    o.connect(g);
    if (to) g.connect(to);
    else out(g, pan);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  function sweep(t, f0, f1, peak, dur) {
    var s = ac.createBufferSource();
    s.buffer = noise;
    s.loop = true;
    var bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.7;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    var g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp);
    bp.connect(g);
    g.connect(sfxBus);
    s.start(t);
    s.stop(t + dur + 0.05);
  }
  // a struck glass or bell: a few partials, each dying away
  function ting(t, f, peak, dur, parts, pan) {
    (parts || [[1, 1, 1], [2.76, 0.4, 0.6], [5.4, 0.15, 0.35]]).forEach(function (p) {
      tone(t, 'sine', f * p[0], f * p[0], peak * p[1], 0.002, dur * p[2], null, pan);
    });
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  var SFX = {
    // a phone buzzing on a table
    buzz: function (t) {
      [0, 0.24].forEach(function (d) {
        tone(t + d, 'sawtooth', 118, 116, 0.05, 0.01, 0.17);
        tick(t + d, 240, 0.05, 0.17, 3);
      });
    },
    // a footstep, in socks, on a wooden floor (left, right)
    step: function (t, i) {
      var p = i % 2 ? -0.22 : 0.22;
      hit(t, { f: 150, type: 'lowpass', q: 0.8, peak: 0.19, a: 0.006, dur: 0.17, pan: p });
      tone(t, 'sine', 84, 50, 0.04, 0.005, 0.12, null, p);
      hit(t + 0.03, { w: true, f: 1300, q: 0.9, peak: 0.03, a: 0.012, dur: 0.1, pan: p });
    },
    // a marker crossing a day out: two strokes
    mark: function (t) {
      [0, 0.17].forEach(function (d, i) {
        hit(t + d, { w: true, f: 2300 + i * 300, f1: 3100 - i * 200, q: 3.2, peak: 0.17, a: 0.03, dur: 0.15 });
      });
    },
    // and a ring round tonight
    ring: function (t) {
      hit(t, { w: true, f: 2100, f1: 3000, q: 3, peak: 0.14, a: 0.09, dur: 0.32 });
      hit(t + 0.28, { w: true, f: 3000, f1: 2300, q: 3, peak: 0.13, a: 0.05, dur: 0.3 });
    },
    // into tonight's square
    whoosh: function (t) {
      hit(t, { w: true, f: 260, f1: 2600, q: 0.9, peak: 0.075, a: 0.75, dur: 1.05 });
      tone(t + 0.15, 'sine', 90, 180, 0.05, 0.6, 0.95);
    },
    // one more notification
    ping: function (t, i) {
      var f = 880 + (i || 0) * 55;
      tone(t, 'sine', f, f, 0.035, 0.004, 0.14);
      tone(t + 0.08, 'sine', f * 1.5, f * 1.5, 0.026, 0.004, 0.2);
    },
    // out from under the covers
    covers: function (t) {
      hit(t, { w: true, f: 1100, f1: 650, q: 0.6, peak: 0.05, a: 0.3, dur: 1.1 });
      for (var i = 0; i < 9; i++) hit(t + rnd(0.1, 0.9), { w: true, f: rnd(1800, 3600), q: 2, peak: rnd(0.015, 0.03), a: 0.004, dur: rnd(0.03, 0.07), pan: rnd(-0.3, 0.3) });
    },
    // the phone's torch comes on
    torch: function (t) {
      hit(t, { w: true, f: 4200, q: 2, peak: 0.1, a: 0.001, dur: 0.012 });
      hit(t + 0.02, { w: true, f: 2600, q: 2, peak: 0.13, a: 0.001, dur: 0.026 });
    },
    // the WORK switch: the rocker snaps over and the work hum dies
    click: function (t) {
      tick(t, 2500, 0.28, 0.014);
      tick(t + 0.026, 1800, 0.7, 0.035);
      tick(t + 0.027, 5400, 0.16, 0.01);
      tone(t + 0.026, 'sine', 150, 55, 0.5, 0.003, 0.1);
      var g = ac.createGain();
      g.gain.setValueAtTime(0.05, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.012, t + 0.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      g.connect(sfxBus);
      [[100, 0.6], [200, 0.25], [300, 0.1]].forEach(function (h) {
        var o = ac.createOscillator();
        o.frequency.value = h[0];
        o.detune.setValueAtTime(0, t + 0.08);
        o.detune.linearRampToValueAtTime(-45, t + 1.1);
        var og = ac.createGain();
        og.gain.value = h[1];
        o.connect(og);
        og.connect(g);
        o.start(t + 0.03);
        o.stop(t + 1.3);
      });
    },
    // the work-lit picture cracks...
    crack: function (t) {
      tick(t, 4200, 0.2, 0.02, 0.8);
      tick(t + 0.05, 3000, 0.16, 0.03, 0.8);
      tick(t + 0.13, 5200, 0.12, 0.02, 0.8);
      hit(t, { w: true, f: 3400, q: 1.4, peak: 0.16, a: 0.001, dur: 0.05 });
      hit(t + 0.07, { w: true, f: 5200, q: 2.5, peak: 0.1, a: 0.001, dur: 0.04, pan: 0.3 });
      hit(t + 0.16, { w: true, f: 4400, q: 2.5, peak: 0.08, a: 0.001, dur: 0.04, pan: -0.3 });
      sweep(t + 0.1, 1600, 160, 0.13, 2.2);
      tone(t + 0.1, 'sine', 70, 38, 0.18, 0.3, 2);
    },
    // ...and falls away in pieces
    shards: function (t) {
      for (var i = 0; i < 18; i++) {
        var d = Math.pow(Math.random(), 1.5) * 1.4, f = rnd(2400, 6800), p = rnd(-0.6, 0.6);
        hit(t + d, { w: true, f: f, q: 7, peak: rnd(0.07, 0.15), a: 0.001, dur: 0.03, pan: p });
        tone(t + d, 'sine', f, f * 0.996, rnd(0.006, 0.015), 0.002, rnd(0.08, 0.3), null, p);
      }
      [0.55, 0.85, 1.2].forEach(function (d) { hit(t + d, { w: true, f: 1500, q: 1.4, peak: 0.05, a: 0.002, dur: 0.06, pan: rnd(-0.4, 0.4) }); });
    },
    // 1. the laptop shuts
    lid: function (t) {
      tone(t, 'sine', 120, 58, 0.13, 0.003, 0.13);
      hit(t, { f: 320, type: 'lowpass', q: 0.7, peak: 0.3, a: 0.003, dur: 0.09 });
      hit(t + 0.006, { w: true, f: 3300, q: 2, peak: 0.05, a: 0.001, dur: 0.016 });
    },
    // the pen: one scratch of many
    scrib: function (t) {
      var f = rnd(2600, 4600);
      hit(t, { w: true, f: f, f1: f * rnd(0.82, 1.15), q: 2.4, peak: rnd(0.06, 0.13), a: 0.006, dur: rnd(0.035, 0.09), pan: 0.12 });
    },
    // 2. the curtains: the rings run along the rail, the cloth swings over
    curtain: function (t) {
      for (var i = 0; i < 7; i++) hit(t + i * 0.05 + rnd(0, 0.02), { w: true, f: rnd(5000, 6600), q: 9, peak: 0.1, a: 0.001, dur: 0.05, pan: 0.35 - i * 0.07 });
      hit(t + 0.05, { w: true, f: 650, f1: 1400, q: 0.5, peak: 0.075, a: 0.4, dur: 1.3 });
    },
    rings: function (t) {
      for (var i = 0; i < 4; i++) hit(t + i * 0.045 + rnd(0, 0.015), { w: true, f: rnd(5000, 6400), q: 9, peak: 0.09, a: 0.001, dur: 0.05, pan: -0.15 });
    },
    // 3. the carafe's lip on the glass
    clink: function (t) { ting(t, 1950, 0.03, 0.7); },
    // a bubble in the glass, higher as it fills (k)
    bubble: function (t, k) {
      var f = 420 + (k || 0) * 650 + rnd(0, 260);
      tone(t, 'sine', f, f * 1.7, rnd(0.012, 0.03), 0.003, rnd(0.035, 0.07), null, -0.2);
    },
    // the glass back on the tray
    set: function (t) {
      tone(t, 'sine', 170, 95, 0.07, 0.002, 0.07);
      hit(t, { w: true, f: 1900, q: 3, peak: 0.09, a: 0.001, dur: 0.03 });
      ting(t, 2300, 0.01, 0.35);
    },
    // the cap: a little ratchet (n clicks)
    cap: function (t, n) {
      for (var i = 0; i < (n || 6); i++) hit(t + i * 0.055 + rnd(0, 0.012), { w: true, f: rnd(2900, 3700), q: 5, peak: 0.15, a: 0.001, dur: 0.018, pan: -0.25 });
    },
    // one capsule lands, and bounces
    pill: function (t) {
      hit(t, { w: true, f: 4200, q: 3, peak: 0.11, a: 0.001, dur: 0.014, pan: -0.2 });
      hit(t + 0.07, { w: true, f: 3600, q: 3, peak: 0.055, a: 0.001, dur: 0.012, pan: -0.2 });
    },
    // a step done: a soft stamp
    stamp: function (t) {
      tone(t, 'sine', 190, 95, 0.09, 0.002, 0.12);
      tick(t, 1100, 0.09, 0.03, 0.9);
    },
    // 4. a wall switch (the big light off)
    wall: function (t) {
      tick(t, 2300, 0.2, 0.012);
      tick(t + 0.02, 1600, 0.4, 0.03);
      tone(t + 0.02, 'sine', 170, 70, 0.25, 0.003, 0.08);
    },
    // a lamp's little switch
    lamp: function (t) {
      tick(t, 3400, 0.16, 0.01);
      tick(t + 0.03, 2200, 0.24, 0.02);
    },
    // the lamp's warm light filling the room: a soft note now and then (i: which)
    mote: function (t, i) {
      var f = [587.33, 739.99, 880, 659.25, 987.77][i % 5];
      tone(t, 'sine', f, f, 0.014, 0.02, 2.2, null, (i % 2 ? -0.3 : 0.3));
      tone(t, 'sine', f * 2, f * 2, 0.004, 0.02, 1.1);
    },
    // 5. the phone, face down
    flip: function (t) {
      tone(t, 'sine', 190, 115, 0.09, 0.002, 0.07);
      hit(t, { w: true, f: 1100, q: 1.5, peak: 0.06, a: 0.001, dur: 0.04 });
    },
    // a drawer, out (1) or in (0)
    drawer: function (t, outw) {
      hit(t, { w: true, f: outw ? 520 : 700, f1: outw ? 820 : 480, q: 0.8, peak: 0.1, a: 0.08, dur: 0.38 });
      for (var i = 0; i < 3; i++) hit(t + rnd(0.05, 0.3), { w: true, f: rnd(1300, 1900), q: 3, peak: 0.045, a: 0.001, dur: 0.02 });
    },
    // the phone into the drawer
    drop: function (t) {
      tone(t, 'sine', 150, 100, 0.06, 0.002, 0.06);
      hit(t, { w: true, f: 900, q: 1.2, peak: 0.045, a: 0.001, dur: 0.035 });
    },
    // the drawer shut
    thud: function (t) {
      tone(t, 'sine', 110, 55, 0.11, 0.003, 0.16);
      hit(t, { f: 260, type: 'lowpass', q: 0.7, peak: 0.22, a: 0.003, dur: 0.11 });
      hit(t, { w: true, f: 1200, q: 1.5, peak: 0.045, a: 0.001, dur: 0.03 });
    },
    // 7. the book: the cover opens...
    book: function (t) {
      hit(t, { w: true, f: 900, f1: 600, q: 0.7, peak: 0.07, a: 0.12, dur: 0.45 });
      hit(t + 0.36, { w: true, f: 1700, q: 2, peak: 0.065, a: 0.002, dur: 0.035 });
    },
    // ...and a page turns
    page: function (t) {
      hit(t, { w: true, f: 2400, f1: 4300, q: 0.9, peak: 0.08, a: 0.07, dur: 0.24, pan: rnd(-0.2, 0.2) });
      hit(t + 0.21, { w: true, f: 1800, q: 1.2, peak: 0.065, a: 0.002, dur: 0.03 });
    },
    // eyes closing (heavier each time: w)
    blink: function (t, w) {
      tone(t, 'sine', 72, 44, 0.05 * (w || 1), 0.04, 0.42);
      hit(t, { f: 210, type: 'lowpass', q: 0.7, peak: 0.17 * (w || 1), a: 0.04, dur: 0.38 });
    },
    // falling into the dream
    swell: function (t) {
      hit(t, { w: true, f: 280, f1: 3400, q: 0.8, peak: 0.045, a: 2.1, dur: 2.7 });
      [587.33, 880, 1174.66].forEach(function (f, i) { tone(t + 0.6 + i * 0.35, 'sine', f, f, 0.01, 1.2, 2.6); });
    },
    // the sun on the jar catches the light
    glint: function (t) {
      [1760, 2349.3, 2960].forEach(function (f, i) { tone(t + i * 0.07, 'sine', f, f, 0.012, 0.004, 1.3, null, 0.15 * (i - 1)); });
    },
    // the reset: the sun comes back up to the line
    reset: function (t) {
      [587.33, 739.99, 880, 1174.66].forEach(function (f, i) { ting(t + i * 0.17, f, 0.026, 1.8, [[1, 1, 1], [2, 0.25, 0.6]]); });
    },
    // the bell: shift over
    bell: function (t) {
      [[784, 0.05, 3.2], [1568.6, 0.018, 2.2], [2352, 0.01, 1.4]].forEach(function (p) { tone(t, 'sine', p[0], p[0], p[1], 0.006, p[2]); });
      tone(t + 0.04, 'sine', 196, 196, 0.03, 0.08, 3.4);
    },
  };
  // Each sound at its moment in the film [T, name, arg]; and a few sounds made of many small ones,
  // as many as the film moves through [from, to, name, per screen of film]
  var EV = null, GR = null;
  function buildEvents() {
    var G = F.G, i, n;
    EV = [[G('hall_in', 0.62), 'buzz'], [G('hall_walk', 0.24), 'buzz']];
    // the calendar: five days crossed out, then a ring round tonight
    for (i = 0; i < 5; i++) EV.push([G('cal_fill', 0.122 + i * 0.15), 'mark']);
    EV.push([G('cal_fill', 0.865), 'ring'], [G('cal_zoom', 0.08), 'whoosh']);
    EV.push([G('bed_wake', 0.03), 'covers'], [G('bed_wake', 0.63), 'torch']);
    for (i = 0; i < 7; i++) EV.push([G('bed_wake', 0.32 + i * 0.05), 'ping', i]);
    EV.push([G('bed_click', 0.39), 'click'], [G('crack', 0.04), 'crack'], [G('crack', 0.3), 'shards']);
    for (n = 1; n <= 7; n++) EV.push([G('s' + n, 0.78), 'stamp']);
    EV.push([G('s1', 0.425), 'lid']);
    EV.push([G('s2', 0.27), 'curtain'], [G('s2', 0.69), 'rings']);
    EV.push([G('s3', 0.31), 'clink'], [G('s3', 0.665), 'set'], [G('s3', 0.685), 'cap', 6], [G('s3', 0.815), 'pill'], [G('s3', 0.85), 'cap', 4]);
    EV.push([G('s4', 0.15), 'wall'], [G('s4', 0.235), 'lamp']);
    for (i = 0; i < 5; i++) EV.push([G('s4', 0.34 + i * 0.1), 'mote', i]);
    EV.push([G('s5', 0.37), 'flip'], [G('s5', 0.4), 'drawer', 1], [G('s5', 0.6), 'drop'], [G('s5', 0.64), 'drawer', 0], [G('s5', 0.735), 'thud']);
    EV.push([G('s7', 0.23), 'book']);
    for (i = 0; i < 3; i++) EV.push([G('s7', 0.45 + i * 0.12), 'page']);
    EV.push([G('out', 0.18), 'lamp'], [G('out', 0.78), 'blink', 0.8], [G('sleep', 0.08), 'blink', 1], [G('sleep', 0.28), 'blink', 0.9], [G('sleep', 0.5), 'swell']);
    EV.push([G('sun', 0.28), 'glint'], [G('end', 0.13), 'reset'], [G('coda', 0.22), 'bell']);
    GR = [
      { a: G('s1', 0.48), b: G('s1', 0.76), sfx: 'scrib', per: 140, acc: 0 },
      { a: G('s3', 0.33), b: G('s3', 0.415), sfx: 'bubble', per: 170, acc: 0 },
    ];
  }
  function events(a, b) {
    if (!ac || !pref.sound || b <= a || b - a > 0.25) return;
    var t = ac.currentTime + 0.04;
    EV.forEach(function (e) { if (e[0] > a && e[0] <= b) SFX[e[1]](t, e[2]); });
    GR.forEach(function (g) {
      var ov = Math.min(b, g.b) - Math.max(a, g.a);
      if (ov <= 0) return;
      g.acc += ov * g.per;
      while (g.acc >= 1) {
        g.acc -= 1;
        SFX[g.sfx](t + Math.random() * 0.03, (b - g.a) / (g.b - g.a));
      }
    });
    // footsteps
    if (F.stride) {
      var sa = F.stride(a), sb = F.stride(b);
      if (sb && sb.n > 0 && (!sa || sa.k !== sb.k || sb.n > sa.n)) SFX.step(t, sb.n);
    }
    // the dream's bells: now and then, a note
    if (a > F.G('finale', 0.05) && a < F.G('sun', 0.35) && performance.now() > nextBell) {
      nextBell = performance.now() + 1100 + Math.random() * 1700;
      var notes = [587.33, 659.25, 739.99, 880, 987.77, 1174.66];
      var f = notes[Math.floor(Math.random() * notes.length)];
      tone(t, 'sine', f, f, 0.022, 0.01, 2.6);
      tone(t, 'sine', f * 2.001, f * 2.001, 0.006, 0.01, 1.4);
    }
  }
  var nextBell = 0;

  /* ------------------------------------------------------------------ the phone's sound session
     A silent track plays alongside: phones then treat the page as playing media (an iPhone on
     silent would otherwise mute the music and a recorded voice), and the lock screen gets
     play and pause. */
  var quiet = null;
  function session(on) {
    if (!WC.quiet) return;
    try {
      if (!quiet) {
        quiet = new Audio();
        quiet.loop = true;
        quiet.preload = 'auto';
        quiet.setAttribute('playsinline', '');
        quiet.src = WC.quiet;
        if ('mediaSession' in navigator) {
          try {
            navigator.mediaSession.metadata = new window.MediaMetadata({ title: (document.querySelector('#film-title') || {}).textContent || document.title, artist: 'ENDSHIFT' });
            navigator.mediaSession.setActionHandler('play', function () { play('media'); });
            navigator.mediaSession.setActionHandler('pause', function () { pause('media'); });
          } catch (e) {}
        }
      }
      if (on) {
        var pr = quiet.play();
        if (pr && pr['catch']) pr['catch'](function () {});
      } else quiet.pause();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = on ? 'playing' : 'paused';
    } catch (e) {}
  }

  /* ------------------------------------------------------------------ playing */
  var st = { on: false, playing: false, waiting: false, ended: false, T: 0, v: 0, next: 0, line: null, rest: 0, lastY: -1, lastNow: 0, raf: 0, el: 0, from: '', dragging: false };

  function goTo(T) {
    var y = Math.round(F.y(T));
    if (Math.abs(scrollNow() - y) >= 1) window.scrollTo(0, y);
    st.lastY = scrollNow();
  }
  // jump to film time T: earlier lines are done, the one on screen (if any) is said again
  function seek(T) {
    stopVoice();
    st.T = clamp(T, 0, F.TOTAL);
    st.v = 0;
    st.line = null;
    st.ended = false;
    var k = 0;
    while (k < cues.length && cues[k].hold < st.T - 0.02) k++;
    st.next = k;
    st.el = est(st.T);
  }
  function kick() { if (!st.raf) st.raf = requestAnimationFrame(frame); }
  function frame(now) {
    st.raf = 0;
    if (!st.on) return;
    if (!F.live()) { close('off'); return; }
    var dt = st.lastNow ? Math.min(0.1 * TS, (now - st.lastNow) / 1000) : 0;
    st.lastNow = now;
    var speaking = false;
    if (st.waiting) {
      // the rooms are being built: wait for them, then a breath before it starts
      if (F.ready()) {
        if (!st.readyAt) st.readyAt = now;
        if (now - st.readyAt > 550 / TS) { st.waiting = false; st.playing = true; st.lastY = -1; goTo(st.T); wake(); }
      } else if (now - st.waitFrom > 6000) { close('timeout'); return; }
      else F.build();
    } else if (st.playing) {
      // somebody scrolled: stop where they are
      var y = scrollNow();
      if (st.lastY >= 0 && Math.abs(y - st.lastY) > 3) { pause('scroll'); return; }
      var T = st.T, c = st.line ? st.line.c : null;
      if (c && st.line.done && now >= st.rest) { st.line = null; c = null; }
      var nx = cues[st.next];
      // where the film has to come to rest next: this line's hold, or the next line's
      var stop = c ? c.hold : nx ? nx.hold : F.TOTAL;
      var vt = Math.min(cruise(T), (Math.max(0, stop - T) * 2.4 + 0.012) * TS);
      st.v += (vt - st.v) * (1 - Math.exp(-dt * 4 * TS));
      var nt = Math.min(T + st.v * dt, stop, F.TOTAL);
      if (nt < T) nt = T;
      events(T, nt);
      st.T = nt;
      st.el += dt;
      // the next line is on screen: say it
      if (!st.line && nx && st.T >= nx.s - 0.006) {
        st.next++;
        var line = { c: nx, done: false };
        st.line = line;
        say(nx, function () {
          if (st.line !== line) return;
          line.done = true;
          st.rest = performance.now() + (nx.soft ? 550 : 300) / TS;
        });
        try { window.dispatchEvent(new CustomEvent('es:watch-line', { detail: { id: nx.id, T: st.T } })); } catch (e) {}
      }
      speaking = !!(st.line && !st.line.done);
      if (st.T >= F.TOTAL - 1e-4 && !st.line && st.next >= cues.length) { finish(); return; }
      goTo(st.T);
    }
    soundTo(st.T, speaking);
    ui();
    if (st.playing || st.waiting) kick();
  }

  function play(how) {
    if (!st.on || st.waiting) return;
    setTimeout(wake, 0);
    audio();
    session(true);
    if (st.ended) { seek(0); goTo(0); }
    var t = clamp(F.t(scrollNow()), 0, F.TOTAL);
    if (Math.abs(t - st.T) > 0.01) seek(t);
    else if (st.line) { st.next = st.line.c.k; st.line = null; }
    st.playing = true;
    st.lastNow = 0;
    st.lastY = -1;
    track('film_watch', { action: 'resume', how: how || 'button', beat: beatAt(st.T) });
    soundTo(st.T, false, true);
    ui();
    kick();
  }
  function pause(how) {
    if (!st.playing) return;
    st.playing = false;
    st.v = 0;
    stopVoice();
    session(false);
    // the line that was being said is said again on Play
    if (st.line) { st.next = st.line.c.k; st.line = null; }
    track('film_watch', { action: 'pause', how: how || 'button', beat: beatAt(st.T) });
    wake();
    soundTo(st.T, false, true);
    ui();
  }
  function finish() {
    st.playing = false;
    st.ended = true;
    stopVoice();
    session(false);
    track('film_watch', { action: 'end', voice: voiceKind() });
    wake();
    if (ac && master) master.gain.setTargetAtTime(0, ac.currentTime, 1.6);
    ui();
  }
  function toggle(how) {
    if (st.playing) pause(how);
    else play(how);
  }

  // a short, eased ride to where the film starts
  function glide(y1, then) {
    var y0 = scrollNow(), d = y1 - y0;
    if (Math.abs(d) < 2) { then(); return; }
    var dur = Math.min(900, 280 + Math.sqrt(Math.abs(d)) * 9), t0 = performance.now();
    var step = function (now) {
      if (!st.on) return;
      var k = Math.min(1, (now - t0) / dur);
      var e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      window.scrollTo(0, Math.round(y0 + d * e));
      if (k < 1) requestAnimationFrame(step);
      else then();
    };
    requestAnimationFrame(step);
  }

  function start(from, trigger) {
    if (!F.live()) return false;
    // inside the tap: wake the sound and the voice now (browsers only allow it here)
    audio();
    session(true);
    if (synth && DEVICE) {
      try {
        synth.cancel();
        var u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        synth.speak(u);
      } catch (e) {}
      if (!voicesTried || !sv) loadVoices();
    }
    if (!cues) {
      cues = buildCues();
      buildEvents();
    }
    estimate();
    st.trigger = trigger || null;
    st.from = from;
    st.on = true;
    var t0 = from === 'top' ? 0 : clamp(F.t(scrollNow()), 0, F.TOTAL);
    if (t0 > F.TOTAL - 0.6) t0 = 0;
    seek(t0);
    // from the middle: back to the start of the line that's on screen
    if (st.next < cues.length && cues[st.next].s < st.T) st.T = Math.max(0, cues[st.next].s - 0.04);
    st.el = est(st.T);
    // the first lines' recordings start loading now, while the page glides to the film
    preload(st.next);
    st.playing = false;
    st.ended = false;
    st.waiting = true;
    st.readyAt = 0;
    st.waitFrom = performance.now();
    root.classList.add('is-watching');
    bar.hidden = false;
    voiceUi();
    soundUi();
    ui();
    try { playBtn.focus({ preventScroll: true }); } catch (e) { playBtn.focus(); }
    track('film_watch', { action: 'start', from: from, via: trigger && trigger.hasAttribute('data-watch-nudge') ? 'nudge' : 'button', voice: pref.voice ? voiceKind() : 'off', sound: pref.sound });
    nudgeDone();
    glide(Math.round(F.y(st.T)), function () {
      if (!st.on) return;
      F.build();
      st.lastNow = 0;
      kick();
    });
    return true;
  }
  function close(how) {
    if (!st.on) return;
    var hadFocus = bar.contains(document.activeElement);
    if (st.playing) pause(how);
    stopVoice();
    session(false);
    st.on = false;
    st.playing = st.waiting = false;
    if (st.raf) cancelAnimationFrame(st.raf);
    st.raf = 0;
    if (ac && master) master.gain.setTargetAtTime(0, ac.currentTime, 0.15);
    root.classList.remove('is-watching', 'watch-idle');
    setTimeout(nudgeUi, 0);
    clearTimeout(idleT);
    bar.hidden = true;
    track('film_watch', { action: 'close', how: how || 'button', beat: beatAt(st.T), percent: Math.round((st.T / F.TOTAL) * 100) });
    if (hadFocus) {
      var back = st.trigger && st.trigger.offsetParent ? st.trigger : filmBtn && filmBtn.offsetParent ? filmBtn : null;
      if (back) { try { back.focus({ preventScroll: true }); } catch (e) {} }
    }
  }

  /* ------------------------------------------------------------------ "much better with narration"
     A hand-drawn note points at the play buttons while the narration is new: on the first six
     visits, until the film has been watched once. The one in the film only at its start. */
  var nudges = Array.prototype.slice.call(document.querySelectorAll('[data-watch-nudge]'));
  var NKEY = 'es:nudge-watch', nudgeOn = false;
  if (nudges.length) {
    var seenN = null;
    try { seenN = localStorage.getItem(NKEY); } catch (e) {}
    if (seenN === 'done' || (parseInt(seenN, 10) || 0) >= 6) nudges.forEach(function (n) { n.parentNode.removeChild(n); });
    else {
      nudgeOn = true;
      try { localStorage.setItem(NKEY, String((parseInt(seenN, 10) || 0) + 1)); } catch (e) {}
    }
  }
  function nudgeUi() {
    if (!nudges.length) return;
    var live = nudgeOn && F.live() && !st.on, t = F.t(scrollNow());
    nudges.forEach(function (n) {
      var film = n.classList.contains('nudge--film');
      var ring = live && (!film || (t > -0.6 && t < 0.45));
      var on = ring && !(film && clashes(n));
      if (n.hidden === on) n.hidden = !on;
      var target = n.previousElementSibling;
      if (target && target.hasAttribute('data-watch-start')) target.classList.toggle('is-nudged', ring);
    });
  }
  // The film's note hangs under its button in the top corner. On some screens the hall's title
  // reaches that far: then the note stays away (the button still glows, and the In short note
  // still points the way). Measured once per screen size, against the title's letters.
  var titleEl = film.querySelector('#film-title'), clashAt = '', clash = false, capCx = null;
  // where an element's capitals sit inside its line box: [top, bottom], from the top of the box
  function capBand(el) {
    try {
      var cs = getComputedStyle(el);
      capCx = capCx || document.createElement('canvas').getContext('2d');
      capCx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      var m = capCx.measureText('H');
      if (!m.fontBoundingBoxAscent || !m.actualBoundingBoxAscent) return null;
      return [m.fontBoundingBoxAscent - m.actualBoundingBoxAscent, m.fontBoundingBoxAscent];
    } catch (e) { return null; }
  }
  function clashes(n) {
    var key = window.innerWidth + 'x' + window.innerHeight;
    if (key === clashAt) return clash;
    clashAt = key;
    clash = false;
    if (!titleEl || !document.createTreeWalker) return clash;
    var was = n.hidden;
    n.hidden = false;
    n.style.animation = 'none';
    var a = n.getBoundingClientRect();
    if (a.width) {
      var tw = document.createTreeWalker(titleEl, 4, null), rg = document.createRange(), tn, rs, r, i, band;
      while (!clash && (tn = tw.nextNode())) {
        rg.selectNodeContents(tn);
        rs = rg.getClientRects();
        band = capBand(tn.parentNode);
        for (i = 0; i < rs.length; i++) {
          r = rs[i];
          // (a line's box is much taller than its capitals: only the capitals count)
          var top = band ? r.top + band[0] : r.top, bot = band ? r.top + band[1] : r.bottom;
          if (r.width > 1 && r.right > a.left - 8 && r.left < a.right + 8 && bot > a.top - 4 && top < a.bottom + 4) { clash = true; break; }
        }
      }
    }
    n.style.animation = '';
    n.hidden = was;
    return clash;
  }
  function nudgeDone() {
    if (!nudgeOn) return;
    nudgeOn = false;
    try { localStorage.setItem(NKEY, 'done'); } catch (e) {}
    nudgeUi();
  }
  if (nudges.length && nudgeOn) {
    window.addEventListener('scroll', nudgeUi, { passive: true });
    window.addEventListener('es:calm', function () { setTimeout(nudgeUi, 0); });
    // (the film decides whether it runs a moment after load)
    setTimeout(nudgeUi, 0);
    window.addEventListener('load', function () { clashAt = ''; nudgeUi(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { clashAt = ''; nudgeUi(); });
  }

  /* ------------------------------------------------------------------ the bar
     Like a video's controls: while it plays they step aside after a moment (a thin line keeps
     the progress), and come back with the pointer, a key or a tap. */
  var idleT = 0, tapWoke = false;
  function wake() {
    root.classList.remove('watch-idle');
    clearTimeout(idleT);
    if (st.on && st.playing) idleT = setTimeout(rest, 2600);
  }
  function rest() {
    if (!st.on || !st.playing || st.dragging) return;
    if (bar.matches(':hover')) { wake(); return; }
    root.classList.add('watch-idle');
  }
  document.addEventListener('pointermove', function (e) { if (st.on && e.pointerType === 'mouse') wake(); }, { passive: true });
  document.addEventListener('pointerdown', function (e) {
    if (!st.on) return;
    tapWoke = e.pointerType !== 'mouse' && root.classList.contains('watch-idle') && !bar.contains(e.target);
    wake();
  }, { passive: true });
  bar.addEventListener('focusin', function () { if (st.on) wake(); });

  var shownSec = -1, shownTot = -1, shownPos = -1, shownState = '';
  function ui() {
    var total = EST ? EST[EST.length - 1] : 0;
    var elapsed = st.el;
    // the voice sets the real pace: the length stretches with it
    var tot = Math.max(total, elapsed + (total - est(st.T)));
    var state = st.waiting ? 'wait' : st.playing ? 'pause' : st.ended ? 'replay' : 'play';
    if (state !== shownState) {
      shownState = state;
      bar.setAttribute('data-state', state);
      playBtn.setAttribute('aria-label', playBtn.getAttribute('data-' + (state === 'wait' || state === 'pause' ? 'pause' : state)) || '');
    }
    var sec = Math.round(st.ended ? tot : elapsed);
    if (sec !== shownSec) { shownSec = sec; if (nowEl) nowEl.textContent = mmss(sec); }
    if (shownTot < 0 || Math.abs(tot - shownTot) >= 2) { shownTot = tot; if (totEl) totEl.textContent = mmss(tot); }
    if (!st.dragging) {
      var p = Math.round((st.ended ? 1 : clamp(elapsed / Math.max(1, tot), 0, 1)) * 1000);
      if (p !== shownPos) {
        shownPos = p;
        pos.value = p;
        pos.style.setProperty('--p', (p / 10).toFixed(1) + '%');
        pos.setAttribute('aria-valuetext', mmss(sec) + ' ' + (pos.getAttribute('data-of') || '/') + ' ' + mmss(tot));
      }
    }
  }
  function voiceUi() {
    var kind = voiceKind();
    // nothing recorded and no device voice wanted: no voice button at all
    voiceBtn.hidden = kind === 'none' && !DEVICE;
    var na = kind === 'none' && voicesTried;
    voiceBtn.classList.toggle('is-na', na);
    voiceBtn.setAttribute('aria-pressed', String(pref.voice && !na));
    var label = voiceBtn.getAttribute('aria-label') || '';
    var credit = voiceBtn.getAttribute('data-credit');
    var note = na ? voiceBtn.getAttribute('data-none') : kind === 'device' ? voiceBtn.getAttribute('data-device') : kind === 'clip' && credit ? label + '. ' + credit : label;
    voiceBtn.title = note || label;
  }
  function soundUi() { soundBtn.setAttribute('aria-pressed', String(pref.sound)); }

  playBtn.addEventListener('click', function () { toggle('button'); });
  closeBtn.addEventListener('click', function () { close('button'); });
  voiceBtn.addEventListener('click', function () {
    if (voiceBtn.classList.contains('is-na')) return;
    pref.voice = !pref.voice;
    savePref();
    voiceUi();
    // the line on screen is said again (or not) straight away
    if (st.playing && st.line) {
      var c = st.line.c;
      stopVoice();
      st.line = null;
      st.next = c.k;
    }
    track('film_watch', { action: pref.voice ? 'voice_on' : 'voice_off' });
  });
  soundBtn.addEventListener('click', function () {
    pref.sound = !pref.sound;
    savePref();
    soundUi();
    soundTo(st.T, false, true);
    track('film_watch', { action: pref.sound ? 'sound_on' : 'sound_off' });
  });
  // the position: drag to anywhere in the film
  var resumeAfter = false;
  pos.addEventListener('pointerdown', function () { st.dragging = true; resumeAfter = st.playing; if (st.playing) pause('seek'); });
  pos.addEventListener('input', function () {
    if (!EST) return;
    if (!st.dragging) { resumeAfter = resumeAfter || st.playing; if (st.playing) pause('seek'); }
    pos.style.setProperty('--p', (pos.value / 10).toFixed(1) + '%');
    seek(inv((pos.value / 1000) * EST[EST.length - 1]));
    goTo(st.T);
    soundTo(st.T, false, true);
    ui();
  });
  var endDrag = function () {
    if (!st.dragging && !resumeAfter) return;
    st.dragging = false;
    shownPos = -1;
    if (resumeAfter) { resumeAfter = false; play('seek'); }
    else ui();
  };
  pos.addEventListener('change', endDrag);
  pos.addEventListener('pointerup', endDrag);
  pos.addEventListener('pointercancel', endDrag);

  // the ways in: "Watch with sound" in the film, and under the summary above it
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-watch-start]');
    if (!b) return;
    if (st.on) { play('button'); return; }
    if (start(b.getAttribute('data-watch-from') || 'here', b)) e.preventDefault();
  });
  // a tap on the picture: pause, play (not on a link or a button in it)
  stage.addEventListener('click', function (e) {
    if (!st.on || st.waiting) return;
    if (e.target.closest('a, button, input, select, textarea, label, [data-watch]')) return;
    // on a touch screen the first tap only brings the controls back
    if (tapWoke) { tapWoke = false; return; }
    toggle('tap');
  });
  if (skipEl) skipEl.addEventListener('click', function () { close('skip'); });

  // scrolling by hand stops it; the keys work like a video's
  var scrollKeys = { ArrowUp: 1, ArrowDown: 1, PageUp: 1, PageDown: 1, Home: 1, End: 1 };
  window.addEventListener('wheel', function () { if (st.playing) pause('scroll'); }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (st.playing && !(e.target.closest && e.target.closest('[data-watch]'))) pause('scroll');
  }, { passive: true });
  document.addEventListener('keydown', function (e) {
    if (!st.on || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    wake();
    var tag = (e.target && e.target.tagName) || '';
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag) || (e.target && e.target.isContentEditable);
    if (e.key === 'Escape') { close('key'); return; }
    if (typing && e.target !== pos) return;
    if ((e.key === ' ' && !/^(BUTTON|A)$/.test(tag) && e.target !== pos) || e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      toggle('key');
    } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.target !== pos && cues) {
      e.preventDefault();
      // the line the film is at, then the one before or after it
      var k = -1;
      for (var j = 0; j < cues.length; j++) if (cues[j].s <= st.T + 0.035) k = j;
      k = clamp(e.key === 'ArrowLeft' ? k - 1 : k + 1, 0, cues.length - 1);
      var was = st.playing || resumeAfter;
      if (st.playing) pause('key');
      seek(Math.max(0, cues[k].s - 0.03));
      goTo(st.T);
      soundTo(st.T, false, true);
      ui();
      if (was) play('key');
    } else if (scrollKeys[e.key] && st.playing && e.target !== pos) pause('scroll');
  });
  // while paused: the film follows the scroll, and leaving it puts the player away
  window.addEventListener('scroll', function () {
    if (!st.on || st.playing || st.waiting || st.dragging) return;
    var t = F.t(scrollNow());
    if (t < -0.5 || t > F.TOTAL + 0.6) { close('left'); return; }
    if (Math.abs(t - st.T) > 0.005 && !(st.ended && t >= F.TOTAL - 0.05)) {
      seek(t);
      soundTo(st.T, false);
      ui();
    }
  }, { passive: true });
  document.addEventListener('visibilitychange', function () { if (document.hidden && st.playing) pause('hidden'); });
  window.addEventListener('pagehide', function () { stopVoice(); });
  window.addEventListener('es:calm', function () { setTimeout(function () { if (st.on && !F.live()) close('calm'); }, 0); });

  ES.watch = {
    start: start,
    play: play,
    pause: pause,
    close: close,
    state: function () { return { on: st.on, playing: st.playing, waiting: st.waiting, ended: st.ended, T: st.T, line: st.line ? st.line.c.id : null, next: cues && cues[st.next] ? cues[st.next].id : null, voice: voiceKind(), voiceName: sv ? sv.name : null }; },
    cues: function () { if (!cues) { cues = buildCues(); buildEvents(); } return cues.map(function (c) { return { id: c.id, s: c.s, hold: c.hold, by: c.by, text: c.text }; }); },
    estimate: function () { if (!cues) { cues = buildCues(); buildEvents(); } estimate(); return EST[EST.length - 1]; },
    // (for testing: a faster film)
    speed: function (x) { TS = x || 1; V = 0.3 * TS; },
    // (for testing: the sounds, their moments, and where they go)
    sounds: function () { if (!cues) { cues = buildCues(); buildEvents(); } return { sfx: SFX, ev: EV, ac: audio(), bus: sfxBus }; },
  };
})();
