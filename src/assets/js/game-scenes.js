/* ENDSHIFT: the rooms of the ENDSHIFT world, drawn with the ink renderer (game-ink.js).
   The same rooms are played in the hero game (game-room.js), stand behind the message
   floods, and are shot as panels for the story on the home page (story.js).

   Scenes are written in centimetres, relative to a wall: u = along the wall (to your right
   as you face it), v = height from the floor, o = distance out from the wall. */
(function () {
  'use strict';

  var ES = (window.ES = window.ES || {});
  ES.games = ES.games || {};
  if (!ES.Ink || !ES.inkPaint) return;

  var Ink = ES.Ink, M = Ink.M, PT = ES.inkPaint;
  var DEG = Math.PI / 180;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var angDiff = function (a, b) { return ((b - a) % 360 + 540) % 360 - 180; };
  var ease = {
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    inOut: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    in: function (t) { return t * t * t; },
    back: function (t) { var c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  };
  var INK = '#0d0f14';

  /* ------------------------------------------------------------------ builder */
  var VIS = ['map', 'mapFace', 'rep', 'off', 'emit', 'emitDark', 'border', 'hatch', 'decal', 'alpha', 'blend', 'taper', 'shape', 'soft', 'unlit', 'mapAlpha', 'glow', 'kind', 'pickPad', 'bill', 'name', 'floor', 'warmEmit', 'baseEmit'];
  function mk(s, geo, pos, R, size) {
    var o = { geo: geo, pos: pos, R: R, s: size, color: s.c || s.color };
    VIS.forEach(function (k) { if (s[k] !== undefined) o[k] = s[k]; });
    return o;
  }
  // a rotation that turns a cylinder's axis (y) to point along d
  function upTo(d) {
    var l = Math.hypot(d[0], d[1], d[2]) || 1, x = d[0] / l, y = d[1] / l, z = d[2] / l;
    var s = Math.hypot(z, x);
    if (s < 1e-5) return y > 0 ? M.rotY(0) : M.rotX(Math.PI);
    return M.axis([z / s, 0, -x / s], Math.acos(clamp(y, -1, 1)));
  }
  function rot(a, s) {
    var R = M.rotY(((a || 0) + (s.ry || 0)) * DEG);
    if (s.rx) R = M.mul3(R, M.rotX(s.rx * DEG));
    if (s.rz) R = M.mul3(R, M.rotZ(s.rz * DEG));
    return R;
  }

  function Room(R, r) {
    this.R = R;
    this.r = r;
    this.objs = [];
    this.things = {};
    this.thingList = [];
    this.lights = [];
    this.tex = {};
    this.cur = null;
    this.anims = []; // textures that change over time
  }
  // The frame of a wall: where (u, o) on it sits in the room (x, z), and which way it faces.
  Room.prototype.frame = function (wall) {
    var hw = this.R.w / 2, hd = this.R.d / 2;
    if (wall === 'n') return { a: 0, at: function (u, o) { return [u, -hd + o]; } };
    if (wall === 'e') return { a: -90, at: function (u, o) { return [hw - o, u]; } };
    if (wall === 's') return { a: 180, at: function (u, o) { return [-u, hd - o]; } };
    return { a: 90, at: function (u, o) { return [-hw + o, -u]; } };
  };
  // a texture, made once per room
  Room.prototype.T = function (key, make, repeat) {
    if (!this.tex[key]) {
      this.tex[key] = this.r.texture(make(), repeat);
      this.tex[key].make = make;
    }
    return this.tex[key];
  };
  Room.prototype.add = function (o) {
    o = Ink.obj(o);
    if (this.cur) {
      o.thing = this.cur.id;
      o.pick = true;
      this.cur.objs.push(o);
    }
    this.objs.push(o);
    return o;
  };
  Room.prototype.box = function (s) {
    var F = this.frame(s.wall), p = F.at(s.u, (s.o || 0) + s.d / 2);
    return this.add(mk(s, 'box', [p[0], (s.v || 0) + s.h / 2, p[1]], rot(F.a, s), [s.w, s.h, s.d]));
  };
  // a flat card standing on a wall (pictures, screens, papers)
  Room.prototype.card = function (s) {
    var F = this.frame(s.wall), p = F.at(s.u, s.o == null ? 0.5 : s.o);
    var o = mk(s, 'card', [p[0], (s.v || 0) + s.h / 2, p[1]], rot(F.a, s), [s.w, s.h, 1]);
    if (o.decal == null) o.decal = 1;
    return this.add(o);
  };
  // a flat card lying on a surface at height v
  Room.prototype.flat = function (s) {
    var F = this.frame(s.wall), p = F.at(s.u, (s.o || 0) + s.d / 2);
    var R = M.mul3(M.rotY((F.a + (s.ry || 0)) * DEG), M.rotX(-90 * DEG));
    if (s.rz) R = M.mul3(R, M.rotZ(s.rz * DEG));
    var o = mk(s, 'card', [p[0], (s.v || 0) + (s.lift == null ? 0.15 : s.lift), p[1]], R, [s.w, s.d, 1]);
    if (o.decal == null) o.decal = 1;
    return this.add(o);
  };
  // a cylinder: standing up by default; rx 90 lies it flat against the wall (a clock);
  // rz 90 lies it along the wall (a rail), centred at height cy
  Room.prototype.cyl = function (s) {
    var out = Math.abs(s.rx || 0) === 90 ? s.h / 2 : s.r;
    var F = this.frame(s.wall), p = F.at(s.u, (s.o || 0) + out);
    var y = s.cy != null ? s.cy : (s.v || 0) + (Math.abs(s.rx || 0) === 90 ? s.r : s.h / 2);
    var o = mk(s, 'cyl', [p[0], y, p[1]], rot(F.a, s), [s.r * 2, s.h, s.r * 2]);
    if (o.border == null) o.border = 0.3;
    return this.add(o);
  };
  // anything placed straight in room coordinates
  Room.prototype.at = function (s) {
    return this.add(mk(s, s.geo || 'box', s.p.slice(), rot(0, s), s.size.slice()));
  };
  Room.prototype.thing = function (id, label, fn, opt) {
    opt = opt || {};
    var t = { id: id, label: label || id, objs: [], decoy: !!opt.decoy, cls: opt.cls || '' };
    this.things[id] = t;
    this.thingList.push(t);
    var prev = this.cur;
    this.cur = t;
    fn.call(this);
    this.cur = prev;
    var c = [0, 0, 0];
    t.objs.forEach(function (o) { c[0] += o.pos[0]; c[1] += o.pos[1]; c[2] += o.pos[2]; });
    var n = Math.max(1, t.objs.length);
    t.c = [c[0] / n, c[1] / n, c[2] / n];
    return t;
  };
  Room.prototype.light = function (l) { this.lights.push(l); return l; };
  // a soft glow that always faces you (lamps, LEDs, screens)
  Room.prototype.glow = function (p, size, c, i, kind) {
    var g = this.T('glow', function () { return PT.glow(128); });
    var prev = this.cur;
    this.cur = null;
    var o = this.add({ geo: 'card', pos: p, s: [size, size, 1], color: c, map: g, mapAlpha: true, bill: true, blend: 'add', border: 0, hatch: 0, unlit: true, kind: kind || 'always', base: i == null ? 1 : i });
    this.cur = prev;
    return o;
  };
  // light falling on the floor or a counter
  Room.prototype.pool = function (x, y, z, w, d, c, i, kind) {
    var prev = this.cur;
    this.cur = null;
    var o = this.add({ geo: 'card', pos: [x, y + 0.3, z], R: M.rotX(-90 * DEG), s: [w, d, 1], color: c, shape: 1, soft: 1, blend: 'add', border: 0, hatch: 0, unlit: true, kind: kind || 'work', base: i == null ? 1 : i });
    this.cur = prev;
    return o;
  };
  // a soft contact shadow under furniture
  Room.prototype.shadow = function (x, z, w, d, a, y) {
    var prev = this.cur;
    this.cur = null;
    var o = this.add({ geo: 'card', pos: [x, (y || 0) + 0.2, z], R: M.rotX(-90 * DEG), s: [w, d, 1], color: INK, shape: 1, soft: 0.9, blend: 'alpha', alpha: a == null ? 0.45 : a, border: 0, hatch: 0, unlit: true, shade: true });
    this.cur = prev;
    return o;
  };
  // shadow for a box against a wall
  Room.prototype.shadowFor = function (s, a) {
    var F = this.frame(s.wall), p = F.at(s.u, (s.o || 0) + s.d / 2);
    var along = F.a === 0 || F.a === 180;
    return this.shadow(p[0], p[1], (along ? s.w : s.d) * 1.25 + 14, (along ? s.d : s.w) * 1.25 + 14, a, s.v);
  };

  /* The shell: walls, floor and ceiling, cut into tiles (they come apart at the end). */
  function shell(B, R) {
    var hw = R.w / 2, hd = R.d / 2;
    ['n', 'e', 's', 'w'].forEach(function (wl) {
      var W = wl === 'n' || wl === 's' ? R.w : R.d;
      var spec = (R.walls && R.walls[wl]) || R.wall;
      var F = B.frame(wl);
      var cols = Math.ceil(W / 95), rows = Math.ceil(R.h / 95);
      var tex = spec.tex ? B.T('wall-' + (spec.key || 'a'), spec.tex, true) : null;
      var per = spec.per || 60;
      for (var i = 0; i < cols; i++)
        for (var j = 0; j < rows; j++) {
          var u0 = -W / 2 + (i * W) / cols, u1 = -W / 2 + ((i + 1) * W) / cols;
          var v0 = (j * R.h) / rows, v1 = ((j + 1) * R.h) / rows;
          var p = F.at((u0 + u1) / 2, 0);
          var o = B.add({ geo: 'card', pos: [p[0], (v0 + v1) / 2, p[1]], R: M.rotY(F.a * DEG), s: [u1 - u0 + 0.4, v1 - v0 + 0.4, 1], color: spec.c, border: 0, shell: wl });
          if (tex) {
            o.map = tex;
            o.rep = [(u1 - u0) / per, (v1 - v0) / per];
            o.off = [(u0 + W / 2) / per, v0 / per];
          }
          if (spec.dado) {
            // a darker band along the bottom of the wall
            o.wall = true;
          }
        }
      if (spec.skirt) {
        var sp = F.at(0, 0.9);
        B.add({ geo: 'box', pos: [sp[0], 6, sp[1]], R: M.rotY(F.a * DEG), s: [W - 1, 12, 1.8], color: spec.skirt, border: 0.25, shell: wl });
      }
      if (spec.band) {
        var bp = F.at(0, 0.7);
        B.add({ geo: 'card', pos: [bp[0], spec.band.v + spec.band.h / 2, bp[1]], R: M.rotY(F.a * DEG), s: [W - 1, spec.band.h, 1], color: spec.band.c, border: 0.2, decal: 1, shell: wl });
      }
    });
    var ftex = R.floor.tex ? B.T('floor', R.floor.tex, true) : null;
    var ctex = R.ceil.tex ? B.T('ceil', R.ceil.tex, true) : null;
    var nx = Math.ceil(R.w / 100), nz = Math.ceil(R.d / 100);
    var fp = R.floor.per || 100, cp = R.ceil.per || 120;
    for (var i = 0; i < nx; i++)
      for (var j = 0; j < nz; j++) {
        var x0 = -hw + (i * R.w) / nx, x1 = -hw + ((i + 1) * R.w) / nx;
        var z0 = -hd + (j * R.d) / nz, z1 = -hd + ((j + 1) * R.d) / nz;
        var cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0 + 0.4, d = z1 - z0 + 0.4;
        var fl = B.add({ geo: 'card', pos: [cx, 0, cz], R: M.rotX(-90 * DEG), s: [w, d, 1], color: R.floor.c, border: 0, floor: true, pick: true, shell: 'floor' });
        if (ftex) { fl.map = ftex; fl.rep = [w / fp, d / fp]; fl.off = [(x0 + hw) / fp, (hd - z1) / fp]; }
        var ce = B.add({ geo: 'card', pos: [cx, R.h, cz], R: M.rotX(90 * DEG), s: [w, d, 1], color: R.ceil.c, border: 0, shell: 'ceil' });
        if (ctex) { ce.map = ctex; ce.rep = [w / cp, d / cp]; ce.off = [(x0 + hw) / cp, (z0 + hd) / cp]; }
      }
  }

  // a fluorescent tube in the ceiling, its light, and the pool it throws
  function tube(B, R, x, z, w, d, opt) {
    opt = opt || {};
    B.add({ geo: 'box', pos: [x, R.h - 3, z], s: [w + 6, 5, d + 6], color: '#c9ced1', border: 0.3, shell: 'ceil' });
    B.add({ geo: 'box', pos: [x, R.h - 6, z], s: [w, 2, d], color: opt.c || '#f4fbff', emit: 1, emitDark: 0.97, border: 0.25, hatch: 0, shell: 'ceil' });
    B.glow([x, R.h - 10, z], Math.max(w, d) * 1.1, opt.glow || '#cfe6ff', 0.35, 'work');
    B.pool(x, 0, z, w * 2.6 + 140, d * 2.6 + 140, opt.pool || '#cfe6ff', 0.07, 'work');
    return B.light({ p: [x, R.h - 25, z], c: opt.c || '#eef6ff', i: opt.i || 0.9, r: opt.r || 520, k: 'work' });
  }

  /* The switch: the same wall rocker as everywhere on the site */
  function makeSwitch(B, S, api) {
    var str = (api.strings && api.strings.shift) || {};
    var plate = B.T('switch-plate', function () { return PT.switchPlate(180, 280, str.markOn, str.markOff); });
    var F = B.frame(S.wall);
    var parts = {};
    B.thing('switch', api.hud.switchLabel, function () {
      parts.plate = B.box({ wall: S.wall, u: S.u, v: S.v - 7, o: 0, w: 9, h: 14, d: 1.1, c: '#e9e6de', map: plate, mapFace: 4, border: 0.22, pickPad: 3 });
      parts.rocker = B.box({ wall: S.wall, u: S.u, v: S.v - 3.8, o: 1.1, w: 4.6, h: 7.6, d: 1.2, c: '#f3f1ea', border: 0.18, rx: -12 });
      parts.led = B.card({ wall: S.wall, u: S.u, v: S.v + 1.6, o: 2.45, w: 2.2, h: 0.8, c: '#f2a84b', emit: 1, emitDark: 0, border: 0.1, hatch: 0, rx: -12, decal: 2 });
    });
    var p = F.at(S.u, 3);
    parts.glow = B.glow([p[0], S.v + 1, p[1]], 18, '#f2a84b', 0.0, 'always');
    var ar = B.T('arrow', function () { return PT.arrow(128, 160); });
    var pa = F.at(S.u, 6);
    parts.arrow = B.add({ geo: 'card', pos: [pa[0], S.v + 22, pa[1]], s: [9, 11.25, 1], color: '#ffffff', map: ar, mapAlpha: true, bill: true, blend: 'alpha', border: 0, hatch: 0, unlit: true, alpha: 0 });
    parts.thing = B.things['switch'];
    parts.pos = (function () { var q = F.at(S.u, 0); return [q[0], S.v, q[1]]; })();
    parts.stand = (function () { var q = F.at(S.u, 75); return { x: q[0], z: q[1] }; })();
    parts.F = F;
    return parts;
  }

  /* ------------------------------------------------------------------ scenes */
  var SCENES = {};
  ES.roomScenes = SCENES;

  function prop(api, key, fallback) {
    var p = api.data.props || {};
    return p[key] != null ? p[key] : fallback;
  }

  /* In bed, still on the phone ---------------------------------------------------------- */
  SCENES.bed = {
    room: {
      w: 360, d: 380, h: 250,
      wall: { c: '#6a7590', skirt: '#2f3542' },
      walls: { s: { c: '#5f6a86', skirt: '#2f3542' } },
      floor: { c: '#7a5638', tex: function () { return PT.planks({ base: '#7a5638' }); }, per: 110 },
      ceil: { c: '#5a6278' },
    },
    look: { amb: '#4f5874', bg: '#10131b', ink: '#0b0d14' },
    cam: { x: 10, z: 148, eye: 92, yaw: 62, pitch: 6 },
    stand: { x: 122, z: 110 },
    walk: [[-165, -175, 165, -30], [100, -175, 165, 170]],
    assistAt: [4000, 9000, 17000, 27000],
    sw: { wall: 'n', u: -22, v: 108 },
    phone: true,
    build: function (B, R, api) {
      var o = api.objects;
      // the big light: a bright disc in the middle of the ceiling
      B.thing('ceiling', o.ceiling && o.ceiling.label, function () {
        B.at({ geo: 'cyl', p: [0, R.h - 4, -20], size: [52, 6, 52], c: '#fbfdff', emit: 1, emitDark: 0.97, border: 0.35, hatch: 0 });
      });
      B.glow([0, R.h - 14, -20], 120, '#dfe9ff', 0.4, 'work');
      B.pool(0, 0, -20, 380, 400, '#dfe9ff', 0.06, 'work');
      B.light({ p: [0, R.h - 30, -20], c: '#eef2ff', i: 1.55, r: 620, k: 'work' });

      // bed against the south wall
      var bed = { wall: 's', u: -10, v: 0, o: 7, w: 150, h: 42, d: 200 };
      B.shadowFor(bed, 0.5);
      B.thing('bed', o.bed && o.bed.label, function () {
        B.box({ wall: 's', u: -10, v: 0, o: 0, w: 162, h: 110, d: 7, c: '#2f2a2a' });
        B.box({ wall: 's', u: -10, v: 0, o: 7, w: 150, h: 40, d: 200, c: '#3a3133' });
        B.box({ wall: 's', u: -10, v: 40, o: 9, w: 146, h: 12, d: 196, c: '#e7e2d6', border: 0.25 });
        B.box({ wall: 's', u: -42, v: 52, o: 12, w: 64, h: 14, d: 36, c: '#e9e4da', border: 0.3 });
        B.box({ wall: 's', u: 24, v: 52, o: 12, w: 64, h: 14, d: 36, c: '#d8d2c6', border: 0.3, ry: 4 });
        var duv = B.T('duvet', function () { return PT.stripes({ base: '#46557a', a: '#3c4a6c', n: 8, shade: true }); }, true);
        B.box({ wall: 's', u: -10, v: 52, o: 50, w: 152, h: 10, d: 158, c: '#46557a', map: duv, mapFace: 2, rep: [3, 3] });
        B.box({ wall: 's', u: 6, v: 62, o: 112, w: 66, h: 12, d: 70, c: '#4e5f86', map: duv, mapFace: 2, rep: [1.5, 1.5], ry: -6 });
        // a hoodie thrown on the end of the bed
        B.box({ wall: 's', u: -55, v: 62, o: 160, w: 40, h: 6, d: 30, c: '#8a3b34', ry: 18 });
      });
      // bedside table: lamp (off for now), alarm clock, mug, phone charger
      var bt = { wall: 's', u: 112, v: 0, o: 2, w: 46, h: 52, d: 40 };
      B.shadowFor(bt, 0.5);
      var drw = B.T('drawers-bt', function () { return PT.drawers(256, 290, 2, '#4a3b31'); });
      B.box({ wall: 's', u: 112, v: 0, o: 2, w: 46, h: 52, d: 40, c: '#4a3b31', map: drw, mapFace: 4 });
      B.thing('lamp', o.lamp && o.lamp.label, function () {
        B.cyl({ wall: 's', u: 120, v: 52, o: 14, r: 6, h: 3, c: '#24262a' });
        B.cyl({ wall: 's', u: 120, v: 55, o: 19, r: 1.2, h: 22, c: '#24262a' });
        var shade = B.cyl({ wall: 's', u: 120, v: 74, o: 9, r: 11, h: 18, c: '#e3cfa6', taper: 0.62, emit: 0, emitDark: 0, name: 'shade' });
        shade.warmEmit = 0.85;
      });
      var lp = B.frame('s').at(120, 20);
      B.light({ p: [lp[0], 86, lp[1]], c: '#ffb46a', i: 1.5, r: 340, k: 'warm' });
      B.glow([lp[0], 83, lp[1]], 70, '#ffb46a', 0.7, 'warm');
      B.pool(lp[0], 52.2, lp[1], 70, 70, '#ffb46a', 0.25, 'warm');
      B.thing('clock', o.clock && o.clock.label, function () {
        var dg = B.T('digits', function () { return PT.digits(160, 64, api.clock()); });
        B.box({ wall: 's', u: 99, v: 52, o: 20, w: 16, h: 8, d: 7, c: '#141517', map: dg, mapFace: 4, emit: 0.9, emitDark: 0, ry: 8 });
        var shown = '';
        B.anims.push({ every: 1000, run: function () { var t = api.clock(); if (t !== shown) { shown = t; dg.update(PT.digits(160, 64, t)); } } });
      });
      B.cyl({ wall: 's', u: 128, v: 52, o: 4, r: 4, h: 9, c: '#d9583a' });
      B.box({ wall: 's', u: 104, v: 52.2, o: 4, w: 8, h: 1, d: 14, c: '#1b1d22', ry: -10 });
      // slippers
      // (apart, and clear of the bed)
      B.box({ wall: 's', u: 88, v: 0, o: 64, w: 10, h: 4, d: 26, c: '#6b7a8f', ry: 12 });
      B.box({ wall: 's', u: 73, v: 0, o: 66, w: 10, h: 4, d: 26, c: '#6b7a8f', ry: -6 });
      // fairy lights over the bed: they come on with the evening
      for (var i = 0; i < 9; i++) {
        var fu = -80 + i * 18, fv = 168 - Math.sin((i / 8) * Math.PI) * 14;
        var fp = B.frame('s').at(fu, 2);
        B.card({ wall: 's', u: fu, v: fv, o: 1.2, w: 2.4, h: 2.4, c: '#ffd08a', shape: 1, emit: 0.2, emitDark: 0, border: 0.15, hatch: 0, warmEmit: 1 });
        B.glow([fp[0], fv + 1.2, fp[1]], 16, '#ffbe6e', 0.8, 'warm');
      }
      B.light({ p: [0, 175, 178], c: '#ffc27a', i: 0.55, r: 260, k: 'warm' });
      // the evening fills the room a little once the big light is off
      B.light({ p: [0, 150, 40], c: '#ff9a52', i: 0.42, r: 620, k: 'warm' });

      // door, the switch next to it, a work lanyard on the handle
      var dtex = B.T('door', function () { return PT.door(200, 420, { base: '#d9d3c6' }); });
      B.thing('door', o.door && o.door.label, function () {
        B.box({ wall: 'n', u: -98, v: 0, o: 0, w: 100, h: 214, d: 3, c: '#bdb6a8' });
        B.box({ wall: 'n', u: -98, v: 0, o: 3, w: 88, h: 208, d: 2, c: '#d9d3c6', map: dtex, mapFace: 4 });
        var badge = B.T('badge', function () { return PT.badge(120, 170, prop(api, 'staff', 'STAFF')); });
        B.card({ wall: 'n', u: -66, v: 82, o: 5.4, w: 7, h: 10, c: '#f6f3ea', map: badge, rz: 6 });
        B.card({ wall: 'n', u: -64.5, v: 92, o: 5.3, w: 1.2, h: 14, c: '#2f5ba8', rz: 20 });
      });
      // light from the hallway under the door
      B.card({ wall: 'n', u: -98, v: 0.2, o: 5.2, w: 86, h: 1.2, c: '#ffd9a0', emit: 1, emitDark: 0, border: 0, hatch: 0 });
      B.pool(-98, 0, -182, 90, 26, '#ffd9a0', 0.25, 'always');
      // work bag by the door, a jacket on a hook
      var bag = { wall: 'n', u: 30, v: 0, o: 6, w: 40, h: 36, d: 22 };
      B.shadowFor(bag, 0.45);
      B.thing('bag', o.bag && o.bag.label, function () {
        B.box({ wall: 'n', u: 30, v: 0, o: 6, w: 40, h: 36, d: 22, c: '#34463a' });
        B.box({ wall: 'n', u: 30, v: 36, o: 12, w: 30, h: 6, d: 10, c: '#2a382f' });
        B.box({ wall: 'n', u: 30, v: 6, o: 28, w: 26, h: 16, d: 1.5, c: '#2a382f' });
      });
      B.box({ wall: 'n', u: 64, v: 158, o: 0, w: 4, h: 3, d: 8, c: '#8f9396' });
      B.box({ wall: 'n', u: 64, v: 92, o: 2, w: 42, h: 66, d: 9, c: '#2b3340', rz: 3 });
      // laundry basket
      B.shadow(118, -168, 56, 46, 0.45);
      B.cyl({ wall: 'n', u: 118, v: 0, o: 2, r: 20, h: 42, c: '#c9b48a', taper: 1.12 });
      B.box({ wall: 'n', u: 112, v: 40, o: 10, w: 26, h: 8, d: 18, c: '#7d8fb0', rz: 14 });

      // window, east wall: the street, still lit
      var city = B.T('city', function () { return PT.city(480, 470); });
      B.thing('window', o.window && o.window.label, function () {
        B.box({ wall: 'e', u: 78, v: 90, o: 0, w: 132, h: 128, d: 4, c: '#ddd8cc' });
        B.card({ wall: 'e', u: 78, v: 96, o: 4.3, w: 118, h: 116, c: '#1d2b52', map: city, emit: 0.92, emitDark: 0, border: 0.5, hatch: 0 });
        B.box({ wall: 'e', u: 78, v: 96, o: 4.2, w: 3, h: 116, d: 1.6, c: '#ddd8cc' });
        B.box({ wall: 'e', u: 78, v: 158, o: 4.2, w: 118, h: 3, d: 1.6, c: '#ddd8cc' });
        B.box({ wall: 'e', u: 78, v: 86, o: 0, w: 140, h: 4, d: 14, c: '#e7e2d6' });
      });
      var ctex = B.T('curtain', function () { return PT.stripes({ base: '#7a5a72', a: '#6a4c63', n: 8, shade: true }); }, true);
      [[16, -6], [140, 6]].forEach(function (cu) {
        B.box({ wall: 'e', u: cu[0], v: 66, o: 9, w: 36, h: 166, d: 3, c: '#7a5a72', map: ctex, mapFace: 4, rep: [2, 1], ry: cu[1] });
      });
      B.cyl({ wall: 'e', u: 78, cy: 234, o: 8, r: 1.4, h: 160, c: '#2a2c30', rz: 90 });
      B.light({ p: [160, 150, 78], c: '#7088cc', i: 0.4, r: 280, k: 'always' });
      // radiator under the window
      var rad = B.T('radiator', function () { return PT.stripes({ base: '#e4e1d8', a: '#bfbcb2', n: 16 }); }, true);
      B.box({ wall: 'e', u: 78, v: 14, o: 2, w: 100, h: 54, d: 8, c: '#e4e1d8', map: rad, mapFace: 4, rep: [1, 1] });

      // desk with the open laptop
      var desk = { wall: 'e', u: -78, v: 0, o: 0, w: 124, h: 74, d: 58 };
      B.shadowFor(desk, 0.4);
      B.box({ wall: 'e', u: -78, v: 70, o: 0, w: 124, h: 4, d: 58, c: '#9a7652' });
      B.box({ wall: 'e', u: -136, v: 0, o: 2, w: 4, h: 70, d: 54, c: '#7c5e41' });
      B.box({ wall: 'e', u: -20, v: 0, o: 2, w: 4, h: 70, d: 54, c: '#7c5e41' });
      B.thing('laptop', o.laptop && o.laptop.label, function () {
        var inbox = B.T('inbox', function () { return PT.inbox(340, 230, 12); });
        B.box({ wall: 'e', u: -84, v: 74, o: 18, w: 34, h: 1.6, d: 24, c: '#a6adb4' });
        B.box({ wall: 'e', u: -84, v: 75.4, o: 16, w: 34, h: 23, d: 1, c: '#a6adb4', map: inbox, mapFace: 4, rx: -14, emit: 0.95, emitDark: 0.1, name: 'lid' });
      });
      var lt = B.frame('e').at(-84, 30);
      B.light({ p: [lt[0], 96, lt[1]], c: '#9cc0ff', i: 0.4, r: 150, k: 'always', name: 'laptop' });
      B.glow([lt[0] + 2, 88, lt[1]], 46, '#9cc0ff', 0.22, 'always').name = 'laptopGlow';
      B.cyl({ wall: 'e', u: -120, v: 74, o: 12, r: 4, h: 10, c: '#efebe2' });
      B.box({ wall: 'e', u: -50, v: 74, o: 10, w: 20, h: 3, d: 28, c: '#2f5ba8', ry: 8 });
      B.box({ wall: 'e', u: -50, v: 77, o: 12, w: 18, h: 2.4, d: 25, c: '#d9583a', ry: -4 });
      B.thing('chair', o.chair && o.chair.label, function () {
        B.box({ wall: 'e', u: -60, v: 42, o: 64, w: 44, h: 6, d: 42, c: '#2d2f33' });
        B.box({ wall: 'e', u: -60, v: 48, o: 104, w: 44, h: 46, d: 5, c: '#2d2f33' });
        B.box({ wall: 'e', u: -60, v: 48, o: 70, w: 40, h: 10, d: 30, c: '#6b4f6a' });
        B.box({ wall: 'e', u: -54, v: 58, o: 74, w: 30, h: 7, d: 24, c: '#3e5b7a', ry: 14 });
        // a cardigan over the back of the chair: over the top, hanging down behind
        B.box({ wall: 'e', u: -60, v: 94, o: 103.6, w: 46, h: 2.4, d: 8.6, c: '#6b4f6a' });
        B.box({ wall: 'e', u: -60, v: 66, o: 109.4, w: 46, h: 28, d: 2.6, c: '#6b4f6a' });
        B.cyl({ wall: 'e', u: -60, v: 0, o: 81, r: 2, h: 42, c: '#1b1c1f' });
        B.cyl({ wall: 'e', u: -60, v: 0, o: 70, r: 22, h: 2, c: '#1b1c1f' });
      });
      B.shadow(B.frame('e').at(-60, 85)[0], -60, 60, 60, 0.4);
      // a print above the desk, a shelf of books
      B.thing('print', o.print && o.print.label, function () {
        var pr = B.T('print', function () { return PT.print(220, 280, prop(api, 'print', ['WORK HARD', 'REST', 'HARDER'])); });
        B.box({ wall: 'e', u: -112, v: 116, o: 0, w: 46, h: 58, d: 2, c: '#f2ead6', map: pr, mapFace: 4 });
      });
      B.box({ wall: 'e', u: -50, v: 150, o: 0, w: 76, h: 3, d: 22, c: '#8a6a4a' });
      // (the last one leans on its neighbour, its corner on the shelf)
      ['#b0473a', '#2f5d7c', '#d8c79a', '#3e6b4f', '#8a6aa0', '#c98a3a', '#e4dfd2'].forEach(function (c, i) {
        B.box({ wall: 'e', u: -82 + i * 7.6 + (i > 4 ? 6 : 0) + (i === 6 ? 1 : 0), v: i === 6 ? 153.55 : 153, o: 3, w: 6.4, h: 18 + (i % 3) * 3, d: 15, c: c, rz: i === 6 ? 14 : 0, border: 0.2 });
      });
      // plant in the corner
      B.shadow(161, 160, 40, 40, 0.5);
      B.cyl({ wall: 'e', u: 160, v: 0, o: 8, r: 12, h: 26, c: '#b8664a', taper: 1.2 });
      var leaf = B.T('leaf', function () { return PT.leaf(96, 160, '#3f7a4c'); });
      var leaf2 = B.T('leaf2', function () { return PT.leaf(96, 160, '#4f8f5a'); });
      var lc = B.frame('e').at(160, 20);
      // the same plant every time, its leaves kept inside the room (a leaf that would reach a wall
      // stands up straighter until it doesn't)
      var seed = 11, srnd = function (a, b) { seed = (seed * 16807) % 2147483647; return a + (seed / 2147483647) * (b - a); };
      for (var k = 0; k < 9; k++) {
        var a = k * 40 + srnd(-8, 8), tilt = srnd(18, 42), up = 34 + srnd(-4, 10), Rl, lp0;
        for (;;) {
          Rl = M.mul3(M.rotY(a * DEG), M.rotX(-tilt * DEG));
          lp0 = [lc[0] + Math.sin(a * DEG) * 9, 26 + up * 0.55, lc[1] + Math.cos(a * DEG) * 9];
          var ax = M.apply3(Rl, [9, 0, 0]), ay = M.apply3(Rl, [0, up / 2, 0]), inside = true;
          [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (q) {
            var x = lp0[0] + q[0] * ax[0] + q[1] * ay[0], z = lp0[2] + q[0] * ax[2] + q[1] * ay[2];
            if (Math.abs(x) > R.w / 2 - 1.5 || Math.abs(z) > R.d / 2 - 1.5) inside = false;
          });
          if (inside || tilt < 4) break;
          tilt -= 3;
        }
        B.add({ geo: 'card', pos: lp0, R: Rl, s: [18, up, 1], color: '#ffffff', map: k % 2 ? leaf : leaf2, mapAlpha: true, blend: 'alpha', border: 0, hatch: 0.6 });
      }

      // wardrobe and a holiday photo, west wall
      var wd = { wall: 'w', u: 30, v: 0, o: 0, w: 112, h: 204, d: 58 };
      B.shadowFor(wd, 0.4);
      B.thing('wardrobe', o.wardrobe && o.wardrobe.label, function () {
        var wt = B.T('wardrobe', function () { return PT.wardrobe(300, 540); });
        B.box({ wall: 'w', u: 30, v: 0, o: 0, w: 112, h: 204, d: 58, c: '#6a5c50', map: wt, mapFace: 4 });
        B.box({ wall: 'w', u: 18, v: 204, o: 10, w: 44, h: 22, d: 34, c: '#a0835f' });
      });
      B.thing('poster', o.poster && o.poster.label, function () {
        var ph = B.T('photo', function () { return PT.photo(260, 200); });
        B.box({ wall: 'w', u: -112, v: 128, o: 0, w: 58, h: 44, d: 2.4, c: '#ece6d8', map: ph, mapFace: 4 });
      });
      // rug
      var rug = B.T('rug', function () { return PT.rug(340, 240); });
      B.flat({ wall: 'n', u: -10, v: 0, o: 54, w: 170, d: 118, c: '#7b4a43', map: rug, border: 0.3, lift: 0.3 });
    },
  };

  /* Restaurant kitchen ---------------------------------------------------------------- */
  SCENES.kitchen = {
    room: {
      w: 440, d: 390, h: 280,
      wall: { c: '#d8dedd', tex: function () { return PT.tiles({ n: 4, base: '#e3e8e6', grout: 'rgba(60,72,74,.5)', shine: true }); }, per: 60, key: 'tiles', skirt: '#7a3a2e' },
      floor: { c: '#8a3d2c', tex: function () { return PT.tiles({ n: 2, base: '#8a3d2c', grout: 'rgba(30,10,6,.6)', gw: 3, jitter: 0.12, seed: 4 }); }, per: 60 },
      ceil: { c: '#a8b0b2', tex: function () { return PT.tiles({ n: 2, base: '#b4bbbd', grout: 'rgba(60,66,70,.5)', jitter: 0.02 }); }, per: 120 },
    },
    look: { amb: '#4a5054', bg: '#121618', ink: '#0d0f12' },
    cam: { x: 0, z: 74, eye: 165, yaw: 0, pitch: -9 },
    walk: [[-160, -110, 160, 140]],
    sw: { wall: 'n', u: 45, v: 139, hidden: 'tickets' },
    build: function (B, R, api) {
      var o = api.objects;
      tube(B, R, -110, -40, 22, 150);
      tube(B, R, 110, -40, 22, 150);
      tube(B, R, 0, 110, 150, 22);

      // the pass: steel counter, and the opening onto the dark restaurant
      var steel = B.T('steel', function () { return PT.stripes({ base: '#aab3b8', a: '#9ea7ac', n: 32 }); }, true);
      var pass = { wall: 'n', u: 0, v: 0, o: 0, w: 330, h: 92, d: 74 };
      B.shadowFor(pass, 0.5);
      B.box({ wall: 'n', u: 0, v: 0, o: 0, w: 330, h: 88, d: 74, c: '#9ea7ac', map: steel, mapFace: 4, rep: [4, 1] });
      B.box({ wall: 'n', u: 0, v: 88, o: 0, w: 334, h: 4, d: 76, c: '#c7ced1' });
      var hatch = B.T('hatch', function () { return PT.hatch(420, 230); });
      B.card({ wall: 'n', u: -95, v: 158, o: 0.6, w: 120, h: 66, c: '#2a1c10', map: hatch, emit: 0.85, emitDark: 0, border: 0.9 });
      B.light({ p: [-95, 190, -150], c: '#ffb070', i: 0.55, r: 320, k: 'always' });
      B.light({ p: [-40, 200, -120], c: '#ffb46a', i: 1.0, r: 460, k: 'warm' });
      // heat lamps over the pass
      B.thing('lamps', o.lamps && o.lamps.label, function () {
        B.box({ wall: 'n', u: 0, v: 205, o: 22, w: 286, h: 8, d: 36, c: '#3a3f43' });
        [-95, 0, 95].forEach(function (u) {
          B.box({ wall: 'n', u: u, v: 196, o: 28, w: 50, h: 9, d: 26, c: '#2d3134' });
          B.box({ wall: 'n', u: u, v: 195.2, o: 31, w: 42, h: 1, d: 20, c: '#ffb25e', emit: 1, emitDark: 0.95, hatch: 0 });
        });
      });
      [-95, 0, 95].forEach(function (u) {
        var hp = B.frame('n').at(u, 41);
        B.glow([hp[0], 190, hp[1]], 60, '#ff9a4a', 0.5, 'work');
        B.pool(hp[0], 92, hp[1], 96, 56, '#ff9a4a', 0.3, 'work');
      });
      B.light({ p: [0, 186, -150], c: '#ff9a50', i: 0.7, r: 190, k: 'work' });
      // plates waiting on the pass, the bell
      [[100, 34], [-30, 40], [60, 46]].forEach(function (pl, i) {
        B.cyl({ wall: 'n', u: pl[0], v: 92, o: pl[1], r: 13, h: 1.6, c: '#f6f4ee', border: 0.25 });
        B.cyl({ wall: 'n', u: pl[0] + 2, v: 93.6, o: pl[1] + 6, r: 6, h: 3, c: ['#c8763a', '#7a9a3a', '#d9b04a'][i] });
      });
      B.cyl({ wall: 'n', u: 150, v: 92, o: 50, r: 4.5, h: 5, c: '#c9a24a', taper: 0.4 });
      // ticket printer
      B.thing('printer', o.printer && o.printer.label, function () {
        B.box({ wall: 'n', u: -140, v: 92, o: 16, w: 26, h: 18, d: 28, c: '#26292c' });
        B.card({ wall: 'n', u: -140, v: 108, o: 34, w: 8, h: 20, c: '#f6f2e6', rx: -24, border: 0.2 });
      });
      // the rail full of tickets, and the switch behind them
      B.box({ wall: 'n', u: 40, v: 152, o: 0.5, w: 224, h: 3, d: 4, c: '#b8c0c4' });
      var T = prop(api, 'tickets', [['T9', '2× RISOTTO'], ['T4', 'STEAK MR'], ['T12', '3× SOUP'], ['T7', 'NO ONION!!'], ['T2', 'BURGER + FRIES'], ['T9', 'DESSERT'], ['T11', 'REFIRE'], ['T6', '4× PASTA'], ['T3', 'ALLERGY'], ['T8', 'MAINS AWAY'], ['T5', '2× SALAD'], ['T1', 'KIDS MENU']]);
      var US = [-62, -45, -28, -11, 6, 23, 39, 51, 66, 83, 100, 117];
      B.thing('tickets', o.tickets && o.tickets.label, function () {
        T.forEach(function (t, i) {
          var tx = B.T('ticket' + i, function () { return PT.ticket(140, 230, t[0], t[1], i + 3); });
          B.card({ wall: 'n', u: US[i], v: 127 + (i % 3) * 1.2, o: 4.6 + (i % 2) * 0.8, w: 14, h: 23, c: '#f6f2e6', map: tx, border: 0.18, rz: ((i * 37) % 9) - 4, decal: 0 });
        });
      });
      // clock
      B.thing('clock', o.clock && o.clock.label, function () {
        var hm = String(api.data.time || '23:10').split(':');
        var ck = B.T('clock', function () { return PT.clock(200, 200, +hm[0], +hm[1]); });
        B.cyl({ wall: 'n', u: -174, v: 205, o: 0, r: 17, h: 3, rx: 90, c: '#f4f1e8', map: ck, mapFace: 7 }); // (clear of the hatch)
      });
      // stove, hood (and the wrong switch), knives, extinguisher: east wall
      var stv = B.T('stove', function () { return PT.stove(380, 180); });
      var st = { wall: 'e', u: -22, v: 0, o: 0, w: 190, h: 90, d: 82 }; // (its end clear of the pass)
      B.shadowFor(st, 0.5);
      B.thing('stove', o.stove && o.stove.label, function () {
        B.box({ wall: 'e', u: -22, v: 0, o: 0, w: 190, h: 90, d: 82, c: '#5a6066', map: stv, mapFace: 4 });
        B.box({ wall: 'e', u: -22, v: 90, o: 0, w: 190, h: 2, d: 82, c: '#2a2d30' });
        [[-72, 22], [-22, 48], [28, 22], [28, 56]].forEach(function (b) {
          B.cyl({ wall: 'e', u: b[0], v: 92, o: b[1], r: 13, h: 1.2, c: '#3a3d40' });
        });
        B.cyl({ wall: 'e', u: -72, v: 93, o: 10, r: 16, h: 22, c: '#aab2b6' });
        B.cyl({ wall: 'e', u: -72, v: 115, o: 10, r: 16.5, h: 2, c: '#7d858a' });
        B.cyl({ wall: 'e', u: 28, v: 93, o: 8, r: 15, h: 7, c: '#2a2d30' });
        B.box({ wall: 'e', u: 28, v: 96, o: 38, w: 3, h: 3, d: 26, c: '#2a2d30' });
      });
      B.box({ wall: 'e', u: -28, v: 186, o: 0, w: 212, h: 50, d: 96, c: '#a7b0b4', map: steel, mapFace: 4, rep: [3, 1] }); // (clear of the heat lamps' bar)
      B.thing('hood', o.hood && o.hood.label, function () {
        B.box({ wall: 'e', u: 40, v: 196, o: 96, w: 9, h: 13, d: 1.4, c: '#26292c' });
        B.box({ wall: 'e', u: 40, v: 199, o: 97.4, w: 4, h: 6, d: 1, c: '#d9443a' });
      }, { decoy: true });
      B.thing('knives', o.knives && o.knives.label, function () {
        B.box({ wall: 'e', u: 116, v: 150, o: 0.4, w: 66, h: 5, d: 2, c: '#2a2d30' });
        [96, 106, 116, 126, 136].forEach(function (u, i) {
          B.box({ wall: 'e', u: u - 16, v: 122 + (i % 2) * 4, o: 2.4, w: 3.4, h: 22 - (i % 3) * 3, d: 0.6, c: '#c8cfd3', border: 0.12 });
          B.box({ wall: 'e', u: u - 16, v: 144 + (i % 2) * 4 - (i % 3) * 3, o: 2.2, w: 3, h: 11, d: 1.4, c: '#2a2d30', border: 0.12 });
        });
      });
      B.cyl({ wall: 'e', u: 168, v: 20, o: 2, r: 7, h: 46, c: '#c0392b' });
      B.box({ wall: 'e', u: 168, v: 66, o: 4, w: 6, h: 6, d: 6, c: '#26292c' });
      // walk-in, dish station, mop, aprons: south wall
      var wi = B.T('walkin', function () { return PT.sign(300, 70, [prop(api, 'walkin', 'WALK-IN · 3°C')], '#2f5ba8', '#fff'); });
      B.thing('fridge', o.fridge && o.fridge.label, function () {
        B.box({ wall: 's', u: -120, v: 0, o: 0, w: 108, h: 216, d: 8, c: '#b7c0c4', map: steel, mapFace: 4, rep: [2, 1] });
        B.box({ wall: 's', u: -76, v: 90, o: 8, w: 6, h: 44, d: 6, c: '#7d858a' });
        B.card({ wall: 's', u: -120, v: 176, o: 8.3, w: 54, h: 12.6, c: '#2f5ba8', map: wi, border: 0.25 });
      });
      var sk = { wall: 's', u: 60, v: 0, o: 0, w: 170, h: 90, d: 66 };
      B.shadowFor(sk, 0.45);
      B.thing('sink', o.sink && o.sink.label, function () {
        B.box({ wall: 's', u: 60, v: 0, o: 0, w: 170, h: 88, d: 66, c: '#a7b0b5', map: steel, mapFace: 4, rep: [2, 1] });
        B.box({ wall: 's', u: 60, v: 88, o: 0, w: 172, h: 3, d: 67, c: '#c6cdd0' });
        B.box({ wall: 's', u: 40, v: 84, o: 12, w: 70, h: 7.2, d: 44, c: '#5e676c', border: 0.25 });
        B.cyl({ wall: 's', u: 40, v: 91, o: 2, r: 1.5, h: 34, c: '#c8cfd3' });
        B.box({ wall: 's', u: 90, v: 120, o: 0.5, w: 80, h: 4, d: 26, c: '#8d969b' });
        // plates standing in the rack, each turned the same way (side by side, none through the next)
        [62, 70, 78, 86, 94, 102, 110, 118].forEach(function (u) { B.cyl({ wall: 's', u: u, v: 124, o: 12.8, r: 12, h: 1.4, rx: 90, ry: 60, c: '#f6f4ee', border: 0.2 }); });
      });
      B.thing('mop', o.mop && o.mop.label, function () {
        B.box({ wall: 's', u: 176, v: 0, o: 12, w: 36, h: 30, d: 30, c: '#e1b229' });
        B.box({ wall: 's', u: 176, v: 29, o: 13, w: 32, h: 1.4, d: 26, c: '#5a4a28' });
        B.cyl({ wall: 's', u: 172, v: 30, o: 24, r: 1.3, h: 120, c: '#8c8478', rz: 6 });
      });
      B.shadow(-176, 168, 44, 40, 0.45);
      [-2, 18].forEach(function (u, i) {
        B.box({ wall: 's', u: u, v: 150, o: 0, w: 3, h: 3, d: 6, c: '#8f9396' });
        B.box({ wall: 's', u: u, v: 96, o: i ? 4.2 : 2, w: 30, h: 58, d: 2, c: i ? '#2a2d30' : '#e9e4d8', rz: i ? -3 : 2 }); // (the black one over the white)
      });
      // shelves, the rota, a sign: west wall
      B.thing('shelf', o.shelf && o.shelf.label, function () {
        [36, 82, 128, 174].forEach(function (v) { B.box({ wall: 'w', u: -10, v: v, o: 0, w: 176, h: 3, d: 46, c: '#8f989c' }); });
        [-96, 76].forEach(function (u) { B.box({ wall: 'w', u: u, v: 0, o: 42, w: 3, h: 178, d: 3, c: '#7d868a' }); });
        var lab = prop(api, 'labels', ['RICE', 'FLOUR', 'OIL', 'STOCK', 'SUGAR', 'SALT', 'TINS', 'PASTA']);
        lab.forEach(function (l, i) {
          var col = i % 4, row = Math.floor(i / 4);
          var lt = B.T('label' + i, function () { return PT.label(160, 70, l, '#f4f1e8'); });
          var bc = ['#e8e2d3', '#cfd9dc', '#d9c9a0', '#dfe5e0'][col];
          B.box({ wall: 'w', u: -70 + col * 44, v: 39 + row * 46, o: 6, w: 32, h: 34, d: 30, c: bc });
          B.card({ wall: 'w', u: -70 + col * 44, v: 49 + row * 46, o: 36.3, w: 22, h: 9.6, c: '#f4f1e8', map: lt, border: 0.2 });
        });
        [0, 1, 2].forEach(function (k) { B.cyl({ wall: 'w', u: -70 + k * 18, v: 131, o: 12, r: 7, h: 20, c: ['#c0392b', '#e1b229', '#7a9a3a'][k] }); });
      });
      B.thing('rota', o.rota && o.rota.label, function () {
        var days = prop(api, 'days', ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);
        var you = prop(api, 'you', 'YOU');
        var rt = B.T('rota', function () {
          return PT.sheet(220, 300, { title: prop(api, 'rota', 'ROTA'), lines: days.map(function (d) { return d + '   ' + you; }), mono: true, fs: 0.06, mark: function () { return true; } });
        });
        B.card({ wall: 'w', u: 128, v: 116, o: 0.6, w: 36, h: 50, c: '#f6f3ea', map: rt, border: 0.25, rz: -2 });
      });
      var cl = B.T('clean', function () { return PT.sign(260, 140, prop(api, 'clean', ['CLEAN', 'AS YOU GO']), '#f2c94c', INK, true); });
      B.card({ wall: 'w', u: -142, v: 150, o: 0.6, w: 46, h: 25, c: '#f2c94c', map: cl, border: 0.3 });
      var ex = B.T('exit', function () { return PT.sign(200, 80, [prop(api, 'exit', 'EXIT')], '#1f8a4d', '#ffffff'); });
      B.box({ wall: 's', u: -120, v: 226, o: 0, w: 34, h: 13, d: 5, c: '#1f8a4d', map: ex, mapFace: 4, emit: 0.9, emitDark: 0 });
      var exp = B.frame('s').at(-120, 8);
      B.glow([exp[0], 232, exp[1]], 46, '#3cd27a', 0.25, 'always');
      // drain grate
      B.flat({ wall: 'n', u: 0, v: 0, o: 160, w: 24, d: 24, c: '#3a2a24', map: B.T('grate', function () { return PT.stripes({ base: '#3a2a24', a: '#1a120e', n: 12 }); }, true), rep: [1, 1] });
    },
  };

  /* Night shift on the ward ------------------------------------------------------------- */
  SCENES.ward = {
    room: {
      w: 420, d: 380, h: 270,
      wall: { c: '#9fb8b0', skirt: '#4f625c', band: { v: 88, h: 6, c: '#6f8a82' } },
      walls: { e: { c: '#a9bfb7', skirt: '#4f625c', band: { v: 88, h: 6, c: '#6f8a82' } } },
      floor: { c: '#7f8b8d', tex: function () { return PT.speckle({ base: '#7f8b8d', seam: true }); }, per: 60 },
      ceil: { c: '#cfd3cf', tex: function () { return PT.tiles({ n: 2, base: '#d6dad6', grout: 'rgba(60,66,70,.45)', jitter: 0.03 }); }, per: 120 },
    },
    look: { amb: '#46535a', bg: '#0f1417', ink: '#0c1012' },
    cam: { x: 10, z: 120, eye: 165, yaw: -8, pitch: -5 },
    walk: [[-150, -90, 150, 140]],
    sw: { wall: 'w', u: 128, v: 112, hidden: 'clipboard' },
    build: function (B, R, api) {
      var o = api.objects;
      tube(B, R, -100, 0, 150, 26, { c: '#eef8f4', i: 0.85 });
      tube(B, R, 100, 0, 150, 26, { c: '#eef8f4', i: 0.85 });
      // nurses' station
      var ctr = B.T('counter', function () { return PT.drawers(512, 200, 1, '#d4cec2'); });
      var station = { wall: 'n', u: 0, v: 0, o: 36, w: 290, h: 106, d: 62 };
      B.shadowFor(station, 0.5);
      B.box({ wall: 'n', u: 0, v: 0, o: 36, w: 290, h: 102, d: 62, c: '#d4cec2', map: ctr, mapFace: 4 });
      B.box({ wall: 'n', u: 0, v: 102, o: 34, w: 296, h: 4, d: 66, c: '#ece8de' });
      B.box({ wall: 'n', u: 0, v: 0, o: 98, w: 286, h: 8, d: 2, c: '#3b6c9a' }); // (on the counter's face, not in it)
      B.thing('monitor', o.monitor && o.monitor.label, function () {
        var vt = B.T('vitals', function () { return PT.vitals(320, 200, 0); });
        B.box({ wall: 'n', u: -70, v: 106, o: 60.5, w: 8, h: 14, d: 8, c: '#2b2f33' });
        B.box({ wall: 'n', u: -70, v: 120.2, o: 62, w: 48, h: 32, d: 5, c: '#1d2023', map: vt, mapFace: 4, emit: 0.95, emitDark: 0, rx: -6 }); // (on its stand)
        B.anims.push({ every: 110, run: function (t) { vt.update(PT.vitals(320, 200, t)); } });
      });
      var mp = B.frame('n').at(-70, 80);
      B.light({ p: [mp[0], 132, mp[1]], c: '#49f08f', i: 0.25, r: 120, k: 'always' });
      B.glow([mp[0], 133, mp[1]], 60, '#49f08f', 0.15, 'always');
      B.thing('phone', o.phone && o.phone.label, function () {
        B.box({ wall: 'n', u: 26, v: 106, o: 70, w: 20, h: 5, d: 20, c: '#e7e3d8' });
        B.box({ wall: 'n', u: 26, v: 111, o: 72, w: 21, h: 4, d: 6, c: '#d8d3c6', rx: -4 });
      });
      B.thing('coffee', o.coffee && o.coffee.label, function () {
        B.cyl({ wall: 'n', u: 70, v: 106, o: 80, r: 4.5, h: 11, c: '#f1eee7', taper: 1.15 });
        B.cyl({ wall: 'n', u: 82, v: 106, o: 74, r: 4.5, h: 11, c: '#f1eee7', taper: 1.15 });
      });
      ['#2f5ba8', '#d9583a', '#e1b229', '#3e6b4f'].forEach(function (c, i) {
        B.box({ wall: 'n', u: 112 + i * 4, v: 106, o: 66, w: 3.2, h: 28, d: 24, c: c, border: 0.15 });
      });
      B.box({ wall: 'n', u: -116, v: 106, o: 70, w: 30, h: 6, d: 22, c: '#f6f3ea', ry: 6 });
      // a desk lamp: it comes on with the evening (well, the morning)
      B.cyl({ wall: 'n', u: -128, v: 106, o: 50, r: 7, h: 2, c: '#2a2d30' });
      B.cyl({ wall: 'n', u: -128, v: 108, o: 55, r: 1, h: 34, c: '#2a2d30', rx: 18 });
      var dl = B.cyl({ wall: 'n', u: -128, v: 136, o: 62, r: 7, h: 10, c: '#3b6c9a', taper: 0.5, rx: 160 });
      dl.warmEmit = 0.7;
      var dlp = B.frame('n').at(-128, 70);
      B.light({ p: [dlp[0], 128, dlp[1]], c: '#ffb46a', i: 1.1, r: 260, k: 'warm' });
      B.pool(dlp[0], 106, dlp[1] + 6, 70, 50, '#ffb46a', 0.3, 'warm');
      // the call-light panel (the wrong switch), the clock, a notice board
      B.thing('calls', o.calls && o.calls.label, function () {
        var cp = B.T('calls', function () { return PT.calls(400, 90, 6); });
        B.box({ wall: 'n', u: 10, v: 196, o: 0, w: 170, h: 38, d: 5, c: '#23282c', map: cp, mapFace: 4, emit: 0.7, emitDark: 0 });
      }, { decoy: true });
      var cpp = B.frame('n').at(-5, 10);
      B.glow([cpp[0] + 20, 215, cpp[1]], 26, '#ff6a4a', 0.4, 'always');
      B.thing('clock', o.clock && o.clock.label, function () {
        var hm = String(api.data.time || '07:05').split(':');
        var ck = B.T('clock', function () { return PT.clock(200, 200, +hm[0], +hm[1]); });
        B.cyl({ wall: 'n', u: -165, v: 205, o: 0, r: 17, h: 3, rx: 90, c: '#f4f1e8', map: ck, mapFace: 7 });
      });
      var nb = B.T('notice', function () { return PT.notice(400, 260, 5); });
      B.box({ wall: 'n', u: 150, v: 140, o: 0, w: 80, h: 52, d: 2, c: '#b48a5a', map: nb, mapFace: 4 });
      // window at dawn, hand gel, a drip stand: east wall
      var dawn = B.T('dawn', function () { return PT.dawn(520, 380); });
      B.thing('window', o.window && o.window.label, function () {
        B.box({ wall: 'e', u: -10, v: 92, o: 0, w: 184, h: 134, d: 4, c: '#e4e2dc' });
        B.card({ wall: 'e', u: -10, v: 97, o: 4.3, w: 172, h: 124, c: '#ffc98a', map: dawn, emit: 0.95, emitDark: 0, border: 0.5, hatch: 0 });
        B.box({ wall: 'e', u: -10, v: 97, o: 4.2, w: 3, h: 124, d: 1.6, c: '#e4e2dc' });
        B.box({ wall: 'e', u: -10, v: 88, o: 0, w: 192, h: 4, d: 14, c: '#e9e6df' });
      });
      B.light({ p: [180, 150, -10], c: '#ffb48a', i: 0.9, r: 420, k: 'always' });
      B.pool(150, 0, -10, 220, 240, '#ffb48a', 0.12, 'always');
      B.thing('gel', o.gel && o.gel.label, function () {
        B.box({ wall: 'e', u: 140, v: 104, o: 0.5, w: 11, h: 22, d: 10, c: '#f0efe9' });
        B.box({ wall: 'e', u: 140, v: 100, o: 6, w: 4, h: 4, d: 4, c: '#3b6c9a' });
      });
      var ivp = B.frame('e').at(90, 30);
      B.shadow(ivp[0], ivp[1], 40, 40, 0.4);
      B.cyl({ wall: 'e', u: 90, v: 0, o: 12, r: 18, h: 3, c: '#9aa3a6' });
      B.cyl({ wall: 'e', u: 90, v: 3, o: 28.5, r: 1.4, h: 170, c: '#c8cfd3' });
      B.box({ wall: 'e', u: 90, v: 150, o: 24, w: 8, h: 14, d: 2.4, c: '#dfeef5', alpha: 0.85, blend: 'alpha' });
      // ward doors: south wall
      var wdt = B.T('wdoor', function () { return PT.wdoor(200, 420); });
      B.thing('doors', o.doors && o.doors.label, function () {
        B.box({ wall: 's', u: 0, v: 0, o: 0, w: 160, h: 224, d: 4, c: '#8fa49d' });
        B.box({ wall: 's', u: -37, v: 0, o: 4, w: 72, h: 214, d: 2, c: '#c9d6d1', map: wdt, mapFace: 4 });
        B.box({ wall: 's', u: 37, v: 0, o: 4, w: 72, h: 214, d: 2, c: '#c9d6d1', map: wdt, mapFace: 4 });
      });
      var ws = B.T('wardsign', function () { return PT.sign(300, 90, [prop(api, 'ward', 'WARD 4B')], '#1f3e86', '#ffffff'); });
      B.card({ wall: 's', u: 0, v: 232, o: 0.6, w: 60, h: 18, c: '#1f3e86', map: ws, border: 0.3 });
      // the linen trolley, clear of the medication cart and the sink
      var lin = { wall: 's', u: 138, v: 0, o: 2.5, w: 70, h: 100, d: 46 };
      B.shadowFor(lin, 0.45);
      B.box({ wall: 's', u: 138, v: 10, o: 2.5, w: 70, h: 80, d: 46, c: '#3b6c9a' });
      B.box({ wall: 's', u: 138, v: 90, o: 4.5, w: 66, h: 12, d: 40, c: '#f2f0ea' });
      B.box({ wall: 's', u: 138, v: 102, o: 6.5, w: 60, h: 8, d: 36, c: '#dfe9f2' });
      // medication cart, patient board, the handover sheet: west wall
      var cart = { wall: 'w', u: -110, v: 0, o: 2, w: 62, h: 104, d: 50 };
      B.shadowFor(cart, 0.5);
      B.thing('cart', o.cart && o.cart.label, function () {
        var dr = B.T('cartdr', function () { return PT.drawers(240, 380, 5, '#3b6c9a'); });
        B.box({ wall: 'w', u: -110, v: 8, o: 2, w: 62, h: 96, d: 50, c: '#3b6c9a', map: dr, mapFace: 4 });
        B.box({ wall: 'w', u: -110, v: 104, o: 1, w: 66, h: 3, d: 52, c: '#e9e6df' });
        [-136, -84].forEach(function (u) { B.cyl({ wall: 'w', u: u, v: 0, o: 44, r: 3.5, h: 8, c: '#1b1d1f' }); });
      });
      B.thing('board', o.board && o.board.label, function () {
        var rows = prop(api, 'beds', [['BED 1', 'Discharge am'], ['BED 2', 'Obs 4-hourly'], ['BED 3', 'NBM'], ['BED 4', 'Family 10:00'], ['BED 5', 'Bloods'], ['BED 6', 'Stable']]);
        var bt = B.T('board', function () { return PT.board(520, 320, prop(api, 'ward', 'WARD 4B'), rows); });
        B.box({ wall: 'w', u: 10, v: 108, o: 0, w: 128, h: 78, d: 2, c: '#9aa3a6', map: bt, mapFace: 4 });
        B.box({ wall: 'w', u: 10, v: 104, o: 0, w: 120, h: 3, d: 6, c: '#9aa3a6' });
      });
      B.thing('clipboard', o.clipboard && o.clipboard.label, function () {
        var hl = prop(api, 'handover', ['Bed 2: obs due 08:00', 'Bed 4: family at 10', 'Bed 6: stable', '-', 'Pharmacy: call back']);
        var ct = B.T('clip', function () { return PT.sheet(220, 300, { clip: true, title: prop(api, 'handoverTitle', 'HANDOVER'), lines: hl, fs: 0.05, sign: prop(api, 'sign', 'sign:') }); });
        B.box({ wall: 'w', u: 128, v: 92, o: 2.8, w: 30, h: 41, d: 1.2, c: '#7a5a3a', map: ct, mapFace: 4, border: 0.2, pickPad: 2 }); // (in front of the switch, not through it)
      });
      B.box({ wall: 'w', u: 128, v: 134, o: 0, w: 3, h: 3, d: 4, c: '#8f9396' });
      // sink and towels
      // (between the medication cart and the corner)
      B.box({ wall: 'w', u: -165, v: 76, o: 0, w: 46, h: 14, d: 36, c: '#e9e6df' });
      B.box({ wall: 'w', u: -165, v: 110, o: 0, w: 26, h: 30, d: 12, c: '#dfe5e4' });
      // a row of chairs by the doors
      [[-70, 0], [-120, 0]].forEach(function (c) {
        var sp = B.frame('s').at(c[0], 30);
        B.shadow(sp[0], sp[1], 52, 52, 0.35);
        B.box({ wall: 's', u: c[0], v: 42, o: 10, w: 46, h: 5, d: 44, c: '#3b6c9a' });
        B.box({ wall: 's', u: c[0], v: 47, o: 6, w: 46, h: 40, d: 5, c: '#3b6c9a' });
        B.box({ wall: 's', u: c[0] - 20, v: 0, o: 12, w: 3, h: 42, d: 40, c: '#2a2d30' });
        B.box({ wall: 's', u: c[0] + 20, v: 0, o: 12, w: 3, h: 42, d: 40, c: '#2a2d30' });
      });
    },
  };


  /* The delivery depot, lights already off: a phone torch -------------------------------- */
  SCENES.depot = {
    room: {
      w: 760, d: 620, h: 420,
      wall: { c: '#6b6f70', tex: function () { return PT.tiles({ n: 4, base: '#6f7374', grout: 'rgba(30,32,33,.45)', jitter: 0.08, seed: 12 }); }, per: 120, key: 'blocks', skirt: '#3a3d3f' },
      floor: { c: '#5d6062', tex: function () { return PT.concrete({ base: '#5d6062' }); }, per: 220 },
      ceil: { c: '#3e4244' },
    },
    look: { amb: '#3c434c', bg: '#07090b', ink: '#07080b' },
    torch: true,
    cam: { x: -170, z: 240, eye: 165, yaw: 38, pitch: -4 },
    walk: [[-320, -230, 30, 260], [-320, 150, 320, 260]],
    assistAt: [6000, 13000, 21000, 31000],
    sw: { wall: 'n', u: -52, v: 125 },
    build: function (B, R, api) {
      var o = api.objects;
      var hz = B.T('hazard', function () { return PT.hazard(); }, true);
      // industrial lamps, off
      [[-200, -100], [200, -100], [-200, 150], [200, 150]].forEach(function (p) {
        B.at({ geo: 'cyl', p: [p[0], R.h - 30, p[1]], size: [56, 26, 56], c: '#2c3033', taper: 0.35 });
        B.at({ geo: 'cyl', p: [p[0], R.h - 44, p[1]], size: [30, 2, 30], c: '#f6fbff', emit: 1, emitDark: 1 });
        B.light({ p: [p[0], R.h - 60, p[1]], c: '#eaf2f6', i: 0.75, r: 700, k: 'work' });
        B.at({ geo: 'cyl', p: [p[0], R.h - 8, p[1]], size: [2, 16, 2], c: '#2c3033' });
      });
      // moonlight through high windows (west wall)
      var sky = B.T('night', function () { return PT.city(256, 128); });
      [-200, -60, 80, 220].forEach(function (u) {
        B.card({ wall: 'w', u: u, v: 320, o: 0.6, w: 100, h: 50, c: '#1d2b52', map: sky, emit: 0.7, emitDark: 0, border: 0.6, hatch: 0 });
      });
      B.light({ p: [-300, 330, 0], c: '#6a82c8', i: 0.2, r: 700, k: 'always' });
      B.light({ p: [0, 300, 0], c: '#ffb46a', i: 1.2, r: 900, k: 'warm' });
      B.light({ p: [-60, 200, -250], c: '#ffb46a', i: 1.1, r: 500, k: 'warm' });
      // roller door, its frame painted in hazard stripes
      var DU = 162;
      B.thing('door', o.door && o.door.label, function () {
        var sl = B.T('slats', function () { return PT.slats({ base: '#7b8285' }); }, true);
        // (DU: its middle, far enough along that the frame and the header clear the pillar)
        B.box({ wall: 'n', u: DU, v: 0, o: 0, w: 300, h: 340, d: 6, c: '#7b8285', map: sl, mapFace: 4, rep: [3, 4] });
        B.box({ wall: 'n', u: DU, v: 340, o: 0, w: 320, h: 40, d: 30, c: '#3d4245' });
        B.box({ wall: 'n', u: DU, v: 20, o: 6, w: 70, h: 6, d: 4, c: '#24282a' });
      });
      [DU - 158, DU + 158].forEach(function (u) { B.box({ wall: 'n', u: u, v: 0, o: 0, w: 16, h: 340, d: 10, c: '#e1b229', map: hz, mapFace: 4, rep: [0.5, 10] }); });
      // the pillar next to it (the switch is on the wall beside it)
      B.box({ wall: 'n', u: -22, v: 0, o: 0, w: 30, h: R.h, d: 30, c: '#62676a' });
      B.box({ wall: 'n', u: -22, v: 0, o: 0, w: 32, h: 110, d: 32, c: '#e1b229', map: hz, mapFace: -1, rep: [0.6, 2.4] });
      // route board, clock, keys, vest
      B.thing('board', o.board && o.board.label, function () {
        var rb = B.T('route', function () {
          return PT.sheet(320, 240, { title: prop(api, 'route', 'ROUTE 7'), titleCol: '#2b2e30', lines: prop(api, 'stops', ['Stop 38  ✓', 'Stop 39  ✓', 'Stop 40  ✓', 'Stop 41  ✓  41/41']), fs: 0.075, lh: 0.14, col: '#2c5ba0', paper: '#f2f1ec', mark: function (i) { return i === 3; }, markCol: '#c0392b' });
        });
        B.box({ wall: 'n', u: -230, v: 130, o: 0, w: 120, h: 90, d: 3, c: '#9aa0a3', map: rb, mapFace: 4 });
      });
      B.thing('clock', o.clock && o.clock.label, function () {
        var hm = String(api.data.time || '21:40').split(':');
        var ck = B.T('clock', function () { return PT.clock(200, 200, +hm[0], +hm[1]); });
        B.cyl({ wall: 'n', u: -230, v: 250, o: 0, r: 20, h: 4, rx: 90, c: '#f3f1ea', map: ck, mapFace: 7 });
      });
      B.thing('keys', o.keys && o.keys.label, function () {
        B.box({ wall: 'n', u: -128, v: 120, o: 0, w: 34, h: 44, d: 8, c: '#3a3d3f' });
        [-138, -126, -114].forEach(function (u, i) {
          B.box({ wall: 'n', u: u, v: 132 - (i % 2) * 4, o: 8, w: 3, h: 9, d: 1, c: ['#c9a227', '#2c5ba0', '#c0392b'][i] });
        });
      });
      B.thing('vest', o.vest && o.vest.label, function () {
        // (hung below the route board)
        B.box({ wall: 'n', u: -175, v: 58, o: 2, w: 46, h: 70, d: 8, c: '#c8e63c', rz: -3 });
        B.box({ wall: 'n', u: -175, v: 84, o: 10.2, w: 46, h: 5, d: 0.4, c: '#e6e9e9', rz: -3 });
        B.box({ wall: 'n', u: -175, v: 102, o: 10.2, w: 46, h: 5, d: 0.4, c: '#e6e9e9', rz: -3 });
      });
      // the van, parked facing the door
      var vb = B.T('vanback', function () { return PT.vanBack(380, 460, prop(api, 'plate', 'ES 0041')); });
      var vs = B.T('vanside', function () { return PT.vanSide(520, 300); });
      B.shadow(155, -140, 250, 360, 0.6);
      B.thing('van', o.van && o.van.label, function () {
        B.at({ p: [155, 135, -90], size: [190, 230, 200], c: '#e9ebe7', map: vb, mapFace: 4 });
        B.at({ geo: 'card', p: [59.6, 135, -90], size: [200, 230, 1], ry: -90, c: '#e9ebe7', map: vs, border: 0, decal: 1 });
        B.at({ p: [155, 115, -240], size: [186, 190, 100], c: '#e3e5e1' });
        B.at({ p: [155, 170, -292], size: [176, 70, 4], c: '#1d2b3a', emit: 0.1, rx: -12 });
        B.at({ p: [61.4, 168, -245], size: [2, 56, 70], c: '#1d2b3a' });
        B.at({ p: [56, 168, -280], size: [10, 14, 6], c: '#26292c' });
        [[-260, 62], [-260, 248], [-40, 62], [-40, 248]].forEach(function (w) {
          B.at({ geo: 'cyl', p: [w[1], 34, w[0]], size: [68, 30, 68], c: '#151718', rz: 90 });
          B.at({ geo: 'cyl', p: [w[1] + (w[1] < 155 ? -15.5 : 15.5), 34, w[0]], size: [34, 1.5, 34], c: '#9aa0a3', rz: 90 });
        });
      });
      // racks of parcels on the east wall
      B.thing('parcels', o.parcels && o.parcels.label, function () {
        [-180, 0, 180].forEach(function (u) { B.box({ wall: 'e', u: u - 88, v: 0, o: 0, w: 8, h: 330, d: 90, c: '#2c5ba0' }); });
        B.box({ wall: 'e', u: 270, v: 0, o: 0, w: 8, h: 330, d: 90, c: '#2c5ba0' });
        [40, 150, 260].forEach(function (v) { B.box({ wall: 'e', u: 0, v: v, o: 0, w: 540, h: 6, d: 90, c: '#e1871f' }); });
        // parcels bay by bay, between the uprights (turned a little, so measured as turned)
        var R0 = PT.rng(77), n = 0, BAYS = [[-264, -92], [-84, 88], [96, 266]];
        [46, 156, 266].forEach(function (v) {
          BAYS.forEach(function (bay) {
            var u = bay[0] + 3;
            for (;;) {
              var w = 40 + R0() * 50, h = 30 + R0() * 60, d = 40 + R0() * 40, po = 4 + R0() * 10, ry = (R0() - 0.5) * 8;
              var room = bay[1] - 3 - u, cs = Math.cos(ry * DEG), sn = Math.abs(Math.sin(ry * DEG));
              if (w * cs + d * sn > room) w = (room - d * sn) / cs; // the last one in a bay: a narrower parcel
              if (w < 30) break;
              var hu = (w * cs + d * sn) / 2;
              var tx = B.T('parcel' + (n % 6), (function (k) { return function () { return PT.parcel(200, 160, k); }; })(n % 6));
              B.box({ wall: 'e', u: u + hu, v: v, o: po, w: w, h: Math.min(h, 100), d: d, c: '#b07f4f', map: tx, mapFace: 4, ry: ry });
              u += 2 * hu + 4 + R0() * 14;
              n++;
            }
          });
        });
      });
      // bench and scanner, cage trolleys, lockers: west and south walls
      B.box({ wall: 'w', u: 40, v: 80, o: 0, w: 200, h: 5, d: 60, c: '#7a6656' });
      [-50, 130].forEach(function (u) { B.box({ wall: 'w', u: u, v: 0, o: 4, w: 6, h: 80, d: 52, c: '#3e3732' }); });
      B.thing('scanner', o.scanner && o.scanner.label, function () {
        B.box({ wall: 'w', u: 20, v: 85, o: 20, w: 12, h: 4, d: 26, c: '#2c2f31', ry: 18 });
        B.box({ wall: 'w', u: 20, v: 89, o: 22, w: 6, h: 3, d: 8, c: '#c0392b', ry: 18 });
      });
      B.box({ wall: 'w', u: 70, v: 85, o: 12, w: 50, h: 30, d: 40, c: '#b07f4f', map: B.T('parcel1', function () { return PT.parcel(200, 160, 1); }), mapFace: 4 });
      B.thing('trolley', o.trolley && o.trolley.label, function () {
        [-200, -120].forEach(function (u) {
          var cage = { wall: 'w', u: u, v: 8, o: 30, w: 70, h: 170, d: 70 };
          B.shadowFor(cage, 0.4);
          [[-35, 0], [35, 0], [-35, 70], [35, 70]].forEach(function (q) { B.box({ wall: 'w', u: u + q[0], v: 8, o: 30 + q[1], w: 3, h: 170, d: 3, c: '#8f9698' }); });
          [8, 64, 120, 176].forEach(function (v) {
            B.box({ wall: 'w', u: u, v: v, o: 30, w: 70, h: 2.5, d: 3, c: '#8f9698' });
            B.box({ wall: 'w', u: u, v: v, o: 100, w: 70, h: 2.5, d: 3, c: '#8f9698' });
            B.box({ wall: 'w', u: u - 35, v: v, o: 30, w: 3, h: 2.5, d: 70, c: '#8f9698' });
          });
          B.box({ wall: 'w', u: u, v: 12, o: 30, w: 70, h: 3, d: 70, c: '#6f7678' });
        });
      });
      var lk = B.T('lockers', function () { return PT.lockers(512, 360, 6); });
      B.box({ wall: 's', u: 120, v: 0, o: 0, w: 210, h: 190, d: 50, c: '#56708a', map: lk, mapFace: 4 });
      var ex = B.T('exit', function () { return PT.sign(200, 80, [prop(api, 'exit', 'EXIT')], '#1f8a4d', '#ffffff'); });
      B.box({ wall: 's', u: -150, v: 236, o: 0, w: 40, h: 16, d: 5, c: '#1f8a4d', map: ex, mapFace: 4, emit: 0.95, emitDark: 0 });
      var exp = B.frame('s').at(-150, 10);
      B.glow([exp[0], 244, exp[1]], 70, '#3cd27a', 0.35, 'always');
      B.light({ p: [exp[0], 240, exp[1]], c: '#3cd27a', i: 0.3, r: 260, k: 'always' });
      // painted lines on the floor
      [[-40, 'z'], [40, 'z']].forEach(function () {});
      B.flat({ wall: 'n', u: DU, v: 0, o: 6, w: 320, d: 10, c: '#e1b229', lift: 0.25 });
      B.flat({ wall: 'n', u: 30, v: 0, o: 60, w: 10, d: 420, c: '#e1b229', lift: 0.25 });
      B.flat({ wall: 'n', u: 280, v: 0, o: 60, w: 10, d: 420, c: '#e1b229', lift: 0.25 });
    },
  };


  /* ------------------------------------------------------------------ stills
     Rooms behind the message floods: drawn once, not walked through. */
  var STILLS = {};
  ES.inkStills = STILLS;

  // Home, 19:42: dinner going cold on the table
  STILLS.office = {
    room: { w: 420, d: 400, h: 255, wall: { c: '#8c7f6c', skirt: '#4a4038' }, floor: { c: '#6e5038', tex: function () { return PT.planks({ base: '#6e5038', seed: 3 }); }, per: 110 }, ceil: { c: '#7d7466' } },
    look: { amb: '#5a5462', bg: '#0e0d10', ink: '#0d0c10' },
    cam: { x: -30, z: 120, eye: 118, yaw: -14, pitch: -6 },
    build: function (B, R, api) {
      B.light({ p: [-40, 200, -30], c: '#ffd9a6', i: 1.25, r: 420, k: 'work' });
      B.light({ p: [80, 160, -190], c: '#7c92d6', i: 0.45, r: 360, k: 'always' });
      B.light({ p: [-40, 150, 40], c: '#ffb46a', i: 1.2, r: 380, k: 'warm' });
      // pendant over the table
      B.at({ geo: 'cyl', p: [-40, 200, -30], size: [44, 22, 44], c: '#2b2e31', taper: 0.3 });
      B.at({ geo: 'cyl', p: [-40, 231, -30], size: [1.5, 46, 1.5], c: '#1b1c1f' });
      B.at({ geo: 'cyl', p: [-40, 190, -30], size: [20, 1, 20], c: '#fff1d6', emit: 1, emitDark: 0.95 });
      B.glow([-40, 186, -30], 90, '#ffd9a6', 0.4, 'work');
      // the table, set for one
      B.shadow(-40, -30, 200, 140, 0.45);
      B.at({ p: [-40, 74, -30], size: [170, 4, 100], c: '#a17a52' });
      [[-115, -70], [35, -70], [-115, 10], [35, 10]].forEach(function (q) { B.at({ p: [q[0], 36, q[1]], size: [5, 72, 5], c: '#7c5e41' }); });
      B.at({ geo: 'cyl', p: [-60, 76.8, 0], size: [30, 1.6, 30], c: '#f3f0e8' });
      B.at({ geo: 'cyl', p: [-58, 78.6, 2], size: [16, 2, 14], c: '#c8763a' });
      B.at({ geo: 'cyl', p: [-69, 79.1, -6], size: [8, 3, 8], c: '#7a9a3a' });
      B.at({ p: [-36, 76.6, 4], size: [2, 0.6, 20], c: '#c8cfd3' });
      B.at({ geo: 'cyl', p: [-20, 83, -20], size: [8, 14, 8], c: '#cfe3ee', alpha: 0.75, blend: 'alpha' });
      // the laptop, closed, with the work badge on it
      B.at({ p: [10, 77.2, -40], size: [38, 2.4, 26], c: '#a6adb4', ry: 12 });
      var badge = B.T('badge', function () { return PT.badge(120, 170, prop(api, 'staff', 'STAFF')); });
      B.at({ geo: 'card', p: [12, 78.6, -38], size: [7, 10, 1], rx: -90, rz: 20, c: '#f6f3ea', map: badge, decal: 1 });
      // chairs
      [[-40, 40, 0], [-40, -100, 180]].forEach(function (q) {
        B.at({ p: [q[0], 44, q[1]], size: [44, 4, 42], c: '#3b4a5a', ry: q[2] });
        B.at({ p: [q[0], 70, q[1] + (q[2] ? -20 : 20)], size: [44, 48, 4], c: '#3b4a5a', ry: q[2] });
      });
      // window, the city at dusk
      var city = B.T('city', function () { return PT.city(480, 420); });
      B.box({ wall: 'n', u: 40, v: 80, o: 0, w: 160, h: 140, d: 4, c: '#e7e2d6' });
      B.card({ wall: 'n', u: 40, v: 86, o: 4.3, w: 148, h: 128, c: '#1d2b52', map: city, emit: 0.9, emitDark: 0, border: 0.5, hatch: 0 });
      B.box({ wall: 'n', u: 40, v: 86, o: 4.2, w: 3, h: 128, d: 1.6, c: '#e7e2d6' });
      // kitchen counter, fridge with notes, wall clock
      B.box({ wall: 'w', u: 0, v: 0, o: 0, w: 260, h: 90, d: 60, c: '#d9d3c6', map: B.T('drawers', function () { return PT.drawers(512, 180, 1, '#d9d3c6'); }), mapFace: 4 });
      B.box({ wall: 'w', u: 0, v: 90, o: 0, w: 262, h: 4, d: 62, c: '#5a5048' });
      B.box({ wall: 'w', u: 40, v: 140, o: 0, w: 180, h: 70, d: 34, c: '#e9e4d8' });
      B.box({ wall: 'n', u: -170, v: 0, o: 0, w: 70, h: 190, d: 66, c: '#e9ebe7' });
      ['#fff4a8', '#ffd1d1', '#cfe8ff'].forEach(function (c, i) { B.card({ wall: 'n', u: -182 + i * 14, v: 120 + (i % 2) * 18, o: 66.3, w: 12, h: 12, c: c, rz: (i - 1) * 6 }); });
      var hm = String(api.data.time || '19:42').split(':');
      var ck = B.T('clock', function () { return PT.clock(200, 200, +hm[0], +hm[1]); });
      B.cyl({ wall: 'n', u: -60, v: 170, o: 0, r: 16, h: 3, rx: 90, c: '#f4f1e8', map: ck, mapFace: 7 });
      // a bag dropped by the door
      B.box({ wall: 'e', u: -60, v: 0, o: 20, w: 40, h: 34, d: 22, c: '#34463a', ry: 14 });
      B.box({ wall: 'e', u: 40, v: 0, o: 0, w: 90, h: 210, d: 3, c: '#cfc8ba', map: B.T('door', function () { return PT.door(200, 420, { base: '#cfc8ba' }); }), mapFace: 4 });
    },
  };

  // The shop after closing, 21:15: the shutter's down
  STILLS.shop = {
    room: { w: 520, d: 440, h: 300, wall: { c: '#d9d6cc', skirt: '#4a4a4a' }, floor: { c: '#9a9488', tex: function () { return PT.tiles({ n: 2, base: '#a49d90', grout: 'rgba(40,36,30,.4)', jitter: 0.05, seed: 8 }); }, per: 80 }, ceil: { c: '#b9b8b0', tex: function () { return PT.tiles({ n: 2, base: '#c4c3bb', grout: 'rgba(60,60,60,.4)', jitter: 0.02 }); }, per: 120 } },
    look: { amb: '#545862', bg: '#0c0d10', ink: '#0d0e12' },
    cam: { x: 40, z: 150, eye: 160, yaw: -18, pitch: -6 },
    build: function (B, R, api) {
      tube(B, R, -120, -40, 22, 160, { i: 0.75 });
      B.at({ p: [120, R.h - 6, -40], size: [22, 2, 160], c: '#3a3f43' });
      B.light({ p: [0, 200, 0], c: '#ffb46a', i: 1.1, r: 520, k: 'warm' });
      // the shutter, down, and a CLOSED sign
      var sl = B.T('slats', function () { return PT.slats({ base: '#8a9194' }); }, true);
      B.box({ wall: 'n', u: 0, v: 0, o: 0, w: 380, h: 260, d: 4, c: '#8a9194', map: sl, mapFace: 4, rep: [3, 3.2] });
      var cs = B.T('closed', function () { return PT.sign(240, 110, [prop(api, 'closed', 'CLOSED')], '#c0392b', '#ffffff', true); });
      B.card({ wall: 'n', u: 0, v: 150, o: 5, w: 50, h: 23, c: '#c0392b', map: cs, rz: -3 });
      // shelves of stock, both sides
      ['w', 'e'].forEach(function (wl) {
        [-140, -20, 100].forEach(function (u) {
          [20, 70, 120, 170].forEach(function (v, j) {
            B.box({ wall: wl, u: u, v: v, o: 0, w: 116, h: 3, d: 40, c: '#e9e6df' });
            var R0 = PT.rng(u * 7 + v);
            for (var k = 0; k < 6; k++) {
              var cc = ['#c0392b', '#2f5ba8', '#e1b229', '#3e6b4f', '#d9583a', '#f2efe6'][Math.floor(R0() * 6)];
              B.box({ wall: wl, u: u - 48 + k * 19, v: v + 3, o: 6, w: 15, h: 18 + R0() * 22, d: 24, c: cc, border: 0.2 });
            }
          });
          B.box({ wall: wl, u: u, v: 0, o: 0, w: 120, h: 20, d: 44, c: '#4a4a4a' });
        });
      });
      // the counter and the till
      B.shadow(-60, 60, 240, 110, 0.45);
      B.at({ p: [-60, 50, 60], size: [220, 100, 70], c: '#2f5ba8' });
      B.at({ p: [-60, 102, 60], size: [226, 4, 76], c: '#e9e6df' });
      B.at({ p: [-90, 112, 60], size: [36, 16, 30], c: '#26292c' });
      var tl = B.T('till', function () { return PT.sign(200, 130, [prop(api, 'till', 'TOTAL 0.00')], '#0c1a14', '#49f08f'); });
      B.at({ p: [-90, 132, 62], size: [30, 22, 3], rx: -14, ry: 180, c: '#0c1a14', map: tl, mapFace: 5, emit: 0.85, emitDark: 0 });
      B.at({ p: [-20, 110, 56], size: [26, 12, 20], c: '#f2efe6', ry: 10 });
      // a mop leaning on the shelf
      B.at({ geo: 'cyl', p: [160, 70, -60], size: [3, 140, 3], rz: 10, c: '#8c8478' });
      B.at({ p: [174, 14, -60], size: [30, 28, 28], c: '#e1b229' });
    },
  };

  // Sunday, 21:30: the sofa, the laptop open on the coffee table
  STILLS.clients = {
    room: { w: 480, d: 420, h: 255, wall: { c: '#4f5a6e', skirt: '#2a3038' }, walls: { n: { c: '#5c4e60', skirt: '#2a3038' } }, floor: { c: '#6a4a36', tex: function () { return PT.planks({ base: '#6a4a36', seed: 9 }); }, per: 110 }, ceil: { c: '#4a5164' } },
    look: { amb: '#3e4558', bg: '#0b0c12', ink: '#0b0c12' },
    cam: { x: -60, z: 160, eye: 108, yaw: 26, pitch: -6 },
    build: function (B, R, api) {
      B.light({ p: [-150, 150, -120], c: '#ffb46a', i: 1.0, r: 360, k: 'always' });
      B.light({ p: [40, 90, -20], c: '#9cc0ff', i: 0.9, r: 260, k: 'work' });
      B.light({ p: [60, 150, -200], c: '#7a9cff', i: 0.6, r: 340, k: 'work' });
      B.light({ p: [0, 160, 0], c: '#ffb46a', i: 0.9, r: 480, k: 'warm' });
      // floor lamp in the corner (on, it's Sunday)
      B.at({ geo: 'cyl', p: [-170, 2, -130], size: [36, 4, 36], c: '#24262a' });
      B.at({ geo: 'cyl', p: [-170, 80, -130], size: [3, 156, 3], c: '#24262a' });
      B.at({ geo: 'cyl', p: [-170, 165, -130], size: [44, 30, 44], c: '#e3cfa6', taper: 0.7, emit: 0.7, emitDark: 0 });
      B.glow([-170, 160, -130], 120, '#ffb46a', 0.5, 'always');
      // the TV on the wall, on
      var tv = B.T('tv', function () { var c = PT.cv(320, 180), x = c.getContext('2d'); var g = x.createLinearGradient(0, 0, 320, 180); g.addColorStop(0, '#2f5ba8'); g.addColorStop(1, '#8a6aa0'); x.fillStyle = g; x.fillRect(0, 0, 320, 180); x.fillStyle = 'rgba(255,255,255,.85)'; x.font = '800 34px "Sofia Sans Extra Condensed", sans-serif'; x.fillText(prop(api, 'tv', 'AUTOPLAY ▸ 0:05'), 20, 150); return c; });
      B.box({ wall: 'n', u: 60, v: 110, o: 0, w: 140, h: 80, d: 5, c: '#101114', map: tv, mapFace: 4, emit: 0.85, emitDark: 0.6 });
      B.glow([60, 150, -180], 200, '#7a9cff', 0.25, 'work');
      B.box({ wall: 'n', u: 60, v: 0, o: 0, w: 200, h: 46, d: 44, c: '#3a3133' });
      // coffee table: the laptop open, a mug, invoices
      B.shadow(30, -20, 160, 100, 0.45);
      B.at({ p: [30, 42, -20], size: [130, 4, 70], c: '#9a7652' });
      [[-30, -48], [90, -48], [-30, 8], [90, 8]].forEach(function (q) { B.at({ p: [q[0], 20, q[1]], size: [4, 40, 4], c: '#7c5e41' }); });
      var inbox = B.T('inbox', function () { return PT.inbox(340, 230, 7); });
      B.at({ p: [40, 45, -14], size: [34, 1.6, 24], c: '#a6adb4', ry: -10 });
      B.at({ p: [41.5, 57, -26], size: [34, 23, 1], c: '#a6adb4', ry: -10, rx: -12, map: inbox, mapFace: 4, emit: 0.95, emitDark: 0.1 });
      B.glow([42, 58, -20], 60, '#9cc0ff', 0.2, 'work');
      B.at({ geo: 'cyl', p: [0, 49, -10], size: [9, 10, 9], c: '#d9583a' });
      B.at({ p: [70, 44.4, 0], size: [24, 0.6, 32], c: '#f6f3ea', ry: 18 });
      B.at({ p: [74, 44.9, 4], size: [24, 0.6, 32], c: '#f6f3ea', ry: 8 });
      // the sofa you're on (just its arm), a cushion, a blanket
      B.at({ p: [-120, 34, 90], size: [40, 68, 100], c: '#46557a' });
      B.at({ p: [-81, 50, 60], size: [36, 30, 12], c: '#d9583a', ry: 30 }); // (against the arm, not in it)
      // the bookshelf: open (a back, the sides, a top, the shelves), the books standing on the shelves
      B.box({ wall: 'e', u: -60, v: 0, o: 0, w: 120, h: 180, d: 2, c: '#4a3a2c' });
      [-118, -2].forEach(function (u) { B.box({ wall: 'e', u: u, v: 0, o: 0, w: 4, h: 180, d: 32, c: '#5a4636' }); });
      B.box({ wall: 'e', u: -60, v: 177, o: 0, w: 112, h: 3, d: 32, c: '#5a4636' });
      B.box({ wall: 'e', u: -60, v: 0, o: 2, w: 112, h: 6, d: 30, c: '#5a4636' });
      [6, 48, 92, 136].forEach(function (v, i) {
        if (i) B.box({ wall: 'e', u: -60, v: v - 2, o: 2, w: 112, h: 2, d: 30, c: '#7a5e48' });
        var R0 = PT.rng(v + 24);
        for (var k = 0; k < 7; k++) B.box({ wall: 'e', u: -110 + k * 14 + R0() * 4, v: v, o: 4, w: 10, h: 22 + R0() * 14, d: 20, c: ['#b0473a', '#2f5d7c', '#d8c79a', '#3e6b4f', '#8a6aa0'][k % 5], border: 0.2 });
      });
      var city = B.T('city', function () { return PT.city(300, 360); });
      B.box({ wall: 'e', u: 90, v: 90, o: 0, w: 110, h: 130, d: 4, c: '#ddd8cc' });
      B.card({ wall: 'e', u: 90, v: 96, o: 4.3, w: 98, h: 118, c: '#1d2b52', map: city, emit: 0.9, emitDark: 0, border: 0.5, hatch: 0 });
      var rug = B.T('rug', function () { return PT.rug(340, 240); });
      B.flat({ wall: 'n', u: 30, v: 0, o: 130, w: 220, d: 150, c: '#7b4a43', map: rug, border: 0.3, lift: 0.3 });
    },
  };

  // Draw a still once (and again when its lights change)
  ES.inkStill = function (host, id, api) {
    var S = STILLS[id];
    if (!S || !Ink.supported()) return null;
    // drawn with WebGL off-screen, shown as a plain picture (so copies of it keep it too)
    var canvas = document.createElement('canvas');
    var shown = document.createElement('canvas');
    shown.className = 'gf__still';
    shown.setAttribute('aria-hidden', 'true');
    var r = Ink.renderer(canvas);
    if (!r) return null;
    host.appendChild(shown);
    host.classList.add('has-still');
    var B = new Room(S.room, r);
    shell(B, S.room);
    S.build(B, S.room, api);
    var st = { dark: 0, warm: 0 }, W = 1, H = 1;
    function draw() {
      var rc = host.getBoundingClientRect();
      W = Math.max(1, rc.width);
      H = Math.max(1, rc.height);
      var P = Math.max(H / 2 / Math.tan(32 * DEG), W / 2 / Math.tan(44 * DEG));
      r.resize(W, H, Math.min(window.devicePixelRatio || 1, 1.5));
      B.objs.forEach(function (o) {
        if (o.kind && o.base != null) {
          var f = o.kind === 'work' ? 1 - st.dark : o.kind === 'warm' ? st.warm : 1;
          o.glow = o.base * f;
          o.hidden = o.glow < 0.003;
        }
      });
      var c = Ink.hex(S.look.bg);
      r.render(B.objs, { cam: { pos: [S.cam.x, S.cam.eye, S.cam.z], yaw: S.cam.yaw, pitch: S.cam.pitch, roll: 0, fovy: 2 * Math.atan(H / 2 / P) }, amb: S.look.amb, ink: S.look.ink, dark: st.dark, warm: st.warm, bg: [c[0], c[1], c[2], 1], hatch: 1, grain: 0.035, cull: true, lights: B.lights });
      if (shown.width !== canvas.width || shown.height !== canvas.height) {
        shown.width = canvas.width;
        shown.height = canvas.height;
      }
      try { shown.getContext('2d').drawImage(canvas, 0, 0); } catch (e) {}
    }
    var raf = 0;
    function later() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }
    var ro = 'ResizeObserver' in window ? new ResizeObserver(later) : null;
    if (ro) ro.observe(host);
    else window.addEventListener('resize', later);
    draw();
    if (document.fonts && document.fonts.ready)
      document.fonts.ready.then(function () {
        Object.keys(B.tex).forEach(function (k) { var t = B.tex[k]; if (t.make && /^(badge|clock|closed|till|tv|inbox)/.test(k)) t.update(t.make()); });
        later();
      });
    return {
      set: function (o) { Object.assign(st, o); later(); },
      destroy: function () {
        if (ro) ro.disconnect();
        else window.removeEventListener('resize', later);
        r.destroy();
        if (shown.parentNode) shown.parentNode.removeChild(shown);
      },
    };
  };



  /* ------------------------------------------------------------------ story rooms
     Only shot as panels for the home page story (story.js), never played. */
  var STORY = {};

  // The end of the hallway: a wall with a doorway (trim, a door open inward), and through it the
  // kitchen with its light on: tiles, cabinets, the counter, a window on the night, a pendant lamp,
  // a chair, the fridge. Its light spills out onto the hall floor.
  function buildKitchenEnd(B, R) {
    // (the wall stays north of z -180: the film's calendar, centred at z -100, gets up to 154 cm wide)
    var hd = R.d / 2, ZW = -hd + 128, T = 12, OW = 92, OH = 208; // the wall's face toward the kitchen, its thickness, the opening
    var zc = ZW + T / 2, zh = ZW + T; // middle of the wall, its face toward the hall
    var wallC = '#a39684', trim = '#e6dccb';
    var side = (R.w - OW) / 2;
    // (the wall's own pieces carry no ink: their seams over the opening read as wires; the trim and
    // the reveals draw the opening)
    [-1, 1].forEach(function (sg) {
      var x = sg * (OW / 2 + side / 2);
      B.at({ p: [x, R.h / 2, zc], size: [side, R.h, T], c: wallC, border: 0 });
      B.at({ p: [x, 5, zh + 0.6], size: [side, 10, 1.2], c: '#4a4038', border: 0.15 });
      // the trim round the opening, and the reveal inside it
      B.at({ p: [sg * (OW / 2 + 3.5), OH / 2, zh + 0.8], size: [7, OH, 1.6], c: trim, border: 0.2 }); // (up to the head piece, not behind it)
      B.at({ p: [sg * (OW / 2 - 0.6), OH / 2, zc], size: [1.2, OH, T - 0.2], c: '#d9cfbd', border: 0.12 });
    });
    B.at({ p: [0, (R.h + OH) / 2, zc], size: [OW, R.h - OH, T], c: wallC, border: 0 });
    B.at({ p: [0, OH + 3.5, zh + 0.8], size: [OW + 14, 7, 1.6], c: trim, border: 0.2 });
    // (the reveals and the threshold stop just short of the wall's faces, so no two faces share a plane)
    B.at({ p: [0, OH + 0.1, zc], size: [OW, 1, T - 0.2], c: '#d9cfbd', border: 0.12 });
    B.at({ p: [0, 0.6, zc], size: [OW - 2.4, 1.2, T - 0.2], c: '#6a4a2e', border: 0.12 });
    // the door, open into the kitchen, swung back toward the far corner (the kitchen is too shallow
    // for it to open all the way: it stops clear of the counter and the side wall)
    var leaf = 86, swing = 45, hx = -OW / 2 + 1.8, hz = ZW - 1.5;
    var along = [-Math.sin(swing * DEG), -Math.cos(swing * DEG)], nrm = [Math.cos(swing * DEG), -Math.sin(swing * DEG)];
    B.at({ p: [hx + along[0] * leaf / 2, OH / 2 - 1, hz + along[1] * leaf / 2], size: [3.6, OH - 3, leaf], c: '#d8cdb8', ry: swing, border: 0.22 });
    B.at({ p: [hx + along[0] * (leaf - 7) + nrm[0] * 2.9, 100, hz + along[1] * (leaf - 7) + nrm[1] * 2.9], size: [2.2, 2.2, 6], c: '#b8a27a', ry: swing, border: 0.1 });

    // the kitchen
    var kz0 = -hd, kd = ZW - kz0; // back wall, depth
    var KX = 57, KW = KX + R.w / 2, KU = KX - KW / 2; // the counter runs from the left wall to the fridge
    var tiles = B.T('kfloor', function () { return PT.tiles({ base: '#d9cfba', n: 2, grout: 'rgba(90,76,60,.45)', jitter: 0.08, seed: 9 }); }, true);
    B.flat({ wall: 'n', u: 0, v: 0, o: 0, w: R.w, d: kd, c: '#d9cfba', map: tiles, rep: [5, 3], border: 0, lift: 0.25 });
    var back = B.T('kback', function () { return PT.tiles({ base: '#ece5d6', n: 8, grout: 'rgba(140,124,100,.5)', gw: 1.5, jitter: 0.05, shine: true, seed: 4 }); }, true);
    B.card({ wall: 'n', u: KU, v: 90, o: 0.5, w: KW, h: 58, c: '#ece5d6', map: back, rep: [3, 1], border: 0.2 });
    var cab = B.T('kcab', function () {
      var c = PT.cv(512, 200), x = c.getContext('2d');
      x.fillStyle = '#62786b'; x.fillRect(0, 0, 512, 200);
      for (var i = 0; i < 5; i++) {
        var X = 6 + i * 100;
        x.strokeStyle = 'rgba(20,28,24,.55)'; x.lineWidth = 3; x.strokeRect(X, 8, 92, 184);
        x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = 2; x.strokeRect(X + 9, 18, 74, 164);
        x.fillStyle = '#c9c3b8'; x.fillRect(X + (i % 2 ? 10 : 74), 30, 6, 40);
      }
      return c;
    });
    B.box({ wall: 'n', u: KU, v: 0, o: 0, w: KW, h: 10, d: 56, c: '#2f3a33', border: 0.15 });
    B.box({ wall: 'n', u: KU, v: 10, o: 0, w: KW, h: 76, d: 60, c: '#62786b', map: cab, mapFace: 4, border: 0.25 });
    B.box({ wall: 'n', u: KU, v: 86, o: 0, w: KW, h: 4, d: 63, c: '#d8d0c0', border: 0.2 });
    var up = B.T('kcabup', function () {
      var c = PT.cv(256, 220), x = c.getContext('2d');
      x.fillStyle = '#6c8274'; x.fillRect(0, 0, 256, 220);
      [0, 128].forEach(function (X, i) {
        x.strokeStyle = 'rgba(20,28,24,.55)'; x.lineWidth = 3; x.strokeRect(X + 6, 8, 116, 204);
        x.fillStyle = '#c9c3b8'; x.fillRect(X + (i ? 12 : 104), 170, 6, 32);
      });
      return c;
    });
    B.box({ wall: 'n', u: -72, v: 150, o: 0, w: 76, h: 72, d: 34, c: '#6c8274', map: up, mapFace: 4, border: 0.25 });
    // right of the window a narrow one, and one over the fridge
    var up1 = B.T('kcabup1', function () {
      var c = PT.cv(96, 300), x = c.getContext('2d');
      x.fillStyle = '#6c8274'; x.fillRect(0, 0, 96, 300);
      x.strokeStyle = 'rgba(20,28,24,.55)'; x.lineWidth = 3; x.strokeRect(6, 8, 84, 284);
      x.fillStyle = '#c9c3b8'; x.fillRect(14, 232, 6, 40);
      return c;
    });
    B.box({ wall: 'n', u: 45.5, v: 150, o: 0, w: 23, h: 72, d: 34, c: '#6c8274', map: up1, mapFace: 4, border: 0.25 });
    var upF = B.T('kcabtop', function () {
      var c = PT.cv(256, 164), x = c.getContext('2d');
      x.fillStyle = '#6c8274'; x.fillRect(0, 0, 256, 164);
      [0, 128].forEach(function (X, i) {
        x.strokeStyle = 'rgba(20,28,24,.55)'; x.lineWidth = 3; x.strokeRect(X + 6, 8, 116, 148);
        x.fillStyle = '#c9c3b8'; x.fillRect(X + (i ? 12 : 84), 136, 32, 6);
      });
      return c;
    });
    B.box({ wall: 'n', u: 83, v: 190, o: 0, w: 50, h: 32, d: 34, c: '#6c8274', map: upF, mapFace: 4, border: 0.25 });
    // the window over the sink: the night outside, a frame, a plant on the sill
    var city = B.T('kcity', function () { return PT.city(256, 256); });
    B.card({ wall: 'n', u: 0, v: 150, o: 0.6, w: 60, h: 66, c: '#1d2b52', map: city, emit: 0.8, emitDark: 0, border: 0.3, hatch: 0 });
    [[0, 149, 66, 3], [0, 216, 66, 3], [-31.5, 182.5, 3, 70], [31.5, 182.5, 3, 70], [0, 182.5, 2, 66], [0, 182.5, 60, 2]].forEach(function (q) {
      B.box({ wall: 'n', u: q[0], v: q[1] - q[3] / 2, o: 0, w: q[2], h: q[3], d: 4, c: '#ece7dc', border: 0.15 });
    });
    B.box({ wall: 'n', u: 0, v: 146, o: 0, w: 72, h: 3, d: 10, c: '#ece7dc', border: 0.15 });
    var F = B.frame('n');
    var at = function (u, o) { return F.at(u, o); };
    // (the pot in front of the window's frame, on the sill)
    var pp = at(22, 7.2);
    B.at({ geo: 'cyl', p: [pp[0], 152.5, pp[1]], size: [6, 7, 6], c: '#b5643c', taper: 1.2 });
    B.at({ geo: 'cyl', p: [pp[0], 161, pp[1]], size: [9, 10, 9], c: '#4f7a4a', taper: 0.4 });
    // the sink, a tap; on the counter a kettle, a board, a bowl of oranges
    var sp = at(0, 30);
    B.at({ p: [sp[0], 89.9, sp[1]], size: [46, 0.6, 34], c: '#9aa3a6', border: 0.2 });
    B.at({ geo: 'cyl', p: [sp[0], 99, sp[1] - 18], size: [2.4, 18, 2.4], c: '#b9c0c2' });
    B.at({ p: [sp[0], 107, sp[1] - 12], size: [2.2, 2.2, 13], c: '#b9c0c2' });
    var kp = at(-62, 24);
    B.at({ geo: 'cyl', p: [kp[0], 99, kp[1]], size: [15, 18, 15], c: '#c94f3c', taper: 0.8 });
    B.at({ p: [kp[0] + 2, 109, kp[1]], size: [8, 2, 3], c: '#2a2d30' });
    var bp = at(-30, 34);
    B.at({ p: [bp[0], 91.3, bp[1]], size: [32, 2, 22], c: '#b8875a', ry: 8, border: 0.2 }); // (just over the sink's rim)
    var op = at(40, 34);
    B.at({ geo: 'cyl', p: [op[0], 93, op[1]], size: [24, 6, 24], c: '#e9e4d8', taper: 1.35 });
    // three oranges in it, one rolled out onto the counter
    [-90, 30, 150].forEach(function (a) {
      B.at({ geo: 'cyl', p: [op[0] + 4.3 * Math.cos(a * DEG), 98, op[1] + 4.3 * Math.sin(a * DEG)], size: [7, 6.5, 7], c: '#f08a2c', border: 0.2 });
    });
    var or4 = at(52, 54);
    B.at({ geo: 'cyl', p: [or4[0], 93.25, or4[1]], size: [7, 6.5, 7], c: '#f08a2c', border: 0.2 });
    // the fridge on the right, where the counter stops
    var fp = at(83, 32);
    B.at({ p: [fp[0], 92, fp[1]], size: [50, 184, 62], c: '#e2e4e1', border: 0.3 });
    B.at({ p: [fp[0] - 18, 120, fp[1] + 32], size: [2, 34, 2], c: '#b9c0c2' });
    B.at({ p: [fp[0] + 6, 150, fp[1] + 31.2], size: [8, 10, 0.4], c: '#f2a84b', rz: 6 });
    // a chair by the counter, facing the doorway
    var cp = at(-24, 98), cry = 14;
    var cat = function (lx, lz) { var c = Math.cos(cry * DEG), s = Math.sin(cry * DEG); return [cp[0] + lx * c + lz * s, cp[1] - lx * s + lz * c]; };
    B.at({ p: [cp[0], 45, cp[1]], size: [40, 4, 40], c: '#8a5f3c', ry: cry, border: 0.2 });
    [[-16, -16], [16, -16], [-16, 16], [16, 16]].forEach(function (q) {
      var lg = cat(q[0], q[1]), tall = q[1] < 0; // the back legs go on up to hold the back
      B.at({ p: [lg[0], tall ? 44.5 : 22, lg[1]], size: [3, tall ? 89 : 44, 3], c: '#6e4a2e', ry: cry });
    });
    var bk = cat(0, -16);
    B.at({ p: [bk[0], 76, bk[1]], size: [29, 22, 2.5], c: '#8a5f3c', ry: cry, border: 0.2 });
    // the pendant lamp, and the light
    var lp = at(0, 64);
    B.at({ geo: 'cyl', p: [lp[0], 226, lp[1]], size: [0.8, 48, 0.8], c: '#2a2d30', border: 0 });
    var shade = B.at({ geo: 'cyl', p: [lp[0], 195, lp[1]], size: [32, 16, 32], c: '#e8d3a8', taper: 0.45, emit: 0.55, emitDark: 0, border: 0.25 });
    shade.baseEmit = 0.55;
    B.glow([lp[0], 188, lp[1]], 64, '#ffd29a', 0.42, 'always');
    B.light({ p: [lp[0], 182, lp[1] + 8], c: '#ffc887', i: 1.15, r: 230, k: 'always' });
    B.pool(lp[0], 90, lp[1] + 4, 120, 70, '#ffc887', 0.14, 'always');
    // its light out through the doorway, onto the hall floor and the walls by it
    B.pool(0, 0, zh + 46, 104, 92, '#ffbe7a', 0.16, 'always');
    B.light({ p: [0, 110, zh + 24], c: '#ffb46a', i: 0.4, r: 210, k: 'always' });
  }

  // The hallway, 19:25: just in, the bag where it fell
  STORY.hall = {
    room: { w: 220, d: 640, h: 250, wall: { c: '#a39684', skirt: '#4a4038' }, walls: { n: { c: '#cdb992', skirt: '#5f7468' } }, floor: { c: '#7a5638', tex: function () { return PT.planks({ base: '#7a5638', seed: 5 }); }, per: 110 }, ceil: { c: '#8a8072' } },
    look: { amb: '#5d5662', bg: '#0e0d10', ink: '#0d0c10' },
    cam: { x: -10, z: 205, eye: 160, yaw: 4, pitch: -10 },
    build: function (B, R, api) {
      B.at({ geo: 'cyl', p: [0, R.h - 10, 40], size: [36, 18, 36], c: '#e9e4d8', taper: 0.6, emit: 0.6, emitDark: 0.95 });
      B.glow([0, R.h - 22, 40], 80, '#fff1d6', 0.35, 'work');
      B.light({ p: [0, R.h - 30, 40], c: '#f4ecdc', i: 1.2, r: 420, k: 'work' });
      buildKitchenEnd(B, R);
      // coats on hooks, shoes, a runner
      // (the red one hangs over the other two, from a longer hook)
      B.box({ wall: 'w', u: -110, v: 170, o: 0, w: 90, h: 6, d: 6, c: '#5a4636' });
      // (they hang just under the rail, from hooks in their collars)
      B.box({ wall: 'w', u: -108, v: 164.5, o: 6, w: 2.4, h: 2.4, d: 12, c: '#3a2e24', border: 0.1 });
      [['#2b3340', -130, 4, 3], ['#8a3b34', -108, -3, 13.5], ['#3e5b7a', -88, 2, 3]].forEach(function (k) {
        B.box({ wall: 'w', u: k[1], v: 88.5, o: k[3], w: 30, h: 80, d: 10, c: k[0], rz: k[2] });
      });
      [[-150, '#2a2d30'], [-132, '#c9c3b8'], [-165, '#6b7a8f']].forEach(function (k, i) {
        B.box({ wall: 'w', u: k[0], v: 0, o: 6 + (i % 2) * 4, w: 12, h: 9, d: 28, c: k[1], ry: (i - 1) * 8 });
      });
      var rug = B.T('runner', function () { return PT.rug(200, 480); });
      B.flat({ wall: 'n', u: 0, v: 0, o: 190, w: 90, d: 280, c: '#7b4a43', map: rug, border: 0.3, lift: 0.3 });
      // the work bag, dropped
      B.shadow(10, 60, 70, 50, 0.5);
      B.at({ p: [10, 22, 60], size: [46, 40, 28], ry: 24, rz: 6, c: '#34463a' });
      // its handles, flopped flat on top of it (laid on its tilted top, not stuck into it)
      var bagR = M.mul3(M.rotY(24 * DEG), M.rotZ(6 * DEG));
      [[2, 4.5, 8], [-1, -4.5, -6]].forEach(function (q) {
        var hp = M.apply3(bagR, [q[0], 20.6, q[1]]);
        B.add({ geo: 'box', pos: [10 + hp[0], 22 + hp[1], 60 + hp[2]], R: M.mul3(bagR, M.rotY(q[2] * DEG)), s: [26, 1.2, 3], color: '#26322a', border: 0.2 });
      });
      // console table: keys in a bowl, the phone face up and lit
      B.box({ wall: 'e', u: 30, v: 78, o: 0, w: 90, h: 4, d: 32, c: '#9a7652' });
      [[-12], [72]].forEach(function (q) { B.box({ wall: 'e', u: q[0], v: 0, o: 2, w: 4, h: 78, d: 28, c: '#7c5e41' }); });
      B.cyl({ wall: 'e', u: 50, v: 82, o: 8, r: 9, h: 4, c: '#c9b48a', taper: 1.3 });
      B.box({ wall: 'e', u: 50, v: 86, o: 14, w: 6, h: 1, d: 4, c: '#c9a227', ry: 30 });
      var ps = B.T('phonenote', function () { return PT.phoneScreen(180, 360, { note: prop(api, 'phoneNote', ['Manager', 'You home? Quick one']) }); });
      var ep = B.frame('e').at(20, 18);
      B.add({ geo: 'box', pos: [ep[0], 82.6, ep[1]], R: M.mul3(M.rotY(-80 * DEG), M.rotX(-90 * DEG)), s: [8, 16, 1], color: '#101a2c', map: ps, mapFace: 4, emit: 0.95, emitDark: 0 });
      // its light: a small soft glow just over the screen (kept clear of the wall), a little on the table
      B.glow([ep[0] - 3, 84.5, ep[1]], 15, '#a9c6ff', 0.2, 'always');
      B.light({ p: [ep[0] - 16, 94, ep[1]], c: '#9cc0ff', i: 0.18, r: 64, k: 'always' });
      var mr = B.T('mirror', function () { return PT.mirror(200, 300); });
      B.box({ wall: 'e', u: 30, v: 110, o: 0, w: 56, h: 80, d: 3, c: '#8f8270', map: mr, mapFace: 4 });
      // the wall calendar: this week's evenings (film.js zooms into it)
      var ci = prop(api, 'calendar', null) || {};
      var calTex = B.T('calendar', function () { return PT.calendar({ w: 440, h: 620, title: ci.title, sub: ci.sub, days: ci.days || ['', '', '', '', '', ''], times: ci.times, places: ci.places }); });
      B.box({ wall: 'e', u: -100, v: 108, o: 0, w: 44, h: 62, d: 1.6, c: '#f1e8d0', map: calTex, mapFace: 4, border: 0.25, name: 'calendar' });
      B.box({ wall: 'e', u: -100, v: 172, o: 0, w: 1.2, h: 3, d: 2, c: '#8f9396' });
      // the front door behind you, the light switch by it
      B.box({ wall: 's', u: 0, v: 0, o: 0, w: 96, h: 214, d: 4, c: '#5a4636' });
    },
  };

  // The night bus, 18:40: the back row
  STORY.bus = {
    room: { w: 250, d: 900, h: 230, wall: { c: '#cfd3cf', skirt: '#2a2d30' }, floor: { c: '#3a3d40', tex: function () { return PT.stripes({ base: '#3a3d40', a: '#303336', n: 32 }); }, per: 60 }, ceil: { c: '#d9dcd8' } },
    look: { amb: '#4a5058', bg: '#0b0c10', ink: '#0b0c10' },
    cam: { x: 55, z: 360, eye: 118, yaw: -22, pitch: -2 },
    build: function (B, R, api) {
      var st = B.T('street', function () { return PT.street(640, 300, 41); });
      var st2 = B.T('street2', function () { return PT.street(640, 300, 77); });
      // windows down both sides, the street going past (all of them short of the ends of the bus)
      [-360, -180, 0, 180, 360].forEach(function (u, i) {
        ['w', 'e'].forEach(function (wl) {
          B.card({ wall: wl, u: u, v: 100, o: 0.6, w: 160, h: 90, c: '#1a1622', map: (i + (wl === 'w' ? 0 : 1)) % 2 ? st : st2, emit: 0.9, emitDark: 0, border: 0.6, hatch: 0 });
        });
      });
      B.light({ p: [-110, 140, 0], c: '#ffb46a', i: 0.55, r: 500, k: 'always' });
      B.light({ p: [110, 140, 200], c: '#ffb46a', i: 0.45, r: 500, k: 'always' });
      // strip lights in the roof
      [-300, -60, 180, 380].forEach(function (z) {
        B.at({ p: [-70, R.h - 3, z], size: [14, 3, 120], c: '#f4fbff', emit: 1, emitDark: 0.95 });
        B.at({ p: [70, R.h - 3, z], size: [14, 3, 120], c: '#f4fbff', emit: 1, emitDark: 0.95 });
      });
      B.light({ p: [0, R.h - 20, 0], c: '#e9f4ff', i: 0.8, r: 700, k: 'work' });
      B.light({ p: [0, R.h - 20, 330], c: '#e9f4ff', i: 0.7, r: 500, k: 'work' });
      // seats in pairs, a yellow pole at every other row
      var fab = B.T('seatfab', function () { return PT.stripes({ base: '#2f4a7a', a: '#c0392b', b: '#2f4a7a', n: 16 }); }, true);
      for (var z = -380; z <= 300; z += 85) {
        // (clear of the walls; the cushion sits on its base, the back just above the cushion)
        [-77, 77].forEach(function (x) {
          B.at({ p: [x, 46, z], size: [92, 10, 44], c: '#2f4a7a', map: fab, mapFace: -1, rep: [2, 1] });
          B.at({ p: [x, 82.5, z + 20], size: [92, 62, 8], c: '#2f4a7a', map: fab, mapFace: -1, rep: [2, 1], rx: -8 });
          B.at({ p: [x, 20.5, z], size: [70, 41, 30], c: '#26292c' });
        });
        if (Math.round((z + 380) / 85) % 2 === 0) {
          B.at({ geo: 'cyl', p: [-32, R.h / 2, z - 26], size: [3.5, R.h, 3.5], c: '#e1b229' });
          B.at({ p: [-32, 140, z - 26], size: [6, 7, 5], c: '#c0392b' });
        }
      }
      B.at({ geo: 'cyl', p: [0, R.h - 26, 0], size: [3, 900, 3], rx: 90, c: '#e1b229' });
    },
  };

  /* The RESET concept jar, direction C ("Off switch"; packaging isn't final, the label says so):
     a square warm-white jar with rounded corners, an amber screw cap, and on the front a raised
     switch plate with the rocker pressed to OFF and a small amber light. Stands on (x, y, z),
     front towards +z. o: { front: { kind, tag, count, concept, on, off }, back: { line1, line2,
     title, rows, free, url, concept }, name }. Returns { body, cap, all, back, led, sun (the logo's
     sun on the front, local to the jar's foot), capY (the cap's centre above the foot), H }. */
  var CJ = { W: 9.6, D: 9.6, H: 10.4, r: 1.2, neck: 0.7, capH: 2.6, capD: 9.0 };
  function cJar(B, p, o) {
    o = o || {};
    var W = CJ.W, D = CJ.D, H = CJ.H, r = CJ.r, x = p[0], y = p[1], z = p[2];
    var cream = '#efe8da', nm = o.name;
    var mk = function (s) { if (nm) s.name = nm; return B.add(s); };
    var body = [], cap = [];
    // the body: one rounded skin (so the corners carry no seams), a satin glint where the light catches
    var skin = B.r.geo('cjar-body', function () { return Ink.roundBox(W, H, D, r, 12); });
    body.push(mk({ geo: skin, pos: [x, y, z], color: cream, border: 0.12, spec: 0.2, specW: 0.93 }));
    // the shoulder and the neck the cap screws onto
    body.push(mk({ geo: 'cylHi', pos: [x, y + H + CJ.neck / 2, z], s: [7.6, CJ.neck, 7.6], color: '#e4dccb', border: 0.08 }));
    // the print on the front and the back
    var front = B.T('cjar-front', function () { return PT.cJarFront(o.front); });
    body.push(mk({ geo: 'card', pos: [x, y + H / 2, z + D / 2 + 0.02], s: [W - 2 * r, H, 1], color: cream, map: front, border: 0, hatch: 0.2, decal: 2 }));
    var backTex = B.T('cjar-back', function () { return PT.cJarBack(o.back); });
    var back = mk({ geo: 'card', pos: [x, y + H / 2, z - D / 2 - 0.02], R: M.rotY(180 * DEG), s: [W - 2 * r, H, 1], color: cream, map: backTex, border: 0, hatch: 0.2, decal: 2 });
    body.push(back);
    // the switch plate (raised), the rocker pressed to OFF, the little amber light
    var plate = B.T('cjar-plate', function () { return PT.cJarPlate(o.front); });
    var px = x - 2.05, py = y + 4.9, pz = z + D / 2;
    body.push(mk({ geo: 'box', pos: [px, py, pz + 0.18], s: [2.5, 3.9, 0.36], color: '#e7e0d1', map: plate, mapFace: 4, border: 0.06 }));
    body.push(mk({ geo: 'box', pos: [px, py - 0.12, pz + 0.48], R: M.rotX(16 * DEG), s: [1.12, 1.6, 0.42], color: '#f4efe4', border: 0.1, spec: 0.3, specW: 0.97 }));
    var led = mk({ geo: 'card', pos: [px, py + 1.42, pz + 0.37], s: [0.3, 0.3, 1], color: '#f2a84b', shape: 1, emit: 1, emitDark: 0, border: 0, hatch: 0, decal: 2 });
    body.push(led);
    // the cap: amber, ribbed round the side
    var ribs = B.T('cjar-ribs', function () { return PT.ribs({ base: '#c9742f', dark: '#9c5524', light: '#dc8a45', n: 128 }); }, true);
    var capY = H + CJ.neck + CJ.capH / 2;
    cap.push(mk({ geo: 'cylHi', pos: [x, y + capY, z], s: [CJ.capD, CJ.capH, CJ.capD], color: '#c9742f', map: ribs, mapFace: 6, border: 0.14, spec: 0.2, specW: 0.94 }));
    cap.push(mk({ geo: 'cylHi', pos: [x, y + capY + CJ.capH / 2 + 0.05, z], s: [CJ.capD - 0.5, 0.1, CJ.capD - 0.5], color: '#d3803b', border: 0.06, spec: 0.2, specW: 0.985 }));
    return { body: body, cap: cap, all: body.concat(cap), back: back, led: led, sun: [-(W / 2 - r) + 0.74, H - 1.32, D / 2 + 0.03], capY: capY, H: H };
  }
  function jar(B, x, y, z, api, ry) {
    var j = cJar(B, [x, y, z], { name: 'jar', front: { concept: prop(api, 'jar2', 'CONCEPT · NOT FOR SALE') } });
    var R0 = M.rotY((ry || 0) * DEG);
    j.all.forEach(function (o) { o.x = { c: [x, y, z], R: R0 }; });
  }

  // Extra things in the bedroom, for the story's close-ups (the ritual, the jar)
  function bedroomExtras(B, api) {
    // a notepad and pen on the desk
    var np = B.T('notepad', function () { return PT.sheet(200, 280, { title: prop(api, 'notesTitle', 'TOMORROW'), lines: prop(api, 'notes', ['1. Call supplier', '2. Finish rota', '3. Reply to Dana', '-', 'Done for today.']), fs: 0.062, lh: 0.1, mono: false, col: '#2c3e70' }); });
    var dp = B.frame('e').at(-120, 36);
    B.add({ geo: 'box', pos: [dp[0], 74.6, dp[1]], R: M.mul3(M.rotY(-74 * DEG), M.rotX(-90 * DEG)), s: [20, 27, 1], color: '#f6f3ea', map: np, mapFace: 4, border: 0.2 });
    B.add({ geo: 'cyl', pos: [dp[0] - 8, 75, dp[1] - 4], R: M.mul3(M.rotY(30 * DEG), M.rotZ(90 * DEG)), s: [1, 15, 1], color: '#2f5ba8' });
    // a glass of water and the phone, face down, on the bedside table
    // (the bedside table top runs x -135…-89, z 148…188: lamp at the back left, clock at the back right)
    B.add({ geo: 'cyl', pos: [-127, 52 + 6, 156], s: [6.4, 12, 6.4], color: '#cfe6f2', alpha: 0.7, blend: 'alpha', border: 0.15, hatch: 0 });
    B.add({ geo: 'cyl', pos: [-127, 52 + 4.5, 156], s: [6, 8.6, 6], color: '#9fc8e8', alpha: 0.5, blend: 'alpha', border: 0, hatch: 0 });
    B.add({ geo: 'box', pos: [-112, 52.6, 156], R: M.rotY(72 * DEG), s: [8, 1, 16], color: '#1b1d22', border: 0.18, name: 'phonedown' });
    jar(B, -96, 52, 154, api, 142);
    // a desk lamp, on in the evening: a stem up from its base, an arm out over the desk, and the
    // shade hanging from the arm's end, its opening down towards the desk (narrow end up: a cylinder's
    // taper narrows its top). Each part starts where the last one ends.
    B.cyl({ wall: 'e', u: -132, v: 74, o: 10, r: 6, h: 2, c: '#24262a' });
    var lf = B.frame('e');
    var lp = function (o, y) { var q = lf.at(-132, o); return [q[0], y, q[1]]; };
    var toWall = (function () { var a = lf.at(0, 0), b = lf.at(0, 1); return [a[0] - b[0], 0, a[1] - b[1]]; })();
    var rod = function (a, b, r) {
      var d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      return B.add({ geo: 'cyl', pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], R: upTo(d), s: [r * 2, Math.hypot(d[0], d[1], d[2]), r * 2], color: '#24262a', border: 0.3 });
    };
    var base = lp(16, 76), elbow = lp(18, 110), tip = lp(30, 113);
    rod(base, elbow, 0.9);
    rod(elbow, tip, 0.8);
    // (the shade's axis leans 20 degrees back towards the wall, so its opening faces the desk)
    var sa = [toWall[0] * Math.sin(20 * DEG), Math.cos(20 * DEG), toWall[2] * Math.sin(20 * DEG)];
    var dl = B.add({ geo: 'cyl', pos: [tip[0] - sa[0] * 4.5, tip[1] - sa[1] * 4.5, tip[2] - sa[2] * 4.5], R: upTo(sa), s: [14, 9, 14], color: '#d9583a', taper: 0.5, border: 0.3 });
    dl.warmEmit = 0.6;
    var dlp = B.frame('e').at(-128, 30);
    B.light({ p: [dlp[0], 96, dlp[1]], c: '#ffb46a', i: 1.1, r: 230, k: 'warm' });
    B.pool(dlp[0], 74, dlp[1], 60, 50, '#ffb46a', 0.25, 'warm');
    // the laptop, closed (for the evening shots)
    var lc = B.frame('e').at(-84, 30);
    B.add({ geo: 'box', pos: [lc[0], 76.4, lc[1]], R: M.rotY(-90 * DEG), s: [34, 1.2, 24], color: '#a6adb4', border: 0.25, name: 'lidClosed', hidden: true });
    // a book open on the bed
    B.add({ geo: 'box', pos: [-38, 64.1, 112], R: M.rotY(-20 * DEG), s: [30, 2, 22], color: '#f2ead6', border: 0.2, name: 'book' });
    B.add({ geo: 'box', pos: [-38, 62.6, 112], R: M.rotY(-20 * DEG), s: [31, 1, 23], color: '#b0473a', border: 0.2 });
  }

  STORY.bedroom = Object.assign({}, SCENES.bed, {
    build: function (B, R, api) {
      SCENES.bed.build(B, R, api);
      bedroomExtras(B, api);
    },
  });
  STORY.kitchen = SCENES.kitchen;
  STORY.depot = SCENES.depot;
  STORY.sofa = STILLS.clients;
  STORY.home = STILLS.office;

  ES.inkStory = STORY;

  /* Warm light motes for "lower the lights": with the big light off, small slow specks of the
     lamp's light rise out of its shade (more from the top than the bottom), drift out on gentle
     arcs and settle through the whole room, floating there for the rest of the evening. One warm
     colour. update(come 0–1: how far the light has spread, out 0–1: lights out, time, dt). */
  function Motes(B, o) {
    var src = o.from, box = o.box, n = o.n || 110;
    var s0 = (o.seed || 91) >>> 0;
    var rr = function () { s0 = (s0 * 1664525 + 1013904223) >>> 0; return s0 / 4294967296; };
    var cols = ['#ffe6bf', '#fff0d6', '#ffd49a'];
    this.list = [];
    for (var i = 0; i < n; i++) {
      var top = rr() < 0.64, a = rr() * Math.PI * 2, r0 = top ? 5.5 : 9.5;
      var start = [src[0] + Math.cos(a) * r0, src[1] + (top ? 9 : -8), src[2] + Math.sin(a) * r0];
      var near = rr() < 0.4;
      var tgt = near
        ? [src[0] + 16 + rr() * 110, src[1] - 12 + rr() * 96, src[2] - 8 - rr() * 120]
        : [box[0] + rr() * (box[3] - box[0]), box[1] + rr() * (box[4] - box[1]), box[2] + rr() * (box[5] - box[2])];
      var sz = 2.2 + rr() * 2.6;
      var g = B.glow(start.slice(), sz, cols[i % 3], 0, 'orb');
      g.hidden = true;
      var h = i % 3 === 0 ? B.glow(start.slice(), 11 + rr() * 8, '#ffae55', 0, 'orb') : null;
      if (h) h.hidden = true;
      this.list.push({
        s: start, t: tgt, d: rr(), br: 0.6 + rr() * 0.4, m: rr() * Math.PI * 2, g: g, h: h, push: [0, 0, 0], pt: [0, 0, 0], pos: start.slice(),
        f: [0.12 + rr() * 0.22, 0.1 + rr() * 0.2, 0.12 + rr() * 0.22, 0.6 + rr() * 0.9], ph: [rr() * 6.3, rr() * 6.3, rr() * 6.3, rr() * 6.3],
      });
    }
  }
  Motes.prototype.update = function (come, out, time, dt) {
    // a touch sets where a mote is pushed to (pt); it glides there and drifts slowly back
    var st = Math.min(0.1, dt || 0.016);
    var back = Math.exp(-st / 1.6), follow = 1 - Math.exp(-st / 0.5);
    this.list.forEach(function (m) {
      var q = m.pt || [0, 0, 0];
      var ql = Math.hypot(q[0], q[1], q[2]);
      var cap = ql > 12 ? 12 / ql : 1;
      m.pt = [q[0] * cap * back, q[1] * cap * back, q[2] * cap * back];
      m.push = [m.push[0] + (m.pt[0] - m.push[0]) * follow, m.push[1] + (m.pt[1] - m.push[1]) * follow, m.push[2] + (m.pt[2] - m.push[2]) * follow];
      // births spread over the first half of the spreading; each takes the other half to arrive
      var raw = (come - m.d * 0.5) / 0.5;
      var e = ease.out(clamp(raw, 0, 1)), born = clamp(raw * 7, 0, 1);
      var arc = Math.sin(Math.PI * e), w = 0.25 + 0.75 * e;
      var p = [
        m.s[0] + (m.t[0] - m.s[0]) * e + Math.cos(m.m) * arc * 14 + Math.sin(time * m.f[0] + m.ph[0]) * 5 * w + m.push[0],
        m.s[1] + (m.t[1] - m.s[1]) * e + arc * 16 + Math.sin(time * m.f[1] + m.ph[1]) * 3.5 * w + m.push[1],
        m.s[2] + (m.t[2] - m.s[2]) * e + Math.sin(m.m) * arc * 14 + Math.cos(time * m.f[2] + m.ph[2]) * 5 * w + m.push[2],
      ];
      m.pos = p;
      var v = born * m.br * (0.8 + 0.2 * Math.sin(time * m.f[3] + m.ph[3])) * (1 - clamp(out, 0, 1));
      m.v = v;
      m.g.pos = p; m.g.base = v; m.g.hidden = v < 0.003;
      if (m.h) { m.h.pos = p; m.h.base = 0.22 * v; m.h.hidden = v < 0.003; }
    });
  };

  ES.inkScenes = { Room: Room, shell: shell, tube: tube, makeSwitch: makeSwitch, SCENES: SCENES, STILLS: STILLS, prop: prop, Motes: Motes, cJar: cJar, CJ: CJ };
})();
