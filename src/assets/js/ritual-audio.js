/* ENDSHIFT ritual soundtrack. Generated live with the Web Audio API: no audio files.
   Each step has its own chord, a darker filter and slower, sparser notes, so the music
   winds down with you. During breathing the pad and a soft "wash" rise and fall with the breath.
   The optional binaural layer is two sine tones, one per ear, whose difference drifts 10 → 6 Hz.

   Variations (opts.variant): lamp (the original), rain, piano (felt piano), night (drone, no
   melody). Two utility modes: bells (only the step bells, for people playing their own music)
   and silent (nothing but the binaural layer, if that's on). */
(function () {
  'use strict';
  var ES = (window.ES = window.ES || {});

  var mtof = function (m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  };

  // One entry per scene: office, mist, water, lamp, phone, horizon, embers (all in D major)
  var CHORDS = [
    [50, 54, 57, 64], // D3 F#3 A3 E4
    [47, 54, 57, 62], // B2 F#3 A3 D4
    [43, 50, 54, 59], // G2 D3 F#3 B3
    [40, 47, 50, 55], // E2 B2 D3 G3
    [45, 52, 57, 61], // A2 E3 A3 C#4
    [38, 45, 50, 54], // D2 A2 D3 F#3
    [43, 50, 52, 54], // G2 D3 E3 F#3
  ];
  var FILTER = [2300, 1800, 1450, 1150, 900, 700, 560];
  var PAD = [0.1, 0.11, 0.11, 0.11, 0.1, 0.12, 0.11];
  var TEMPO = [74, 64, 56, 48, 0, 0, 0]; // bpm for the plucked notes; 0 → sparse, free notes
  var DENSITY = [0.8, 0.65, 0.5, 0.35, 0.12, 0, 0.1];
  var NOISE = [0.01, 0.028, 0.03, 0.018, 0.014, 0.016, 0.02];
  var BEAT = [10, 9.2, 8.4, 7.6, 7, 6, 6];
  var SCALE = [57, 59, 62, 64, 66, 69, 71, 74, 76, 78]; // D pentatonic, A3 → F#5
  var MASTER = 0.9;
  var CARRIER = 196;
  var RAIN = [0.05, 0.047, 0.044, 0.04, 0.036, 0.032, 0.028]; // the rain eases off step by step

  // How each variation uses the same building blocks
  var VARIANTS = {
    lamp: { pad: 1, density: 1, tempo: 1, voice: 'pluck', noise: 1, rain: 0, octave: 0, shift: 0, bell: 0, wash: 1 },
    rain: { pad: 0.7, density: 0.22, tempo: 0.7, voice: 'pluck', noise: 0.45, rain: 1, octave: 0, shift: 0, bell: 0, wash: 0.6 },
    piano: { pad: 0.5, density: 0.8, tempo: 0.8, voice: 'felt', noise: 0.7, rain: 0, octave: 0, shift: -12, bell: 0, wash: 0.8 },
    night: { pad: 1.05, density: 0, tempo: 1, voice: null, noise: 1.3, rain: 0, octave: -12, shift: 0, bell: 1, wash: 1 },
    bells: { pad: 0, density: 0, tempo: 1, voice: null, noise: 0, rain: 0, octave: 0, shift: 0, bell: 0, wash: 0, fx: false },
    silent: { pad: 0, density: 0, tempo: 1, voice: null, noise: 0, rain: 0, octave: 0, shift: 0, bell: 0, wash: 0, fx: false, chimes: false },
  };

  function noiseBuffer(ctx, seconds, brown) {
    var len = Math.floor(ctx.sampleRate * seconds);
    var buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      var last = 0;
      for (var i = 0; i < len; i++) {
        var w = Math.random() * 2 - 1;
        if (brown) {
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.4;
        } else d[i] = w * 0.5;
      }
      // fade the loop seam
      var f = Math.floor(ctx.sampleRate * 0.05);
      for (var j = 0; j < f; j++) {
        d[j] *= j / f;
        d[len - 1 - j] *= j / f;
      }
    }
    return buf;
  }

  function impulse(ctx, seconds, decay) {
    var len = Math.floor(ctx.sampleRate * seconds);
    var buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function RitualAudio() {
    this.ctx = null;
    this.muted = false;
    this.binaural = false;
    this.step = 0;
    this.inBreath = false;
    this.lastParam = 0;
  }

  RitualAudio.prototype.init = function (opts) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback'; // iOS: play even with the silent switch on
    } catch (e) {}
    var ctx;
    try {
      ctx = this.ctx = new AC({ latencyHint: 'playback' });
    } catch (e) {
      return false;
    }
    this.muted = !opts.sound;
    this.binaural = !!opts.binaural;
    this.variant = VARIANTS[opts.variant] ? opts.variant : 'lamp';
    this.V = VARIANTS[this.variant];
    var V = this.V;

    var master = (this.master = ctx.createGain());
    master.gain.value = 0.0001;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value = 18;
    comp.ratio.value = 3;
    master.connect(comp);
    // the music dips under the narrator's voice (duck), separate from the master level
    var duckGain = (this.duckGain = ctx.createGain());
    duckGain.gain.value = 1;
    comp.connect(duckGain);
    duckGain.connect(ctx.destination);

    // Reverb send
    var verb = ctx.createConvolver();
    verb.buffer = impulse(ctx, 4.5, 2.4);
    var verbOut = ctx.createGain();
    verbOut.gain.value = 0.55;
    verb.connect(verbOut);
    verbOut.connect(master);
    this.verb = verb;

    // Pad: four voices, two slightly detuned oscillators each
    var padFilter = (this.padFilter = ctx.createBiquadFilter());
    padFilter.type = 'lowpass';
    padFilter.frequency.value = FILTER[0];
    padFilter.Q.value = 0.4;
    var padGain = (this.padGain = ctx.createGain());
    padGain.gain.value = 0;
    padFilter.connect(padGain);
    padGain.connect(master);
    var padSend = ctx.createGain();
    padSend.gain.value = 0.5;
    padGain.connect(padSend);
    padSend.connect(verb);
    var lfo = ctx.createOscillator();
    lfo.frequency.value = 0.045;
    var lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 140;
    lfo.connect(lfoAmt);
    lfoAmt.connect(padFilter.frequency);
    lfo.start();
    var oct = Math.pow(2, V.octave / 12);
    this.voices = CHORDS[0].map(function (m, k) {
      var g = ctx.createGain();
      g.gain.value = 0.22;
      var a = ctx.createOscillator();
      a.type = 'triangle';
      a.frequency.value = mtof(m) * oct;
      var b = ctx.createOscillator();
      b.type = 'sine';
      b.frequency.value = mtof(m) * oct;
      b.detune.value = k % 2 ? 7 : -6;
      a.connect(g);
      b.connect(g);
      g.connect(padFilter);
      a.start();
      b.start();
      return [a, b];
    });

    // Room tone: brown noise, low-passed
    var bed = ctx.createBufferSource();
    bed.buffer = noiseBuffer(ctx, 6, true);
    bed.loop = true;
    var bedFilter = ctx.createBiquadFilter();
    bedFilter.type = 'lowpass';
    bedFilter.frequency.value = 520;
    var bedGain = (this.bedGain = ctx.createGain());
    bedGain.gain.value = 0;
    bed.connect(bedFilter);
    bedFilter.connect(bedGain);
    bedGain.connect(master);
    bed.start();

    // Rain: hiss with slow gusts, a low rumble on the roof, and droplets (see droplet())
    if (V.rain) {
      var rain = ctx.createBufferSource();
      rain.buffer = noiseBuffer(ctx, 5, false);
      rain.loop = true;
      var rhp = ctx.createBiquadFilter();
      rhp.type = 'highpass';
      rhp.frequency.value = 480;
      var rlp = ctx.createBiquadFilter();
      rlp.type = 'lowpass';
      rlp.frequency.value = 5200;
      var rainGain = (this.rainGain = ctx.createGain());
      rainGain.gain.value = 0;
      var gust = ctx.createOscillator();
      gust.frequency.value = 0.055;
      var gustAmt = ctx.createGain();
      gustAmt.gain.value = 0.011;
      gust.connect(gustAmt);
      gustAmt.connect(rainGain.gain);
      gust.start();
      rain.connect(rhp);
      rhp.connect(rlp);
      rlp.connect(rainGain);
      rainGain.connect(master);
      rain.start();
      var rum = ctx.createBufferSource();
      rum.buffer = noiseBuffer(ctx, 6, true);
      rum.loop = true;
      var rumLp = ctx.createBiquadFilter();
      rumLp.type = 'lowpass';
      rumLp.frequency.value = 260;
      var rumGain = (this.rumbleGain = ctx.createGain());
      rumGain.gain.value = 0;
      rum.connect(rumLp);
      rumLp.connect(rumGain);
      rumGain.connect(master);
      rum.start();
      var dl = Math.floor(ctx.sampleRate * 0.06);
      this.dropBuf = ctx.createBuffer(1, dl, ctx.sampleRate);
      var dd = this.dropBuf.getChannelData(0);
      for (var di = 0; di < dl; di++) dd[di] = (Math.random() * 2 - 1) * Math.pow(1 - di / dl, 2);
      this.nextDrop = 0;
    }

    // Breath wash: band-passed noise that sweeps up as you breathe in and down as you breathe out
    var wash = ctx.createBufferSource();
    wash.buffer = noiseBuffer(ctx, 4, false);
    wash.loop = true;
    var washFilter = (this.washFilter = ctx.createBiquadFilter());
    washFilter.type = 'bandpass';
    washFilter.frequency.value = 400;
    washFilter.Q.value = 0.9;
    var washGain = (this.washGain = ctx.createGain());
    washGain.gain.value = 0;
    wash.connect(washFilter);
    washFilter.connect(washGain);
    washGain.connect(master);
    var washSend = ctx.createGain();
    washSend.gain.value = 0.6;
    washGain.connect(washSend);
    washSend.connect(verb);
    wash.start();

    // Plucked notes bus
    var pluckBus = (this.pluckBus = ctx.createGain());
    pluckBus.gain.value = 1;
    var pluckFilter = ctx.createBiquadFilter();
    pluckFilter.type = 'lowpass';
    pluckFilter.frequency.value = 3200;
    pluckBus.connect(pluckFilter);
    pluckFilter.connect(master);
    var pluckSend = ctx.createGain();
    pluckSend.gain.value = 0.9;
    pluckFilter.connect(pluckSend);
    pluckSend.connect(verb);

    // Binaural: left and right ears get slightly different pitches
    var binGain = (this.binGain = ctx.createGain());
    binGain.gain.value = 0;
    binGain.connect(master);
    var mk = function (freq, pan) {
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      var p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (p) {
        p.pan.value = pan;
        o.connect(p);
        p.connect(binGain);
      } else o.connect(binGain);
      o.start();
      return o;
    };
    this.binL = mk(CARRIER, -1);
    this.binR = mk(CARRIER + BEAT[0], 1);

    this.noteIdx = 4;
    this.nextNote = 0;
    var self = this;
    this.timer = setInterval(function () {
      self.schedule();
    }, 80);
    return true;
  };

  RitualAudio.prototype.now = function () {
    return this.ctx.currentTime;
  };

  RitualAudio.prototype.target = function (param, value, tc) {
    var t = this.now();
    try {
      param.cancelScheduledValues(t);
      param.setTargetAtTime(value, t, tc);
    } catch (e) {}
  };

  RitualAudio.prototype.start = function () {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.target(this.master.gain, this.muted ? 0.0001 : MASTER, 1.2);
    this.target(this.binGain.gain, this.binaural ? 0.03 : 0, 2);
    this.nextNote = this.now() + 0.4;
  };

  RitualAudio.prototype.setStep = function (i, opts) {
    if (!this.ctx) return;
    this.step = i;
    var glide = opts && opts.instant ? 0.05 : 1.6;
    var chord = CHORDS[i] || CHORDS[0];
    var V = this.V;
    var oct = Math.pow(2, V.octave / 12);
    this.voices.forEach(
      function (pair, k) {
        var f = mtof(chord[k]) * oct;
        this.target(pair[0].frequency, f, glide);
        this.target(pair[1].frequency, f, glide);
      }.bind(this),
    );
    this.inBreath = !!(opts && opts.breath);
    if (!this.inBreath || !V.wash) {
      this.target(this.padFilter.frequency, FILTER[i], 2.5);
      this.target(this.padGain.gain, PAD[i] * V.pad, 2.5);
      this.target(this.washGain.gain, 0, 1);
    }
    this.target(this.bedGain.gain, NOISE[i] * V.noise, 3);
    if (this.rainGain) {
      this.target(this.rainGain.gain, RAIN[i] * V.rain, 4);
      this.target(this.rumbleGain.gain, RAIN[i] * 0.9 * V.rain, 4);
    }
    this.target(this.binR.frequency, CARRIER + BEAT[i], 10);
    if (!(opts && opts.silent)) this.chime(i);
  };

  // Soft bell between steps
  RitualAudio.prototype.chime = function (i, dest) {
    if (this.V.chimes === false) return;
    var ctx = this.ctx;
    var out = dest || this.pluckBus;
    var t = this.now() + 0.05;
    var root = [74, 71, 69, 66, 69, 62, 66][i] || 74;
    [0, 7].forEach(
      function (iv, k) {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = mtof(root + iv);
        g.gain.setValueAtTime(0.0001, t + k * 0.09);
        g.gain.exponentialRampToValueAtTime(k ? 0.03 : 0.05, t + k * 0.09 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + k * 0.09 + 4);
        o.connect(g);
        g.connect(out);
        o.start(t + k * 0.09);
        o.stop(t + k * 0.09 + 4.2);
      }.bind(this),
    );
  };

  RitualAudio.prototype.pluck = function (t, midi, vel) {
    var ctx = this.ctx;
    var o = ctx.createOscillator();
    var o2 = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'sine';
    o2.type = 'triangle';
    o.frequency.value = mtof(midi);
    o2.frequency.value = mtof(midi) * 2;
    var g2 = ctx.createGain();
    g2.gain.value = 0.18;
    o2.connect(g2);
    g2.connect(g);
    o.connect(g);
    g.connect(this.pluckBus);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    o.start(t);
    o2.start(t);
    o.stop(t + 2.3);
    o2.stop(t + 2.3);
  };

  // A muted piano: a few sine partials, a quick attack, a filter that closes as the note dies
  RitualAudio.prototype.felt = function (t, midi, vel) {
    var ctx = this.ctx;
    var f = mtof(midi);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.3;
    lp.frequency.setValueAtTime(2600, t);
    lp.frequency.exponentialRampToValueAtTime(650, t + 1.6);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel * 1.5, t + 0.006);
    g.gain.exponentialRampToValueAtTime(vel * 0.45, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);
    [[1, 1], [2, 0.3], [3, 0.09], [4.02, 0.04]].forEach(function (h) {
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * h[0];
      o.detune.value = (Math.random() - 0.5) * 6;
      var hg = ctx.createGain();
      hg.gain.value = h[1];
      o.connect(hg);
      hg.connect(lp);
      o.start(t);
      o.stop(t + 4);
    });
    lp.connect(g);
    g.connect(this.pluckBus);
  };

  // Rain on glass: a tiny filtered click, somewhere left or right
  RitualAudio.prototype.droplet = function (t) {
    var ctx = this.ctx;
    var s = ctx.createBufferSource();
    s.buffer = this.dropBuf;
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400 + Math.random() * 3800;
    bp.Q.value = 3 + Math.random() * 6;
    var g = ctx.createGain();
    var v = (0.004 + Math.random() * 0.016) * (RAIN[this.step] / RAIN[0]);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03 + Math.random() * 0.05);
    s.connect(bp);
    bp.connect(g);
    var out = this.master;
    if (ctx.createStereoPanner) {
      var p = ctx.createStereoPanner();
      p.pan.value = Math.random() * 1.6 - 0.8;
      g.connect(p);
      p.connect(out);
    } else g.connect(out);
    s.start(t);
    s.stop(t + 0.1);
  };

  // A far-off bell for the night drone: slightly inharmonic, mostly reverb
  RitualAudio.prototype.farBell = function (t) {
    var ctx = this.ctx;
    var chord = CHORDS[this.step] || CHORDS[0];
    var f = mtof(chord[3] + 12);
    var send = ctx.createGain();
    send.gain.value = 1;
    send.connect(this.verb);
    var dry = ctx.createGain();
    dry.gain.value = 0.25;
    dry.connect(this.master);
    [[1, 0.03], [2.76, 0.008], [5.4, 0.003]].forEach(function (h) {
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * h[0];
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(h[1], t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 7);
      o.connect(g);
      g.connect(send);
      g.connect(dry);
      o.start(t);
      o.stop(t + 7.2);
    });
  };

  // Notes are scheduled slightly ahead so timing stays steady
  RitualAudio.prototype.schedule = function () {
    if (!this.ctx || this.ctx.state !== 'running' || this.paused) return;
    var V = this.V;
    var i = this.step;
    var tempo = TEMPO[i] * V.tempo;
    var density = DENSITY[i] * V.density;
    var now = this.now();
    if (this.nextNote < now) this.nextNote = now + 0.1;
    while (this.nextNote < now + 0.3) {
      if (V.voice && density > 0 && Math.random() < density) {
        // gentle random walk, drifting lower as the steps go on
        var low = Math.max(0, 4 - i);
        var high = Math.min(SCALE.length - 1, 9 - i);
        this.noteIdx += Math.round((Math.random() - 0.55) * 3);
        if (this.noteIdx < low) this.noteIdx = low + 1;
        if (this.noteIdx > high) this.noteIdx = high - 1;
        var note = SCALE[this.noteIdx] + V.shift;
        if (V.voice === 'felt') {
          this.felt(this.nextNote, note, 0.042 + Math.random() * 0.025);
          // now and then a second, softer note above it
          if (Math.random() < 0.22) this.felt(this.nextNote + 0.02, SCALE[Math.min(SCALE.length - 1, this.noteIdx + 2)] + V.shift, 0.022);
        } else this.pluck(this.nextNote, note, 0.035 + Math.random() * 0.025);
      }
      this.nextNote += tempo ? 60 / tempo : 4 + Math.random() * 6;
    }
    if (V.rain && this.dropBuf) {
      if (this.nextDrop < now) this.nextDrop = now + 0.05;
      var rate = Math.max(3, 12 - i * 1.3); // drops per second, fewer as the rain eases
      while (this.nextDrop < now + 0.3) {
        this.droplet(this.nextDrop);
        this.nextDrop += -Math.log(1 - Math.random()) / rate;
      }
    }
    if (V.bell) {
      if (!this.nextBell) this.nextBell = now + 3 + Math.random() * 3;
      if (this.nextBell < now + 0.3) {
        this.farBell(Math.max(now + 0.02, this.nextBell));
        this.nextBell = now + 9 + Math.random() * 8;
      }
    }
  };

  // Water drop for the "Water" scene
  RitualAudio.prototype.drop = function () {
    if (!this.ctx || this.muted || this.V.fx === false) return;
    var ctx = this.ctx;
    var t = this.now() + 0.02;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'sine';
    var f = 900 + Math.random() * 500;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.45, t + 0.18);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.04, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g);
    g.connect(this.pluckBus);
    o.start(t);
    o.stop(t + 0.4);
  };

  // Called ~20×/s during the breathing step. level: 0 (empty) → 1 (full)
  RitualAudio.prototype.breath = function (level) {
    if (!this.ctx || !this.inBreath || !this.V.wash) return;
    var t = performance.now();
    if (t - this.lastParam < 45) return;
    this.lastParam = t;
    this.target(this.padFilter.frequency, 420 + level * 1250, 0.18);
    this.target(this.padGain.gain, (0.07 + level * 0.1) * this.V.pad, 0.2);
    this.target(this.washFilter.frequency, 260 + level * 950, 0.15);
    this.target(this.washGain.gain, (0.01 + level * 0.055) * this.V.wash, 0.15);
  };

  // 0..1 multiplier on the master level (the ending fade). Throttled like breath().
  RitualAudio.prototype.volume = function (v) {
    if (!this.ctx || this.paused) return;
    var t = performance.now();
    if (t - (this.lastVol || 0) < 120) return;
    this.lastVol = t;
    this.level = Math.max(0, Math.min(1, v));
    this.target(this.master.gain, this.muted ? 0.0001 : Math.max(0.0001, MASTER * this.level), 0.4);
  };

  // the narrator is speaking: bring the music down to about a third, then back up after
  RitualAudio.prototype.duck = function (on) {
    if (!this.ctx || !this.duckGain) return;
    this.target(this.duckGain.gain, on ? 0.35 : 1, on ? 0.08 : 0.5);
  };

  RitualAudio.prototype.setMuted = function (m) {
    this.muted = m;
    if (!this.ctx) return;
    if (!m && this.ctx.state === 'suspended' && !this.paused) this.ctx.resume();
    this.target(this.master.gain, m ? 0.0001 : Math.max(0.0001, MASTER * (this.level == null ? 1 : this.level)), 0.4);
  };

  RitualAudio.prototype.setBinaural = function (on) {
    this.binaural = on;
    if (this.ctx) this.target(this.binGain.gain, on ? 0.03 : 0, 1.5);
  };

  RitualAudio.prototype.pause = function () {
    if (!this.ctx) return;
    this.paused = true;
    this.target(this.master.gain, 0.0001, 0.15);
    var ctx = this.ctx;
    clearTimeout(this.suspendT);
    this.suspendT = setTimeout(function () {
      if (ctx.state === 'running') ctx.suspend();
    }, 700);
  };

  RitualAudio.prototype.resume = function () {
    if (!this.ctx) return;
    this.paused = false;
    clearTimeout(this.suspendT);
    var self = this;
    var go = function () {
      self.target(self.master.gain, self.muted ? 0.0001 : Math.max(0.0001, MASTER * (self.level == null ? 1 : self.level)), 0.6);
    };
    if (this.ctx.state === 'suspended') this.ctx.resume().then(go, go);
    else go();
  };

  // Fade out over a few seconds, then release the audio hardware
  RitualAudio.prototype.finish = function (seconds) {
    if (!this.ctx) return;
    var ctx = this.ctx;
    var s = seconds || 7;
    this.setStep(6, { silent: true });
    // one last soft bell for "Shift over.", heard even though the music has already faded
    if (!this.paused && !this.muted) {
      var bell = ctx.createGain();
      bell.gain.value = 0.7;
      bell.connect(this.verb);
      bell.connect(ctx.destination);
      this.chime(5, bell);
    }
    this.target(this.master.gain, 0.0001, s / 4);
    clearInterval(this.timer);
    setTimeout(function () {
      try {
        ctx.close();
      } catch (e) {}
    }, s * 1000 + 500);
    this.ctx = null;
  };

  RitualAudio.VARIANTS = Object.keys(VARIANTS);
  ES.RitualAudio = RitualAudio;
})();
