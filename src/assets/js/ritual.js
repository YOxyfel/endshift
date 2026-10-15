/* ENDSHIFT ritual: setup, the full-screen run, breathing guide, done screen.
   Everything runs on the device. The run happens in the evening room (ES.EveningRoom, the home
   page's bedroom, evening-room.js); without WebGL, with reduced motion, in low-stim mode and on
   the way home it uses the flat scenes (ES.RitualScenes). Sound: ES.RitualAudio. */
(function () {
  'use strict';

  var ES = window.ES || {};
  var CFG = (ES.config && ES.config.ritual) || null;
  var root = document.querySelector('[data-ritual]');
  var overlay = document.querySelector('[data-immersive]');
  if (!CFG || !root || !overlay) return;

  function qs(sel, el) {
    return (el || document).querySelector(sel);
  }
  function qsa(sel, el) {
    return Array.prototype.slice.call((el || document).querySelectorAll(sel));
  }
  var track = ES.track || function () {};
  var store = ES.store || { get: function () { return null; }, set: function () {} };
  var fill = function (tpl, map) {
    return String(tpl).replace(/\{(\w)\}/g, function (_, k) {
      return map[k] != null ? map[k] : '';
    });
  };
  var pad = function (n) {
    return String(n).padStart(2, '0');
  };
  var fmt = function (ms) {
    var s = Math.max(0, Math.ceil(ms / 1000));
    return pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  };
  var clock = function (d) {
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  };
  var still = function () {
    return !!(ES.reducedMotion && ES.reducedMotion());
  };
  var ease = function (x) {
    return 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, x)));
  };

  document.body.appendChild(overlay); // outside <main>, so the rest of the page can be made inert

  // Your own music: a docked player that lives outside <main> too, so it keeps playing
  // (and stays reachable) while the ritual runs full screen.
  var MUS = CFG.music || {};
  var dockEl = qs('[data-music-dock]');
  var music = null;
  if (dockEl && ES.RitualMusic) {
    document.body.appendChild(dockEl);
    music = new ES.RitualMusic(dockEl, MUS.dock);
  }

  var STATS_KEY = 'es:ritual';
  var RUN_KEY = 'es:ritual-run';
  var stats = {};
  try {
    stats = JSON.parse(store.get(STATS_KEY) || '{}') || {};
  } catch (e) {
    stats = {};
  }
  stats.prefs = stats.prefs || {};
  stats.learn = stats.learn || {};
  stats.days = stats.days || [];

  var views = { setup: qs('[data-view="setup"]', root), done: qs('[data-view="done"]', root) };
  var form = qs('[data-setup]', root);
  var B = CFG.breath;
  var RUN = CFG.run || {};
  var ER = ES.EveningRoom || null;
  var el = {
    room: qs('[data-room]', overlay),
    dream: qs('[data-dream]', overlay),
    canvas: qs('[data-canvas]', overlay),
    lids: qs('[data-lids]', overlay),
    pips: qsa('[data-pips] li', overlay),
    bright: qs('[data-bright]', overlay),
    count: qs('[data-im-count]', overlay),
    countV: qs('[data-im-count-v]', overlay),
    clock: qs('[data-im-clock]', overlay),
    title: qs('[data-im-title]', overlay),
    body: qs('[data-im-body]', overlay),
    why: qs('[data-im-why]', overlay),
    whyBox: qs('[data-why]', overlay),
    tip: qs('[data-im-tip]', overlay),
    note: qs('[data-im-note]', overlay),
    choices: qs('[data-choices]', overlay),
    park: qs('[data-park]', overlay),
    parkText: qs('[data-park-text]', overlay),
    icon: qs('[data-im-icon]', overlay),
    live: qs('[data-live]', overlay),
    phase: qs('[data-phase]', overlay),
    cue: qs('[data-cue]', overlay),
    cueSub: qs('[data-cue-sub]', overlay),
    introTime: qs('[data-intro-time]', overlay),
    introNote: qs('[data-intro-note]', overlay),
    toggle: qs('[data-act="toggle"]', overlay),
    toggleLabel: qs('[data-toggle-label]', overlay),
    sound: qs('[data-act="sound"]', overlay),
    menu: qs('[data-menu]', overlay),
    menuBtn: qs('[data-act="menu"]', overlay),
    guide: qs('[data-guide]', overlay),
    done: qs('[data-act="done"]', overlay),
    doneLabel: qs('[data-done-label]', overlay),
    doneSub: qs('[data-done-sub]', overlay),
    ring: qs('[data-ring]', overlay),
    resume: qs('[data-resume]', root),
    resumeText: qs('[data-resume-text]', root),
  };

  /* ----------------------------------------------------------------- state
     The steps you do yourself (1–5) wait for you: tap Done when you've done it, there's no timer
     to beat (the ring only shows about how long it usually takes). Once the phone is down, the
     rest plays by itself, guided by sound: the breathing, sitting on the edge of the bed with a
     warm place behind your closed eyes, then lying down, then lights out. "Guide me" makes every
     step move on by itself. */
  var S = { steps: [], i: 0, elapsed: 0, running: false, last: 0, startedAt: null, opts: {}, length: 'full', context: '', pace: 'steady', open: false, done: {}, auto: false, choice: {} };
  var audio = null;
  var scenes = null; // the 2D scenes: without WebGL, with reduced motion, in low-stim, on the way home
  var room = null, dream = null, roomFailed = false;
  var fade = null;
  var clockT = 0;
  var lastDim = 0;

  function paceOf(id) {
    return B.paces.filter(function (p) { return p.id === id; })[0] || B.paces.filter(function (p) { return p.default; })[0] || B.paces[0];
  }

  function breathPlan(length, paceId) {
    var plan = B.plan[length] || B.plan.full;
    var pace = paceOf(paceId);
    var sc = B.sigh.inhale + B.sigh.top + B.sigh.exhale + B.sigh.rest;
    var rc = pace.inhale + pace.exhale;
    var n = Math.max(3, Math.round(plan.rhythm / rc));
    return { arrive: plan.arrive, sighs: plan.sighs, sc: sc, pace: pace, rc: rc, n: n, settle: plan.settle, total: plan.arrive + plan.sighs * sc + n * rc + plan.settle };
  }

  // how long a step usually takes you: the middle of your last five, within reason
  function learned(id, def) {
    var a = (stats.learn[id] || []).slice().sort(function (x, y) { return x - y; });
    if (a.length < 2) return def;
    var med = a[Math.floor(a.length / 2)] * 1000;
    return Math.max(20000, Math.min(def * 1.6, Math.max(def * 0.45, med)));
  }

  function buildSteps(length, context, paceId, version) {
    return CFG.steps.filter(function (s) {
      return s.seconds[length] !== 0;
    }).map(function (s) {
      var v = (version && s.versions && s.versions[version]) || {};
      var def = (s.seconds[length] || s.seconds.full) * 1000;
      var step = {
        id: s.id,
        title: v.title || s.title,
        body: v.body || (context && s.variants && s.variants[context]) || s.body,
        act: v.body || s.do || s.body,
        why: s.why || '',
        tip: v.tip != null ? v.tip : s.tip || '',
        icon: s.icon,
        kind: s.kind || '',
        scene: s.scene,
        choices: version === 'commute' ? null : s.choices || null,
        dur: def,
        sug: learned(s.id, def),
      };
      if (step.kind === 'breath') {
        step.plan = breathPlan(length, paceId);
        step.dur = step.sug = Math.round(step.plan.total * 1000);
      }
      return step;
    });
  }

  // Where in the breath are we, t seconds into the breathing step?
  function breathAt(t, P) {
    var free = function (tt, period, amp) {
      return { level: 0.3 + amp * Math.sin((2 * Math.PI * tt) / period - Math.PI / 2), part: 'free' };
    };
    if (t < P.arrive) {
      var a = free(t, 5.5, 0.12);
      a.phase = 'arrive';
      a.k = 0;
      return a;
    }
    t -= P.arrive;
    var sg = B.sigh;
    if (t < P.sighs * P.sc) {
      var k = Math.floor(t / P.sc);
      var u = t - k * P.sc;
      var r = { phase: 'sigh', left: P.sighs - k, k: k };
      if (u < sg.inhale) { r.part = 'in'; r.level = 0.8 * ease(u / sg.inhale); }
      else if (u < sg.inhale + sg.top) { r.part = 'top'; r.level = 0.8 + 0.2 * ease((u - sg.inhale) / sg.top); }
      else if (u < sg.inhale + sg.top + sg.exhale) { r.part = 'out'; r.level = 1 - ease((u - sg.inhale - sg.top) / sg.exhale); }
      else { r.part = 'rest'; r.level = 0; }
      return r;
    }
    t -= P.sighs * P.sc;
    if (t < P.n * P.rc) {
      var j = Math.floor(t / P.rc);
      var v = t - j * P.rc;
      var q = { phase: 'rhythm', left: P.n - j, j: j };
      if (v < P.pace.inhale) { q.part = 'in'; q.level = ease(v / P.pace.inhale); }
      else { q.part = 'out'; q.level = 1 - ease((v - P.pace.inhale) / P.pace.exhale); }
      return q;
    }
    t -= P.n * P.rc;
    var z = free(t, 6.5, 0.1 * (1 - Math.min(1, t / P.settle)));
    z.phase = 'settle';
    z.s = Math.min(1, t / Math.max(1, P.settle));
    return z;
  }

  // How far the sun has gone down, given where in the breath we are. It only moves while you
  // breathe out (a long sigh takes it further than a slow breath) and rests while you breathe in:
  // it touches the sea about a third of the way into the slow breaths, is half under (the ENDSHIFT
  // mark) about two thirds in, and slips under with the last one. Then, while you let go, the sky
  // goes dark (dusk 0 → 1) and the stars come out (the first ones with the breaths after the half).
  // The light only ever goes down. (The heights are in the sun's radii: see the shader.)
  var SUN = { sigh: 2, rhythm: 1, H0: 4.2, H1: -1.15 };
  function sunsetAt(b, P) {
    var W = P.sighs * SUN.sigh + P.n * SUN.rhythm;
    var outF = b.part === 'out' ? 1 - b.level : b.part === 'rest' ? 1 : 0;
    var w = b.phase === 'sigh' ? (b.k + outF) * SUN.sigh : b.phase === 'rhythm' ? P.sighs * SUN.sigh + (b.j + outF) * SUN.rhythm : b.phase === 'settle' ? W : 0;
    var set = Math.min(1, w / Math.max(1, W));
    var dusk = b.phase === 'settle' ? 1 - Math.pow(1 - b.s, 1.6) : 0;
    var half = SUN.H0 / (SUN.H0 - SUN.H1);
    return { set: set, dusk: dusk, stars: 0.35 * Math.max(0, (set - half) / (1 - half)) + 0.65 * dusk };
  }

  /* ------------------------------------------------------------------- UI */

  function setText(node, text) {
    if (node && node.textContent !== text) node.textContent = text;
  }
  var lastCue = '';
  function setCue(text, sub) {
    if (text !== lastCue) {
      lastCue = text;
      el.cue.classList.remove('is-in');
      void el.cue.offsetWidth;
      el.cue.textContent = text;
      el.cue.classList.add('is-in');
    }
    setText(el.cueSub, sub || '');
  }
  var aboutText = function (ms) {
    var s = Math.round(ms / 1000);
    return s < 90 ? fill(CFG.tpl.aboutSec, { s: Math.max(10, Math.round(s / 10) * 10) }) : fill(CFG.tpl.aboutMin, { m: Math.round(s / 60) });
  };

  // what to do: the step's own line, or the one for what you picked
  function actOf(st) {
    var c = S.choice[st.id];
    var cd = RUN.choiceDo || {};
    if (c && cd[c]) return cd[c];
    return st.act;
  }

  function renderChoices(st) {
    var box = el.choices;
    box.innerHTML = '';
    box.hidden = !st.choices;
    if (!st.choices) return;
    var cur = S.choice[st.id] || st.choices[0];
    S.choice[st.id] = cur;
    st.choices.forEach(function (id) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'im-chip';
      b.setAttribute('data-choice', id);
      b.setAttribute('aria-pressed', id === cur ? 'true' : 'false');
      b.textContent = (RUN.choices && RUN.choices[id]) || id;
      box.appendChild(b);
    });
  }

  function renderStep(announce) {
    var st = S.steps[S.i];
    if (!st) return;
    var n = S.steps.length;
    setText(el.count, fill(CFG.tpl.stepOf, { i: S.i + 1, n: n }));
    setText(el.countV, (S.i + 1) + ' / ' + n);
    setText(el.title, st.title);
    renderChoices(st);
    setText(el.why, st.why || st.body);
    if (el.whyBox) el.whyBox.open = false;
    el.tip.hidden = !st.tip;
    setText(el.tip, st.tip);
    renderAct(st);
    el.icon.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-' + st.icon + '"></use></svg>';
    overlay.setAttribute('data-kind', st.kind || 'step');
    overlay.setAttribute('data-step', st.id);
    el.pips.forEach(function (p, j) { p.className = j < S.i ? 'is-done' : j === S.i ? 'is-now' : ''; p.hidden = j >= n; });
    lastCue = '';
    lastPart = '';
    S.asked = false;
    syncDone();
    if (announce) {
      setText(el.live, fill(CFG.tpl.announce, { i: S.i + 1, n: n, t: st.title }));
      sayStep(st, 'now');
    }
  }

  function tonightItems() {
    try {
      var t = JSON.parse(store.get('es:tonight') || 'null');
      var d = new Date(), key = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      return t && t.d === key && t.items ? t.items.slice(0, 3) : [];
    } catch (e) { return []; }
  }
  // what to do now, and the little note under it (both follow what you picked)
  function renderAct(st) {
    setText(el.body, actOf(st));
    var note = '';
    if (st.id === 'water' && (S.choice.water || 'water') === 'water') note = RUN.resetNote || '';
    if (S.i === 0 && (stats.count || 0) < 2 && !isAuto()) note = RUN.firstHint || '';
    if (st.id === 'phone' && !S.opts.guide) note = RUN.autoNote || '';
    // what you ticked in a guide today, to take into tonight
    if (S.i === 0) {
      var tg = tonightItems();
      if (tg.length && RUN.fromGuide) note = RUN.fromGuide + ' ' + tg.join(' · ');
    }
    el.note.hidden = !note;
    setText(el.note, note);
    el.park.hidden = !(st.id === 'clock-out' && S.choice['clock-out'] === 'type');
  }

  // the big button: Done, or what happens next
  function isAuto() { return S.opts.guide || S.auto; }
  function syncDone() {
    var st = S.steps[S.i];
    if (!st) return;
    var label = RUN.done;
    if (st.kind === 'breath') label = RUN.breathEnd;
    else if (st.id === 'phone') label = RUN.phoneDone;
    else if (S.i === S.steps.length - 1 && S.auto) label = RUN.quietEnd;
    setText(el.doneLabel, S.asked && !isAuto() ? RUN.doneAsk : label);
    overlay.classList.toggle('is-asking', !!S.asked && !isAuto());
    overlay.classList.toggle('is-auto', isAuto());
  }

  /* Read aloud. Where the page has a recorded voice (CFG.voice: English, one clip per step and
     per breathing cue, recorded for the evening version) it plays those clips and the music dips
     under them. Anything without a clip (the night-shift and way-home versions, the herbal-tea
     line, other languages) uses the device's own voice, as before. */
  var VO = CFG.voice || null;
  var voice = { el: null, queue: [], cur: null, id: 0, blobs: {}, loading: false, phase: '', tip: -1, breaths: 0 };
  function canSpeak() { return !!VO || 'speechSynthesis' in window; }
  // only for the versions the clips were recorded for, so one evening doesn't switch voices
  function recorded() {
    return !!(VO && S.opts.speak && (VO.versions || ['evening']).indexOf(S.version || 'evening') >= 0);
  }
  function clip(key) { return (VO && VO.cues && VO.cues[key]) || null; }
  function stepClip(st) {
    if (!VO || !VO.steps || !st) return null;
    var c = S.choice[st.id];
    if (c && VO.skipChoices && VO.skipChoices.indexOf(c) >= 0) return null;
    return VO.steps[st.id] || null;
  }
  function voiceEl() {
    if (!voice.el) {
      voice.el = new Audio();
      voice.el.preload = 'auto';
      voice.el.volume = VO && VO.volume ? VO.volume : 1;
    }
    return voice.el;
  }
  // the clips are small: fetch them all once a run starts, so they're instant and keep working
  // if the connection drops halfway through the evening
  function voicePreload() {
    if (!VO || voice.loading || !window.fetch || !window.URL || !URL.createObjectURL) return;
    voice.loading = true;
    var urls = [];
    Object.keys(VO.steps || {}).forEach(function (k) { urls.push(VO.steps[k]); });
    Object.keys(VO.cues || {}).forEach(function (k) { urls = urls.concat(VO.cues[k]); });
    urls.forEach(function (u) {
      if (!u || voice.blobs[u]) return;
      fetch(u).then(function (r) { return r.ok ? r.blob() : null; }).then(function (b) {
        if (b) voice.blobs[u] = URL.createObjectURL(b);
      }).catch(function () {});
    });
  }
  function duck(on) {
    if (audio && audio.duck) audio.duck(on);
  }
  // a phone only lets a page play sound it started from a tap: play the quiet track, muted, once
  function unlockVoice() {
    if (voice.unlocked) return;
    voice.unlocked = true;
    var a = voiceEl();
    var q = CFG.media && CFG.media.quiet;
    if (!q || voice.cur) return;
    var done = function () {
      if (!voice.cur) { try { a.pause(); } catch (e) {} }
      a.muted = false;
    };
    try {
      a.muted = true;
      a.src = q;
      var p = a.play();
      if (p && p.then) p.then(done, done);
      else done();
    } catch (e) { done(); }
  }
  function deviceSpeaking() {
    try { return 'speechSynthesis' in window && window.speechSynthesis.speaking; } catch (e) { return false; }
  }
  function voiceNext() {
    var item = voice.queue.shift();
    // a phase's words that come too late (the phase is already over) are skipped
    while (item && item.phase && item.phase !== voice.phase) item = voice.queue.shift();
    var id = ++voice.id;
    voice.cur = item || null;
    if (!item) { duck(false); return; }
    var url = item.url;
    duck(true);
    voice.unlocked = true;
    var a = voiceEl();
    a.muted = false;
    a.onended = a.onerror = function () { if (id === voice.id) voiceNext(); };
    a.src = voice.blobs[url] || url;
    var p;
    try { p = a.play(); } catch (e) { p = null; if (id === voice.id) voiceNext(); return; }
    if (p && p.catch) p.catch(function () { if (id === voice.id) voiceNext(); });
  }
  // 'now' stops whatever is playing; 'queue' plays after it; 'cue' (a breathing cue) waits only
  // for another short cue to finish, and is skipped if longer words are playing: a cue that comes
  // seconds late is worse than none. `phase`: only play it while the breathing is in that phase.
  function play(url, mode, phase) {
    if (!url || !S.opts.speak) return;
    var cue = mode === 'cue';
    if (cue && (deviceSpeaking() || voice.queue.length || (voice.cur && !voice.cur.cue))) return;
    if (mode === 'now') stopVoice();
    voice.queue.push({ url: url, cue: cue, phase: phase || '' });
    if (!voice.cur) voiceNext();
  }
  function stopVoice() {
    voice.queue = [];
    voice.id++;
    voice.cur = null;
    if (voice.el) { try { voice.el.pause(); } catch (e) {} }
    duck(false);
  }
  // the device's own voice, in the page's language
  function say(text, short) {
    if (!S.opts.speak || !('speechSynthesis' in window) || !text) return;
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.lang = document.documentElement.lang || 'en';
      u.rate = short ? 0.9 : 0.95;
      u.pitch = 0.95;
      u.volume = 0.9;
      if (!short) window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  // a step's words: the recorded clip, or the device reading the same text
  function sayStep(st, mode) {
    if (!st || !S.opts.speak) return;
    voice.phase = '';
    voice.tip = -1;
    voice.breaths = 0;
    var url = recorded() ? stepClip(st) : null;
    if (url) {
      try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) {}
      play(url, mode);
      // "From here it plays by itself" is on the card unless Guide me is on
      if (st.id === 'phone' && !S.opts.guide) play(clip('autoNote'), 'queue');
    } else {
      stopVoice();
      say(st.title + '. ' + actOf(st));
    }
  }
  // breathing: how each phase works as it starts, then In / Out on the breaths (the slow
  // rhythm's first few only: after that the sound leads), and the arrive tips as they change
  function breathVoice(b, ph) {
    if (!S.opts.speak) return;
    if (!recorded()) {
      if (b.part !== lastPart && (b.phase === 'sigh' || b.phase === 'rhythm') && (b.part === 'in' || b.part === 'out')) say(b.part === 'in' ? ph.in : ph.out, true);
      return;
    }
    if (b.phase !== voice.phase) {
      voice.phase = b.phase;
      voice.breaths = 0;
      var intro = { arrive: 'arrive', sigh: 'sighHow', rhythm: 'rhythmHow', settle: 'settle' }[b.phase];
      if (intro) play(clip(intro), 'queue', b.phase);
    }
    if (b.phase === 'arrive') {
      var tips = (VO.cues && VO.cues.tips) || [];
      var ti = tips.length ? Math.floor((S.elapsed / 1000) / 8) % tips.length : -1;
      if (ti !== voice.tip) {
        if (voice.tip !== -1 || ti > 0) play(tips[ti], 'cue', 'arrive');
        voice.tip = ti;
      }
      return;
    }
    if (b.part === lastPart) return;
    var cueKey = null;
    if (b.phase === 'sigh') {
      cueKey = { in: 'sighIn', top: 'top', out: 'sighOut' }[b.part] || null;
    } else if (b.phase === 'rhythm') {
      if (b.part === 'in') voice.breaths++;
      if (voice.breaths <= (VO.rhythmCues == null ? 6 : VO.rhythmCues)) cueKey = { in: 'rhythmIn', out: 'rhythmOut' }[b.part] || null;
    }
    if (cueKey) play(clip(cueKey), 'cue', b.phase);
  }
  function hush() {
    stopVoice();
    try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) {}
  }

  var lastPart = '';
  var lastPhase = '';
  function updateBreathUI(b) {
    var ph = B.phases[b.phase];
    if (b.phase !== lastPhase) {
      lastPhase = b.phase;
      setText(el.phase, ph.title);
      overlay.setAttribute('data-phase', b.phase);
      if (b.phase === 'sigh') setText(el.live, ph.title + '. ' + B.sighHow);
      else if (b.phase === 'rhythm') setText(el.live, ph.title + '. ' + B.rhythmHow);
      else setText(el.live, ph.title + '. ' + (ph.cue || ''));
    }
    var cue, sub = '';
    if (b.phase === 'arrive') {
      cue = ph.cue;
      var tips = B.arriveTips || [];
      sub = tips.length ? tips[Math.floor((S.elapsed / 1000) / 8) % tips.length] : '';
    } else if (b.phase === 'settle') {
      cue = ph.cue;
    } else {
      cue = b.part === 'in' ? ph.in : b.part === 'top' ? ph.top : ph.out;
      var key = b.phase === 'sigh' ? 'sigh' : 'rhythm';
      sub = b.left === 1 ? B.left[key + '1'] : fill(B.left[key], { n: b.left });
    }
    setCue(cue, sub);
    breathVoice(b, ph);
    if (b.part !== lastPart) {
      if (lastPart && S.opts.haptics && navigator.vibrate && document.visibilityState === 'visible' && (b.part === 'in' || b.part === 'top' || b.part === 'out')) {
        try { navigator.vibrate(b.part === 'in' ? 40 : b.part === 'top' ? 15 : [12, 70, 12]); } catch (e) {}
      }
      lastPart = b.part;
    }
  }

  /* ------------------------------------------------------------- the room
     What the room looks like follows what you've done: each step's thing happens when you tap
     Done (the lid closes and the list writes itself, the curtains fold shut, the glass comes up,
     the desk lamp goes off, the phone goes into the drawer), and the light only ever goes down. */
  var RM = {
    cam: null, camFrom: null, camKey: '', camT0: 0,
    anim: null, // { id, t0, dur }
    L: { big: 1, bigDisc: 1, lamp: 0, desk: 0.8, fill: 0.5, warmth: 0.55, fairy: 0, laptop: 1, street: 1, phone: 1, night: 0, moon: 0, fin: 0, dim: 0 },
    pose: { lid: 0, write: 0, curtains: 0, pour: 0, sip: 0, drawer: { flip: 0, open: 0, into: 0, shut: 0 }, orbs: { come: 0, out: 0, dream: 0, wide: 1 }, book: { open: 0, pages: 0 }, spin: 0, face: 214, float: 0 },
    D: { layers: [0, 0, 0, 0], fx: 0, set: 0, dusk: 0, stars: 0, breath: 0, lens: [0, 0], seaT: 0, in: 0 },
    lid: 0, lidT: [], ending: 0, lastDraw: 0,
  };
  var ANIM = { 'clock-out': 2600, change: 2300, water: 2200, lights: 15000, phone: 3000 };
  // "lower the lights" is a short film of its own: you see the big light go off (LIGHTS_OFF), a
  // beat of dark, the camera goes down and in to the bedside lamp as it clicks on (LIGHTS_ON), and
  // its light comes out as warm motes that the camera follows out until the room is full of them
  // (the DONE stamp plays first, so the light goes off once it's out of the way)
  var LIGHTS_OFF = 0.17, LIGHTS_ON = 0.255;
  var LIGHTS_CAM = [
    { k: 0, at: [140, 128, -150], to: [-40, 172, 60], hf: 82 },
    { k: 0.17, at: [135, 128, -145], to: [-40, 175, 60], hf: 80 },
    { k: 0.245, at: [112, 122, -110], to: [-112, 106, 150], hf: 70 },
    { k: 0.34, at: [-60, 108, 112], to: [-136, 88, 174], hf: 56 },
    { k: 0.46, at: [-58, 112, 106], to: [-120, 96, 168], hf: 60 },
    { k: 0.6, at: [-52, 116, 100], to: [-100, 108, 160], hf: 62 },
    { k: 0.73, at: [-30, 124, 86], to: [-80, 124, 156], hf: 68 },
    { k: 0.86, at: [14, 136, 46], to: [-56, 118, 160], hf: 74 },
    { k: 1, at: [56, 146, -46], to: [-24, 112, 160], hf: 82 },
  ];
  // one smooth path through the keys (no stop at each one): a Hermite spline on where the camera
  // stands and what it looks at, with the slopes taken from the keys on either side
  function hermite(keys, f, k) {
    var n = keys.length;
    if (k <= keys[0].k) return f(keys[0]);
    if (k >= keys[n - 1].k) return f(keys[n - 1]);
    var i = 0;
    while (i < n - 2 && k > keys[i + 1].k) i++;
    var a = keys[i], b = keys[i + 1], h = b.k - a.k, t = (k - a.k) / h;
    var slope = function (j) {
      if (j <= 0 || j >= n - 1) return null;
      var p = f(keys[j - 1]), q = f(keys[j + 1]), d = keys[j + 1].k - keys[j - 1].k;
      return p.map(function (v, c) { return (q[c] - v) / d; });
    };
    var pa = f(a), pb = f(b), ma = slope(i), mb = slope(i + 1);
    var t2 = t * t, t3 = t2 * t;
    var h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
    return pa.map(function (v, c) { return h00 * v + h10 * h * (ma ? ma[c] : 0) + h01 * pb[c] + h11 * h * (mb ? mb[c] : 0); });
  }
  function lightsCam(c0, k) {
    var a = RM.aspect || 1;
    var at = hermite(LIGHTS_CAM, function (q) { return q.at; }, k);
    var to = hermite(LIGHTS_CAM, function (q) { return q.to; }, k);
    var hf = hermite(LIGHTS_CAM, function (q) { return [q.hf]; }, k)[0];
    var c = ER.camAt({ at: at, to: to, hf: hf }, a);
    // from wherever the camera was when you tapped Done
    return k < 0.08 ? ER.blendCam(c0, c, ER.ease.inOut(k / 0.08)) : c;
  }
  // a bedside lamp clicking on: up, a little stutter, then full
  function lampClick(k) {
    if (k <= 0) return 0;
    if (k < 0.2) return (k / 0.2) * 0.8;
    if (k < 0.32) return 0.8 - 0.45 * ((k - 0.2) / 0.12);
    if (k < 0.5) return 0.35 + 0.6 * ((k - 0.32) / 0.18);
    return Math.min(1, 0.95 + 0.05 * ((k - 0.5) / 0.5));
  }
  // the room, unless motion is reduced, the page is in low-stim mode, or you're on the way home
  var root2 = document.documentElement;
  function wantRoom() {
    return !!ER && !still() && root2.getAttribute('data-calm') !== 'on' && S.version !== 'commute';
  }
  function useRoom() {
    return !!(room && room.ok) && wantRoom();
  }
  function camKeyOf(st) {
    if (!st) return 'home';
    if (S.ending && st.kind !== 'breath') return 'pillow';
    switch (st.id) {
      case 'clock-out': return 'desk';
      case 'change': return 'window';
      case 'water': return 'tray';
      case 'lights': return 'lights';
      case 'phone': return 'drawer';
      case 'breathe': return 'sitbed';
      case 'quiet': return S.choice.quiet === 'music' ? 'liemusic' : S.choice.quiet === 'sit' ? 'lieup' : 'lieread';
    }
    return 'home';
  }
  function makeRoom() {
    if (room || roomFailed || !ER) return;
    try {
      room = new ER.Room(el.room, { props: CFG.props || {}, strings: (ES.config && ES.config.strings) || {}, night: ER.tonight() });
      if (!room.ok) { room = null; roomFailed = true; return; }
      dream = new ER.Dream(el.dream);
      if (!dream.ok) dream = null;
    } catch (e) {
      room = null;
      roomFailed = true;
    }
    sizeRoom();
    if (room) room.setNotes(S.notes || null);
  }
  function sizeRoom() {
    if (!room) return;
    var W = overlay.clientWidth || window.innerWidth, H = overlay.clientHeight || window.innerHeight;
    var dpr = (ES.dprCap ? ES.dprCap(W * H > 1100000 ? 1.25 : 1.6) : Math.min(window.devicePixelRatio || 1, W * H > 1100000 ? 1.25 : 1.6));
    room.resize(W, H, dpr);
    if (dream) dream.resize(W, H);
    RM.aspect = W / H;
    RM.W = W;
    RM.H = H;
    if (RM.camKey) RM.cam = ER.camOf(RM.camKey, RM.aspect);
  }
  function aim(key, instant) {
    if (key === RM.camKey && !instant) return;
    var to = ER.camOf(key, RM.aspect || 1);
    RM.camFrom = instant || !RM.cam ? to : RM.cam;
    RM.camKey = key;
    RM.camTo = to;
    RM.camT0 = performance.now();
    if (instant) RM.cam = to;
  }
  function animK(id, now) {
    var a = RM.anim;
    if (S.done[id]) return 1;
    if (!a || a.id !== id) return 0;
    return Math.min(1, (now - a.t0) / a.dur);
  }
  var approach = function (cur, to, dt, tau) { return cur + (to - cur) * (1 - Math.exp(-dt / tau)); };

  function drawRoom(now, dt) {
    var st = S.steps[S.i];
    if (!st || !room) return;
    var P = RM.pose, L = RM.L, part = ER.part, E = ER.ease;
    var tS = S.elapsed / 1000;
    // the camera: glide to the step's place, then breathe a little
    var key = camKeyOf(st);
    aim(key);
    var c;
    var cine = RM.anim && RM.anim.id === 'lights';
    if (cine) {
      if (!RM.anim.cam0) RM.anim.cam0 = RM.cam || ER.camOf('bed', RM.aspect || 1);
      c = lightsCam(RM.anim.cam0, Math.min(1, (now - RM.anim.t0) / RM.anim.dur));
    } else {
      // lying down is its own move: slower, and it sinks rather than arcs
      var lying = /^lie|^pillow/.test(RM.camKey);
      var k = Math.min(1, (now - RM.camT0) / (still() ? 1 : lying ? 3800 : 2600));
      c = ER.blendCam(RM.camFrom, RM.camTo, lying ? E.sine(k) : E.inOut(k));
      // a long glide arcs up a little, so it never skims through the bed or the book
      var far = Math.hypot(RM.camTo.pos[0] - RM.camFrom.pos[0], RM.camTo.pos[1] - RM.camFrom.pos[1], RM.camTo.pos[2] - RM.camFrom.pos[2]);
      if (!lying) c.pos[1] += Math.sin(Math.PI * k) * Math.min(22, far * 0.18);
    }
    var dr = clockT;
    c.pos = [c.pos[0] + Math.sin(dr * 0.21) * 0.8, c.pos[1] + Math.sin(dr * 0.17) * 0.6, c.pos[2] + Math.cos(dr * 0.19) * 0.8];
    c.yaw += Math.sin(dr * 0.13) * 0.35;
    c.pitch += Math.sin(dr * 0.11) * 0.25;
    RM.cam = c;

    // what's been done, and what's happening now
    var kc = animK('clock-out', now), kh = animK('change', now), kw = animK('water', now), kl = animK('lights', now), kp = animK('phone', now);
    P.lid = part(kc, 0, 0.45);
    P.write = part(kc, 0.3, 1, E.lin);
    P.curtains = part(kh, 0, 1);
    var atWater = st.id === 'water';
    var pourT = atWater ? part(tS, 1.4, 4.6, E.lin) : S.idx.water != null && S.i > S.idx.water ? 1 : 0;
    P.pour = Math.max(pourT, kw > 0 ? 1 : 0);
    P.sip = kw;
    P.drink = S.choice.water || 'water';
    P.drawer = { flip: part(kp, 0, 0.32), open: part(kp, 0.28, 0.48), into: part(kp, 0.42, 0.75), shut: part(kp, 0.74, 1) };
    // (the short version has no "lower the lights": the lights go down with the phone instead)
    var lightsAt = S.idx.lights != null ? S.idx.lights : S.idx.phone != null ? S.idx.phone : 99;
    // at "lower the lights", Done is the moment: the big light goes off, and the lamp's light
    // comes out of its shade as slow warm motes that drift out and fill the whole room
    var pastLights = S.i > lightsAt;
    var shortV = S.idx.lights == null; // the short version: it all happens with the phone
    var kL = shortV ? (S.idx.phone != null ? kp : 0) : kl;
    var offAt = shortV ? 0.06 : LIGHTS_OFF, onAt = shortV ? 0.14 : LIGHTS_ON;
    var lightsGone = pastLights || kL >= 1;
    P.orbs.come = lightsGone ? 1 : part(kL, shortV ? 0.22 : 0.3, shortV ? 1 : 0.93, E.lin);
    var breathing = st.kind === 'breath';
    var bT = breathing ? tS : 0;
    // breathing: you sit on the edge of the bed with the lamp on, close your eyes, and a warm
    // place comes behind them; when it's over you open your eyes in the same warm room. Then
    // the last step: you lie down, and at the end the lamp goes off and you fall asleep.
    var endK = S.ending ? (now - S.ending) / 1000 : 0;
    P.orbs.dream = approach(P.orbs.dream, 0, dt, 1.4);
    P.orbs.out = approach(P.orbs.out, S.ending ? 1 : 0, dt, 0.7);
    P.quiet = S.choice.quiet || 'read';
    var quietNow = st.id === 'quiet' && !breathing;
    P.book.open = approach(P.book.open, quietNow && P.quiet === 'read' && !S.ending ? 1 : 0, dt, quietNow && !S.ending ? 0.6 : 0.4);
    P.book.pages = quietNow && P.quiet === 'read' ? Math.max(0, (tS - 4.5) / 26) : P.book.pages;
    P.spin = (P.spin + (quietNow && P.quiet === 'music' ? dt * 0.55 : 0)) % 1;
    // (the jar's front towards you at the tray; towards the pillow at the end)
    P.face = approach(P.face, S.ending ? 92 : 214, dt, 1.2);
    P.float = approach(P.float, 0, dt, 2);
    P.dreamOnly = false;

    // the light only goes down: the big light and the desk lamp until "lower the lights"; there
    // they go off, and after a beat of dark the bedside lamp clicks on
    var off = lightsGone || kL >= offAt, on = lightsGone || kL >= onAt;
    var T = {
      big: off ? 0 : 1,
      bigDisc: off ? 0 : 1,
      lamp: S.ending ? 0 : lightsGone ? 1 : on ? lampClick(part(kL, onAt, onAt + 0.06, E.lin)) : 0,
      desk: off ? 0 : 0.8,
      fill: !off ? 0.56 : !on ? 0.08 : 0.08 + 0.34 * (lightsGone ? 1 : part(kL, onAt, onAt + 0.12)),
      warmth: !off ? 0.55 : !on ? 0.55 : 0.55 + 0.45 * (lightsGone ? 1 : part(kL, onAt, onAt + 0.12)),
      dim: !off ? 0 : lightsGone ? 1 : 0.85 + 0.15 * part(kL, onAt, onAt + 0.12),
      laptop: 1 - P.lid,
      street: 1 - 0.86 * P.curtains,
      phone: 1 - part(kp, 0, 0.4),
      fairy: 0,
      night: S.ending ? 1 : breathing ? 0.12 : quietNow ? 0.18 : 0,
      moon: S.ending ? 1 : 0,
      fin: 0,
    };
    // a switch is quick (the big light's disc keeps a little glow for a moment); the rest eases
    var inFilm = kL > 0 && kL < 1;
    var tau = { big: 0.04, bigDisc: 0.22, lamp: inFilm ? 0.03 : 0.35, desk: inFilm ? 0.05 : 0.35, fill: inFilm ? 0.1 : 0.35, warmth: 0.5, dim: inFilm ? 0.12 : 0.35, night: 0.5, moon: 0.35, fin: 0.35 };
    ['big', 'bigDisc', 'lamp', 'desk', 'fill', 'warmth', 'dim', 'night', 'moon', 'fin'].forEach(function (k2) { L[k2] = approach(L[k2] == null ? T[k2] : L[k2], T[k2], dt, tau[k2]); });
    L.laptop = T.laptop;
    L.street = T.street;
    L.phone = T.phone;
    L.fairy = T.fairy;
    // the street goes to bed too, a few windows a step
    room.setCityLit(1 - Math.min(0.8, (S.i + (S.ending ? 1 : 0)) * 0.12));
    var d0 = new Date();
    room.setClock(pad(d0.getHours()) + ':' + pad(d0.getMinutes()));

    // the warm place: it comes out of the dark while you arrive, and from then on the light only
    // goes down, a little with every breath out (see sunsetAt)
    var D = RM.D;
    if (breathing) {
      var b = breathAt(bT, st.plan), pl = st.plan;
      var sun = sunsetAt(b, pl);
      // the sky first, then the sun and the sea, then the beach and the camera's light, all
      // there by the end of arriving
      var A = Math.max(9, pl.arrive * 0.8);
      var rv = function (a0, a1) { return part(bT, 3.4 + (A - 3.4) * a0, 3.4 + (A - 3.4) * a1); };
      var lt = [rv(0, 0.45), rv(0.2, 0.7), rv(0.3, 0.8), rv(0.5, 1)];
      D.layers = D.layers.map(function (v, i) { return approach(v, lt[i], dt, 0.8); });
      D.fx = approach(D.fx, rv(0.45, 1), dt, 1.2);
      // (while you can see it, the sun never comes back up; only starting the breathing again,
      // out of the dark, starts a fresh evening)
      var seen = D.in * Math.max(D.layers[0], D.layers[1]) > 0.02;
      D.set = seen ? Math.max(D.set, approach(D.set, sun.set, dt, 0.3)) : sun.set;
      D.dusk = seen ? Math.max(D.dusk, approach(D.dusk, sun.dusk, dt, 0.6)) : sun.dusk;
      D.stars = seen ? Math.max(D.stars, approach(D.stars, sun.stars, dt, 0.8)) : sun.stars;
      D.breath = b.level;
      // the camera in your hands: it drifts a little and rises a hair as you breathe in, so the
      // lens's ghosts glide
      D.lens = [0.004 * Math.sin(clockT * 0.07) + 0.006 * b.level, 0.003 * Math.sin(clockT * 0.05 + 1) + 0.009 * b.level];
      // the sea calms down as the evening goes on
      D.seaT += dt * (1 - 0.45 * Math.min(1, D.set * 0.8 + D.dusk * 0.4));
      // your eyes close and the place comes; at the end it goes before they open again
      D.in = approach(D.in, RM.leaving ? 0 : part(bT, 3.4, 7.5), dt, RM.leaving ? 0.25 : 0.6);
    } else {
      D.in = approach(D.in, 0, dt, 0.3);
      if (D.in < 0.003) {
        D.set = D.dusk = D.stars = D.fx = 0;
        D.layers = [0, 0, 0, 0];
      }
    }
    P.orbs.wide = 1;
    // (while the place fills the screen there's no need to draw the room behind it)
    if (!(breathing && D.in > 0.995 && !RM.leaving)) {
      room.pose(P, clockT, c, dt);
      room.render(c, L, clockT, false);
    }
    if (dream && D.in > 0.003) {
      dream.render({ time: clockT, in: D.in, layers: D.layers, fx: D.fx, breath: D.breath, set: D.set, dusk: D.dusk, stars: D.stars, lens: D.lens, seaT: D.seaT, bright: RM.bright });
    }
    showLayer('dream', !!dream && D.in > (RM.leaving || !breathing ? 0.02 : 0.003));
    // eyelids: a slow blink as you close your eyes (the place comes up behind them), and one as
    // you open them again in the room
    var lid = 0;
    if (breathing && !RM.leaving) lid = Math.max(0, part(bT, 2.4, 3.6) * (1 - part(bT, 4.6, 6.8)));
    if (RM.leaving) lid = part((now - RM.leaving) / 1000, 0, 0.6) * (1 - part((now - RM.leaving) / 1000, 1.0, 2.2));
    if (S.ending) lid = Math.max(lid, part(endK, 2.5, 5));
    if (Math.abs(lid - RM.lid) > 0.002) {
      RM.lid = lid;
      el.lids.style.setProperty('--lid', lid.toFixed(3));
      el.lids.style.visibility = lid > 0.002 ? 'visible' : 'hidden';
    }
  }
  var shownL = {};
  function showLayer(k, on) {
    if (shownL[k] === on) return;
    shownL[k] = on;
    var n = k === 'dream' ? el.dream : k === 'room' ? el.room : el.canvas;
    if (n) n.style.visibility = on ? 'visible' : 'hidden';
  }

  /* -------------------------------------------------------------- drawing */

  function frame(now, dt) {
    var st = S.steps[S.i];
    if (!st) return;
    var b = st.kind === 'breath' ? breathAt(S.elapsed / 1000, st.plan) : null;
    if (b && !RM.leaving && !S.ending) {
      updateBreathUI(b);
      if (audio) audio.breath(b.level);
    }
    // the ring round Done: about how long this usually takes
    var p = Math.min(1, S.elapsed / (isAuto() || st.kind === 'breath' ? st.sug || st.dur : st.sug));
    if (el.ring) {
      var v = (1 - p).toFixed(3);
      if (el.ring.__v !== v) { el.ring.__v = v; el.ring.style.strokeDashoffset = v; }
    }
    var subText = '';
    if (st.kind === 'breath' || isAuto()) subText = fill(CFG.tpl.nextIn, { t: fmt(Math.max(0, (st.kind === 'breath' ? st.dur : st.sug) - S.elapsed)) });
    else subText = aboutText(st.sug);
    setText(el.doneSub, subText);
    setText(el.clock, clock(new Date()));
    if (!S.asked && !isAuto() && st.kind !== 'breath' && S.elapsed >= st.sug) {
      S.asked = true;
      syncDone();
      if (audio) audio.chime(S.i);
    }
    if (!room && !roomFailed && wantRoom()) makeRoom(); // low-stim switched off mid-run
    var R = useRoom();
    showLayer('room', R);
    showLayer('flat', !R);
    if (R) {
      // a calm frame rate when nothing much moves; every frame when it does
      var busy = RM.anim || now - RM.camT0 < 2800 || st.kind === 'breath' || S.ending || RM.leaving || RM.pose.orbs.come > 0.01;
      // (the sunset alone moves slowly: about 30 frames a second is plenty, and saves the battery)
      var dreamOnly = st.kind === 'breath' && RM.D.in > 0.995 && !RM.leaving;
      if (now - RM.lastDraw >= (dreamOnly ? 28 : busy ? 0 : 45)) {
        drawRoom(now, Math.min(0.1, (now - (RM.lastDraw || now)) / 1000) || dt);
        RM.lastDraw = now;
      }
      return;
    }
    // the 2D scenes
    showLayer('dream', false);
    if (!scenes) scenes = new ES.RitualScenes(el.canvas);
    var overall = 0;
    for (var k = 0; k < S.i; k++) overall += S.steps[k].sug;
    overall = (overall + S.elapsed) / S.steps.reduce(function (a, s) { return a + s.sug; }, 0);
    var calm = root2.getAttribute('data-calm') === 'on';
    var f = { scene: st.scene, p: p, t: S.elapsed / 1000, T: clockT, breath: b, sun: b ? sunsetAt(b, st.plan) : null, dim: overall * 0.28 + (calm ? 0.2 : 0), still: still() };
    if (fade) {
      var m = Math.min(1, (now - fade.start) / (still() ? 600 : 3200));
      f.prev = fade.from;
      f.prevF = { scene: fade.from, p: fade.fromP, t: fade.fromT, T: clockT, breath: fade.fromB, sun: fade.fromS, dim: f.dim, still: f.still };
      f.mix = m;
      if (m >= 1) fade = null;
    }
    if (S.intro) f.dim = Math.max(f.dim, 1 - Math.min(1, (now - S.intro) / 2400));
    if (S.ending) f.dim = Math.max(f.dim, Math.min(0.97, (now - S.ending) / 4000));
    var ev = scenes.render(f);
    if (ev.length && audio && st.scene === 'water') audio.drop();
  }

  /* --------------------------------------------------------------- engine */

  var raf = 0;
  function loop() {
    cancelAnimationFrame(raf);
    if (!S.open) return;
    raf = requestAnimationFrame(function () {
      tick();
      loop();
    });
  }

  // frames: at most a quarter second a frame (so a laptop waking from sleep doesn't skip a step);
  // in the background (screen off, another app) the interval keeps real time, within reason
  function tick(maxDt) {
    var now = performance.now();
    var dt = Math.min(maxDt || 0.25, (now - S.last) / 1000);
    S.last = now;
    if (S.running && !S.finished) {
      S.elapsed += dt * 1000;
      clockT += dt;
      var st = S.steps[S.i];
      if (st && !RM.anim && !S.ending) {
        // breathing ends when it ends; the rest moves on by itself only in the guided part
        var limit = st.kind === 'breath' ? st.dur : isAuto() ? st.sug : Infinity;
        if (S.elapsed >= limit) complete(true);
      }
    } else clockT += S.ending ? dt : 0;
    // a step's thing finishes happening, then the next step
    if (RM.anim && now - RM.anim.t0 >= RM.anim.dur) {
      var a = RM.anim;
      RM.anim = null;
      S.done[a.id] = true;
      a.then();
    }
    if (RM.leaving && now - RM.leaving > 2300) {
      var then = RM.leavingThen;
      RM.leaving = 0;
      RM.leavingThen = null;
      if (then) then();
    }
    if (S.ending && !S.finished && now - S.ending > 5200) finish(true);
    frame(now, dt);
  }
  setInterval(function () {
    if (S.open && document.visibilityState !== 'visible') tick(2.5);
  }, 250);
  setInterval(save, 2000);

  // You did it (or, in the guided part, its time is up): the room shows it, then the next step
  function complete(auto) {
    var st = S.steps[S.i];
    if (!st || RM.anim || S.ending || RM.leaving) return;
    if (!auto && st.kind !== 'breath' && S.elapsed > 4000) {
      var arr = stats.learn[st.id] || [];
      arr.push(Math.round(S.elapsed / 1000));
      stats.learn[st.id] = arr.slice(-5);
      saveStats();
    }
    if (st.id === 'clock-out' && S.choice['clock-out'] === 'type' && room) {
      var lines = String(el.parkText.value || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean).slice(0, 4);
      if (lines.length) {
        S.notes = lines.map(function (l, i) { return (i + 1) + '. ' + l; });
        room.setNotes(S.notes);
      }
    }
    if (st.id === 'phone') S.auto = true; // from here it plays by itself
    track('ritual_done', { step: S.i + 1, id: st.id, auto: !!auto, seconds: Math.round(S.elapsed / 1000) });
    var next = function () {
      if (S.i + 1 >= S.steps.length) return lightsOut();
      changeStep(S.i + 1, true);
    };
    if (st.kind === 'breath') {
      if (auto) track('ritual_breath_complete', { pace: S.pace, length: S.length });
      if (S.i + 1 >= S.steps.length) return lightsOut(); // the last thing: straight to sleep
      if (useRoom()) {
        RM.leaving = performance.now();
        RM.leavingThen = next;
      } else next();
      return;
    }
    if (!auto) checked();
    if (useRoom() && ANIM[st.id]) {
      RM.anim = { id: st.id, t0: performance.now(), dur: ANIM[st.id], then: next };
      overlay.classList.add('is-acting');
      // the lamp's light filling the room is a moment of its own: everything else steps aside
      if (st.id === 'lights') overlay.classList.add('is-cinema');
      if (S.opts.haptics && navigator.vibrate) try { navigator.vibrate(18); } catch (e) {}
    } else {
      S.done[st.id] = true;
      next();
    }
  }

  function changeStep(i, auto) {
    var prev = S.steps[S.i];
    var prevB = prev && prev.kind === 'breath' ? breathAt(Math.min(S.elapsed, prev.dur) / 1000, prev.plan) : null;
    fade = prev ? { from: prev.scene, fromP: auto ? 1 : Math.min(1, S.elapsed / prev.dur), fromT: S.elapsed / 1000, fromB: prevB, fromS: prevB ? sunsetAt(prevB, prev.plan) : null, start: performance.now() } : null;
    // skipping forward does what the skipped steps would have done to the room
    for (var k = 0; k < i; k++) S.done[S.steps[k].id] = true;
    if (i <= S.i) for (var k2 = i; k2 < S.steps.length; k2++) S.done[S.steps[k2].id] = false;
    if (S.idx.phone != null) S.auto = i > S.idx.phone; // past the phone, it plays by itself
    S.i = i;
    S.elapsed = 0;
    overlay.classList.remove('is-acting', 'is-cinema');
    if (scenes) scenes.lastDrop = -1;
    lastPhase = '';
    renderStep(true);
    var st = S.steps[i];
    if (audio) audio.setStep(i, { breath: st.kind === 'breath' });
    if (S.opts.music === 'own' && S.opts.fadeMusic) music.setLevel(musicLevel(i));
    mediaUpdate();
    track('ritual_step', { step: i + 1, id: st.id, auto: !!auto });
  }

  // Done, where you pressed it: the button fills with warm light and draws a tick, for a moment,
  // while the room does what you did; then the dot for that step at the top fills in
  function checked() {
    overlay.classList.remove('is-checked');
    void overlay.offsetWidth;
    overlay.classList.add('is-checked');
    clearTimeout(checked.t);
    checked.t = setTimeout(function () { overlay.classList.remove('is-checked'); }, 1100);
  }

  // the end: lamp off, a last look from the pillow, eyes closed, OUT
  function lightsOut() {
    if (S.ending) return;
    S.ending = performance.now();
    overlay.classList.add('is-lightsout');
    // (if the breathing was the last thing, as on the way home, no words: it just fades)
    var fromBreath = S.steps[S.i] && S.steps[S.i].kind === 'breath';
    setCue(fromBreath ? '' : RUN.lightsOut || '', '');
    setText(el.live, RUN.lightsOut || '');
    if (!fromBreath && recorded()) play(clip('lightsOut'), 'queue');
    if (audio) audio.volume(0.6);
  }

  function setRunning(on) {
    S.running = on;
    S.last = performance.now();
    setText(el.toggleLabel, on ? CFG.run.pause : CFG.run.resume);
    var use = qs('use', el.toggle);
    if (use) use.setAttribute('href', on ? '#i-pause' : '#i-play');
    overlay.classList.toggle('is-paused', !on);
    if (quiet) mediaPlay(on);
    if (on) {
      requestWake();
      if (audio) audio.resume();
      if (S.opts.music === 'own' && !S.mutedAll) music.resume();
      idle();
    } else {
      releaseWake();
      hush();
      if (audio) audio.pause();
      if (S.opts.music === 'own') music.pause();
      overlay.classList.remove('is-idle');
      save();
    }
  }

  function setMenu(open) {
    el.menu.hidden = !open;
    el.menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    overlay.classList.toggle('is-menu', open);
    if (open) { var f = qs('input, button', el.menu); if (f) f.focus(); }
  }

  /* ----------------------------------------------------------- open/close */

  var inertEls = function () {
    return qsa('body > .skip-link, .site-header, .menu-panel, main, .site-footer, [data-sticky-cta], [data-consent]');
  };

  /* ------------------------------------------------ lock-screen controls
     From "Phone down" the ritual plays by sound. Where the browser supports it, the lock screen
     shows "Breathe · Step 6 of 7" with pause and next/previous step, so the phone can stay
     face down. Phones only show these for something playing, so a quiet track plays along
     (silent, looped). Not with your own music: its player has its own controls. */
  var MS = 'mediaSession' in navigator && window.MediaMetadata ? navigator.mediaSession : null;
  var MD = CFG.media || {};
  var quiet = null;
  function mediaOn() {
    return !!(MS && MD.quiet && S.opts && S.opts.music !== 'own');
  }
  function mediaUpdate() {
    if (!mediaOn() || !S.open) return;
    var st = S.steps[S.i];
    try {
      MS.metadata = new MediaMetadata({
        title: st ? st.title : MD.album || '',
        artist: 'ENDSHIFT · ' + fill(CFG.tpl.stepOf, { i: S.i + 1, n: S.steps.length }),
        album: MD.album || '',
        artwork: MD.art || [],
      });
      MS.playbackState = S.running ? 'playing' : 'paused';
    } catch (e) {}
  }
  function mediaPlay(on) {
    if (!mediaOn()) return;
    if (!quiet) {
      quiet = document.createElement('audio');
      quiet.src = MD.quiet;
      quiet.loop = true;
      quiet.preload = 'auto';
      quiet.setAttribute('playsinline', '');
    }
    if (on) {
      var p = quiet.play();
      if (p && p.catch) p.catch(function () {});
    } else quiet.pause();
    mediaUpdate();
  }
  function mediaStart() {
    if (!mediaOn()) return;
    var h = function (a, fn) { try { MS.setActionHandler(a, fn); } catch (e) {} };
    h('play', function () { if (!S.running) onAct('toggle'); });
    h('pause', function () { if (S.running) onAct('toggle'); });
    h('nexttrack', function () { onAct('next'); });
    h('previoustrack', function () { onAct('prev'); });
    h('stop', function () { if (S.open && !S.finished) onAct('end'); });
    mediaPlay(true);
    track('ritual_media', { on: 1 });
  }
  function mediaStop() {
    if (quiet) quiet.pause();
    if (!MS) return;
    ['play', 'pause', 'nexttrack', 'previoustrack', 'stop'].forEach(function (a) { try { MS.setActionHandler(a, null); } catch (e) {} });
    try {
      MS.metadata = null;
      MS.playbackState = 'none';
    } catch (e) {}
  }

  function openOverlay() {
    S.open = true;
    overlay.hidden = false;
    root2.classList.add('immersive-open');
    inertEls().forEach(function (n) { n.inert = true; });
    if (wantRoom()) makeRoom();
    if (!useRoom() && !scenes) scenes = new ES.RitualScenes(el.canvas);
    else if (scenes) scenes.resize();
    sizeRoom();
    requestAnimationFrame(function () {
      overlay.classList.add('is-open');
    });
  }

  function closeOverlay(after) {
    overlay.classList.remove('is-open', 'is-intro', 'is-idle', 'is-lightsout', 'is-acting', 'is-cinema', 'is-menu');
    overlay.classList.add('is-closing');
    var done = function () {
      S.open = false;
      cancelAnimationFrame(raf);
      overlay.hidden = true;
      overlay.classList.remove('is-closing');
      root2.classList.remove('immersive-open');
      inertEls().forEach(function (n) { n.inert = false; });
      if (after) after();
    };
    setTimeout(done, still() ? 50 : 1300);
  }

  function start(saved, overrides) {
    var fd = new FormData(form);
    overrides = overrides || {};
    S.context = saved ? saved.context : fd.get('context') || '';
    S.length = overrides.length || (saved ? saved.length : fd.get('length') || 'full');
    S.pace = saved ? saved.pace || 'steady' : fd.get('pace') || 'steady';
    S.version = saved ? saved.version || 'evening' : fd.get('version') || 'evening';
    var mp = musicPrefs();
    var own = mp.mode === 'own' && !!(music && music.loaded());
    S.opts = {
      music: own ? 'own' : mp.mode === 'own' ? 'endshift' : mp.mode,
      variant: mp.variant,
      bells: mp.bells,
      fadeMusic: mp.fade,
      binaural: qs('#set-binaural').checked,
      speak: !!(qs('#set-speak') && qs('#set-speak').checked),
      haptics: qs('#set-haptics').checked,
      wake: qs('#set-wake').checked,
      // on the way home it moves on by itself (you're walking); otherwise as you left it
      guide: S.version === 'commute' || !!stats.prefs.guide,
    };
    S.speakPref = S.opts.speak;
    if (S.opts.guide && canSpeak()) S.opts.speak = true;
    S.opts.layer = S.opts.music === 'endshift' ? S.opts.variant : S.opts.music === 'own' && S.opts.bells ? 'bells' : S.opts.binaural ? 'silent' : null;
    S.opts.sound = S.opts.music !== 'none';
    if (!overrides.length) stats.prefs = Object.assign(stats.prefs, { context: S.context, length: S.length, pace: S.pace, version: S.version, music: mp, binaural: S.opts.binaural, speak: S.opts.speak, haptics: S.opts.haptics, wake: S.opts.wake });
    saveStats();
    stopPreview();
    S.choice = Object.assign({ 'clock-out': 'paper', water: 'water', quiet: 'read' }, stats.prefs.choices || {}, (saved && saved.choice) || {});
    S.steps = buildSteps(S.length, S.context, S.pace, S.version);
    S.idx = {};
    S.steps.forEach(function (s, j) { S.idx[s.id] = j; });
    S.i = saved ? Math.min(saved.i, S.steps.length - 1) : 0;
    S.done = {};
    for (var k = 0; k < S.i; k++) S.done[S.steps[k].id] = true;
    S.auto = saved ? !!saved.auto : false;
    S.elapsed = saved ? Math.min(saved.elapsed, (S.steps[S.i].kind === 'breath' ? S.steps[S.i].dur : S.steps[S.i].sug) - 1000) : 0;
    S.startedAt = saved && saved.startedAt ? new Date(saved.startedAt) : new Date();
    fade = null;
    clockT = 0;
    S.finished = 0;
    S.ending = 0;
    S.musicStopped = false;
    S.mutedAll = false;
    lastDim = 0;
    RM.anim = null;
    RM.leaving = 0;
    RM.camKey = '';
    RM.cam = null;
    RM.D = { layers: [0, 0, 0, 0], fx: 0, set: 0, dusk: 0, stars: 0, breath: 0, lens: [0, 0], seaT: 0, in: 0 };
    RM.L = { big: 1, bigDisc: 1, lamp: 0, desk: 0.8, fill: 0.5, warmth: 0.55, fairy: 0, laptop: 1, street: 1, phone: 1, night: 0, moon: 0, fin: 0, dim: 0 };
    RM.pose.orbs = { come: 0, out: 0, dream: 0, wide: 1 };
    RM.pose.book = { open: 0, pages: 0 };
    RM.pose.face = 214;
    RM.pose.float = 0;
    if (el.parkText) el.parkText.value = '';
    if (el.guide) el.guide.checked = S.opts.guide;
    overlay.classList.remove('is-ending', 'is-finished', 'is-lightsout', 'is-acting', 'is-cinema', 'is-asking', 'is-checked');
    setMenu(false);

    audio = null;
    if (ES.RitualAudio && S.opts.layer) {
      audio = new ES.RitualAudio();
      if (!audio.init({ sound: true, binaural: S.opts.binaural, variant: S.opts.layer })) audio = null;
    }
    if (S.opts.music === 'own') {
      music.muted = false;
      music.level = 1;
      if (S.opts.fadeMusic) music.setLevel(musicLevel(S.i));
      music.play();
      if (music.provider() !== 'youtube' || window.innerWidth < 700) music.setCollapsed(true);
    }
    syncSoundBtn();

    var switchedAt = null;
    if (ES.shift) {
      if (!ES.shift.isOff()) ES.shift.set(true, { source: 'ritual', silent: true, quiet: true });
      switchedAt = ES.shift.offAt();
    }

    openOverlay();
    // still inside the tap that started it, so the quiet track is allowed to play
    mediaStart();
    S.notes = saved && saved.notes ? saved.notes : null;
    if (room) {
      room.setNotes(S.notes);
      aim(camKeyOf(S.steps[S.i]), true);
    }
    renderStep(false);
    setText(el.introTime, clock(!saved && switchedAt ? switchedAt : new Date()));
    var regular = (stats.count || 0) >= 2;
    if (el.introNote) el.introNote.hidden = regular;
    // the recorded voice: fetch the clips, and start it inside this tap so phones let it play
    // later on ("Headphones on" while that note is showing)
    if (recorded()) {
      voicePreload();
      if (!saved && !regular) play(clip('headphones'), 'now');
      else unlockVoice();
    }
    overlay.classList.add('is-intro');
    S.intro = performance.now();
    S.running = false;
    S.last = performance.now();
    loop();
    if (audio) {
      audio.setStep(S.i, { breath: S.steps[S.i].kind === 'breath', instant: true, silent: true });
      audio.start();
    }
    var introMs = still() ? 1200 : regular ? 1600 : 2600;
    setTimeout(function () {
      overlay.classList.remove('is-intro');
      S.intro = 0;
      setRunning(true);
      setText(el.live, fill(CFG.tpl.announce, { i: S.i + 1, n: S.steps.length, t: S.steps[S.i].title }));
      sayStep(S.steps[S.i], 'queue');
      el.title.focus({ preventScroll: true });
    }, introMs);
    track(saved ? 'ritual_resume' : 'ritual_start', {
      length: S.length,
      context: S.context || 'none',
      pace: S.pace,
      version: S.version,
      speak: S.opts.speak,
      music: S.opts.music,
      variant: S.opts.music === 'endshift' ? S.opts.variant : '',
      service: S.opts.music === 'own' ? music.provider() : '',
      pick: S.opts.music === 'own' ? (music.meta && music.meta.pick) || 'custom' : '',
      binaural: S.opts.binaural,
      guide: S.opts.guide,
      room: useRoom(),
    });
  }

  function go(delta) {
    if (!S.open || S.intro || S.finished || S.ending) return;
    RM.anim = null;
    RM.leaving = 0;
    var target = S.i + delta;
    if (delta < 0 && S.elapsed > 4000) target = S.i;
    if (target < 0) target = 0;
    if (target >= S.steps.length) return lightsOut();
    changeStep(target, false);
    S.last = performance.now();
    track(delta > 0 ? 'ritual_skip' : 'ritual_back', { step: S.i + 1 });
  }

  function logEvening(d) {
    var key = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    if (stats.days.indexOf(key) < 0) stats.days.push(key);
    stats.days = stats.days.slice(-400);
  }

  function finish(completed) {
    if (!S.open || S.finished) return;
    S.running = false;
    S.finished = performance.now();
    hush();
    if (completed && recorded()) play(clip('shiftOver'), 'now');
    releaseWake();
    clearRun();
    clearTimeout(idleT);
    if (audio) {
      audio.finish(completed ? 4 : 7);
      audio = null;
    }
    if (S.opts.music === 'own') music.end(completed ? 2500 : 4000);
    mediaStop();
    var end = new Date();
    stats.count = (stats.count || 0) + 1;
    stats.last = end.toISOString();
    if (completed || S.i >= 2) logEvening(end);
    stats.prefs.choices = S.choice;
    saveStats();
    var countText = stats.count === 1 ? CFG.tpl.count1 : fill(CFG.tpl.countN, { n: stats.count });
    S.card = { t: clock(end), m: Math.max(1, Math.round((end - S.startedAt) / 60000)), n: stats.count, date: end };
    resetCard();
    renderLog();
    setText(qs('[data-done-time]', root), clock(end));
    setText(qs('[data-done-clocked]', root), fill(CFG.tpl.clocked, { t: clock(end) }));
    setText(qs('[data-done-count]', root), countText);
    setText(qs('[data-end-time]', overlay), clock(end));
    setText(qs('[data-end-note]', overlay), fill(CFG.tpl.evening, { n: stats.days.length || stats.count }) + ' ·');
    var rt = qs('[data-reminder-time]', root);
    if (rt && ES.shift && ES.shift.hasOwnOut && ES.shift.hasOwnOut()) rt.value = ES.shift.out();
    else if (rt && S.startedAt) {
      var m = S.startedAt.getMinutes();
      rt.value = pad(S.startedAt.getHours()) + ':' + pad(m - (m % 5));
    }
    overlay.classList.remove('is-idle', 'is-paused', 'is-menu');
    overlay.classList.add('is-ending', 'is-finished');
    setText(el.live, CFG.run.finished);
    setTimeout(function () {
      var leave = qs('[data-act="leave"]', overlay);
      if (leave && S.open) leave.focus({ preventScroll: true });
    }, still() ? 100 : 2600);
    track(completed ? 'ritual_complete' : 'ritual_end_early', {
      length: S.length,
      context: S.context || 'none',
      pace: S.pace,
      minutes: Math.round((end - S.startedAt) / 60000),
      step: S.i + 1,
      evenings: stats.days.length,
    });
  }

  function leave() {
    if (!S.finished) return;
    views.setup.hidden = true;
    views.done.hidden = false;
    root.setAttribute('data-state', 'done');
    window.scrollTo({ top: 0, behavior: 'auto' });
    showInstall();
    makeCard();
    closeOverlay(function () {
      S.finished = 0;
      overlay.classList.remove('is-ending', 'is-finished', 'is-lightsout');
      qs('[data-done-title]', root).focus({ preventScroll: true });
    });
  }

  /* ---------------------------------------------- the evenings you ended
     A month of little squares, a ring round every evening you ended here (the home page's
     calendar crossed evenings off; this one keeps the good ones). No streaks. */
  function renderLog() {
    var grid = qs('[data-evlog-grid]', root);
    if (!grid) return;
    var now = new Date(), y = now.getFullYear(), mo = now.getMonth();
    var first = new Date(y, mo, 1), days = new Date(y, mo + 1, 0).getDate();
    var lead = (first.getDay() + 6) % 7;
    var out = [], n = 0;
    for (var d = 1; d <= days; d++) {
      var key = y + '-' + pad(mo + 1) + '-' + pad(d);
      var on = stats.days.indexOf(key) >= 0;
      if (on) n++;
      var weekend = (lead + d - 1) % 7 >= 5;
      out.push('<span class="evlog__day' + (on ? ' is-ended' : '') + (d === now.getDate() ? ' is-today' : '') + (weekend ? ' is-weekend' : '') + '" title="' + d + '"></span>');
    }
    grid.style.setProperty('--days', String(days));
    grid.innerHTML = out.join('');
    var mn = qs('[data-evlog-month]', root);
    if (mn) {
      var month = '';
      try { month = now.toLocaleDateString(document.documentElement.lang || undefined, { month: 'long', year: 'numeric' }); } catch (e) {}
      var count = n === 1 ? CFG.tpl.evenings1 : fill(CFG.tpl.eveningsN, { n: n });
      setText(mn, month ? month + ' · ' + count : count);
    }
  }

  /* ---------------------------------------------------- sound, wake, idle */

  function soundOn() {
    if (S.opts.music === 'own') return !S.mutedAll;
    return !!(audio && !audio.muted && audio.variant !== 'silent');
  }
  function syncSoundBtn() {
    var on = soundOn();
    el.sound.setAttribute('aria-pressed', on ? 'true' : 'false');
    el.sound.setAttribute('aria-label', on ? CFG.run.soundOn : CFG.run.soundOff);
    var use = qs('use', el.sound);
    if (use) use.setAttribute('href', on ? '#i-sound' : '#i-mute');
  }

  var wakeLock = null;
  function requestWake() {
    if (!S.opts.wake || !navigator.wakeLock || wakeLock) return;
    navigator.wakeLock.request('screen').then(
      function (l) {
        wakeLock = l;
        l.addEventListener('release', function () { wakeLock = null; });
      },
      function () {},
    );
  }
  function releaseWake() {
    if (wakeLock) {
      try { wakeLock.release(); } catch (e) {}
      wakeLock = null;
    }
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && S.running) requestWake();
  });

  var idleT = 0;
  function idle() {
    if (S.finished) return;
    overlay.classList.remove('is-idle');
    clearTimeout(idleT);
    if (!S.running) return;
    idleT = setTimeout(function () {
      var ae = document.activeElement;
      var busy = false;
      try {
        busy = !!(ae && ae.closest && (ae.closest('.im-park, .im-menu') || (ae.closest('.immersive__top, .im-dock, .im-card') && ae.matches(':focus-visible'))));
      } catch (e) {}
      if (S.running && !busy) overlay.classList.add('is-idle');
    }, 4500);
  }
  ['pointermove', 'pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
    overlay.addEventListener(ev, idle, { passive: true });
  });
  overlay.addEventListener('focusin', idle);
  // how bright the warm place is: yours, kept on this device
  RM.bright = 0.8;
  try {
    var bv = parseFloat(localStorage.getItem('es:place-bright'));
    if (bv >= 0.35 && bv <= 1.25) RM.bright = bv;
  } catch (e) {}
  if (el.bright) {
    var showBright = function () { el.bright.setAttribute('aria-valuetext', Math.round(RM.bright * 100) + '%'); };
    el.bright.value = String(RM.bright);
    showBright();
    el.bright.addEventListener('input', function () {
      RM.bright = Math.min(1.25, Math.max(0.35, parseFloat(el.bright.value) || 0.8));
      showBright();
      try { localStorage.setItem('es:place-bright', String(RM.bright)); } catch (e) {}
    });
  }
  // once the orbs are out, they move out of your way when you touch them
  overlay.addEventListener('pointermove', function (e) {
    var st = S.steps[S.i];
    if (!room || !RM.cam || !st || st.kind === 'breath' || RM.pose.orbs.come < 0.5 || !useRoom()) return;
    var r = overlay.getBoundingClientRect();
    room.nudge(e.clientX - r.left, e.clientY - r.top, RM.cam);
  }, { passive: true });

  window.addEventListener('resize', function () {
    if (scenes && S.open) scenes.resize();
    if (room && S.open) sizeRoom();
  });

  /* ------------------------------------------------------------- storage */

  function saveStats() {
    store.set(STATS_KEY, JSON.stringify(stats));
  }
  function save() {
    if (!S.open || S.intro || S.finished || S.ending) return;
    try {
      sessionStorage.setItem(RUN_KEY, JSON.stringify({ i: S.i, elapsed: S.elapsed, length: S.length, context: S.context, pace: S.pace, version: S.version, auto: S.auto, choice: S.choice, notes: S.notes || null, startedAt: S.startedAt, savedAt: Date.now() }));
    } catch (e) {}
  }
  function clearRun() {
    try { sessionStorage.removeItem(RUN_KEY); } catch (e) {}
  }
  function loadRun() {
    try {
      var r = JSON.parse(sessionStorage.getItem(RUN_KEY) || 'null');
      if (r && Date.now() - r.savedAt < 3 * 3600 * 1000) return r;
    } catch (e) {}
    return null;
  }

  /* ------------------------------------------------------------ reminder */

  function icsEscape(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }
  /* "Remind me on this phone" (Web Push), when the site has its push keys: one notification a
     day at the reminder time above, workdays only if ticked. The calendar file stays as the
     way that always works. */
  (function pushReminder() {
    var P = CFG.push, box = qs('[data-push]', root);
    if (!P || !P.key || !box) return;
    var can = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    var standalone = window.navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
    var iosBrowser = /iP(hone|ad|od)/.test(navigator.userAgent) && !standalone;
    if (!can && !iosBrowser) return;
    var on = qs('[data-push-on]', box), set = qs('[data-push-set]', box), txt = qs('[data-push-text]', box), note = qs('[data-push-note]', box), off = qs('[data-push-off]', box);
    box.hidden = false;
    if (iosBrowser && !can) {
      on.hidden = true;
      setText(note, P.ios);
      return;
    }
    var saved = null;
    try { saved = JSON.parse(store.get('es:push') || 'null'); } catch (e) {}
    var show = function () {
      on.hidden = !!saved;
      set.hidden = !saved;
      if (saved) setText(txt, fill(P.set, { t: saved.time, d: saved.days === 'workdays' ? P.workdays : P.daily }));
    };
    show();
    var key = function () {
      var s = P.key.replace(/-/g, '+').replace(/_/g, '/');
      var bin = atob(s + '==='.slice((s.length + 3) % 4));
      return Uint8Array.from(bin, function (c) { return c.charCodeAt(0); });
    };
    var post = function (body) {
      return fetch(P.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r;
      });
    };
    on.addEventListener('click', function () {
      var time = (qs('[data-reminder-time]', root) || {}).value || '18:00';
      var days = qs('[data-reminder-weekdays]', root) && qs('[data-reminder-weekdays]', root).checked ? 'workdays' : 'daily';
      var tz = 'Europe/Sofia';
      try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch (e) {}
      on.disabled = true;
      Promise.resolve(Notification.requestPermission())
        .then(function (perm) {
          if (perm !== 'granted') {
            setText(note, P.denied);
            return null;
          }
          return navigator.serviceWorker.ready
            .then(function (reg) { return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key() }); })
            .then(function (sub) { return post({ action: 'on', subscription: sub.toJSON(), time: time, tz: tz, days: days, locale: (ES.config && ES.config.locale) || 'en' }); })
            .then(function () {
              // the words the notification shows (the push itself carries none)
              if (window.caches) caches.open('es-push').then(function (c) { return c.put('/__es-push.json', new Response(JSON.stringify({ title: P.title, body: P.body, url: P.url }), { headers: { 'Content-Type': 'application/json' } })); }).catch(function () {});
              saved = { time: time, days: days };
              store.set('es:push', JSON.stringify(saved));
              show();
              track('push_on', { days: days });
            });
        })
        .catch(function () { setText(note, P.failed); })
        .then(function () { on.disabled = false; });
    });
    off.addEventListener('click', function () {
      navigator.serviceWorker.ready
        .then(function (reg) { return reg.pushManager.getSubscription(); })
        .then(function (sub) {
          if (!sub) return;
          post({ action: 'off', endpoint: sub.endpoint }).catch(function () {});
          return sub.unsubscribe();
        })
        .catch(function () {})
        .then(function () {
          saved = null;
          try { localStorage.removeItem('es:push'); } catch (e) {}
          show();
          track('push_off', {});
        });
    });
  })();

  function downloadIcs() {
    var t = (qs('[data-reminder-time]', root).value || '18:00').split(':');
    var weekdays = qs('[data-reminder-weekdays]', root).checked;
    var d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(+t[0], +t[1], 0, 0);
    var local = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
    var now = new Date();
    var stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    var mins = Math.round(buildSteps(S.length || 'full', '', S.pace || 'steady', S.version).reduce(function (a, s) { return a + s.dur; }, 0) / 60000) || 20;
    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ENDSHIFT//Reset reminder//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      'UID:' + now.getTime() + '-' + Math.random().toString(36).slice(2) + '@endshift',
      'DTSTAMP:' + stamp, 'DTSTART:' + local, 'DURATION:PT' + mins + 'M',
      weekdays ? 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' : 'RRULE:FREQ=DAILY',
      'SUMMARY:' + icsEscape(CFG.done.reminderEvent),
      'DESCRIPTION:' + icsEscape(CFG.done.reminderDesc + '\n' + CFG.url),
      'URL:' + CFG.url,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(CFG.done.reminderEvent), 'TRIGGER:PT0M', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ];
    var blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'endshift-reset.ics';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
    track('ritual_reminder_download', { weekdays: weekdays });
  }

  /* ------------------------------------------------------------ sound picker */

  var picker = qs('[data-soundpick]', form);
  // How loud your own music plays at each step when "lower my music" is on
  var MUSIC_LEVELS = [1, 0.9, 0.82, 0.74, 0.62, 0.58, 0.52];
  function musicLevel(i) {
    var st = S.steps[i];
    if (st && st.kind === 'breath') return 0.58;
    return MUSIC_LEVELS[Math.min(i, MUSIC_LEVELS.length - 1)];
  }
  function radioVal(name) {
    var r = qs('input[name="' + name + '"]:checked', form);
    return r ? r.value : '';
  }
  function musicPrefs() {
    return {
      mode: radioVal('music') || 'endshift',
      variant: radioVal('variant') || 'lamp',
      service: radioVal('service') || 'spotify',
      url: music && music.link ? (music.meta && music.meta.url) || '' : '',
      title: music && music.meta ? music.meta.title || '' : '',
      pick: music && music.meta ? music.meta.pick || '' : '',
      bells: !!(qs('#set-bells') && qs('#set-bells').checked),
      fade: !!(qs('#set-fade') && qs('#set-fade').checked),
    };
  }
  function savePicker() {
    stats.prefs.music = musicPrefs();
    saveStats();
  }

  // Listen: a few seconds of a soundtrack variation, right here in the setup
  var preview = null, previewT = 0, previewBtn = null;
  function setListen(btn, on) {
    if (!btn) return;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('is-playing', on);
    setText(qs('[data-listen-label]', btn), on ? MUS.stop : MUS.listen);
  }
  function stopPreview() {
    clearTimeout(previewT);
    if (preview) preview.finish(1.2);
    preview = null;
    setListen(previewBtn, false);
    previewBtn = null;
  }
  function startPreview(btn) {
    var id = btn.getAttribute('data-listen');
    var same = previewBtn === btn;
    stopPreview();
    if (same || !ES.RitualAudio) return;
    var a = new ES.RitualAudio();
    if (!a.init({ sound: true, binaural: false, variant: id })) return;
    a.setStep(2, { instant: true, silent: true });
    a.start();
    a.chime(0);
    preview = a;
    previewBtn = btn;
    setListen(btn, true);
    previewT = setTimeout(stopPreview, 12000);
    track('ritual_music_preview', { variant: id });
  }

  function showMode() {
    var mode = radioVal('music') || 'endshift';
    qsa('[data-music-panel]', picker).forEach(function (p) { p.hidden = p.getAttribute('data-music-panel') !== mode; });
    if (mode !== 'endshift') stopPreview();
    // a loaded player is parked (paused, out of sight) while another mode is chosen
    if (music && music.link) {
      dockEl.hidden = mode !== 'own';
      if (mode !== 'own') music.pause();
    }
    dockSpace();
  }
  function showService() {
    var sv = radioVal('service') || 'spotify';
    qsa('[data-service-panel]', picker).forEach(function (p) { p.hidden = p.getAttribute('data-service-panel') !== sv; });
    var priv = qs('[data-music-privacy]', picker);
    if (priv) priv.textContent = fill(MUS.privacy || '', { s: (MUS.services && MUS.services[sv]) || sv });
  }
  function markPick(id) {
    qsa('.pick', picker).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-pick-id') === id ? 'true' : 'false'); });
  }
  function useLink(url, title, pickId) {
    var link = ES.RitualMusic && ES.RitualMusic.parse(url);
    if (!link || !music) return false;
    music.load(link, { title: title || MUS.custom, pick: pickId || 'custom', url: url });
    var r = qs('input[name="service"][value="' + link.provider + '"]', form);
    if (r) {
      r.checked = true;
      showService();
    }
    markPick(pickId || '');
    var err = qs('[data-paste-error]', picker);
    if (err) err.hidden = true;
    savePicker();
    track('ritual_music_pick', { service: link.provider, pick: pickId || 'custom' });
    return true;
  }

  if (picker) {
    picker.addEventListener('change', function (e) {
      var n = e.target.name;
      if (n === 'music') showMode();
      else if (n === 'service') showService();
      savePicker();
    });
    picker.addEventListener('click', function (e) {
      var l = e.target.closest('[data-listen]');
      if (l) {
        var radio = qs('input[name="variant"][value="' + l.getAttribute('data-listen') + '"]', form);
        if (radio) radio.checked = true;
        startPreview(l);
        savePicker();
        return;
      }
      var p = e.target.closest('[data-pick]');
      if (p) useLink(p.getAttribute('data-pick'), p.getAttribute('data-pick-title'), p.getAttribute('data-pick-id'));
    });
    var pasteBox = qs('#music-url', picker);
    var pasteErr = qs('[data-paste-error]', picker);
    var paste = function () {
      var ok = useLink(pasteBox.value, '', '');
      pasteErr.hidden = ok;
      pasteBox.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (ok) pasteBox.value = '';
    };
    qs('[data-music-paste]', picker).addEventListener('click', paste);
    pasteBox.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        paste();
      }
    });
    pasteBox.addEventListener('input', function () {
      if (!pasteErr.hidden) {
        pasteErr.hidden = true;
        pasteBox.removeAttribute('aria-invalid');
      }
    });
  }
  if (music) {
    music.on(function (type) {
      if (type === 'clear') {
        markPick('');
        savePicker();
      }
      dockSpace();
    });
    if ('ResizeObserver' in window) new ResizeObserver(dockSpace).observe(dockEl);
  }
  // keep the bottom of the setup reachable above the docked player
  function dockSpace() {
    var on = !!(music && !dockEl.hidden);
    document.documentElement.classList.toggle('has-music-dock', on);
    if (on) document.documentElement.style.setProperty('--dock-h', dockEl.offsetHeight + 'px');
  }

  /* --------------------------------------------------------- OUT card */
  // A 1080×1350 picture of tonight's clock-out, drawn on the device. Shared or saved, never uploaded.
  var cardBox = qs('[data-outcard]', root);
  var cardBlob = null, cardUrl = null;
  function resetCard() {
    if (!cardBox) return;
    if (cardUrl) URL.revokeObjectURL(cardUrl);
    cardBlob = cardUrl = null;
    qs('[data-outcard-preview]', cardBox).hidden = true;
    qs('[data-outcard-share]', cardBox).hidden = true;
    qs('[data-outcard-save]', cardBox).hidden = true;
    qs('[data-outcard-make]', cardBox).hidden = false;
  }
  function drawCard(done) {
    var D = CFG.done, c = S.card || { t: clock(new Date()), m: 20, n: stats.count || 1, date: new Date() };
    var W = 1080, H = 1350;
    var cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    var g = cv.getContext('2d');
    var css = getComputedStyle(document.documentElement);
    var DF = css.getPropertyValue('--font-display').trim() || 'sans-serif';
    var BF = css.getPropertyValue('--font-body').trim() || 'sans-serif';
    g.fillStyle = '#0f1112';
    g.fillRect(0, 0, W, H);
    var glow = g.createRadialGradient(W / 2, H * 0.66, 0, W / 2, H * 0.66, W * 0.8);
    glow.addColorStop(0, 'rgba(242,168,75,0.30)');
    glow.addColorStop(1, 'rgba(242,168,75,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, W, H);
    // the mark: a sun setting on a line, and its reflection
    var cx = W / 2, hy = H * 0.68;
    g.fillStyle = '#f2a84b';
    g.beginPath();
    g.arc(cx, hy, 150, Math.PI, 0);
    g.fill();
    for (var k = 1; k <= 5; k++) {
      g.globalAlpha = 0.5 - k * 0.08;
      g.fillRect(cx - 150 + k * 22, hy + 18 + k * 22, 300 - k * 44, 6);
    }
    g.globalAlpha = 1;
    g.fillStyle = '#f3f0e8';
    g.fillRect(110, hy, W - 220, 7);
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    try { g.letterSpacing = '10px'; } catch (e) {}
    g.fillStyle = '#a7aaa8';
    g.font = '800 56px ' + DF;
    g.fillText(String(D.stamp || 'Out').toUpperCase(), cx, 210);
    try { g.letterSpacing = '0px'; } catch (e) {}
    g.fillStyle = '#f3f0e8';
    g.font = '900 320px ' + DF;
    g.fillText(c.t, cx, 500);
    g.fillStyle = '#f2a84b';
    g.font = '800 92px ' + DF;
    g.fillText(String(D.cardOver).toUpperCase(), cx, 620);
    g.fillStyle = '#d8d4ca';
    g.font = '500 42px ' + BF;
    g.fillText(c.m === 1 && D.cardMinute ? D.cardMinute : fill(D.cardMinutes, { m: c.m }), cx, H - 250);
    g.fillStyle = '#a7aaa8';
    g.font = '500 34px ' + BF;
    var dateText = '';
    try { dateText = c.date.toLocaleDateString(document.documentElement.lang || undefined, { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) {}
    g.fillText(fill(D.cardRitual, { n: c.n }) + (dateText ? ' · ' + dateText : ''), cx, H - 190);
    try { g.letterSpacing = '8px'; } catch (e) {}
    g.fillStyle = '#f3f0e8';
    g.font = '900 54px ' + DF;
    g.fillText('ENDSHIFT', cx, H - 92);
    try { g.letterSpacing = '0px'; } catch (e) {}
    g.fillStyle = '#7d8286';
    g.font = '500 28px ' + BF;
    g.fillText(D.site || '', cx, H - 48);
    cv.toBlob(function (blob) { done(blob); }, 'image/png');
  }
  function makeCard() {
    if (!cardBox || !S.card) return;
    var go = function () {
      drawCard(function (blob) {
        if (!blob) return;
        resetCard();
        cardBlob = blob;
        cardUrl = URL.createObjectURL(blob);
        var img = qs('[data-outcard-img]', cardBox);
        img.src = cardUrl;
        img.alt = fill(CFG.done.cardAlt, { t: (S.card && S.card.t) || '' });
        qs('[data-outcard-preview]', cardBox).hidden = false;
        qs('[data-outcard-make]', cardBox).hidden = true;
        var save = qs('[data-outcard-save]', cardBox);
        save.href = cardUrl;
        save.hidden = false;
        var file = null;
        try { file = new File([blob], 'endshift-out.png', { type: 'image/png' }); } catch (e) {}
        qs('[data-outcard-share]', cardBox).hidden = !(file && navigator.canShare && navigator.canShare({ files: [file] }));
        track('out_card', { action: 'make' });
      });
    };
    var DF = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim();
    if (document.fonts && document.fonts.load) document.fonts.load('900 100px ' + DF).then(go, go);
    else go();
  }
  if (cardBox) {
    qs('[data-outcard-make]', cardBox).addEventListener('click', makeCard);
    qs('[data-outcard-share]', cardBox).addEventListener('click', function () {
      if (!cardBlob) return;
      var file = new File([cardBlob], 'endshift-out.png', { type: 'image/png' });
      navigator.share({ files: [file], text: CFG.run && CFG.done ? '' : '' }).then(function () { track('out_card', { action: 'share' }); }, function () {});
    });
    qs('[data-outcard-save]', cardBox).addEventListener('click', function () { track('out_card', { action: 'save' }); });
  }

  /* ------------------------------------------------- add to home screen */
  function showInstall() {
    var box = qs('[data-install]', root);
    if (!box) return;
    var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    if (standalone) return;
    var ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    var btn = qs('[data-install-btn]', box);
    var update = function () {
      var can = !!ES.installPrompt;
      btn.hidden = !can;
      qs('[data-install-ios]', box).hidden = !(ios && !can);
      box.hidden = !(can || ios);
    };
    update();
    window.addEventListener('es:installable', update);
    btn.onclick = function () {
      var p = ES.installPrompt;
      if (!p) return;
      p.prompt();
      p.userChoice.then(function (c) {
        track('app_install_prompt', { outcome: c && c.outcome });
        ES.installPrompt = null;
        update();
      }, function () {});
    };
  }

  /* --------------------------------------------------------- quick start */

  var adjust = qs('[data-adjust]', form);
  var adjustBtn = qs('[data-adjust-toggle]', form);
  var summaryEl = qs('[data-quick-summary]', form);
  var labelOf = function (name) {
    var r = qs('input[name="' + name + '"]:checked', form);
    var span = r && r.parentNode.querySelector('span');
    return span ? span.textContent.trim() : '';
  };
  function summary() {
    if (!summaryEl) return;
    var parts = [labelOf('length')];
    var v = radioVal('version');
    if (v && v !== 'evening') parts.push(labelOf('version'));
    var mode = radioVal('music');
    if (mode === 'endshift') {
      var vr = qs('input[name="variant"]:checked', form);
      var nm = vr && vr.parentNode.querySelector('.variant__name');
      parts.push(labelOf('music') + ': ' + (nm ? nm.textContent.trim() : ''));
    } else if (mode === 'own' && music && music.link) parts.push((music.meta && music.meta.title) || labelOf('music'));
    else parts.push(labelOf('music'));
    parts.push(labelOf('pace'));
    // each setting stays in one piece, and a line never starts with the dot
    summaryEl.textContent = parts.filter(Boolean).map(function (p) { return p.replace(/ /g, '\u00a0'); }).join('\u00a0· ');
  }
  var adjustHooks = [];
  function setAdjust(open) {
    if (!adjust) return;
    adjust.classList.toggle('is-open', open);
    adjustBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    setText(qs('[data-adjust-label]', adjustBtn), open ? CFG.setup.adjustHide : CFG.setup.adjust);
    adjustHooks.forEach(function (f) { f(open); });
  }
  if (adjustBtn) {
    adjustBtn.addEventListener('click', function () {
      var open = !adjust.classList.contains('is-open');
      setAdjust(open);
      if (open) {
        // the card opens under the hero: bring it up, then hand focus to its first choice
        adjust.scrollIntoView({ behavior: still() ? 'auto' : 'smooth', block: 'start' });
        var first = qs('input, button', adjust);
        if (first) try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); }
      }
    });
  }
  var speakTouched = false;
  var speakBox = qs('#set-speak');
  if (speakBox) speakBox.addEventListener('change', function () { speakTouched = true; });
  form.addEventListener('change', function (e) {
    // On the way home the steps are read aloud, unless you've decided otherwise
    if (e.target.name === 'version' && speakBox && !speakBox.disabled && !speakTouched) speakBox.checked = e.target.value === 'commute';
    summary();
  });
  if (music) music.on(summary);

  /* -------------------------------------------------------------- wiring */

  (function restorePrefs() {
    var p = stats.prefs;
    var pick = function (name, val) {
      var r = val && qs('input[name="' + name + '"][value="' + val + '"]', form);
      if (r) r.checked = true;
    };
    pick('context', p.context);
    pick('length', p.length);
    pick('pace', p.pace);
    pick('version', p.version);
    // Picked "Care, nights" on the home page and never chose a version here: start from the night-shift one
    if (!p.version && store.get('es:job') === 'ward') pick('version', 'night');
    ['binaural', 'speak', 'haptics', 'wake'].forEach(function (k) {
      var box = qs('#set-' + k);
      if (box && typeof p[k] === 'boolean') box.checked = p[k];
    });
    var mp = p.music || {};
    if (typeof p.sound === 'boolean' && !p.music) mp.mode = p.sound ? 'endshift' : 'none'; // settings saved before music choices existed
    pick('music', mp.mode);
    pick('variant', mp.variant);
    pick('service', mp.service);
    ['bells', 'fade'].forEach(function (k) {
      var box = qs('#set-' + k);
      if (box && typeof mp[k] === 'boolean') box.checked = mp[k];
    });
    if (picker) {
      showService();
      // reload your music only for a service you've already chosen on this device
      if (mp.url && ES.RitualMusic && ES.RitualMusic.consents()[mp.service] && music) {
        var link = ES.RitualMusic.parse(mp.url);
        if (link) {
          music.load(link, { title: mp.title, pick: mp.pick, url: mp.url });
          markPick(mp.pick);
        }
      }
      showMode();
    }
    if (!navigator.vibrate) { var h = qs('#set-haptics'); h.checked = false; h.disabled = true; }
    if (!canSpeak()) { var sp = qs('#set-speak'); if (sp) { sp.checked = false; sp.disabled = true; } }
    if (!navigator.wakeLock) { var w = qs('#set-wake'); w.checked = false; w.disabled = true; }
  })();

  if (qs('[data-quick-label]', form) && stats.prefs && stats.prefs.length) setText(qs('[data-quick-label]', form), CFG.setup.quickSame);

  /* "Now with narration": a hand-drawn arrow and note pointing at Adjust while the recorded voice
     is new. Only where there is a recorded voice, never once read aloud is on (saved, or switched
     on here), and not after six visits. A tap on it opens the settings at "Read each step aloud". */
  (function voiceNudge() {
    var notes = qsa('[data-nudge]', root);
    var sp = qs('#set-speak');
    if (!notes.length || !VO || !sp || sp.disabled || sp.checked) return;
    var KEY = 'es:nudge-voice';
    var seen = store.get(KEY);
    if (seen === 'done' || (parseInt(seen, 10) || 0) >= 6) return;
    store.set(KEY, String((parseInt(seen, 10) || 0) + 1));
    var quick = qs('[data-quickstart]', form);
    var startBtn = quick && qs('.ritual__start', quick);
    var doorAdj = qs('[data-act="door-adjust"]', root);
    var over = false;
    // Adjust sits at the end of the row, or alone under Start on narrow screens: the arrow follows it
    function stacked() {
      if (quick && startBtn && adjustBtn && quick.offsetWidth) quick.classList.toggle('is-stacked', adjustBtn.offsetTop > startBtn.offsetTop + 4);
    }
    function show(on) {
      on = on && !over;
      notes.forEach(function (n) { n.hidden = !on; });
      [adjustBtn, doorAdj].forEach(function (b) { if (b) b.classList.toggle('is-nudged', on); });
      if (on) stacked();
    }
    function spotlight(go) {
      var lab = qs('label[for="set-speak"]', form);
      if (!lab) return;
      lab.classList.remove('is-spotlit');
      void lab.offsetWidth;
      lab.classList.add('is-spotlit');
      clearTimeout(spotlight.t);
      spotlight.t = setTimeout(function () { lab.classList.remove('is-spotlit'); }, 3200);
      if (go) {
        lab.scrollIntoView({ behavior: still() ? 'auto' : 'smooth', block: 'center' });
        try { sp.focus({ preventScroll: true }); } catch (e) {}
      }
    }
    notes.forEach(function (n) {
      n.addEventListener('click', function () {
        setAdjust(true);
        spotlight(true);
        track('ritual_nudge', { where: n.classList.contains('nudge--door') ? 'door' : 'setup' });
      });
    });
    // through Adjust itself, the switch still lights up when you get down to it
    [adjustBtn, doorAdj].forEach(function (b) {
      if (b) b.addEventListener('click', function () {
        setTimeout(function () { if (!over && adjust.classList.contains('is-open')) spotlight(false); }, 0);
      });
    });
    // the settings open: the note steps aside; closed again, it's back (unless you've tried it)
    adjustHooks.push(function (open) { show(!open); });
    sp.addEventListener('change', function () {
      if (!sp.checked) return;
      over = true;
      store.set(KEY, 'done');
      show(false);
    });
    window.addEventListener('resize', stacked);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(stacked);
    show(!(adjust && adjust.classList.contains('is-open')));
  })();
  summary();

  // The context choice is optional: clicking the selected one clears it
  qsa('input[name="context"]', form).forEach(function (input) {
    var was = false;
    input.addEventListener('pointerdown', function () { was = input.checked; });
    input.addEventListener('click', function () {
      if (was) { input.checked = false; was = false; }
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearRun();
    if (el.resume) el.resume.hidden = true;
    start(null);
  });

  var saved = loadRun();
  if (saved && el.resume) {
    var ss = buildSteps(saved.length, saved.context, saved.pace, saved.version);
    var st0 = ss[Math.min(saved.i, ss.length - 1)];
    el.resumeText.textContent = fill(CFG.tpl.resumeText, { t: st0.title, l: '' });
    el.resume.hidden = false;
    qs('[data-resume-go]', root).addEventListener('click', function () {
      el.resume.hidden = true;
      start(saved);
    });
    qs('[data-resume-discard]', root).addEventListener('click', function () {
      el.resume.hidden = true;
      clearRun();
    });
  }

  /* The door: once you've done it here (or opened it from your home screen), the page opens on
     one big button. One tap and it starts, the way you had it last time. */
  var door = qs('[data-door]', root);
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function syncDoor() {
    if (!door || door.hidden) return;
    var n = stats.days.length + (stats.days.indexOf(todayKey()) >= 0 ? 0 : 1);
    setText(qs('[data-door-evening]', door), fill(CFG.tpl.doorEvening, { n: Math.max(1, n) }));
    var back = (stats.count || 0) >= 1;
    setText(qs('[data-door-sum]', door), back ? CFG.door.same + ' · ' + (summaryEl ? summaryEl.textContent : '') : CFG.door.first);
  }
  (function showDoor() {
    if (!door) return;
    var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    var app = /[?&]app=1\b/.test(location.search);
    if (!((stats.count || 0) >= 1 || app || standalone)) return;
    door.hidden = false;
    root.classList.add('has-door');
    syncDoor();
  })();
  form.addEventListener('change', syncDoor);
  if (music) music.on(syncDoor);
  // what you ticked in a guide today, on a slip by the start button
  (function tonightSlip() {
    var tg = tonightItems();
    if (!tg.length || !RUN.fromGuide) return;
    qsa('[data-tonight-slip]', root).forEach(function (slip) {
      var p = document.createElement('p'); p.className = 'tonight-slip__k'; p.textContent = RUN.fromGuide;
      var ul = document.createElement('ul'); ul.className = 'tonight-slip__list';
      tg.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      slip.appendChild(p); slip.appendChild(ul);
      slip.hidden = false;
    });
  })();

  // picking one of a step's options: water or tea, read or music or just sit, paper or typed
  function pickChoice(id) {
    var st = S.steps[S.i];
    if (!st || !st.choices || st.choices.indexOf(id) < 0) return;
    S.choice[st.id] = id;
    qsa('[data-choice]', el.choices).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-choice') === id ? 'true' : 'false'); });
    renderAct(st);
    if (st.id === 'clock-out' && id === 'type' && el.parkText) el.parkText.focus({ preventScroll: true });
    stats.prefs.choices = Object.assign({}, stats.prefs.choices || {}, S.choice);
    saveStats();
    idle();
    track('ritual_choice', { step: st.id, choice: id });
  }

  function setGuide(on) {
    S.opts.guide = on;
    S.opts.speak = on ? canSpeak() : S.speakPref;
    stats.prefs.guide = on;
    saveStats();
    if (el.guide) el.guide.checked = on;
    S.asked = false;
    syncDone();
    if (on) sayStep(S.steps[S.i], 'now');
    else hush();
    track('ritual_guide', { on: on });
  }
  if (el.guide) el.guide.addEventListener('change', function () { setGuide(el.guide.checked); });

  function onAct(act) {
    if (act === 'leave') return leave();
    if (act === 'door' || act === 'door-short') {
      clearRun();
      if (el.resume) el.resume.hidden = true;
      return start(null, act === 'door-short' ? { length: 'mini' } : null);
    }
    if (act === 'door-adjust') {
      setAdjust(true);
      adjust.scrollIntoView({ behavior: still() ? 'auto' : 'smooth', block: 'start' });
      var first = qs('input, button', adjust);
      if (first) try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); }
      return;
    }
    if (S.finished && act !== 'restart' && act !== 'ics') return;
    if (act === 'done') {
      if (!S.open || S.intro || S.ending) return;
      if (!S.running) setRunning(true);
      complete(false);
    } else if (act === 'menu') {
      setMenu(el.menu.hidden);
    } else if (act === 'toggle') {
      if (S.intro) return;
      setRunning(!S.running);
      track(S.running ? 'ritual_resume' : 'ritual_pause', { step: S.i + 1 });
    } else if (act === 'next') {
      setMenu(false);
      go(1);
    } else if (act === 'prev') {
      setMenu(false);
      go(-1);
    } else if (act === 'end') {
      setMenu(false);
      finish(false);
    } else if (act === 'sound') {
      var turnOn = !soundOn();
      if (S.opts.music === 'own') {
        // one switch for everything you hear: your music and the bells
        S.mutedAll = !turnOn;
        music.setMuted(!turnOn);
        if (turnOn && !S.running) music.pause();
        if (audio) audio.setMuted(!turnOn);
      } else if (!audio || audio.variant === 'silent') {
        var binauralOnly = audio;
        if (binauralOnly) binauralOnly.finish(0.6);
        audio = new ES.RitualAudio();
        if (audio.init({ sound: true, binaural: S.opts.binaural, variant: S.opts.music === 'endshift' ? S.opts.variant : 'lamp' })) {
          audio.setStep(S.i, { breath: S.steps[S.i].kind === 'breath', instant: true, silent: true });
          audio.start();
          if (!S.running) audio.pause();
        } else audio = null;
      } else audio.setMuted(!audio.muted);
      S.opts.sound = soundOn();
      syncSoundBtn();
      track('ritual_sound', { on: S.opts.sound });
    } else if (act === 'restart') {
      views.done.hidden = true;
      views.setup.hidden = false;
      root.removeAttribute('data-state');
      if (door && root.classList.contains('has-door')) {
        door.hidden = false;
        syncDoor();
      }
      window.scrollTo({ top: 0 });
      var go1 = (door && !door.hidden && qs('.door__btn', door)) || qs('.ritual__start', root);
      if (go1) go1.focus();
    } else if (act === 'ics') downloadIcs();
  }

  overlay.addEventListener('click', function (e) {
    var c = e.target.closest('[data-choice]');
    if (c) return pickChoice(c.getAttribute('data-choice'));
    var b = e.target.closest('[data-act]');
    if (b) onAct(b.getAttribute('data-act'));
    else if (!el.menu.hidden && !e.target.closest('.im-menu')) setMenu(false);
  });
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (b) onAct(b.getAttribute('data-act'));
  });
  // the start button at the foot of the page, outside the ritual's own section
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-ritual-start]')) onAct('door');
  });

  document.addEventListener('keydown', function (e) {
    if (!S.open) return;
    var t = e.target && e.target.closest ? e.target : null;
    if (e.key === 'Escape') {
      if (!el.menu.hidden) {
        setMenu(false);
        el.menuBtn.focus();
        return;
      }
      onAct(S.finished ? 'leave' : S.running ? 'toggle' : '');
      return;
    }
    if (t && t.closest('textarea, input, select')) return; // typing your list
    if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
      if (t && t.closest('button, a, summary, label')) return; // the focused control handles it itself
      e.preventDefault();
      if (S.finished || S.intro) return;
      if (!S.running) onAct('toggle');
      else onAct('done');
    } else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
  });

  window.addEventListener('pagehide', save);
  views.setup.hidden = false;
  views.done.hidden = true;
  renderLog();

  // Exposed for testing: ES.ritualDebug.jump(stepIndex, seconds), .done(), .state()
  ES.ritualDebug = {
    jump: function (i, sec) {
      if (!S.open) return;
      RM.anim = null;
      RM.leaving = 0;
      changeStep(i, false);
      S.elapsed = sec * 1000;
      fade = null;
    },
    done: function () { onAct('done'); },
    state: function () {
      return {
        i: S.i, id: S.steps[S.i] && S.steps[S.i].id, elapsed: S.elapsed, running: S.running, auto: S.auto, guide: !!S.opts.guide,
        anim: RM.anim ? RM.anim.id : '', leaving: !!RM.leaving, ending: !!S.ending, finished: !!S.finished, room: useRoom(), cam: RM.camKey,
        choice: S.choice, done: S.done, dream: RM.D, light: RM.L,
        steps: S.steps.map(function (s) { return [s.id, Math.round(s.dur / 1000), Math.round(s.sug / 1000)]; }),
      };
    },
  };
})();
