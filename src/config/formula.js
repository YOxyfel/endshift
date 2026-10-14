/**
 * RESET formula data.
 *
 * Until site.config.js → product.formulaConfirmed is true, the site shows these as a
 * public shortlist ("candidate" / "undecided") with no doses and no claims.
 *
 * When the formula is final:
 *   1. set status to "included" (or remove ingredients that didn't make it)
 *   2. fill in dose + unit per daily serving and nrvPercent where an NRV exists
 *   3. for each claim, check the exact wording and conditions against the EU Register of
 *      nutrition and health claims, then set verified: true
 *   4. set product.formulaConfirmed = true in site.config.js
 *
 * Claims with verified: false are never rendered. Text is per locale; missing locales fall
 * back to English. The Bulgarian claim texts must also match the Bulgarian version of
 * Regulation (EU) 432/2012 word for word before they are verified.
 */

export default {
  servingSize: { en: null }, // e.g. { en: "2 capsules", bg: "2 капсули" }
  capsuleMaterial: null, // e.g. "vegan (HPMC)"
  allergens: null,

  ingredients: [
    {
      id: 'magnesium',
      name: { en: 'Magnesium', bg: 'Магнезий' },
      status: 'candidate', // candidate | undecided | included | removed
      form: null, // e.g. "magnesium bisglycinate"
      dose: null,
      unit: 'mg',
      nrvPercent: null,
      what: {
        en: 'An essential mineral found in nuts, seeds, whole grains and leafy greens.',
        bg: 'Основен минерал, който се съдържа в ядки, семена, пълнозърнести храни и зелени листни зеленчуци.',
      },
      why: {
        en: 'It is one of the few evening-formula ingredients with authorised EU health claims, as long as the dose is high enough.',
        bg: 'Една от малкото вечерни съставки с разрешени в ЕС здравни претенции, ако дозата е достатъчно висока.',
      },
      notPromise: {
        en: 'Topping up magnesium will not switch your brain off on its own.',
        bg: 'Допълнителният магнезий сам по себе си няма да изключи главата ти.',
      },
      claims: [
        {
          text: { en: 'Magnesium contributes to normal psychological function.', bg: 'Магнезият допринася за поддържането на нормалната психична функция.' },
          condition: { en: 'Only if a daily serving gives at least 15% of the reference intake: 56 mg of the 375 mg NRV.', bg: 'Само ако дневната доза дава поне 15% от референтния прием: 56 mg от 375 mg ХСП.' },
          verified: false,
        },
        {
          text: { en: 'Magnesium contributes to a reduction of tiredness and fatigue.', bg: 'Магнезият допринася за намаляването на чувството на отпадналост и умора.' },
          condition: { en: 'Only if a daily serving gives at least 15% of the reference intake: 56 mg of the 375 mg NRV.', bg: 'Само ако дневната доза дава поне 15% от референтния прием: 56 mg от 375 mg ХСП.' },
          verified: false,
        },
      ],
      cautions: { en: 'High doses of supplemental magnesium can upset the stomach.', bg: 'Високите дози магнезий от добавки могат да разстроят стомаха.' },
      readMore: { label: 'NIH Office of Dietary Supplements: Magnesium', url: 'https://ods.od.nih.gov/factsheets/Magnesium-Consumer/' },
    },
    {
      id: 'l-theanine',
      name: { en: 'L-theanine', bg: 'L-теанин' },
      status: 'candidate',
      form: null,
      dose: null,
      unit: 'mg',
      nrvPercent: null,
      what: {
        en: 'An amino acid that occurs naturally in tea leaves, without the caffeine.',
        bg: 'Аминокиселина, която се съдържа естествено в чаените листа, но без кофеина.',
      },
      why: {
        en: 'A popular evening ingredient that people already know from tea and other supplements.',
        bg: 'Популярна вечерна съставка, позната от чая и от други добавки.',
      },
      notPromise: {
        en: 'No “calm in a capsule”. Whatever it does for you, it won’t replace the rest of the ritual.',
        bg: 'Никакво „спокойствие в капсула“. Каквото и да прави за теб, няма да замени останалата част от ритуала.',
      },
      claims: [],
      cautions: { en: 'Ask a pharmacist first if you take any regular medication.', bg: 'Ако приемаш лекарства редовно, първо попитай фармацевт.' },
      readMore: null,
    },
    {
      id: 'valerian',
      name: { en: 'Valerian root', bg: 'Корен от валериана' },
      status: 'candidate',
      form: null,
      dose: null,
      unit: 'mg',
      nrvPercent: null,
      what: {
        en: 'A root that has been used in European evening herbal teas and tinctures for a long time.',
        bg: 'Корен, който отдавна се използва в европейските вечерни билкови чайове и тинктури.',
      },
      why: {
        en: 'It is a familiar, traditional evening botanical.',
        bg: 'Позната, традиционна вечерна билка.',
      },
      notPromise: {
        en: 'It isn’t a sleeping pill, and RESET won’t be sold as one. (EU health claims for botanicals like valerian are on hold, so there are none to make.)',
        bg: 'Не е приспивателно и RESET няма да се продава като такова. (Здравните претенции в ЕС за билки като валерианата са спрени, така че няма какво да се твърди.)',
      },
      claims: [],
      cautions: {
        en: 'Can cause drowsiness. Don’t combine with alcohol or sedative medication, and don’t take it before driving.',
        bg: 'Може да предизвика сънливост. Не комбинирай с алкохол или успокоителни лекарства и не приемай преди шофиране.',
      },
      readMore: { label: 'NCCIH: Valerian', url: 'https://www.nccih.nih.gov/health/valerian' },
    },
    {
      id: 'passionflower',
      name: { en: 'Passionflower', bg: 'Пасифлора' },
      status: 'candidate',
      form: null,
      dose: null,
      unit: 'mg',
      nrvPercent: null,
      what: {
        en: 'A flowering climbing plant, common in evening herbal blends.',
        bg: 'Цъфтящо увивно растение, често срещано във вечерните билкови смеси.',
      },
      why: {
        en: 'It is often paired with valerian in traditional evening formulas.',
        bg: 'В традиционните вечерни формули често се съчетава с валериана.',
      },
      notPromise: {
        en: 'Nothing on the label about what it “does”. Just what it is and how much.',
        bg: 'Нищо на етикета за това какво „прави“. Само какво е и колко.',
      },
      claims: [],
      cautions: {
        en: 'Can cause drowsiness. Not recommended during pregnancy.',
        bg: 'Може да предизвика сънливост. Не се препоръчва по време на бременност.',
      },
      readMore: { label: 'NCCIH: Passionflower', url: 'https://www.nccih.nih.gov/health/passionflower' },
    },
    {
      id: 'melatonin',
      name: { en: 'Melatonin', bg: 'Мелатонин' },
      status: 'undecided',
      form: null,
      dose: null,
      unit: 'mg',
      nrvPercent: null,
      what: {
        en: 'A hormone your body makes in the evening. Also sold as a supplement.',
        bg: 'Хормон, който тялото ти произвежда вечер. Продава се и като добавка.',
      },
      why: {
        en: 'Undecided. Many people specifically want a melatonin-free evening product, and the rules on melatonin in food supplements differ between EU countries.',
        bg: 'Нерешено. Много хора търсят именно вечерен продукт без мелатонин, а правилата за мелатонина в хранителните добавки са различни в отделните страни от ЕС.',
      },
      notPromise: {
        en: 'If RESET contains melatonin, the front of the label will say so. No small print.',
        bg: 'Ако RESET съдържа мелатонин, ще пише на лицевата страна на етикета. Без дребен шрифт.',
      },
      claims: [
        {
          text: { en: 'Melatonin contributes to the reduction of time taken to fall asleep.', bg: 'Мелатонинът допринася за съкращаване на времето за заспиване.' },
          condition: { en: 'Only with 1 mg of melatonin taken close to bedtime.', bg: 'Само при 1 mg мелатонин, приет малко преди лягане.' },
          verified: false,
        },
      ],
      cautions: {
        en: 'Not for children, or during pregnancy or breastfeeding. Can interact with some medications. Not before driving.',
        bg: 'Не е за деца, нито по време на бременност или кърмене. Може да взаимодейства с някои лекарства. Не преди шофиране.',
      },
      readMore: { label: 'NCCIH: Melatonin', url: 'https://www.nccih.nih.gov/health/melatonin-what-you-need-to-know' },
    },
  ],

  // Statements every EU food supplement label must carry (Directive 2002/46/EC),
  // plus the warnings we will add. Shown on the formula page.
  labelStatements: {
    en: [
      'Do not exceed the recommended daily dose.',
      'Food supplements should not be used as a substitute for a varied and balanced diet and a healthy lifestyle.',
      'Keep out of the reach of young children.',
      'Not recommended during pregnancy or breastfeeding, or for people under 18.',
      'If you take medication, ask your doctor or pharmacist before use.',
    ],
    bg: [
      'Да не се превишава препоръчителната дневна доза.',
      'Хранителните добавки не трябва да се използват като заместител на разнообразното и балансирано хранене и здравословния начин на живот.',
      'Да се съхранява на място, недостъпно за малки деца.',
      'Не се препоръчва по време на бременност или кърмене, както и за лица под 18 години.',
      'Ако приемаш лекарства, посъветвай се с лекар или фармацевт преди употреба.',
    ],
  },
};
