/* ENDSHIFT game: the way out.
   When the switch goes, the work world doesn't just fade. It turns out to have been
   fabric all along: curtains pulled open from the middle, or blinds turning open,
   and behind it is the evening. Both work on a copy of what's on screen, cut in strips. */
(function () {
  'use strict';

  var ES = (window.ES = window.ES || {});

  function strips(el, n, horizontal) {
    var w = el.offsetWidth, h = el.offsetHeight;
    var box = document.createElement('div');
    box.className = 'fx-strips' + (horizontal ? ' fx-strips--h' : '');
    box.setAttribute('aria-hidden', 'true');
    box.style.left = el.offsetLeft + 'px';
    box.style.top = el.offsetTop + 'px';
    box.style.width = w + 'px';
    box.style.height = h + 'px';
    var list = [];
    for (var i = 0; i < n; i++) {
      var s = document.createElement('div');
      s.className = 'fx-strip';
      var a = horizontal ? (h / n) * i : (w / n) * i;
      var size = horizontal ? h / n : w / n;
      if (horizontal) {
        s.style.top = a + 'px';
        s.style.height = size + 1 + 'px';
        s.style.width = w + 'px';
      } else {
        s.style.left = a + 'px';
        s.style.width = size + 1 + 'px';
        s.style.height = h + 'px';
      }
      var c = el.cloneNode(true);
      c.removeAttribute('id');
      c.querySelectorAll('[id]').forEach(function (x) { x.removeAttribute('id'); });
      c.querySelectorAll('button, a, input').forEach(function (x) { x.tabIndex = -1; });
      c.classList.add('fx-copy');
      c.style.position = 'absolute';
      c.style.width = w + 'px';
      c.style.height = h + 'px';
      c.style.left = horizontal ? '0' : -a + 'px';
      c.style.top = horizontal ? -a + 'px' : '0';
      // a copied canvas comes out blank: paint it again from the original
      var srcC = el.querySelectorAll('canvas'), cpC = c.querySelectorAll('canvas');
      for (var ci = 0; ci < cpC.length; ci++) {
        try {
          cpC[ci].width = srcC[ci].width;
          cpC[ci].height = srcC[ci].height;
          cpC[ci].getContext('2d').drawImage(srcC[ci], 0, 0);
        } catch (er) {}
      }
      // a copy of a scrolled list starts at the top: keep it where it was
      var srcLog = el.querySelector('[data-gf-log]'), cpLog = c.querySelector('[data-gf-log]');
      if (srcLog && cpLog) cpLog.scrollTop = srcLog.scrollTop;
      s.appendChild(c);
      var shade = document.createElement('i');
      shade.className = 'fx-strip__shade';
      s.appendChild(shade);
      box.appendChild(s);
      list.push(s);
    }
    el.parentNode.insertBefore(box, el.nextSibling);
    // copies of a scrolled list need their scroll set once they're in the page
    list.forEach(function (s) {
      var srcLog = el.querySelector('[data-gf-log]'), cpLog = s.querySelector('[data-gf-log]');
      if (srcLog && cpLog) cpLog.scrollTop = srcLog.scrollTop;
    });
    el.style.visibility = 'hidden';
    return { box: box, list: list, w: w, h: h };
  }

  // Curtains: two halves gather to the sides in folds, then are gone.
  function curtain(el, done) {
    if (typeof el.animate !== 'function') return done();
    var N = 14;
    var S = strips(el, N, false);
    var half = N / 2;
    var finished = 0;
    S.list.forEach(function (s, i) {
      var left = i < half;
      var k = left ? i : N - 1 - i; // 0 at the edge, half-1 in the middle
      var sw = S.w / N;
      var gatherTo = left ? k * sw * 0.16 : S.w - (k + 1) * sw * 0.16 - sw * 0.84;
      var startX = (left ? i : i) * sw;
      var dx = gatherTo - startX;
      var away = left ? -S.w * 0.28 : S.w * 0.28;
      var skew = (i % 2 ? 1 : -1) * 4;
      var delay = (half - 1 - k) * 22;
      var a = s.animate(
        [
          { transform: 'translateX(0) scaleX(1) skewY(0deg)', offset: 0 },
          { transform: 'translateX(' + (dx * 0.08).toFixed(1) + 'px) scaleX(0.92) skewY(' + skew * 0.4 + 'deg)', offset: 0.18 },
          { transform: 'translateX(' + dx.toFixed(1) + 'px) scaleX(0.3) skewY(' + skew + 'deg) translateY(-1.5%)', offset: 0.72 },
          { transform: 'translateX(' + (dx + away).toFixed(1) + 'px) scaleX(0.22) skewY(' + skew + 'deg) translateY(-3%)', offset: 1 },
        ],
        { duration: 1900, delay: delay, easing: 'cubic-bezier(.65,0,.3,1)', fill: 'forwards' },
      );
      s.querySelector('.fx-strip__shade').animate([{ opacity: 0 }, { opacity: 1, offset: 0.55 }, { opacity: 1 }], { duration: 1900, delay: delay, fill: 'forwards' });
      s.animate([{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 1900, delay: delay, fill: 'forwards' });
      a.onfinish = function () {
        finished++;
        if (finished === N) {
          if (S.box.parentNode) S.box.parentNode.removeChild(S.box);
          done();
        }
      };
    });
  }

  // Blinds: the dark turns out to be slats, and they turn open.
  function blinds(el, done) {
    if (typeof el.animate !== 'function') return done();
    var N = 12;
    var S = strips(el, N, true);
    var finished = 0;
    S.list.forEach(function (s, i) {
      var delay = i * 55;
      s.animate(
        [
          { transform: 'perspective(900px) rotateX(0deg) scaleY(1)' },
          { transform: 'perspective(900px) rotateX(78deg) scaleY(0.9)', offset: 0.6 },
          { transform: 'perspective(900px) rotateX(89deg) scaleY(0.6)' },
        ],
        { duration: 1300, delay: delay, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' },
      );
      s.querySelector('.fx-strip__shade').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: delay, fill: 'forwards' });
      var a = s.animate([{ opacity: 1 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 1500, delay: delay, fill: 'forwards' });
      a.onfinish = function () {
        finished++;
        if (finished === N) {
          if (S.box.parentNode) S.box.parentNode.removeChild(S.box);
          done();
        }
      };
    });
  }

  ES.gameFx = { curtain: curtain, blinds: blinds };
})();
