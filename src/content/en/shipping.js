export default ({ cfg, fmt, url, t }) => {
  const s = cfg.shipping;
  const b = cfg.batch;
  return {
    meta: { title: 'Shipping, preorders and refunds for RESET | ENDSHIFT', description: 'Where ENDSHIFT ships, what it costs, when Batch #001 is expected, and how returns and refunds work.' },
    title: 'Shipping & returns',
    lead: 'What happens between “ordered” and “on your kitchen table”, and what to do if something isn’t right.',
    updated: fmt.date(cfg.legal.lastUpdated),
    sections: [
      {
        id: 'where',
        title: 'Where we ship',
        body: `<p>${s.regions.join(', ')}${s.regions.length === 1 ? ' for now' : ''}. More of the EU later, if Batch #001 goes well.</p>`,
      },
      {
        id: 'cost',
        title: 'What it costs',
        body: `<p>${s.cost ? t(s.cost) : 'Shipping costs will be published here before preorders open.'}${s.freeOver ? ` Free over ${fmt.price(s.freeOver)}.` : ''} You always see the shipping cost before you pay.</p>${s.carrier ? `<p>Carrier: ${t(s.carrier)}. You get a tracking link by email.</p>` : ''}`,
      },
      {
        id: 'when',
        title: 'When it ships',
        body: `<p>Batch #001 is a preorder. When ${b.founderGoal} people are on the founding list, everyone on it gets an email to pay; the run is made for the founders who pay, then shipped founders-first.</p><ul><li>Production time: ${t(b.productionLeadTime) || 'confirmed by the manufacturer when the run is booked'}.</li><li>Estimated dispatch: ${t(b.estimatedDispatch) || 'published when production is booked'}.</li></ul><p>Once RESET is in stock normally, orders ship within a few working days.</p>`,
      },
      {
        id: 'delays',
        title: 'If something is delayed',
        body: `<p>You’ll hear it from us first, by email, with the new date and the reason.${b.refund.cancelBeforeDispatch ? ' If the new date doesn’t work for you, you can cancel your preorder for a full refund.' : ''}</p>`,
      },
      {
        id: 'damaged',
        title: 'Damaged, missing or wrong',
        body: `<p>Email <a href="mailto:${cfg.contact.email}">${cfg.contact.email}</a> with your order number and a photo if you can. We’ll send a replacement or refund you, including shipping. You don’t have to send a damaged item back unless we ask.</p>`,
      },
      {
        id: 'withdrawal',
        title: 'Changing your mind',
        body: `<p>You can withdraw from a purchase within 14 days of delivery. Tell us by email that you want to withdraw; you don’t need to give a reason. Return the product unopened, with the seal intact, within 14 days of telling us. For health and hygiene reasons, opened supplements can’t be returned unless they’re faulty.</p><p>We refund the price and the standard shipping cost within 14 days of receiving your withdrawal, once the product is back with us (or you’ve shown it’s on its way). Return shipping is paid by you unless the product was faulty or wrong.</p>`,
      },
      {
        id: 'founding',
        title: 'Founding batch refunds',
        body: `<p>If Batch #001 doesn’t go ahead after the email to pay, every preorder is refunded in full, automatically.${b.refund.cancelBeforeDispatch ? ' Until your order ships, you can also cancel for a full refund at any time.' : ''} More on the <a href="${url('batch')}">founding batch page</a>.</p>`,
      },
    ],
  };
};
