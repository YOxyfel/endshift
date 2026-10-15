/* ENDSHIFT site script. No dependencies. Every feature is progressive:
   the page is complete and usable before this runs. */
(function () {
  'use strict';

  var root = document.documentElement;
  var cfgEl = document.getElementById('es-config');
  var CFG = {};
  try {
    CFG = JSON.parse(cfgEl ? cfgEl.textContent : '{}');
  } catch (e) {}
  var S = CFG.strings || {};
  var A = CFG.analytics || { provider: 'none' };

  var qs = function (sel, el) { return (el || document).querySelector(sel); };
  var qsa = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  var reducedMotion = function () {
    return root.getAttribute('data-calm') === 'on' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  };

  /* Toast ------------------------------------------------------------------ */
  var toastEl = qs('[data-toast]');
  var toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-visible'); }, 2600);
  }

  /* Analytics ----------------------------------------------------------------
     One function for every event. Providers are swapped in site.config.js.    */
  var CONSENT_KEY = 'es:consent-analytics';
  var providerLoaded = false;

  function inject(src, attrs) {
    var s = document.createElement('script');
    s.src = src;
    s.defer = true;
    Object.keys(attrs || {}).forEach(function (k) { s.setAttribute(k, attrs[k]); });
    document.head.appendChild(s);
  }

  function loadProvider() {
    if (providerLoaded) return;
    if (A.provider === 'plausible' && A.domain) {
      window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
      inject('https://plausible.io/js/script.js', { 'data-domain': A.domain });
      providerLoaded = true;
    } else if (A.provider === 'umami' && A.scriptUrl && A.websiteId) {
      inject(A.scriptUrl, { 'data-website-id': A.websiteId });
      providerLoaded = true;
    } else if (A.provider === 'ga4' && A.websiteId && store.get(CONSENT_KEY) === 'yes') {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', A.websiteId, { anonymize_ip: true });
      inject('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(A.websiteId));
      providerLoaded = true;
    }
  }

  // the visitor's experiment variants ride along with every event (x_<name>: <variant>)
  var expProps = {};
  Array.prototype.forEach.call(root.attributes, function (a) {
    if (a.name.indexOf('data-exp-') === 0) expProps['x_' + a.name.slice(9)] = a.value;
  });
  function track(name, props) {
    props = props || {};
    props.locale = CFG.locale;
    for (var xk in expProps) props[xk] = expProps[xk];
    if (A.debug) console.info('[ENDSHIFT track]', name, props);
    try {
      if (A.provider === 'plausible' && window.plausible) window.plausible(name, { props: props });
      else if (A.provider === 'umami' && window.umami) window.umami.track(name, props);
      else if (A.provider === 'ga4' && window.gtag && providerLoaded) window.gtag('event', name, props);
    } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('es:track', { detail: { name: name, props: props } })); } catch (e) {}
  }

  // A device that asks to save data, or has little memory: drawn pictures instead of live 3D
  // where there's a picture to show (story panels), lighter drawing elsewhere
  var lowPower = (function () {
    try {
      if (navigator.connection && navigator.connection.saveData) return true;
      if (navigator.deviceMemory && navigator.deviceMemory <= 2) return true;
      if (/[?&]lite\b/.test(location.search)) return true;
    } catch (e) {}
    return false;
  })();
  if (lowPower) root.classList.add('low-power');
  // A small Android phone (little memory, few cores) draws the live rooms a little less sharp
  var lowEnd = lowPower || (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
  var dprCap = function (cap) { return Math.min(window.devicePixelRatio || 1, lowEnd ? Math.min(cap, 1.25) : cap); };
  window.ES = { track: track, toast: toast, config: CFG, store: store, reducedMotion: reducedMotion, lowPower: lowPower, lowEnd: !!lowEnd, dprCap: dprCap };

  /* Offline + installable: the service worker (production only, never on localhost unless ?sw) */
  if (CFG.sw && 'serviceWorker' in navigator) {
    var local = /^(localhost|127\.|\[::1\])/.test(location.hostname);
    if ((location.protocol === 'https:' && !local) || /[?&]sw\b/.test(location.search)) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register(CFG.sw).catch(function () {});
      });
    }
  }
  // Keep the browser's install offer for the moment it makes sense (after a finished ritual)
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.ES.installPrompt = e;
    window.dispatchEvent(new CustomEvent('es:installable'));
  });
  window.addEventListener('appinstalled', function () {
    window.ES.installPrompt = null;
    track('app_installed', {});
  });

  // Consent (only GA4 needs it; cookieless providers load straight away)
  var consentBar = qs('[data-consent]');
  if (A.provider === 'ga4') {
    var choice = store.get(CONSENT_KEY);
    if (choice === null && consentBar) consentBar.hidden = false;
    if (choice === 'yes') loadProvider();
  } else {
    loadProvider();
  }
  qsa('[data-consent-choice]').forEach(function (b) {
    b.addEventListener('click', function () {
      store.set(CONSENT_KEY, b.getAttribute('data-consent-choice'));
      if (consentBar) consentBar.hidden = true;
      loadProvider();
    });
  });

  // Declarative click tracking: data-track="cta_click" data-track-id="hero_primary"
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-track]');
    if (!el) return;
    track(el.getAttribute('data-track'), { id: el.getAttribute('data-track-id') || '', page: CFG.page });
  });

  // Scroll depth, once per threshold
  var depthMarks = [25, 50, 75, 100];
  var depthDone = {};

  /* The turn ------------------------------------------------------------------------
     The site is one object with sides, not pages. In browsers with cross-document view
     transitions (components.css, "One object, not pages") a link to another side is a turn:
     the browser holds this side until the next one is painted, the frame stays where it is,
     and the side slides out one way and the next slides in from the other, in the direction
     of the ring of pages. Before leaving, the side notes where it stands on the ring
     (main[data-ring]); the next side reads that in its inline head script, before its first
     paint, and marks <html data-turn="next|back|same"> for the CSS.
     Where a side opens: a link always opens the next side at its top. Back, forward and reload
     put a side back exactly where you left it: leaving, the side notes how far down you were
     under its history entry's key (es:pos), and the inline head script scrolls there before the
     first paint (the browser's own restoration is switched off there, so no host or browser
     can carry a position from one side to the next).
     Without view transitions, as before: a link to another side first brings you back up (a
     short glide if you're near the top, otherwise a quick fade) and then the side opens. The
     logo, or a link to the side you're on, glides to the top without leaving. Links to a part
     of a page (#…) work as usual. */
  var turns = 'onpagereveal' in window && 'startViewTransition' in document;
  var ringHere = parseFloat((qs('main') || document.body).getAttribute('data-ring'));
  var posKey = function () {
    try { if (window.navigation && navigation.currentEntry && navigation.currentEntry.key) return navigation.currentEntry.key; } catch (e) {}
    return location.pathname + location.search;
  };
  function noteLeaving() {
    try {
      if (!isNaN(ringHere)) sessionStorage.setItem('es:ring', JSON.stringify({ r: ringHere, at: Date.now() }));
      var P = JSON.parse(sessionStorage.getItem('es:pos') || '{}');
      P[posKey()] = Math.round(window.pageYOffset || document.documentElement.scrollTop || 0);
      var ks = Object.keys(P);
      if (ks.length > 40) ks.slice(0, ks.length - 40).forEach(function (k) { delete P[k]; });
      sessionStorage.setItem('es:pos', JSON.stringify(P));
    } catch (e) {}
  }
  window.addEventListener('pageswap', noteLeaving);
  window.addEventListener('pagehide', noteLeaving);
  // the direction mark is only for the turn itself
  window.addEventListener('pagereveal', function (e) {
    var done = function () { root.removeAttribute('data-turn'); };
    if (e.viewTransition) e.viewTransition.finished.then(done, done);
    else done();
  });
  setTimeout(function () { root.removeAttribute('data-turn'); }, 2500);
  var gliding = 0, veil = null;
  function scrollNow() { return window.pageYOffset || document.documentElement.scrollTop || 0; }
  function veilEl() {
    if (veil) return veil;
    veil = document.createElement('div');
    veil.className = 'es-veil';
    veil.setAttribute('aria-hidden', 'true');
    document.body.appendChild(veil);
    return veil;
  }
  function glideTop(then) {
    var y0 = scrollNow();
    cancelAnimationFrame(gliding);
    if (y0 < 2) { if (then) then(); return; }
    if (!root.classList.contains('motion-ok')) { window.scrollTo(0, 0); if (then) then(); return; }
    // far down: a quick fade to the top instead of a long ride back up
    if (y0 > window.innerHeight * 2.5) {
      var v = veilEl();
      v.classList.add('is-on');
      setTimeout(function () {
        window.scrollTo(0, 0);
        if (then) { then(); return; }
        requestAnimationFrame(function () { requestAnimationFrame(function () { v.classList.remove('is-on'); }); });
      }, 200);
      return;
    }
    var dur = Math.min(700, 320 + Math.sqrt(y0) * 7), t0 = performance.now();
    var step = function (now) {
      var k = Math.min(1, (now - t0) / dur);
      var e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      window.scrollTo(0, Math.round(y0 * (1 - e)));
      if (k < 1) gliding = requestAnimationFrame(step);
      else if (then) then();
    };
    gliding = requestAnimationFrame(step);
  }
  ES.glideTop = glideTop;
  // back from another side (the browser may keep this one exactly as it was): never dark
  window.addEventListener('pageshow', function () {
    if (veil) veil.classList.remove('is-on');
  });
  var pagePath = function (p) { return p.replace(/index\.html$/, '').replace(/\/+$/, '/') || '/'; };
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    var raw = a.getAttribute('href') || '';
    if (/^(mailto:|tel:|javascript:)/i.test(raw)) return;
    var url;
    try { url = new URL(raw, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;
    var same = pagePath(url.pathname) === pagePath(location.pathname) && url.search === location.search;
    // a link to a part of a page goes there as before
    if (url.hash && url.hash !== '#' && url.hash !== '#top') return;
    if (same) {
      e.preventDefault();
      glideTop();
      if (location.hash) try { history.replaceState(null, '', location.pathname + location.search); } catch (err) {}
      return;
    }
    // the turn takes it from here: the browser keeps this side on screen until the next is painted
    if (turns) return;
    e.preventDefault();
    glideTop(function () {
      location.href = url.href;
      // (if the page doesn't go after all, don't leave the screen dark)
      setTimeout(function () { if (veil) veil.classList.remove('is-on'); }, 4000);
    });
  });

  /* Low-stimulation mode ------------------------------------------------------ */
  var calmBtns = qsa('[data-calm-toggle]');
  function syncCalm() {
    var on = root.getAttribute('data-calm') === 'on';
    calmBtns.forEach(function (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  }
  function setCalm(on) {
    if (on) {
      root.setAttribute('data-calm', 'on');
      root.classList.remove('motion-ok');
    } else {
      root.removeAttribute('data-calm');
      if (!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) root.classList.add('motion-ok');
    }
    store.set('es:calm', on ? 'on' : 'off');
    syncCalm();
    toast(on ? S.calm.on : S.calm.off);
    track('low_stim_toggle', { state: on ? 'on' : 'off' });
    window.dispatchEvent(new CustomEvent('es:calm', { detail: { on: on } }));
  }
  calmBtns.forEach(function (b) {
    b.addEventListener('click', function () { setCalm(root.getAttribute('data-calm') !== 'on'); });
  });
  syncCalm();

  /* Header, scroll warmth, depth ---------------------------------------------- */
  var header = qs('[data-header]');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY || window.pageYOffset;
      var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      var p = Math.min(1, Math.max(0, y / max));
      // switched off for the evening: the page never goes back to full office cool
      root.style.setProperty('--warm', Math.max(p, root.getAttribute('data-shift') === 'off' ? 0.6 : 0).toFixed(3));
      if (header) header.classList.toggle('is-scrolled', y > 24);
      var pct = Math.round(p * 100);
      depthMarks.forEach(function (m) {
        if (pct >= m && !depthDone[m]) {
          depthDone[m] = true;
          track('scroll_depth', { percent: m, page: CFG.page });
        }
      });
      heroScroll();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('es:shift', onScroll);

  /* Mobile menu ------------------------------------------------------------------ */
  var menuBtn = qs('[data-menu-toggle]');
  var menu = qs('[data-menu]');
  function setMenu(open) {
    if (!menu || !menuBtn) return;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    var label = qs('[data-menu-label]', menuBtn);
    if (label) label.textContent = open ? S.menu.close : S.menu.open;
    var use = qs('use', menuBtn);
    if (use) use.setAttribute('href', open ? '#i-close' : '#i-menu');
    document.body.classList.toggle('menu-open', open);
    qsa('main, .site-footer, [data-sticky-cta]').forEach(function (el) { el.inert = open; });
    if (header) header.classList.toggle('is-solid', open);
    if (open) {
      var first = qs('a', menu);
      if (first) first.focus();
    }
  }
  if (menuBtn) {
    menuBtn.addEventListener('click', function () { setMenu(menu.hidden); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu && !menu.hidden) {
        setMenu(false);
        menuBtn.focus();
      }
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1020 && !menu.hidden) setMenu(false);
    });
  }

  /* Sticky mobile CTA --------------------------------------------------------------- */
  var sticky = qs('[data-sticky-cta]');
  if (sticky && 'IntersectionObserver' in window) {
    var topEl = qs('[data-hero]') || qs('.page-intro');
    // hidden while the page shows its own buttons or a signup form: one call to action at a time
    var endEls = qsa('.finale, .site-footer, [data-hide-sticky], main .cta-row, main form[data-signup]');
    var pastTop = false;
    var nearEnd = false;
    var typing = false;
    var applySticky = function () {
      var show = pastTop && !nearEnd && !typing;
      sticky.classList.toggle('is-visible', show);
      sticky.setAttribute('aria-hidden', show ? 'false' : 'true');
      qsa('a', sticky).forEach(function (a) { a.tabIndex = show ? 0 : -1; });
    };
    if (topEl) {
      new IntersectionObserver(function (en) {
        pastTop = !en[0].isIntersecting && en[0].boundingClientRect.top < 0;
        applySticky();
      }).observe(topEl);
    }
    var visibleEnds = new Set();
    var endIO = new IntersectionObserver(function (en) {
      en.forEach(function (x) { x.isIntersecting ? visibleEnds.add(x.target) : visibleEnds.delete(x.target); });
      nearEnd = visibleEnds.size > 0;
      applySticky();
    });
    endEls.forEach(function (el) { endIO.observe(el); });
    document.addEventListener('focusin', function (e) {
      typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
      applySticky();
    });
    document.addEventListener('focusout', function () {
      typing = false;
      applySticky();
    });
  }

  /* Hero: live clock + the deceleration --------------------------------------------- */
  var hero = qs('[data-hero]');
  var heroAnims = [];
  var heroScrollFactor = 1;
  var heroCurve = 0;

  function heroScroll() {
    if (!hero || !heroAnims.length) return;
    var r = hero.getBoundingClientRect();
    var prog = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height * 0.6)));
    heroScrollFactor = 1 - prog;
    applyHeroRate();
  }
  function applyHeroRate() {
    var rate = Math.max(0, heroCurve * heroScrollFactor);
    heroAnims.forEach(function (a) {
      if (rate < 0.01) a.pause();
      else {
        a.playbackRate = rate;
        if (a.playState !== 'running') a.play();
      }
    });
  }
  function settleHero() {
    if (!hero) return;
    hero.classList.add('is-settled');
    heroAnims.forEach(function (a) { a.pause(); });
  }

  if (hero) {
    var clock = qs('[data-clock]', hero);
    var note = qs('[data-clock-note]', hero);
    var tick = function () {
      var d = new Date();
      var hh = String(d.getHours()).padStart(2, '0');
      var mm = String(d.getMinutes()).padStart(2, '0');
      if (clock) clock.textContent = hh + ':' + mm;
      if (note && clock) {
        var out = (clock.getAttribute('data-out') || '18:00').split(':');
        var outMin = +out[0] * 60 + +out[1];
        var nowMin = d.getHours() * 60 + d.getMinutes();
        note.hidden = !(nowMin >= 360 && nowMin < outMin);
      }
    };
    tick();
    setInterval(tick, 20000);

    // Desktop: the headline stays on two lines whichever font arrives. A fallback face runs
    // wider than the condensed display face, so measure each line and scale to fit.
    var title = qs('.hero__title', hero);
    var fitTitle = function () {
      if (!title) return;
      if (window.innerWidth < 900) {
        root.classList.remove('hero-fit');
        title.style.removeProperty('--hero-fit');
        return;
      }
      title.style.setProperty('--hero-fit', '1');
      root.classList.add('hero-fit');
      var widest = 0;
      qsa('.hero__line', title).forEach(function (l) { widest = Math.max(widest, l.getBoundingClientRect().width); });
      var fit = widest ? Math.min(1, title.clientWidth / widest) : 1;
      title.style.setProperty('--hero-fit', (Math.floor(fit * 1000) / 1000).toString());
    };
    fitTitle();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitle);
    var fitT = 0;
    window.addEventListener('resize', function () {
      clearTimeout(fitT);
      fitT = setTimeout(fitTitle, 120);
    });

    var canAnimate = root.classList.contains('motion-ok') && typeof Element.prototype.animate === 'function';
    var isOff = function () { return root.getAttribute('data-shift') === 'off'; };
    var curveRaf = 0;
    // Lanes race at `from` × normal speed and slow to a stop over `ms`.
    var race = function (from, ms) {
      if (!heroAnims.length) return;
      cancelAnimationFrame(curveRaf);
      hero.classList.remove('is-settled');
      var t0 = performance.now();
      var frame = function (now) {
        var p = Math.min(1, (now - t0) / ms);
        heroCurve = from * Math.pow(1 - p, 2.6);
        applyHeroRate();
        if (p < 1) curveRaf = requestAnimationFrame(frame);
        else settleHero();
      };
      curveRaf = requestAnimationFrame(frame);
    };
    var startHero = function () {
      if (!canAnimate) {
        hero.classList.add('is-settled');
        return;
      }
      qsa('.lane__track', hero).forEach(function (t, i) {
        if (!t.offsetParent) return; // hidden lanes on small screens
        var a = t.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }], {
          duration: 60000 + i * 11000,
          iterations: Infinity,
          direction: i % 2 ? 'reverse' : 'normal',
        });
        a.currentTime = (i * 7919) % 20000; // start lanes out of step
        a.pause();
        heroAnims.push(a);
      });
      // Already switched off this evening: the notifications stay asleep.
      if (isOff()) settleHero();
      else race(9, 3400);
    };
    // With the opening montage playing, the notifications start racing when it reveals the page
    if (root.classList.contains('intro-pending')) window.addEventListener('es:intro-reveal', startHero, { once: true });
    else startHero();
    window.addEventListener('es:calm', function (e) {
      if (e.detail.on) {
        cancelAnimationFrame(curveRaf);
        settleHero();
      }
    });
    // Work mode off: whatever is still moving stops within a second. Back on: it all races again.
    window.addEventListener('es:shift', function (e) {
      if (!canAnimate || root.getAttribute('data-calm') === 'on') return;
      if (e.detail.off) {
        if (heroCurve > 0.05) race(Math.min(heroCurve, 4), 900);
        else settleHero();
      } else if (!e.detail.silent) race(7, 3600);
    });
  }

  /* Ritual step preview (dial + list) -------------------------------------------------- */
  qsa('[data-preview]').forEach(function (pv) {
    var btns = qsa('.step-btn[data-step]', pv);
    var segs = qsa('.dial__seg', pv);
    var timeEl = qs('[data-dial-time]', pv);
    var capEl = qs('[data-dial-caption]', pv);
    var defTime = timeEl ? timeEl.textContent : '';
    var defCap = capEl ? capEl.textContent : '';
    var paint = function (i) {
      segs.forEach(function (s, j) {
        s.classList.toggle('is-active', j === i);
        s.style.setProperty('--p', j === i ? '1' : '0');
      });
      if (i < 0) {
        timeEl.textContent = defTime;
        capEl.textContent = defCap;
      } else {
        var b = btns[i];
        timeEl.textContent = qs('.step-btn__min', b).textContent + ':00';
        capEl.textContent = qs('.step-btn__title', b).textContent;
      }
    };
    var select = function (i) {
      btns.forEach(function (b, j) {
        var on = j === i;
        b.setAttribute('aria-expanded', on ? 'true' : 'false');
        var body = document.getElementById(b.getAttribute('aria-controls'));
        if (body) body.hidden = !on;
      });
      paint(i);
    };
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') === 'true';
        select(open ? -1 : i);
        if (!open) track('ritual_preview_step', { step: i + 1 });
      });
    });
    segs.forEach(function (s, j) { s.style.setProperty('--p', j === 0 ? '1' : '0'); if (j === 0) s.classList.add('is-active'); });
  });

  // experiment "inshort" without the summary: the game's skip and continue links go to the film
  if (root.getAttribute('data-exp-inshort') === 'hide')
    qsa('a[href="#in-short"]').forEach(function (a) { a.setAttribute('href', '#after-game'); });

  /* The printable ritual card */
  qsa('[data-print]').forEach(function (b) {
    b.addEventListener('click', function () {
      track('ritual_card_print', {});
      window.print();
    });
  });

  /* FAQ side column (wide screens): the topic you're reading is marked --------------------------- */
  // the FAQ's topic list marks where you are: the last topic whose heading has passed 40% of the
  // screen, or the first one at the top of the page (in either scroll direction)
  (function faqTopics() {
    var nav = qs('[data-faq-topics]');
    if (!nav) return;
    var links = qsa('[data-topic]', nav);
    var groups = links.map(function (a) { return document.getElementById(a.getAttribute('data-topic')); });
    var current = null;
    var mark = function (id) {
      if (id === current) return;
      current = id;
      links.forEach(function (a) { a.setAttribute('aria-current', a.getAttribute('data-topic') === id ? 'true' : 'false'); });
    };
    var ticking = false;
    var update = function () {
      ticking = false;
      var line = window.innerHeight * 0.4;
      var id = groups[0] ? groups[0].id : null;
      groups.forEach(function (g) { if (g && g.getBoundingClientRect().top <= line) id = g.id; });
      if (id) mark(id);
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  })();

  /* Legal pages: "On this page" starts folded on a phone (open on wider screens, and without JS) */
  qsa('[data-toc]').forEach(function (d) {
    if (window.matchMedia && matchMedia('(max-width: 899px)').matches) d.open = false;
    qsa('a', d).forEach(function (a) { a.addEventListener('click', function () { if (window.matchMedia && matchMedia('(max-width: 899px)').matches) d.open = false; }); });
  });

  /* FAQ tracking --------------------------------------------------------------------------- */
  qsa('details[data-faq]').forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) track('faq_open', { id: d.getAttribute('data-faq'), page: CFG.page });
    });
  });

  /* Email capture ---------------------------------------------------------------------------- */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function setStatus(el, tone, msg) {
    if (!el) return;
    el.setAttribute('data-tone', tone || '');
    el.textContent = msg || '';
  }
  /* Joining -------------------------------------------------------------------------------------
     What this device remembers: the lists you joined (es:lists) and, once you've confirmed the
     founding list, your founder number (es:founder). A form for a list you're already on turns
     into a short "you're on it" note, and the confirmation link opens your founder card. */
  var J = S.joined || {};
  var readJSON = function (k) { try { return JSON.parse(store.get(k) || 'null'); } catch (e) { return null; } };
  var lists = readJSON('es:lists') || (store.get('es:joined') === '1' ? { 'batch-001': {} } : {});
  var founder = readJSON('es:founder');
  var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
  var pad3 = function (n) { return String(n).padStart(3, '0'); };
  var isoDay = function () { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
  var dayText = function (iso) { return String(iso || isoDay()).split('-').reverse().join('.'); };
  var fill = function (s, o) { return String(s || '').replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); };
  var escH = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  var goal = (CFG.batch && CFG.batch.goal) || 150;
  function node(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function joinList(list, preview) {
    lists[list] = { at: isoDay(), p: preview ? 1 : 0 };
    store.set('es:lists', JSON.stringify(lists));
    store.set('es:joined', '1');
  }
  // founders get the build updates too, so that form doesn't ask them again either
  var onList = function (list) { return !!(lists[list] || (list === 'build-updates' && lists['batch-001'])); };

  // "Send them the ritual": the free part is the thing worth passing on
  function shareRitual(from) {
    var u = new URL((CFG.urls && CFG.urls.ritual) || '/ritual/', location.href);
    if (/^https?:$/.test(u.protocol)) {
      u.searchParams.set('utm_source', 'share');
      u.searchParams.set('utm_medium', from || 'founder');
    }
    if (navigator.share) {
      navigator.share({ title: J.shareTitle, text: J.shareText, url: u.href }).then(function () { track('share', { method: 'native', what: 'ritual', from: from }); }, function () {});
    } else {
      copyText(u.href, S.toast.linkCopied);
      track('share', { method: 'copy', what: 'ritual', from: from });
    }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-share-ritual]');
    if (b) shareRitual(b.getAttribute('data-share-ritual') || 'joined');
  });

  // What to do now: confirm, the ritual tonight, one person to send it to
  function nextSteps(list, preview) {
    var ol = node('ol', 'joined__next');
    if (J.next) ol.setAttribute('aria-label', J.next);
    if (list === 'batch-001' && !preview && J.confirm) ol.appendChild(node('li', '', J.confirm));
    if (CFG.page !== 'ritual' && J.tonight) {
      var li = node('li', '', J.tonight + ' ');
      var a = node('a', 'link', J.tonightCta);
      a.href = CFG.urls.ritual;
      a.setAttribute('data-track', 'cta_click');
      a.setAttribute('data-track-id', 'joined_ritual');
      li.appendChild(a);
      ol.appendChild(li);
    }
    if (J.colleague) {
      var li2 = node('li', '', J.colleague + ' ');
      var b = node('button', 'link link-btn', J.colleagueCta);
      b.type = 'button';
      b.setAttribute('data-share-ritual', 'joined');
      li2.appendChild(b);
      ol.appendChild(li2);
    }
    return ol.children.length ? ol : null;
  }

  function signupDone(form, preview) {
    form.classList.add('is-done');
    var list = form.getAttribute('data-list') || 'batch-001';
    var box = node('div', 'signup__done');
    box.tabIndex = -1;
    box.appendChild(node('p', 'signup__done-title', form.getAttribute('data-done-title') || S.signup.doneTitle));
    // in preview nothing was sent, so nothing is promised either
    box.appendChild(node('p', preview ? 'preview-flag' : '', preview ? S.signup.previewText : form.getAttribute('data-done-text') || S.signup.doneText));
    var steps = nextSteps(list, preview);
    if (steps) box.appendChild(steps);
    form.appendChild(box);
    box.focus();
    joinList(list, preview);
    var reward = form.getAttribute('data-reward');
    if (reward) {
      store.set('es:reward', reward);
      window.dispatchEvent(new CustomEvent('es:reward', { detail: { reward: reward, preview: !!preview } }));
    }
  }
  // "and one reminder email tomorrow": the time from the ritual's reminder field, and where you are
  function remindOf(form) {
    if (!(form.elements.remind_on && form.elements.remind_on.checked)) return {};
    var t = qs('[data-reminder-time]');
    var tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    return { remind: (t && t.value) || '18:00', tz: tz || undefined };
  }
  qsa('form[data-signup]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = qs('input[type="email"]', form);
      var status = qs('.form-status', form);
      var btn = qs('button[type="submit"]', form);
      var hp = form.elements.company;
      var list = form.getAttribute('data-list');
      var source = form.getAttribute('data-source');
      var reward = form.getAttribute('data-reward') || undefined;
      if (hp && hp.value) return;
      var email = (input.value || '').trim();
      if (!EMAIL.test(email)) {
        input.setAttribute('aria-invalid', 'true');
        setStatus(status, 'error', S.signup.errorEmail);
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      track('signup_submit', { list: list, source: source, reward: reward });
      var endpoint = CFG.forms && CFG.forms.endpoint;
      if (!endpoint) {
        setStatus(status, '', '');
        signupDone(form, true);
        track('signup_success', { list: list, source: source, preview: true });
        return;
      }
      btn.disabled = true;
      setStatus(status, '', S.signup.sending);
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.assign({ email: email, list: list, source: source, reward: reward, job: (form.elements.job && form.elements.job.value) || store.get('es:job') || undefined, locale: CFG.locale, page: location.pathname, ts: new Date().toISOString() }, remindOf(form))),
      })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          setStatus(status, '', '');
          signupDone(form, false);
          track('signup_success', { list: list, source: source });
        })
        .catch(function () {
          setStatus(status, 'error', S.signup.errorNetwork);
          track('signup_error', { list: list, source: source });
        })
        .then(function () { btn.disabled = false; });
    });
    var input = qs('input[type="email"]', form);
    if (input) input.addEventListener('input', function () { input.removeAttribute('aria-invalid'); });
  });

  // Contact form: same endpoint, list "contact"
  qsa('form[data-contact-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = qs('.form-status', form);
      var email = form.elements.email;
      var msg = form.elements.message;
      if (form.elements.company && form.elements.company.value) return;
      [email, msg].forEach(function (el) { el.removeAttribute('aria-invalid'); });
      if (!EMAIL.test((email.value || '').trim())) {
        email.setAttribute('aria-invalid', 'true');
        setStatus(status, 'error', S.signup.errorEmail);
        email.focus();
        return;
      }
      if ((msg.value || '').trim().length < 2) {
        msg.setAttribute('aria-invalid', 'true');
        setStatus(status, 'error', form.getAttribute('data-error-message'));
        msg.focus();
        return;
      }
      var finish = function (preview) {
        setStatus(status, 'ok', preview ? form.getAttribute('data-preview') : form.getAttribute('data-done') + ' ' + form.getAttribute('data-done-text'));
        if (!preview) form.reset();
        track('contact_submit', { topic: form.elements.topic.value, preview: !!preview });
      };
      var endpoint = CFG.forms && CFG.forms.endpoint;
      if (!endpoint) return finish(true);
      var btn = qs('button[type="submit"]', form);
      btn.disabled = true;
      setStatus(status, '', S.signup.sending);
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ list: 'contact', email: email.value.trim(), name: form.elements.name.value.trim(), topic: form.elements.topic.value, message: msg.value.trim(), locale: CFG.locale, page: location.pathname }),
      })
        .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); finish(false); })
        .catch(function () { setStatus(status, 'error', S.signup.errorNetwork); })
        .then(function () { btn.disabled = false; });
    });
  });

  /* Copy + share ---------------------------------------------------------------------------- */
  function copyText(text, okMsg) {
    var fallback = function () { toast(S.toast.copyFailed); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg || S.toast.copied); }, fallback);
    } else fallback();
  }
  window.ES.copyText = copyText;
  qsa('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () { copyText(b.getAttribute('data-copy')); });
  });
  qsa('[data-share]').forEach(function (b) {
    b.addEventListener('click', function () {
      var url = b.getAttribute('data-share-url') || location.href;
      var text = b.getAttribute('data-share-text') || document.title;
      if (navigator.share) {
        navigator.share({ title: document.title, text: text, url: url }).then(
          function () { track('share', { method: 'native', page: CFG.page }); },
          function () {},
        );
      } else {
        copyText(url, S.toast.linkCopied);
        track('share', { method: 'copy', page: CFG.page });
      }
    });
  });

  /* The founder card as a picture, drawn here on the device: 1080×1350, for chats and stories ---- */
  function drawCard(n, day) {
    var C = J.card || {}, Sh = J.sheet || {};
    var DISP = "'Sofia Sans Extra Condensed', 'Arial Narrow', sans-serif";
    var BODY = "'Sofia Sans', Arial, sans-serif";
    var sample = [C.brand, C.batch, C.title, C.no, C.in, C.out, C.outValue, C.stamp, Sh.numbered, CFG.site, '0123456789/.—·'].join(' ');
    var fonts = document.fonts && document.fonts.load
      ? Promise.all(['900 64px ' + DISP, '700 48px ' + DISP, '400 28px ' + BODY].map(function (f) { return document.fonts.load(f, sample).catch(function () {}); }))
      : Promise.resolve();
    return Promise.race([fonts, new Promise(function (r) { setTimeout(r, 2500); })]).then(function () {
      var W = 1080, H = 1350;
      var cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      var g = cv.getContext('2d');
      // Bulgarian letterforms on the Bulgarian site, as on the page
      if ('lang' in g) g.lang = root.lang || 'en';
      // text with letter spacing, shrunk to fit when it's too long (Bulgarian runs longer)
      var text = function (s, x, y, o) {
        s = String(s == null ? '' : s);
        var size = o.size, chars = Array.from(s), m;
        var measure = function () {
          g.font = (o.weight || 400) + ' ' + size + 'px ' + (o.family || DISP);
          var sp = (o.track || 0) * size;
          var ws = sp ? chars.map(function (c) { return g.measureText(c).width; }) : null;
          var total = sp ? ws.reduce(function (a, b) { return a + b; }, 0) + sp * Math.max(0, chars.length - 1) : g.measureText(s).width;
          return { ws: ws, sp: sp, total: total };
        };
        m = measure();
        if (o.maxW && m.total > o.maxW) {
          size = Math.floor((size * o.maxW) / m.total);
          m = measure();
        }
        g.fillStyle = o.color || '#1b1c1c';
        g.textBaseline = 'alphabetic';
        var cx = o.align === 'right' ? x - m.total : o.align === 'center' ? x - m.total / 2 : x;
        if (!m.sp) g.fillText(s, cx, y);
        else chars.forEach(function (c, i) { g.fillText(c, cx, y); cx += m.ws[i] + m.sp; });
        return m.total;
      };
      var seed = 7;
      var rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      // night, and a warm light above
      g.fillStyle = '#111315';
      g.fillRect(0, 0, W, H);
      var glow = g.createRadialGradient(W / 2, -80, 0, W / 2, -80, 1050);
      glow.addColorStop(0, 'rgba(242,168,75,0.34)');
      glow.addColorStop(0.5, 'rgba(242,168,75,0.08)');
      glow.addColorStop(1, 'rgba(242,168,75,0)');
      g.fillStyle = glow;
      g.fillRect(0, 0, W, H);
      // the card, turned a little, like one pinned to a board
      var cw = 800, ch = 920, top = -ch / 2, L = -cw / 2 + 70, R = cw / 2 - 70;
      g.save();
      g.translate(W / 2, 590);
      g.rotate((-2 * Math.PI) / 180);
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.55)';
      g.shadowBlur = 80;
      g.shadowOffsetY = 36;
      g.fillStyle = '#ebe6da';
      g.beginPath();
      if (g.roundRect) g.roundRect(-cw / 2, top, cw, ch, 12);
      else g.rect(-cw / 2, top, cw, ch);
      g.fill();
      g.restore();
      g.globalAlpha = 0.06;
      g.fillStyle = '#5d5a54';
      for (var i = 0; i < 320; i++) g.fillRect(-cw / 2 + rnd() * cw, top + rnd() * ch, 2 + rnd() * 16, 1.2);
      g.globalAlpha = 1;
      g.fillStyle = '#111315';
      g.beginPath();
      g.arc(-cw * 0.08, top + 54, 20, 0, Math.PI * 2);
      g.fill();
      text(C.brand, L, top + 172, { weight: 900, size: 64, track: 0.06 });
      text(C.title, L, top + 372, { weight: 900, size: 176, maxW: R - L - 30 });
      var ry = top + 440;
      g.fillStyle = '#1b1c1c';
      g.fillRect(L, ry, R - L, 3);
      [[C.no, (n ? pad3(n) : '—') + ' / ' + goal], [C.in, dayText(day)], [C.out, C.outValue]].forEach(function (r, k) {
        var y = ry + 72 + k * 104;
        text(r[0], L, y, { weight: 700, size: 46, track: 0.05, color: '#5d5a54' });
        text(r[1], L + 180, y, { weight: 800, size: 46, track: 0.05, maxW: R - L - 180 });
        g.fillStyle = '#b9b3a6';
        g.fillRect(L, ry + (k + 1) * 104, R - L, 2);
      });
      if (n && Sh.numbered) text(Sh.numbered, L, ry + 3 * 104 + 62, { size: 28, family: BODY, color: '#5d5a54', maxW: R - L });
      // the stamp, top right like a postmark (it says the batch)
      g.save();
      g.translate(R - 112, top + 148);
      g.rotate((-9 * Math.PI) / 180);
      g.globalAlpha = 0.86;
      var sw = text(String(C.stamp || '').toUpperCase(), 0, 19, { weight: 900, size: 50, track: 0.08, color: '#b4561d', align: 'center', maxW: 300 });
      g.strokeStyle = '#b4561d';
      g.lineWidth = 6;
      g.strokeRect(-sw / 2 - 22, -38, sw + 44, 78);
      g.restore();
      g.restore();
      // the mark and the address under the card
      var my = 1196;
      g.fillStyle = '#f2a84b';
      g.beginPath();
      g.arc(W / 2, my, 27, Math.PI, 0);
      g.fill();
      g.fillStyle = 'rgba(239,235,225,0.85)';
      g.fillRect(W / 2 - 42, my + 9, 84, 5);
      text(CFG.site || C.brand, W / 2, my + 84, { weight: 800, size: 38, track: 0.14, color: 'rgba(239,235,225,0.78)', align: 'center', maxW: W - 160 });
      return cv;
    });
  }
  function saveCard(n, day) {
    drawCard(n, day).then(function (cv) {
      cv.toBlob(function (blob) {
        if (!blob) return;
        var name = 'endshift-founder-' + (n ? pad3(n) : 'card') + '.png';
        var file = null;
        try { file = new File([blob], name, { type: 'image/png' }); } catch (e) {}
        // phones: the share sheet (it has "Save image"); computers: a download
        var touch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
        if (touch && file && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: (J.card && J.card.alt) || 'ENDSHIFT' }).then(function () { track('founder_card', { action: 'share' }); }, function () {});
          return;
        }
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
        if (J.sheet && J.sheet.made) toast(J.sheet.made);
        track('founder_card', { action: 'download' });
      }, 'image/png');
    });
  }
  window.ES.drawFounderCard = drawCard;

  /* "You're founder Nº 037": the card, the ritual tonight, one person to send it to ------------- */
  var sheetOpen = null;
  function founderSheet(from) {
    if (sheetOpen) return;
    var Sh = J.sheet || {}, C = J.card || {};
    var n = founder && founder.n, day = (founder && founder.at) || isoDay();
    var row = function (k, v) { return '<div class="foundercard__row"><span>' + escH(k) + '</span><span>' + escH(v) + '</span></div>'; };
    var d = document.createElement('dialog');
    d.className = 'fsheet';
    d.setAttribute('aria-labelledby', 'fsheet-title');
    d.innerHTML =
      '<div class="fsheet__panel">' +
      '<button class="fsheet__x" type="button" data-fsheet-close aria-label="' + escH(Sh.close) + '"><svg class="icon" aria-hidden="true" focusable="false"><use href="#i-close"></use></svg></button>' +
      '<div class="fsheet__card"><div class="foundercard" role="img" aria-label="' + escH(C.alt + (n ? ', ' + C.no + ' ' + pad3(n) : '')) + '">' +
      '<div class="foundercard__brand"><span>' + escH(C.brand) + '</span><span>' + escH(C.batch) + '</span></div>' +
      '<p class="foundercard__title">' + escH(C.title) + '</p>' +
      '<div class="foundercard__rows">' + row(C.no, (n ? pad3(n) : '—') + ' / ' + goal) + row(C.in, dayText(day)) + row(C.out, C.outValue) + '</div>' +
      '<span class="foundercard__stamp" aria-hidden="true">' + escH(C.stamp) + '</span>' +
      (n && Sh.numbered ? '<p class="foundercard__fine">' + escH(Sh.numbered) + '</p>' : '') +
      '</div></div>' +
      '<div class="fsheet__body">' +
      '<p class="fsheet__kicker">' + escH(Sh.kicker) + '</p>' +
      '<h2 class="fsheet__title" id="fsheet-title" tabindex="-1" autofocus>' + escH(n ? fill(Sh.titleNo, { n: pad3(n) }) : Sh.title) + '</h2>' +
      '<p class="fsheet__text">' + escH(fill(Sh.text, { goal: goal })) + '</p>' +
      '<div class="fsheet__actions">' +
      '<a class="btn btn--primary" href="' + escH(CFG.urls.ritual) + '" data-track="cta_click" data-track-id="founder_sheet_ritual"><span>' + escH(J.tonightCta) + '</span></a>' +
      '<button class="btn btn--ghost" type="button" data-card-save><svg class="icon" aria-hidden="true" focusable="false"><use href="#i-download"></use></svg><span>' + escH(Sh.save) + '</span></button>' +
      '</div>' +
      '<p class="fsheet__more">' + escH(J.colleague) + ' <button class="link link-btn" type="button" data-share-ritual="sheet">' + escH(J.colleagueCta) + '</button></p>' +
      '</div></div>';
    document.body.appendChild(d);
    var done = function () {
      if (!sheetOpen) return;
      sheetOpen = null;
      root.classList.remove('has-sheet');
      d.remove();
    };
    var close = function () {
      if (d.open && d.close) d.close();
      else done();
    };
    d.addEventListener('close', done);
    d.addEventListener('click', function (e) {
      if (e.target === d || (e.target.closest && e.target.closest('[data-fsheet-close]'))) close();
      else if (e.target.closest && e.target.closest('[data-card-save]')) saveCard(n, day);
    });
    sheetOpen = d;
    root.classList.add('has-sheet');
    if (d.showModal) d.showModal();
    else d.setAttribute('open', '');
    track('founder_sheet', { from: from, numbered: n ? 1 : 0 });
  }
  window.ES.founderSheet = founderSheet;

  /* Back from the confirmation email (double opt-in). /api/confirmed adds the list and the founder
     number (how many people had confirmed at that moment): ?confirmed=1&list=batch-001&n=37 */
  (function confirmed() {
    if (!/[?&]confirmed=1\b/.test(location.search)) return;
    var params = new URLSearchParams(location.search);
    var list = params.get('list') || 'batch-001';
    if (!/^[a-z0-9-]{1,32}$/.test(list)) list = 'batch-001';
    var n = parseInt(params.get('n'), 10);
    n = n >= 1 && n <= 99999 ? n : null;
    joinList(list, false);
    if (list === 'batch-001') {
      // the first number this device was given is the one it keeps
      founder = { n: (founder && founder.n) || n, at: (founder && founder.at) || isoDay() };
      store.set('es:founder', JSON.stringify(founder));
    }
    track('signup_confirmed', { list: list });
    try {
      ['confirmed', 'list', 'n'].forEach(function (k) { params.delete(k); });
      var rest = params.toString();
      history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
    } catch (e) {}
    if (list === 'batch-001') setTimeout(function () { founderSheet('confirmed'); }, 650);
    else setTimeout(function () { toast(S.toast.confirmed || ''); }, 600);
  })();

  /* Forms for a list you're already on: "You're on the founding list" instead of the email field.
     The game's reward form stays (the reward is tied to an email). */
  (function joinedForms() {
    qsa('form[data-signup]').forEach(function (form) {
      var list = form.getAttribute('data-list') || 'batch-001';
      if (form.hasAttribute('data-reward') || !onList(list)) return;
      var info = lists[list] || lists['batch-001'] || {};
      // say the list you're actually on: the founding list (it brings the build updates too),
      // only the build updates, or the ritual's
      var founding = !!lists['batch-001'] && (list === 'batch-001' || list === 'build-updates');
      var note = node('div', 'joined-note');
      var t = node('p', 'joined-note__title');
      t.innerHTML = '<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-check"></use></svg>';
      t.appendChild(node('span', '', founding ? (founder && founder.n ? fill(J.stateNo, { n: pad3(founder.n) }) : J.state) : list === 'build-updates' && J.stateUpdates ? J.stateUpdates : S.signup.doneTitle));
      note.appendChild(t);
      if (info.p && J.statePreview) note.appendChild(node('p', 'joined-note__flag preview-flag', J.statePreview));
      var acts = node('p', 'joined-note__acts');
      if (founding && founder && J.seeCard) {
        var see = node('button', 'link link-btn', J.seeCard);
        see.type = 'button';
        see.addEventListener('click', function () { founderSheet('note'); });
        acts.appendChild(see);
      }
      var sh = node('button', 'link link-btn', J.colleagueShort || J.colleagueCta);
      sh.type = 'button';
      sh.setAttribute('data-share-ritual', 'note');
      acts.appendChild(sh);
      var again = node('button', 'link link-btn joined-note__again', J.again);
      again.type = 'button';
      again.addEventListener('click', function () {
        note.remove();
        form.hidden = false;
        var input = qs('input[type="email"]', form);
        if (input) input.focus();
      });
      acts.appendChild(again);
      note.appendChild(acts);
      form.hidden = true;
      form.parentNode.insertBefore(note, form);
    });
  })();

  /* Founder counter: optional live endpoint ----------------------------------------------------- */
  if (CFG.countEndpoint) {
    fetch(CFG.countEndpoint, { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || typeof data.count !== 'number') return;
        try { window.dispatchEvent(new CustomEvent('es:count', { detail: { count: data.count } })); } catch (e) {}
        qsa('[data-meter]').forEach(function (m) {
          var goal = +m.getAttribute('data-goal') || 1;
          qsa('[data-founder-count]', m).forEach(function (n) { n.textContent = data.count; });
          var from = +m.getAttribute('data-from') || 0;
          m.setAttribute('data-early', data.count < from ? '1' : '0');
          qsa('[data-founder-next]', m).forEach(function (n) { n.textContent = String(data.count + 1).padStart(3, '0'); });
          var src = qs('.meter__source', m);
          if (src && S.meter && S.meter.live) src.textContent = S.meter.live;
          var bar = qs('[role="progressbar"]', m);
          if (bar) {
            bar.setAttribute('aria-valuenow', data.count);
            bar.style.setProperty('--pct', Math.min(100, (data.count / goal) * 100) + '%');
          }
        });
      })
      .catch(function () {});
  }

  /* Cookie preferences page ------------------------------------------------------------------------ */
  var prefAnalytics = qs('[data-pref-analytics]');
  if (prefAnalytics) {
    prefAnalytics.checked = store.get(CONSENT_KEY) === 'yes';
    prefAnalytics.addEventListener('change', function () {
      store.set(CONSENT_KEY, prefAnalytics.checked ? 'yes' : 'no');
      if (prefAnalytics.checked) loadProvider();
      else if (A.websiteId) window['ga-disable-' + A.websiteId] = true;
      toast(prefAnalytics.getAttribute('data-saved-msg') || 'Saved');
    });
  }
  qsa('[data-pref-calm]').forEach(function (c) {
    c.checked = root.getAttribute('data-calm') === 'on';
    c.addEventListener('change', function () { setCalm(c.checked); });
    window.addEventListener('es:calm', function (e) { c.checked = e.detail.on; });
  });
  qsa('[data-clear-local]').forEach(function (b) {
    b.addEventListener('click', function () {
      try {
        Object.keys(localStorage).forEach(function (k) { if (k.indexOf('es:') === 0) localStorage.removeItem(k); });
        sessionStorage.clear();
      } catch (e) {}
      root.removeAttribute('data-calm');
      syncCalm();
      toast(b.getAttribute('data-done-msg') || 'Cleared');
    });
  });

  /* The founder's voice note: one button, play and pause, a thin line for how far it's got -------- */
  qsa('[data-voice]').forEach(function (box) {
    var a = qs('audio', box), b = qs('[data-voice-play]', box), lbl = qs('[data-voice-label]', box), bar = qs('[data-voice-bar]', box);
    if (!a || !b) return;
    var set = function (on) {
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (lbl) lbl.textContent = lbl.getAttribute(on ? 'data-pause' : 'data-play');
      var u = qs('use', b);
      if (u) u.setAttribute('href', on ? '#i-pause' : '#i-play');
    };
    b.addEventListener('click', function () {
      if (a.paused) {
        var p = a.play();
        if (p && p.then) p.then(function () { track('founder_voice', { action: 'play' }); }, function () {});
      } else a.pause();
    });
    a.addEventListener('play', function () { set(true); });
    a.addEventListener('pause', function () { set(false); });
    a.addEventListener('ended', function () { set(false); if (bar) bar.style.transform = 'scaleX(1)'; track('founder_voice', { action: 'ended' }); });
    a.addEventListener('timeupdate', function () { if (bar && a.duration) bar.style.transform = 'scaleX(' + (a.currentTime / a.duration).toFixed(3) + ')'; });
  });
  qsa('.fblock__video').forEach(function (v) {
    v.addEventListener('play', function () { track('founder_video', { action: 'play' }); }, { once: true });
  });

  /* Returning to the home page after doing the ritual: "Evening 4?" and a way straight in --------- */
  (function welcomeBack() {
    var w = qs('[data-welcome]');
    if (!w) return;
    var st = null;
    try { st = JSON.parse(store.get('es:ritual') || 'null'); } catch (e) {}
    if (!st || !(st.count >= 1)) return;
    var d = new Date(), pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var today = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    var days = st.days || [];
    var n = Math.max(1, days.length + (days.indexOf(today) >= 0 ? 0 : 1));
    var q = qs('[data-welcome-q]', w);
    if (q) q.textContent = (q.getAttribute('data-tpl') || '{n}').replace('{n}', n);
    w.hidden = false;
    track('welcome_back', { evening: n });
  })();

  /* "What do you do?": the game plays your job next time, the ritual suggests a version, and
     the founding list knows who joined (a tag on the signup) ------------------------------------ */
  var JOB_KEY = 'es:job';
  (function jobPick() {
    var box = qs('[data-jobpick]');
    if (!box) return;
    var mine = store.get(JOB_KEY);
    var hint = qs('[data-jobpick-hint]', box);
    var mark = function (id) {
      qsa('[data-job]', box).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-job') === id ? 'true' : 'false'); });
    };
    if (mine) mark(mine);
    qsa('[data-job]', box).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-job');
        store.set(JOB_KEY, id);
        mark(id);
        if (hint && hint.getAttribute('data-saved')) hint.textContent = hint.getAttribute('data-saved');
        qsa('form[data-signup] input[name="job"]').forEach(function (i) { i.value = id; });
        track('job_pick', { job: id });
      });
    });
  })();
  // every signup carries the job, when we know it
  (function jobOnForms() {
    var job = store.get(JOB_KEY);
    qsa('form[data-signup]').forEach(function (f) {
      if (f.querySelector('input[name="job"]')) return;
      var i = document.createElement('input');
      i.type = 'hidden';
      i.name = 'job';
      i.value = job || '';
      f.appendChild(i);
    });
  })();

  /* "Skip the walkthrough": the page bubbles on the home page.
     - Outside the sphere, the bubbles lean towards the pointer (the middle one most, as if the
       sphere turned to look), and the light and the wireframe turn with them.
     - Inside the sphere nothing moves, so a bubble stays where you aim. Enlarging is CSS
       (:hover / :focus-visible).
     - With no pointer nearby it breathes a little. Off with reduced motion, low-stim, or no mouse
       (touch only gets the breathing). It runs only while the sphere is on screen. ----------------- */
  (function orbit() {
    var box = qs('[data-orbit]');
    if (!box) return;
    var items = qsa('[data-orbit-item]', box).map(function (li) {
      return { el: li, z: +li.getAttribute('data-z') || 0, ux: +li.getAttribute('data-ux') || 0, uy: +li.getAttribute('data-uy') || 0 };
    });
    var lat = qs('[data-lat]', box);
    var mers = qsa('[data-mer]', box);
    var MER = [0, 0.6, 1.15]; // the meridians' longitudes (radians)
    var LEAN = 0.07; // how far the middle bubble moves, in sphere widths
    var mq = window.matchMedia ? matchMedia('(hover: hover) and (pointer: fine)') : null;
    var mouse = function () { return !!(mq && mq.matches); };
    var moving = function () { return root.classList.contains('motion-ok'); };
    var lean = { x: 0, y: 0 };
    var target = { x: 0, y: 0 };
    var mode = 'idle'; // idle: breathing · steer: leaning to the pointer · hold: pointer inside, still
    var visible = false;
    var raf = 0;
    var last = 0;
    var size = box.offsetWidth;
    var ptr = null; // the last mouse position
    var focused = false;

    function render() {
      var px = LEAN * size;
      items.forEach(function (it) {
        var near = Math.max(0, it.ux * lean.x + it.uy * lean.y); // the side the pointer is on grows a touch
        it.el.style.transform = 'translate3d(' + (lean.x * px * it.z).toFixed(2) + 'px,' + (lean.y * px * it.z).toFixed(2) + 'px,0) scale(' + (1 + 0.07 * near).toFixed(3) + ')';
      });
      box.style.setProperty('--lx', lean.x.toFixed(3));
      box.style.setProperty('--ly', lean.y.toFixed(3));
      mers.forEach(function (m, i) { m.setAttribute('rx', Math.max(0.1, 48 * Math.abs(Math.sin(MER[i] + lean.x * 0.42))).toFixed(2)); });
      if (lat) lat.setAttribute('ry', (48 * Math.abs(Math.sin(0.28 + lean.y * 0.24))).toFixed(2));
    }

    function frame(t) {
      raf = 0;
      var dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
      last = t;
      if (mode === 'idle') {
        var w = (t / 1000) * ((Math.PI * 2) / 18);
        target.x = 0.14 * Math.cos(w);
        target.y = 0.1 * Math.sin(w * 1.4);
      }
      var k = 1 - Math.exp(-dt * (mode === 'steer' ? 5 : 1.6));
      lean.x += (target.x - lean.x) * k;
      lean.y += (target.y - lean.y) * k;
      render();
      var settled = Math.abs(target.x - lean.x) < 0.0008 && Math.abs(target.y - lean.y) < 0.0008;
      if (visible && moving() && (mode === 'idle' || !settled)) raf = requestAnimationFrame(frame);
      else last = 0;
    }
    function run() {
      if (!raf && visible && moving()) raf = requestAnimationFrame(frame);
    }

    // where the pointer is, relative to the sphere: inside (hold), nearby (steer) or far (idle)
    function aim() {
      if (!ptr || !mouse() || !moving()) { mode = 'idle'; run(); return; }
      if (focused) return;
      var r = box.getBoundingClientRect();
      size = r.width;
      var R = r.width * 0.48;
      var dx = ptr.x - (r.left + r.width / 2);
      var dy = ptr.y - (r.top + r.height / 2);
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var rho = d / R;
      if (rho <= 1 || ptr.onBubble) {
        if (mode !== 'hold') { mode = 'hold'; target.x = lean.x; target.y = lean.y; }
        return;
      }
      if (rho > 3.8) { mode = 'idle'; run(); return; }
      // strongest just outside the sphere, fading out far away
      var m = Math.min(1, 0.45 + (0.55 * (rho - 1)) / 1.2) * Math.min(1, Math.max(0, (3.8 - rho) / 1.2));
      mode = 'steer';
      target.x = (dx / d) * m;
      target.y = (dy / d) * m;
      run();
    }

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      ptr = { x: e.clientX, y: e.clientY, onBubble: !!(e.target && e.target.closest && e.target.closest('[data-orbit] .orb')) };
      if (visible) aim();
    }, { passive: true });
    // the page scrolls under a still pointer: aim again
    window.addEventListener('scroll', function () {
      if (!ptr || !visible) return;
      var under = document.elementFromPoint(ptr.x, ptr.y);
      ptr.onBubble = !!(under && under.closest && under.closest('[data-orbit] .orb'));
      aim();
    }, { passive: true });
    // the pointer left the window
    root.addEventListener('mouseleave', function () { ptr = null; aim(); });
    // keyboard: a focused bubble stays where it is (a mouse click focuses too, but doesn't count)
    box.addEventListener('focusin', function (e) {
      var kb = false;
      try { kb = e.target.matches(':focus-visible'); } catch (err) {}
      if (!kb) return;
      focused = true;
      mode = 'hold';
      target.x = lean.x;
      target.y = lean.y;
    });
    box.addEventListener('focusout', function () { focused = false; aim(); });
    window.addEventListener('resize', function () { size = box.offsetWidth; if (!raf) render(); }, { passive: true });
    window.addEventListener('es:calm', function () {
      if (moving()) { run(); return; }
      lean.x = lean.y = target.x = target.y = 0;
      render();
    });

    // coming out of the middle, once, the first time the sphere is on screen
    var revealed = false;
    function reveal() {
      if (revealed) return;
      revealed = true;
      box.classList.remove('is-waiting');
      if (!moving() || typeof Element.prototype.animate !== 'function') return;
      qsa('.orb', box).forEach(function (a, i) {
        var li = a.parentNode;
        var off = size * 0.2;
        var ux = +li.getAttribute('data-ux') || 0;
        var uy = +li.getAttribute('data-uy') || 0;
        a.animate(
          [
            { opacity: 0, transform: 'translate(-50%,-50%) translate(' + (-ux * off).toFixed(1) + 'px,' + (-uy * off).toFixed(1) + 'px) scale(0.3)' },
            { opacity: 1, transform: 'translate(-50%,-50%) translate(0px,0px) scale(1)' },
          ],
          { duration: 820, delay: 80 + i * 60, easing: 'cubic-bezier(0.2, 1.15, 0.3, 1)', fill: 'backwards' },
        );
      });
    }

    if ('IntersectionObserver' in window) {
      if (moving()) box.classList.add('is-waiting');
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          visible = en.isIntersecting;
          if (visible && en.intersectionRatio >= 0.3) reveal();
          if (visible) { size = box.offsetWidth; aim(); }
        });
      }, { threshold: [0, 0.3] }).observe(box);
    } else {
      visible = true;
      run();
    }
  })();

  /* A Bulgarian browser on the English site: offer the Bulgarian page, once ---------------------- */
  (function langHint() {
    if (CFG.locale !== 'en' || store.get('es:lang-hint')) return;
    var langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']).join(',');
    if (!/(^|,)bg\b/i.test(langs)) return;
    var link = qs('.site-header .lang-link[hreflang^="bg"]') || qs('.lang-link[hreflang^="bg"]');
    if (!link) return;
    var show = function () {
      var bar = document.createElement('div');
      bar.className = 'lang-hint';
      bar.setAttribute('role', 'region');
      bar.setAttribute('lang', 'bg');
      bar.setAttribute('aria-label', 'Български');
      var a = document.createElement('a');
      a.className = 'link';
      a.href = link.getAttribute('href');
      // on a phone it's a small chip in the header: the short words
      a.innerHTML = '<span class="lang-hint__long">Прочети на български</span><span class="lang-hint__short">На български</span><span class="lang-hint__tiny">Български</span>';
      a.addEventListener('click', function () { store.set('es:lang-hint', 'bg'); track('lang_hint', { action: 'bg' }); });
      var x = document.createElement('button');
      x.type = 'button';
      x.className = 'lang-hint__close';
      x.setAttribute('aria-label', 'Затвори / Close');
      x.textContent = '×';
      x.addEventListener('click', function () { store.set('es:lang-hint', 'no'); bar.remove(); track('lang_hint', { action: 'close' }); });
      var t = document.createElement('span');
      t.textContent = 'Има и български.';
      bar.appendChild(t); bar.appendChild(a); bar.appendChild(x);
      document.body.appendChild(bar);
      var away = function () { bar.classList.toggle('is-away', (window.scrollY || 0) > 160); };
      window.addEventListener('scroll', away, { passive: true });
      away();
    };
    // not over the opening: after it, or a moment after the page settles
    if (root.classList.contains('intro-pending')) window.addEventListener('es:intro-done', function () { setTimeout(show, 900); }, { once: true });
    else setTimeout(show, 1400);
  })();

  onScroll();
})();
