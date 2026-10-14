export default ({ url }) => ({
  meta: {
    title: 'Melatonin in the EU: doses, rules and who should skip it | ENDSHIFT',
    description: 'What melatonin is, what studies found for sleep and shift work, the exact EU health claims and doses, why the rules differ between countries, and who should not take it.',
  },
  title: 'Melatonin in the EU: doses, rules and who should skip it',
  dek: 'The hormone your brain makes when it gets dark, the supplement version of it, and why the rules for it change at the border.',
  date: '2026-10-13',
  readTime: 5,
  body: `
<p>Melatonin is the evening supplement most people have heard of. It’s also the one with the most rules attached, and the one where it matters most who you are and what else you take.</p>
<p>Melatonin is on the RESET shortlist as undecided, and <a href="${url('formula')}">the Formula page</a> explains why. This guide is about melatonin itself, not about any product.</p>

<h2>What it is</h2>
<p>Melatonin is a hormone your brain makes in response to darkness. It helps run your body clock and your sleep (NCCIH). You don’t need it from food, because your body makes its own. It’s also sold as a supplement, and in some forms as a medicine.</p>

<h2>What the studies found</h2>
<h3>Sleep</h3>
<p>A meta-analysis of 19 studies with 1,683 people with sleep disorders found that melatonin helped them fall asleep about 7 minutes faster and sleep about 8 minutes longer, with slightly better sleep quality. The authors called the effects modest (Ferracioli-Oda et al., 2013). For long-term insomnia, NCCIH says there isn’t enough strong evidence to recommend melatonin, and that cognitive behavioural therapy for insomnia (CBT-I) is the first treatment to try (NCCIH).</p>
<h3>Shift work</h3>
<p>A Cochrane review found that people who took melatonin after a night shift may sleep about 24 minutes longer during the day. They didn’t fall asleep any faster, and the evidence was rated low quality (Liira et al., 2014). NCCIH describes the shift-work studies as generally small or inconclusive.</p>
<h3>Jet lag</h3>
<p>Research suggests melatonin may help with jet lag (NCCIH). That’s one of only two things EU law lets a label say about it.</p>

<h2>What EU law lets a label say</h2>
<p>Melatonin has two authorised health claims in the EU, each tied to a dose (Regulation (EU) No 432/2012):</p>
<ul>
<li>“Melatonin contributes to the reduction of time taken to fall asleep”. Only for a food that contains 1 mg of melatonin per quantified portion, and the label must tell you that “the beneficial effect is obtained by consuming 1 mg of melatonin close to bedtime”.</li>
<li>“Melatonin contributes to the alleviation of subjective feelings of jet lag”. Only for a food that contains at least 0.5 mg of melatonin per quantified portion, and the label must tell you that the effect comes from at least 0.5 mg taken close to bedtime on the first day of travel and on the following few days after arrival.</li>
</ul>
<p>That’s all. Nothing about stress, relaxation or switching off after work. And the sleep claim is for 1 mg: a bigger dose doesn’t come with a bigger claim.</p>

<h2>Why the rules differ between countries</h2>
<p>Melatonin sits on the line between food and medicine, and EU countries draw that line in different places. A 2 mg slow-release melatonin tablet is authorised across the EU as a prescription-only medicine, for short-term treatment of insomnia in people aged 55 and over (EMA). France, meanwhile, allowed food supplements providing less than 2 mg a day when its food safety agency, ANSES, reviewed them in 2018, and ANSES noted that melatonin’s status and limits vary across the EU (ANSES, 2018).</p>
<p>So something sold as a supplement in one country can be treated as a medicine in another. If you’re in Bulgaria, or anywhere else, ask a pharmacist what applies there before you buy.</p>
<p>It’s also worth knowing that labels aren’t always right. In one study, most of 31 melatonin products didn’t contain the amount on the label; in another, 22 of 25 gummy products were labelled inaccurately (NCCIH).</p>

<h2>Who should skip it, or ask first</h2>
<ul>
<li><strong>Pregnancy, breastfeeding, children and teenagers.</strong> ANSES advises all of these groups not to take melatonin supplements, along with people with inflammatory or autoimmune diseases (ANSES, 2018).</li>
<li><strong>Some conditions and medicines.</strong> ANSES advises people with epilepsy, asthma, or mood, behaviour or personality disorders, and anyone taking medication, to ask a doctor first. NCCIH says people with epilepsy and people on blood thinners need medical supervision.</li>
<li><strong>Before driving or a shift.</strong> Melatonin can cause sleepiness, headache, dizziness and nausea (NCCIH), and ANSES advises against it before activities that need you alert, where drowsiness would be a safety risk. Don’t take it before you drive or start work.</li>
<li><strong>Older adults.</strong> Melatonin may stay active for longer in older people (NCCIH).</li>
<li><strong>Every night, for months.</strong> Short-term use appears safe for most people, but there’s little information on long-term safety (NCCIH), and ANSES recommends occasional use only.</li>
</ul>

<h2>Start with the light</h2>
<p>Your brain makes melatonin in response to darkness, so start there: big light off, lamps on, screens dimmer. After a night shift, that means a bedroom made into night.</p>
<p>The <a href="${url('ritual')}">free 20-minute ritual</a> builds this in: lower the lights, phone down, breathe out longer, lie down. There’s a version for coming home after a night shift, too. No account, nothing to buy.</p>
<p>If you’re sleeping badly most nights for weeks, talk to a doctor. That’s the right tool for a different problem.</p>`,
  sourcesTitle: 'Sources',
  sources: [
    {
      text: 'Commission Regulation (EU) No 432/2012 establishing a list of permitted health claims made on foods, other than those referring to the reduction of disease risk and to children’s development and health. Annex: melatonin. EUR-Lex.',
      url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32012R0432',
    },
    {
      text: 'Ferracioli-Oda, E., Qawasmi, A., &amp; Bloch, M. H. (2013). Meta-analysis: Melatonin for the treatment of primary sleep disorders. <em>PLoS ONE</em>, 8(5), e63773.',
      url: 'https://doi.org/10.1371/journal.pone.0063773',
    },
    {
      text: 'Liira, J., Verbeek, J. H., Costa, G., Driscoll, T. R., Sallinen, M., Isotalo, L. K., &amp; Ruotsalainen, J. H. (2014). Pharmacological interventions for sleepiness and sleep disturbances caused by shift work. <em>Cochrane Database of Systematic Reviews</em>, 2014(8), CD009776.',
      url: 'https://doi.org/10.1002/14651858.CD009776.pub2',
    },
    {
      text: 'NCCIH (National Center for Complementary and Integrative Health). Melatonin: What You Need To Know.',
      url: 'https://www.nccih.nih.gov/health/melatonin-what-you-need-to-know',
    },
    {
      text: 'ANSES (2018). ANSES recommends that certain populations avoid the consumption of food supplements containing melatonin. 11 April 2018.',
      url: 'https://www.anses.fr/en/content/anses-recommends-certain-populations-avoid-consumption-food-supplements-containing',
    },
    {
      text: 'European Medicines Agency. Circadin (melatonin): EPAR, medicine overview.',
      url: 'https://www.ema.europa.eu/en/medicines/human/EPAR/circadin',
    },
  ],
  disclaimer: 'This guide is general information, not medical or legal advice. It doesn’t describe or promote any product. If you take medication, are pregnant or breastfeeding, or have a health condition, ask a doctor or pharmacist before taking any supplement.',
  tonight: ['Big light off, lamps on, for the last hour before bed.', 'Screens down, or at least dimmer, once you’re home.', 'After a night shift: blinds down or an eye mask on.'],
  cta: 'Try the 20-minute ritual',
});
