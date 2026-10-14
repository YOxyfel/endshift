export default ({ cfg, state, fmt, t }) => {
  const b = cfg.batch;
  const rest = b.manufacturingMOQ - b.founderGoal;
  return {
    meta: {
      title: 'Batch #001: the ENDSHIFT founding batch | ENDSHIFT',
      description: `How the first ENDSHIFT run works: ${b.founderGoal} free sign-ups, then an email to pay, a ${b.manufacturingMOQ}-unit minimum, a full refund if it doesn’t go ahead, and updates at every step.`,
    },
    intro: {
      title: 'Batch #001',
      lead: 'ENDSHIFT starts when enough people decide it should exist.',
      text: 'This is a project you can help bring to life, not a countdown. No timers, no “only 3 left”. Just a number that goes up when people join, and a plan for what happens next.',
    },
    joinTitle: state.action === 'updates' ? 'Get production updates' : 'Join the founding list',
    joinNote:
      state.status === 'concept'
        ? `Free, and it commits you to nothing. When ${b.founderGoal} people are on the list, you get one email to pay for yours, if you still want it. Build updates too, if you like.`
        : 'We email founders at every milestone: production booked, samples approved, dispatch.',
    states: {
      title: 'Where Batch #001 is now',
      items: [
        { id: 'concept', name: 'Founding list', text: `Free sign-ups while the formula, packaging and price are finalised. At ${b.founderGoal}, preorders open.` },
        { id: 'preorder', name: 'Preorders', text: `Everyone on the list gets an email to pay, with the final price, dispatch window and refund terms. The first batch is made for the founders who pay.` },
        { id: 'production', name: 'Production', text: `The manufacturer makes the first ${b.manufacturingMOQ}. Founders get photos, dates and the occasional delay explained.` },
        { id: 'in_stock', name: 'Shipping', text: 'Founders’ orders go out first. Then RESET is on sale normally.' },
      ],
      current: 'Now',
    },
    crate: {
      title: 'The founders’ crate',
      lead:
        state.status === 'concept'
          ? `Every cap is one person on the founding list. At ${b.founderGoal}, everyone on it gets an email to pay, and the first batch is made for them.`
          : `Every cap is one founder’s jar. When the crate is full, production is booked.`,
      next: (n) => `Nº ${String(n).padStart(3, '0')} is still open`,
      cta: state.status === 'concept' ? 'Take a place in the crate' : 'Take the next number',
      aria: (n, goal) => `A crate with ${goal} places, ${n} taken.`,
      stencil: (goal) => `${goal} FOUNDERS · ONE PER PLACE · THIS WAY UP ↑`,
      lid: 'ENDSHIFT · BATCH #001',
      caption: state.status === 'concept' ? 'People on the founding list, counted by a person.' : 'Founders so far.',
    },
    pallet: {
      caption: `${b.manufacturingMOQ} jars: the smallest run the manufacturer makes. The amber block is the founders’ ${b.founderGoal}; the other ${rest} go on sale after the founders’ orders ship.`,
      aria: `${b.manufacturingMOQ} jars on a pallet, ${b.founderGoal} of them marked as the founders’ crate.`,
      founders: `${b.founderGoal} founders`,
      rest: `${rest} after`,
    },
    why: {
      title: `Why ${b.founderGoal}, when the minimum is ${b.manufacturingMOQ}?`,
      text: [
        `The manufacturer won’t make fewer than ${b.manufacturingMOQ} units. That’s normal for supplements, and it’s a real amount of money for a brand that is one person and a website.`,
        `${b.founderGoal} people on the list is the point where ordering the first run stops being a gamble and becomes a plan. That’s when everyone on it gets the email to pay. The other ${rest} go on sale after the founders’ orders ship.`,
      ],
    },
    outcomes: {
      yes: { title: `If we reach ${b.founderGoal}`, text: `${state.status === 'concept' ? 'Everyone on the list gets an email to pay for their jar. Then we' : 'We'} book production, publish the date, and email every founder at each step until it ships.${b.estimatedDispatch ? ` Current dispatch estimate: ${t(b.estimatedDispatch)}.` : ''}` },
      no: {
        title: `If we don’t`,
        text:
          state.status === 'concept'
            ? 'Nobody has paid anything, so nobody loses anything. We say so publicly, explain why, and decide together what to try next.'
            : `Every preorder is refunded in full${b.goalDeadline ? ` after ${fmt.date(b.goalDeadline)}` : ''}, automatically. You don’t have to ask.`,
      },
    },
    benefits: {
      title: 'What founders get',
      note: 'Only what we can actually deliver. Nothing here depends on a feature that doesn’t exist yet.',
      cardCaption: 'Your Batch #001 card. Digital, numbered, yours.',
      card: { brand: 'ENDSHIFT', batch: `#${b.id}`, title: 'Founder', rows: [['No.', '— / ' + b.founderGoal], ['In', 'The day you join'], ['Out', 'Never, hopefully']], stamp: 'Batch 001', fine: 'Illustration of the digital founder card.' },
    },
    terms: {
      title: 'The terms',
      draft: 'These are the proposed terms. The final version is published in the Terms before any payment is possible.',
      rows: [
        ['Founding list', 'Free. No card. Leave any time.'],
        ['Founder price', fmt.priceLine()],
        ['Goal', `${b.founderGoal} people on the founding list`],
        ['Paying', `By email, once the list reaches ${b.founderGoal}${b.goalDeadline ? `. Pay by ${fmt.date(b.goalDeadline)}` : ', with the deadline in that email'}. Nothing is charged before then.`],
        ['First run', `${b.manufacturingMOQ} units`],
        ['Production time', t(b.productionLeadTime) || 'Confirmed by the manufacturer when the run is booked'],
        ['Dispatch', t(b.estimatedDispatch) || 'Estimated once production is booked'],
        ['If it doesn’t go ahead', 'Full refund for every payment, automatically'],
        ['Cancelling', b.refund.cancelBeforeDispatch ? 'Full refund any time before your order ships' : 'See Terms'],
        ['Updates', 'By email, at every milestone and every delay'],
      ],
    },
    faqIds: ['founding', 'ship', 'delay', 'refund', 'price'],
    faqTitle: 'Founding batch questions',
  };
};
