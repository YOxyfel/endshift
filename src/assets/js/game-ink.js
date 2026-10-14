/* ENDSHIFT game: a small WebGL renderer that draws rooms like a graphic novel.
   Boxes, cards, cylinders and glows. Ink on every edge, cross-hatching where the light
   falls off, a little paper grain over everything. No libraries, WebGL 1.

   Units are centimetres; y is up; a camera at yaw 0 looks toward -z.
   Objects are plain records (see ES.Ink.obj); the room engine (game-room.js) owns them. */
(function () {
  'use strict';

  var ES = (window.ES = window.ES || {});

  /* ------------------------------------------------------------------ maths */
  // 3×3 and 4×4 matrices are column-major arrays.
  var M = {
    I3: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    rotX: function (t) { var c = Math.cos(t), s = Math.sin(t); return [1, 0, 0, 0, c, s, 0, -s, c]; },
    rotY: function (t) { var c = Math.cos(t), s = Math.sin(t); return [c, 0, -s, 0, 1, 0, s, 0, c]; },
    rotZ: function (t) { var c = Math.cos(t), s = Math.sin(t); return [c, s, 0, -s, c, 0, 0, 0, 1]; },
    // rotation by t about a unit axis
    axis: function (a, t) {
      var x = a[0], y = a[1], z = a[2], c = Math.cos(t), s = Math.sin(t), k = 1 - c;
      return [k * x * x + c, k * x * y + s * z, k * x * z - s * y, k * x * y - s * z, k * y * y + c, k * y * z + s * x, k * x * z + s * y, k * y * z - s * x, k * z * z + c];
    },
    mul3: function (a, b) {
      var o = new Array(9);
      for (var c = 0; c < 3; c++) for (var r = 0; r < 3; r++) o[c * 3 + r] = a[r] * b[c * 3] + a[3 + r] * b[c * 3 + 1] + a[6 + r] * b[c * 3 + 2];
      return o;
    },
    apply3: function (m, v) {
      return [m[0] * v[0] + m[3] * v[1] + m[6] * v[2], m[1] * v[0] + m[4] * v[1] + m[7] * v[2], m[2] * v[0] + m[5] * v[1] + m[8] * v[2]];
    },
    // transpose (= inverse, for a rotation)
    tr3: function (m) { return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]; },
  };
  var DEG = Math.PI / 180;
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

  function hex(h) {
    if (Array.isArray(h)) return h;
    h = String(h || '#777').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  /* ------------------------------------------------------------------ geometry */
  // Every vertex: position (3), normal (3), uv (2), face (1). Faces of a box:
  // 0 +x, 1 -x, 2 +y, 3 -y, 4 +z (the front), 5 -z. Cards are face 4. Cylinders: 6 side, 7 top, 8 bottom.
  function Geo() { this.v = []; this.i = []; }
  Geo.prototype.quad = function (face, n, c) {
    var b = this.v.length / 9;
    var uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (var k = 0; k < 4; k++) this.v.push(c[k][0], c[k][1], c[k][2], n[0], n[1], n[2], uv[k][0], uv[k][1], face);
    this.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  function boxGeo() {
    var g = new Geo(), h = 0.5;
    g.quad(4, [0, 0, 1], [[-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h]]);
    g.quad(5, [0, 0, -1], [[h, -h, -h], [-h, -h, -h], [-h, h, -h], [h, h, -h]]);
    g.quad(0, [1, 0, 0], [[h, -h, h], [h, -h, -h], [h, h, -h], [h, h, h]]);
    g.quad(1, [-1, 0, 0], [[-h, -h, -h], [-h, -h, h], [-h, h, h], [-h, h, -h]]);
    g.quad(2, [0, 1, 0], [[-h, h, h], [h, h, h], [h, h, -h], [-h, h, -h]]);
    g.quad(3, [0, -1, 0], [[-h, -h, -h], [h, -h, -h], [h, -h, h], [-h, -h, h]]);
    return g;
  }
  function cardGeo() {
    var g = new Geo(), h = 0.5;
    g.quad(4, [0, 0, 1], [[-h, -h, 0], [h, -h, 0], [h, h, 0], [-h, h, 0]]);
    return g;
  }
  /* A box with rounded upright edges (radius r, n steps a corner), in centimetres: it stands on
     y = 0, centred in x and z, and is drawn at scale 1. One skin, so the rounded corners carry no
     seams. Face 9: uv.x is how far it is (cm) to the nearest drawn edge (the rims at the top and
     the bottom), uv.y how wide the ink reaches round its silhouette. */
  function roundBox(W, H, D, r, n, sil) {
    var g = new Geo(), cx = W / 2 - r, cz = D / 2 - r, ring = [], i, j, k;
    var SG = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
    sil = sil == null ? 0.6 * Math.min(W, D) : sil;
    for (k = 0; k < 4; k++)
      for (j = 0; j <= n; j++) {
        var a = (k * 90 + (j / n) * 90) * DEG;
        ring.push({ x: SG[k][0] * cx + Math.sin(a) * r, z: SG[k][1] * cz + Math.cos(a) * r, nx: Math.sin(a), nz: Math.cos(a) });
      }
    var m = ring.length;
    // the sides: bottom rim, middle, top rim (the distance to the nearest rim is exact that way)
    [[0, 0], [H / 2, H / 2], [H, 0]].forEach(function (lv) {
      ring.forEach(function (p) { g.v.push(p.x, lv[0], p.z, p.nx, 0, p.nz, lv[1], sil, 9); });
    });
    for (var l = 0; l < 2; l++)
      for (i = 0; i < m; i++) {
        var a0 = l * m + i, a1 = l * m + ((i + 1) % m);
        g.i.push(a0, a1, a1 + m, a0, a1 + m, a0 + m);
      }
    // the top and the bottom: the rim, a ring 0.8 cm in (so the ink line keeps its width round
    // the corners), and the middle
    var e = Math.min(0.8, r * 0.9);
    [[H, 1], [0, -1]].forEach(function (cp) {
      var b = g.v.length / 9, y = cp[0], ny = cp[1];
      ring.forEach(function (p) { g.v.push(p.x, y, p.z, 0, ny, 0, 0, sil, 9); });
      ring.forEach(function (p) { g.v.push(p.x - p.nx * e, y, p.z - p.nz * e, 0, ny, 0, e, sil, 9); });
      g.v.push(0, y, 0, 0, ny, 0, Math.min(W, D) / 2, sil, 9);
      var c = b + 2 * m;
      for (i = 0; i < m; i++) {
        var o0 = b + i, o1 = b + ((i + 1) % m), i0 = o0 + m, i1 = o1 + m;
        // seen from above the ring runs anticlockwise: the top follows it, the bottom goes back
        if (ny > 0) g.i.push(o0, o1, i1, o0, i1, i0, i0, i1, c);
        else g.i.push(o0, i1, o1, o0, i0, i1, i0, c, i1);
      }
    });
    return g;
  }

  function cylGeo(n) {
    var g = new Geo(), i, a, b = 0;
    for (i = 0; i <= n; i++) {
      a = (i / n) * Math.PI * 2;
      var x = Math.sin(a) * 0.5, z = Math.cos(a) * 0.5;
      g.v.push(x, -0.5, z, Math.sin(a), 0, Math.cos(a), i / n, 0, 6);
      g.v.push(x, 0.5, z, Math.sin(a), 0, Math.cos(a), i / n, 1, 6);
    }
    for (i = 0; i < n; i++) {
      var b0 = i * 2, b1 = i * 2 + 2;
      g.i.push(b0, b1, b1 + 1, b0, b1 + 1, b0 + 1);
    }
    // caps
    [[0.5, 1, 7], [-0.5, -1, 8]].forEach(function (cap) {
      b = g.v.length / 9;
      g.v.push(0, cap[0], 0, 0, cap[1], 0, 0.5, 0.5, cap[2]);
      for (i = 0; i <= n; i++) {
        a = (i / n) * Math.PI * 2;
        var x = Math.sin(a) * 0.5, z = Math.cos(a) * 0.5;
        g.v.push(x, cap[0], z, 0, cap[1], 0, x + 0.5, (cap[1] > 0 ? -z : z) + 0.5, cap[2]);
      }
      for (i = 0; i < n; i++) {
        if (cap[1] > 0) g.i.push(b, b + 1 + i, b + 2 + i);
        else g.i.push(b, b + 2 + i, b + 1 + i);
      }
    });
    return g;
  }

  /* ------------------------------------------------------------------ shaders */
  var VS = [
    'attribute vec3 aPos; attribute vec3 aNor; attribute vec2 aUv; attribute float aFace;',
    'uniform mat4 uModel; uniform mat4 uVP; uniform mat3 uNm; uniform float uTaper;',
    'uniform float uBill; uniform vec3 uCamR; uniform vec3 uCamU; uniform vec2 uBillS;',
    'varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying float vFace;',
    'void main(){',
    '  vec3 p = aPos;',
    '  p.xz *= mix(1.0, uTaper, step(0.0, p.y));',
    '  vec4 w = uModel * vec4(p, 1.0);',
    '  if (uBill > 0.5) w = vec4(uModel[3].xyz + uCamR * aPos.x * uBillS.x + uCamU * aPos.y * uBillS.y, 1.0);',
    '  vW = w.xyz; vN = uNm * aNor; vUv = aUv; vFace = aFace;',
    '  gl_Position = uVP * w;',
    '}',
  ].join('\n');

  var FS = [
    '#extension GL_OES_standard_derivatives : enable',
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec3 uColor; uniform sampler2D uMap; uniform float uHasMap; uniform float uMapFace; uniform vec2 uRep; uniform vec2 uOff;',
    'uniform float uEmit; uniform float uEmitDark; uniform float uAlpha; uniform float uShape; uniform float uSoft; uniform float uUnlit;',
    'uniform vec3 uSize; uniform float uBorder; uniform float uHatchK; uniform float uHi; uniform float uMapAlpha;',
    'uniform vec3 uAmb; uniform vec3 uLP[6]; uniform vec3 uLC[6]; uniform float uLR[6]; uniform float uLK[6];',
    'uniform float uDark; uniform float uWarm; uniform vec3 uCam; uniform vec3 uInk; uniform float uDpr; uniform float uGrain;',
    'uniform vec3 uSpP; uniform vec3 uSpD; uniform vec3 uSpC; uniform float uSpCos; uniform float uSpSoft;',
    'uniform float uDis; uniform vec3 uDisC; uniform float uSpec; uniform float uSpecW;',
    'varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying float vFace;',
    // value noise, for things that dissolve (dis 0 → 1: they come apart from the edges of the noise, glowing)
    'float dh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float dn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(dh(i), dh(i + vec2(1.0, 0.0)), f.x), mix(dh(i + vec2(0.0, 1.0)), dh(i + vec2(1.0, 1.0)), f.x), f.y); }',
    // a band of parallel lines along c, spacing sp, width wd (same units as c); fades to its average when too fine to draw
    'float lines(float c, float sp, float wd){',
    '  float fw = fwidth(c);',
    '  float f = abs(fract(c / sp) - 0.5) * sp;',
    '  float a = 1.0 - smoothstep(wd * 0.5 - fw, wd * 0.5 + fw, f);',
    '  float far = clamp(fw / sp * 2.2 - 0.6, 0.0, 1.0);',
    '  return mix(a, wd / sp, far);',
    '}',
    'void main(){',
    '  vec2 uv = vUv;',
    '  float alpha = uAlpha;',
    '  if (uShape > 0.5) {',
    '    float r = length(uv - 0.5) * 2.0;',
    '    if (uSoft > 0.0) alpha *= 1.0 - smoothstep(1.0 - uSoft, 1.0, r);',
    '    else if (r > 1.0) discard;',
    '  }',
    '  float dis = 1.0;',
    '  if (uDis > 0.0) {',
    '    vec2 dp = uv * uSize.xy * 0.42;',
    '    float nz = dn(dp) * 0.6 + dn(dp * 2.7 + 3.1) * 0.3 + dn(dp * 6.3 + 7.7) * 0.1;',
    '    dis = nz - (uDis * 1.3 - 0.15);',
    '    if (dis < 0.0) discard;',
    '  }',
    '  vec3 base = uColor;',
    '  if (uHasMap > 0.5 && (uMapFace < -0.5 || abs(vFace - uMapFace) < 0.5)) {',
    '    vec4 tx = texture2D(uMap, uv * uRep + uOff);',
    '    if (uMapAlpha > 0.5) { base = uColor * tx.rgb; alpha *= tx.a; if (alpha < 0.01) discard; }',
    '    else base = mix(base, tx.rgb, tx.a);',
    '  }',
    '  vec3 n = normalize(vN);',
    '  if (!gl_FrontFacing) n = -n;',
    '  vec3 col = base;',
    '  if (uUnlit < 0.5) {',
    '    vec3 L = uAmb * (1.0 - 0.72 * uDark);',
    '    vec3 S = vec3(0.0);',
    '    vec3 vv = normalize(uCam - vW);',
    '    for (int i = 0; i < 6; i++) {',
    '      vec3 d = uLP[i] - vW;',
    '      float dist = length(d);',
    '      float att = clamp(1.0 - dist / uLR[i], 0.0, 1.0);',
    '      att *= att;',
    '      float nd = max(dot(n, d / max(dist, 0.001)), 0.0);',
    '      float on = uLK[i] > 0.5 ? uWarm : (uLK[i] < -0.5 ? 1.0 : 1.0 - uDark);',
    '      L += uLC[i] * att * (nd * 0.82 + 0.18) * on;',
    // a drawn highlight: a flat patch of the light's colour where it glints (shiny things only)
    '      if (uSpec > 0.0) {',
    '        float hs = dot(n, normalize(d / max(dist, 0.001) + vv));',
    '        S += uLC[i] * min(att * 2.5, 1.0) * on * smoothstep(uSpecW, uSpecW + 0.01, hs);',
    '      }',
    '    }',
    // a hand torch: a cone of light from the camera
    '    if (uSpCos > -0.5) {',
    '      vec3 d = vW - uSpP;',
    '      float dist = length(d);',
    '      vec3 dn = d / max(dist, 0.001);',
    '      float cone = smoothstep(uSpCos - uSpSoft, uSpCos + uSpSoft * 0.25, dot(dn, uSpD));',
    '      float nd = max(dot(n, -dn), 0.0);',
    '      L += uSpC * cone * (nd * 0.85 + 0.15) / (1.0 + dist * dist * 0.000012);',
    '    }',
    '    col = base * L;',
    '    float em = uEmit * (1.0 - uDark * uEmitDark);',
    '    col = mix(col, base, clamp(em, 0.0, 1.0));',
    // cross-hatching where it gets dark: lines stick to the surface (world space)
    '    float lum = dot(col, vec3(0.299, 0.587, 0.114));',
    '    vec3 an = abs(n);',
    '    vec2 hc = (an.y > an.x && an.y > an.z) ? vW.xz : (an.x > an.z ? vW.zy : vW.xy);',
    '    float k1 = smoothstep(0.3, 0.11, lum) * uHatchK;',
    '    float k2 = smoothstep(0.13, 0.03, lum) * uHatchK;',
    '    col = mix(col, uInk, lines(hc.x + hc.y, 2.6, 0.62) * k1 * 0.8);',
    '    col = mix(col, uInk, lines(hc.x - hc.y, 2.6, 0.55) * k2 * 0.5);',
    '    col += S * uSpec;',
    '  }',
    // ink on the edges
    '  if (uBorder > 0.0) {',
    '    float ed = 1e5; float fw;',
    '    if (vFace < 5.5) {',
    '      vec2 dim = vFace < 1.5 ? uSize.zy : (vFace < 3.5 ? uSize.xz : uSize.xy);',
    '      vec2 e = min(uv, 1.0 - uv) * dim;',
    '      ed = min(e.x, e.y);',
    '    } else if (vFace < 6.5) {',
    '      ed = min(uv.y, 1.0 - uv.y) * uSize.y;',
    '      float fr = abs(dot(n, normalize(uCam - vW)));',
    '      ed = min(ed, fr * 0.5 * uSize.x * 1.2);',
    '    } else if (vFace > 8.5) {',
    '      ed = min(uv.x, abs(dot(n, normalize(uCam - vW))) * uv.y);',
    '    } else {',
    '      ed = (1.0 - length(uv - 0.5) * 2.0) * 0.5 * uSize.x;',
    '    }',
    '    fw = fwidth(ed);',
    '    float bw = max(uBorder, fw * 1.25);',
    '    col = mix(col, uInk, (1.0 - smoothstep(bw - fw, bw + fw * 0.5, ed)) * 0.94);',
    '  }',
    '  col = mix(col, vec3(1.0, 0.86, 0.62), uHi * 0.16);',
    '  if (uDis > 0.0) col = mix(col, uDisC, 1.0 - smoothstep(0.0, 0.16, dis));',
    '  float g = fract(sin(dot(floor(gl_FragCoord.xy / uDpr), vec2(12.9898, 78.233))) * 43758.5453);',
    '  col *= 1.0 - uGrain + g * uGrain * 2.0;',
    '  gl_FragColor = vec4(col * alpha, alpha);',
    '}',
  ].join('\n');

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      if (window.console) console.warn('ink shader', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  ES.Ink = {};
  ES.Ink.M = M;
  ES.Ink.roundBox = roundBox;
  ES.Ink.hex = hex;
  ES.Ink.supported = function () {
    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      var ok = !!(gl && gl.getExtension('OES_standard_derivatives'));
      var lose = gl && gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      return ok;
    } catch (e) {
      return false;
    }
  };

  /* A drawable record. Fields (all optional except geo):
     geo 'box' | 'card' | 'cyl' | 'cylHi' (smoother, for close-ups); pos [x,y,z]; R 3×3; s [sx,sy,sz]; color; map (texture);
     mapFace (-1 = every face); rep [u,v] (texture repeats); mapAlpha (texture alpha cuts);
     emit (0–1, glows on its own), emitDark (how much of that dies with the lights);
     border (cm of ink on the edges, 0 = none); hatch (0–1); shape 1 = disc; soft (disc edge);
     taper (cylinder top radius); alpha; blend 'alpha' | 'add'; bill (always faces you);
     unlit; hidden; thing (id of what you tap); dis (0–1: comes apart in noise, its edges glowing
     disC, an [r,g,b] 0–1). */
  ES.Ink.obj = function (o) {
    o.pos = o.pos || [0, 0, 0];
    o.R = o.R || M.I3;
    o.s = o.s || [1, 1, 1];
    o.c = hex(o.color || '#888');
    o.border = o.border == null ? 0.35 : o.border;
    o.hatch = o.hatch == null ? 1 : o.hatch;
    o.alpha = o.alpha == null ? 1 : o.alpha;
    o.taper = o.taper == null ? 1 : o.taper;
    o.hi = 0;
    o.x = null; // extra transform while something moves: { c, t, R, k }
    return o;
  };
  // where the object actually is right now (with any extra transform applied)
  ES.Ink.place = function (o) {
    var p = o.pos, R = o.R, s = o.s;
    var x = o.x;
    if (x) {
      var k = x.k == null ? 1 : x.k;
      var Re = x.R || M.I3;
      var c = x.c || p;
      var d = M.apply3(Re, [(p[0] - c[0]) * k, (p[1] - c[1]) * k, (p[2] - c[2]) * k]);
      var t = x.t || [0, 0, 0];
      p = [c[0] + t[0] + d[0], c[1] + t[1] + d[1], c[2] + t[2] + d[2]];
      R = M.mul3(Re, R);
      s = [s[0] * k, s[1] * k, s[2] * k];
    }
    return { p: p, R: R, s: s };
  };

  /* ------------------------------------------------------------------ renderer */
  ES.Ink.renderer = function (canvas) {
    var gl = null;
    try {
      gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'default' }) || canvas.getContext('experimental-webgl', { antialias: true, alpha: true });
    } catch (e) {}
    if (!gl || !gl.getExtension('OES_standard_derivatives')) return null;
    var aniso = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');

    var vs = compile(gl, gl.VERTEX_SHADER, VS), fs = compile(gl, gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    var A = {};
    ['aPos', 'aNor', 'aUv', 'aFace'].forEach(function (n) { A[n] = gl.getAttribLocation(prog, n); });
    var U = {};
    ['uSpec', 'uSpecW', 'uSpP', 'uSpD', 'uSpC', 'uSpCos', 'uSpSoft', 'uModel', 'uVP', 'uNm', 'uTaper', 'uBill', 'uCamR', 'uCamU', 'uBillS', 'uColor', 'uMap', 'uHasMap', 'uMapFace', 'uRep', 'uOff', 'uEmit', 'uEmitDark', 'uAlpha', 'uShape', 'uSoft', 'uUnlit', 'uSize', 'uBorder', 'uHatchK', 'uHi', 'uMapAlpha', 'uAmb', 'uDark', 'uWarm', 'uCam', 'uInk', 'uDpr', 'uGrain', 'uDis', 'uDisC'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    U.uLP = gl.getUniformLocation(prog, 'uLP');
    U.uLC = gl.getUniformLocation(prog, 'uLC');
    U.uLR = gl.getUniformLocation(prog, 'uLR');
    U.uLK = gl.getUniformLocation(prog, 'uLK');

    function upload(g) {
      var vb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.v), gl.STATIC_DRAW);
      var ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(g.i), gl.STATIC_DRAW);
      return { vb: vb, ib: ib, n: g.i.length };
    }
    var GEO = { box: upload(boxGeo()), card: upload(cardGeo()), cyl: upload(cylGeo(20)), cylHi: upload(cylGeo(56)) };
    // a shape of its own (made once, by name): make() returns its geometry
    function geo(name, make) {
      if (!GEO[name]) GEO[name] = upload(make());
      return name;
    }
    var bound = null;
    function bind(name) {
      if (bound === name) return GEO[name];
      var g = GEO[name];
      gl.bindBuffer(gl.ARRAY_BUFFER, g.vb);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.ib);
      var st = 36;
      gl.enableVertexAttribArray(A.aPos);
      gl.vertexAttribPointer(A.aPos, 3, gl.FLOAT, false, st, 0);
      if (A.aNor >= 0) { gl.enableVertexAttribArray(A.aNor); gl.vertexAttribPointer(A.aNor, 3, gl.FLOAT, false, st, 12); }
      if (A.aUv >= 0) { gl.enableVertexAttribArray(A.aUv); gl.vertexAttribPointer(A.aUv, 2, gl.FLOAT, false, st, 24); }
      if (A.aFace >= 0) { gl.enableVertexAttribArray(A.aFace); gl.vertexAttribPointer(A.aFace, 1, gl.FLOAT, false, st, 32); }
      bound = name;
      return g;
    }

    // a 1×1 white texture keeps the sampler happy when nothing is mapped
    var white = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, white);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));

    var pot = function (n) { return (n & (n - 1)) === 0; };
    function texture(cv, repeat) {
      var t = gl.createTexture();
      var rec = { t: t, canvas: cv, repeat: !!repeat };
      // canvas pictures go in the right way up (v = 0 at the bottom)
      rec.update = function (next) {
        if (next) rec.canvas = cv = next;
        gl.bindTexture(gl.TEXTURE_2D, t);
        lastTex = null;
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
        var mip = repeat && pot(cv.width) && pot(cv.height);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, mip ? gl.REPEAT : gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, mip ? gl.REPEAT : gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        if (mip) {
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
        } else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      };
      rec.update();
      return rec;
    }

    var W = 1, H = 1, dpr = 1;
    function resize(w, h, d) {
      W = Math.max(1, w);
      H = Math.max(1, h);
      dpr = d;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    /* camera: { pos, yaw, pitch, roll (degrees), fovy (radians) } → view-projection and its basis */
    var view = { vp: new Float32Array(16), f: [0, 0, -1], r: [1, 0, 0], u: [0, 1, 0], e: [0, 0, 0], tanY: 1, tanX: 1 };
    function setCamera(cam) {
      var y = cam.yaw * DEG, p = cam.pitch * DEG, ro = (cam.roll || 0) * DEG;
      var f = [Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p)];
      var r = [Math.cos(y), 0, Math.sin(y)];
      var u = cross(r, f);
      if (ro) {
        var cr = Math.cos(ro), sr = Math.sin(ro);
        var r2 = [r[0] * cr + u[0] * sr, r[1] * cr + u[1] * sr, r[2] * cr + u[2] * sr];
        u = [u[0] * cr - r[0] * sr, u[1] * cr - r[1] * sr, u[2] * cr - r[2] * sr];
        r = r2;
      }
      var e = cam.pos;
      var V = [r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0, -dot(r, e), -dot(u, e), dot(f, e), 1];
      var aspect = W / H, n = 4, fa = 4000;
      var t = 1 / Math.tan(cam.fovy / 2), nf = 1 / (n - fa);
      var P = [t / aspect, 0, 0, 0, 0, t, 0, 0, 0, 0, (fa + n) * nf, -1, 0, 0, 2 * fa * n * nf, 0];
      // vp = P × V
      var o = view.vp;
      for (var c = 0; c < 4; c++)
        for (var rr = 0; rr < 4; rr++) o[c * 4 + rr] = P[rr] * V[c * 4] + P[4 + rr] * V[c * 4 + 1] + P[8 + rr] * V[c * 4 + 2] + P[12 + rr] * V[c * 4 + 3];
      view.f = f; view.r = r; view.u = u; view.e = e;
      view.tanY = Math.tan(cam.fovy / 2);
      view.tanX = view.tanY * aspect;
    }
    // world → css pixels in the canvas; null behind you
    function project(pt) {
      var d = [pt[0] - view.e[0], pt[1] - view.e[1], pt[2] - view.e[2]];
      var z = dot(d, view.f);
      var x = dot(d, view.r), y = dot(d, view.u);
      if (z < 1) return { behind: true, x: x, y: y, z: z };
      return { x: W / 2 + (x / (z * view.tanX)) * (W / 2), y: H / 2 - (y / (z * view.tanY)) * (H / 2), z: z, s: (H / 2) / (z * view.tanY) };
    }
    // css pixels → a ray into the world
    function ray(sx, sy) {
      var nx = (sx / W) * 2 - 1, ny = 1 - (sy / H) * 2;
      var d = [0, 1, 2].map(function (i) { return view.f[i] + view.r[i] * nx * view.tanX + view.u[i] * ny * view.tanY; });
      return { o: view.e.slice(), d: d };
    }
    // the nearest object the ray hits (objects with a pick flag)
    function pick(rr, objs, pad) {
      var best = null, bt = Infinity;
      for (var i = 0; i < objs.length; i++) {
        var o = objs[i];
        if (!o.pick || o.hidden) continue;
        var pl = ES.Ink.place(o);
        var Rt = M.tr3(pl.R);
        var pp = (o.pickPad || 0) + (pad || 0);
        var s = [pl.s[0] + pp * 2, pl.s[1] + pp * 2, o.geo === 'card' ? 1 : pl.s[2] + pp * 2];
        var lo = M.apply3(Rt, [rr.o[0] - pl.p[0], rr.o[1] - pl.p[1], rr.o[2] - pl.p[2]]);
        var ld = M.apply3(Rt, rr.d);
        lo = [lo[0] / s[0], lo[1] / s[1], lo[2] / s[2]];
        ld = [ld[0] / s[0], ld[1] / s[1], ld[2] / s[2]];
        var t;
        if (o.geo === 'card') {
          if (Math.abs(ld[2]) < 1e-6) continue;
          t = -lo[2] / ld[2];
          if (t <= 0) continue;
          var hx = lo[0] + ld[0] * t, hy = lo[1] + ld[1] * t;
          if (Math.abs(hx) > 0.5 || Math.abs(hy) > 0.5) continue;
          if (o.shape === 1 && Math.hypot(hx, hy) > 0.5) continue;
        } else {
          var t0 = -Infinity, t1 = Infinity, ok = true;
          for (var k = 0; k < 3; k++) {
            if (Math.abs(ld[k]) < 1e-9) {
              if (lo[k] < -0.5 || lo[k] > 0.5) { ok = false; break; }
            } else {
              var a = (-0.5 - lo[k]) / ld[k], b = (0.5 - lo[k]) / ld[k];
              if (a > b) { var tmp = a; a = b; b = tmp; }
              t0 = Math.max(t0, a);
              t1 = Math.min(t1, b);
            }
          }
          if (!ok || t1 < t0 || t1 <= 0) continue;
          t = t0 > 0 ? t0 : t1;
        }
        if (t < bt) { bt = t; best = o; }
      }
      return best ? { obj: best, t: bt, p: [rr.o[0] + rr.d[0] * bt, rr.o[1] + rr.d[1] * bt, rr.o[2] + rr.d[2] * bt] } : null;
    }

    var nm = new Float32Array(9), mm = new Float32Array(16);
    var LP = new Float32Array(18), LC = new Float32Array(18), LR = new Float32Array(6), LK = new Float32Array(6);
    var lastTex = null;

    function drawObj(o, fr) {
      var g = bind(o.geo);
      var pl = ES.Ink.place(o);
      var R = pl.R, s = pl.s, p = pl.p;
      for (var i = 0; i < 3; i++) {
        mm[i] = R[i] * s[0]; mm[4 + i] = R[3 + i] * s[1]; mm[8 + i] = R[6 + i] * s[2];
        nm[i] = R[i] / s[0]; nm[3 + i] = R[3 + i] / s[1]; nm[6 + i] = R[6 + i] / (o.geo === 'card' ? 1 : s[2]);
      }
      mm[3] = mm[7] = mm[11] = 0;
      mm[12] = p[0]; mm[13] = p[1]; mm[14] = p[2]; mm[15] = 1;
      gl.uniformMatrix4fv(U.uModel, false, mm);
      gl.uniformMatrix3fv(U.uNm, false, nm);
      gl.uniform1f(U.uTaper, o.taper);
      gl.uniform1f(U.uBill, o.bill ? 1 : 0);
      if (o.bill) gl.uniform2f(U.uBillS, s[0], s[1]);
      var c = o.c, k = o.glow != null ? o.glow : 1;
      gl.uniform3f(U.uColor, c[0] * k, c[1] * k, c[2] * k);
      var tex = o.map ? o.map.t : white;
      if (tex !== lastTex) { gl.bindTexture(gl.TEXTURE_2D, tex); lastTex = tex; }
      gl.uniform1f(U.uHasMap, o.map ? 1 : 0);
      gl.uniform1f(U.uMapFace, o.mapFace == null ? (o.geo === 'card' ? -1 : 4) : o.mapFace);
      gl.uniform1f(U.uMapAlpha, o.mapAlpha ? 1 : 0);
      var rep = o.rep || [1, 1];
      gl.uniform2f(U.uRep, rep[0], rep[1]);
      var off = o.off || [0, 0];
      gl.uniform2f(U.uOff, off[0], off[1]);
      gl.uniform1f(U.uEmit, o.emit || 0);
      gl.uniform1f(U.uEmitDark, o.emitDark == null ? 1 : o.emitDark);
      gl.uniform1f(U.uAlpha, o.alpha);
      gl.uniform1f(U.uShape, o.shape || 0);
      gl.uniform1f(U.uSoft, o.soft || 0);
      gl.uniform1f(U.uUnlit, o.unlit || o.bill ? 1 : 0);
      gl.uniform3f(U.uSize, s[0], s[1], s[2]);
      gl.uniform1f(U.uBorder, fr.noInk ? 0 : o.border);
      gl.uniform1f(U.uHatchK, o.hatch * fr.hatch);
      gl.uniform1f(U.uHi, o.hi || 0);
      gl.uniform1f(U.uSpec, o.spec || 0);
      if (o.spec) gl.uniform1f(U.uSpecW, o.specW || 0.985);
      gl.uniform1f(U.uDis, o.dis || 0);
      if (o.dis) { var dc = o.disC || [1, 0.8, 0.5]; gl.uniform3f(U.uDisC, dc[0], dc[1], dc[2]); }
      gl.drawElements(gl.TRIANGLES, g.n, gl.UNSIGNED_SHORT, 0);
    }

    /* fr: { cam, lights: [{p, c, r, k}], amb, dark, warm, ink, bg: [r,g,b,a], hatch, grain, cull } */
    function render(objs, fr) {
      setCamera(fr.cam);
      var bg = fr.bg || [0, 0, 0, 0];
      gl.clearColor(bg[0] * bg[3], bg[1] * bg[3], bg[2] * bg[3], bg[3]);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(prog);
      gl.uniform1i(U.uMap, 0);
      gl.activeTexture(gl.TEXTURE0);
      lastTex = null;
      gl.uniformMatrix4fv(U.uVP, false, view.vp);
      gl.uniform3fv(U.uCamR, view.r);
      gl.uniform3fv(U.uCamU, view.u);
      gl.uniform3fv(U.uCam, view.e);
      var amb = hex(fr.amb || '#444');
      gl.uniform3f(U.uAmb, amb[0], amb[1], amb[2]);
      gl.uniform1f(U.uDark, fr.dark || 0);
      gl.uniform1f(U.uWarm, fr.warm || 0);
      var ink = hex(fr.ink || '#0d0f14');
      gl.uniform3f(U.uInk, ink[0], ink[1], ink[2]);
      gl.uniform1f(U.uDpr, dpr);
      gl.uniform1f(U.uGrain, fr.grain == null ? 0.03 : fr.grain);
      LP.fill(0); LC.fill(0); LR.fill(1); LK.fill(0);
      // six lights at most: the ones that are on and matter most from here
      var ce = fr.cam.pos;
      var picked = (fr.lights || [])
        .map(function (l) {
          var on = l.k === 'warm' ? fr.warm || 0 : l.k === 'always' ? 1 : 1 - (fr.dark || 0);
          var it = (l.i == null ? 1 : l.i) * on;
          var d = Math.hypot(l.p[0] - ce[0], l.p[1] - ce[1], l.p[2] - ce[2]);
          return { l: l, w: it * Math.max(0.05, 1 - d / ((l.r || 400) * 1.6)) };
        })
        .filter(function (x) { return x.w > 0.004; })
        .sort(function (a, b) { return b.w - a.w; })
        .slice(0, 6)
        .map(function (x) { return x.l; });
      picked.forEach(function (l, i) {
        var col = hex(l.c), it = l.i == null ? 1 : l.i;
        LP[i * 3] = l.p[0]; LP[i * 3 + 1] = l.p[1]; LP[i * 3 + 2] = l.p[2];
        LC[i * 3] = col[0] * it; LC[i * 3 + 1] = col[1] * it; LC[i * 3 + 2] = col[2] * it;
        LR[i] = l.r || 400;
        LK[i] = l.k === 'warm' ? 1 : l.k === 'always' ? -1 : 0;
      });
      var sp = fr.spot;
      if (sp) {
        var sc = hex(sp.c || '#fff4dc'), si = sp.i == null ? 1 : sp.i;
        gl.uniform3fv(U.uSpP, sp.p);
        gl.uniform3fv(U.uSpD, sp.d);
        gl.uniform3f(U.uSpC, sc[0] * si, sc[1] * si, sc[2] * si);
        gl.uniform1f(U.uSpCos, Math.cos(sp.a * DEG));
        gl.uniform1f(U.uSpSoft, sp.soft == null ? 0.05 : sp.soft);
      } else gl.uniform1f(U.uSpCos, -1);
      gl.uniform3fv(U.uLP, LP);
      gl.uniform3fv(U.uLC, LC);
      gl.uniform1fv(U.uLR, LR);
      gl.uniform1fv(U.uLK, LK);

      var opaque = [], blended = [], added = [];
      for (var i = 0; i < objs.length; i++) {
        var o = objs[i];
        if (o.hidden || o.alpha <= 0.004) continue;
        if (o.blend === 'add') added.push(o);
        else if (o.blend === 'alpha' || o.alpha < 1) blended.push(o);
        else opaque.push(o);
      }
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      if (fr.cull) { gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); } else gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);
      gl.depthMask(true);
      // decals sit on surfaces: pull them toward you a touch instead of fighting over depth
      gl.enable(gl.POLYGON_OFFSET_FILL);
      opaque.forEach(function (o) {
        var off = o.decal ? -2 - (o.decal | 0) : 0;
        gl.polygonOffset(off, off);
        drawObj(o, fr);
      });
      gl.enable(gl.BLEND);
      gl.depthMask(false);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      var e = view.e;
      var dist = function (o) { var p = ES.Ink.place(o).p; return (p[0] - e[0]) * (p[0] - e[0]) + (p[1] - e[1]) * (p[1] - e[1]) + (p[2] - e[2]) * (p[2] - e[2]); };
      blended.sort(function (a, b) { return dist(b) - dist(a); });
      blended.forEach(function (o) {
        var off = o.decal ? -2 - (o.decal | 0) : -1;
        gl.polygonOffset(off, off);
        drawObj(o, fr);
      });
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.disable(gl.CULL_FACE);
      added.forEach(function (o) {
        gl.polygonOffset(-4, -4);
        drawObj(o, fr);
      });
      gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }

    function destroy() {
      try {
        var lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      } catch (e) {}
    }

    return { gl: gl, resize: resize, texture: texture, geo: geo, render: render, project: project, ray: ray, pick: pick, setCamera: setCamera, destroy: destroy, view: view };
  };
})();
