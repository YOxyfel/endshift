/* ENDSHIFT "Still on shift". What work mode does while it's on: the shift that won't end.
   Messages slide in as slips of paper, too big to ignore (flick them away; they come back),
   a meeting invites itself and then just starts (four ink faces, captions, a shared screen),
   someone leans in at the edge, the office tube flickers, the tab's title counts the unread.
   The longer it stays on, the more absurd it gets. The switch in the header is always the way
   out, and every slip has its own "Clock out". At the absurd end Finance approves a 50% code
   that has to be collected the hard way: the Overtime gauntlet (unjam the printer, hold to
   approve while pings land on the button, sit through Dana's deck, corner the code).

   Rules: nothing for the first twenty seconds; nothing in low-stim mode, in the ritual, in the
   game, while the film plays by itself, during the opening, while you type, or with the menu
   open. Slips never cover the header. Reduced motion: things appear and go without moving.
   Words: src/content/<locale>/onshift.js (CFG.onshift). State: this visit in sessionStorage
   (es:onshift-visit), this device in localStorage (es:onshift). */
(function () {
  'use strict';
  var ES = (window.ES = window.ES || {});
  var root = document.documentElement;
  var CFG = ES.config || {};
  var O = CFG.onshift;
  var host = document.querySelector('[data-onshift]');
  if (!O || !host) return;

  var qs = function (s, el) { return (el || document).querySelector(s); };
  var qsa = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var still = function () { return !!(ES.reducedMotion && ES.reducedMotion()); };
  var calm = function () { return root.getAttribute('data-calm') === 'on'; };
  var track = function (n, p) { if (ES.track) ES.track(n, p || {}); };
  var toast = function (m) { if (ES.toast && m) ES.toast(m); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var fill = function (s, o) { return String(s || '').replace(/\{(\w+)\}/g, function (m, k) { return o && o[k] != null ? o[k] : m; }); };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var pick = function (arr, not) {
    var a = arr.filter(function (x) { return x !== not; });
    if (!a.length) a = arr;
    return a[Math.floor(Math.random() * a.length)];
  };
  var clock = function () { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  var coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var el = function (cls, html, tag) {
    var e = document.createElement(tag || 'div');
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  };

  /* ------------------------------------------------------------------ state */
  function load(st, key, def) {
    try { var v = JSON.parse(st.getItem(key) || 'null'); if (v && typeof v === 'object') return Object.assign({}, def, v); } catch (e) {}
    return Object.assign({}, def);
  }
  function save(st, key, v) { try { st.setItem(key, JSON.stringify(v)); } catch (e) {} }
  var SKEY = 'es:onshift-visit', LKEY = 'es:onshift';
  // this visit: seconds endured with work on, when the next thing comes, what's been shown
  var S = load(sessionStorage, SKEY, { t: 0, next: 20, shown: 0, dismissed: 0, unread: 0, last: '', meetAt: 0, forced: 0, declined: 0, offerAt: 0, stage: 0, stamps: 0 });
  // this device: the running count, and whether the code was collected
  var L = load(localStorage, LKEY, { pings: 0, ignored: 0, survived: 0, overtime: null });
  var saveS = function () { save(sessionStorage, SKEY, S); };
  var saveL = function () { save(localStorage, LKEY, L); };
  var shownHere = 0; // this page load (a cap, so a long read isn't a storm)
  var live = []; // slips on screen
  var modal = null; // the meeting, a gauntlet stage or the claim: one at a time

  /* ------------------------------------------------------------------ gates */
  function workOn() { return root.getAttribute('data-shift') !== 'off'; }
  function gameBusy() {
    var g = qs('[data-game]');
    if (!g || g.classList.contains('is-after')) return false;
    var r = g.getBoundingClientRect();
    return r.bottom > innerHeight * 0.2 && r.top < innerHeight * 0.8;
  }
  function typing() {
    var a = document.activeElement;
    return !!(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable) && !host.contains(a));
  }
  function paused() {
    return calm() || document.hidden || root.classList.contains('immersive-open') || root.classList.contains('is-watching') ||
      root.classList.contains('intro-pending') || root.classList.contains('intro-live') || document.body.classList.contains('menu-open') ||
      gameBusy() || typing();
  }
  function level() { return S.t >= 150 || S.dismissed >= 5 ? 3 : S.t >= 60 || S.dismissed >= 2 ? 2 : 1; }

  /* ------------------------------------------------------------------ the badge: the tab counts */
  var title0 = document.title;
  var icon0 = qs('link[rel="icon"]');
  var iconHref0 = icon0 ? icon0.getAttribute('href') : '';
  var iconDot = null;
  function badge() {
    document.title = S.unread > 0 && workOn() ? '(' + S.unread + ') ' + title0 : title0;
    if (!icon0 || !iconHref0) return;
    if (!(S.unread > 0 && workOn())) { icon0.setAttribute('href', iconHref0); return; }
    if (iconDot) { icon0.setAttribute('href', iconDot); return; }
    var img = new Image();
    img.onload = function () {
      try {
        var c = document.createElement('canvas');
        c.width = c.height = 64;
        var g = c.getContext('2d');
        g.drawImage(img, 0, 0, 64, 64);
        g.fillStyle = '#ff5a4e';
        g.beginPath();
        g.arc(50, 14, 13, 0, Math.PI * 2);
        g.fill();
        iconDot = c.toDataURL('image/png');
        if (S.unread > 0 && workOn()) icon0.setAttribute('href', iconDot);
      } catch (e) {}
    };
    img.src = iconHref0;
  }

  /* ------------------------------------------------------------------ slips of paper */
  function place(e, size) {
    var rot = still() ? 0 : rnd(-3, 3);
    e.style.setProperty('--rot', rot.toFixed(1) + 'deg');
    if (size === 'xs') { e.style.right = '1rem'; e.style.bottom = '5rem'; return; }
    if (size === 's') { e.style.right = rnd(3, 8).toFixed(0) + 'vw'; e.style.top = rnd(18, 48).toFixed(0) + 'vh'; return; }
    if (size === 'm') { e.style.left = '50%'; e.style.top = rnd(16, 28).toFixed(0) + 'vh'; e.style.setProperty('--tx', '-50%'); return; }
    e.style.left = '50%'; e.style.top = '50%'; e.style.setProperty('--tx', '-50%'); e.style.setProperty('--ty', '-50%');
  }
  function remove(e, how) {
    if (!e || !e.parentNode) return;
    var i = live.indexOf(e);
    if (i >= 0) live.splice(i, 1);
    if (still()) { e.parentNode.removeChild(e); return; }
    e.classList.add(how || 'is-gone');
    setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); }, 650);
  }
  // {size, from, text, html, buttons:[{label, act, cls}], cls, flick, aria}
  function slip(o) {
    var e = el('os-slip os-slip--' + (o.size || 's') + (o.cls ? ' ' + o.cls : ''));
    e.setAttribute('aria-hidden', o.aria ? 'false' : 'true');
    var who = o.from ? '<span class="os-slip__who"><i class="os-slip__dot">' + esc(O.people[o.from] || o.from).charAt(0) + '</i>' + esc(O.people[o.from] || o.from) + '</span><span class="os-slip__time">' + clock() + '</span>' : '';
    var btns = (o.buttons || []).map(function (b) { return '<button class="btn btn--sm ' + (b.cls || 'btn--ghost') + '" type="button" data-act="' + b.act + '">' + esc(b.label) + '</button>'; }).join('');
    e.innerHTML = (who ? '<div class="os-slip__head">' + who + '</div>' : '') + '<div class="os-slip__body">' + (o.html || '<p class="os-slip__text">' + esc(o.text) + '</p>') + '</div>' + (btns ? '<div class="os-slip__foot">' + btns + '</div>' : '');
    place(e, o.size || 's');
    if (o.flick !== false) flickable(e, function () { dismiss(e, 'flick', o.kind); });
    e.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-act]');
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'later') dismiss(e, 'later', o.kind);
      else if (act === 'off') clockOut('slip');
      else if (o.on) o.on(act, b, e);
    });
    e.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { ev.stopPropagation(); dismiss(e, 'key', o.kind); } });
    host.appendChild(e);
    live.push(e);
    if (!still()) { void e.offsetWidth; e.classList.add('is-in'); } else e.classList.add('is-in');
    return e;
  }
  // drag a slip and let go: it skids off the desk in that direction
  function flickable(e, done) {
    var sx = 0, sy = 0, x = 0, y = 0, t0 = 0, lastX = 0, lastY = 0, lastT = 0, vx = 0, vy = 0, on = false, id = null;
    e.classList.add('os-slip--flick');
    e.addEventListener('pointerdown', function (ev) {
      if (ev.button || ev.target.closest('button, input, a')) return;
      on = true; id = ev.pointerId;
      sx = lastX = ev.clientX; sy = lastY = ev.clientY; t0 = lastT = performance.now(); x = y = vx = vy = 0;
      e.classList.add('is-held');
      try { e.setPointerCapture(id); } catch (err) {}
      ev.preventDefault();
    });
    e.addEventListener('pointermove', function (ev) {
      if (!on || ev.pointerId !== id) return;
      var now = performance.now(), dt = Math.max(1, now - lastT);
      vx = (ev.clientX - lastX) / dt; vy = (ev.clientY - lastY) / dt;
      lastX = ev.clientX; lastY = ev.clientY; lastT = now;
      x = ev.clientX - sx; y = ev.clientY - sy;
      e.style.setProperty('--dx', x + 'px');
      e.style.setProperty('--dy', y + 'px');
      e.style.setProperty('--tilt', (x / 40).toFixed(1) + 'deg');
    });
    var end = function (ev) {
      if (!on || ev.pointerId !== id) return;
      on = false;
      e.classList.remove('is-held');
      var dist = Math.hypot(x, y), speed = Math.hypot(vx, vy);
      if (dist > 110 || speed > 0.7) {
        // off the desk, the way it was thrown
        var ux = dist > 1 ? x / dist : vx / (speed || 1), uy = dist > 1 ? y / dist : vy / (speed || 1);
        var far = Math.max(innerWidth, innerHeight) * 1.3;
        var fx = x + ux * far, fy = y + uy * far;
        e.style.setProperty('--dx', fx.toFixed(0) + 'px');
        e.style.setProperty('--dy', fy.toFixed(0) + 'px');
        e.style.setProperty('--tilt', (ux * 40).toFixed(1) + 'deg');
        e.classList.add('is-flying');
        done();
      } else {
        e.style.setProperty('--dx', '0px');
        e.style.setProperty('--dy', '0px');
        e.style.setProperty('--tilt', '0deg');
      }
    };
    e.addEventListener('pointerup', end);
    e.addEventListener('pointercancel', end);
  }

  /* ------------------------------------------------------------------ the pile of ignored slips */
  var pileEl = null;
  function pile() {
    if (!pileEl) {
      pileEl = el('os-pile', '<i></i><i></i><i></i><b class="os-pile__n"></b>');
      pileEl.setAttribute('aria-hidden', 'true');
      host.appendChild(pileEl);
    }
    pileEl.title = fill(O.pile, { n: L.ignored });
    qs('.os-pile__n', pileEl).textContent = L.ignored;
    pileEl.classList.toggle('is-on', L.ignored > 0);
    pileEl.classList.remove('is-bump');
    void pileEl.offsetWidth;
    pileEl.classList.add('is-bump');
  }

  function dismiss(e, how, kind) {
    if (!e || e.getAttribute('data-done')) return;
    e.setAttribute('data-done', '1');
    S.dismissed++;
    L.ignored++;
    saveS(); saveL();
    pile();
    remove(e, how === 'flick' ? 'is-flying' : 'is-gone');
    track('onshift_incident', { kind: kind || 'ping', action: 'dismiss', how: how, level: level() });
    // they reply (level 2 and up, most of the time)
    if (level() >= 2 && kind === 'ping' && Math.random() < 0.6 && workOn()) {
      setTimeout(function () {
        if (!workOn() || paused()) return;
        var r = slip({ size: 'xs', from: pick(['dana', 'petar', 'mira']), text: pick(O.replies), kind: 'reply', flick: true });
        setTimeout(function () { remove(r); }, 3200);
      }, 1500);
    }
  }

  /* ------------------------------------------------------------------ incidents */
  function ping() {
    var lvl = level();
    var m = pick(O.pings[lvl].filter(function (x) { return x.text !== S.lastText; }));
    S.lastText = m.text;
    var size = lvl === 1 ? 's' : lvl === 2 ? (Math.random() < 0.5 ? 'm' : 'l') : 'l';
    // one half-screen slip at a time: the next one pushes the last off the desk
    if (size === 'l') live.filter(function (e) { return e.classList.contains('os-slip--l'); }).forEach(function (e) { remove(e, 'is-gone'); });
    S.unread++; L.pings++;
    slip({ size: size, from: m.from, text: m.text, kind: 'ping', buttons: [{ label: O.later, act: 'later' }, { label: O.clockOut, act: 'off', cls: 'btn--quiet' }] });
    badge();
  }

  function flicker() {
    if (still()) return ping();
    var f = el('os-flicker');
    f.setAttribute('aria-hidden', 'true');
    host.appendChild(f);
    setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 900);
  }

  function spinner() {
    if (still()) return ping();
    root.classList.add('is-os-busy');
    var e = slip({ size: 'xs', text: O.spinner, kind: 'spinner', flick: false });
    setTimeout(function () { root.classList.remove('is-os-busy'); remove(e); }, 1700);
  }

  function rere() {
    var h = qsa('main h1, main h2').filter(function (x) { var r = x.getBoundingClientRect(); return r.top > 70 && r.bottom < innerHeight - 40 && r.width > 0; })[0];
    if (!h) return ping();
    var r = h.getBoundingClientRect();
    var e = el('os-rere', esc(O.rere));
    e.setAttribute('aria-hidden', 'true');
    e.style.left = Math.max(8, r.left - 6) + 'px';
    e.style.top = Math.max(60, r.top - 22) + 'px';
    host.appendChild(e);
    setTimeout(function () { e.classList.add('is-gone'); setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); }, 500); }, 2600);
  }

  function lean() {
    if (qs('.os-lean', host)) return ping();
    var e = el('os-lean', figure('dana', 0) + '<span class="os-lean__say">' + esc(O.lean.say) + '</span>');
    e.setAttribute('aria-hidden', 'true');
    host.appendChild(e);
    void e.offsetWidth;
    e.classList.add('is-in');
    var gone = false;
    var go = function () {
      if (gone) return;
      gone = true;
      qs('.os-lean__say', e).textContent = O.lean.gone;
      e.classList.remove('is-in');
      setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); }, 700);
      window.removeEventListener('pointermove', near);
    };
    var near = function (ev) {
      var r = e.getBoundingClientRect();
      var dx = Math.max(r.left - ev.clientX, 0, ev.clientX - r.right), dy = Math.max(r.top - ev.clientY, 0, ev.clientY - r.bottom);
      if (Math.hypot(dx, dy) < 170) go();
    };
    setTimeout(function () { window.addEventListener('pointermove', near); }, 800);
    e.addEventListener('pointerdown', go);
    setTimeout(go, 9000);
  }

  function survey() {
    var row = function () { var s = ''; for (var i = 1; i <= 10; i++) s += '<button class="os-rate" type="button" data-act="rate">' + i + '</button>'; return '<div class="os-rates">' + s + '</div>'; };
    var step = 0;
    slip({
      size: 'm', from: 'hr', kind: 'survey',
      html: '<p class="os-slip__text os-slip__text--q">' + esc(O.survey.q) + '</p>' + row(),
      buttons: [{ label: O.later, act: 'later' }, { label: O.clockOut, act: 'off', cls: 'btn--quiet' }],
      on: function (act, b, e) {
        if (act !== 'rate') return;
        step++;
        var body = qs('.os-slip__body', e);
        if (step === 1) body.innerHTML = '<p class="os-slip__text os-slip__text--q">' + esc(O.survey.thanks) + '</p>' + row();
        else { body.innerHTML = '<p class="os-slip__text os-slip__text--q">' + esc(O.survey.done) + '</p>'; setTimeout(function () { dismiss(e, 'done', 'survey'); }, 1800); }
      },
    });
  }

  function timesheet() {
    var resets = 0;
    var T = O.timesheet;
    var e = slip({
      size: 'm', from: 'hr', kind: 'timesheet',
      html: '<p class="os-slip__text os-slip__text--q">' + esc(T.title) + '</p><label class="os-field"><span>' + esc(T.label) + '</span><input class="input" type="text" inputmode="decimal" autocomplete="off"></label><p class="os-slip__note" data-note></p>',
      buttons: [{ label: T.submit, act: 'submit', cls: 'btn--primary' }, { label: O.clockOut, act: 'off', cls: 'btn--quiet' }],
      on: function (act, b, e) {
        if (act !== 'submit') return;
        qs('[data-note]', e).textContent = T.done;
        setTimeout(function () { dismiss(e, 'done', 'timesheet'); }, 1800);
      },
    });
    var inp = qs('input', e);
    inp.addEventListener('input', function () {
      if (resets >= 2 || inp.value.length < 2) return;
      resets++;
      setTimeout(function () { inp.value = ''; qs('[data-note]', e).textContent = T.reset; }, 350);
    });
  }

  /* ------------------------------------------------------------------ the people, in ink */
  function figure(who, k) {
    // a head and shoulders: hair by k, eyes that blink, a mouth that moves when speaking
    var hair = ['M22 26c2-12 26-12 28 0v-2c-4-8-24-8-28 0z', 'M20 28c0-16 32-16 32 0c-4-6-10-9-16-9s-12 3-16 9z', 'M21 30c-1-18 31-18 30 0l-3-4c-6-6-18-6-24 0z', 'M24 24c6-6 18-6 24 0v6h-4c-2-6-14-6-16 0h-4z'][k % 4];
    var specs = k % 3 === 1 ? '<circle cx="29" cy="35" r="5.5"/><circle cx="43" cy="35" r="5.5"/><path d="M34.5 35h3"/>' : '';
    return '<svg class="os-fig os-fig--' + k + '" viewBox="0 0 72 72" aria-hidden="true"><path class="os-fig__body" d="M8 72c2-16 12-22 28-22s26 6 28 22z"/><circle class="os-fig__head" cx="36" cy="36" r="17"/><path class="os-fig__hair" d="' + hair + '"/><g class="os-fig__eyes"><ellipse class="os-eye" cx="29" cy="35" rx="2" ry="2.4"/><ellipse class="os-eye" cx="43" cy="35" rx="2" ry="2.4"/></g>' + specs + '<path class="os-mouth" d="M31 45q5 3 10 0"/></svg>';
  }

  /* ------------------------------------------------------------------ the meeting */
  var M = O.meeting;
  function meeting(opts) {
    opts = opts || {};
    if (modal) return;
    if (opts.deck || opts.force) return call(opts);
    var n = 5;
    var e = slip({
      size: 'm', from: 'dana', kind: 'invite', flick: false,
      html: '<p class="os-slip__text os-slip__text--q">' + esc(M.invite) + '</p><p class="os-slip__note" data-count>' + esc(fill(M.startingIn, { n: n })) + '</p>',
      buttons: [{ label: M.decline, act: 'decline' }, { label: M.join, act: 'join', cls: 'btn--primary' }],
      on: function (act) {
        clearInterval(tm);
        if (act === 'join') { remove(e); call({}); return; }
        if (act === 'decline') {
          remove(e);
          S.declined++;
          S.forced = S.t + Math.round(rnd(60, 90));
          saveS();
          var r = slip({ size: 's', from: 'dana', text: M.rescheduled, kind: 'resched', flick: true });
          setTimeout(function () { remove(r); }, 4000);
          track('onshift_meeting', { action: 'decline' });
        }
      },
    });
    var tm = setInterval(function () {
      n--;
      var c = qs('[data-count]', e);
      if (c) c.textContent = fill(M.startingIn, { n: Math.max(0, n) });
      if (n <= 0) { clearInterval(tm); if (e.parentNode) { remove(e); call({}); } }
    }, 1000);
  }

  function call(opts) {
    var people = ['dana', 'petar', 'mira'];
    var c = el('os-call' + (opts.deck ? ' os-call--deck' : ''));
    c.setAttribute('role', 'dialog');
    c.setAttribute('aria-modal', 'true');
    c.setAttribute('aria-label', M.title);
    var tiles = people.map(function (p, k) {
      return '<div class="os-tile os-tile--' + k + '" data-tile="' + p + '">' + figure(p, k) + '<span class="os-tile__name">' + esc(O.people[p]) + '</span></div>';
    }).join('') + '<div class="os-tile os-tile--you"><span class="os-tile__off">' + esc(M.cameraOff) + '</span><span class="os-tile__name">' + esc(M.you) + ' · ' + esc(M.muted) + '</span></div>';
    c.innerHTML =
      '<div class="os-call__top"><span class="os-call__title">' + esc(M.title) + '</span><span class="os-call__rec"></span><span class="os-call__time" data-time>00:00</span></div>' +
      '<div class="os-call__stage"><div class="os-call__grid">' + tiles + '</div><div class="os-share" data-share hidden></div></div>' +
      '<p class="os-call__cap" data-cap aria-live="off">' + esc(M.joining) + '</p>' +
      '<div class="os-call__bar"><button class="btn btn--ghost btn--sm" type="button" data-act="mute">' + esc(M.mute) + '</button><button class="btn btn--ghost btn--sm" type="button" data-act="share">' + esc(M.share) + '</button><button class="btn btn--sm os-call__leave" type="button" data-act="leave">' + esc(M.leave) + '</button></div>' +
      '<div class="os-call__sure" data-sure hidden><p>' + esc(M.leaveSure) + '</p><div class="cta-row"><button class="btn btn--ghost btn--sm" type="button" data-act="stay">' + esc(M.stay) + '</button><button class="btn btn--primary btn--sm" type="button" data-act="leave-anyway">' + esc(M.leaveAnyway) + '</button></div></div>';
    var veil = el('os-veil');
    veil.setAttribute('aria-hidden', 'true');
    host.appendChild(veil);
    host.appendChild(c);
    modal = { el: c, veil: veil, kind: 'call', timers: [] };
    void c.offsetWidth;
    c.classList.add('is-in');
    S.meetAt = S.t;
    S.unread++;
    saveS();
    badge();
    track('onshift_meeting', { action: opts.deck ? 'deck' : opts.force ? 'forced' : 'join', level: level() });
    var t0 = performance.now();
    var tmr = setInterval(function () {
      var s = Math.round((performance.now() - t0) / 1000);
      var te = qs('[data-time]', c);
      if (te) te.textContent = pad(Math.floor(s / 60)) + ':' + pad(s % 60);
    }, 1000);
    modal.timers.push(tmr);
    // someone speaks every few seconds; the captions follow
    var cap = qs('[data-cap]', c), capI = -1;
    var talk = function () {
      qsa('.os-tile', c).forEach(function (t) { t.classList.remove('is-speaking'); });
      var who = qsa('.os-tile[data-tile]', c)[Math.floor(Math.random() * 3)];
      if (who) who.classList.add('is-speaking');
      capI = (capI + 1 + Math.floor(Math.random() * 2)) % M.captions.length;
      if (cap) cap.textContent = M.captions[capI];
      modal.timers.push(setTimeout(talk, rnd(2400, 4200)));
    };
    modal.timers.push(setTimeout(talk, 1200));
    // the screen share: a chart nobody can read, or (the gauntlet) Dana's deck
    var share = qs('[data-share]', c);
    if (!opts.deck) modal.timers.push(setTimeout(function () {
      share.hidden = false;
      share.innerHTML = '<p class="os-share__who">' + esc(fill(M.sharing, { name: O.people.dana })) + '</p>' + chart();
      c.classList.add('is-sharing');
    }, 6000));
    c.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-act]');
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'mute') toast(M.muteNote);
      else if (act === 'share') toast(M.shareNote);
      else if (act === 'leave') { qs('[data-sure]', c).hidden = false; qs('[data-act="stay"]', c).focus(); }
      else if (act === 'stay') qs('[data-sure]', c).hidden = true;
      else if (act === 'leave-anyway') { endCall(); toast(M.left); track('onshift_meeting', { action: 'leave' }); }
      else if (act === 'off') clockOut('call');
      else if (opts.on) opts.on(act, b, c);
    });
    c.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { ev.stopPropagation(); qs('[data-sure]', c).hidden = false; } });
    setTimeout(function () { var l = qs('[data-act="leave"]', c); if (l) try { l.focus({ preventScroll: true }); } catch (e) {} }, 60);
    // a call without a deck wraps itself up eventually
    if (!opts.deck) modal.timers.push(setTimeout(function () { if (cap) cap.textContent = M.captions[3]; setTimeout(endCall, 2500); }, 95000));
  }
  function chart() {
    var bars = '';
    for (var i = 0; i < 7; i++) bars += '<rect x="' + (14 + i * 26) + '" y="' + (70 - rnd(10, 60)).toFixed(0) + '" width="16" height="' + rnd(10, 60).toFixed(0) + '"/>';
    return '<svg class="os-chart" viewBox="0 0 200 90" aria-hidden="true"><path d="M10 80h180M10 80V8"/>' + bars + '<path class="os-chart__line" d="M14 60c20-30 40 10 60-20s40 30 60-10 30-20 52 6"/></svg>';
  }
  function endCall() {
    if (!modal || modal.kind !== 'call') return;
    closeModal();
  }
  function closeModal() {
    if (!modal) return;
    var m = modal;
    modal = null;
    if (m.cleanup) m.cleanup();
    m.timers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
    m.el.classList.remove('is-in');
    m.veil.classList.add('is-gone');
    setTimeout(function () {
      if (m.el.parentNode) m.el.parentNode.removeChild(m.el);
      if (m.veil.parentNode) m.veil.parentNode.removeChild(m.veil);
    }, still() ? 0 : 450);
  }

  /* ------------------------------------------------------------------ Finance's offer, and the gauntlet */
  var OT = O.overtime;
  var hasReward = !!(O.reward && O.reward.percent && OT && qs('[data-os-claim]', host));
  function offer() {
    var e = slip({
      size: 'm', from: OT.offer.from, kind: 'offer', cls: 'os-slip--envelope', flick: false,
      text: OT.offer.text,
      buttons: [{ label: OT.offer.later, act: 'later' }, { label: OT.offer.go, act: 'go', cls: 'btn--primary' }],
      on: function (act) { if (act === 'go') { remove(e); gauntlet(1); } },
    });
    S.offerAt = S.t + 120;
    saveS();
    track('overtime_stage', { stage: 0, action: 'offer' });
  }

  var hudEl = null;
  function hud() {
    if (!hudEl) {
      hudEl = el('os-hud', '<span class="os-hud__title">' + esc(OT.hud) + '</span><span class="os-hud__stamps" aria-label="' + esc(OT.stamps) + '"><i></i><i></i><i></i><i></i></span><button class="text-btn os-hud__quit" type="button" data-act="quit">' + esc(OT.giveUp) + '</button>');
      hudEl.addEventListener('click', function (ev) { if (ev.target.closest('[data-act="quit"]')) giveUp(); });
      host.appendChild(hudEl);
      void hudEl.offsetWidth;
      hudEl.classList.add('is-in');
    }
    qsa('.os-hud__stamps i', hudEl).forEach(function (i, k) { i.classList.toggle('is-on', k < S.stamps); });
  }
  function giveUp() {
    S.stage = 0;
    S.stamps = 0;
    S.offerAt = S.t + 120;
    saveS();
    closeModal();
    if (hudEl) { hudEl.classList.remove('is-in'); var h = hudEl; hudEl = null; setTimeout(function () { if (h.parentNode) h.parentNode.removeChild(h); }, 400); }
    toast(OT.gaveUp);
    track('overtime_stage', { stage: S.stage, action: 'give_up' });
  }
  function gauntlet(stage) {
    if (!hasReward) return;
    S.stage = stage;
    saveS();
    hud();
    if (stage === 1) stagePrinter();
    else if (stage === 2) stageApprove();
    else if (stage === 3) stageDeck();
    else if (stage === 4) stageCatch();
    else claim();
  }
  function stamped(n, line) {
    S.stamps = n;
    S.stage = n + 1;
    saveS();
    hud();
    toast(line);
    track('overtime_stage', { stage: n, action: 'done' });
    setTimeout(function () { if (workOn()) gauntlet(n + 1); }, 1600);
  }
  // a stage sits in a card in the middle, over a veil (the page waits)
  function stageCard(cls, html) {
    var c = el('os-stage ' + cls, html);
    c.setAttribute('role', 'dialog');
    c.setAttribute('aria-modal', 'true');
    var veil = el('os-veil');
    veil.setAttribute('aria-hidden', 'true');
    host.appendChild(veil);
    host.appendChild(c);
    modal = { el: c, veil: veil, kind: 'stage', timers: [] };
    void c.offsetWidth;
    c.classList.add('is-in');
    return c;
  }

  // 1. the printer: shake the jammed sheet (drag it back and forth), then harder for the toner
  function stagePrinter() {
    var P = OT.stages.printer;
    var c = stageCard('os-stage--printer', '<p class="os-stage__k">' + esc(OT.hud) + ' · 1/4</p><h2 class="os-stage__title">' + esc(P.title) + '</h2><p class="os-stage__how" data-how>' + esc(coarse ? P.how : P.how + ' ' + P.howKeys) + '</p><div class="os-printer"><div class="os-printer__slot"></div><div class="os-paper" data-os-paper tabindex="0"><span>' + esc(O.people.finance) + '</span></div></div><p class="os-stage__meter"><i data-os-meter></i></p>');
    var paper = qs('[data-os-paper]', c), meter = qs('[data-os-meter]', c), how = qs('[data-how]', c);
    var phase = 1, need = 6, flips = [], lastSign = 0, on = false, id = null, sx = 0, lastX = 0, printed = false;
    var count = function (sign) {
      if (printed) return;
      var now = performance.now();
      if (sign !== lastSign && lastSign !== 0) flips.push(now);
      lastSign = sign;
      flips = flips.filter(function (t) { return now - t < 3200; });
      meter.style.width = Math.min(100, (flips.length / need) * 100) + '%';
      c.classList.add('is-shaking');
      clearTimeout(count.t);
      count.t = setTimeout(function () { c.classList.remove('is-shaking'); }, 300);
      if (flips.length >= need) {
        flips = [];
        meter.style.width = '0%';
        if (phase === 1) { phase = 2; need = 8; how.textContent = P.toner; c.classList.add('is-toner'); }
        else { printed = true; closeModal(); stamped(1, P.done); }
      }
    };
    paper.addEventListener('pointerdown', function (ev) { on = true; id = ev.pointerId; sx = lastX = ev.clientX; try { paper.setPointerCapture(id); } catch (e) {} ev.preventDefault(); });
    paper.addEventListener('pointermove', function (ev) {
      if (!on || ev.pointerId !== id) return;
      var dx = ev.clientX - lastX;
      if (Math.abs(dx) > 8) { count(dx > 0 ? 1 : -1); lastX = ev.clientX; }
      paper.style.setProperty('--dx', Math.max(-80, Math.min(80, ev.clientX - sx)) + 'px');
    });
    var up = function (ev) { if (ev.pointerId !== id) return; on = false; paper.style.setProperty('--dx', '0px'); };
    paper.addEventListener('pointerup', up);
    paper.addEventListener('pointercancel', up);
    paper.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowLeft') { count(-1); ev.preventDefault(); }
      else if (ev.key === 'ArrowRight') { count(1); ev.preventDefault(); }
    });
    setTimeout(function () { try { paper.focus({ preventScroll: true }); } catch (e) {} }, 80);
  }

  // 2. hold to approve: ten seconds, while pings land on the button
  function stageApprove() {
    var A = OT.stages.approve;
    var c = stageCard('os-stage--approve', '<p class="os-stage__k">' + esc(OT.hud) + ' · 2/4</p><h2 class="os-stage__title">' + esc(A.title) + '</h2><p class="os-stage__how" data-how>' + esc(coarse ? A.how : A.how + ' ' + A.howKeys) + '</p><div class="os-hold"><button class="os-hold__btn" type="button" data-hold><span data-sec>10</span></button><div class="os-hold__covers" data-covers></div></div>');
    var btn = qs('[data-hold]', c), sec = qs('[data-sec]', c), covers = qs('[data-covers]', c), how = qs('[data-how]', c);
    var t0 = 0, raf = 0, held = false, id = null, coverT = 0, done = false;
    var frame = function () {
      if (!held) return;
      var s = (performance.now() - t0) / 1000;
      btn.style.setProperty('--p', Math.min(1, s / 10).toFixed(3));
      sec.textContent = Math.max(0, Math.ceil(10 - s));
      if (s >= 10 && !done) { done = true; held = false; clearInterval(coverT); btn.classList.add('is-done'); setTimeout(function () { closeModal(); stamped(2, A.done); }, 500); return; }
      raf = requestAnimationFrame(frame);
    };
    var start = function () {
      if (held || done) return;
      held = true; t0 = performance.now();
      btn.classList.add('is-held');
      how.textContent = coarse ? A.how : A.how + ' ' + A.howKeys;
      raf = requestAnimationFrame(frame);
      coverT = setInterval(function () {
        if (!held) return;
        var cv = el('os-cover', esc(pick(A.covers)));
        cv.style.setProperty('--x', rnd(-70, 70).toFixed(0) + 'px');
        cv.style.setProperty('--y', rnd(-50, 50).toFixed(0) + 'px');
        cv.style.setProperty('--rot', rnd(-14, 14).toFixed(0) + 'deg');
        covers.appendChild(cv);
        if (covers.children.length > 9) covers.removeChild(covers.firstChild);
      }, 1300);
    };
    var stop = function () {
      if (!held || done) return;
      held = false;
      cancelAnimationFrame(raf);
      clearInterval(coverT);
      btn.classList.remove('is-held');
      btn.style.setProperty('--p', '0');
      sec.textContent = '10';
      covers.innerHTML = '';
      how.textContent = A.reset;
    };
    btn.addEventListener('pointerdown', function (ev) { id = ev.pointerId; try { btn.setPointerCapture(id); } catch (e) {} start(); ev.preventDefault(); });
    btn.addEventListener('pointerup', stop);
    btn.addEventListener('pointercancel', stop);
    btn.addEventListener('lostpointercapture', stop);
    btn.addEventListener('keydown', function (ev) { if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); start(); } });
    btn.addEventListener('keyup', function (ev) { if (ev.key === ' ' || ev.key === 'Enter') stop(); });
    btn.addEventListener('click', function (ev) { ev.preventDefault(); });
    setTimeout(function () { try { btn.focus({ preventScroll: true }); } catch (e) {} }, 80);
  }

  // 3. Dana's deck: the stamp is on the last slide; the connection drops now and then
  function stageDeck() {
    var D = OT.stages.deck;
    var n = M.slides.length;
    var i = 0, clicks = 0, lost = false, stamped3 = false;
    meeting({
      deck: true,
      done: function () {},
      on: function (act, b, c) {
        if (act === 'next') {
          if (lost) return;
          clicks++;
          if (clicks % 5 === 0 && i < n - 2) {
            lost = true;
            c.classList.add('is-lost');
            qs('[data-cap]', c).textContent = M.lost;
            modal.timers.push(setTimeout(function () { lost = false; c.classList.remove('is-lost'); i = Math.max(0, i - 2); render(c); }, 1800));
            return;
          }
          i = Math.min(n - 1, i + 1);
          render(c);
        } else if (act === 'stamp' && !stamped3) {
          stamped3 = true;
          closeModal();
          stamped(3, D.done);
        }
      },
    });
    function render(c) {
      var share = qs('[data-share]', c);
      share.hidden = false;
      c.classList.add('is-sharing');
      var last = i === n - 1;
      share.innerHTML = '<p class="os-share__who">' + esc(fill(M.sharing, { name: O.people.dana })) + ' · ' + esc(fill(M.slideOf, { i: i + 1, n: n })) + '</p>' +
        '<div class="os-slide"><p class="os-slide__title">' + esc(M.slides[i]) + '</p>' + (last ? '<button class="os-stamp os-stamp--btn" type="button" data-act="stamp">' + esc(D.stamp) + '</button>' : '<div class="os-slide__lines"><i></i><i></i><i></i></div>' + (i % 3 === 2 ? chart() : '')) + '</div>' +
        (last ? '' : '<button class="btn btn--primary btn--sm os-share__next" type="button" data-act="next">' + esc(M.next) + '</button>');
    }
    // the meeting is built on the next tick; dress it then
    setTimeout(function () {
      if (!modal || modal.kind !== 'call') return;
      var c = modal.el;
      var k = el('os-stage__k os-call__k', esc(OT.hud) + ' · 3/4 · ' + esc(D.title) + '. ' + esc(fill(D.how, { n: n })));
      c.insertBefore(k, c.firstChild);
      render(c);
    }, 50);
  }

  // 4. the code runs from the pointer: corner it (or tap it until it gives up)
  function stageCatch() {
    var K = OT.stages.catch;
    var c = stageCard('os-stage--catch', '<p class="os-stage__k">' + esc(OT.hud) + ' · 4/4</p><h2 class="os-stage__title">' + esc(K.title) + '</h2><p class="os-stage__how" data-how>' + esc(coarse ? K.howTouch : K.how + ' ' + K.howKeys) + '</p>');
    c.classList.add('is-open');
    var e = el('os-runner', '<span>' + esc(O.overtime.claim.stamp) + '</span>');
    e.setAttribute('tabindex', '0');
    e.setAttribute('role', 'button');
    host.appendChild(e);
    var W = function () { return innerWidth; }, H = function () { return innerHeight; };
    var w = 180, h = 64;
    var x = W() * 0.6, y = H() * 0.55, tired = false, caught = false, jumps = 0, cornerSince = 0, presses = 0, raf = 0;
    var px = -1, py = -1;
    var put = function () { e.style.transform = 'translate(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px)'; };
    var size = function () { var r = e.getBoundingClientRect(); w = r.width || w; h = r.height || h; };
    var finish = function () {
      if (caught) return;
      caught = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      e.classList.add('is-caught');
      setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); closeModal(); stamped(4, K.done); }, 500);
    };
    var giveIn = function () { if (tired) return; tired = true; e.classList.add('is-tired'); e.innerHTML = '<span>' + esc(K.tired) + '</span>'; };
    var move = function (ev) { px = ev.clientX; py = ev.clientY; };
    var frame = function (now) {
      raf = requestAnimationFrame(frame);
      if (tired || caught || coarse) return;
      if (px < 0) return;
      var cx = x + w / 2, cy = y + h / 2;
      var dx = cx - px, dy = cy - py, d = Math.hypot(dx, dy);
      var minX = 8, minY = 70, maxX = W() - w - 8, maxY = H() - h - 8;
      if (d < 230) {
        var sp = Math.min(16, (230 - d) * 0.14 + 3);
        x += (dx / (d || 1)) * sp; y += (dy / (d || 1)) * sp;
        // slide along the edge instead of sticking to it
        if (x <= minX || x >= maxX) y += (dy >= 0 ? 1 : -1) * sp * 0.6;
        if (y <= minY || y >= maxY) x += (dx >= 0 ? 1 : -1) * sp * 0.6;
      }
      x = Math.max(minX, Math.min(maxX, x)); y = Math.max(minY, Math.min(maxY, y));
      var inCorner = (x <= minX + 1 || x >= maxX - 1) && (y <= minY + 1 || y >= maxY - 1);
      if (inCorner && d < 190) { if (!cornerSince) cornerSince = now; else if (now - cornerSince > 700) giveIn(); }
      else cornerSince = 0;
      put();
    };
    e.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      if (tired) return finish();
      if (coarse) {
        jumps++;
        if (jumps >= 5) return giveIn();
        x = rnd(8, W() - w - 8); y = rnd(80, H() - h - 8);
        e.classList.remove('is-jump'); void e.offsetWidth; e.classList.add('is-jump');
        put();
      }
    });
    e.addEventListener('click', function () { if (tired) finish(); });
    e.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      if (tired) return finish();
      presses++;
      if (presses >= 5) giveIn();
      else { x = rnd(8, W() - w - 8); y = rnd(80, H() - h - 8); put(); }
    });
    window.addEventListener('pointermove', move);
    size();
    put();
    raf = requestAnimationFrame(frame);
    modal.cleanup = function () { cancelAnimationFrame(raf); window.removeEventListener('pointermove', move); if (e.parentNode) e.parentNode.removeChild(e); };
    setTimeout(function () { try { e.focus({ preventScroll: true }); } catch (err) {} }, 120);
  }

  function claim() {
    var box = qs('[data-os-claim]', host);
    if (!box) return;
    var veil = el('os-veil');
    veil.setAttribute('aria-hidden', 'true');
    host.appendChild(veil);
    box.hidden = false;
    modal = { el: box, veil: veil, kind: 'claim', timers: [] };
    void box.offsetWidth;
    box.classList.add('is-in');
    S.stage = 5;
    saveS();
    if (hudEl) { var h = hudEl; hudEl = null; h.classList.remove('is-in'); setTimeout(function () { if (h.parentNode) h.parentNode.removeChild(h); }, 400); }
    track('overtime_stage', { stage: 5, action: 'claim' });
    setTimeout(function () { try { qs('#os-claim-title', box).focus({ preventScroll: true }); } catch (e) {} }, 60);
  }
  var claimBox = qs('[data-os-claim]', host);
  if (claimBox) {
    qs('[data-os-clockout]', claimBox).addEventListener('click', function () { clockOut('claim'); });
    claimBox.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') ev.stopPropagation(); });
  }
  // the email left: the code is theirs, Finance stops asking
  window.addEventListener('es:reward', function (e) {
    if (!(e.detail && O.reward && e.detail.reward === O.reward.tag)) return;
    L.overtime = new Date().toISOString();
    S.stage = 0;
    saveL(); saveS();
    track('overtime_stage', { stage: 5, action: 'claimed' });
  });

  /* ------------------------------------------------------------------ the way out */
  function clockOut(from) {
    track('onshift_incident', { kind: 'clockout', action: 'switch', from: from, level: level() });
    if (ES.shift && !ES.shift.isOff()) ES.shift.set(true, { source: 'onshift' });
    else off();
  }
  function off() {
    // everything on the desk goes into the drawer
    live.slice().forEach(function (e) { remove(e, 'is-drawer'); });
    live = [];
    if (modal && modal.kind === 'claim') { var m = modal; modal = null; m.el.classList.remove('is-in'); m.el.hidden = true; if (m.veil.parentNode) m.veil.parentNode.removeChild(m.veil); }
    else if (modal) closeModal();
    qsa('.os-lean, .os-rere, .os-flicker, .os-runner', host).forEach(function (e) { if (e.parentNode) e.parentNode.removeChild(e); });
    if (hudEl) { var h = hudEl; hudEl = null; h.classList.remove('is-in'); setTimeout(function () { if (h.parentNode) h.parentNode.removeChild(h); }, 400); }
    root.classList.remove('is-os-busy');
    L.survived += S.unread;
    S.unread = 0;
    S.stage = 0;
    saveS(); saveL();
    badge();
    if (pileEl) pileEl.classList.remove('is-on');
    if (S.shown > 0 || L.ignored > 0) toast(O.off.line + (L.ignored ? ' ' + fill(O.off.stat, { n: L.ignored }) : ''));
  }
  window.addEventListener('es:shift', function (e) {
    if (e.detail && e.detail.off) off();
    else badge();
  });

  /* ------------------------------------------------------------------ the clock that decides */
  var KINDS = { ping: ping, meeting: meeting, lean: lean, flicker: flicker, rere: rere, spinner: spinner, survey: survey, timesheet: timesheet, offer: offer };
  function fire(kindWanted) {
    var lvl = level();
    var kind = kindWanted;
    if (!kind) {
      if (hasReward && !L.overtime && lvl === 3 && S.stage === 0 && S.t >= S.offerAt && (S.dismissed >= 6 || S.t >= 200)) kind = 'offer';
      else if (S.forced && S.t >= S.forced) { S.forced = 0; return call({ force: true }); }
      else {
        var pool = lvl === 1 ? ['ping'] : lvl === 2 ? ['ping', 'ping', 'meeting', 'lean', 'flicker', 'ping'] : ['ping', 'ping', 'meeting', 'lean', 'flicker', 'rere', 'spinner', 'survey', 'timesheet', 'ping'];
        if (S.t - S.meetAt < 120 || S.declined) pool = pool.filter(function (k) { return k !== 'meeting'; });
        if (live.length >= 3) pool = pool.filter(function (k) { return k !== 'ping'; }).concat(['lean', 'flicker']);
        kind = pick(pool, S.last === 'ping' && lvl > 1 ? null : S.last);
      }
    }
    S.last = kind;
    S.shown++;
    shownHere++;
    saveS();
    track('onshift_incident', { kind: kind, action: 'show', level: lvl, t: S.t });
    KINDS[kind]();
    saveL();
  }
  function gap() {
    var lvl = level();
    return Math.round(lvl === 1 ? rnd(30, 42) : lvl === 2 ? rnd(22, 32) : rnd(15, 24));
  }
  function tick() {
    if (!workOn() || paused()) return;
    S.t++;
    if (S.t % 5 === 0) saveS();
    if (modal || shownHere >= 8) return;
    if (S.t >= S.next) {
      fire();
      S.next = S.t + gap();
      saveS();
    }
  }
  function begin() {
    host.hidden = false;
    setInterval(tick, 1000);
    badge();
    if (L.ignored) pile();
    // a gauntlet left mid-way comes back where it was
    if (S.stage > 0 && hasReward && !L.overtime) setTimeout(function () { if (workOn() && !paused()) gauntlet(S.stage); }, 2500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin);
  else begin();

  // for testing: ES.onshift.fire('meeting'), .level(), .gauntlet(2), .state()
  ES.onshift = {
    fire: function (k) { if (KINDS[k] || k === 'call') (k === 'call' ? call({ force: true }) : fire(k)); },
    gauntlet: function (n) { gauntlet(n || 1); },
    level: level,
    state: function () { return { S: S, L: L, live: live.length, modal: modal ? modal.kind : null, paused: paused() }; },
    jump: function (t, next) { S.t = t; S.next = next == null ? t : next; saveS(); },
  };
})();
