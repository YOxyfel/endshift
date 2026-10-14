export default ({ state, formula }) => ({
  meta: {
    title: state.formulaConfirmed ? 'The RESET formula: every ingredient and dose | ENDSHIFT' : 'The RESET shortlist: what might be in it, and why | ENDSHIFT',
    description: state.formulaConfirmed
      ? 'Every ingredient and dose in RESET, what each one is, what we can and can’t claim, and safety notes.'
      : 'The public ingredient shortlist for RESET, what each candidate is, what we will and won’t claim, and how the final formula is being chosen.',
  },
  intro: {
    title: state.formulaConfirmed ? 'What’s in RESET' : 'What might be in RESET',
    lead: state.formulaConfirmed
      ? 'Every ingredient, every dose, per daily serving. If it’s in the capsule, it’s on this page.'
      : 'The formula isn’t final. This is the shortlist, in public, with the reasoning, so you can judge it before it exists.',
    notice: 'Formula subject to final confirmation',
    noticeText: 'No doses yet. Nothing is for sale until the formula is signed off and published here.',
  },
  vials: { title: 'The shortlist, on the bench', lead: 'One vial per ingredient. They stay empty until a dose is confirmed and published.' },
  rules: {
    title: 'How it’s being chosen',
    items: [
      { title: 'Every dose, published', text: 'No proprietary blends and no “complex” that hides how much of anything is inside.' },
      { title: 'Only claims the EU allows', text: 'If an ingredient has no authorised health claim, we say what it is, not what it “does”.' },
      { title: 'Fewer ingredients, real amounts', text: 'A short list we can explain beats a long one sprinkled in for the label.' },
      { title: 'Melatonin on the front, if it’s in', text: 'Some people want it, some specifically don’t. Either way you’ll know at a glance.' },
      { title: 'A manufacturer we can name', text: 'Named here, with the country and real certificates, once the contract is signed.' },
      { title: 'Founders vote on what’s open', text: 'Starting with melatonin. The result and the reasoning get published.' },
    ],
  },
  list: {
    title: state.formulaConfirmed ? 'Ingredients' : 'The shortlist',
    lead: state.formulaConfirmed && formula.servingSize?.en ? `Per daily serving: ${formula.servingSize.en}.` : null,
  },
  label: {
    title: 'What the label will say',
    lead: 'The statements every EU food supplement must carry, plus the warnings we’ll add.',
    back: 'Back of the jar',
  },
  // the end of the page: a say in what's still open, and the way back to RESET
  end: {
    title: 'Want a say in what’s still open?',
    text: 'Founders vote on the open questions, starting with melatonin. Joining the founding list is free.',
    back: 'Back to RESET',
  },
  wrong: 'Spotted something wrong or out of date on this page?',
  wrongLink: 'Tell us',
});
