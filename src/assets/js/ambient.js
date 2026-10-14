/* ENDSHIFT ambient light. A fixed canvas behind the page: out-of-focus lights whose colour,
   speed and density follow where you are in the evening. On the home page that runs from
   office fluorescent → streetlights from the bus → hallway → lamplight → night, and the
   lights slow down as you scroll. Other pages hold one calm scene.
   Also: reading-progress line, the home "evening rail", reveals, scroll-linked progress. */
(function () {
  'use strict';
  var ES = window.ES || {};
  var root = document.documentElement;
  var main = document.querySelector('main');
  var page = (main && main.getAttribute('data-page')) || 'home';

  var hex = function (h) {
    h = h.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  var lerp = function (a, b, t) {
    return a + (b - a) * t;
  };
  var mixc = function (a, b, t) {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  };
  var css = function (c) {
    return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
  };
  var clamp = function (x, a, b) {
    return x < a ? a : x > b ? b : x;
  };

  // A "light key": background, three light colours, how many/strong/fast/big the lights are, stars
  var K = {
    office: { top: '#0e1316', bot: '#0f1214', c: ['#cde7ea', '#9fc4cf', '#e9efe9'], a: 0.11, speed: 0.022, size: 0.8, stars: 0 },
    street: { top: '#0c0e13', bot: '#130f0c', c: ['#e8913f', '#f2b35e', '#c75a3d'], a: 0.17, speed: 0.085, size: 1.05, stars: 0 },
    hallway: { top: '#120f0d', bot: '#15110d', c: ['#f2a84b', '#e9d8bd', '#c98a4a'], a: 0.12, speed: 0.016, size: 1.2, stars: 0 },
    lamp: { top: '#14100c', bot: '#17120d', c: ['#f2a84b', '#d9772f', '#f6c98a'], a: 0.11, speed: 0.008, size: 1.35, stars: 0 },
    night: { top: '#0a0c13', bot: '#0d0b10', c: ['#9fb3d9', '#f2a84b', '#6f7fa8'], a: 0.06, speed: 0.003, size: 1.1, stars: 1 },
    dusk: { top: '#0d0f18', bot: '#1a120d', c: ['#f2a84b', '#d98a52', '#8a7fb0'], a: 0.09, speed: 0.006, size: 1.3, stars: 0.4 },
    workshop: { top: '#101113', bot: '#15110d', c: ['#f2a84b', '#e8913f', '#cde7ea'], a: 0.09, speed: 0.01, size: 1.1, stars: 0 },
    quiet: { top: '#0f1112', bot: '#110f0e', c: ['#f2a84b', '#cde7ea', '#d8d4ca'], a: 0.045, speed: 0.006, size: 1.2, stars: 0 },
  };

  // [scroll position 0..1, key]
  var SCENES = {
    home: [[0, 'office'], [0.13, 'street'], [0.3, 'street'], [0.42, 'hallway'], [0.58, 'lamp'], [0.8, 'night'], [1, 'night']],
    reset: [[0, 'hallway'], [0.5, 'lamp'], [1, 'night']],
    batch: [[0, 'workshop'], [1, 'lamp']],
    story: [[0, 'office'], [0.35, 'street'], [0.7, 'lamp'], [1, 'night']],
    formula: [[0, 'quiet'], [1, 'workshop']],
    ritual: [[0, 'dusk'], [1, 'night']],
    '404': [[0, 'office'], [1, 'office']],
  };
  var scene = SCENES[page] || [[0, 'quiet'], [1, 'quiet']];

  function keyAt(p) {
    for (var i = 1; i < scene.length; i++) {
      if (p <= scene[i][0]) {
        var a = scene[i - 1], b = scene[i];
        var t = b[0] === a[0] ? 1 : (p - a[0]) / (b[0] - a[0]);
        t = t * t * (3 - 2 * t);
        var A = K[a[1]], Bk = K[b[1]];
        return {
          top: mixc(hex(A.top), hex(Bk.top), t),
          bot: mixc(hex(A.bot), hex(Bk.bot), t),
          c: [0, 1, 2].map(function (k) { return mixc(hex(A.c[k]), hex(Bk.c[k]), t); }),
          a: lerp(A.a, Bk.a, t),
          speed: lerp(A.speed, Bk.speed, t),
          size: lerp(A.size, Bk.size, t),
          stars: lerp(A.stars, Bk.stars, t),
        };
      }
    }
    return keyAt(scene[scene.length - 1][0] - 0.0001);
  }

  /* ------------------------------------------------------------ canvas */
  var canvas = document.createElement('canvas');
  canvas.className = 'ambient';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(canvas, document.body.firstChild);
  var g = canvas.getContext('2d', { alpha: false });
  if (!g) return;
  root.classList.add('has-ambient');

  var SCALE = 0.5; // half resolution: cheaper, and naturally soft
  var W = 0, H = 0;
  function resize() {
    W = Math.max(1, Math.round(window.innerWidth * SCALE));
    H = Math.max(1, Math.round(window.innerHeight * SCALE));
    canvas.width = W;
    canvas.height = H;
    draw(true);
  }

  var seed = 7;
  var rnd = function () {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  var orbs = [];
  for (var i = 0; i < 30; i++) orbs.push({ x: rnd() * 1.3, y: rnd(), r: 0.35 + rnd() * 1, d: 0.3 + rnd() * 0.9, c: i % 3, ph: rnd() * 6.28, f: 0.4 + rnd() * 0.6 });
  var stars = [];
  for (var s = 0; s < 90; s++) stars.push({ x: rnd(), y: rnd() * 0.75, z: 0.5 + rnd(), ph: rnd() * 6.28 });

  var sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  (function () {
    var sg = sprite.getContext('2d');
    var gr = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.45, 'rgba(255,255,255,0.35)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    sg.fillStyle = gr;
    sg.fillRect(0, 0, 64, 64);
  })();
  var tinted = {};
  function tint(c) {
    var key = (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0);
    if (tinted[key]) return tinted[key];
    var t = document.createElement('canvas');
    t.width = t.height = 64;
    var tg = t.getContext('2d');
    tg.drawImage(sprite, 0, 0);
    tg.globalCompositeOperation = 'source-in';
    tg.fillStyle = css(c);
    tg.fillRect(0, 0, 64, 64);
    var keys = Object.keys(tinted);
    if (keys.length > 120) tinted = {};
    tinted[key] = t;
    return t;
  }

  var progress = 0;
  var T = 0; // accumulated motion time (advances by each key's speed)
  var lastNow = performance.now();
  var still = function () {
    return !!(ES.reducedMotion && ES.reducedMotion());
  };

  // Work mode off (the switch): every page leans toward lamplight. On the home page the top,
  // where the office light was, turns fully to lamp; further down the evening shows through.
  var offTarget = root.getAttribute('data-shift') === 'off' ? 1 : 0;
  var offMix = offTarget;
  window.addEventListener('es:shift', function (e) {
    offTarget = e.detail && e.detail.off ? 1 : 0;
    dirty = true;
  });
  var offAmount = function () {
    if (page === 'home') return 0.4 + 0.6 * (1 - Math.min(1, progress / 0.25));
    return page === 'ritual' ? 0.25 : 0.5;
  };
  function blendKey(a, b, t) {
    return {
      top: mixc(a.top, b.top, t), bot: mixc(a.bot, b.bot, t),
      c: [0, 1, 2].map(function (k) { return mixc(a.c[k], b.c[k], t); }),
      a: lerp(a.a, b.a, t), speed: lerp(a.speed, b.speed, t), size: lerp(a.size, b.size, t), stars: lerp(a.stars, b.stars, t),
    };
  }
  var LAMP = null;
  function draw() {
    var k = keyAt(progress);
    if (offMix > 0.001) {
      if (!LAMP) LAMP = { top: hex(K.lamp.top), bot: hex(K.lamp.bot), c: K.lamp.c.map(hex), a: K.lamp.a, speed: K.lamp.speed, size: K.lamp.size, stars: K.lamp.stars };
      k = blendKey(k, LAMP, offMix * offAmount());
    }
    var calm = root.getAttribute('data-calm') === 'on';
    var bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, css(k.top));
    bg.addColorStop(1, css(k.bot));
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    var unit = Math.max(W, H);
    var alpha = k.a * (calm ? 0.55 : 1);
    for (var i = 0; i < orbs.length; i++) {
      var o = orbs[i];
      var x = ((((o.x - T * o.d) % 1.3) + 1.3) % 1.3) - 0.15;
      var y = o.y + Math.sin(T * 0.6 + o.ph) * 0.02;
      var r = unit * 0.09 * o.r * k.size * (0.7 + 0.3 * o.d);
      var a = alpha * o.f * (0.75 + 0.25 * Math.sin(T * 1.7 + o.ph));
      if (a < 0.004) continue;
      g.globalAlpha = a;
      g.drawImage(tint(k.c[o.c]), x * W - r, y * H - r, r * 2, r * 2);
    }
    g.globalAlpha = 1;
    if (k.stars > 0.02) {
      g.fillStyle = '#f3f0e8';
      for (var s = 0; s < stars.length; s++) {
        var st = stars[s];
        g.globalAlpha = k.stars * 0.5 * st.z * (still() ? 0.8 : 0.65 + 0.35 * Math.sin(T * 0.9 + st.ph)) * (1 - st.y);
        g.fillRect(st.x * W, st.y * H, st.z, st.z);
      }
      g.globalAlpha = 1;
    }
    currentKey = k;
  }
  var currentKey = null;

  /* ------------------------------------------------- scroll + progress line */
  var bar = document.createElement('div');
  bar.className = 'read-progress';
  bar.setAttribute('aria-hidden', 'true');
  var header = document.querySelector('.site-header');
  if (header) header.appendChild(bar);

  var rail = null;
  var railTime = null;
  var EVE_FROM = 17 * 60 + 30, EVE_TO = 23 * 60 + 45;
  if (page === 'home') {
    rail = document.createElement('div');
    rail.className = 'evening-rail';
    rail.setAttribute('aria-hidden', 'true');
    rail.innerHTML = '<span class="evening-rail__line"><span class="evening-rail__fill"></span></span><span class="evening-rail__mark"><span class="evening-rail__time">17:30</span></span>';
    document.body.appendChild(rail);
    railTime = rail.querySelector('.evening-rail__time');
  }

  function readScroll() {
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    progress = clamp((window.scrollY || window.pageYOffset) / max, 0, 1);
    root.style.setProperty('--page-p', progress.toFixed(4));
    if (railTime) {
      var m = Math.round(lerp(EVE_FROM, EVE_TO, progress) / 5) * 5;
      var hh = Math.floor(m / 60) % 24, mm = m % 60;
      railTime.textContent = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
    }
  }

  /* --------------------------------------------------- animation loop */
  var dirty = true;
  var visible = true;
  var lastDraw = 0;
  // Save the battery: the lights stop drifting after 25 s without any input (they pick up
  // again on the next scroll or tap), and nothing is drawn while the game fills the screen.
  var IDLE_MS = 25000;
  var lastInput = performance.now();
  var covered = false;
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, function () { lastInput = performance.now(); }, { passive: true });
  });
  var cover = document.querySelector('[data-game]');
  if (cover && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      var was = covered;
      covered = en[0].intersectionRatio > 0.92;
      if (was && !covered) dirty = true;
    }, { threshold: [0, 0.5, 0.92, 1] }).observe(cover);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || covered || root.classList.contains('immersive-open')) {
      lastNow = now;
      return;
    }
    var dt = Math.min(0.1, (now - lastNow) / 1000);
    lastNow = now;
    var moving = !still() && now - lastInput < IDLE_MS;
    if (moving && currentKey) T += dt * currentKey.speed * 2;
    if (Math.abs(offMix - offTarget) > 0.001) {
      offMix += (offTarget - offMix) * Math.min(1, dt * (moving ? (offTarget ? 1.1 : 2.4) : 20));
      dirty = true;
    }
    // ~30 fps is plenty for slow light
    if ((moving && now - lastDraw > 33) || dirty) {
      lastDraw = now;
      dirty = false;
      draw();
    }
  }
  window.addEventListener('scroll', function () {
    readScroll();
    lastInput = performance.now();
    dirty = true;
  }, { passive: true });
  window.addEventListener('resize', function () {
    resize();
    readScroll();
  });
  document.addEventListener('visibilitychange', function () {
    visible = document.visibilityState === 'visible';
    lastNow = performance.now();
  });
  window.addEventListener('es:calm', function () {
    dirty = true;
  });
  readScroll();
  resize();
  requestAnimationFrame(frame);

  /* ==============================================================
     Reveals + scroll-linked progress (only when motion is allowed)
     ============================================================== */

  var REVEAL = [
    'main .section h2',
    'main .page-intro__lead',
    'main .lead',
    'main .recog__lines span',
    'main .idea__coda span',
    'main .how__item',
    'main .specs__row',
    'main .isnt__col',
    'main .faq__item',
    'main .timeline__item',
    'main .ingredient',
    'main .guide__point',
    'main .use-steps li',
    'main .rules li',
    'main .outcome',
    'main .benefits li',
    'main .state',
    'main .post-row',
    'main .planned li',
    'main .label-list li',
    'main .meter',
    'main .stage',
    'main .foundercard-wrap',
    'main .care-note',
    'main .cta-row',
    'main .signup',
    'main .guide__phases li',
  ].join(',');

  function setupReveals() {
    if (!root.classList.contains('motion-ok') || !('IntersectionObserver' in window)) return;
    var vh = window.innerHeight;
    var items = Array.prototype.slice.call(document.querySelectorAll(REVEAL)).filter(function (el) {
      if (el.closest('[data-hero], .immersive, [data-commute] .slips, [data-progress="track"], [hidden]')) return false;
      return el.getBoundingClientRect().top > vh * 0.92; // only what starts below the fold: no flash
    });
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('is-in');
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    var lastParent = null, n = 0;
    items.forEach(function (el) {
      var isHead = /^H[1-3]$/.test(el.tagName) && (el.classList.contains('display') || el.classList.contains('section-title') || el.classList.contains('faq__group-title'));
      el.setAttribute('data-reveal', isHead ? 'focus' : 'rise');
      n = el.parentElement === lastParent ? n + 1 : 0;
      lastParent = el.parentElement;
      if (n) el.style.transitionDelay = Math.min(n, 6) * 70 + 'ms';
      io.observe(el);
    });
    // safety: anything still hidden after the page settles gets shown when the user is near it
    window.addEventListener('es:calm', function (e) {
      if (e.detail && e.detail.on) items.forEach(function (el) { el.classList.add('is-in'); });
    });
  }

  // Elements with [data-progress] get --p (0 → 1) as they travel through the viewport.
  // Children with [data-at="0.4"] get .is-lit once --p passes that value.
  // data-progress="track": children [data-track-item] light up as a line fills down the element.
  var progEls = [];
  function setupProgress() {
    progEls = Array.prototype.slice.call(document.querySelectorAll('[data-progress]'));
    if (!progEls.length) return;
    var ticking = false;
    var update = function () {
      ticking = false;
      var vh = window.innerHeight;
      progEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var mode = el.getAttribute('data-progress');
        var p;
        if (mode === 'track') {
          var fillPx = clamp(vh * 0.6 - r.top, 0, r.height);
          el.style.setProperty('--fill', fillPx.toFixed(0) + 'px');
          Array.prototype.forEach.call(el.querySelectorAll('[data-track-item]'), function (it) {
            it.classList.toggle('is-lit', it.offsetTop < fillPx);
          });
          return;
        }
        if (mode === 'center') p = clamp((vh - r.top) / (vh * 0.5 + r.height * 0.5), 0, 1);
        else p = clamp((vh * 0.85 - r.top) / (r.height * 0.9 + vh * 0.15), 0, 1);
        el.style.setProperty('--p', p.toFixed(3));
        Array.prototype.forEach.call(el.querySelectorAll('[data-at]'), function (it) {
          it.classList.toggle('is-lit', p >= parseFloat(it.getAttribute('data-at')));
        });
      });
    };
    var onScroll = function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ---------------------- the commute: horizontal scroll pinned to vertical scroll */
  function setupCommute() {
    var wrap = document.querySelector('[data-commute]');
    if (!wrap) return;
    var track = wrap.querySelector('.slips');
    if (!track) return;
    var clockEl = wrap.querySelector('[data-commute-clock]');
    var times = Array.prototype.map.call(track.querySelectorAll('.slip__time'), function (n) { return n.textContent.trim(); });
    var enabled = false;
    // On touch screens up to tablet size the row just swipes sideways (native, snapping);
    // pinning it to the vertical scroll is for mice and trackpads.
    var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    var native = function () { return coarse && window.innerWidth < 1020; };
    track.addEventListener('scroll', function () {
      if (enabled || !clockEl || !times.length) return;
      var max = Math.max(1, track.scrollWidth - track.clientWidth);
      var t = times[Math.min(times.length - 1, Math.round((track.scrollLeft / max) * (times.length - 1)))];
      if (clockEl.textContent !== t) clockEl.textContent = t;
    }, { passive: true });
    var layout = function () {
      var ok = root.classList.contains('motion-ok') && window.innerWidth >= 360 && !native();
      wrap.classList.toggle('is-pinned', ok);
      enabled = ok;
      if (!ok) {
        wrap.style.height = '';
        track.style.transform = '';
        return;
      }
      var extra = Math.max(0, track.scrollWidth - window.innerWidth);
      wrap.style.setProperty('--extra', extra + 'px');
      wrap.style.height = 'calc(100vh + ' + extra + 'px)';
      move();
    };
    var move = function () {
      if (!enabled) return;
      var r = wrap.getBoundingClientRect();
      var extra = Math.max(0, track.scrollWidth - window.innerWidth);
      var span = Math.max(1, r.height - window.innerHeight);
      var p = clamp(-r.top / span, 0, 1);
      track.style.transform = 'translate3d(' + (-p * extra).toFixed(1) + 'px,0,0)';
      wrap.style.setProperty('--p', p.toFixed(3));
      if (clockEl && times.length) {
        var t = times[Math.min(times.length - 1, Math.round(p * (times.length - 1)))];
        if (clockEl.textContent !== t) clockEl.textContent = t;
      }
    };
    window.addEventListener('scroll', move, { passive: true });
    window.addEventListener('resize', layout);
    window.addEventListener('es:calm', layout);
    layout();
  }

  /* ---------------------------------------- count up numbers when they appear */
  function setupCounters() {
    if (!root.classList.contains('motion-ok') || !('IntersectionObserver' in window)) return;
    Array.prototype.forEach.call(document.querySelectorAll('[data-meter]'), function (m) {
      var num = m.querySelector('[data-founder-count]');
      var bar = m.querySelector('[role="progressbar"]');
      if (!num || m.getBoundingClientRect().top < window.innerHeight) return;
      var target = parseInt(num.textContent, 10) || 0;
      var pct = bar ? bar.style.getPropertyValue('--pct') : '';
      num.textContent = '0';
      if (bar) bar.style.setProperty('--pct', '0%');
      var io = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        io.disconnect();
        if (bar) bar.style.setProperty('--pct', pct);
        var t0 = performance.now();
        var step = function (now) {
          var k = Math.min(1, (now - t0) / 1400);
          num.textContent = String(Math.round(target * (1 - Math.pow(1 - k, 3))));
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }, { threshold: 0.4 });
      io.observe(m);
    });
  }

  setupReveals();
  setupProgress();
  setupCommute();
  setupCounters();
})();
