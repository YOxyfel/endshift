export default () => ({
  meta: { title: 'Journal: after-work guides | ENDSHIFT', description: 'Practical, sourced guides about the part of the day after work. No miracle claims.' },
  title: 'Journal',
  lead: 'Practical guides for the part of the day after work. Sourced where it matters, plain where it doesn’t, and never a sales pitch in disguise.',
  posts: [{ id: 'guide-magnesium' }, { id: 'guide-l-theanine' }, { id: 'guide-melatonin' }, { id: 'guide-valerian-passionflower' }, { id: 'guide-just-checking' }, { id: 'guide-night-shift' }, { id: 'guide-switch-off' }],
  // the index, grouped: the evening first (the way into the free ritual), the ingredient guides after
  groups: [
    { title: 'The evening', ids: ['guide-switch-off', 'guide-night-shift', 'guide-just-checking'] },
    {
      title: 'On the RESET shortlist',
      note: 'What each candidate ingredient is, what the evidence says, and what we won’t claim.',
      ids: ['guide-magnesium', 'guide-l-theanine', 'guide-melatonin', 'guide-valerian-passionflower'],
    },
  ],
  plannedTitle: 'In the works',
  planned: [
    'Caffeine after lunch: how long it really stays',
    'Alcohol as an off switch, and why it backfires',
    'Evening light: screens, lamps and what actually matters',
  ],
  plannedNote: 'Planned',
  tonight: { title: 'Take this into tonight', lead: 'Tick what you’ll do. It stays on this device, and the ritual’s first step will remind you.', saved: 'Saved on this device only.' },
  readNext: 'Read next',
  all: 'All guides',
  readTime: (n) => `${n} min read`,
});
