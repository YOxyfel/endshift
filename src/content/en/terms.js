export default ({ cfg, url, fmt, state }) => {
  const b = cfg.batch;
  const c = cfg.company;
  const seller = c.legalName ? `${c.legalName}${c.uic ? ` (UIC ${c.uic})` : ''}${c.address ? `, ${c.address}` : ''}` : 'ENDSHIFT (the company details will appear here before any sale)';
  return {
    meta: { title: 'Terms | ENDSHIFT', description: 'The terms for using the ENDSHIFT site, the free ritual, the founding list and, when they open, preorders.' },
    title: 'Terms',
    lead: 'Plain-language terms for the site, the free ritual, the founding list and preorders. Your statutory consumer rights always apply on top.',
    updated: fmt.date(cfg.legal.lastUpdated),
    sections: [
      { id: 'who', title: 'Who we are', body: `<p>This site is run by ${seller}. Contact: <a href="mailto:${cfg.contact.email}">${cfg.contact.email}</a>.</p>` },
      {
        id: 'ritual',
        title: 'The free ritual',
        body: '<p>The 20-minute ritual is a general wellbeing routine, offered free and as it is. It isn’t medical advice or treatment. Skip any step that doesn’t suit you, and stop if you feel unwell. If you struggle with sleep or mood most nights, talk to a doctor.</p>',
      },
      {
        id: 'list',
        title: 'The founding list',
        body: '<p>Joining is free and doesn’t commit you to buying anything. It gives you emails about Batch #001 and, if you choose, build updates. Unsubscribe any time with one click.</p>',
      },
      {
        id: 'preorders',
        title: 'Preorders for Batch #001',
        body: `${state.statusIndex < 1 ? '<p><strong>Preorders aren’t open yet.</strong> This section describes how they will work; the final version is published here before any payment is possible.</p>' : ''}
<ul>
<li>The price shown at checkout includes VAT where it applies. Shipping is shown before you pay.</li>
<li>Joining the founding list is free. When ${b.founderGoal} people are on it, everyone on it gets an email to preorder and pay${b.goalDeadline ? `, by ${fmt.date(b.goalDeadline)}` : ', with the deadline in that email'}. Nothing is charged before that email.</li>
<li>The first run (${b.manufacturingMOQ} units) is made for the founders who pay. If it doesn’t go ahead, every preorder is refunded in full, automatically, to the original payment method.</li>
${b.refund.cancelBeforeDispatch ? '<li>You can cancel your preorder for a full refund at any time before it ships.</li>' : ''}
<li>Dispatch dates are estimates. If one moves, we email you with the new date and the reason${b.refund.cancelBeforeDispatch ? ', and you can still cancel for a full refund' : ''}.</li>
</ul>`,
      },
      ...(cfg.game?.enabled && cfg.game.reward?.percent
        ? [
            {
              id: 'game-reward',
              title: `The switch game: ${cfg.game.reward.percent}% off`,
              body: `${cfg.game.reward.termsConfirmed ? '' : '<p><strong>Draft:</strong> these terms are being finalised and will be fixed here before preorders open.</p>'}
<ul>
<li>Find the switch in the game on the home page and you can claim ${cfg.game.reward.percent}% off one RESET order from Batch #001. Playing is free and needs no purchase.</li>
<li>You claim it by leaving your email. We send the code to that address when preorders open. Leaving your email also puts you on the founding list, which you can leave in one click.</li>
<li>One code per person and per email address. It can’t be exchanged for cash or combined with other discounts.</li>
${cfg.game.reward.expiresDays ? `<li>The code works for ${cfg.game.reward.expiresDays} days from the day preorders open.</li>` : ''}
<li>The discount comes off the product price at checkout, not off shipping.</li>
</ul>`,
            },
          ]
        : []),
      {
        id: 'product',
        title: 'About RESET',
        body: '<p>RESET is planned as a food supplement, not a medicine. It isn’t intended to diagnose, treat, cure or prevent any disease. Follow the label, don’t exceed the daily serving, and ask a doctor or pharmacist before use if you take medication, are pregnant or breastfeeding, or have a medical condition. Not for people under 18.</p>',
      },
      {
        id: 'withdrawal',
        title: 'Your right to change your mind',
        body: `<p>For orders delivered to you, you have 14 days from delivery to withdraw from the purchase without giving a reason. Because RESET is sealed for health and hygiene reasons, this right covers unopened products with the seal intact. Details and how to return are on <a href="${url('shipping')}">Shipping &amp; returns</a>.</p>`,
      },
      {
        id: 'liability',
        title: 'Liability',
        body: '<p>We’re responsible for the products we sell and for what we say about them. Nothing in these terms limits your statutory rights as a consumer, including the legal guarantee of conformity, or our liability where the law doesn’t allow it to be limited.</p>',
      },
      { id: 'ip', title: 'Content on this site', body: '<p>The ENDSHIFT name, logo, copy and design belong to ENDSHIFT. You’re welcome to share links and the ritual with anyone.</p>' },
      {
        id: 'law',
        title: 'Law and disputes',
        body: '<p>These terms are governed by Bulgarian law. If you’re a consumer living in another EU country, you keep the protection of that country’s mandatory consumer law. If something goes wrong, write to us first; we’d rather fix it. You can also contact the Bulgarian Commission for Consumer Protection (КЗП), <a href="https://kzp.bg" target="_blank" rel="noopener">kzp.bg</a>, or your local consumer authority.</p>',
      },
    ],
  };
};
