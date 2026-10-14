/* ENDSHIFT ritual: your own music. Plays a Spotify, YouTube, SoundCloud or Apple Music link
   in a small docked player, and keeps it in step with the ritual where the service allows:

                 start/pause with the ritual   lower step by step   fade at the end
     YouTube     yes                           yes (not on iPhone)  yes
     SoundCloud  yes                           yes                  yes
     Spotify     yes                           no                   pauses at the end
     Apple Music no (press play yourself)      no                   no

   Nothing from these services loads until the visitor picks something. The choice of
   service is remembered on this device (localStorage es:embeds) so it can load next time.
   Exposes ES.RitualMusic. */
(function () {
  'use strict';
  var ES = (window.ES = window.ES || {});

  /* Links ------------------------------------------------------------------------------ */
  var ID = /^[A-Za-z0-9_-]{6,}$/;
  function yt(v, list) {
    v = v && ID.test(v) ? v : null;
    list = list && ID.test(list) ? list : null;
    return v || list ? { provider: 'youtube', videoId: v, list: list } : null;
  }
  function parse(raw) {
    var s = String(raw || '').trim();
    if (!s) return null;
    var m = /^spotify:(playlist|album|track|episode|show|artist):([A-Za-z0-9]{10,})$/.exec(s);
    if (m) return { provider: 'spotify', uri: 'spotify:' + m[1] + ':' + m[2] };
    var u;
    try {
      u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s);
    } catch (e) {
      return null;
    }
    var host = u.hostname.toLowerCase().replace(/^(www|m)\./, '');
    if (host === 'open.spotify.com' || host === 'play.spotify.com') {
      m = /\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?(?:embed\/)?(playlist|album|track|episode|show|artist)\/([A-Za-z0-9]+)/.exec(u.pathname);
      return m ? { provider: 'spotify', uri: 'spotify:' + m[1] + ':' + m[2] } : null;
    }
    if (host === 'youtu.be') return yt(u.pathname.slice(1).split('/')[0], u.searchParams.get('list'));
    if (host === 'youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
      var v = u.searchParams.get('v');
      m = /^\/(?:embed|live|shorts|v)\/([A-Za-z0-9_-]{6,})/.exec(u.pathname);
      if (!v && m) v = m[1];
      return yt(v, u.searchParams.get('list'));
    }
    if (host === 'soundcloud.com' || host === 'on.soundcloud.com') {
      var p = u.pathname.replace(/\/+$/, '');
      return p.length > 1 ? { provider: 'soundcloud', url: 'https://' + host + p } : null;
    }
    if (host === 'music.apple.com' || host === 'embed.music.apple.com') {
      if (!/\/(playlist|album|song|station|music-video)\//.test(u.pathname)) return null;
      return { provider: 'apple', embed: 'https://embed.music.apple.com' + u.pathname + (u.search || '') };
    }
    return null;
  }

  /* Third-party scripts, loaded once and only when needed --------------------------------- */
  var scripts = {};
  function loadScript(src) {
    if (scripts[src]) return scripts[src];
    scripts[src] = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = res;
      s.onerror = function () {
        delete scripts[src];
        rej(new Error('script'));
      };
      document.head.appendChild(s);
    });
    return scripts[src];
  }
  function withTimeout(p, ms) {
    return new Promise(function (res, rej) {
      var t = setTimeout(function () { rej(new Error('timeout')); }, ms);
      p.then(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); });
    });
  }
  var ytApi = null, spApi = null;
  function youtubeApi() {
    if (!ytApi) {
      ytApi = withTimeout(
        new Promise(function (res, rej) {
          if (window.YT && window.YT.Player) return res(window.YT);
          var prev = window.onYouTubeIframeAPIReady;
          window.onYouTubeIframeAPIReady = function () {
            if (typeof prev === 'function') try { prev(); } catch (e) {}
            res(window.YT);
          };
          loadScript('https://www.youtube.com/iframe_api').catch(rej);
        }),
        15000,
      );
      ytApi.catch(function () { ytApi = null; });
    }
    return ytApi;
  }
  function spotifyApi() {
    if (!spApi) {
      spApi = withTimeout(
        new Promise(function (res, rej) {
          window.onSpotifyIframeApiReady = function (api) { res(api); };
          loadScript('https://open.spotify.com/embed/iframe-api/v1').catch(rej);
        }),
        15000,
      );
      spApi.catch(function () { spApi = null; });
    }
    return spApi;
  }
  function soundcloudApi() {
    return withTimeout(
      loadScript('https://w.soundcloud.com/player/api.js').then(function () {
        if (!window.SC || !window.SC.Widget) throw new Error('sc');
        return window.SC;
      }),
      15000,
    );
  }

  /* Players: each one gets a box and returns a small common interface ----------------------- */
  // ev: { ready(), state(playing), error() }
  function makeYouTube(box, link, ev) {
    var holder = document.createElement('div');
    box.appendChild(holder);
    var player = null;
    var api = {
      canVolume: true,
      play: function () { if (player && player.playVideo) player.playVideo(); },
      pause: function () { if (player && player.pauseVideo) player.pauseVideo(); },
      setVolume: function (v) { if (player && player.setVolume) player.setVolume(Math.round(v * 100)); },
      destroy: function () { try { if (player) player.destroy(); } catch (e) {} },
    };
    youtubeApi().then(function (YT) {
      var vars = { playsinline: 1, rel: 0, modestbranding: 1, autoplay: 0, origin: location.origin };
      if (link.list) {
        vars.listType = 'playlist';
        vars.list = link.list;
      }
      player = new YT.Player(holder, {
        host: 'https://www.youtube-nocookie.com',
        width: '100%',
        height: '100%',
        videoId: link.videoId || undefined,
        playerVars: vars,
        events: {
          onReady: function () { ev.ready(); },
          onStateChange: function (e) { ev.state(e.data === 1); },
          onError: function () { ev.error(); },
        },
      });
    }, ev.error);
    return api;
  }

  function makeSpotify(box, link, ev) {
    var holder = document.createElement('div');
    box.appendChild(holder);
    var ctrl = null, started = false, paused = true;
    var api = {
      canVolume: false,
      play: function () {
        if (!ctrl) return;
        if (!started) {
          started = true;
          ctrl.play();
        } else ctrl.resume();
      },
      pause: function () { if (ctrl && !paused) ctrl.pause(); },
      setVolume: function () {},
      destroy: function () { try { if (ctrl) ctrl.destroy(); } catch (e) {} },
    };
    spotifyApi().then(function (IFrameAPI) {
      IFrameAPI.createController(holder, { uri: link.uri, width: '100%', height: '152' }, function (c) {
        ctrl = c;
        c.addListener('ready', function () { ev.ready(); });
        c.addListener('playback_update', function (e) {
          if (!e || !e.data) return;
          paused = !!e.data.isPaused;
          if (!paused) started = true;
          ev.state(!paused);
        });
      });
    }, ev.error);
    return api;
  }

  function makeSoundCloud(box, link, ev) {
    var f = document.createElement('iframe');
    f.title = 'SoundCloud';
    f.allow = 'autoplay; encrypted-media';
    f.setAttribute('loading', 'eager');
    f.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(link.url) + '&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false&color=%23f2a84b';
    box.appendChild(f);
    var w = null;
    var api = {
      canVolume: true,
      play: function () { if (w) w.play(); },
      pause: function () { if (w) w.pause(); },
      setVolume: function (v) { if (w) w.setVolume(Math.round(v * 100)); },
      destroy: function () {},
    };
    soundcloudApi().then(function (SC) {
      w = SC.Widget(f);
      w.bind(SC.Widget.Events.READY, function () { ev.ready(); });
      w.bind(SC.Widget.Events.PLAY, function () { ev.state(true); });
      w.bind(SC.Widget.Events.PAUSE, function () { ev.state(false); });
      w.bind(SC.Widget.Events.FINISH, function () { ev.state(false); });
      w.bind(SC.Widget.Events.ERROR, function () { ev.error(); });
    }, ev.error);
    return api;
  }

  function makeApple(box, link, ev) {
    var f = document.createElement('iframe');
    f.title = 'Apple Music';
    f.allow = 'autoplay *; encrypted-media *; fullscreen *; clipboard-write';
    f.setAttribute('sandbox', 'allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation');
    f.src = link.embed;
    f.addEventListener('load', function () { ev.ready(); });
    box.appendChild(f);
    return { canVolume: false, noControl: true, play: function () {}, pause: function () {}, setVolume: function () {}, destroy: function () {} };
  }

  var MAKERS = { youtube: makeYouTube, spotify: makeSpotify, soundcloud: makeSoundCloud, apple: makeApple };
  var HEIGHTS = { youtube: 200, spotify: 152, soundcloud: 166, apple: 175 };

  /* Consent memory --------------------------------------------------------------------------- */
  var CONSENT = 'es:embeds';
  function consents() {
    try { return JSON.parse(localStorage.getItem(CONSENT) || '{}') || {}; } catch (e) { return {}; }
  }
  function remember(provider) {
    var c = consents();
    c[provider] = Date.now();
    try { localStorage.setItem(CONSENT, JSON.stringify(c)); } catch (e) {}
  }

  /* The docked player ------------------------------------------------------------------------- */
  function RitualMusic(dock, strings) {
    this.dock = dock;
    this.S = strings || {};
    this.frame = dock.querySelector('[data-dock-frame]');
    this.titleEl = dock.querySelector('[data-dock-title]');
    this.serviceEl = dock.querySelector('[data-dock-service]');
    this.noteEl = dock.querySelector('[data-dock-note]');
    this.toggleBtn = dock.querySelector('[data-dock-toggle]');
    this.player = null;
    this.link = null;
    this.ready = false;
    this.playing = false;
    this.level = 1; // where the ritual wants the volume
    this.shown = 1; // where it is now (ramped)
    this.muted = false;
    this.listeners = [];
    var self = this;
    if (this.toggleBtn) this.toggleBtn.addEventListener('click', function () { self.setCollapsed(!self.collapsed); });
    var rm = dock.querySelector('[data-dock-remove]');
    if (rm) rm.addEventListener('click', function () { self.clear(true); });
  }

  RitualMusic.parse = parse;
  RitualMusic.consents = consents;

  RitualMusic.prototype.on = function (fn) { this.listeners.push(fn); };
  RitualMusic.prototype.emit = function (type) {
    var self = this;
    this.listeners.forEach(function (fn) { try { fn(type, self); } catch (e) {} });
  };

  RitualMusic.prototype.note = function (text, loud) {
    if (!this.noteEl) return;
    this.noteEl.textContent = text || '';
    this.noteEl.hidden = !text;
    this.dock.classList.toggle('has-note', !!text);
    this.dock.classList.toggle('is-asking', !!loud);
  };

  RitualMusic.prototype.setCollapsed = function (c) {
    this.collapsed = !!c;
    this.dock.classList.toggle('is-collapsed', this.collapsed);
    if (this.toggleBtn) {
      this.toggleBtn.setAttribute('aria-expanded', this.collapsed ? 'false' : 'true');
      var l = this.toggleBtn.querySelector('[data-dock-toggle-label]');
      if (l) l.textContent = this.collapsed ? this.S.expand : this.S.collapse;
    }
  };

  // link: result of parse(); meta: { title, service, pick }
  RitualMusic.prototype.load = function (link, meta) {
    if (!link || !MAKERS[link.provider]) return false;
    this.clear(false);
    remember(link.provider);
    this.link = link;
    this.meta = meta || {};
    this.ready = false;
    this.playing = false;
    this.failed = false;
    this.frame.style.height = HEIGHTS[link.provider] + 'px';
    this.dock.setAttribute('data-provider', link.provider);
    if (this.serviceEl) this.serviceEl.textContent = (this.S.services && this.S.services[link.provider]) || link.provider;
    if (this.titleEl) this.titleEl.textContent = this.meta.title || '';
    this.dock.hidden = false;
    this.setCollapsed(false);
    this.note(this.S.loading);
    var self = this;
    var box = document.createElement('div');
    box.className = 'music-dock__player';
    this.frame.appendChild(box);
    var ev = {
      ready: function () {
        if (self.player !== player) return;
        self.ready = true;
        self.note('');
        if (self.player.canVolume) self.player.setVolume(self.muted ? 0 : self.shown);
        if (self.wantPlay && !self.player.noControl) self.player.play();
        self.emit('ready');
      },
      state: function (on) {
        if (self.player !== player) return;
        self.playing = on;
        self.dock.classList.toggle('is-playing', on);
        if (on) self.note('');
        self.emit(on ? 'play' : 'pause');
      },
      error: function () {
        if (self.player !== player) return;
        self.failed = true;
        self.note(self.S.failed, true);
        self.emit('error');
      },
    };
    var player = (this.player = MAKERS[link.provider](box, link, ev));
    this.emit('load');
    return true;
  };

  RitualMusic.prototype.clear = function (byUser) {
    if (this.player) this.player.destroy();
    this.player = null;
    this.link = null;
    this.ready = false;
    this.playing = false;
    clearInterval(this.rampT);
    this.frame.innerHTML = '';
    this.dock.hidden = true;
    this.dock.classList.remove('is-playing', 'is-asking', 'has-note');
    if (byUser) this.emit('clear');
  };

  RitualMusic.prototype.loaded = function () { return !!this.player && !this.failed; };
  RitualMusic.prototype.provider = function () { return this.link && this.link.provider; };
  RitualMusic.prototype.canVolume = function () { return !!(this.player && this.player.canVolume); };

  // Called inside the click that starts the ritual, so browsers allow it to play.
  RitualMusic.prototype.play = function () {
    if (!this.player) return;
    var self = this;
    if (this.player.noControl) {
      this.note(this.S.pressPlay, true);
      return;
    }
    this.wantPlay = true;
    if (this.ready) this.player.play(); // otherwise ready() starts it
    // Some browsers refuse to start a player from outside it: then ask, and show the player
    clearTimeout(this.askT);
    this.askT = setTimeout(function () {
      if (self.player && !self.playing && self.wantPlay) {
        self.setCollapsed(false);
        self.note(self.S.pressPlay, true);
      }
    }, 3500);
  };

  RitualMusic.prototype.pause = function () {
    this.wantPlay = false;
    clearTimeout(this.askT);
    if (this.player && this.playing) this.player.pause();
  };

  RitualMusic.prototype.resume = function () {
    if (this.player && !this.player.noControl) {
      this.wantPlay = true;
      if (!this.playing) this.player.play();
    }
  };

  // Volume the ritual asks for (0..1). Ramped, so changes are never sudden.
  RitualMusic.prototype.setLevel = function (v) {
    this.level = Math.max(0, Math.min(1, v));
    if (!this.canVolume()) return;
    var self = this;
    if (this.rampT) return;
    this.rampT = setInterval(function () {
      var target = self.muted ? 0 : self.level;
      var d = target - self.shown;
      if (Math.abs(d) < 0.01) {
        self.shown = target;
        clearInterval(self.rampT);
        self.rampT = 0;
      } else self.shown += d * 0.18;
      if (self.player && self.ready) self.player.setVolume(self.shown);
    }, 120);
  };

  RitualMusic.prototype.setMuted = function (m) {
    this.muted = !!m;
    if (this.canVolume()) this.setLevel(this.level);
    else if (m) this.pause();
    else this.resume();
  };

  // The end of the ritual: fade where possible, then stop.
  RitualMusic.prototype.end = function (ms) {
    var self = this;
    this.wantPlay = false;
    clearTimeout(this.askT);
    if (!this.player) return;
    if (this.canVolume()) {
      this.setLevel(0);
      setTimeout(function () {
        if (self.player) self.player.pause();
        self.level = 1;
        self.shown = 1;
        if (self.player && self.ready) self.player.setVolume(1);
      }, ms || 4000);
    } else this.pause();
  };

  ES.RitualMusic = RitualMusic;
})();
