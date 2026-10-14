// FAQ. Answers that depend on product facts read them from config, so they stay true
// when the status, formula or dates change.

export default ({ cfg, state, fmt, formula, url, t }) => {
  const b = cfg.batch;
  const m = cfg.manufacturer;
  const melatonin = formula.ingredients.find((i) => i.id === 'melatonin');
  const benefits = fmt.benefitsList('en');

  const refund = state.statusIndex >= 1
    ? `<p>If Batch #001 doesn’t reach ${b.founderGoal} founders${b.goalDeadline ? ` by ${fmt.date(b.goalDeadline)}` : ' by the deadline'}, every preorder is refunded in full, automatically.${b.refund.cancelBeforeDispatch ? ' You can also cancel any time before your order ships, for a full refund.' : ''}</p><p>Once it has shipped, your statutory rights apply. Details are on <a href="${url('shipping')}">Shipping &amp; returns</a>.</p>`
    : `<p>Right now there’s nothing to refund: joining the founding list is free and you haven’t paid anything.</p><p>When ${b.founderGoal} people are on the list, everyone on it gets an email to pay. If Batch #001 then doesn’t go ahead, every payment is refunded in full, automatically.${b.refund.cancelBeforeDispatch ? ' You can also cancel any time before your order ships.' : ''} The final terms are published before anyone pays.</p>`;

  const melatoninAnswer = state.formulaConfirmed
    ? melatonin && melatonin.status === 'included'
      ? `<p>Yes: ${fmt.dose(melatonin)} per serving. It says so on the front of the label.</p>`
      : '<p>No. RESET is melatonin-free.</p>'
    : '<p>Not decided yet. Melatonin is on the shortlist as “undecided”. Many people specifically want a melatonin-free evening product, and the rules on melatonin in food supplements differ between EU countries.</p><p>Whatever we decide, the front of the label will say it clearly.</p>';

  const servingSize = formula.servingSize?.en;

  return {
    meta: {
      title: 'Questions about ENDSHIFT, the free ritual and RESET | ENDSHIFT',
      description: 'Straight answers about ENDSHIFT, the free ritual, RESET, the founding batch, shipping, refunds and safety.',
    },
    aside: {
      topics: 'Topics',
      askTitle: 'Not answered here?',
      askText: 'Ask us. A person reads every message and writes back.',
      ask: 'Ask a person',
    },
    intro: {
      title: 'Questions, answered plainly',
      lead: 'If something isn’t here, ask us. A person replies.',
    },
    groups: [
      {
        id: 'idea',
        title: 'The idea',
        items: [
          {
            id: 'what',
            q: 'What is ENDSHIFT?',
            a: `<p>A small brand built around one moment: the end of the workday. There’s a <a href="${url('ritual')}">free 20-minute ritual</a> you can use tonight, and RESET, an evening capsule that’s still in development and designed to fit into it.</p>`,
          },
          {
            id: 'sleep',
            q: 'Is this a sleep supplement?',
            a: '<p>No. RESET is meant for the stretch between work and the rest of your evening, not for knocking you out.</p><p>ENDSHIFT doesn’t treat insomnia or any other condition. If you have trouble sleeping most nights, a doctor is the right person to talk to.</p>',
          },
          {
            id: 'ritual-free',
            q: 'Can I use the ritual without buying anything?',
            a: `<p>Yes. That’s the point. <a href="${url('ritual')}">The ritual</a> is free, needs no account and works without RESET.</p><p>No need to buy anything. Although, financially speaking, we would appreciate it.</p>`,
          },
          {
            id: 'shift-work',
            q: 'Is it suitable for shift workers?',
            a: '<p>It’s built with shift work in mind. “Evening” here means after your shift, whenever that ends.</p><p>If the final formula includes anything that can make you drowsy, the label will say not to drive afterwards. So take it once you’re home, not before the commute.</p>',
          },
        ],
      },
      {
        id: 'reset',
        title: 'RESET',
        items: [
          {
            id: 'when-take',
            q: 'When should I take RESET?',
            a: state.formulaConfirmed && servingSize
              ? `<p>${servingSize}, at the water step of the ritual, after your shift. Don’t exceed the daily serving on the label.</p>`
              : '<p>As part of the ritual, after your shift. The exact serving (how many capsules, and how long before bed) will be printed on the label once the formula is final. Until then we’d rather not guess.</p>',
          },
          { id: 'melatonin', q: 'Does it contain melatonin?', a: melatoninAnswer },
          {
            id: 'bottle',
            q: 'How long does one jar last?',
            a: cfg.product.servingsConfirmed
              ? `<p>${cfg.product.servings} servings: about a month of evenings.</p>`
              : `<p>The plan is ${cfg.product.servings} servings, so about a month of evenings. It isn’t final until the formula is.</p>`,
          },
          {
            id: 'price',
            q: 'How much will it cost?',
            a: `<p>${fmt.priceLine()}</p>`,
          },
          {
            id: 'capsules',
            q: 'Why capsules instead of a drink?',
            a: '<p>We compared drink sachets and capsules. Capsules won the first round: no taste to get wrong, an exact dose, easy to travel with, and the shortest path from “decided” to “shipped”.</p>',
          },
          {
            id: 'drink',
            q: 'Will there be a drink version later?',
            a: '<p>Maybe. A drink is the obvious next experiment, and founders will get a vote on it. No promises until there’s a formula and a date.</p>',
          },
          {
            id: 'where',
            q: 'Where is it made?',
            a: m.name && m.country
              ? `<p>By ${m.name}, in ${t(m.country)}.${m.certifications.length ? ` Certified: ${m.certifications.join(', ')}.` : ''}</p>`
              : '<p>By an established white-label supplement manufacturer. We’ll name the manufacturer and the country of production here once the contract is signed, not before.</p>',
          },
        ],
      },
      {
        id: 'batch',
        title: 'Founding batch, shipping and refunds',
        items: [
          {
            id: 'founding',
            q: 'What is a Founding Batch?',
            a: `<p>Batch #001 is the first production run. The manufacturer’s minimum is ${b.manufacturingMOQ} units. Joining the founding list is free; when ${b.founderGoal} people are on it, everyone gets an email to pay, and the run is made for the founders who do.</p>${benefits ? `<p>Founders get ${benefits}.</p>` : ''}<p><a href="${url('batch')}">How the founding batch works</a></p>`,
          },
          {
            id: 'ship',
            q: 'When will it ship?',
            a: b.estimatedDispatch
              ? `<p>Current estimate: ${t(b.estimatedDispatch)}. If that changes, every founder hears it from us by email first.</p>`
              : '<p>There’s no date yet, because there’s no production slot yet. When preorders open, this page and the batch page will show an estimated dispatch window. If it moves, every founder gets an email.</p>',
          },
          {
            id: 'delay',
            q: 'What if production is delayed?',
            a: `<p>You hear it from us first, by email, with the new date and the reason.${b.refund.cancelBeforeDispatch ? ' If the new date doesn’t work for you, cancel for a full refund.' : ''}</p>`,
          },
          { id: 'refund', q: 'Can I get a refund?', a: refund },
        ],
      },
      {
        id: 'safety',
        title: 'Safety',
        items: [
          {
            id: 'meds',
            q: 'Can I combine it with medications?',
            a: '<p>Ask your doctor or pharmacist first, especially if you take anything for sleep, mood or anxiety, blood pressure, blood thinning, or any sedative. Some evening ingredients can interact with medication.</p><p>Every ingredient and dose will be published on the label and on the formula page.</p>',
          },
          {
            id: 'pregnancy',
            q: 'Is it suitable during pregnancy?',
            a: '<p>Assume not. Several ingredients on the shortlist aren’t recommended during pregnancy or breastfeeding, and the label will say so.</p><p>If you’re pregnant, breastfeeding or under 18, RESET isn’t for you. The ritual still is.</p>',
          },
          {
            id: 'alcohol',
            q: 'Can I take it after a drink?',
            a: '<p>Don’t combine them. Some of the ingredients being considered can add to the drowsiness alcohol causes.</p>',
          },
        ],
      },
    ],
  };
};
