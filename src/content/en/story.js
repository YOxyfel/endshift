export default ({ cfg, state, fmt, formula }) => ({
  meta: {
    title: 'Built in public: the ENDSHIFT story so far | ENDSHIFT',
    description: 'How ENDSHIFT started, what has been decided, what hasn’t, and every step from a random ad to the first production run.',
  },
  intro: {
    title: 'Built in public',
    lead: 'Formula, packaging, pricing, mistakes, delays. All of it, as it happens.',
  },
  note: {
    title: 'This probably should have stayed a random Instagram ad.',
    text: [
      'I clicked an ad from a supplement manufacturer out of curiosity. They offered a free meeting, so I went. They explained white-label: pick a tested formula from their catalogue, they make it, you build the brand.',
      'Then they said “minimum 500 units”. So naturally, I decided to make it everyone else’s problem too.',
      'The honest version: I know a lot of people whose shift ends at six and whose head clocks out at midnight. Retail, couriers, kitchens, offices, students. Most evening products sell that feeling as a sleep problem. I think it’s a transition problem. Your day needs an ending, and that’s something you can build.',
      'So this is being built in the open. The free ritual first, because it’s useful whether or not RESET ever ships. Then the product, if enough people want it.',
    ],
    sign: cfg.founder.name ? `${cfg.founder.name}, founder` : 'The founder',
    video: cfg.founder.videoUrl ? 'Watch the build video' : null,
  },
  decided: {
    title: 'Decided, and not yet',
    yes: 'Decided',
    no: 'Open',
    rows: [
      ['Name', 'ENDSHIFT, with RESET as the first product', true],
      ['Format', 'Leaning capsules for Batch #001. A drink stays on the list for later.', false],
      ['Free ritual', 'Live. Free forever.', true],
      ['Formula', state.formulaConfirmed ? 'Final, with every dose published' : `Shortlist of ${formula.ingredients.filter((i) => i.status !== 'removed').length} ingredients. Melatonin undecided.`, state.formulaConfirmed],
      ['Price', state.hasPrice ? fmt.price(cfg.product.price) : cfg.product.targetPriceRange ? `Target ${cfg.product.targetPriceRange}` : 'Not set', state.hasPrice],
      ['Packaging', state.packagingFinal ? 'Final' : 'Concept chosen: the off-switch jar. Artwork not final.', state.packagingFinal],
      ['Manufacturer', cfg.manufacturer.name ? cfg.manufacturer.name : 'In talks with a white-label manufacturer. Named here once a contract is signed.', !!cfg.manufacturer.name],
      ['Launch', `Preorders open at ${cfg.batch.founderGoal} sign-ups`, false],
    ],
  },
  board: { from: 'The manufacturer', line: '“Minimum 500 units.”', note: 'So naturally…' },
  timeline: { title: 'The timeline', lead: 'Oldest first. The amber ones are happening now.' },
  follow: {
    title: 'Follow the build',
    text: 'Short updates by email when something real happens: a sample arrives, a price is set, a plan changes. Nothing else.',
    social: 'Or follow along on',
  },
});
