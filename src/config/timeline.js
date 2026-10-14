/**
 * Build-in-public timeline, oldest first.
 *
 * status: "done" | "now" | "next"
 * date:   ISO date string ("2026-09-14") or null if you'd rather not show one
 * Text fields are per locale ({ en, bg }); missing locales fall back to English.
 * Optional: media: { type: "video" | "image", url, label } — video links open on the platform.
 *
 * Statuses below were set from the original website brief. Correct them freely.
 */

export default [
  {
    id: 'ad',
    status: 'done',
    date: null,
    title: { en: 'Clicked a manufacturer’s ad', bg: 'Кликнах на реклама на производител' },
    note: {
      en: 'A white-label supplement manufacturer offered a free meeting. Curiosity won.',
      bg: 'Производител на хранителни добавки предлагаше безплатна среща. Любопитството спечели.',
    },
  },
  {
    id: 'meeting',
    status: 'done',
    date: null,
    title: { en: 'Took the free meeting', bg: 'Отидох на срещата' },
    note: {
      en: 'Learned how white-label works: you pick from a catalogue of tested formulas, they produce it, you own the brand.',
      bg: 'Научих как работи white-label: избираш от каталог с тествани формули, те произвеждат, марката е твоя.',
    },
  },
  {
    id: 'moq',
    status: 'done',
    date: null,
    title: { en: 'Learned the minimum: 500 units', bg: 'Минимумът: 500 бройки' },
    note: {
      en: 'Nobody makes 20 jars. The first run is 500 or nothing. That’s why the founding batch exists.',
      bg: 'Никой не прави 20 буркана. Първата партида е 500 или нищо. Затова съществува първата партида на основателите.',
    },
    decision: { en: 'Find enough people before spending money on stock.', bg: 'Първо да се съберат достатъчно хора, после да се харчат пари за стока.' },
  },
  {
    id: 'format',
    status: 'done',
    date: null,
    title: { en: 'Compared sachets and capsules', bg: 'Сравних сашета и капсули' },
    note: {
      en: 'Drink sachets felt more like a ritual. Capsules were simpler, travel better and have no taste to get wrong.',
      bg: 'Сашетата за напитка са повече ритуал. Капсулите са по-прости, по-удобни за път и няма вкус, който да се обърка.',
    },
    decision: { en: 'Leaning capsules for Batch #001. A drink stays on the list for later.', bg: 'Клоня към капсули за Партида №001. Напитката остава в списъка за по-късно.' },
  },
  {
    id: 'catalogue',
    status: 'done',
    date: null,
    title: { en: 'Received the formula catalogue', bg: 'Получих каталога с формули' },
    note: {
      en: 'Dozens of evening formulas. Most had too many ingredients or claims we wouldn’t put our name on.',
      bg: 'Десетки вечерни формули. Повечето имаха твърде много съставки или твърдения, под които не бих се подписал.',
    },
  },
  {
    id: 'shortlist',
    status: 'now',
    date: null,
    title: { en: 'Building the ingredient shortlist', bg: 'Правя краткия списък със съставки' },
    note: {
      en: 'Magnesium, L-theanine, valerian and passionflower are on it. Melatonin is undecided. The full reasoning is on the formula page.',
      bg: 'Магнезий, L-теанин, валериана и пасифлора са в списъка. За мелатонина още не съм решил.',
    },
  },
  {
    id: 'website',
    status: 'now',
    date: null,
    title: { en: 'Built this website', bg: 'Направих този сайт' },
    note: {
      en: 'Including a free ritual, so the site is useful even if the product never ships.',
      bg: 'С безплатен ритуал, за да е полезен сайтът дори ако продуктът никога не излезе.',
    },
  },
  {
    id: 'first-100',
    status: 'next',
    date: null,
    title: { en: 'First 100 people on the founding list', bg: 'Първите 100 души в списъка' },
    note: { en: 'The first real signal that this should exist.', bg: 'Първият истински знак, че това трябва да съществува.' },
  },
  {
    id: 'prototype',
    status: 'next',
    date: null,
    title: { en: 'Final formula and prototype', bg: 'Финална формула и прототип' },
    note: {
      en: 'Formula signed off, doses published, samples in hand, packaging designed.',
      bg: 'Одобрена формула, публикувани дози, мостри в ръка, готова опаковка.',
    },
  },
  {
    id: 'preorders',
    status: 'next',
    date: null,
    title: { en: 'Preorders open for Batch #001', bg: 'Предварителни поръчки за Партида №001' },
    note: {
      en: 'Price, dispatch date and refund terms published before anyone pays anything.',
      bg: 'Цена, дата на изпращане и условия за връщане – публикувани, преди някой да плати.',
    },
  },
  {
    id: 'production',
    status: 'next',
    date: null,
    title: { en: 'Production run of 500', bg: 'Производство на 500 бройки' },
    note: { en: 'Starts when 150 founders are in.', bg: 'Започва, когато се съберат 150 основатели.' },
  },
  {
    id: 'shipping',
    status: 'next',
    date: null,
    title: { en: 'First shipment', bg: 'Първата пратка' },
    note: { en: 'Founders first.', bg: 'Първо основателите.' },
  },
];
