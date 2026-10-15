/* ENDSHIFT "Still on shift". What work mode does while it's on: the shift that won't end.
   Messages slide in as slips of paper, too big to ignore (flick them away; they come back; answer
   them and they answer back), emails arrive and can be replied to (the reply goes nowhere, the
   follow-up comes anyway), surveys with real questions take longer than they say, a meeting
   invites itself and then just starts (ink faces that nod, freeze, drop their camera and react),
   someone leans in at the edge, IT connects to your session, the tab's title counts the unread.
   The longer it stays on, the more absurd it gets. The switch in the header is the only way out:
   nothing here offers a shortcut. At the absurd end Finance approves a 50% code that has to be
   collected the hard way: the Overtime gauntlet (unjam the printer, hold to approve while pings
   land on the button, sit through Dana's deck, corner the code).

   Rules: nothing for the first twenty seconds; nothing in low-stim mode, in the ritual, in the
   game, while the film plays by itself, during the opening, while you type elsewhere, with the
   menu open, or while a form (survey, reply, policy) is open. Slips never cover the header.
   Reduced motion: things appear and go without moving.
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
  var lines = function (s) { return esc(s).replace(/\n/g, '<br>'); };
  var el = function (cls, html, tag) {
    var e = document.createElement(tag || 'div');
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  };
  var rm = function (e) { if (e && e.parentNode) e.parentNode.removeChild(e); };
  var name = function (who) { return O.people[who] || who; };

  /* ------------------------------------------------------------------ state */
  function load(st, key, def) {
    try { var v = JSON.parse(st.getItem(key) || 'null'); if (v && typeof v === 'object') return Object.assign({}, def, v); } catch (e) {}
    return Object.assign({}, def);
  }
  function save(st, key, v) { try { st.setItem(key, JSON.stringify(v)); } catch (e) {} }
  var SKEY = 'es:onshift-visit', LKEY = 'es:onshift';
  // this visit: seconds endured with work on, when the next thing comes, what's been shown
  var S = load(sessionStorage, SKEY, { t: 0, next: 20, shown: 0, dismissed: 0, unread: 0, last: '', lastText: '', meetAt: 0, forced: 0, declined: 0, offerAt: 0, stage: 0, stamps: 0, seen: {}, surveys: [], mails: [], upd: 0, cb: 0 });
  // this device: the running count, and whether the code was collected
  var L = load(localStorage, LKEY, { pings: 0, ignored: 0, survived: 0, overtime: null, answered: 0, surveys: 0, sent: 0 });
  var saveS = function () { save(sessionStorage, SKEY, S); };
  var saveL = function () { save(localStorage, LKEY, L); };
  var CAP = 14; // incidents per page load (a cap, so a long read isn't a storm)
  var shownHere = 0;
  var live = []; // slips on screen
  var modal = null; // the meeting, a gauntlet stage, the update screen or the claim: one at a time
  var pend = []; // timers for things that come later (cleared when the shift ends)
  function later(ms, fn) { var t = setTimeout(function () { var i = pend.indexOf(t); if (i >= 0) pend.splice(i, 1); fn(); }, ms); pend.push(t); return t; }

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
  function formOpen() { return live.some(function (e) { return e.hasAttribute('data-keep'); }); }
  function level() { return S.t >= 120 || S.dismissed >= 4 ? 3 : S.t >= 45 || S.dismissed >= 2 ? 2 : 1; }

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
  function unread(n) { S.unread = Math.max(0, S.unread + n); saveS(); badge(); }

  /* ------------------------------------------------------------------ slips of paper */
  function place(e, size) {
    var rot = still() ? 0 : rnd(-3, 3);
    e.style.setProperty('--rot', rot.toFixed(1) + 'deg');
    if (size === 'xs') { e.style.right = '1rem'; e.style.bottom = '5rem'; return; }
    if (size === 's') { e.style.right = rnd(3, 8).toFixed(0) + 'vw'; e.style.top = rnd(18, 48).toFixed(0) + 'vh'; return; }
    if (size === 'm') { e.style.left = '50%'; e.style.top = rnd(16, 28).toFixed(0) + 'vh'; e.style.setProperty('--tx', '-50%'); return; }
    // a form sits in the middle of what's under the header, straighter than a note
    if (size === 'f') e.style.setProperty('--rot', (rot / 3).toFixed(1) + 'deg');
    e.style.left = '50%'; e.style.top = size === 'f' ? 'calc(50% + var(--header-h) / 2)' : '50%'; e.style.setProperty('--tx', '-50%'); e.style.setProperty('--ty', '-50%');
  }
  function remove(e, how) {
    if (!e || !e.parentNode) return;
    var i = live.indexOf(e);
    if (i >= 0) live.splice(i, 1);
    if (still()) { rm(e); return; }
    e.classList.add(how || 'is-gone');
    setTimeout(function () { rm(e); }, 650);
  }
  // {size: xs|s|m|l|f, from, text, html, buttons:[{label, act, cls}], cls, flick, aria, keep, chat, onChat, on}
  function slip(o) {
    var e = el('os-slip os-slip--' + (o.size || 's') + (o.cls ? ' ' + o.cls : ''));
    e.setAttribute('aria-hidden', o.aria ? 'false' : 'true');
    if (o.keep) e.setAttribute('data-keep', '1');
    var who = o.from ? '<span class="os-slip__who"><i class="os-slip__dot">' + esc(name(o.from)).charAt(0) + '</i>' + esc(name(o.from)) + '</span><span class="os-slip__time">' + clock() + '</span>' : '';
    var btns = (o.buttons || []).map(function (b) { return '<button class="btn btn--sm ' + (b.cls || 'btn--ghost') + '" type="button" data-act="' + b.act + '">' + esc(b.label) + '</button>'; }).join('');
    e.innerHTML = (who ? '<div class="os-slip__head">' + who + '</div>' : '') + '<div class="os-slip__body">' + (o.html || '<p class="os-slip__text">' + esc(o.text) + '</p>') + '</div>' + (btns ? '<div class="os-slip__foot">' + btns + '</div>' : '');
    if (o.chat) {
      var f = el('os-chat', '<input class="os-chat__in" type="text" placeholder="' + esc(O.chat.placeholder) + '" autocomplete="off" aria-label="' + esc(O.chat.placeholder) + '"><button class="btn btn--sm btn--primary" type="submit">' + esc(O.chat.send) + '</button>', 'form');
      f.setAttribute('data-chat', '');
      e.insertBefore(f, qs('.os-slip__foot', e));
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var inp = qs('input', f), v = inp.value.trim();
        if (!v) return;
        inp.value = '';
        thread(e, o.chat, v, f);
      });
    }
    place(e, o.size || 's');
    if (o.flick !== false) flickable(e, function () { dismiss(e, 'flick', o.kind); });
    e.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-act]');
      if (!b || b.disabled) return;
      var act = b.getAttribute('data-act');
      if (act === 'later') dismiss(e, 'later', o.kind);
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
    var sx = 0, sy = 0, x = 0, y = 0, lastX = 0, lastY = 0, lastT = 0, vx = 0, vy = 0, on = false, id = null;
    e.classList.add('os-slip--flick');
    e.addEventListener('pointerdown', function (ev) {
      if (ev.button || ev.target.closest('button, input, textarea, label, select, a')) return;
      on = true; id = ev.pointerId;
      sx = lastX = ev.clientX; sy = lastY = ev.clientY; lastT = performance.now(); x = y = vx = vy = 0;
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
        e.style.setProperty('--dx', (x + ux * far).toFixed(0) + 'px');
        e.style.setProperty('--dy', (y + uy * far).toFixed(0) + 'px');
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
  // a line under the message (the outcome of what you pressed), and no more buttons
  function noteOf(e) {
    var n = qs('.os-slip__note', e);
    if (!n) { n = el('os-slip__note', '', 'p'); qs('.os-slip__body', e).appendChild(n); }
    return n;
  }
  function settle(e, kind, line, ms) {
    noteOf(e).textContent = line;
    qsa('.os-slip__foot, [data-chat]', e).forEach(function (x) { x.hidden = true; });
    qsa('.os-slip__body button', e).forEach(function (b) { b.disabled = true; });
    later(ms || 1700, function () { finish(e, kind); });
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

  // ignored: flicked, "Later", Escape
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
      later(1500, function () {
        if (!workOn() || paused()) return;
        var r = slip({ size: 'xs', from: pick(['dana', 'petar', 'mira']), text: pick(O.replies), kind: 'reply', flick: true });
        later(3200, function () { remove(r); });
      });
    }
  }
  // dealt with: answered, submitted, approved, signed
  function finish(e, kind, how) {
    if (!e || e.getAttribute('data-done')) return;
    e.setAttribute('data-done', '1');
    L.answered++;
    saveL();
    unread(-1);
    remove(e, 'is-gone');
    track('onshift_incident', { kind: kind, action: 'done', how: how || 'done', level: level() });
  }

  /* ------------------------------------------------------------------ chat: the slip answers back */
  function thread(e, from, text, f) {
    var body = qs('.os-slip__body', e), n = +(e.getAttribute('data-x') || 0) + 1;
    e.setAttribute('data-x', n);
    e.classList.add('is-thread');
    body.appendChild(el('os-slip__you', esc(text) + '<small class="os-slip__seen">' + esc(O.chat.seen) + '</small>', 'p'));
    var tp = el('os-slip__typing', esc(fill(O.chat.typing, { name: name(from) })), 'p');
    body.appendChild(tp);
    body.scrollTop = body.scrollHeight;
    unread(-1);
    L.answered++;
    saveL();
    track('onshift_incident', { kind: 'ping', action: 'reply', n: n, level: level() });
    later(rnd(1200, 2200), function () {
      if (!e.parentNode) return;
      tp.className = 'os-slip__text os-slip__text--re';
      tp.textContent = n >= 2 ? pick(O.chat.end) : pick(O.replies);
      body.scrollTop = body.scrollHeight;
      if (n >= 2) { f.hidden = true; later(3200, function () { remove(e); }); }
    });
  }

  /* ------------------------------------------------------------------ incidents: the slips */
  function ping() {
    var lvl = level();
    var m = pick(O.pings[lvl].filter(function (x) { return x.text !== S.lastText; }));
    S.lastText = m.text;
    var size = lvl === 1 ? 's' : lvl === 2 ? (Math.random() < 0.5 ? 'm' : 'l') : 'l';
    // one half-screen slip at a time: the next one pushes the last off the desk
    if (size === 'l') live.filter(function (e) { return e.classList.contains('os-slip--l') && !e.hasAttribute('data-keep'); }).forEach(function (e) { remove(e, 'is-gone'); });
    S.unread++; L.pings++;
    slip({ size: size, from: m.from, text: m.text, kind: 'ping', aria: true, chat: m.from, buttons: [{ label: O.later, act: 'later' }] });
    badge();
  }

  function flicker() {
    if (still()) return ping();
    var f = el('os-flicker');
    f.setAttribute('aria-hidden', 'true');
    host.appendChild(f);
    setTimeout(function () { rm(f); }, 900);
  }

  function spinner() {
    if (still()) return ping();
    root.classList.add('is-os-busy');
    var e = slip({ size: 'xs', text: O.spinner, kind: 'spinner', flick: false });
    later(1700, function () { root.classList.remove('is-os-busy'); remove(e); });
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
    setTimeout(function () { e.classList.add('is-gone'); setTimeout(function () { rm(e); }, 500); }, 2600);
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
      setTimeout(function () { rm(e); }, 700);
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

  function timesheet() {
    var resets = 0;
    var T = O.timesheet;
    var e = slip({
      size: 'm', from: 'hr', kind: 'timesheet', aria: true,
      html: '<p class="os-slip__text os-slip__text--q">' + esc(T.title) + '</p><label class="os-field"><span>' + esc(T.label) + '</span><input class="input" type="text" inputmode="decimal" autocomplete="off"></label><p class="os-slip__note" data-note></p>',
      buttons: [{ label: O.later, act: 'later' }, { label: T.submit, act: 'submit', cls: 'btn--primary' }],
      on: function (act, b, e) { if (act === 'submit') settle(e, 'timesheet', T.done); },
    });
    var inp = qs('input', e);
    inp.addEventListener('input', function () {
      if (resets >= 2 || inp.value.length < 2) return;
      resets++;
      setTimeout(function () { inp.value = ''; qs('[data-note]', e).textContent = T.reset; }, 350);
    });
  }

  function twofa() {
    var T = O.twofa, tries = 0;
    slip({
      size: 's', from: 'it', kind: 'twofa', text: T.text, aria: true,
      buttons: [{ label: T.deny, act: 'deny' }, { label: T.approve, act: 'approve', cls: 'btn--primary' }],
      on: function (act, b, e) {
        if (act === 'approve') settle(e, 'twofa', T.approved);
        else if (++tries >= 2) settle(e, 'twofa', T.denied);
        else noteOf(e).textContent = T.denied;
      },
    });
    unread(1);
  }

  function lunch() {
    var T = O.lunch;
    slip({
      size: 's', from: 'fac', kind: 'lunch', aria: true,
      html: '<p class="os-slip__text">' + esc(T.text) + '</p><div class="os-choices">' + T.options.map(function (o, k) { return '<button class="btn btn--ghost btn--sm" type="button" data-act="opt' + k + '">' + esc(o) + '</button>'; }).join('') + '</div>',
      buttons: [{ label: O.later, act: 'later' }],
      on: function (act, b, e) { if (act.indexOf('opt') === 0) { b.classList.add('is-picked'); settle(e, 'lunch', T.done); } },
    });
    unread(1);
  }

  function conflict() {
    var T = O.conflict;
    slip({
      size: 'm', from: 'sys', kind: 'conflict', aria: true,
      html: '<p class="os-slip__text os-slip__text--q">' + esc(T.text) + '</p><div class="os-cards"><button class="os-card" type="button" data-act="a"><span class="os-card__t">16:00</span><span>' + esc(T.a) + '</span></button><button class="os-card" type="button" data-act="b"><span class="os-card__t">16:00</span><span>' + esc(T.b) + '</span></button></div>',
      buttons: [{ label: O.later, act: 'later' }],
      on: function (act, b, e) { if (act === 'a' || act === 'b') { b.classList.add('is-picked'); settle(e, 'conflict', T.done, 2200); } },
    });
    unread(1);
  }

  function status() {
    var T = O.status;
    slip({
      size: 's', from: 'sys', kind: 'status', text: T.text, aria: true,
      buttons: [{ label: T.focus, act: 'focus' }, { label: T.available, act: 'available', cls: 'btn--primary' }],
      on: function (act, b, e) {
        if (act === 'focus') settle(e, 'status', T.focusDone);
        else if (act === 'available') {
          settle(e, 'status', T.availableDone);
          later(2600, function () { if (workOn() && !paused()) fire('ping'); });
        }
      },
    });
  }

  function comment() {
    var T = O.comment, who = 'dana', n = 0;
    slip({
      size: 's', from: who, kind: 'comment', aria: true, chat: who,
      html: '<p class="os-slip__text os-slip__text--dim">' + esc(fill(T.text, { name: name(who) })) + '</p><blockquote class="os-quote">' + esc(T.quote) + '</blockquote>',
      buttons: [{ label: O.later, act: 'later' }, { label: T.resolve, act: 'resolve', cls: 'btn--primary' }],
      on: function (act, b, e) {
        if (act !== 'resolve') return;
        if (++n >= 2) return settle(e, 'comment', fill(T.reopened, { name: name(who) }));
        b.disabled = true;
        later(1400, function () { noteOf(e).textContent = fill(T.reopened, { name: name(who) }); b.disabled = false; });
      },
    });
    unread(1);
  }

  function birthday() {
    var T = O.birthday;
    slip({
      size: 's', from: 'channel', kind: 'birthday', text: T.text, aria: true,
      buttons: [{ label: O.later, act: 'later' }, { label: T.sign, act: 'sign', cls: 'btn--primary' }],
      on: function (act, b, e) {
        if (act === 'sign' && !qs('textarea', e)) {
          qs('.os-slip__body', e).appendChild(el('os-field', '<span>' + esc(T.label) + '</span><textarea class="input os-ta" rows="2" placeholder="' + esc(T.placeholder) + '"></textarea>', 'label'));
          qs('textarea', e).focus({ preventScroll: true });
          b.setAttribute('data-act', 'sign2');
        } else if (act === 'sign2') settle(e, 'birthday', T.done);
      },
    });
    unread(1);
  }

  function desk() {
    var T = O.desk;
    slip({
      size: 's', from: 'fac', kind: 'desk', text: T.text, aria: true,
      buttons: [{ label: O.later, act: 'later' }, { label: T.book, act: 'book', cls: 'btn--primary' }],
      on: function (act, b, e) {
        if (act === 'book') { noteOf(e).textContent = T.taken; b.textContent = T.bookOther; b.setAttribute('data-act', 'book2'); }
        else if (act === 'book2') settle(e, 'desk', T.done);
      },
    });
    unread(1);
  }

  function notice() {
    var T = O.notices, m = pick(T.items), n = 40 + Math.floor(rnd(1, 9));
    var e = slip({
      size: 's', from: m.from, kind: 'notice', text: m.text, aria: true,
      buttons: [{ label: O.later, act: 'later' }, { label: T.react + ' 👍 ' + n, act: 'react' }],
      on: function (act, b, e) { if (act === 'react') { b.textContent = T.react + ' 👍 ' + (n + 1); b.classList.add('is-picked'); later(900, function () { finish(e, 'notice'); }); } },
    });
    unread(1);
    return e;
  }

  function sysNote() {
    var m = pick(O.sys);
    slip({
      size: 'xs', from: 'sys', kind: 'sys', text: m.text, aria: true,
      buttons: [{ label: m.ok, act: 'ok', cls: 'btn--primary' }],
      on: function (act, b, e) { if (act === 'ok') settle(e, 'sys', m.done, 1500); },
    });
  }

  function typingNote() {
    var who = pick(['dana', 'petar', 'mira']);
    var e = slip({ size: 'xs', from: who, kind: 'typing', flick: false, html: '<p class="os-slip__text os-slip__text--dim">' + esc(fill(O.typing.text, { name: name(who) })) + '</p><span class="os-dots"><i></i><i></i><i></i></span>' });
    later(rnd(9000, 13000), function () {
      if (!e.parentNode) return;
      qs('.os-slip__text', e).textContent = fill(O.typing.stopped, { name: name(who) });
      rm(qs('.os-dots', e));
      later(2200, function () { remove(e); });
    });
  }

  function shadow() {
    if (coarse) return ping();
    var e = slip({ size: 'xs', kind: 'shadow', flick: false, cls: 'os-slip--shadow', text: pick(O.shadow) });
    var mv = function (ev) { e.style.left = (ev.clientX + 22) + 'px'; e.style.top = (ev.clientY + 22) + 'px'; e.style.right = 'auto'; e.style.bottom = 'auto'; };
    window.addEventListener('pointermove', mv);
    later(5200, function () { window.removeEventListener('pointermove', mv); remove(e); });
  }

  // reply-all: the whole company, one slip each
  function storm() {
    var T = O.storm, i = 0, n = Math.min(T.lines.length, 7);
    var next = function () {
      if (!workOn() || i >= n) return;
      var e = slip({ size: i % 3 === 2 ? 's' : 'xs', from: pick(['petar', 'mira', 'dana', 'channel', 'finance', 'hr', 'rec']), kind: 'storm', html: '<p class="os-mail__re">' + esc(T.subject) + '</p><p class="os-slip__text">' + esc(T.lines[i]) + '</p>' });
      e.style.right = rnd(2, 40).toFixed(0) + 'vw'; e.style.bottom = rnd(6, 50).toFixed(0) + 'vh'; e.style.top = 'auto';
      later(4800, function () { remove(e); });
      S.unread++; L.pings++; i++;
      badge();
      later(rnd(550, 800), next);
    };
    next();
  }

  /* ------------------------------------------------------------------ email: read, reply, get a reply */
  var Mm = O.mail;
  function email(item, depth) {
    if (!item) {
      var all = Mm.items.map(function (_, i) { return i; });
      var idx = all.filter(function (i) { return S.mails.indexOf(i) < 0; });
      if (!idx.length) { S.mails = []; idx = all; }
      var i = pick(idx);
      S.mails.push(i);
      item = Mm.items[i];
      depth = 0;
    }
    var e = slip({
      size: 'm', from: item.from, kind: 'email', cls: 'os-slip--mail', aria: true,
      html: '<p class="os-mail__subject">' + esc(item.subject) + '</p><p class="os-mail__body">' + lines(item.body) + '</p>',
      buttons: [{ label: O.later, act: 'later' }, { label: Mm.reply, act: 'reply', cls: 'btn--primary' }],
      on: function (act) {
        if (act !== 'reply') return;
        remove(e);
        compose(item, depth || 0);
        track('onshift_email', { action: 'reply', depth: depth || 0 });
      },
    });
    S.unread++; L.pings++;
    badge();
  }

  function compose(item, depth) {
    var who = name(item.from), subj = Mm.re + item.subject;
    var e = slip({
      size: 'f', kind: 'compose', keep: true, aria: true, flick: false, cls: 'os-slip--form os-slip--compose',
      html: '<div class="os-mail">' +
        '<div class="os-mail__row"><span class="os-mail__lbl">' + esc(Mm.to) + '</span><span class="os-chip"><i class="os-slip__dot">' + esc(who).charAt(0) + '</i>' + esc(who) + '</span></div>' +
        '<div class="os-mail__row"><label class="os-mail__lbl" for="os-cc">' + esc(Mm.cc) + '</label><input class="os-mail__in" id="os-cc" type="text" placeholder="' + esc(Mm.ccPlaceholder) + '" autocomplete="off"></div>' +
        '<div class="os-mail__row"><label class="os-mail__lbl" for="os-subj">' + esc(Mm.subject) + '</label><input class="os-mail__in" id="os-subj" type="text" value="' + esc(subj) + '" autocomplete="off"></div>' +
        '<textarea class="os-mail__ta" data-ta rows="7" placeholder="' + esc(Mm.placeholder) + '" aria-label="' + esc(Mm.placeholder) + '"></textarea>' +
        '<div class="os-mail__quote"><button class="os-mail__qbtn" type="button" data-act="quote" aria-expanded="false" aria-label="' + esc(Mm.showQuote) + '">···</button><blockquote class="os-mail__q" data-quote hidden><p class="os-mail__qhead">' + esc(fill(Mm.quoteHead, { time: clock(), name: who })) + '</p><p>' + lines(item.body) + '</p></blockquote></div>' +
        '<p class="os-mail__also" data-also hidden></p>' +
        '<div class="os-mail__foot"><button class="btn btn--primary btn--sm" type="button" data-act="send">' + esc(Mm.send) + '</button><button class="btn btn--ghost btn--sm" type="button" data-act="discard">' + esc(Mm.discard) + '</button><span class="os-mail__draft" data-draft>' + esc(Mm.sendKey) + '</span></div>' +
        '<div class="os-mail__sure" data-sure hidden><p>' + esc(Mm.empty) + '</p><button class="btn btn--primary btn--sm" type="button" data-act="send-anyway">' + esc(Mm.sendAnyway) + '</button></div>' +
      '</div>',
      on: function (act, b, e) {
        if (act === 'quote') { var q = qs('[data-quote]', e); q.hidden = !q.hidden; b.setAttribute('aria-expanded', String(!q.hidden)); b.hidden = !q.hidden; }
        else if (act === 'send') send(false);
        else if (act === 'send-anyway') send(true);
        else if (act === 'discard') { toast(Mm.discarded); dismiss(e, 'discard', 'compose'); track('onshift_email', { action: 'discard' }); }
      },
    });
    var ta = qs('[data-ta]', e), draft = qs('[data-draft]', e), sent = false, draftT = 0;
    ta.value = '\n\n' + Mm.signature;
    setTimeout(function () { try { ta.focus({ preventScroll: true }); ta.setSelectionRange(0, 0); } catch (err) {} }, 80);
    ta.addEventListener('input', function () {
      clearTimeout(draftT);
      draftT = setTimeout(function () { if (!sent) draft.textContent = fill(Mm.draftSaved, { time: clock() }); }, 1500);
    });
    e.addEventListener('keydown', function (ev) { if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); send(false); } });
    // they're typing too (level 2 and up)
    if (level() >= 2) later(4000, function () { var a = qs('[data-also]', e); if (a && !sent) { a.textContent = fill(Mm.alsoTyping, { name: who }); a.hidden = false; } });
    function send(force) {
      if (sent) return;
      var body = ta.value.replace(Mm.signature, '').trim();
      if (!body && !force) { qs('[data-sure]', e).hidden = false; qs('[data-act="send-anyway"]', e).focus(); return; }
      sent = true;
      qs('[data-sure]', e).hidden = true;
      qsa('button', e).forEach(function (x) { x.disabled = true; });
      draft.textContent = Mm.sending;
      later(800, function () {
        qs('.os-mail', e).innerHTML = '<p class="os-mail__sent"><b>✓</b> ' + esc(Mm.sent) + '</p>';
        L.sent++;
        saveL();
        track('onshift_email', { action: 'send', depth: depth, chars: body.length });
        later(1200, function () { finish(e, 'compose', 'sent'); });
        // the reply to your reply
        if (depth < 2) later(rnd(12000, 26000), function () {
          if (!workOn() || paused() || modal || formOpen()) return;
          email({ from: item.from, subject: subj, body: pick(Mm.followups) + '\n\n' + who }, depth + 1);
        });
      });
    }
  }

  /* ------------------------------------------------------------------ surveys: real questions */
  var U = O.surveyUi;
  function qHtml(q, i, ans) {
    var nm = 'q' + i, a = ans[i], body = '';
    var head = '<legend class="os-q__t"><span class="os-q__n">' + (i + 1) + '.</span> ' + esc(q.q) + (q.opt ? ' <small class="os-q__opt">(' + esc(U.optional) + ')</small>' : '') + '</legend>';
    if (q.t === 'scale' || q.t === 'nps') {
      var lo = q.t === 'nps' ? 0 : 1, hi = q.t === 'nps' ? 10 : 5, cells = '';
      for (var v = lo; v <= hi; v++) cells += '<label class="os-scale__c"><input type="radio" name="' + nm + '" value="' + v + '"' + (a === String(v) ? ' checked' : '') + '><span>' + v + '</span></label>';
      body = '<div class="os-scale' + (q.t === 'nps' ? ' os-scale--nps' : '') + '">' + cells + '</div><div class="os-scale__ends"><span>' + esc(q.t === 'nps' ? U.npsLo : q.lo) + '</span><span>' + esc(q.t === 'nps' ? U.npsHi : q.hi) + '</span></div>';
    } else if (q.t === 'radio' || q.t === 'check') {
      body = '<div class="os-opts">' + q.o.map(function (opt, k) {
        var on = q.t === 'radio' ? a === String(k) : !!(a && a.indexOf(String(k)) >= 0);
        return '<label class="os-opt"><input type="' + (q.t === 'radio' ? 'radio' : 'checkbox') + '" name="' + nm + '" value="' + k + '"' + (on ? ' checked' : '') + '><span>' + esc(opt) + '</span></label>';
      }).join('') + '</div>';
    } else {
      body = '<textarea class="input os-ta" name="' + nm + '" rows="3" placeholder="' + esc(q.ph || '') + '">' + esc(a || '') + '</textarea>';
    }
    return '<fieldset class="os-q" data-q="' + i + '">' + head + body + '<p class="os-q__err" hidden>' + esc(U.required) + '</p></fieldset>';
  }
  function readAns(body, qlist, start, ans) {
    qlist.forEach(function (q, j) {
      var i = start + j, nm = 'q' + i;
      if (q.t === 'check') ans[i] = qsa('input[name="' + nm + '"]:checked', body).map(function (x) { return x.value; });
      else if (q.t === 'text') { var ta = qs('[name="' + nm + '"]', body); ans[i] = ta ? ta.value.trim() : ''; }
      else { var r = qs('input[name="' + nm + '"]:checked', body); ans[i] = r ? r.value : ''; }
    });
  }
  function missing(q, a) { return q.opt ? false : q.t === 'check' ? !(a && a.length) : !a; }
  // the form itself: paged by four, every question required unless it says otherwise
  function surveyForm(sv) {
    var PER = 4, meta = O.surveys.filter(function (x) { return x.id === 'meta'; })[0];
    var bonus = level() >= 3 && sv.size === 'l' && meta && sv.id !== 'meta' ? [meta.q[0], meta.q[2]] : null;
    var qlist = sv.q.slice(), pages = Math.ceil(qlist.length / PER), page = 0, ans = {}, extra = false, sent = false;
    var e = slip({
      size: 'f', from: sv.from, kind: 'survey', keep: true, aria: true, flick: false, cls: 'os-slip--form',
      html: '<div class="os-form"><div class="os-form__head"><p class="os-form__k">' + esc(U.k) + '</p><h2 class="os-form__title">' + esc(sv.title) + '</h2><p class="os-form__intro" data-intro>' + esc(sv.intro) + '</p><p class="os-form__prog" data-prog></p></div><div class="os-form__body" data-body tabindex="-1"></div><div class="os-form__foot"><button class="btn btn--ghost btn--sm" type="button" data-act="later">' + esc(O.later) + '</button><span class="os-form__gap"></span><button class="btn btn--ghost btn--sm" type="button" data-act="back" hidden>' + esc(U.back) + '</button><button class="btn btn--primary btn--sm" type="button" data-act="next">' + esc(U.next) + '</button></div></div>',
      on: function (act, b, e) {
        if (act === 'back') { readAns(body, pageQs(), page * PER, ans); page = Math.max(0, page - 1); render(); }
        else if (act === 'next') next();
      },
    });
    var body = qs('[data-body]', e), prog = qs('[data-prog]', e), nextBtn = qs('[data-act="next"]', e), backBtn = qs('[data-act="back"]', e);
    var pageQs = function () { return qlist.slice(page * PER, page * PER + PER); };
    function render() {
      var last = page === pages - 1;
      body.innerHTML = (page === 0 && sv.size !== 's' ? '<p class="os-form__anon">' + esc(U.anon) + ' <small>' + esc(U.anonNote) + '</small></p>' : '') + (extra && last ? '<p class="os-form__more">' + esc(U.more) + '</p>' : '') + pageQs().map(function (q, j) { return qHtml(q, page * PER + j, ans); }).join('');
      prog.textContent = pages > 1 ? fill(U.page, { i: page + 1, n: pages }) : '';
      backBtn.hidden = page === 0;
      nextBtn.textContent = last ? U.submit : U.next;
      body.scrollTop = 0;
      try { body.focus({ preventScroll: true }); } catch (err) {}
    }
    function next() {
      if (sent) return;
      var qsHere = pageQs(), start = page * PER;
      readAns(body, qsHere, start, ans);
      var bad = -1;
      qsHere.forEach(function (q, j) {
        var fs = qs('[data-q="' + (start + j) + '"]', body), miss = missing(q, ans[start + j]);
        fs.classList.toggle('is-missing', miss);
        qs('.os-q__err', fs).hidden = !miss;
        if (miss && bad < 0) bad = start + j;
      });
      if (bad >= 0) { var fs = qs('[data-q="' + bad + '"]', body); fs.scrollIntoView({ block: 'center', behavior: still() ? 'auto' : 'smooth' }); return; }
      if (page < pages - 1) { page++; render(); return; }
      // the long one, at the absurd level: "two more questions" after the last page
      if (bonus && !extra) { extra = true; qlist = qlist.concat(bonus); pages = Math.ceil(qlist.length / PER); page = pages - 1; render(); return; }
      submit();
    }
    function submit() {
      sent = true;
      nextBtn.disabled = true;
      nextBtn.textContent = U.submitting;
      later(900, function () {
        body.innerHTML = '<p class="os-form__done"><b>' + esc(U.done) + '</b> ' + esc(sv.thanks) + '</p>';
        prog.textContent = '';
        qs('.os-form__foot', e).hidden = true;
        if (S.surveys.indexOf(sv.id) < 0) S.surveys.push(sv.id);
        L.surveys++;
        saveS(); saveL();
        track('onshift_survey', { id: sv.id, size: sv.size, action: 'submit', n: qlist.length, extra: extra });
        later(2600, function () { finish(e, 'survey', 'submit'); });
        // and then: rate the survey
        if (level() >= 2) later(5200, function () { if (workOn() && !paused() && !modal && !formOpen()) rate(); });
      });
    }
    render();
    track('onshift_survey', { id: sv.id, size: sv.size, action: 'start', n: qlist.length });
  }
  // the envelope it comes in
  function survey() {
    var lvl = level(), allowed = lvl === 1 ? ['s'] : lvl === 2 ? ['s', 'm'] : ['s', 'm', 'l'];
    var pool = O.surveys.filter(function (s) { return allowed.indexOf(s.size) >= 0 && S.surveys.indexOf(s.id) < 0; });
    if (!pool.length) pool = O.surveys.filter(function (s) { return allowed.indexOf(s.size) >= 0; });
    var sv = pick(pool);
    var e = slip({
      size: 'm', from: sv.from, kind: 'survey', cls: 'os-slip--envelope', aria: true,
      html: '<p class="os-slip__k">' + esc(U.k) + '</p><p class="os-slip__text">' + esc(sv.title) + '</p><p class="os-slip__note">' + esc(fill(U.about, { est: sv.est, n: sv.q.length })) + '</p>',
      buttons: [{ label: O.later, act: 'later' }, { label: U.start, act: 'start', cls: 'btn--primary' }],
      on: function (act) { if (act === 'start') { remove(e); surveyForm(sv); } },
    });
    unread(1);
    track('onshift_survey', { id: sv.id, size: sv.size, action: 'show' });
  }
  // the one-question follow-up: rate the survey, then rate the rating
  function rate() {
    var Rt = U.rate, step = 0;
    var row = function () { var s = ''; for (var i = 1; i <= 5; i++) s += '<button class="os-rate" type="button" data-act="rate">' + i + '</button>'; return '<div class="os-rates">' + s + '</div>'; };
    slip({
      size: 's', from: 'hr', kind: 'rate', aria: true,
      html: '<p class="os-slip__text os-slip__text--q">' + esc(Rt.q) + '</p>' + row(),
      buttons: [{ label: O.later, act: 'later' }],
      on: function (act, b, e) {
        if (act !== 'rate') return;
        step++;
        var body = qs('.os-slip__body', e);
        if (step === 1) body.innerHTML = '<p class="os-slip__text os-slip__text--q">' + esc(Rt.thanks) + '</p>' + row();
        else { body.innerHTML = '<p class="os-slip__text os-slip__text--q">' + esc(Rt.done) + '</p>'; qs('.os-slip__foot', e).hidden = true; later(1800, function () { finish(e, 'rate'); }); }
      },
    });
  }

  /* ------------------------------------------------------------------ the policy, the training */
  function policy() {
    var P = O.policy;
    var e = slip({
      size: 'm', from: 'hr', kind: 'policy', cls: 'os-slip--envelope', aria: true,
      html: '<p class="os-slip__k">' + esc(P.k) + '</p><p class="os-slip__text">' + esc(P.title) + '</p><p class="os-slip__note">' + esc(P.text) + '</p>',
      buttons: [{ label: O.later, act: 'later' }, { label: P.open, act: 'open', cls: 'btn--primary' }],
      on: function (act) { if (act === 'open') { remove(e); policyForm(); } },
    });
    unread(1);
  }
  function policyForm() {
    var P = O.policy;
    var e = slip({
      size: 'f', from: 'hr', kind: 'policy', keep: true, aria: true, flick: false, cls: 'os-slip--form',
      html: '<div class="os-form"><div class="os-form__head"><p class="os-form__k">' + esc(P.k) + '</p><h2 class="os-form__title">' + esc(P.title) + '</h2><p class="os-form__intro" data-how>' + esc(P.scroll) + '</p></div><div class="os-form__body os-doc" data-doc tabindex="0"><ol class="os-doc__list">' + P.clauses.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ol></div><div class="os-form__foot os-form__foot--wrap"><label class="os-ack"><input type="checkbox" data-ack disabled><span>' + esc(P.ack) + '</span></label><div class="os-form__row"><button class="btn btn--ghost btn--sm" type="button" data-act="later">' + esc(O.later) + '</button><span class="os-form__gap"></span><button class="btn btn--primary btn--sm" type="button" data-act="ack" disabled>' + esc(P.confirm) + '</button></div></div></div>',
      on: function (act, b, e) {
        if (act !== 'ack') return;
        qs('[data-doc]', e).innerHTML = '<p class="os-form__done"><b>' + esc(P.confirm) + '</b> ' + esc(P.done) + '</p>';
        qs('.os-form__foot', e).hidden = true;
        later(2200, function () { finish(e, 'policy', 'ack'); });
      },
    });
    var doc = qs('[data-doc]', e), ack = qs('[data-ack]', e), btn = qs('[data-act="ack"]', e);
    var atEnd = function () { return doc.scrollTop + doc.clientHeight >= doc.scrollHeight - 6; };
    var check = function () { if (atEnd()) { ack.disabled = false; qs('[data-how]', e).textContent = P.text; } };
    doc.addEventListener('scroll', check);
    ack.addEventListener('change', function () { btn.disabled = !ack.checked; });
    setTimeout(check, 120);
  }

  function training() {
    var T = O.training;
    var e = slip({
      size: 'm', from: 'hr', kind: 'training', cls: 'os-slip--envelope', aria: true,
      html: '<p class="os-slip__k">' + esc(T.k) + '</p><p class="os-slip__text">' + esc(T.title) + '</p><p class="os-slip__note">' + esc(T.text) + '</p>',
      buttons: [{ label: O.later, act: 'later' }, { label: T.start, act: 'start', cls: 'btn--primary' }],
      on: function (act) { if (act === 'start') { remove(e); trainingForm(); } },
    });
    unread(1);
  }
  function trainingForm() {
    var T = O.training, ans = {}, qlist = T.q.map(function (q) { return { t: 'radio', q: q.q, o: q.o }; });
    var e = slip({
      size: 'f', from: 'hr', kind: 'training', keep: true, aria: true, flick: false, cls: 'os-slip--form',
      html: '<div class="os-form"><div class="os-form__head"><p class="os-form__k">' + esc(T.k) + '</p><h2 class="os-form__title">' + esc(T.title) + '</h2><p class="os-form__intro" data-how>' + esc(T.text) + '</p></div><div class="os-form__body" data-body tabindex="-1">' + qlist.map(function (q, i) { return qHtml(q, i, ans); }).join('') + '</div><div class="os-form__foot"><button class="btn btn--ghost btn--sm" type="button" data-act="later">' + esc(O.later) + '</button><span class="os-form__gap"></span><button class="btn btn--primary btn--sm" type="button" data-act="check">' + esc(T.check) + '</button></div></div>',
      on: function (act, b, e) {
        if (act !== 'check') return;
        var body = qs('[data-body]', e);
        readAns(body, qlist, 0, ans);
        var wrong = 0;
        T.q.forEach(function (q, i) {
          var fs = qs('[data-q="' + i + '"]', body), miss = !ans[i], bad = !miss && ans[i] !== String(q.a);
          fs.classList.toggle('is-missing', miss);
          fs.classList.toggle('is-wrong', bad);
          qs('.os-q__err', fs).hidden = !miss;
          if (miss || bad) wrong++;
        });
        if (wrong) { qs('[data-how]', e).textContent = T.wrong; return; }
        body.innerHTML = '<p class="os-form__done"><b>✓</b> ' + esc(T.done) + '</p>';
        qs('.os-form__foot', e).hidden = true;
        later(2400, function () { finish(e, 'training', 'pass'); });
      },
    });
  }

  /* ------------------------------------------------------------------ the people, in ink */
  function figure(who, k) {
    // a head and shoulders: hair by k, eyes that blink, a mouth that moves when speaking, a head that nods
    var hair = ['M22 26c2-12 26-12 28 0v-2c-4-8-24-8-28 0z', 'M20 28c0-16 32-16 32 0c-4-6-10-9-16-9s-12 3-16 9z', 'M21 30c-1-18 31-18 30 0l-3-4c-6-6-18-6-24 0z', 'M24 24c6-6 18-6 24 0v6h-4c-2-6-14-6-16 0h-4z'][k % 4];
    var specs = k % 3 === 1 ? '<circle cx="29" cy="35" r="5.5"/><circle cx="43" cy="35" r="5.5"/><path d="M34.5 35h3"/>' : '';
    return '<svg class="os-fig os-fig--' + k + '" viewBox="0 0 72 72" aria-hidden="true"><path class="os-fig__body" d="M8 72c2-16 12-22 28-22s26 6 28 22z"/><g class="os-fig__hd"><circle class="os-fig__head" cx="36" cy="36" r="17"/><path class="os-fig__hair" d="' + hair + '"/><g class="os-fig__eyes"><ellipse class="os-eye" cx="29" cy="35" rx="2" ry="2.4"/><ellipse class="os-eye" cx="43" cy="35" rx="2" ry="2.4"/></g>' + specs + '<path class="os-mouth" d="M31 45q5 3 10 0"/></g></svg>';
  }

  /* ------------------------------------------------------------------ the meeting */
  var M = O.meeting;
  function meeting(opts) {
    opts = opts || {};
    if (modal) return;
    if (opts.deck || opts.force) return call(opts);
    var n = 5;
    var e = slip({
      size: 'm', from: 'dana', kind: 'invite', flick: false, aria: true,
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
          later(4000, function () { remove(r); });
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
  // the call that comes back: it rings, you pick up (or it picks up for you)
  function ring() {
    if (modal) { S.forced = S.t + 10; saveS(); return; }
    var who = 'dana', C = O.callback;
    var e = slip({
      size: 'm', from: who, kind: 'ring', flick: false, aria: true, cls: 'os-slip--ring',
      html: '<p class="os-slip__text os-slip__text--q">' + esc(fill(C.text, { name: name(who) })) + '</p><span class="os-ring" aria-hidden="true"><i></i><i></i><i></i></span>',
      buttons: [{ label: C.decline, act: 'decline' }, { label: C.accept, act: 'accept', cls: 'btn--primary' }],
      on: function (act) {
        clearTimeout(auto);
        remove(e);
        if (act === 'accept') { call({ force: true }); track('onshift_meeting', { action: 'accept' }); }
        else {
          var r = slip({ size: 'xs', from: who, text: fill(C.declined, { name: name(who) }), kind: 'reply' });
          later(3500, function () { remove(r); });
          track('onshift_meeting', { action: 'decline_call' });
        }
      },
    });
    var auto = setTimeout(function () { if (e.parentNode) { remove(e); call({ force: true }); } }, 7000);
    unread(1);
    track('onshift_meeting', { action: 'ring' });
  }

  function call(opts) {
    var people = ['dana', 'petar', 'mira'];
    var c = el('os-call' + (opts.deck ? ' os-call--deck' : ''));
    c.setAttribute('role', 'dialog');
    c.setAttribute('aria-modal', 'true');
    c.setAttribute('aria-label', M.title);
    var tile = function (p, k, label) {
      return '<div class="os-tile os-tile--' + k + '" data-tile="' + p + '">' + figure(p, k) + '<span class="os-tile__init" aria-hidden="true">' + esc(name(p)).charAt(0) + '</span><span class="os-tile__badge" data-badge hidden></span><span class="os-tile__bars" aria-hidden="true"><i></i><i></i><i></i></span><span class="os-tile__name">' + esc(label || name(p)) + '</span></div>';
    };
    var tiles = people.map(function (p, k) { return tile(p, k); }).join('') +
      '<div class="os-tile os-tile--you" data-you><span class="os-tile__off">' + esc(M.cameraOff) + '</span><span class="os-tile__badge" data-badge hidden></span><span class="os-tile__name">' + esc(M.you) + ' · <span data-mic>' + esc(M.muted) + '</span></span></div>';
    c.innerHTML =
      '<div class="os-call__top"><span class="os-call__title">' + esc(M.title) + '</span><span class="os-call__rec"></span><span class="os-call__time" data-time>00:00</span></div>' +
      '<div class="os-call__stage"><div class="os-call__grid" data-grid>' + tiles + '</div><div class="os-share" data-share hidden></div></div>' +
      '<p class="os-call__cap" data-cap aria-live="off">' + esc(M.joining) + '</p>' +
      '<div class="os-call__bar"><button class="btn btn--ghost btn--sm" type="button" data-act="mute">' + esc(M.unmute) + '</button><button class="btn btn--ghost btn--sm" type="button" data-act="share">' + esc(M.share) + '</button><button class="btn btn--ghost btn--sm" type="button" data-act="raise">' + esc(M.raise) + '</button><button class="btn btn--sm os-call__leave" type="button" data-act="leave">' + esc(M.leave) + '</button></div>' +
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
    var cap = qs('[data-cap]', c), capI = -1, say = function (t) { if (cap) cap.textContent = t; };
    // someone speaks every few seconds; the captions follow
    var talk = function () {
      qsa('.os-tile', c).forEach(function (t) { t.classList.remove('is-speaking'); });
      var can = qsa('.os-tile[data-tile]', c).filter(function (t) { return !t.classList.contains('is-camoff') && !t.classList.contains('is-frozen'); });
      var who = can[Math.floor(Math.random() * can.length)];
      if (who) who.classList.add('is-speaking');
      capI = (capI + 1 + Math.floor(Math.random() * 2)) % M.captions.length;
      say(M.captions[capI]);
      modal.timers.push(setTimeout(talk, rnd(2400, 4200)));
    };
    modal.timers.push(setTimeout(talk, 1200));
    modal.timers.push(setTimeout(function () { say(M.recording); }, 2600));
    // the small things that happen on calls: a camera goes, someone freezes, a hand, a thumbs-up, a late joiner
    var late = false, muted = true;
    var happen = function () {
      if (!modal || modal.kind !== 'call') return;
      var ts = qsa('.os-tile[data-tile]', c), t = ts[Math.floor(Math.random() * ts.length)], who = name(t.getAttribute('data-tile'));
      var ev = pick(late ? ['camoff', 'frozen', 'hand', 'react', 'react'] : ['camoff', 'frozen', 'hand', 'react', 'react', 'late']);
      if (ev === 'late') {
        late = true;
        var g = qs('[data-grid]', c), n = el('div', tile('petar', 3, fill(M.phone, { name: name('petar') })));
        var nt = n.firstChild;
        nt.classList.add('is-late');
        g.insertBefore(nt, qs('[data-you]', c));
        say(fill(M.joined, { name: name('petar') }));
      } else if (ev === 'camoff') {
        t.classList.add('is-camoff');
        modal.timers.push(setTimeout(function () { t.classList.remove('is-camoff'); }, rnd(6000, 10000)));
      } else if (ev === 'frozen') {
        t.classList.add('is-frozen');
        var b = qs('[data-badge]', t); b.textContent = M.frozen; b.hidden = false;
        say(fill(M.lostName, { name: who }));
        modal.timers.push(setTimeout(function () { t.classList.remove('is-frozen'); b.hidden = true; }, rnd(3000, 5200)));
      } else if (ev === 'hand') {
        var hb = qs('[data-badge]', t); hb.textContent = '✋'; hb.hidden = false;
        say(fill(M.hand, { name: who }));
        modal.timers.push(setTimeout(function () { hb.hidden = true; }, 5000));
      } else react(t);
      modal.timers.push(setTimeout(happen, rnd(5500, 10000)));
    };
    modal.timers.push(setTimeout(happen, 4500));
    var react = function (t) {
      var r = el('os-react', pick(M.reactions), 'span');
      r.style.left = rnd(15, 75).toFixed(0) + '%';
      t.appendChild(r);
      modal.timers.push(setTimeout(function () { rm(r); }, 1900));
    };
    // the screen share: a chart nobody can read, or (the gauntlet) Dana's deck
    var share = qs('[data-share]', c);
    if (!opts.deck) modal.timers.push(setTimeout(function () {
      share.hidden = false;
      share.innerHTML = '<p class="os-share__who">' + esc(fill(M.sharing, { name: name('dana') })) + '</p>' + chart();
      c.classList.add('is-sharing');
    }, 6000));
    c.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-act]');
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'mute') {
        muted = !muted;
        b.textContent = muted ? M.unmute : M.mute;
        qs('[data-mic]', c).textContent = muted ? M.muted : M.micOn;
        if (!muted) modal.timers.push(setTimeout(function () {
          if (muted) return;
          muted = true;
          b.textContent = M.unmute;
          qs('[data-mic]', c).textContent = M.muted;
          say(M.stillMuted);
        }, 2600));
      } else if (act === 'share') toast(M.shareNote);
      else if (act === 'raise') {
        toast(M.raised);
        var yb = qs('[data-you] [data-badge]', c); yb.textContent = '✋'; yb.hidden = false;
        modal.timers.push(setTimeout(function () { yb.hidden = true; }, 6000));
      }
      else if (act === 'leave') { qs('[data-sure]', c).hidden = false; qs('[data-act="stay"]', c).focus(); }
      else if (act === 'stay') qs('[data-sure]', c).hidden = true;
      else if (act === 'leave-anyway') {
        endCall();
        toast(M.left);
        track('onshift_meeting', { action: 'leave' });
        // at the absurd level, Dana calls back
        if (level() >= 3 && !opts.deck && !S.cb) { S.cb = 1; S.forced = S.t + 25; saveS(); }
      }
      else if (opts.on) opts.on(act, b, c);
    });
    c.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { ev.stopPropagation(); qs('[data-sure]', c).hidden = false; } });
    setTimeout(function () { var l = qs('[data-act="leave"]', c); if (l) try { l.focus({ preventScroll: true }); } catch (e) {} }, 60);
    // a call without a deck wraps itself up eventually
    if (!opts.deck) modal.timers.push(setTimeout(function () { say(M.captions[3]); setTimeout(endCall, 2500); }, 95000));
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
    setTimeout(function () { rm(m.el); rm(m.veil); }, still() ? 0 : 450);
  }

  /* ------------------------------------------------------------------ the screen share, the update, IT's cursor */
  var shareEl = null;
  function share() {
    var T = O.share, who = 'petar';
    slip({
      size: 's', from: who, kind: 'share', text: fill(T.text, { name: name(who) }), aria: true,
      buttons: [{ label: T.decline, act: 'decline' }, { label: T.share, act: 'share', cls: 'btn--primary' }],
      on: function (act, b, e) {
        if (act === 'decline') settle(e, 'share', fill(T.declined, { name: name(who) }));
        else if (act === 'share') { finish(e, 'share', 'share'); shareStart(); }
      },
    });
    unread(1);
  }
  function shareStart() {
    if (shareEl) return;
    var T = O.share;
    var fr = el('os-shareframe');
    fr.setAttribute('aria-hidden', 'true');
    var bar = el('os-sharebar', '<span class="os-sharebar__dot"></span><span>' + esc(T.bar) + '</span><button class="btn btn--sm os-sharebar__stop" type="button">' + esc(T.stop) + '</button>');
    host.appendChild(fr);
    host.appendChild(bar);
    shareEl = { fr: fr, bar: bar, t: 0 };
    qs('button', bar).addEventListener('click', function () { shareStop(); });
    var drift = function () {
      if (!shareEl) return;
      if (level() >= 3 && !still()) bar.style.setProperty('--x', rnd(-38, 38).toFixed(0) + 'vw');
      shareEl.t = setTimeout(drift, 2600);
    };
    shareEl.t = setTimeout(drift, 2600);
    void bar.offsetWidth;
    bar.classList.add('is-in');
    fr.classList.add('is-in');
    track('onshift_incident', { kind: 'share', action: 'start', level: level() });
  }
  function shareStop(quiet) {
    if (!shareEl) return;
    var s = shareEl;
    shareEl = null;
    clearTimeout(s.t);
    s.bar.classList.remove('is-in');
    s.fr.classList.remove('is-in');
    setTimeout(function () { rm(s.bar); rm(s.fr); }, 400);
    if (!quiet) toast(fill(O.share.stopped, { name: name('petar') }));
  }

  function update() {
    var T = O.update, left = 3 - (S.upd || 0);
    var e = slip({
      size: 'm', from: 'it', kind: 'update', flick: false, aria: true,
      html: '<p class="os-slip__text os-slip__text--q">' + esc(T.text) + '</p>',
      buttons: (left > 0 ? [{ label: S.upd ? fill(T.laterN, { n: left }) : T.later, act: 'remind' }] : []).concat([{ label: T.now, act: 'now', cls: 'btn--primary' }]),
      on: function (act) {
        remove(e);
        if (act === 'remind') {
          S.upd = (S.upd || 0) + 1;
          saveS();
          track('onshift_incident', { kind: 'update', action: 'remind', n: S.upd });
          later(20000, function () { if (workOn() && !paused() && !modal && !formOpen()) fire('update'); });
        } else updateScreen();
      },
    });
  }
  function updateScreen() {
    if (modal) return;
    var T = O.update;
    var scr = el('os-update', '<div class="os-update__box"><span class="os-update__spin" aria-hidden="true"></span><p class="os-update__pct" data-pct>0%</p><p class="os-update__t" data-t>' + esc(T.working) + '</p><p class="os-update__d">' + esc(T.dont) + '</p><p class="os-update__skip">' + esc(T.skip) + '</p></div>');
    scr.setAttribute('role', 'dialog');
    scr.setAttribute('aria-modal', 'true');
    scr.setAttribute('aria-label', T.working);
    host.appendChild(scr);
    modal = { el: scr, veil: el('i'), kind: 'update', timers: [] };
    void scr.offsetWidth;
    scr.classList.add('is-in');
    var pct = qs('[data-pct]', scr), t0 = performance.now(), undoing = false;
    var done = function () { if (!modal || modal.kind !== 'update') return; closeModal(); toast(T.failed); };
    var iv = setInterval(function () {
      var s = (performance.now() - t0) / 1000;
      pct.textContent = Math.min(97, Math.round(97 * (1 - Math.exp(-s / 2.4)))) + '%';
      if (s > 7.5 && !undoing) {
        undoing = true;
        clearInterval(iv);
        qs('[data-t]', scr).textContent = T.undo;
        pct.textContent = '';
        modal.timers.push(setTimeout(done, 2600));
      }
    }, 120);
    modal.timers.push(iv);
    var key = function (ev) { if (ev.key === 'Escape') done(); };
    window.addEventListener('keydown', key);
    modal.cleanup = function () { window.removeEventListener('keydown', key); };
    track('onshift_incident', { kind: 'update', action: 'restart', level: level() });
  }

  function ghost() {
    var G = O.ghost;
    var n = slip({ size: 'xs', from: 'it', text: G.connected, kind: 'ghost', flick: false });
    later(3200, function () { remove(n); });
    var g = el('os-ghost', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3l14 9-6 1.5L9.5 20z"/></svg><span class="os-ghost__tag">' + esc(G.label) + '</span>');
    g.setAttribute('aria-hidden', 'true');
    host.appendChild(g);
    var x = innerWidth * 0.5, y = innerHeight * 0.5, hops = 0;
    var put = function () { g.style.transform = 'translate(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px)'; };
    put();
    void g.offsetWidth;
    g.classList.add('is-in');
    var hop = function () {
      if (!g.parentNode) return;
      var targets = qsa('a, button, input, [role="button"]').filter(function (t) {
        if (host.contains(t)) return false;
        var r = t.getBoundingClientRect();
        return r.width > 0 && r.top > 70 && r.bottom < innerHeight - 10 && r.left >= 0 && r.right <= innerWidth;
      });
      var r = targets.length && Math.random() < 0.8 ? targets[Math.floor(Math.random() * targets.length)].getBoundingClientRect() : null;
      x = r ? r.left + r.width * rnd(0.3, 0.7) : rnd(40, innerWidth - 40);
      y = r ? r.top + r.height * rnd(0.3, 0.7) : rnd(90, innerHeight - 40);
      put();
      later(950, function () { g.classList.remove('is-click'); void g.offsetWidth; g.classList.add('is-click'); });
      hops++;
      later(1250, hops < 8 ? hop : gone);
    };
    var gone = function () {
      g.classList.remove('is-in');
      setTimeout(function () { rm(g); }, 400);
      slip({
        size: 's', from: 'it', text: G.done, kind: 'ghost', aria: true,
        buttons: [{ label: G.no, act: 'no' }, { label: G.yes, act: 'yes', cls: 'btn--primary' }],
        on: function (act, b, e) { if (act === 'yes') finish(e, 'ghost', 'fixed'); else settle(e, 'ghost', G.retry, 2200); },
      });
    };
    later(600, hop);
    track('onshift_incident', { kind: 'ghost', action: 'connect', level: level() });
  }

  /* ------------------------------------------------------------------ Finance's offer, and the gauntlet */
  var OT = O.overtime;
  var hasReward = !!(O.reward && O.reward.percent && OT && qs('[data-os-claim]', host));
  function offer() {
    var e = slip({
      size: 'm', from: OT.offer.from, kind: 'offer', cls: 'os-slip--envelope', flick: false, aria: true,
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
  function dropHud() {
    if (!hudEl) return;
    var h = hudEl;
    hudEl = null;
    h.classList.remove('is-in');
    setTimeout(function () { rm(h); }, 400);
  }
  function giveUp() {
    S.stage = 0;
    S.stamps = 0;
    S.offerAt = S.t + 120;
    saveS();
    closeModal();
    dropHud();
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
    var c = stageCard('os-stage--printer', '<p class="os-stage__k">' + esc(OT.hud) + ' · 1/4</p><h2 class="os-stage__title">' + esc(P.title) + '</h2><p class="os-stage__how" data-how>' + esc(coarse ? P.how : P.how + ' ' + P.howKeys) + '</p><div class="os-printer"><div class="os-printer__slot"></div><div class="os-paper" data-os-paper tabindex="0"><span>' + esc(name('finance')) + '</span></div></div><p class="os-stage__meter"><i data-os-meter></i></p>');
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
      share.innerHTML = '<p class="os-share__who">' + esc(fill(M.sharing, { name: name('dana') })) + ' · ' + esc(fill(M.slideOf, { i: i + 1, n: n })) + '</p>' +
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
    var finishCatch = function () {
      if (caught) return;
      caught = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      e.classList.add('is-caught');
      setTimeout(function () { rm(e); closeModal(); stamped(4, K.done); }, 500);
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
      if (tired) return finishCatch();
      if (coarse) {
        jumps++;
        if (jumps >= 5) return giveIn();
        x = rnd(8, W() - w - 8); y = rnd(80, H() - h - 8);
        e.classList.remove('is-jump'); void e.offsetWidth; e.classList.add('is-jump');
        put();
      }
    });
    e.addEventListener('click', function () { if (tired) finishCatch(); });
    e.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      if (tired) return finishCatch();
      presses++;
      if (presses >= 5) giveIn();
      else { x = rnd(8, W() - w - 8); y = rnd(80, H() - h - 8); put(); }
    });
    window.addEventListener('pointermove', move);
    size();
    put();
    raf = requestAnimationFrame(frame);
    modal.cleanup = function () { cancelAnimationFrame(raf); window.removeEventListener('pointermove', move); rm(e); };
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
    dropHud();
    track('overtime_stage', { stage: 5, action: 'claim' });
    setTimeout(function () { try { qs('#os-claim-title', box).focus({ preventScroll: true }); } catch (e) {} }, 60);
  }
  var claimBox = qs('[data-os-claim]', host);
  if (claimBox) claimBox.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') ev.stopPropagation(); });
  // the email left: the code is theirs, Finance stops asking
  window.addEventListener('es:reward', function (e) {
    if (!(e.detail && O.reward && e.detail.reward === O.reward.tag)) return;
    L.overtime = new Date().toISOString();
    S.stage = 0;
    saveL(); saveS();
    track('overtime_stage', { stage: 5, action: 'claimed' });
  });

  /* ------------------------------------------------------------------ the way out: the switch in the header */
  function off() {
    // everything on the desk goes into the drawer
    pend.forEach(function (t) { clearTimeout(t); });
    pend = [];
    live.slice().forEach(function (e) { remove(e, 'is-drawer'); });
    live = [];
    if (modal && modal.kind === 'claim') { var m = modal; modal = null; m.el.classList.remove('is-in'); m.el.hidden = true; rm(m.veil); }
    else if (modal) closeModal();
    qsa('.os-lean, .os-rere, .os-flicker, .os-runner, .os-ghost', host).forEach(rm);
    shareStop(true);
    dropHud();
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
  // what can happen, from which level, how often (weight per level), how many times a visit
  var KINDS = {
    ping: { run: ping, w: [5, 4, 4] },
    email: { run: email, w: [3, 2, 2] },
    survey: { run: survey, w: [1, 2, 2], max: 10 },
    lunch: { run: lunch, w: [1, 1, 0], max: 1 },
    comment: { run: comment, w: [1, 1, 1], max: 2 },
    birthday: { run: birthday, w: [1, 1, 0], max: 1 },
    sys: { run: sysNote, w: [1, 1, 2], max: 4 },
    notice: { run: notice, w: [1, 1, 1], max: 5 },
    meeting: { run: meeting, w: [0, 2, 2], gate: function () { return S.t - S.meetAt >= 120 && !S.declined; } },
    lean: { run: lean, w: [0, 1, 1], light: true },
    flicker: { run: flicker, w: [0, 1, 1], light: true },
    spinner: { run: spinner, w: [0, 1, 1], light: true },
    twofa: { run: twofa, w: [0, 1, 1], max: 2 },
    conflict: { run: conflict, w: [0, 1, 1], max: 1 },
    status: { run: status, w: [0, 1, 1], max: 2 },
    policy: { run: policy, w: [0, 1, 1], max: 1 },
    training: { run: training, w: [0, 1, 1], max: 1 },
    desk: { run: desk, w: [0, 1, 1], max: 1 },
    share: { run: share, w: [0, 1, 1], max: 1, gate: function () { return !shareEl; } },
    typing: { run: typingNote, w: [0, 1, 1], max: 3, light: true },
    timesheet: { run: timesheet, w: [0, 1, 1], max: 2 },
    rere: { run: rere, w: [0, 0, 1], light: true },
    storm: { run: storm, w: [0, 0, 1], max: 1 },
    update: { run: update, w: [0, 0, 1], max: 1 },
    ghost: { run: ghost, w: [0, 0, 1], max: 1 },
    shadow: { run: shadow, w: [0, 0, 1], max: 2, light: true, gate: function () { return !coarse; } },
    offer: { run: offer, w: [0, 0, 0] },
  };
  function choose(lvl) {
    var bag = [];
    Object.keys(KINDS).forEach(function (k) {
      var d = KINDS[k], w = d.w[lvl - 1];
      if (!w) return;
      if (d.max && (S.seen[k] || 0) >= d.max) return;
      if (d.gate && !d.gate()) return;
      if (live.length >= 3 && !d.light) return; // the desk is full: only the things that aren't slips
      for (var i = 0; i < w; i++) bag.push(k);
    });
    if (!bag.length) bag = live.length >= 3 ? ['flicker'] : ['ping'];
    return pick(bag, S.last);
  }
  function fire(kindWanted) {
    var lvl = level();
    var kind = kindWanted;
    if (!kind) {
      if (hasReward && !L.overtime && lvl === 3 && S.stage === 0 && S.t >= S.offerAt && (S.dismissed >= 6 || S.t >= 180)) kind = 'offer';
      else if (S.forced && S.t >= S.forced) { S.forced = 0; saveS(); return ring(); }
      else kind = choose(lvl);
    }
    if (!KINDS[kind]) return;
    S.last = kind;
    S.shown++;
    S.seen[kind] = (S.seen[kind] || 0) + 1;
    shownHere++;
    saveS();
    track('onshift_incident', { kind: kind, action: 'show', level: lvl, t: S.t });
    KINDS[kind].run();
    saveL();
    // the absurd level comes in bursts: something small right behind the thing itself
    if (lvl === 3 && !kindWanted && Math.random() < 0.4 && kind !== 'storm' && kind !== 'update' && kind !== 'offer') {
      later(1800, function () {
        if (!workOn() || paused() || modal || formOpen()) return;
        var k2 = pick(['sys', 'typing', 'ping', 'shadow'].filter(function (k) { return !(KINDS[k].gate && !KINDS[k].gate()); }));
        fire(k2);
      });
    }
  }
  function gap() {
    var lvl = level();
    return Math.round(lvl === 1 ? rnd(24, 34) : lvl === 2 ? rnd(16, 24) : rnd(10, 16));
  }
  function tick() {
    if (!workOn() || paused()) return;
    S.t++;
    if (S.t % 5 === 0) saveS();
    if (modal || formOpen() || shownHere >= CAP) return;
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

  // for testing: ES.onshift.fire('meeting'), .survey('engagement'), .compose(0), .gauntlet(2), .level(), .state()
  ES.onshift = {
    fire: function (k) { if (KINDS[k]) fire(k); else if (k === 'call') call({ force: true }); else if (k === 'ring') ring(); },
    survey: function (id) { var sv = O.surveys.filter(function (x) { return x.id === id; })[0]; if (sv) surveyForm(sv); },
    email: function (i) { email(Mm.items[i || 0], 0); },
    compose: function (i) { compose(Mm.items[i || 0], 0); },
    gauntlet: function (n) { gauntlet(n || 1); },
    level: level,
    kinds: function () { return Object.keys(KINDS); },
    state: function () { return { S: S, L: L, live: live.length, modal: modal ? modal.kind : null, paused: paused(), form: formOpen(), share: !!shareEl }; },
    jump: function (t, next) { S.t = t; S.next = next == null ? t : next; saveS(); },
    clear: function () { live.slice().forEach(rm); live = []; if (modal && modal.kind !== 'claim') closeModal(); shareStop(true); qsa('.os-ghost, .os-lean, .os-runner', host).forEach(rm); },
  };
})();
