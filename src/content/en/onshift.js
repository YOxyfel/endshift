// "Still on shift": what work mode does while it's on. Every page but the ritual, Contact and the
// legal pages gets interrupted the way a shift that won't end interrupts you: messages too big to
// ignore, a meeting that starts by itself, someone leaning in. The longer it stays on, the more
// absurd it gets. The switch in the header is always the way out. At the absurd end, Finance
// approves a 50% code that has to be collected the hard way (the Overtime gauntlet).
export default ({ cfg }) => {
  const R = cfg.onshift?.reward || { percent: 50 };
  return {
    // the people who won't stop
    people: { dana: 'Dana', petar: 'Petar', mira: 'Mira', channel: '#everyone', finance: 'Finance', hr: 'HR', it: 'IT' },
    // slips, by level. {time} is the clock
    pings: {
      1: [
        { from: 'dana', text: 'quick one — you around?' },
        { from: 'petar', text: 'did you see my message?' },
        { from: 'mira', text: 'no rush!! but today if possible' },
        { from: 'channel', text: 'reminder: timesheets by 18:00' },
      ],
      2: [
        { from: 'dana', text: 'JUST CHECKING YOU SAW THIS' },
        { from: 'petar', text: 'can we jump on a call?' },
        { from: 'finance', text: 'URGENT (not urgent)' },
        { from: 'hr', text: 'quick survey, 2 min (it’s 11 min)' },
        { from: 'mira', text: 'per my last message' },
      ],
      3: [
        { from: 'dana', text: '???' },
        { from: 'petar', text: 'pls' },
        { from: 'mira', text: 'any update' },
        { from: 'channel', text: '@everyone @everyone @everyone' },
        { from: 'it', text: 'your laptop will restart in 60 seconds' },
        { from: 'dana', text: 'sorry one more' },
      ],
    },
    // what they say when you flick a slip away
    replies: ['ok np!!', 'actually one more thing', 'ignore my last', 'as per my last message', 'sorry, one more', 'thx!! (not done)'],
    later: 'Later',
    clockOut: 'Clock out',
    flick: 'Flick it away',
    pile: 'Pings ignored: {n}',

    meeting: {
      invite: 'Quick sync · 15 min',
      startingIn: 'Starting in {n}…',
      decline: 'Decline',
      join: 'Join',
      rescheduled: 'Rescheduled: in 2 minutes.',
      joining: 'Joining…',
      title: 'Quick sync',
      you: 'You',
      cameraOff: 'Camera off',
      muted: 'You’re on mute',
      speaking: 'speaking',
      sharing: '{name} is sharing a screen',
      captions: [
        'can everyone see my screen?',
        '[inaudible]',
        'you’re on mute',
        'let’s take this offline',
        'quick one before we wrap',
        'sorry, go ahead — no, you go',
        'I think we lost Petar',
        'let’s circle back on that',
        'can we park this?',
        'two minutes, promise',
      ],
      mute: 'Mute',
      muteNote: 'You’re already muted.',
      share: 'Share',
      shareNote: 'Dana is already sharing.',
      leave: 'Leave',
      leaveSure: 'Leave? Three people are still talking.',
      leaveAnyway: 'Leave anyway',
      stay: 'Stay',
      left: 'You left. Petar is still talking.',
      slideOf: 'Slide {i} of {n}',
      next: 'Next slide',
      lost: 'Connection lost… reconnecting (back two slides)',
      slides: [
        'Q3 learnings', 'Synergies', 'Alignment', 'Next steps', 'Next steps (cont.)', 'Parking lot', 'Action items', 'Blockers',
        'Wins!', 'The numbers', 'More numbers', 'A chart', 'The same chart', 'Timeline', 'Risks', 'Mitigations',
        'Open questions', 'Decisions (none)', 'Follow-ups', 'Feedback', 'Any other business', 'AOB (cont.)', 'Thank you', 'Questions?',
      ],
    },

    lean: { say: 'Got a sec?', gone: 'Never mind.' },
    spinner: 'Not responding…',
    rere: 'Re: Re: Re:',
    survey: { q: 'How was your shift today?', thanks: 'Thanks! Now please rate the rating experience.', done: 'Noted. Nothing will change.' },
    timesheet: { title: 'You have 0.25 h unlogged', label: 'Hours worked', submit: 'Submit', reset: 'Field reset by the system.', done: 'Submitted to nobody.' },

    // the way out
    off: { line: 'They can wait till morning.', stat: '{n} pings ignored.' },

    // the 50% (the Overtime gauntlet)
    overtime: {
      offer: { from: 'finance', text: `Your ${R.percent}% is approved. Collect it from the printer.`, go: 'Collect', later: 'Later' },
      hud: `OVERTIME · ${R.percent}% off`,
      stamps: 'Stamps',
      giveUp: 'Give up',
      gaveUp: 'Fine. Finance will ask again.',
      stages: {
        printer: {
          title: 'Printer: paper jam',
          how: 'Shake the slip to unjam it.',
          howKeys: 'Keyboard: tap ← and → in turn.',
          toner: 'Printing… Error: toner low. Shake harder.',
          done: 'Printed. Stamp 1 of 4.',
        },
        approve: {
          title: 'Hold to approve',
          how: 'Hold for 10 seconds. Don’t let go, whatever lands on it.',
          howKeys: 'Keyboard: hold Space.',
          reset: 'Approval reset: Dana had a question.',
          done: 'Approved. Stamp 2 of 4.',
          covers: ['quick one', 'pls', 'any update', '???', 'ok np!!', 'you around?'],
        },
        deck: {
          title: 'Dana is presenting',
          how: '{n} slides. The stamp is on the last one.',
          done: 'Stamp 3 of 4. Dana left the call.',
          stamp: 'APPROVED',
        },
        catch: {
          title: 'The code doesn’t want to be caught',
          how: 'Corner it.',
          howTouch: 'Tap it until it gives up.',
          howKeys: 'Keyboard: focus it and press Enter five times.',
          tired: 'fine.',
          done: 'Stamp 4 of 4.',
        },
      },
      claim: {
        stamp: `OVERTIME · ${R.percent}% off`,
        title: 'You made it through the shift.',
        text: `${R.percent}% off one RESET order from Batch #001. Leave your email and the code comes when preorders open. One per person.`,
        submit: `Send me my ${R.percent}%`,
        label: 'Email for your code',
        note: 'You’ll also get the founding list emails. Unsubscribe in one click.',
        doneTitle: `Saved. Your ${R.percent}% is yours.`,
        doneText: 'We’ll email your code when preorders open. Check your inbox to confirm. Now clock out.',
        terms: 'Draft terms: being finalised before preorders open.',
        termsLink: 'Full terms',
      },
    },
  };
};
