/* ENDSHIFT game: a 3D room, drawn like a graphic novel (WebGL, see game-ink.js).
   You stand (or lie) in a workplace at the end of a shift. Look around by dragging, walk by
   tapping the floor or with the keys, tap things. Somewhere there's the switch.

   The rooms themselves are in game-scenes.js.
   The 3D picture is aria-hidden; a layer of real buttons next to it speaks for every thing
   you can use, so keyboards and screen readers get the same game. */
(function () {
  'use strict';

  var ES = (window.ES = window.ES || {});
  ES.games = ES.games || {};
  if (!ES.Ink || !ES.inkPaint || !ES.inkScenes) return;
  var Room = ES.inkScenes.Room, shell = ES.inkScenes.shell, makeSwitch = ES.inkScenes.makeSwitch, SCENES = ES.inkScenes.SCENES;

  var Ink = ES.Ink, M = Ink.M, PT = ES.inkPaint;
  var DEG = Math.PI / 180;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var angDiff = function (a, b) { return ((b - a) % 360 + 540) % 360 - 180; };
  var ease = {
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    inOut: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    in: function (t) { return t * t * t; },
    back: function (t) { var c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  };
  var INK = '#0d0f14';

  /* ------------------------------------------------------------------ engine */
  ES.games.room = function (host, api) {
    var S = SCENES[api.scene];
    if (!S) return null;
    var reduced = api.reduced;
    var R = S.room;

    var stage = document.createElement('div');
    stage.className = 'g3d';
    var canvas = document.createElement('canvas');
    canvas.className = 'g3d__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    stage.appendChild(canvas);
    var r = Ink.renderer(canvas);
    if (!r) return null;

    var fx = document.createElement('div');
    fx.className = 'g3d__fx';
    fx.setAttribute('aria-hidden', 'true');
    stage.appendChild(fx);
    var edge = document.createElement('div');
    edge.className = 'g3d__edge';
    edge.setAttribute('aria-hidden', 'true');
    edge.innerHTML = '<i></i>';
    stage.appendChild(edge);
    var a11y = document.createElement('div');
    a11y.className = 'g3d__a11y';
    stage.appendChild(a11y);
    var ring = document.createElement('span');
    ring.className = 'g3d__ring';
    ring.setAttribute('aria-hidden', 'true');
    stage.appendChild(ring);
    var nav = document.createElement('div');
    nav.className = 'g3d__nav';
    nav.innerHTML = '<button type="button" class="g3d__turn" data-turn="-1" aria-label="' + api.hud.left + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg></button><button type="button" class="g3d__turn" data-turn="1" aria-label="' + api.hud.right + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5"/></svg></button>';
    stage.appendChild(nav);
    host.appendChild(stage);

    var B = new Room(R, r);
    shell(B, R);
    S.build(B, R, api);
    var SW = S.sw;
    var sw = makeSwitch(B, SW, api);
    var objs = B.objs;
    var look = S.look;

    // flat buttons for everything you can use (the switch last)
    B.thingList.forEach(function (t) {
      var ab = document.createElement('button');
      ab.type = 'button';
      ab.className = 'g3d__ab';
      ab.setAttribute('data-obj', t.id);
      ab.setAttribute('aria-label', t.label);
      t.ab = ab;
      ab.__thing = t;
      if (t.id !== 'switch') a11y.appendChild(ab);
    });
    a11y.appendChild(sw.thing.ab);
    var hider = SW.hidden ? B.things[SW.hidden] : null;
    var revealed = !hider;
    if (hider) {
      sw.thing.ab.hidden = true;
      sw.thing.objs.forEach(function (ob) { ob.pick = false; });
    }

    /* Camera ------------------------------------------------------------------------------ */
    var cam = { x: S.cam.x, z: S.cam.z, eye: S.cam.eye, yaw: S.cam.yaw, pitch: S.cam.pitch, roll: 0 };
    var tgt = { x: cam.x, z: cam.z, eye: cam.eye, yaw: cam.yaw, pitch: cam.pitch, roll: 0 };
    var lying = cam.eye < 120;
    var Wv = 1, Hv = 1, hFov = 60, vFov = 60, P = 800;
    var path = [], walking = false, onArrive = null;
    var raf = 0, last = 0, paused = false, ended = false, keys = {};
    var torchMode = !!S.torch;
    var dark = torchMode ? 1 : 0, warm = 0, bgA = 1;
    // the hand torch points where you last pointed (the middle of the view to begin with)
    var aim = { x: -1, y: -1 }, torchA = 15, torchOn = torchMode;
    var t0 = performance.now();

    function camRec() {
      return { pos: [cam.x, cam.eye, cam.z], yaw: cam.yaw, pitch: cam.pitch, roll: cam.roll, fovy: vFov * DEG };
    }
    function resize() {
      var rc = stage.getBoundingClientRect();
      Wv = Math.max(1, rc.width);
      Hv = Math.max(1, rc.height);
      P = Math.max(Hv / 2 / Math.tan(35 * DEG), Wv / 2 / Math.tan(42 * DEG));
      hFov = (2 * Math.atan(Wv / 2 / P)) / DEG;
      vFov = (2 * Math.atan(Hv / 2 / P)) / DEG;
      var dpr = (ES.dprCap ? ES.dprCap(Wv * Hv > 1400000 ? 1.5 : 2) : Math.min(window.devicePixelRatio || 1, Wv * Hv > 1400000 ? 1.5 : 2));
      r.resize(Wv, Hv, dpr);
      need();
    }
    function project(p) {
      r.setCamera(camRec());
      return r.project(p);
    }
    // screen → the point on the floor under it
    function floorAt(sx, sy) {
      r.setCamera(camRec());
      var ry = r.ray(sx, sy);
      if (ry.d[1] >= -0.0001) return null;
      var t = -ry.o[1] / ry.d[1];
      return { x: ry.o[0] + ry.d[0] * t, z: ry.o[2] + ry.d[2] * t };
    }
    var yawTo = function (x, z) { return Math.atan2(x - cam.x, -(z - cam.z)) / DEG; };
    var pitchTo = function (x, y, z) { return Math.atan2(y - cam.eye, Math.hypot(x - cam.x, z - cam.z)) / DEG; };

    function inRect(p, rc) { return p.x >= rc[0] && p.x <= rc[2] && p.z >= rc[1] && p.z <= rc[3]; }
    function clampTo(p, rc) { return { x: clamp(p.x, rc[0], rc[2]), z: clamp(p.z, rc[1], rc[3]) }; }
    function nearestRect(p) {
      var best = null, bd = Infinity;
      S.walk.forEach(function (rc) {
        var q = clampTo(p, rc);
        var d = Math.hypot(q.x - p.x, q.z - p.z);
        if (d < bd) { bd = d; best = rc; }
      });
      return best;
    }
    function legal(p) { return clampTo(p, nearestRect(p)); }
    function route(p) {
      var from = { x: cam.x, z: cam.z };
      var to = legal(p);
      var ra = nearestRect(from), rb = nearestRect(to);
      var pts = [];
      if (ra !== rb) {
        var ix = [Math.max(ra[0], rb[0]), Math.max(ra[1], rb[1]), Math.min(ra[2], rb[2]), Math.min(ra[3], rb[3])];
        if (ix[0] <= ix[2] && ix[1] <= ix[3]) pts.push(clampTo(from, ix));
      }
      pts.push(to);
      return pts;
    }
    function getUp(then) {
      if (!lying) return then && then();
      lying = false;
      api.say(api.hud.getUp, 1800);
      putPhoneDown(true);
      path = [{ x: S.stand.x, z: S.stand.z, eye: 160, fast: true }];
      walking = true;
      onArrive = then || null;
      tgt.pitch = 0;
      need();
    }
    function walkTo(p, then, face) {
      if (lying) return getUp(function () { walkTo(p, then, face); });
      path = route(p);
      walking = true;
      onArrive = then || null;
      if (face) {
        tgt.yaw = cam.yaw + angDiff(cam.yaw, face.yaw);
        tgt.pitch = face.pitch;
      }
      need();
    }

    /* Loop: draws only when something changed (or something on screen moves) ------------- */
    var tweens = [];
    function tween(dur, fn, done, delay) {
      tweens.push({ t0: performance.now() + (delay || 0), dur: dur, fn: fn, done: done });
      need();
    }
    var dirty = true, busyUntil = 0;
    function need() {
      dirty = true;
      if (!raf && !paused && !ended) {
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    }
    var animT = {};
    function loop(now) {
      raf = 0;
      var dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
      last = now;
      var moving = false;
      var turn = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
      var step = (keys.fwd ? 1 : 0) + (keys.back ? -1 : 0);
      if (turn) {
        tgt.yaw += turn * 95 * dt;
        cam.yaw = tgt.yaw;
        moving = true;
      }
      if (step) {
        flipping = false; // walking yourself cancels a walk over to the switch
        if (lying) getUp();
        else {
          path = [];
          walking = false;
          var a = cam.yaw * DEG;
          var np = legal({ x: cam.x + Math.sin(a) * step * 150 * dt, z: cam.z - Math.cos(a) * step * 150 * dt });
          cam.x = tgt.x = np.x;
          cam.z = tgt.z = np.z;
          moving = true;
        }
      }
      if (walking && path.length) {
        var p = path[0];
        var dx = p.x - cam.x, dz = p.z - cam.z;
        var dist = Math.hypot(dx, dz);
        var speed = (p.fast ? 170 : 210) * dt;
        if (p.eye != null) cam.eye += (p.eye - cam.eye) * (1 - Math.exp(-dt * 6));
        if (dist <= speed && (p.eye == null || Math.abs(p.eye - cam.eye) < 1.5)) {
          cam.x = p.x;
          cam.z = p.z;
          if (p.eye != null) cam.eye = p.eye;
          path.shift();
        } else if (dist > speed) {
          cam.x += (dx / dist) * speed;
          cam.z += (dz / dist) * speed;
        }
        tgt.x = cam.x;
        tgt.z = cam.z;
        moving = true;
        if (!path.length) {
          walking = false;
          tgt.eye = cam.eye;
          var f = onArrive;
          onArrive = null;
          if (f) f();
        }
      }
      var k = reduced ? 1 : 1 - Math.exp(-dt * 7);
      ['yaw', 'pitch', 'roll', 'eye'].forEach(function (key) {
        if (key === 'eye' && walking) return;
        var d = tgt[key] - cam[key];
        if (Math.abs(d) > 0.02) {
          cam[key] += d * k;
          moving = true;
        } else cam[key] = tgt[key];
      });
      if (Math.abs(spin) > 0.5 && !dragging) {
        cam.yaw += spin * dt;
        tgt.yaw = cam.yaw;
        spin *= Math.exp(-dt * 5);
        moving = true;
      } else if (!dragging) spin = 0;
      // tweens
      var tn = performance.now();
      for (var i = tweens.length - 1; i >= 0; i--) {
        var tw = tweens[i];
        var e = (tn - tw.t0) / tw.dur;
        if (e < 0) { moving = true; continue; }
        if (e >= 1) {
          tw.fn(1);
          tweens.splice(i, 1);
          if (tw.done) tw.done();
        } else tw.fn(e);
        moving = true;
      }
      // things that change on their own (screens, clocks), and the help that pulses
      var tick = tn - t0;
      var live = false;
      B.anims.forEach(function (an, ai) {
        if (!animT[ai] || tn - animT[ai] >= an.every) {
          animT[ai] = tn;
          an.run(tick);
          dirty = true;
        }
        live = true;
      });
      if (assistLevel >= 1 && !ended) {
        var pulse = 0.5 + 0.5 * Math.sin(tick / 210);
        sw.glow.base = 0.35 + pulse * 0.65;
        sw.led.glow = 0.8 + pulse * 0.6;
        if (assistLevel >= 2) {
          sw.arrow.alpha = 1;
          sw.arrow.x = { t: [0, Math.sin(tick / 160) * 2.2, 0] };
          arrowEls.forEach(function (ch, ci) {
            ch.alpha = 0.25 + 0.75 * Math.max(0, Math.sin(tick / 270 - ci * 0.55));
          });
        }
        dirty = true;
        live = true;
      }
      if (moving) dirty = true;
      if (dirty) {
        draw();
        dirty = false;
      }
      if (moving || keys.any || tweens.length) raf = requestAnimationFrame(loop);
      else if (live) {
        // idle but alive: keep going at a gentler pace
        setTimeout(function () { if (!raf && !paused && !ended) raf = requestAnimationFrame(loop); }, 33);
      }
    }
    function draw() {
      var fr = {
        cam: camRec(),
        amb: look.amb,
        ink: look.ink,
        dark: dark,
        warm: warm,
        bg: (function () { var c = Ink.hex(look.bg); return [c[0], c[1], c[2], bgA]; })(),
        hatch: 1,
        grain: 0.035,
        cull: !crumbling,
        lights: B.lights.map(function (l) { return { p: l.p, c: l.c, i: l.i, r: l.r, k: l.k }; }),
      };
      if (torchMode && torchOn) {
        r.setCamera(fr.cam);
        var ax = aim.x < 0 ? Wv / 2 : aim.x, ay = aim.y < 0 ? Hv * 0.55 : aim.y;
        var ry = r.ray(ax, ay);
        var v = r.view;
        fr.spot = { p: [cam.x + v.r[0] * 12 - v.u[0] * 14, cam.eye - 14, cam.z + v.r[2] * 12 - v.u[2] * 14], d: norm3(ry.d), c: '#fff1d6', i: 2.4, a: torchA, soft: 0.014 };
      }
      // glows follow their light
      for (var i = 0; i < objs.length; i++) {
        var o = objs[i];
        if (o.kind && o.base != null) {
          var f = o.kind === 'work' ? 1 - dark : o.kind === 'warm' ? warm : 1;
          o.glow = o.base * f;
          o.hidden = o.glow < 0.003 || o.gone;
        }
        if (o.warmEmit != null) o.emit = o.warmEmit * warm + (o.baseEmit || 0);
      }
      r.render(objs, fr);
      if (assistLevel >= 2) edgeArrow();
      if (ringed) placeRing();
    }

    /* Input -------------------------------------------------------------------------------- */
    var dragging = false, dragMoved = false, sx0 = 0, sy0 = 0, lx = 0, ly = 0, lt = 0, spin = 0, pid = null, suppressClick = false;
    stage.addEventListener('pointerdown', function (e) {
      if (ended || e.button > 0) return;
      if (e.target.closest('.g3d__nav, .g-phone')) return;
      dragging = true;
      dragMoved = false;
      sx0 = lx = e.clientX;
      sy0 = ly = e.clientY;
      lt = performance.now();
      spin = 0;
      pid = e.pointerId;
      aimAt(e);
      api.interacted();
    });
    function aimAt(e) {
      if (!torchMode || ended) return;
      var rc = stage.getBoundingClientRect();
      aim.x = e.clientX - rc.left;
      aim.y = e.clientY - rc.top - (e.pointerType === 'touch' ? 60 : 0);
      need();
    }
    stage.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'mouse' || dragging) aimAt(e);
      if (!dragging && e.pointerType === 'mouse' && !ended) hover(e);
      if (!dragging || e.pointerId !== pid) return;
      var dx = e.clientX - lx, dy = e.clientY - ly;
      if (!dragMoved && Math.hypot(e.clientX - sx0, e.clientY - sy0) > 7) {
        dragMoved = true;
        try { stage.setPointerCapture(pid); } catch (er) {}
        stage.classList.add('is-dragging');
      }
      if (!dragMoved) return;
      var now = performance.now();
      var dyaw = -dx * (hFov / Wv);
      cam.yaw += dyaw;
      tgt.yaw = cam.yaw;
      if (e.pointerType !== 'touch') {
        cam.pitch = clamp(cam.pitch + dy * (vFov / Hv), -32, 26);
        tgt.pitch = cam.pitch;
      }
      var dtm = Math.max(1, now - lt);
      spin = (dyaw / dtm) * 1000 * 0.6;
      lx = e.clientX;
      ly = e.clientY;
      lt = now;
      need();
    });
    function endDrag(e) {
      if (!dragging || (e && e.pointerId !== pid)) return;
      dragging = false;
      stage.classList.remove('is-dragging');
      try { stage.releasePointerCapture(pid); } catch (er) {}
      if (dragMoved) {
        suppressClick = true;
        setTimeout(function () { suppressClick = false; }, 0);
        if (reduced || performance.now() - lt > 80) spin = 0;
        need();
      }
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('pointerleave', function () { setHover(null); });

    function pickAt(cx, cy) {
      var rc = stage.getBoundingClientRect();
      var sx = cx - rc.left, sy = cy - rc.top;
      r.setCamera(camRec());
      var hit = r.pick(r.ray(sx, sy), objs);
      // a generous target for the switch: anywhere close to it on screen counts
      if (revealed && !ended) {
        var sp = r.project(sw.pos);
        if (!sp.behind) {
          var rad = Math.max(26, 12 * sp.s);
          if (Math.hypot(sp.x - sx, sp.y - sy) < rad && (!hit || hit.obj.thing !== 'switch')) {
            if (!hit || hit.t > sp.z - 40) return { thing: B.things['switch'] };
          }
        }
      }
      if (!hit) return null;
      if (hit.obj.thing) return { thing: B.things[hit.obj.thing], p: hit.p };
      if (hit.obj.floor) return { floor: true, p: hit.p, sx: sx, sy: sy };
      return null;
    }
    var hovered = null;
    function setHover(t) {
      if (hovered === t) return;
      if (hovered) hovered.objs.forEach(function (o) { o.hi = 0; });
      hovered = t;
      if (t) t.objs.forEach(function (o) { o.hi = 1; });
      stage.classList.toggle('is-pointing', !!t);
      need();
    }
    var hoverT = 0;
    function hover(e) {
      if (hoverT) return;
      hoverT = requestAnimationFrame(function () {
        hoverT = 0;
        var h = pickAt(e.clientX, e.clientY);
        setHover(h && h.thing && (h.thing.id !== 'switch' || revealed) ? h.thing : null);
      });
    }

    stage.addEventListener('click', function (e) {
      if (ended) return;
      if (suppressClick) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      var turnBtn = e.target.closest('[data-turn]');
      if (turnBtn) {
        api.interacted();
        // (the switch can sit right under a turn arrow, on a phone: a tap on it presses it)
        var hs = e.detail && revealed ? pickAt(e.clientX, e.clientY) : null;
        if (hs && hs.thing && hs.thing.id === 'switch') return use('switch', hs.thing);
        turnBy(+turnBtn.getAttribute('data-turn'));
        return;
      }
      if (e.target.closest('.g-phone')) {
        api.interacted();
        putPhoneDown(false);
        return;
      }
      if (e.target.closest('.g3d__ab')) return;
      var h = pickAt(e.clientX, e.clientY);
      if (!h) return;
      api.interacted();
      if (h.thing) use(h.thing.id, h.thing);
      else if (h.floor) {
        flipping = false; // you'd rather go there
        walkTo({ x: h.p[0], z: h.p[2] });
        marker(h.p);
      }
    });
    function turnBy(dir) {
      var stepDeg = hFov > 60 ? 90 : 45;
      tgt.yaw = Math.round((tgt.yaw + dir * stepDeg) / stepDeg) * stepDeg;
      if (reduced) cam.yaw = tgt.yaw;
      need();
    }
    var ringTex = B.T('ring', function () {
      var c = PT.cv(128, 128), x = c.getContext('2d');
      x.strokeStyle = '#f2a84b';
      x.lineWidth = 12;
      x.beginPath();
      x.arc(64, 64, 52, 0, 7);
      x.stroke();
      return c;
    });
    function marker(p) {
      var m = Ink.obj({ geo: 'card', pos: [p[0], 0.8, p[2]], R: M.rotX(-90 * DEG), s: [34, 34, 1], color: '#ffffff', map: ringTex, mapAlpha: true, blend: 'alpha', unlit: true, border: 0, hatch: 0 });
      objs.push(m);
      tween(reduced ? 300 : 800, function (e) {
        m.alpha = 1 - e;
        m.x = { k: 0.6 + e * 0.6 };
      }, function () {
        var i = objs.indexOf(m);
        if (i >= 0) objs.splice(i, 1);
        need();
      });
    }

    // keyboard, only while focus is in the game
    var KEYMAP = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'fwd', w: 'fwd', W: 'fwd', ArrowDown: 'back', s: 'back', S: 'back' };
    function keyOk() {
      var a = document.activeElement;
      if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return false;
      return host.closest('[data-game]').contains(a) || a === document.body;
    }
    function onKeyDown(e) {
      if (ended || e.altKey || e.metaKey || e.ctrlKey) return;
      var k = KEYMAP[e.key];
      if (!k || !keyOk()) return;
      if (document.activeElement === document.body && !api.inView()) return;
      e.preventDefault();
      api.interacted();
      if (torchMode) { aim.x = -1; aim.y = -1; }
      keys[k] = true;
      keys.any = true;
      need();
    }
    function onKeyUp(e) {
      var k = KEYMAP[e.key];
      if (!k) return;
      keys[k] = false;
      keys.any = keys.left || keys.right || keys.fwd || keys.back;
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    var onBlur = function () { keys = {}; };
    window.addEventListener('blur', onBlur);

    // A flat button got focus (keyboard): turn to face its thing and ring it
    var ringed = null;
    function placeRing() {
      if (!ringed) return;
      r.setCamera(camRec());
      var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      ringed.objs.forEach(function (o) {
        if (o.hidden || o.gone) return;
        var pl = Ink.place(o);
        for (var c = 0; c < 8; c++) {
          var lp = [(c & 1 ? 0.5 : -0.5) * pl.s[0], (c & 2 ? 0.5 : -0.5) * pl.s[1], (o.geo === 'card' ? 0 : (c & 4 ? 0.5 : -0.5)) * pl.s[2]];
          var w = M.apply3(pl.R, lp);
          var q = r.project([pl.p[0] + w[0], pl.p[1] + w[1], pl.p[2] + w[2]]);
          if (q.behind) continue;
          x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y);
        }
      });
      if (x0 === Infinity) return;
      x0 = clamp(x0 - 6, 4, Wv - 4); x1 = clamp(x1 + 6, 4, Wv - 4);
      y0 = clamp(y0 - 6, 4, Hv - 4); y1 = clamp(y1 + 6, 4, Hv - 4);
      ring.style.transform = 'translate(' + x0.toFixed(0) + 'px,' + y0.toFixed(0) + 'px)';
      ring.style.width = Math.max(0, x1 - x0).toFixed(0) + 'px';
      ring.style.height = Math.max(0, y1 - y0).toFixed(0) + 'px';
    }
    a11y.addEventListener('focusin', function (e) {
      var ab = e.target.closest('.g3d__ab');
      if (!ab || !ab.__thing) return;
      var t = ab.__thing;
      var kb = true;
      try { kb = ab.matches(':focus-visible'); } catch (er) {}
      ringed = t;
      ring.classList.toggle('is-on', kb);
      var y = yawTo(t.c[0], t.c[2]);
      if (Math.abs(angDiff(cam.yaw, y)) > hFov * 0.3 || Math.abs(pitchTo(t.c[0], t.c[1], t.c[2]) - cam.pitch) > vFov * 0.35) {
        tgt.yaw = cam.yaw + angDiff(cam.yaw, y);
        tgt.pitch = clamp(pitchTo(t.c[0], t.c[1], t.c[2]), -25, 20);
        if (reduced) { cam.yaw = tgt.yaw; cam.pitch = tgt.pitch; }
      }
      if (torchMode) { aim.x = -1; aim.y = -1; }
      need();
    });
    a11y.addEventListener('focusout', function () {
      ringed = null;
      ring.classList.remove('is-on');
    });
    a11y.addEventListener('click', function (e) {
      var ab = e.target.closest('.g3d__ab');
      if (!ab || ended) return;
      e.stopPropagation();
      api.interacted();
      use(ab.getAttribute('data-obj'), ab.__thing);
    });

    /* Using things ------------------------------------------------------------------------- */
    var info = api.objects;
    function use(id, t) {
      if (id === 'switch') return flip();
      var inf = info[id] || {};
      if (t === hider && !revealed) {
        api.sfx('rustle');
        api.say(inf.line);
        hideAway(t);
        reveal(inf.reveal);
        return;
      }
      api.sfx('tap');
      api.touch(id, t.decoy ? 'decoy' : 'object');
      api.say(inf.line);
      // a little nudge: the thing lifts and settles
      if (!reduced)
        tween(420, function (e) {
          var b = Math.sin(e * Math.PI) * (1 - e * 0.4);
          t.objs.forEach(function (o) { if (!o.gone) { o.x = { t: [0, b * 1.6, 0], k: 1 + b * 0.025 }; o.hi = b * 2; } });
        }, function () { t.objs.forEach(function (o) { o.x = null; o.hi = hovered === t ? 1 : 0; }); });
    }
    function reveal(line) {
      if (revealed) return;
      revealed = true;
      sw.thing.ab.hidden = false;
      sw.thing.objs.forEach(function (o) { o.pick = true; });
      api.reveal(SW.hidden);
      if (line) setTimeout(function () { api.say(line); }, 900);
      need();
    }
    // the thing in front of the switch gets out of the way
    function hideAway(t) {
      if (t.ab) {
        if (document.activeElement === t.ab) setTimeout(function () { try { sw.thing.ab.focus({ preventScroll: true }); } catch (er) {} }, 60);
        t.ab.hidden = true;
      }
      var swing = SW.hidden === 'clipboard';
      t.objs.forEach(function (o, i) {
        o.pick = false;
        if (reduced) { o.hidden = true; o.gone = true; return; }
        var c = o.pos.slice();
        if (swing) {
          // a sheet on a hook swings up and over
          var axis = M.apply3(o.R, [1, 0, 0]);
          var top = M.apply3(o.R, [0, o.s[1] / 2, 0]);
          var pivot = [c[0] + top[0], c[1] + top[1], c[2] + top[2]];
          tween(700, function (e) {
            o.x = { c: pivot, R: M.axis(axis, -ease.back(e) * 118 * DEG) };
          });
          return;
        }
        // tickets: spiked, they flutter down to the floor
        var out = M.apply3(o.R, [0, 0, 1]);
        var d = { x: out[0] * rnd(20, 60) + rnd(-30, 30), z: out[2] * rnd(20, 60) + rnd(-30, 30) };
        var ax = norm3([rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)]);
        var ang = rnd(160, 420) * DEG;
        tween(900 + Math.random() * 500, function (e) {
          var fall = ease.in(e);
          o.x = { t: [d.x * ease.out(e), -(c[1] - 1) * fall, d.z * ease.out(e)], R: M.axis(ax, ang * e) };
        }, function () { o.hidden = true; o.gone = true; }, i * 45);
      });
    }
    function norm3(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }

    /* Help that gets louder ----------------------------------------------------------------- */
    var assistLevel = 0;
    var arrowEls = [];
    function assist(level) {
      assistLevel = Math.max(assistLevel, level);
      stage.classList.add('assist-' + level);
      if (level >= 2) {
        floorArrows();
        edgeArrow();
      }
      if (level >= 3) {
        if (!revealed && hider) {
          hideAway(hider);
          reveal(info[SW.hidden] && info[SW.hidden].reveal);
        }
        var c = sw.pos;
        var out = M.apply3(sw.plate.R, [0, 0, 1]);
        if (!reduced)
          tween(800, function (e) {
            var k = 1 + ease.back(e);
            sw.thing.objs.forEach(function (o) { o.x = { c: c, k: k, t: [out[0] * e * 2, 0, out[2] * e * 2] }; });
          });
        else sw.thing.objs.forEach(function (o) { o.x = { c: c, k: 2 }; });
      }
      if (level >= 3 && torchMode && torchA < 24) tween(reduced ? 1 : 700, function (e) { torchA = 15 + 11 * ease.out(e); });
      // (not if you're already on your way to press it: walking you somewhere else would cancel that)
      if (level >= 4 && !flipping) {
        if (lying) getUp(function () { lookAtSwitch(true); });
        else lookAtSwitch(true);
        if (torchMode) { aim.x = -1; aim.y = -1; }
      }
      need();
    }
    function lookAtSwitch(walk) {
      var go = function () {
        tgt.yaw = cam.yaw + angDiff(cam.yaw, yawTo(sw.pos[0], sw.pos[2]));
        tgt.pitch = clamp(pitchTo(sw.pos[0], sw.pos[1], sw.pos[2]), -25, 20);
        need();
      };
      if (walk) walkTo({ x: (cam.x + sw.stand.x * 2) / 3, z: (cam.z + sw.stand.z * 2) / 3 }, go, { yaw: yawTo(sw.pos[0], sw.pos[2]), pitch: 0 });
      else go();
    }
    var chevTex = B.T('chev', function () { return PT.chev(128, 128); });
    function floorArrows() {
      arrowEls.forEach(function (a) { var i = objs.indexOf(a); if (i >= 0) objs.splice(i, 1); });
      arrowEls = [];
      var to = legal({ x: sw.stand.x, z: sw.stand.z });
      var seq = [{ x: cam.x, z: cam.z }].concat(route(to));
      var all = [];
      for (var i = 0; i < seq.length - 1; i++) {
        var a = seq[i], b = seq[i + 1];
        var len = Math.hypot(b.x - a.x, b.z - a.z);
        var n = Math.max(1, Math.round(len / 42));
        for (var j = 1; j <= n; j++) {
          var tt = j / n;
          all.push({ x: a.x + (b.x - a.x) * tt, z: a.z + (b.z - a.z) * tt, dx: b.x - a.x, dz: b.z - a.z });
        }
      }
      all.slice(0, 14).forEach(function (p) {
        var dirYaw = Math.atan2(p.dx, -p.dz);
        var o = Ink.obj({ geo: 'card', pos: [p.x, 0.9, p.z], R: M.mul3(M.rotY(-dirYaw), M.rotX(-90 * DEG)), s: [26, 26, 1], color: '#ffffff', map: chevTex, mapAlpha: true, blend: 'alpha', unlit: true, border: 0, hatch: 0, alpha: 0.3 });
        objs.push(o);
        arrowEls.push(o);
      });
    }
    function edgeArrow() {
      var p = project(sw.pos);
      var show = p.behind || p.x < 30 || p.x > Wv - 30 || p.y < 30 || p.y > Hv - 30;
      edge.classList.toggle('is-on', !!show && assistLevel >= 2 && !ended);
      if (!show) return;
      var dir = p.behind ? (p.x > 0 ? 1 : -1) : p.x > Wv / 2 ? 1 : -1;
      var yy = p.behind || p.x < 0 || p.x > Wv ? Hv * 0.3 : clamp(p.y, 50, Hv - 50);
      if (Math.abs(yy - Hv / 2) < 44) yy = Hv / 2 - 52;
      edge.style.transform = 'translate(' + (dir > 0 ? Wv - 46 : 10) + 'px,' + (yy - 18).toFixed(0) + 'px)';
      edge.classList.toggle('is-right', dir > 0);
    }

    /* The bed scene: a phone in your hand ----------------------------------------------------- */
    var phone = null, phoneTimer = 0, phoneN = 0, phoneDown = false;
    if (S.phone && api.data.phone) {
      phone = document.createElement('button');
      phone.type = 'button';
      phone.className = 'g-phone';
      phone.setAttribute('aria-label', api.data.phone.down);
      phone.innerHTML = '<span class="g-phone__body" aria-hidden="true"><span class="g-phone__screen"><span class="g-phone__app">' + api.data.phone.app + '</span><span class="g-phone__list" data-phone-list></span></span></span>';
      stage.appendChild(phone);
    }
    function phonePing() {
      if (!phone || phoneDown || ended) return;
      var m = api.data.phone.msgs[phoneN % api.data.phone.msgs.length];
      phoneN++;
      var list = phone.querySelector('[data-phone-list]');
      var row = document.createElement('span');
      row.className = 'g-phone__msg';
      row.innerHTML = '<b></b><span></span>';
      row.firstChild.textContent = m[0];
      row.lastChild.textContent = m[1];
      list.insertBefore(row, list.firstChild);
      while (list.children.length > 4) list.removeChild(list.lastChild);
      phone.classList.remove('is-buzz');
      void phone.offsetWidth;
      phone.classList.add('is-buzz');
      api.sfx('buzz');
      phoneTimer = setTimeout(phonePing, Math.max(1600, 3600 - phoneN * 260));
    }
    function putPhoneDown(silent) {
      if (!phone || phoneDown) return;
      phoneDown = true;
      clearTimeout(phoneTimer);
      phone.classList.add('is-down');
      phone.tabIndex = -1;
      if (!silent) api.say(api.data.phone.down);
    }

    /* The switch -------------------------------------------------------------------------------- */
    // Pressing it from across the room walks you over first. That walk can be cut short (a tap on
    // the floor, the arrow keys), which cancels the press; the help never walks you anywhere else
    // while you're on your way. If the walk is lost some other way, pressing again starts over.
    var flipping = false, flipThere = false;
    function flip() {
      if (ended) return;
      if (flipping) {
        if (walking || flipThere) return; // on the way, or there and about to press it
        flipping = false;
      }
      var d = Math.hypot(sw.stand.x - cam.x, sw.stand.z - cam.z);
      var face = { yaw: yawTo(sw.pos[0], sw.pos[2]), pitch: 0 };
      if (lying || d > 40) {
        flipping = true;
        flipThere = false;
        api.say(lying ? api.hud.getUp : api.hud.walkTo, 1600);
        walkTo(sw.stand, function () {
          flipThere = true;
          tgt.yaw = cam.yaw + angDiff(cam.yaw, yawTo(sw.pos[0], sw.pos[2]));
          tgt.pitch = clamp(pitchTo(sw.pos[0], sw.pos[1], sw.pos[2]), -20, 20);
          need();
          setTimeout(function () { flipping = flipThere = false; doFlip(); }, reduced ? 50 : 380);
        }, face);
        return;
      }
      doFlip();
    }
    function doFlip() {
      if (ended) return;
      ended = true;
      keys = {};
      setHover(null);
      putPhoneDown(true);
      edge.classList.remove('is-on');
      // the rocker goes down
      var R0 = sw.rocker.R;
      var axis = M.apply3(R0, [1, 0, 0]);
      var px = sw.rocker.x;
      tween(reduced ? 1 : 180, function (e) {
        var base = px || {};
        var x = { c: base.c || sw.pos, k: base.k, t: base.t, R: M.axis(axis, 24 * DEG * e) };
        sw.rocker.x = x;
        sw.led.x = x;
      });
      sw.led.emit = 0;
      sw.glow.base = 0;
      sw.arrow.alpha = 0;
      api.win({ how: 'switch' });
    }

    /* The end: lights out, a beat, then the room comes apart -------------------------------- */
    var crumbling = false;
    function outro(prepare, done) {
      clearTimeout(phoneTimer);
      arrowEls.forEach(function (a) { a.hidden = true; a.gone = true; });
      ended = true;
      need();
      var T = function (ms, f) { setTimeout(f, reduced ? Math.min(ms, 400) : ms); };
      if (torchMode) {
        // the torch clicks off; the evening comes up instead
        setTimeout(function () { torchOn = false; need(); }, reduced ? 0 : 260);
      } else if (!reduced) {
        // the tubes stutter
        var seq = [0.85, 0.1, 0.9, 0.3, 1];
        seq.forEach(function (v, i) { setTimeout(function () { dark = v; need(); }, i * 64); });
      } else dark = 1;
      T(330, function () {
        dark = 1;
        stage.classList.add('is-dark');
        tween(reduced ? 1 : 1400, function (e) { warm = ease.out(e); }, null, reduced ? 0 : 350);
      });
      T(1800, function () {
        prepare();
        if (reduced) {
          stage.classList.add('is-fading');
          setTimeout(done, 650);
          return;
        }
        api.sfx('sweep', 2.8);
        crumble();
        setTimeout(done, 4400);
      });
    }
    function crumble() {
      crumbling = true;
      stage.classList.add('is-crumbling');
      tween(1200, function (e) { bgA = 1 - e; }, null, 200);
      tgt.pitch = cam.pitch + 8;
      tgt.roll = -5;
      tgt.eye = cam.eye + 30;
      var origin = sw.pos;
      objs.forEach(function (o) {
        if (o.gone) return;
        if (o.x) {
          // bake whatever moved it so far into where it is
          var pl = Ink.place(o);
          o.pos = pl.p; o.R = pl.R; o.s = pl.s; o.x = null;
        }
        var c = o.pos.slice();
        var dx = c[0] - cam.x, dz = c[2] - cam.z;
        var len = Math.hypot(dx, dz) || 1;
        var fromSw = Math.hypot(c[0] - origin[0], c[1] - origin[1], c[2] - origin[2]);
        var delay = 80 + fromSw * 2.1 + Math.random() * 380;
        var dur = 2000 + Math.random() * 900;
        var up = o.shell === 'ceil';
        var push = rnd(60, 240);
        var drop = up ? rnd(160, 380) : -rnd(180, 460);
        var ax = norm3([rnd(-1, 1), rnd(-0.4, 0.4), rnd(-1, 1)]);
        var ang = rnd(70, 240) * DEG;
        tween(dur, function (e) {
          var k = ease.in(e);
          o.x = { c: c, t: [(dx / len) * push * k, drop * k, (dz / len) * push * k], R: M.axis(ax, ang * ease.inOut(e)), k: 1 - 0.55 * k };
          if (o.base != null) o.base *= 0.985;
        }, function () { o.hidden = true; o.gone = true; }, delay);
      });
    }

    /* Where the switch is on screen (for the opening to fly into) ----------------------------- */
    function switchTarget() {
      resize();
      var p = project(sw.pos);
      var rc = stage.getBoundingClientRect();
      if (p.behind || p.x < 0 || p.x > Wv || p.y < 0 || p.y > Hv) {
        var dir = p.behind ? (p.x > 0 ? 1 : -1) : p.x > Wv / 2 ? 1 : -1;
        return { visible: false, x: rc.left + (dir > 0 ? rc.width + 40 : -40), y: rc.top + rc.height * 0.45, size: 20 };
      }
      return { visible: true, x: rc.left + p.x, y: rc.top + p.y, size: Math.max(6, 16 * p.s) };
    }

    function start() {
      if (phone) phoneTimer = setTimeout(phonePing, 900);
      need();
    }
    function pause(on) {
      paused = on;
      if (on) {
        cancelAnimationFrame(raf);
        raf = 0;
        keys = {};
      } else need();
    }
    var ro = null;
    function destroy() {
      ended = true;
      cancelAnimationFrame(raf);
      clearTimeout(phoneTimer);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', resize);
      if (ro) ro.disconnect();
      r.destroy();
      if (stage.parentNode) stage.parentNode.removeChild(stage);
    }

    window.addEventListener('resize', resize);
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(function () { resize(); });
      ro.observe(stage);
    }
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); ended = true; });
    resize();
    // fonts arrive late: repaint the textures with words on them
    if (document.fonts && document.fonts.ready)
      document.fonts.ready.then(function () {
        if (ended) return;
        Object.keys(B.tex).forEach(function (k) { var t = B.tex[k]; if (t.make && !/^(glow|floor|ceil|wall-|duvet|curtain|radiator|steel|grate|leaf)/.test(k)) t.update(t.make()); });
        need();
      });
    // for tests: where things are, and what a tap at (x, y) on the page would press
    ES.roomDebug = function () {
      var p = project(sw.pos), rc = stage.getBoundingClientRect();
      return {
        cam: cam, tgt: tgt, raf: raf, paused: paused, ended: ended, walking: walking, path: path, lying: lying, objs: objs.length, things: Object.keys(B.things),
        revealed: revealed, assist: assistLevel, flipping: flipping, stand: sw.stand, swPos: sw.pos,
        sw: { visible: !p.behind && p.x >= 0 && p.x <= Wv && p.y >= 0 && p.y <= Hv, x: rc.left + p.x, y: rc.top + p.y, size: Math.max(6, 16 * p.s) },
        pick: function (x, y) { var h = pickAt(x, y); return h ? (h.thing ? h.thing.id : h.floor ? 'floor' : '?') : null; },
      };
    };

    return {
      kind: 'room',
      assistAt: S.assistAt,
      start: start,
      assist: assist,
      outro: outro,
      pause: pause,
      destroy: destroy,
      switchTarget: switchTarget,
      revealed: function () { return revealed; },
    };
  };
  ES.games.room.supported = Ink.supported;
})();
