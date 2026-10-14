export default ({ url }) => ({
  meta: {
    title: 'Magnesium: what the evidence does and doesn’t say | ENDSHIFT',
    description: 'What magnesium is, where it comes from in food, what studies on sleep and stress actually found, the EU health claims a label may use, and who should be careful with supplements.',
  },
  title: 'Magnesium: what the evidence does and doesn’t say',
  dek: 'It has a reputation for calming you down. What the studies actually found, what a label is allowed to say, and why dinner is a better place to start.',
  date: '2026-10-13',
  readTime: 5,
  body: `
<p>Magnesium turns up in a lot of products sold for the evening, usually next to words like “calm” and “unwind”. Its reputation is bigger than its evidence. That doesn’t make it useless. It makes it worth knowing what was actually found.</p>
<p>Magnesium is also on the RESET shortlist, and <a href="${url('formula')}">the Formula page</a> explains why. This guide is about magnesium itself, not about any product.</p>

<h2>What it is, and where you get it</h2>
<p>Magnesium is a mineral your body uses every day: for muscles and nerves, for bones and teeth, and for turning food into energy. Those are among the jobs recognised in the EU’s list of authorised health claims (Regulation (EU) No 432/2012).</p>
<p>It comes from food. Good sources are green leafy vegetables, beans and lentils, nuts, seeds and whole grains. A small handful of pumpkin seeds (28 g) has about 156 mg, the same amount of almonds about 80 mg, and half a cup of cooked spinach about 78 mg (NIH ODS). For comparison, the reference value EU food labels use for a day’s magnesium is 375 mg (Regulation (EU) No 1169/2011).</p>

<h2>What the studies found</h2>
<h3>Sleep</h3>
<p>A 2021 review looked for trials of magnesium supplements in older adults with insomnia. It found three, with 151 people between them, and rated the evidence low to very low quality. Its conclusion: the research isn’t good enough for doctors to make well-informed recommendations (Mah &amp; Pitre, 2021).</p>
<h3>Stress and anxiety</h3>
<p>A review of 18 studies found hints that magnesium might help with anxiety, but only in groups who were already prone to it: people with mild anxiety, premenstrual symptoms or high blood pressure, and women after giving birth. The authors rated the evidence as poor and asked for well-designed trials (Boyle et al., 2017).</p>
<h3>What that adds up to</h3>
<p>Small trials, particular groups, weak methods. None of it tells you much about a healthy adult who eats reasonably well, because that isn’t who was studied. And nothing here shows that magnesium can switch off a head that’s still at work.</p>

<h2>What a label is allowed to say</h2>
<p>Magnesium has ten authorised health claims in the EU. These two are the closest to the evening, word for word:</p>
<ul>
<li>“Magnesium contributes to normal psychological function”</li>
<li>“Magnesium contributes to a reduction of tiredness and fatigue”</li>
</ul>
<p>The other eight are about nerves, muscles, bones, teeth, energy, electrolytes, protein and cell division. None of the ten mentions sleep, calm or relaxation (Regulation (EU) No 432/2012).</p>
<p>Each claim comes with a condition: it may only be used on a food that is at least a “source of” magnesium. Under EU labelling rules that means at least 15% of the 375 mg reference value (Regulation (EU) No 1169/2011), so for a supplement, at least 56.25 mg in the daily serving. With less than that, none of these claims can be used.</p>

<h2>Safety: when to be careful</h2>
<ul>
<li><strong>Too much from supplements.</strong> For adults, the upper limit that EFSA, the EU’s food safety authority, uses for magnesium from supplements is 250 mg a day. It doesn’t include the magnesium naturally in food (EFSA). High doses from supplements often cause diarrhoea, sometimes with nausea and cramps; magnesium carbonate, chloride, gluconate and oxide are the forms most often reported (NIH ODS).</li>
<li><strong>Kidney disease.</strong> Healthy kidneys clear extra magnesium. When they don’t work well, the risk of too much goes up, so ask your doctor first (NIH ODS).</li>
<li><strong>Medicines.</strong> Magnesium can get in the way of some medicines. Keep it at least 2 hours apart from bisphosphonates for osteoporosis. With tetracycline or quinolone antibiotics, take the antibiotic at least 2 hours before or 4 to 6 hours after the magnesium. Some diuretics, and stomach-acid medicines (proton pump inhibitors) taken for a long time, change magnesium levels too (NIH ODS). If you take any regular medication, ask a pharmacist.</li>
<li><strong>Pregnancy and breastfeeding.</strong> Ask your doctor or midwife before taking any supplement.</li>
</ul>

<h2>Start with dinner, and with the evening</h2>
<p>If you want more magnesium, start with food: a handful of nuts or seeds, beans or lentils, something green, wholegrain instead of white. The upper limit is for supplements, not for dinner.</p>
<p>And if the real problem is a head that won’t clock off, no mineral replaces an evening with an ending. The <a href="${url('ritual')}">free 20-minute ritual</a> walks you through one: park the unfinished things, change out of work, lower the lights, phone down, breathe out longer. No account, nothing to buy.</p>
<p>If you’re sleeping badly most nights for weeks, talk to a doctor. That’s not a failure of the routine; it’s the right tool for a different problem.</p>`,
  sourcesTitle: 'Sources',
  sources: [
    {
      text: 'Commission Regulation (EU) No 432/2012 establishing a list of permitted health claims made on foods, other than those referring to the reduction of disease risk and to children’s development and health. Annex: magnesium. EUR-Lex.',
      url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32012R0432',
    },
    {
      text: 'Regulation (EU) No 1169/2011 on the provision of food information to consumers. Annex XIII: reference intakes and significant amounts of vitamins and minerals. EUR-Lex.',
      url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32011R1169',
    },
    {
      text: 'EFSA. Overview on Tolerable Upper Intake Levels as derived by the Scientific Committee on Food (SCF) and the EFSA Panel on Dietetic Products, Nutrition and Allergies (NDA). Magnesium: 250 mg a day from supplements (SCF, 2001).',
      url: 'https://www.efsa.europa.eu/sites/default/files/2024-05/ul-summary-report.pdf',
    },
    {
      text: 'NIH Office of Dietary Supplements. Magnesium: Fact Sheet for Health Professionals.',
      url: 'https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/',
    },
    {
      text: 'Mah, J., &amp; Pitre, T. (2021). Oral magnesium supplementation for insomnia in older adults: A systematic review &amp; meta-analysis. <em>BMC Complementary Medicine and Therapies</em>, 21(1), 125.',
      url: 'https://doi.org/10.1186/s12906-021-03297-z',
    },
    {
      text: 'Boyle, N. B., Lawton, C., &amp; Dye, L. (2017). The effects of magnesium supplementation on subjective anxiety and stress: A systematic review. <em>Nutrients</em>, 9(5), 429.',
      url: 'https://doi.org/10.3390/nu9050429',
    },
  ],
  disclaimer: 'This guide is general information, not medical or legal advice. It doesn’t describe or promote any product. If you take medication, are pregnant or breastfeeding, or have a health condition, ask a doctor or pharmacist before taking any supplement.',
  tonight: ['Build tonight’s dinner around beans, lentils or leafy greens.', 'Add a handful of nuts or seeds.', 'Swap white bread, rice or pasta for wholegrain.'],
  cta: 'Try the 20-minute ritual',
});
