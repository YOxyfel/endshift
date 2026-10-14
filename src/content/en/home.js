// Home page copy. Product facts come from config via the helpers in ctx.

// "magnesium, L-theanine and valerian": names from the formula config, lower-cased mid-sentence
// unless they start with an abbreviation (L-theanine).
const mid = (s) => (/^\p{Lu}\p{Ll}/u.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
const and = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a.at(-1)}`);
// …and a hyphenated name (L-theanine) is never split at its hyphen
const keep = (s) => (s.includes('-') ? `<span class="nowrap">${s}</span>` : s);

export default ({ cfg, state, fmt, t, formula }) => {
  const named = (status) => formula.ingredients.filter((i) => i.status === status).map((i) => t(i.name));
  return {
    meta: {
      title: 'ENDSHIFT: an after-work ritual for when your shift ends but your brain doesn’t',
      description:
        'A free 20-minute after-work ritual and RESET, an evening capsule in development. ENDSHIFT marks the line between work mode and the rest of your evening.',
    },

    // One screen right after the game: what ENDSHIFT is, for people who won't scroll the whole film
    inShort: {
      kicker: 'In short',
      title: 'What ENDSHIFT is, in three lines',
      items: [
        { k: 'Tonight', v: 'A free 20-minute ritual that walks you from work mode to sleep. In your browser, no account.' },
        { k: 'Later', v: 'RESET, an evening capsule for one step of it. Still in development; nothing is for sale.' },
        { k: 'Now', v: 'The founding list, free. At 150 sign-ups, everyone on it gets an email to pay, and the first batch is made for them.' },
      ],
      // Every page as a bubble, for people who'd rather not scroll the film. `to` is a page id
      // (`hash` an anchor on it), `slot` where it sits: 'c' is the middle, 0–7 go round clockwise
      // from the top. The list order is the keyboard order. `text` shows when a bubble is enlarged.
      go: {
        title: 'Skip the walkthrough',
        items: [
          { to: 'ritual', slot: 'c', name: 'Free ritual', text: '20, 10 or 5 minutes. Start tonight.' },
          { to: 'ritual', hash: 'plan', slot: 6, name: 'The 20 minutes', text: 'Seven steps, minute by minute.' },
          { to: 'ritual-card', slot: 7, name: 'Ritual card', text: 'The steps on one page, to print.' },
          { to: 'reset', slot: 0, name: 'RESET', text: 'An evening capsule for the water step. In development.' },
          {
            to: 'formula',
            slot: 1,
            name: 'Formula',
            text: state.formulaConfirmed ? `In it: ${and(named('included').map(mid).map(keep))}.` : `Shortlist: ${named('candidate').map(mid).map(keep).join(', ')}.`,
          },
          { to: 'batch', slot: 2, name: 'Batch #001', text: `Free to join. At ${cfg.batch.founderGoal} sign-ups, an email to pay, then the first run.` },
          { to: 'story', slot: 3, name: 'Story', text: 'The idea, and every decision since.' },
          { to: 'faq', slot: 4, name: 'FAQ', text: 'Shipping, refunds, safety.' },
          { to: 'journal', slot: 5, name: 'Journal', text: 'Guides for switching off after work.' },
        ],
      },
      film: 'Or scroll on: the evening, drawn. About two minutes.',
      watch: 'Or press play and watch it with sound. About four minutes.',
      jobQ: 'What do you do?',
      jobHint: 'Pick one and the game plays your job, and the ritual suggests the right version.',
      jobSaved: 'Got it. Next time the game plays your job.',
      jobs: [
        ['kitchen', 'Kitchen'],
        ['shop', 'Shop'],
        ['office', 'Office'],
        ['ward', 'Care, nights'],
        ['depot', 'Delivery'],
        ['clients', 'Freelance'],
      ],
    },
    welcome: { back: (n) => `Evening ${n}?`, cta: 'Start your 20 minutes' },

    hero: {
      // Notification fragments that race through the hero, then slow down and fade.
      pings: [
        ['<b>Manager</b> quick question', 'Can you cover Saturday?', 'Re: Re: Re: deadline', '14 unread', 'Table 6 wants the bill', '<b>Work chat</b> @you'],
        ['Order #4471: customer called again', 'Reminder: stand-up 09:00', 'Did you send the file?', 'Seen 21:14', 'Inventory count tomorrow'],
        ['Assignment due 23:59', 'Build failed', 'Can we hop on a call?', '1 missed call: Work', 'Delivery window 18:00–20:00'],
        ['“Just one small change”', 'Shift swap?', 'Still online?', 'New comment on your draft', '3 new tickets'],
        ['Rota for next week is up', 'Who closed last night?', 'Quick sync?', 'Your 1:1 moved to 08:30', 'Low battery'],
      ],
      out: cfg.shiftOut,
      outLabel: 'Out',
      nowLabel: 'Now',
      stampSr: (out) => `Your shift ended at ${out}.`,
      stillOnShift: 'Still on shift? Save this page for tonight.',
      line1: 'Your shift ended.',
      line2: 'Your brain didn’t.',
      sub: 'ENDSHIFT is a free 20-minute ritual for the end of your workday. RESET, an evening capsule to go with it, is being built in public.',
      micro: 'Free. No account.',
    },

    // The opening montage (first visit only). Times run fast, then everything stops.
    intro: {
      skip: 'Skip',
      // five drawn rooms (the same drawings as the rest of the site), about six seconds;
      // `scene` is the line drawing used if a picture hasn't loaded
      scenes: [
        { view: 'bus', scene: 'bus', time: '18:40', label: 'Bus home' },
        { view: 'hall', scene: 'hallway', time: '19:25', label: 'Keys down. Head still at work' },
        { view: 'sofa', scene: 'kitchen', time: '20:30', label: 'Sofa. Still replying' },
        { view: 'desk', scene: 'desk', time: '23:10', label: 'One more thing' },
        { view: 'bed', scene: 'bed', time: '00:40', label: 'Bed. Brain: on' },
      ],
    },

    recog: {
      title: ['Physically home.', 'Mentally still at work.'],
      lines: [
        'The customer.',
        'The deadline.',
        'The message you forgot to send.',
        'The thing you should have said differently.',
        'Somehow it all followed you home.',
      ],
      scenesLabel: 'An ordinary evening after work',
      scrollHint: 'Swipe for the rest of the evening',
      scenes: [
        { time: '18:40', icon: 'bus', place: 'Bus home, back row', text: 'Replaying what the customer said. Word for word.' },
        { time: '19:25', icon: 'bag', place: 'Hallway', text: 'Courier bag down. Legs off shift. Head still doing deliveries.' },
        { time: '20:30', icon: 'phone', place: 'Sofa', text: 'Checked the work chat. Again. Nobody asked you to.' },
        { time: '21:50', icon: 'receipt', place: 'Kitchen', text: 'Eight hours of service done. Still hearing the order printer.' },
        { time: '23:10', icon: 'laptop', place: 'Desk lamp', text: 'Laptop shut. The code is still open in your head.' },
        { time: '00:40', icon: 'moon', place: 'Bed', text: 'Body: finished. Brain: opening fourteen new tabs.' },
      ],
    },

    idea: {
      title: 'Your day needs an ending.',
      steps: [
        { key: 'work', word: 'Work', note: 'Fluorescent light, notifications, other people’s problems.' },
        { key: 'shift', word: 'ENDSHIFT', note: 'Twenty minutes and a few deliberate moves that mark the line.' },
        { key: 'you', word: 'Your evening', note: 'The part of the day that is actually yours.' },
      ],
      coda: ['Not another productivity system.', 'Not a miracle sleep cure.', 'Just a deliberate boundary between “on” and “off.”'],
    },

    product: {
      overline: 'ENDSHIFT RESET',
      name: 'RESET',
      lead: 'A simple evening capsule designed to fit into the ENDSHIFT ritual.',
      specs: [
        ['Format', 'Capsules'],
        ['Supply', cfg.product.servingsConfirmed ? `${cfg.product.servings} servings` : `${cfg.product.servings} servings, planned`],
        ['When', 'In the evening, after your shift. Whenever that is.'],
        ['Formula', state.formulaConfirmed ? 'Final. Every dose is published.' : 'Final formula currently being selected'],
        ['Price', fmt.priceLine()],
      ],
      seeMore: 'Everything about RESET',
    },

    ritual: {
      title: ['The product is optional.', 'The ritual is free.'],
      copy: ['Try the 20-minute shutdown sequence tonight.', 'If it helps, come back tomorrow.', 'If it doesn’t, you lost 20 minutes and paid us nothing.'],
      previewLabel: 'What happens in the 20 minutes',
      dialCaption: 'minutes, start to finish',
    },

    notMagic: {
      title: ['RESET is not magic.', 'Good.'],
      lead: 'ENDSHIFT is not here to knock you out, replace sleep hygiene, or pretend one capsule fixes your life. It is one part of a repeatable transition ritual.',
      isTitle: 'What it is',
      isntTitle: 'What it isn’t',
      is: [
        'A cue that the workday is over, repeated every evening.',
        'An optional step inside a free ritual that works without it.',
        'A formula with every ingredient and dose published, once it’s final.',
      ],
      isnt: ['A sleeping pill.', 'A treatment for insomnia, anxiety or anything else.', 'A replacement for rest, sleep or real help.'],
      care: 'If your evenings are hard because of how you feel, not just because work ran late, please talk to a doctor. A capsule is the wrong tool for that.',
      formulaLine: 'Curious what’s being considered?',
    },

    batch: {
      title: 'Batch #001',
      lead: 'ENDSHIFT starts when enough people decide it should exist.',
      how:
        state.statusIndex >= 1
          ? [
              { title: 'Preorder as a founder.', text: `${state.hasPrice ? `${fmt.price(cfg.product.price)}, charged when you preorder.` : 'Charged when you preorder.'} Refunded in full if the batch doesn’t go ahead.` },
              {
                title: `At ${cfg.batch.founderGoal} founders, we make ${cfg.batch.manufacturingMOQ} units.`,
                text: `The manufacturer’s minimum run is ${cfg.batch.manufacturingMOQ}.${cfg.batch.productionLeadTime ? ` Production takes ${t(cfg.batch.productionLeadTime)}.` : ''}`,
              },
              { title: 'Founders’ orders ship first.', text: cfg.batch.estimatedDispatch ? `Current estimate: ${t(cfg.batch.estimatedDispatch)}. Every change goes to your inbox first.` : 'With a date, by email, before anyone else.' },
            ]
          : [
              { title: 'Join the founding list.', text: 'Free. No card, no commitment.' },
              {
                title: `At ${cfg.batch.founderGoal} sign-ups, an email to pay.`,
                text: 'Everyone on the list gets it. Formula, price, dispatch date and refund terms are published before anyone pays.',
              },
              {
                title: 'The first batch is made for the founders who pay.',
                text: `The manufacturer’s minimum run is ${cfg.batch.manufacturingMOQ}. If it doesn’t go ahead, every payment is refunded in full.`,
              },
            ],
      formTitle: 'Get Batch #001 updates',
      more: 'How the founding batch works',
    },

    founder: {
      title: 'This probably should have stayed a random Instagram ad.',
      beat: 'It didn’t.',
      story: [
        'This started because I clicked an ad out of curiosity. Then a manufacturer said “minimum 500 units.” So naturally, I decided to make it everyone else’s problem too.',
        'ENDSHIFT is being built publicly. Formula, packaging, pricing, mistakes, delays. All of it.',
      ],
      sign: cfg.founder.name ? `${cfg.founder.name}, founder` : 'The founder',
      // the same story as a strip of panels on the home page
      panels: [
        'This started because I clicked an ad out of curiosity.',
        { lead: 'Then a manufacturer said:', bubble: '“Minimum 500 units.”' },
        'So naturally, I decided to make it everyone else’s problem too.',
      ],
    },

    faq: {
      title: 'Questions people ask first',
      ids: ['what', 'sleep', 'ritual-free', 'when-take', 'melatonin', 'refund'],
    },

    finale: {
      title: ['End your shift.', 'Keep your evening.'],
    },

    // The home page as one evening, told in panels. Times and labels on the captions.
    story: {
      home: { stamp: '19:25 · Home', sfx: 'Bzzt' },
      line: {
        stamp: '21:50 · The line',
        press: 'Switch off',
        hint: 'Press the switch. Or keep scrolling.',
        sfx: 'Clack',
        after: 'Same room. Different evening.',
      },
      ritual: { stamp: '20:00 · Twenty minutes' },
      reset: { stamp: 'Optional' },
      notMagic: { stamp: 'The small print, in big letters' },
      batch: { stamp: 'Batch #001', slotsEarly: (goal) => `Each square is one of the ${goal} founder places.`, slots: (n, goal) => `${n} of ${goal} founder places taken. Each square is a person.` },
      founder: { stamp: 'Meanwhile' },
      letters: { stamp: 'Letters' },
      end: { mark: 'The end', sub: '(of your shift)' },
      // The evening as one continuous shot (scroll moves the camera)
      film: {
        skip: 'Skip the story',
        skipShort: 'Skip',
        hint: 'Scroll',
        calendar: {
          title: 'Every evening this week',
          sub: 'Different day. Same evening.',
          days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          tonight: 'Tonight',
        },
        bed: {
          lit: 'Lights off. Work still on.',
          up: 'There has to be a switch for that.',
          left: 'Not in the wardrobe.',
          right: 'Not by the window.',
          under: 'Under the desk? One sock. No switch.',
          found: 'There.',
          sfx: 'Click',
          off: 'Work: off.',
        },
        // the work still running in your head, floating round the dark bedroom
        pings: [
          { from: 'Manager', text: 'Can you cover Saturday?' },
          { from: 'Work chat', text: '14 unread' },
          { from: 'Mail', text: 'Re: Re: Re: deadline' },
          { from: 'Dana', text: 'Did you send the file?' },
          { from: 'Calendar', text: 'Stand-up moved to 08:30' },
          { from: 'Work chat', text: '@you still online?' },
          { from: 'Tickets', text: '3 new' },
        ],
        ritual: { kicker: 'The ritual · 7 steps · 20 minutes', start: ['The ritual', 'starts now.'], step: 'Step {n} / 7', done: 'Done', why: 'Why', optional: 'Optional' },
        // one line each: what to do, and why (no health claims: this is about habits)
        steps: [
          { do: 'Close every work app. Write down the three things still circling in your head.', why: 'Once they’re on paper, you don’t have to hold them until morning.' },
          { do: 'Work clothes off. Wash your face. Close the curtains.', why: 'When the room changes, your body notices the switch, even if your head hasn’t yet.' },
          { do: 'Pour a full glass of water and drink it slowly, sitting down.', why: 'Something slow and ordinary, done on purpose, gives the evening a starting point.' },
          { do: 'Big light off, lamps on. Screen brightness down, night mode on.', why: 'Bright overhead light still says “working hours”. Lamplight says evening.' },
          { do: 'Do Not Disturb on. Phone face down, in a drawer or another room.', why: 'Out of reach is easier than willpower.' },
          { do: 'Sit on the bed, eyes closed. In through your nose, out slowly, and picture somewhere warm.', why: 'Five minutes somewhere warm, with nothing to answer and nothing to fix.' },
          { do: 'Lie down. A few pages, a record, or nothing at all. Lamp off when your eyes get heavy.', why: 'Nothing left to finish. The day is over.' },
        ],
        reset: state.status === 'in_stock' ? 'If you take RESET, this is where it goes. Optional, always.' : 'This is where RESET will fit one day. Until then, the water does the job.',
        breathIn: 'In',
        breathOut: 'Out',
        out: { line: 'Lights out.', sub: 'Nothing left to check.' },
        end: 'The day is over. Properly, this time.',
        zero: 'Reset. Tomorrow starts fresh.',
        // "Watch with sound": the film plays by itself, read aloud (film-watch.js)
        watch: {
          start: 'Watch with sound',
          startShort: 'Watch',
          label: 'Film player',
          play: 'Play',
          pause: 'Pause',
          replay: 'Watch again',
          position: 'Where you are in the film',
          of: 'of',
          voice: 'Voice',
          sound: 'Music and sound',
          close: 'Stop watching',
          deviceVoice: 'Voice: read by your device',
          noVoice: 'No English voice on this device. The words stay on screen.',
          // shown with the recorded voice (free-plan ElevenLabs audio must credit it)
          credit: 'AI voice, made with ElevenLabs (elevenlabs.io).',
        },
      },
      // words on things in the drawn rooms
      ad: ['MAKE YOUR', 'OWN PRODUCT', 'Get a quote', '*Minimum order: 500 units'],
      sponsored: 'Sponsored',
      props: {
        phoneNote: ['Manager', 'You home? Quick one'],
        notesTitle: 'TOMORROW',
        notes: ['1. Call the supplier', '2. Finish the rota', '3. Reply to Dana', '-', 'Done for today.'],
        jar1: 'EVENING CAPSULE',
        jar2: 'CONCEPT · NOT FOR SALE',
      },
    },
  };
};
