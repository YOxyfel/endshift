/**
 * Music for the ritual.
 *
 * Two kinds:
 *  1. ENDSHIFT's own soundtrack, generated in the browser (no files, no account, no ads).
 *     The variations live in src/assets/js/ritual-audio.js; their names and descriptions
 *     in src/content/<lang>/ritual.js → music.variants.
 *  2. The visitor's own music, played through an embedded Spotify, YouTube, SoundCloud
 *     or Apple Music player. Nothing from those services loads until the visitor picks one.
 *
 * Recommended picks are other people's public playlists, credited by name. Before launch,
 * run `npm run music:check` on a computer with internet access: it asks each service for
 * the title behind every link below and flags anything that no longer exists.
 * Links that stop working only affect that one pick; pasting a link always works.
 */

export default {
  enabled: true,

  // ENDSHIFT's own playlists on these services, once they exist. Shown first, marked as ours.
  // Example: spotify: { title: 'ENDSHIFT: after work', url: 'https://open.spotify.com/playlist/…' }
  ours: { spotify: null, youtube: null, soundcloud: null, apple: null },

  // tag → a short label in src/content/<lang>/ritual.js → music.tags
  recommended: {
    spotify: [
      { id: 'sp-peaceful-piano', title: 'Peaceful Piano', by: 'Spotify', tag: 'piano', url: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO' },
      { id: 'sp-ambient-relaxation', title: 'Ambient Relaxation', by: 'Spotify', tag: 'ambient', url: 'https://open.spotify.com/playlist/37i9dQZF1DX3Ogo9pFvBkY' },
      { id: 'sp-lofi-beats', title: 'lofi beats', by: 'Spotify', tag: 'lofi', url: 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn' },
      { id: 'sp-sleep', title: 'Sleep', by: 'Spotify', tag: 'sleep', url: 'https://open.spotify.com/playlist/37i9dQZF1DWZd79rJ6a7lp' },
    ],
    youtube: [
      { id: 'yt-lofi-relax', title: 'lofi hip hop radio: beats to relax/study to', by: 'Lofi Girl', tag: 'lofi', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' },
      { id: 'yt-lofi-sleep', title: 'lofi hip hop radio: beats to sleep/chill to', by: 'Lofi Girl', tag: 'sleep', url: 'https://www.youtube.com/watch?v=rUxyKA_-grg' },
    ],
    soundcloud: [{ id: 'sc-chillhop', title: 'Chillhop Music', by: 'Chillhop', tag: 'lofi', url: 'https://soundcloud.com/chillhopdotcom' }],
    apple: [],
  },
};
