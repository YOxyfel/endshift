export default ({ cfg, state, fmt, t }) => ({
  meta: {
    title: 'RESET: the ENDSHIFT evening capsule, in development | ENDSHIFT',
    description:
      'RESET is an evening capsule designed to fit into a 20-minute after-work ritual. Format, planned supply, the public ingredient shortlist, and how the founding batch works.',
  },
  hero: {
    overline: 'ENDSHIFT RESET',
    title: 'RESET',
    lead: 'A simple evening capsule designed to fit into the ENDSHIFT ritual. One step in twenty minutes. Optional, always.',
    formulaNotice: 'Formula subject to final confirmation',
    formulaNoticeText: 'Ingredients, doses and serving size are not final. Nothing is for sale until they are.',
  },
  summary: {
    title: 'At a glance',
    melatoninLabel: 'Melatonin',
    melatoninUndecided: 'Undecided',
    melatoninNone: 'None. RESET is melatonin-free.',
    rows: [
      ['Format', `Capsules, ${cfg.product.servings} servings${cfg.product.servingsConfirmed ? '' : ' (planned)'}`],
      ['When', 'After your shift, at the water step of the ritual'],
      ['Melatonin', null], // filled from formula
      ['Made by', cfg.manufacturer.name ? `${cfg.manufacturer.name}${cfg.manufacturer.country ? `, ${t(cfg.manufacturer.country)}` : ''}` : 'An established white-label manufacturer, named once the contract is signed'],
      ['Price', fmt.priceLine()],
    ],
  },
  turn: {
    label: 'Turn the jar',
    hint: 'Drag to turn it. The back of the jar is the spec sheet.',
    front: 'Front',
    back: 'Back',
    backTitle: 'At a glance',
    rows: [
      ['Format', 'Capsules'],
      ['Supply', cfg.product.servingsConfirmed ? `${cfg.product.servings} servings` : `${cfg.product.servings} servings, planned`],
      ['Formula', state.formulaConfirmed ? 'Final' : 'Not final yet'],
      ['Melatonin', state.formulaConfirmed ? 'See the formula' : 'Undecided'],
      ['When', 'Evening, the water step'],
      ['Price', state.hasPrice ? fmt.price(cfg.product.price) : 'Not set yet'],
    ],
  },
  step: {
    title: 'One job in the ritual: step three.',
    text: 'Most evening supplements are sold as sleep in a bottle. RESET isn’t. It’s one small cue inside a ritual that does most of the work, and everything else in the 20 minutes works without it.',
    tag: 'RESET',
    how: 'Take the serving on the label with a full glass of water, sitting down. Then carry on with the ritual.',
    when: 'Whenever your shift ends: morning, evening or 3 a.m. “Evening” just means after work.',
    wont: 'What it won’t do: knock you out, or fix sleep problems, anxiety or burnout.',
    first: 'Try the ritual first, tonight, for free.',
  },
  ingredients: {
    title: state.formulaConfirmed ? 'What’s inside' : 'The public shortlist',
    lead: state.formulaConfirmed
      ? 'Every ingredient and dose, per daily serving. No proprietary blends.'
      : 'The candidates, in the open. When the formula is final, this list gets doses, or loses names.',
    more: 'Why each one is on the list',
    guides: 'Read the guide',
  },
  batch: {
    title: 'Batch #001 status',
    text: `At ${cfg.batch.founderGoal} sign-ups, everyone on the founding list gets an email to pay. The first run of ${cfg.batch.manufacturingMOQ} is made for them.`,
    more: 'How the founding batch works',
  },
  ship: {
    line: `Ships to ${cfg.shipping.regions.join(', ')}. If Batch #001 doesn’t go ahead, every preorder is refunded in full.`,
    more: 'Shipping & returns',
  },
  faqIds: ['when-take', 'melatonin', 'meds'],
  faqTitle: 'About RESET',
  reviews: { title: 'Reviews' },
});
