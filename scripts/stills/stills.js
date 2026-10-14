/* Stills of the RESET jar, drawn with the site's own ink renderer.
   ?shot=studio|night &w &h &ss (supersampling) — optional overrides: &at=x,y,z &to=x,y,z &fov=deg */
(function () {
  'use strict';
  var ES = window.ES, Ink = ES.Ink, SC = ES.inkScenes, PT = ES.inkPaint, M = Ink.M, DEG = Math.PI / 180;
  var q = new URLSearchParams(location.search);
  var shot = q.get('shot') || 'studio';
  var W = +q.get('w') || 1136, H = +q.get('h') || 1408, SS = +q.get('ss') || 2;
  var cv = document.getElementById('c');
  var vec = function (s, d) { return s ? s.split(',').map(Number) : d; };
  function done(err) { window.__err = err || ''; window.__done = true; }
  function lookAt(at, to) {
    var dx = to[0] - at[0], dy = to[1] - at[1], dz = to[2] - at[2];
    return { yaw: Math.atan2(dx, -dz) / DEG, pitch: Math.atan2(dy, Math.hypot(dx, dz)) / DEG };
  }
  function cam(at, to, vfov, roll) {
    var la = lookAt(at, to);
    return { pos: at, yaw: la.yaw, pitch: la.pitch, roll: roll || 0, fovy: vfov * DEG };
  }
  function snap() { window.__png = cv.toDataURL('image/png'); }

  /* ---------------------------------------------------------------- studio
     The jar and its box on a warm paper sweep, three-quarter view, soft key light from the left. */
  // the sweep: a flat floor, a curve (radius RC from z = ZC back), a wall; one skin, no seams
  var ZC = -24, RC = 46;
  function floorY() { return 0; }
  function sweepGeo() {
    var g = { v: [], i: [] }, prof = [], k, X = 400;
    prof.push([140, 0, 0, 1, 0]);
    for (k = 0; k <= 24; k++) {
      var t = (k / 24) * Math.PI / 2;
      prof.push([ZC - RC * Math.sin(t), RC - RC * Math.cos(t), 0, Math.cos(t), Math.sin(t)]);
    }
    prof.push([ZC - RC, 320, 0, 0, 1]);
    prof.forEach(function (p) {
      g.v.push(-X, p[1], p[0], 0, p[3], p[4], 100, 1, 9);
      g.v.push(X, p[1], p[0], 0, p[3], p[4], 100, 1, 9);
    });
    for (k = 0; k < prof.length - 1; k++) {
      var l0 = k * 2, r0 = l0 + 1, l1 = l0 + 2, r1 = l0 + 3;
      g.i.push(l0, r0, r1, l0, r1, l1);
    }
    return g;
  }
  function boxSide(o) {
    var c = PT.cv(640, 1040), x = c.getContext('2d');
    x.fillStyle = '#efe9de';
    x.fillRect(0, 0, 640, 1040);
    x.save();
    x.translate(320, 520);
    x.rotate(-Math.PI / 2);
    x.fillStyle = '#1b1c1e';
    x.textBaseline = 'middle';
    x.textAlign = 'center';
    x.font = '800 92px "Sofia Sans Extra Condensed"';
    x.fillText('ENDSHIFT  RESET', 0, -150);
    x.font = '700 34px "Sofia Sans Extra Condensed"';
    if ('letterSpacing' in x) x.letterSpacing = '4px';
    x.fillStyle = '#4a4740';
    x.fillText(o.kind || 'EVENING CAPSULE', 0, -60);
    x.restore();
    x.fillStyle = 'rgba(27,28,30,.45)';
    x.fillRect(470, 120, 3, 800);
    x.save();
    x.translate(540, 520);
    x.rotate(-Math.PI / 2);
    x.fillStyle = '#8a8478';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.font = '700 30px "Sofia Sans Extra Condensed"';
    if ('letterSpacing' in x) x.letterSpacing = '3px';
    x.fillText(o.concept || 'CONCEPT · NOT FOR SALE', 0, 0);
    x.restore();
    return c;
  }
  function boxTop() {
    var c = PT.cv(640, 640), x = c.getContext('2d');
    x.fillStyle = '#ece5d8';
    x.fillRect(0, 0, 640, 640);
    // the tuck flap's crease
    x.fillStyle = 'rgba(27,28,30,.16)';
    x.fillRect(0, 548, 640, 3);
    // the amber tape across it, WORK: OFF. printed along
    var tp = PT.cJarTape({});
    x.drawImage(tp, 0, 0, 512, 64, 0, 262, 640, 116);
    return c;
  }
  function studio() {
    var r = Ink.renderer(cv);
    if (!r) return done('no webgl');
    r.resize(W, H, SS);
    var B = new SC.Room({ w: 600, d: 600, h: 400 }, r);
    var paper = q.get('paper') || '#eadcc6';
    B.add({ geo: r.geo('sweep', sweepGeo), pos: [0, 0, 0], color: paper, border: 0, hatch: 0.5 });

    // the box, behind and to the left, turned a little toward you
    var bx = +(q.get('bx') || -8.6), bz = +(q.get('bz') || -10.5), bry = +(q.get('bry') || 24), BW = 10.6, BH = 17.2, BD = 10.6;
    var by = floorY(bz);
    var Rb = M.rotY(bry * DEG);
    var front = B.T('cjar-box', function () { return PT.cJarBox({}); });
    var side = B.T('cjar-box-side', function () { return boxSide({}); });
    var top = B.T('cjar-box-top', function () { return boxTop(); });
    B.add({ geo: 'box', pos: [bx, by + BH / 2, bz], R: Rb, s: [BW, BH, BD], color: '#efe9de', border: 0.11, hatch: 0.8 });
    var at = function (lx, ly, lz) { var p = M.apply3(Rb, [lx, ly, lz]); return [bx + p[0], by + p[1], bz + p[2]]; };
    B.add({ geo: 'card', pos: at(0, BH / 2, BD / 2 + 0.01), R: Rb, s: [BW, BH, 1], color: '#f1ece2', map: front, border: 0, hatch: 0.8, decal: 2 });
    B.add({ geo: 'card', pos: at(BW / 2 + 0.01, BH / 2, 0), R: M.mul3(Rb, M.rotY(90 * DEG)), s: [BD, BH, 1], color: '#efe9de', map: side, border: 0, hatch: 0.8, decal: 2 });
    B.add({ geo: 'card', pos: at(0, BH + 0.01, 0), R: M.mul3(Rb, M.rotX(-90 * DEG)), s: [BW, BD, 1], color: '#ece5d8', map: top, border: 0, hatch: 0.8, decal: 2 });
    // the tape running down the side
    var tape = B.T('cjar-tape', function () { return PT.cJarTape({}); });
    B.add({ geo: 'card', pos: at(BW / 2 + 0.02, BH - 1.6, 0), R: M.mul3(M.mul3(Rb, M.rotY(90 * DEG)), M.rotZ(90 * DEG)), s: [3.2, 1.9, 1], color: '#f2a84b', map: tape, rep: [3.2 / 10.6, 1], border: 0, hatch: 0.8, decal: 3 });

    // the jar, in front, turned so its front catches the light and you see one side
    var jx = +(q.get('jx') || 3.2), jz = +(q.get('jz') || 2.5), jry = +(q.get('jry') || 14);
    var jy = floorY(jz);
    var J = SC.cJar(B, [jx, jy, jz], { front: {}, back: {} });
    var Rj = M.rotY(jry * DEG);
    J.all.forEach(function (o) { o.x = { c: [jx, jy, jz], R: Rj }; });

    // two capsules, lying in front
    function capsule(p, ry, rz) {
      var R = M.mul3(M.rotY(ry * DEG), M.rotZ(90 * DEG));
      var half = function (sgn, col) {
        var c = M.apply3(R, [0, sgn * 0.62, 0]);
        B.add({ geo: 'cylHi', pos: [p[0] + c[0], p[1] + 0.42 + c[1], p[2] + c[2]], R: R, s: [0.84, 1.24, 0.84], color: col, border: 0.07, spec: 0.35, specW: 0.975 });
        var e = M.apply3(R, [0, sgn * 1.36, 0]);
        B.add({ geo: 'cylHi', pos: [p[0] + e[0], p[1] + 0.42 + e[1], p[2] + e[2]], R: sgn > 0 ? R : M.mul3(R, M.rotX(Math.PI)), s: [0.84, 0.24, 0.84], taper: 0.55, color: col, border: 0.06, spec: 0.35, specW: 0.975 });
      };
      half(1, '#f2a84b');
      half(-1, '#efe6d2');
      B.shadow(p[0], p[2], 3.6, 1.6, 0.32, p[1]);
    }
    if (q.get('caps')) { capsule([10.4, 0, 10], 32); capsule([13.6, 0, 8.2], -24); }

    // shadows: soft under each, and cast away from the key light (a painted shape, darker at the foot)
    var castTex = B.T('cast', function () {
      var c = PT.cv(512, 256), x = c.getContext('2d');
      if ('filter' in x) x.filter = 'blur(14px)';
      var g = x.createLinearGradient(40, 0, 470, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.45, 'rgba(255,255,255,0.45)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(40, 70); x.lineTo(470, 30); x.lineTo(470, 226); x.lineTo(40, 186);
      x.closePath();
      x.fill();
      return c;
    });
    var KEY = vec(q.get('keyp'), [-70, 64, 70]);
    function cast(cx, cz, foot, len, wid, a) {
      var dx = cx - KEY[0], dz = cz - KEY[2], dl = Math.hypot(dx, dz);
      dx /= dl; dz /= dl;
      var ang = Math.atan2(-dz, dx);
      var c = [cx + dx * (foot + len / 2 - 2), 0.12, cz + dz * (foot + len / 2 - 2)];
      B.add({ geo: 'card', pos: c, R: M.mul3(M.rotY(ang), M.rotX(-90 * DEG)), s: [len, wid, 1], color: '#1a1612', map: castTex, mapAlpha: true, blend: 'alpha', alpha: a, border: 0, hatch: 0, unlit: true, decal: 1 });
    }
    B.shadow(jx, jz, 12.4, 12.4, 0.55, jy);
    cast(jx, jz, 3, +(q.get('castl') || 20), 13, +(q.get('cast') || 0.3));
    B.shadow(bx, bz, 13.5, 13.5, 0.5, by);
    cast(bx, bz, 3, +(q.get('castl') || 20) * 1.3, 14, +(q.get('cast') || 0.3));
    // the little amber light on the switch plate, glowing
    var ledW = M.apply3(Rj, [-2.05, 4.9 + 1.42, 9.6 / 2 + 0.4]);
    B.glow([jx + ledW[0], jy + ledW[1], jz + ledW[2]], 0.9, '#ffb45a', +(q.get('led') || 0.35));
    // evening sun through a window: warm panes of light on the paper behind
    if (q.get('win')) {
      var winTex = B.T('win', function () {
        var c = PT.cv(1024, 512), x = c.getContext('2d');
        if ('filter' in x) x.filter = 'blur(10px)';
        x.fillStyle = '#fff';
        var sk = 110;
        [[120, 40, 260, 200], [400, 40, 260, 200], [120, 268, 260, 200], [400, 268, 260, 200]].forEach(function (r) {
          x.beginPath();
          x.moveTo(r[0] + sk * (r[1] / 512), r[1]);
          x.lineTo(r[0] + r[2] + sk * (r[1] / 512), r[1]);
          x.lineTo(r[0] + r[2] + sk * ((r[1] + r[3]) / 512), r[1] + r[3]);
          x.lineTo(r[0] + sk * ((r[1] + r[3]) / 512), r[1] + r[3]);
          x.closePath();
          x.fill();
        });
        return c;
      });
      var wp = vec(q.get('winp'), [14, 74, -69.6]), ws = vec(q.get('wins'), [96, 48]);
      B.add({ geo: 'card', pos: wp, s: [ws[0], ws[1], 1], color: q.get('winc') || '#ffc27a', map: winTex, mapAlpha: true, blend: 'add', alpha: +(q.get('win')), border: 0, hatch: 0, unlit: true });
    }
    var lights = [
      { p: KEY, c: q.get('keyc') || '#fff6ea', i: +(q.get('key') || 1.3), r: +(q.get('keyr') || 400), k: 'always' }, // key, front left
      { p: [80, 30, 80], c: q.get('fillc') || '#e6ecf5', i: +(q.get('fill') || 0.45), r: 300, k: 'always' }, // fill, front right
      { p: [4, 30, -44], c: '#ffe9cc', i: +(q.get('halo') || 0.9), r: 70, k: 'always' }, // a pool of light on the paper behind
      { p: [-10, 120, 10], c: '#ffffff', i: +(q.get('top') || 0.2), r: 260, k: 'always' }, // top
      { p: vec(q.get('rimp'), [60, 40, -40]), c: q.get('rimc') || '#ffd9a8', i: +(q.get('rim') || 0), r: 160, k: 'always' }, // rim, behind right
    ];
    B.objs.forEach(function (o) { if (o.base != null && o.glow == null) o.glow = o.base; });
    var at0 = vec(q.get('at'), [27, 17.5, 47]), to0 = vec(q.get('to'), [-1.6, 7.6, -1.5]);
    var C = cam(at0, to0, +q.get('fov') || 22.5);
    r.render(B.objs, { cam: C, amb: q.get('amb') || '#5a5550', ink: '#1a1612', dark: 0, warm: 1, bg: [0.88, 0.8, 0.68, 1], hatch: 0.9, grain: 0.03, cull: false, lights: lights });
    snap();
    done();
  }

  /* ---------------------------------------------------------------- night
     The bedside table at night, built for the frame: the jar by the lamp, a glass of water, the
     clock at 22:41, the phone face down; the bed and its pillows behind, the walls in the dark. */
  function night() {
    var r = Ink.renderer(cv);
    if (!r) return done('no webgl');
    r.resize(W, H, SS);
    var B = new SC.Room({ w: 600, d: 600, h: 300 }, r);
    var TOP = 52.5;
    var add = function (o) { return B.add(o); };
    // the room: wall behind, the floor
    add({ geo: 'card', pos: [0, 150, -34], s: [600, 300, 1], color: q.get('wallc') || '#5f6a86', border: 0, hatch: +(q.get('wh') || 1) });
    add({ geo: 'card', pos: [0, 0, 100], R: M.rotX(-90 * DEG), s: [600, 300, 1], color: '#4a3324', border: 0 });
    add({ geo: 'box', pos: [0, 6, -32.5], s: [600, 12, 1.6], color: '#2f3542', border: 0.25 });

    // the bedside table
    var wood = B.T('nwood', function () { return PT.planks({ base: '#5c4839', seed: 4 }); }, true);
    add({ geo: 'box', pos: [0, TOP - 1.25, -9], s: [58, 2.5, 44], color: '#5c4839', map: wood, mapFace: 2, rep: [0.6, 0.6], border: 0.22 });
    add({ geo: 'box', pos: [0, 25.5, -10], s: [54, 51, 40], color: '#4a3b31', border: 0.24 });
    add({ geo: 'box', pos: [0, 38.5, 10.6], s: [50, 18, 1.4], color: '#54443a', border: 0.2 });
    add({ geo: 'box', pos: [0, 39, 11.6], s: [11, 1.5, 1.2], color: '#c9b48a', border: 0.12 });
    add({ geo: 'box', pos: [0, 16, 10.6], s: [50, 22, 1.4], color: '#54443a', border: 0.2 });

    // the bed, to the left: headboard, base, mattress, duvet, two pillows
    var duv = B.T('nduvet', function () { return PT.stripes({ base: '#46557a', a: '#3c4a6c', n: 8, shade: true }); }, true);
    add({ geo: 'box', pos: [-86, 56, -30.5], s: [112, 112, 5], color: '#2f2a2a', border: 0.25 });
    if (q.get('pillows')) {
      var pil = r.geo('npillow', function () { return Ink.roundBox(58, 15, 32, 7, 8); });
      add({ geo: pil, pos: [-84, 52, -16], R: M.mul3(M.rotY(-3 * DEG), M.rotX(-10 * DEG)), color: '#c9c1b3', border: 0.3, hatch: 0.8 });
      add({ geo: pil, pos: [-122, 52, -14], R: M.mul3(M.rotY(4 * DEG), M.rotX(-8 * DEG)), color: '#d8d2c6', border: 0.3, hatch: 0.8 });
    }

    // fairy lights on the wall over the bed
    for (var i = 0; i < 8; i++) {
      var fx = -140 + i * 16, fy = 104 - Math.sin((i / 7) * Math.PI) * 9;
      add({ geo: 'card', pos: [fx, fy, -33.2], s: [2.2, 2.2, 1], color: '#ffd08a', shape: 1, emit: 1, emitDark: 0, border: 0.12, hatch: 0 });
      var fg = B.glow([fx, fy, -32.4], 15, '#ffbe6e', 0.7);
      fg.glow = 0.7;
    }

    // the lamp, on at the back right
    var LX = +(q.get('lx') || 21), LZ = +(q.get('lz') || -15);
    var LB = TOP + 4.4;
    add({ geo: 'cylHi', pos: [LX, LB + 1.4, LZ], s: [13, 2.8, 13], color: '#24262a', border: 0.18, spec: 0.25, specW: 0.95 });
    add({ geo: 'cylHi', pos: [LX, LB + 2.8 + 8, LZ], s: [2.2, 16, 2.2], color: '#24262a', border: 0.15, spec: 0.25, specW: 0.95 });
    add({ geo: 'cylHi', pos: [LX, LB + 18.8 + 9, LZ], s: [24, 18, 24], taper: 0.62, color: '#efd9ae', emit: 0.88, emitDark: 0, border: 0.2, hatch: 0 });
    var lg = B.glow([LX, LB + 26, LZ], 66, '#ffb46a', 1); lg.glow = +(q.get('lglow') || 0.55);
    var lp = B.pool(LX - 6, TOP, LZ + 8, 64, 56, '#ffb46a', 1); lp.glow = 0.3;

    // the clock: 22:41
    var dg = B.T('ndigits', function () { return PT.digits(160, 64, q.get('clock') || '22:41'); });
    add({ geo: 'box', pos: [+(q.get('ckx') || -20), TOP + 4, -17], R: M.rotY(16 * DEG), s: [16, 8, 7], color: '#141517', map: dg, mapFace: 4, emit: 0.9, emitDark: 0, border: 0.15 });
    B.light({ p: [-14, TOP + 5, -10], c: '#ff7d45', i: 0.25, r: 30, k: 'always' });

    // the jar, turned a little toward the lamp
    var JP = vec(q.get('jp'), [-2, TOP, 0]);
    var J = SC.cJar(B, JP, { front: {}, back: {} });
    var Rj = M.rotY(+(q.get('face') || -22) * DEG);
    J.all.forEach(function (o) { o.x = { c: JP, R: Rj }; });
    B.shadow(JP[0], JP[2], 13, 13, 0.55, TOP);
    var ledW = M.apply3(Rj, [-2.05, 4.9 + 1.42, 9.6 / 2 + 0.4]);
    B.glow([JP[0] + ledW[0], JP[1] + ledW[1], JP[2] + ledW[2]], 1.6, '#ffb45a', 1).glow = 0.6;

    // a glass of water, in front to the right
    var glassLook = { color: '#e4f2fa', alpha: 0.4, blend: 'alpha', border: 0.3, hatch: 0, emit: 0.16 };
    var waterLook = { color: '#3f92da', alpha: 0.72, blend: 'alpha', border: 0.12, hatch: 0, emit: 0.32 };
    var GP = vec(q.get('gp'), [10.5, TOP, 7]);
    add(Object.assign({ geo: 'cylHi', pos: [GP[0], TOP + 5.5, GP[2]], s: [6.4, 11, 6.4] }, glassLook));
    add(Object.assign({ geo: 'cylHi', pos: [GP[0], TOP + 0.4 + 3.9, GP[2]], s: [5.8, 7.8, 5.8] }, waterLook));
    B.shadow(GP[0], GP[2], 8, 8, 0.3, TOP);

    // two books under the lamp; the phone face down by the clock
    add({ geo: 'box', pos: [LX - 1, TOP + 1.1, LZ + 1], R: M.rotY(3 * DEG), s: [16, 2.2, 22], color: '#b0473a', border: 0.16 });
    add({ geo: 'box', pos: [LX - 1.25, TOP + 1.1, LZ + 0.9], R: M.rotY(3 * DEG), s: [15.4, 1.7, 21.6], color: '#e9e1cf', border: 0.1 });
    add({ geo: 'box', pos: [LX + 0.5, TOP + 3.3, LZ + 0.5], R: M.rotY(-4 * DEG), s: [15, 2.2, 21], color: '#2f4a5c', border: 0.16 });
    add({ geo: 'box', pos: [LX + 0.25, TOP + 3.3, LZ + 0.4], R: M.rotY(-4 * DEG), s: [14.4, 1.7, 20.6], color: '#e9e1cf', border: 0.1 });
    add({ geo: 'box', pos: [-21, TOP + 0.45, -3], R: M.rotY(24 * DEG), s: [7.4, 0.9, 15.2], color: '#1b1d22', border: 0.16 });

    // the lamp's warm motes, a few, drifting
    var R0 = 11;
    var rr = function () { R0 = (R0 * 1664525 + 1013904223) >>> 0; return R0 / 4294967296; };
    var nm = +(q.get('motes') || 9);
    for (var k = 0; k < nm; k++) {
      var mp = [-30 + rr() * 70, TOP + 12 + rr() * 30, -20 + rr() * 30];
      var g = B.glow(mp, 1.6 + rr() * 2.2, ['#ffe6bf', '#fff0d6', '#ffd49a'][k % 3], 1);
      g.glow = 0.5 + rr() * 0.4;
      if (k % 3 === 0) { var h2 = B.glow(mp, 8 + rr() * 6, '#ffae55', 1); h2.glow = 0.14; }
    }

    var lights = [
      { p: [LX, LB + 26, LZ], c: '#ffb46a', i: +(q.get('lamp') || 1.8), r: 210, k: 'always' },
      { p: [LX, LB + 14, LZ + 4], c: '#ffc27a', i: 0.8, r: 60, k: 'always' },
      { p: [-80, 104, -24], c: '#ffc27a', i: 0.5, r: 120, k: 'always' },
      { p: [-260, 150, 160], c: '#6f86c8', i: +(q.get('moon') || 0.4), r: 520, k: 'always' },
      { p: [30, 110, 150], c: '#ff9a52', i: +(q.get('room') || 0.45), r: 320, k: 'always' },
    ];
    var at0 = vec(q.get('at'), [6, 68, 56]), to0 = vec(q.get('to'), [-1, 64, -5]);
    var C = cam(at0, to0, +q.get('fov') || 34);
    r.render(B.objs, { cam: C, amb: q.get('amb') || '#1d2131', ink: '#0b0d14', dark: 0, warm: 1, bg: [0.04, 0.05, 0.08, 1], hatch: +(q.get('hatch') || 0.55), grain: 0.04, cull: true, lights: lights });
    snap();
    done();
  }

  var fonts = ['900 100px "Sofia Sans Extra Condensed"', '800 50px "Sofia Sans Extra Condensed"', '700 30px "Sofia Sans Extra Condensed"', '600 30px "Sofia Sans"', '700 30px "Sofia Sans"'];
  Promise.all(fonts.map(function (f) { return document.fonts.load(f); })).then(function () {
    try { (shot === 'night' ? night : studio)(); } catch (e) { done(String((e && e.stack) || e)); }
  }, function (e) { done('fonts ' + e); });
})();
