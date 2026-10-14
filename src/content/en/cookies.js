export default ({ cfg }) => {
  const needsConsent = cfg.analytics.provider === 'ga4';
  return {
    meta: { title: 'Cookie preferences | ENDSHIFT', description: 'What ENDSHIFT stores in your browser, and the switches to change it.' },
    title: 'Cookie preferences',
    lead: needsConsent
      ? 'One optional cookie-based tool, off until you switch it on. Everything else stays on your device.'
      : 'This site doesn’t use tracking cookies. A few small preferences are saved in your browser so the site remembers them.',
    analytics: {
      title: 'Analytics with cookies',
      hint: 'Google Analytics. Helps us see which pages are useful. Off unless you switch it on.',
      saved: 'Saved',
    },
    cookieless:
      cfg.analytics.provider === 'none'
        ? 'Right now there are no analytics at all.'
        : `Visit counts come from ${cfg.analytics.provider === 'plausible' ? 'Plausible' : 'Umami'}, which works without cookies and without collecting personal data, so there’s nothing to switch on or off.`,
    calm: { title: 'Low-stimulation mode', hint: 'No motion, softer contrast. Saved on this device.' },
    storedTitle: 'What’s stored on this device',
    stored: [
      ['es:calm', 'Whether low-stimulation mode is on.'],
      ['es:ritual', 'Your ritual settings and how many times you’ve finished it.'],
      ['es:ritual-run', 'Where you paused the ritual, for this browser session only.'],
      ['es:consent-analytics', 'Your analytics choice, if the site asks for one.'],
      ['es:joined', 'That you joined a list on this device, so we don’t ask twice.'],
      ['es:lists', 'Which lists you joined from this device, and the day, so their forms don’t ask again. Your email is not stored here.'],
      ['es:founder', 'Your founder number and the day you confirmed, for your founder card.'],
      ['es:job', 'The work you picked under “What do you do?”, so the game plays your job.'],
      ['es:push', 'That the phone reminder is on, and its time, so the ritual shows it.'],
      ['es:lang-hint', 'That you answered the “read it in Bulgarian” note, so it doesn’t show again.'],
      ['es:shift', 'Whether you switched work mode off, and when. Resets at 05:00.'],
      ['es:opening', 'That you’ve seen the opening on the home page, so it doesn’t play again.'],
      ['es:embeds', 'Which music services you chose in the ritual, so their player can load next time.'],
      ['es:out', 'Your usual end of shift, if you changed it on the home page.'],
      ['es:game', 'That you found today’s switch on the home page, and how fast, so the evening shows instead of the game. Replaced the next day.'],
      ['es:exp', 'Which version of a page you see while we compare two versions of something (a line of text, for example).'],
      ['es:reward', 'That you claimed the game’s reward on this device, so the form isn’t shown again. Your email is not stored here.'],
    ],
    storedNote: 'None of this is sent to us.',
    clear: 'Clear everything ENDSHIFT saved here',
    cleared: 'Cleared',
  };
};
