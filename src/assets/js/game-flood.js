/* ENDSHIFT game: the message flood.
   A work chat after hours. Messages come faster and faster. In the corner there's a tiny
   switch, your patience. Every message makes it bigger, until it fills the screen and you
   press it, if only to make it stop. Replying only brings more. */
(function () {
  'use strict';

  var ES = (window.ES = window.ES || {});
  ES.games = ES.games || {};

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  function switchHtml(api) {
    var S = (api.strings && api.strings.shift) || {};
    return '<span class="wallswitch wallswitch--game" aria-hidden="true"><span class="wallswitch__glow"></span><span class="wallswitch__plate"><span class="wallswitch__mark wallswitch__mark--on">' + (S.markOn || 'Work') + '</span><span class="wallswitch__well"><span class="wallswitch__rocker"><span class="wallswitch__half wallswitch__half--top"></span><span class="wallswitch__half wallswitch__half--bot"></span><span class="wallswitch__led"></span></span></span><span class="wallswitch__mark wallswitch__mark--off">' + (S.markOff || 'Off') + '</span></span></span>';
  }
  ES.gameSwitchHtml = switchHtml;

  ES.games.flood = function (host, api) {
    var C = api.data.chat;
    if (!C) return null;
    var reduced = api.reduced;

    var root = document.createElement('div');
    root.className = 'gf';
    var initial = (C.title || '?').trim().charAt(0).toUpperCase();
    root.innerHTML =
      '<div class="gf__room" aria-hidden="true"><i class="gf__glow"></i><i class="gf__desk"></i></div>' +
      '<div class="gf__phone">' +
      '<div class="gf__status" aria-hidden="true"><span data-gf-time>' + esc(api.clock()) + '</span><span class="gf__icons"><i></i><i></i><b>12%</b></span></div>' +
      '<div class="gf__head" aria-hidden="true"><span class="gf__avatar">' + esc(initial) + '</span><span class="gf__who"><b>' + esc(C.title) + '</b><small data-gf-status>' + esc(C.status) + '</small></span><span class="gf__badge" data-gf-badge hidden>0</span></div>' +
      '<div class="gf__banners" data-gf-banners></div>' +
      '<div class="gf__log" data-gf-log aria-hidden="true"></div>' +
      '<div class="gf__bar"><button type="button" class="gf__reply" data-gf-reply><span>' + esc(C.reply) + '…</span></button><span class="gf__slot" data-gf-slot></span></div>' +
      '</div>' +
      '<button type="button" class="gf__switch" data-gf-switch aria-label="' + esc(api.hud.switchLabel) + '"><span class="gf__switch-in">' + switchHtml(api) + '</span><span class="gf__patience" data-gf-patience>' + esc(C.patience[0]) + '</span></button>' +
      '<div class="gf__arrows" aria-hidden="true"><i></i><i></i><i></i></div>';
    host.appendChild(root);

    // the room it's happening in, drawn behind the phone (when the browser can)
    var still = ES.inkStill ? ES.inkStill(root.querySelector('.gf__room'), api.scene, api) : null;
    var log = root.querySelector('[data-gf-log]');
    var phoneEl = root.querySelector('.gf__phone');
    var sw = root.querySelector('[data-gf-switch]');
    var slot = root.querySelector('[data-gf-slot]');
    var badge = root.querySelector('[data-gf-badge]');
    var statusEl = root.querySelector('[data-gf-status]');
    var banners = root.querySelector('[data-gf-banners]');
    var timeEl = root.querySelector('[data-gf-time]');
    var arrows = root.querySelector('.gf__arrows');

    var n = 0, unread = 0, timer = 0, typingT = 0, paused = true, ended = false, extra = 0, floor = 0;
    var t0 = 0, playMs = 0;

    /* The switch grows with the pile of messages ---------------------------------------- */
    var growth = 0;
    function place() {
      var R = root.getBoundingClientRect();
      var S = slot.getBoundingClientRect();
      if (!R.width) return;
      var g = growth;
      var e = g * g * (3 - 2 * g); // smooth
      var Pr = phoneEl.getBoundingClientRect();
      var ax = S.left - R.left + S.width / 2, ay = S.top - R.top + S.height / 2;
      // it grows over the chat itself: that's what it's switching off
      var cx = Pr.left - R.left + Pr.width / 2, cy = Pr.top - R.top + Pr.height * 0.46;
      var base = 95; // the switch is 9.5em tall at --sw 10px
      var s0 = S.height / base;
      var s1 = Math.min(Pr.height * 0.5, Pr.width * 0.66, R.height * 0.5) / base;
      var s = s0 + (s1 - s0) * Math.pow(e, 1.25);
      var x = ax + (cx - ax) * Math.pow(e, 1.6);
      var y = ay + (cy - ay) * Math.pow(e, 1.6);
      sw.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-50%) scale(' + s.toFixed(3) + ')';
      sw.style.setProperty('--inv', (1 / s).toFixed(3));
      var label = C.patience[g > 0.86 ? 3 : g > 0.6 ? 2 : g > 0.3 ? 1 : 0];
      var pl = sw.querySelector('[data-gf-patience]');
      if (pl.textContent !== label) pl.textContent = label;
      root.classList.toggle('is-big', g > 0.6);
      root.classList.toggle('is-huge', g > 0.86);
      if (arrows.classList.contains('is-on')) placeArrows(x, y, s * base);
    }
    function grow() {
      var byCount = n / 24;
      var byTime = playMs / 50000;
      growth = clamp(Math.max(floor, byCount + byTime * 0.5), 0, 1);
      place();
    }
    function placeArrows(x, y, h) {
      arrows.style.transform = 'translate(' + x.toFixed(0) + 'px,' + (y - h * 0.5 - 18).toFixed(0) + 'px)';
    }

    /* Messages ---------------------------------------------------------------------------- */
    function next() {
      if (paused || ended) return;
      var gap = Math.max(260, 2300 * Math.pow(0.86, n + extra));
      var m = n < C.msgs.length ? C.msgs[n] : [C.msgs[n % 3][0], C.spam[(n * 7) % C.spam.length]];
      statusEl.textContent = C.typing;
      typingT = setTimeout(function () {
        if (paused || ended) return;
        statusEl.textContent = C.status;
        add(m[0], m[1], false);
        if (n % 4 === 3 && C.banners && C.banners.length) banner(C.banners[Math.floor(n / 4) % C.banners.length]);
        timer = setTimeout(next, gap * 0.45);
      }, Math.min(900, gap * 0.55));
    }
    function add(who, text, mine) {
      var b = document.createElement('div');
      b.className = 'gf__msg' + (mine ? ' gf__msg--mine' : '');
      b.innerHTML = (mine ? '' : '<b>' + esc(who) + '</b>') + '<span>' + esc(text) + '</span><small>' + esc(api.clock()) + '</small>';
      log.appendChild(b);
      while (log.children.length > 40) log.removeChild(log.firstChild);
      log.scrollTop = log.scrollHeight;
      if (!mine) {
        n++;
        unread++;
        badge.hidden = false;
        badge.textContent = unread > 99 ? '99+' : String(unread);
        phoneEl.classList.toggle('is-frantic', !reduced && n > 9);
        phoneEl.classList.remove('is-shake');
        if (!reduced && n > 6) {
          void phoneEl.offsetWidth;
          phoneEl.classList.add('is-shake');
        }
        api.sfx(n % 3 === 0 ? 'buzz' : 'blip', n % 4);
        grow();
      }
      timeEl.textContent = api.clock();
    }
    function banner(bn) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'gf__banner';
      el.tabIndex = -1;
      el.innerHTML = '<b>' + esc(bn[0]) + '</b><span>' + esc(bn[1]) + '</span>';
      banners.appendChild(el);
      requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('is-in'); }); });
      setTimeout(function () { dropBanner(el); }, 3800);
    }
    function dropBanner(el) {
      if (!el.parentNode) return;
      el.classList.remove('is-in');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 450);
    }

    /* Things you can do ---------------------------------------------------------------------- */
    root.addEventListener('click', function (e) {
      if (ended) return;
      api.interacted();
      if (e.target.closest('[data-gf-switch]')) return flip();
      if (e.target.closest('[data-gf-reply]')) {
        api.touch('reply', 'object');
        api.sfx('tap');
        add(C.you, C.reply, true);
        extra += 3;
        api.say(C.replyLine);
        (C.replyBack || []).forEach(function (r, i) {
          setTimeout(function () { if (!ended) add(C.msgs[0][0], r, false); }, 500 + i * 420);
        });
        return;
      }
      var bn = e.target.closest('.gf__banner');
      if (bn) {
        api.touch('banner', 'object');
        api.sfx('tap');
        dropBanner(bn);
        api.say(C.bannerLine);
        return;
      }
      var msg = e.target.closest('.gf__msg');
      if (msg && !msg.classList.contains('gf__msg--mine')) {
        api.touch('message', 'object');
        api.sfx('tap');
        msg.classList.add('is-seen');
        unread = 0;
        badge.hidden = true;
        api.say(C.seenLine);
      }
    });

    function assist(level) {
      root.classList.add('assist-' + level);
      if (level >= 1) sw.classList.add('is-calling');
      if (level >= 2) {
        floor = Math.max(floor, 0.42);
        arrows.classList.add('is-on');
      }
      if (level >= 3) floor = Math.max(floor, 0.75);
      if (level >= 4) floor = 1;
      grow();
    }

    function flip() {
      if (ended) return;
      ended = true;
      clearTimeout(timer);
      clearTimeout(typingT);
      sw.querySelector('.wallswitch').classList.add('is-flipped');
      sw.disabled = true;
      arrows.classList.remove('is-on');
      api.win({ how: 'switch', messages: n });
    }

    // lights out: the phone goes dark, a beat, then the curtain
    function outro(prepare, done) {
      var wait = function (ms, f) { setTimeout(f, reduced ? Math.min(ms, 300) : ms); };
      wait(380, function () {
        root.classList.add('is-dark');
        if (still) still.set({ dark: 1, warm: 1 });
      });
      wait(1650, function () {
        prepare();
        if (reduced || !ES.gameFx) {
          root.classList.add('is-fading');
          setTimeout(done, 650);
          return;
        }
        api.sfx('sweep', 1.8);
        ES.gameFx.curtain(root, done);
      });
    }

    function switchTarget() {
      place();
      var r = slot.getBoundingClientRect();
      return { visible: true, x: r.left + r.width / 2, y: r.top + r.height / 2, size: r.height };
    }

    var tick = 0;
    function start() {
      paused = false;
      t0 = performance.now();
      clearInterval(tick);
      tick = setInterval(function () {
        if (paused || ended) return;
        playMs += 500;
        grow();
      }, 500);
      timer = setTimeout(next, 700);
    }
    function pause(on) {
      if (ended) return;
      if (on === paused) return;
      paused = on;
      clearTimeout(timer);
      clearTimeout(typingT);
      statusEl.textContent = C.status;
      if (!on) timer = setTimeout(next, 600);
    }
    function onResize() { place(); }
    window.addEventListener('resize', onResize);
    function destroy() {
      ended = true;
      clearTimeout(timer);
      clearTimeout(typingT);
      clearInterval(tick);
      window.removeEventListener('resize', onResize);
      if (still) still.destroy();
      if (root.parentNode) root.parentNode.removeChild(root);
    }
    requestAnimationFrame(place);

    return { kind: 'flood', assistAt: [9000, 17000, 26000, 36000], start: start, assist: assist, outro: outro, pause: pause, destroy: destroy, switchTarget: switchTarget };
  };
})();
