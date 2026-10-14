/* ENDSHIFT game: the torch.
   Back at the depot after the last drop, and the lights are already off. You search with
   your phone's light. Somewhere there's the switch, and a tiny orange light on it. */
(function () {
  'use strict';

  var ES = (window.ES = window.ES || {});
  ES.games = ES.games || {};

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  // The depot, drawn on a 1600×900 stage. Things you can touch are listed with their boxes (in %).
  var DEPOT = {
    things: {
      door: [3, 11, 25, 76],
      van: [31, 37, 31, 52],
      parcels: [66, 7, 30, 64],
      board: [34, 8, 15, 22],
      clock: [51.5, 8.5, 5, 9],
      vest: [57.5, 17, 6, 27],
      keys: [50.5, 22, 4, 9],
      scanner: [70, 70, 8, 7],
      trolley: [88, 46, 11.5, 46],
    },
    sw: [28.6, 45.5], // centre of the switch, in %
    svg:
      '<svg viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs>' +
      '<linearGradient id="gt-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4c4b"/><stop offset="1" stop-color="#383a3a"/></linearGradient>' +
      '<linearGradient id="gt-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d2f30"/><stop offset="1" stop-color="#1c1e1f"/></linearGradient>' +
      '<linearGradient id="gt-van" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cfd3d3"/><stop offset=".5" stop-color="#eef0ee"/><stop offset="1" stop-color="#c3c8c8"/></linearGradient>' +
      '<linearGradient id="gt-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3a46"/><stop offset="1" stop-color="#151c22"/></linearGradient>' +
      '<pattern id="gt-blocks" width="120" height="60" patternUnits="userSpaceOnUse"><path d="M0 59.5h120M60 0v30M0 30h120M0 30v30M120 30v30" stroke="#2f3131" stroke-width="2" fill="none"/></pattern>' +
      '<pattern id="gt-slats" width="10" height="26" patternUnits="userSpaceOnUse"><rect width="10" height="26" fill="#6b7174"/><rect y="20" width="10" height="6" fill="#4d5356"/><rect y="2" width="10" height="2" fill="#7f8689"/></pattern>' +
      '</defs>' +
      // wall, floor, lines
      '<rect width="1600" height="700" fill="url(#gt-wall)"/><rect width="1600" height="700" fill="url(#gt-blocks)" opacity=".7"/>' +
      '<rect y="690" width="1600" height="210" fill="url(#gt-floor)"/>' +
      '<path d="M0 700h1600" stroke="#191b1c" stroke-width="6"/>' +
      '<path d="M420 900 560 700M1180 700 1320 900" stroke="#c9a227" stroke-width="10" opacity=".55"/>' +
      '<path d="M600 820h400" stroke="#c9a227" stroke-width="8" stroke-dasharray="40 30" opacity=".4"/>' +
      // roller door
      '<rect x="40" y="90" width="410" height="610" fill="#2a2d2f"/>' +
      '<rect x="56" y="104" width="378" height="596" fill="url(#gt-slats)"/>' +
      '<rect x="56" y="96" width="378" height="22" fill="#3d4245"/><rect x="200" y="660" width="90" height="14" rx="4" fill="#24282a"/>' +
      '<path d="M40 90v610M450 90v610" stroke="#c9a227" stroke-width="10" stroke-dasharray="26 26"/>' +
      // a pillar with the switch on it
      '<rect x="452" y="60" width="36" height="640" fill="#535655"/><rect x="452" y="60" width="8" height="640" fill="#5f6261"/>' +
      // route board, keys, clock, vest
      '<rect x="545" y="72" width="240" height="196" rx="6" fill="#e9e8e2"/><rect x="545" y="72" width="240" height="196" rx="6" fill="none" stroke="#8c8f8f" stroke-width="8"/>' +
      '<text x="565" y="112" font-family="var(--font-display),sans-serif" font-weight="800" font-size="30" fill="#2b2e30">ROUTE 7</text>' +
      '<path d="M565 140h120M565 168h150M565 196h100M565 224h140" stroke="#4b6aa5" stroke-width="7" stroke-linecap="round"/>' +
      '<text x="768" y="252" text-anchor="end" font-family="var(--font-display),sans-serif" font-weight="900" font-size="38" fill="#c0392b">41/41</text>' +
      '<rect x="812" y="198" width="60" height="80" rx="5" fill="#3a3d3f"/><circle cx="830" cy="222" r="5" fill="#9ea3a5"/><circle cx="855" cy="222" r="5" fill="#9ea3a5"/>' +
      '<path d="M830 226v22M855 226v16" stroke="#9ea3a5" stroke-width="3"/><rect x="822" y="246" width="16" height="10" rx="2" fill="#c9a227"/><rect x="848" y="240" width="14" height="9" rx="2" fill="#2c5ba0"/>' +
      '<circle cx="864" cy="118" r="38" fill="#f3f1ea" stroke="#2c2f31" stroke-width="7"/><path d="M864 118v-24M864 118l18 10" stroke="#2c2f31" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M960 158h20" stroke="#9ea3a5" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M935 168h70l18 30-8 200h-90l-8-200z" fill="#c8e63c"/><path d="M928 260h102M928 300h102" stroke="#d9dcdc" stroke-width="12" opacity=".9"/><path d="M970 168v230" stroke="#9fb52f" stroke-width="3"/>' +
      // the van
      '<path d="M510 760V470q0-120 120-130h260q120 10 120 130v290z" fill="url(#gt-van)"/>' +
      '<path d="M556 470q8-82 92-88h224q84 6 92 88z" fill="url(#gt-glass)"/>' +
      '<rect x="540" y="560" width="440" height="70" rx="12" fill="#2a2d2f"/>' +
      '<rect x="548" y="572" width="80" height="44" rx="10" fill="#fff6d8"/><rect x="892" y="572" width="80" height="44" rx="10" fill="#fff6d8"/>' +
      '<path d="M660 584h200M660 604h200" stroke="#3d4144" stroke-width="8"/>' +
      '<rect x="700" y="648" width="120" height="34" rx="4" fill="#f4f2ea" stroke="#2a2d2f" stroke-width="3"/><text x="760" y="674" text-anchor="middle" font-family="var(--font-display),sans-serif" font-weight="800" font-size="24" fill="#2a2d2f">ES 0041</text>' +
      '<rect x="520" y="740" width="80" height="50" rx="10" fill="#151718"/><rect x="920" y="740" width="80" height="50" rx="10" fill="#151718"/>' +
      '<path d="M532 520h-34v34h34" fill="#cfd3d3"/><path d="M988 520h34v34h-34" fill="#cfd3d3"/>' +
      // shelves with parcels
      '<g stroke="#7d8486" stroke-width="10"><path d="M1060 60v640M1300 60v640M1530 60v640"/><path d="M1050 250h490M1050 440h490M1050 630h490"/></g>' +
      '<g fill="#a77b4f" stroke="#7c5733" stroke-width="3">' +
      '<rect x="1072" y="150" width="110" height="96"/><rect x="1190" y="176" width="96" height="70"/><rect x="1312" y="128" width="130" height="118"/><rect x="1450" y="190" width="70" height="56"/>' +
      '<rect x="1072" y="350" width="80" height="86"/><rect x="1160" y="312" width="132" height="124"/><rect x="1310" y="368" width="96" height="68"/><rect x="1414" y="336" width="108" height="100"/>' +
      '<rect x="1072" y="532" width="140" height="94"/><rect x="1220" y="560" width="70" height="66"/><rect x="1316" y="520" width="104" height="106"/><rect x="1428" y="566" width="92" height="60"/>' +
      '</g>' +
      '<g fill="#e9e5d9"><rect x="1092" y="176" width="40" height="22"/><rect x="1330" y="150" width="46" height="26"/><rect x="1180" y="340" width="44" height="24"/><rect x="1434" y="358" width="40" height="22"/><rect x="1090" y="556" width="48" height="24"/><rect x="1334" y="546" width="42" height="24"/></g>' +
      '<g stroke="#d9c49a" stroke-width="6" opacity=".7"><path d="M1127 150v96M1377 128v118M1226 312v124M1468 336v100M1142 532v94M1368 520v106"/></g>' +
      // bench and scanner
      '<rect x="1080" y="660" width="380" height="18" fill="#5a5048"/><path d="M1100 678v120M1440 678v120" stroke="#3e3732" stroke-width="14"/>' +
      '<path d="M1140 632h80l10 22h-60l-14 30h-26l12-30h-12z" fill="#2c2f31"/><rect x="1150" y="640" width="30" height="8" fill="#c0392b"/>' +
      // cage trolley
      '<g stroke="#8f9698" stroke-width="7" fill="none"><rect x="1420" y="420" width="170" height="380"/><path d="M1462 420v380M1505 420v380M1548 420v380M1420 520h170M1420 620h170M1420 720h170"/></g>' +
      '<circle cx="1440" cy="820" r="16" fill="#1a1c1d"/><circle cx="1570" cy="820" r="16" fill="#1a1c1d"/>' +
      '</svg>',
  };

  // In 3D when the browser can (game-room.js, the depot scene); this flat version otherwise.
  ES.games.torch = function (host, api) {
    if (ES.games.room && ES.roomScenes && ES.roomScenes[api.scene] && ES.games.room.supported && ES.games.room.supported()) {
      var e3 = ES.games.room(host, api);
      if (e3) return e3;
    }
    return torch2d(host, api);
  };
  function torch2d(host, api) {
    var reduced = api.reduced;
    var D = DEPOT;
    var objs = api.objects || {};

    var root = document.createElement('div');
    root.className = 'gt';
    var html = '<div class="gt__scene" data-gt-scene>' + D.svg;
    Object.keys(D.things).forEach(function (id) {
      var b = D.things[id];
      var o = objs[id] || {};
      html += '<button type="button" class="gt__thing" data-obj="' + id + '" aria-label="' + (o.label || id).replace(/"/g, '&quot;') + '" style="left:' + b[0] + '%;top:' + b[1] + '%;width:' + b[2] + '%;height:' + b[3] + '%"></button>';
    });
    html += '<button type="button" class="gt__switch" data-gt-switch aria-label="' + api.hud.switchLabel.replace(/"/g, '&quot;') + '" style="left:' + D.sw[0] + '%;top:' + D.sw[1] + '%">' + ES.gameSwitchHtml(api) + '</button>';
    html += '</div><div class="gt__dark" data-gt-dark aria-hidden="true"></div><span class="gt__pilot" data-gt-pilot aria-hidden="true" style="left:' + D.sw[0] + '%;top:' + (D.sw[1] - 2.4) + '%"></span><span class="gt__arrow" data-gt-arrow aria-hidden="true"><i></i></span>';
    root.innerHTML = html;
    host.appendChild(root);

    var scene = root.querySelector('[data-gt-scene]');
    var dark = root.querySelector('[data-gt-dark]');
    var pilot = root.querySelector('[data-gt-pilot]');
    var arrow = root.querySelector('[data-gt-arrow]');
    var sw = root.querySelector('[data-gt-switch]');
    var W = 1, H = 1, SW = 1, SH = 1, SX = 0, SY = 0;
    var torch = { x: 0, y: 0, r: 120 }, aim = { x: 0, y: 0 };
    var big = 1, level = 0, ended = false, raf = 0;

    // the scene covers the view like a photo would (16:9, cropped)
    function layout() {
      var r = root.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      SW = Math.max(W, (H * 16) / 9);
      SH = (SW * 9) / 16;
      // keep the left part (door and switch) in view on narrow screens
      SX = W < SW ? clamp(-(SW - W) * 0.28, W - SW, 0) : 0;
      SY = (H - SH) / 2;
      scene.style.width = SW + 'px';
      scene.style.height = SH + 'px';
      scene.style.transform = 'translate(' + SX.toFixed(1) + 'px,' + SY.toFixed(1) + 'px)';
      torch.r = clamp(Math.min(W, H) * 0.17, 70, 170);
      sw.style.setProperty('--g-sw', ((SW * 0.024) / 6).toFixed(3) + 'px');
      pilot.style.left = SX + (SW * D.sw[0]) / 100 + 'px';
      pilot.style.top = SY + (SH * (D.sw[1] - 2.2)) / 100 + 'px';
      draw();
    }
    function swPoint() { return { x: SX + (SW * D.sw[0]) / 100, y: SY + (SH * D.sw[1]) / 100 }; }
    function draw() {
      var r = torch.r * big;
      dark.style.setProperty('--x', torch.x.toFixed(1) + 'px');
      dark.style.setProperty('--y', torch.y.toFixed(1) + 'px');
      dark.style.setProperty('--r', r.toFixed(1) + 'px');
      if (level >= 2 && !ended) {
        var s = swPoint();
        var dx = s.x - torch.x, dy = s.y - torch.y;
        var d = Math.hypot(dx, dy);
        arrow.classList.toggle('is-on', d > r * 0.9);
        var ang = Math.atan2(dy, dx);
        var rr = Math.min(d - 20, r + 26);
        arrow.style.transform = 'translate(' + (torch.x + Math.cos(ang) * rr).toFixed(1) + 'px,' + (torch.y + Math.sin(ang) * rr).toFixed(1) + 'px) rotate(' + (ang / Math.PI * 180).toFixed(1) + 'deg)';
      }
    }
    function loop() {
      raf = 0;
      var k = reduced ? 1 : 0.22;
      torch.x += (aim.x - torch.x) * k;
      torch.y += (aim.y - torch.y) * k;
      draw();
      if (Math.abs(aim.x - torch.x) > 0.5 || Math.abs(aim.y - torch.y) > 0.5) raf = requestAnimationFrame(loop);
    }
    function moveTo(x, y) {
      aim.x = clamp(x, 0, W);
      aim.y = clamp(y, 0, H);
      if (!raf) raf = requestAnimationFrame(loop);
    }

    // pointer: the light follows the mouse; on touch it sits just above your finger
    var touching = false;
    root.addEventListener('pointermove', function (e) {
      if (ended) return;
      if (e.pointerType === 'touch' && !touching) return;
      var r = root.getBoundingClientRect();
      moveTo(e.clientX - r.left, e.clientY - r.top - (e.pointerType === 'touch' ? 70 : 0));
      api.interacted();
    });
    root.addEventListener('pointerdown', function (e) {
      if (ended) return;
      if (e.pointerType === 'touch') touching = true;
      var r = root.getBoundingClientRect();
      if (!e.target.closest('button')) moveTo(e.clientX - r.left, e.clientY - r.top - (e.pointerType === 'touch' ? 70 : 0));
      api.interacted();
    });
    root.addEventListener('pointerup', function () { touching = false; });
    root.addEventListener('pointercancel', function () { touching = false; });
    root.style.touchAction = 'pan-y';

    // keys: arrows move the light
    function onKey(e) {
      if (ended || e.altKey || e.metaKey || e.ctrlKey) return;
      var a = document.activeElement;
      if (!(root.closest('[data-game]').contains(a))) return;
      var step = 40, dx = 0, dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else return;
      e.preventDefault();
      api.interacted();
      moveTo(aim.x + dx, aim.y + dy);
    }
    window.addEventListener('keydown', onKey);
    // Tab to a thing: shine on it
    root.addEventListener('focusin', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var rb = b.getBoundingClientRect(), r = root.getBoundingClientRect();
      moveTo(rb.left - r.left + rb.width / 2, rb.top - r.top + rb.height / 2);
    });

    root.addEventListener('click', function (e) {
      if (ended) return;
      api.interacted();
      if (e.target.closest('[data-gt-switch]')) return flip();
      var b = e.target.closest('.gt__thing');
      if (!b) return;
      var id = b.getAttribute('data-obj');
      api.sfx('tap');
      api.touch(id, 'object');
      api.say((objs[id] || {}).line);
      if (!e.detail) {
        // keyboard: already lit by focus
      } else {
        var r = root.getBoundingClientRect();
        moveTo(e.clientX - r.left, e.clientY - r.top);
      }
    });

    function assist(l) {
      level = Math.max(level, l);
      root.classList.add('assist-' + l);
      if (l >= 1) pilot.classList.add('is-on');
      if (l >= 3) {
        big = 1.8;
        sw.classList.add('is-big');
      }
      if (l >= 4) {
        var s = swPoint();
        moveTo(s.x, s.y + 10);
      }
      draw();
    }

    function flip() {
      if (ended) return;
      ended = true;
      sw.querySelector('.wallswitch').classList.add('is-flipped');
      arrow.classList.remove('is-on');
      window.removeEventListener('keydown', onKey);
      api.win({ how: 'switch' });
    }
    function outro(prepare, done) {
      var wait = function (ms, f) { setTimeout(f, reduced ? Math.min(ms, 300) : ms); };
      wait(420, function () { root.classList.add('is-dark'); });
      wait(1700, function () {
        prepare();
        if (reduced || !ES.gameFx) {
          root.classList.add('is-fading');
          setTimeout(done, 650);
          return;
        }
        api.sfx('sweep', 1.6);
        ES.gameFx.blinds(root, done);
      });
    }
    function switchTarget() {
      layout();
      var s = swPoint();
      var r = root.getBoundingClientRect();
      return { visible: true, x: r.left + s.x, y: r.top + s.y, size: (SH * 0.055) };
    }
    function start() {
      layout();
      // the light starts in the middle, pointed at nothing in particular
      torch.x = aim.x = W * 0.55;
      torch.y = aim.y = H * 0.55;
      draw();
    }
    function pause() {}
    function onResize() { layout(); }
    window.addEventListener('resize', onResize);
    function destroy() {
      ended = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      if (root.parentNode) root.parentNode.removeChild(root);
    }
    requestAnimationFrame(start);

    return { kind: 'torch', assistAt: [6000, 13000, 21000, 31000], start: start, assist: assist, outro: outro, pause: pause, destroy: destroy, switchTarget: switchTarget };
  }
})();
