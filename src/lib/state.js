// Product-state logic and the build's honesty checks.
// Templates never decide on their own whether something is for sale: they ask deriveState().

export const STATUSES = ['concept', 'preorder', 'production', 'in_stock'];

export function deriveState(cfg) {
  const p = cfg.product;
  const b = cfg.batch;
  const status = p.status;
  const hasPrice = typeof p.price === 'number' && p.price > 0;
  const checkoutLive =
    (status === 'preorder' || status === 'in_stock') && cfg.checkout.enabled === true && !!cfg.checkout.url && hasPrice;

  const goal = Math.max(1, Number(b.founderGoal) || 1);
  const count = Math.max(0, Number(b.founderCount) || 0);

  return {
    status,
    statusIndex: STATUSES.indexOf(status),
    checkoutLive,
    hasPrice,
    // What the batch counter counts: signups before payment exists, paid founders after.
    counterKind: status === 'concept' ? 'list' : 'founders',
    founderCount: count,
    founderGoal: goal,
    pct: Math.min(100, (count / goal) * 100),
    goalReached: count >= goal,
    formulaConfirmed: p.formulaConfirmed === true,
    packagingFinal: p.packagingFinal === true,
    // primary product action
    action:
      checkoutLive && status === 'preorder'
        ? 'preorder'
        : checkoutLive && status === 'in_stock'
          ? 'buy'
          : status === 'production'
            ? 'updates'
            : 'join',
  };
}

const isPlaceholder = (s) => typeof s === 'string' && /\.example\b/.test(s);

/**
 * Returns { errors, warnings }. Errors stop the build: they are states where the site
 * would claim something that isn't true. Warnings are launch to-dos.
 */
export function validate(cfg, formula) {
  const errors = [];
  const warnings = [];
  const p = cfg.product;
  const b = cfg.batch;
  const s = deriveState(cfg);

  if (!STATUSES.includes(p.status)) errors.push(`product.status must be one of ${STATUSES.join(', ')} (got "${p.status}").`);

  const selling = p.status === 'preorder' || p.status === 'in_stock';
  if (selling) {
    if (!s.hasPrice) errors.push(`product.status is "${p.status}" but product.price is not set.`);
    if (!cfg.checkout.enabled || !cfg.checkout.url) errors.push(`product.status is "${p.status}" but checkout is not enabled with a URL.`);
    const c = cfg.company;
    if (!c.legalName || !c.uic || !c.address)
      errors.push('Taking payments requires company.legalName, company.uic and company.address (shown in the footer and legal pages).');
    if (cfg.legal.draft) errors.push('Taking payments requires legal.draft = false (legal pages reviewed and final).');
  }
  if (p.status === 'preorder') {
    if (!b.estimatedDispatch) errors.push('Preorders need batch.estimatedDispatch so founders know when it ships.');
    if (!b.preorderTermsConfirmed) errors.push('Preorders need batch.preorderTermsConfirmed = true (refund terms final).');
    if (!b.goalDeadline) warnings.push('batch.goalDeadline is empty: founders won’t see the date by which the goal must be reached.');
  }
  if (p.status === 'in_stock' && !p.formulaConfirmed) errors.push('product.status is "in_stock" but product.formulaConfirmed is false.');
  if ((p.status === 'preorder' || p.status === 'in_stock') && !p.formulaConfirmed)
    errors.push('Don’t take money for a formula that isn’t final: set product.formulaConfirmed = true first.');

  if (cfg.checkout.enabled && !selling)
    warnings.push(`checkout.enabled is true but status is "${p.status}", so no buy/preorder buttons are shown.`);

  // Formula
  if (p.formulaConfirmed) {
    for (const ing of formula.ingredients) {
      if (ing.status === 'removed') continue;
      if (ing.status !== 'included') errors.push(`Formula is confirmed but "${ing.id}" still has status "${ing.status}".`);
      if (ing.dose == null) errors.push(`Formula is confirmed but "${ing.id}" has no dose.`);
    }
    if (!formula.servingSize?.en) errors.push('Formula is confirmed but formula.servingSize is empty.');
  }
  for (const ing of formula.ingredients) {
    for (const claim of ing.claims || []) {
      if (claim.verified && !p.formulaConfirmed)
        warnings.push(`Claim on "${ing.id}" is marked verified, but it is hidden until the formula is confirmed.`);
    }
  }

  // Counter
  if (!Number.isFinite(Number(b.founderCount)) || b.founderCount < 0) errors.push('batch.founderCount must be a number ≥ 0.');
  if (!b.countUpdated) warnings.push('batch.countUpdated is empty: the counter will not say when it was last checked.');

  // Social proof must be real
  for (const [i, t] of (cfg.socialProof.testimonials || []).entries()) {
    if (!t.consent || !t.date || !t.source) errors.push(`socialProof.testimonials[${i}] needs consent: true, a date and a source.`);
  }

  // The game's reward is a promise: it has to be real, and honoured once preorders open.
  const gr = cfg.game?.reward;
  if (cfg.game?.enabled && gr?.percent != null) {
    if (!(gr.percent > 0 && gr.percent < 100)) errors.push('game.reward.percent must be between 1 and 99, or null.');
    if (!gr.termsConfirmed) warnings.push(`game.reward: the ${gr.percent}% terms are marked draft. Confirm them (and set termsConfirmed) before launch.`);
    if (s.statusIndex > 0 && !cfg.checkout.enabled) warnings.push('game.reward: preorders are open but checkout is off, so the codes can’t be used yet.');
  }

  // Launch to-dos
  if (isPlaceholder(cfg.siteUrl)) warnings.push('siteUrl is a placeholder (.example). Set your real domain.');
  if (isPlaceholder(cfg.contact.email)) warnings.push('contact.email is a placeholder (.example).');
  if (!cfg.forms.endpoint) warnings.push('forms.endpoint is empty: signup forms run in preview mode and send nothing.');
  if (cfg.analytics.provider === 'none') warnings.push('analytics.provider is "none": no events are recorded.');
  if (cfg.legal.draft) warnings.push('legal.draft is true: legal pages show a draft banner. Have them reviewed.');
  if (!cfg.company.legalName) warnings.push('company details are empty (fine for the waitlist phase, required before payments).');

  return { errors, warnings, state: s };
}
