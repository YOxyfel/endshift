/* ENDSHIFT home page hero: find the switch and clock out.
   One game a day, the same for everyone on that day (game.week in the config; ?job=<id>
   plays a given one). Three kinds: a 3D room (game-room.js), a message flood
   (game-flood.js) and a torch in the dark (game-torch.js). This file runs whichever is
   today's: the frame around it, the clock, the help that gets louder the longer it takes,
   the win, and the evening behind it (with the reward).

   With the opening montage (intro.js) on a first visit, the montage ends on the switch,
   which then flies into today's game and disappears there: ES.game.handoffTarget() says
   where to, ES.game.handoffDone() starts play. */
(function () {
  'use strict';

  var section = document.querySelector('[data-game]');
  if (!section) return;
  var root = document.documentElement;
  var CFG = {};
  try {
    CFG = JSON.parse((document.getElementById('es-config') || {}).textContent || '{}');
  } catch (e) {}
  var G = CFG.game;
  var ES = (window.ES = window.ES || {});
  if (!G || !G.games || !ES.games) return;

  var qs = function (s, el) { return (el || document).querySelector(s); };
  var track = function (name, props) { if (ES.track) ES.track(name, props || {}); };
  var fill = function (s, o) { return String(s || '').replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  var reduced = !root.classList.contains('motion-ok');
  var H = G.hud;

  /* Today's game ------------------------------------------------------------------- */
  var now = new Date();
  var dow = (now.getDay() + 6) % 7; // Monday = 0
  var dayKey = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  var params = new URLSearchParams(location.search);
  var forced = G.urlParam ? params.get('job') : null;
  // the rooms need WebGL; asked once, and only on a day with a room
  var can3d = null;
  function has3d() {
    if (can3d === null) can3d = !!(ES.games.room && ES.games.room.supported && ES.games.room.supported());
    return can3d;
  }
  function usable(id) {
    var g = G.games[id];
    return !!(g && ES.games[g.type] && (g.type !== 'room' || (ES.roomScenes && ES.roomScenes[id] && has3d())));
  }
  // your own job, if you picked one under "What do you do?" (else the day's)
  var mine = store.get('es:job');
  var id = forced && usable(forced) ? forced : mine && usable(mine) ? mine : G.week[dow];
  if (!usable(id)) {
    // a browser without 3D gets the next game that isn't a room
    for (var i = 1; i <= 7 && !usable(id); i++) id = G.week[(dow + i) % 7];
  }
  if (!usable(id)) return;
  var D = G.games[id];
  var tomorrow = (mine && id === mine ? D : G.games[G.week[(dow + 1) % 7]]) || D;

  /* The frame ---------------------------------------------------------------------- */
  var view = qs('[data-game-view]', section);
  var hud = qs('[data-game-hud]', section);
  var after = qs('[data-game-after]', section);
  var sayEl = qs('[data-game-say]', section);
  var timerEl = qs('[data-game-timer]', section);
  var hintBtn = qs('[data-game-hint]', section);
  var clockEl = qs('[data-game-clock]', section);
  section.classList.add('is-live', 'game--' + D.type);
  section.setAttribute('data-game-id', id);
  qs('[data-game-job]', section).textContent = D.job;
  qs('[data-game-mission]', section).textContent = D.mission;
  qs('[data-game-how]', section).textContent = (H.how[D.type] || '') + ' ' + (H.keys[D.type] || '');

  // The scenario's own clock runs fast: a minute every five seconds of play.
  var startMin = (function () { var p = (D.time || '20:00').split(':'); return +p[0] * 60 + +p[1]; })();
  function clock() {
    var m = (startMin + Math.floor(playMs / 5000)) % 1440;
    return pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  }
  function fmt(ms) {
    var s = Math.max(1, Math.round(ms / 1000));
    return Math.floor(s / 60) + ':' + pad(s % 60);
  }

  var sayT = 0, saidAt = 0;
  function say(text, ms) {
    if (!text) return;
    saidAt = performance.now();
    sayEl.textContent = text;
    sayEl.classList.remove('is-on');
    void sayEl.offsetWidth;
    sayEl.classList.add('is-on');
    clearTimeout(sayT);
    sayT = setTimeout(function () { sayEl.classList.remove('is-on'); }, ms || 3800);
  }

  /* Play time, and help that gets louder ---------------------------------------------- */
  var state = 'idle'; // idle → play → won → after
  var playMs = 0, lastTick = 0, level = 0, touches = 0, boost = 0, interactedOnce = false;
  var visible = true, tickT = 0;
  var engine = null;

  function ladder() {
    return (engine && engine.assistAt) || [8000, 16000, 26000, 38000];
  }
  function tick() {
    var t = performance.now();
    if (state === 'play' && visible && !document.hidden) playMs += t - lastTick;
    lastTick = t;
    timerEl.textContent = fmt(playMs);
    if (clockEl) clockEl.textContent = clock();
    if (state !== 'play') return;
    var eff = playMs + touches * 2500 + boost;
    var at = ladder();
    while (level < 4 && eff >= at[level]) bump(false);
  }
  function bump(asked) {
    if (level >= 4 || state !== 'play') return;
    level++;
    engine.assist(level);
    var line = (D.hints && D.hints[level - 1]) || H.ladder[level - 1];
    // don't talk over what something just said, unless the hint was asked for
    var since = performance.now() - saidAt;
    if (asked || since > 2400) say(line, 4200);
    else setTimeout(function () { if (state === 'play') say(line, 4200); }, 2400 - since);
    section.classList.add('assist-' + level);
    if (asked) {
      // asking skips the wait for the next step too
      var at = ladder();
      boost = Math.max(boost, (at[level - 1] || 0) - playMs);
    }
    track('game_hint', { game: id, level: level, asked: !!asked });
  }

  /* What the engines can call ----------------------------------------------------------- */
  var api = {
    id: id,
    scene: id,
    data: D,
    hud: H,
    objects: D.objects || {},
    strings: CFG.strings || {},
    reduced: reduced,
    clock: clock,
    say: say,
    sfx: function (name, arg) {
      var s = ES.shift && ES.shift.sfx;
      if (s && s[name]) try { s[name](arg); } catch (e) {}
    },
    interacted: function () {
      if (!interactedOnce) {
        interactedOnce = true;
        track('game_start', { game: id, type: D.type });
      }
    },
    touch: function (obj, kind) {
      touches++;
      track('game_touch', { game: id, object: obj, kind: kind || 'object' });
    },
    reveal: function (obj) { track('game_reveal', { game: id, object: obj }); },
    inView: function () { return visible; },
    win: win,
  };

  function build() {
    view.innerHTML = '';
    engine = ES.games[D.type](view, api);
    if (!engine) return false;
    return true;
  }
  function play() {
    if (state === 'play') return;
    state = 'play';
    playMs = 0;
    level = 0;
    touches = 0;
    boost = 0;
    lastTick = performance.now();
    clearInterval(tickT);
    tickT = setInterval(tick, 250);
    tick();
    engine.start();
    hintBtn.disabled = false;
  }

  hintBtn.addEventListener('click', function () {
    api.interacted();
    if (state === 'play') bump(true);
  });
  qs('[data-game-skip]', section).addEventListener('click', function () {
    track('game_skip', { game: id, ms: Math.round(playMs), level: level });
  });

  // pause when out of sight
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      if (engine && state === 'play') engine.pause(!visible);
    }, { threshold: 0.2 }).observe(section);
  }

  /* Winning -------------------------------------------------------------------------------- */
  var result = null;
  function win(info) {
    if (state !== 'play') return;
    tick();
    state = 'won';
    clearInterval(tickT);
    hintBtn.disabled = true;
    var ms = playMs;
    var out = clock();
    result = { day: dayKey, id: id, ms: Math.round(ms), out: out };
    if (!forced) store.set('es:game', JSON.stringify(result));
    track('game_win', { game: id, type: D.type, ms: Math.round(ms), level: level, touches: touches, how: (info && info.how) || 'switch' });
    // the site goes to "off" too; the game makes its own sound for it
    api.sfx('flip', true);
    if (ES.shift) {
      if (ES.shift.haptic) ES.shift.haptic(true);
      if (!ES.shift.isOff()) ES.shift.set(true, { source: 'game', silent: true, quiet: true });
    }
    say(fill(H.won, { t: fmt(ms) }), 6000);
    section.classList.add('is-won');
    fillAfter(result, false);
    engine.outro(prepareAfter, showAfter);
  }

  function fillAfter(r, again) {
    qs('[data-after-time]', after).textContent = r.out;
    qs('[data-after-found]', after).textContent = again ? fill(G.after.again, { t: fmt(r.ms) }) : fill(G.after.found, { t: fmt(r.ms), job: D.job });
    qs('[data-after-fits]', after).textContent = D.fitsText || '';
    qs('[data-after-tomorrow]', after).textContent = fill(G.after.tomorrow, { job: tomorrow.job });
    var form = qs('form[data-signup]', after);
    if (form) form.setAttribute('data-source', 'game-' + id);
    rewardState();
  }
  function rewardState() {
    var rewardCard = qs('[data-reward-card]', after);
    if (rewardCard) rewardCard.hidden = false;
    var claimed = !!store.get('es:reward');
    var formBox = qs('[data-reward-form]', after);
    var note = qs('[data-reward-claimed]', after);
    if (!formBox || !note) return;
    var done = formBox.querySelector('.signup.is-done');
    formBox.hidden = claimed && !done;
    note.hidden = !claimed || !!done;
  }
  window.addEventListener('es:reward', function () { track('game_reward_claim', { game: id }); });

  // The view stays exactly where it is while the evening opens underneath it.
  function prepareAfter() {
    var sr = section.getBoundingClientRect(), vr = view.getBoundingClientRect();
    view.style.top = vr.top - sr.top + 'px';
    view.style.height = vr.height + 'px';
    section.classList.add('is-ending');
    after.hidden = false;
    if (G.reward) track('game_reward_view', { game: id });
  }
  function showAfter() {
    state = 'after';
    section.classList.remove('is-ending');
    section.classList.add('is-after');
    view.style.top = '';
    view.style.height = '';
    if (engine) engine.destroy();
    engine = null;
    view.innerHTML = '';
    var title = qs('#after-title', after);
    if (title && section.getBoundingClientRect().top > -40) {
      try { title.focus({ preventScroll: true }); } catch (e) {}
    }
  }

  // Already clocked out of today's game: straight to the evening (play again from there).
  function showReturning(r) {
    state = 'after';
    fillAfter(r, true);
    after.hidden = false;
    section.classList.add('is-after', 'is-returning');
  }

  // Work already switched off (on any side of the site): the home opens on the evening too,
  // not on the cold game. No reward without playing; the game waits one tap away.
  var replayLabel = qs('[data-game-replay] span', section);
  function showOff() {
    state = 'after';
    var d = new Date();
    qs('[data-after-time]', after).textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
    qs('[data-after-found]', after).textContent = G.after.off || '';
    qs('[data-after-fits]', after).textContent = D.fitsText || '';
    qs('[data-after-tomorrow]', after).textContent = fill(G.after.today, { job: D.job });
    var form = qs('form[data-signup]', after);
    if (form) form.setAttribute('data-source', 'game-' + id);
    var rewardCard = qs('[data-reward-card]', after);
    if (rewardCard) rewardCard.hidden = true;
    if (replayLabel && G.after.play) replayLabel.textContent = G.after.play;
    after.hidden = false;
    section.classList.add('is-after', 'is-returning', 'is-off');
    track('game_off_evening', { game: id });
  }

  qs('[data-game-replay]', section).addEventListener('click', function () {
    track('game_replay', { game: id, from: section.classList.contains('is-off') ? 'off' : 'after' });
    section.classList.remove('is-after', 'is-won', 'is-returning', 'is-off', 'assist-1', 'assist-2', 'assist-3', 'assist-4');
    if (replayLabel && G.after.replay) replayLabel.textContent = G.after.replay;
    after.hidden = true;
    state = 'idle';
    interactedOnce = false;
    if (!build()) return;
    var top = section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: Math.max(0, top - 0), behavior: reduced ? 'auto' : 'smooth' });
    play();
    say(H.how[D.type], 5000);
    var first = view.querySelector('button');
    if (first) try { first.focus({ preventScroll: true }); } catch (e) {}
  });

  /* Go ---------------------------------------------------------------------------------- */
  var stored = null;
  try { stored = JSON.parse(store.get('es:game') || 'null'); } catch (e) {}
  var wantPlay = !!forced || params.has('play');
  if (stored && stored.day === dayKey && stored.id === id && !wantPlay) {
    showReturning(stored);
  } else if (root.getAttribute('data-shift') === 'off' && !wantPlay && !root.classList.contains('intro-pending')) {
    showOff();
  } else {
    if (!build()) return;
    var waiting = root.classList.contains('intro-pending');
    var begin = function () {
      if (state !== 'idle') return;
      play();
      say(waiting ? H.nowFind : H.how[D.type], 4500);
      if (waiting) setTimeout(function () { if (state === 'play') say(H.how[D.type], 4500); }, 4600);
    };
    if (waiting) {
      // the opening hands over; if it can't, start when it's done
      window.addEventListener('es:intro-done', function () { setTimeout(begin, 60); }, { once: true });
    } else begin();
    ES.game = {
      id: id,
      handoffTarget: function () { return engine && engine.switchTarget ? engine.switchTarget() : null; },
      handoffDone: begin,
      handoffLine: H.handoff,
    };
  }
  tick();
})();
