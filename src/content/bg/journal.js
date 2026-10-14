export default () => ({
  meta: { title: 'Дневник: ръководства за след работа | ENDSHIFT', description: 'Практични ръководства с източници за частта от деня след работа. Без чудодейни обещания.' },
  title: 'Дневник',
  lead: 'Практични ръководства за частта от деня след работа. С източници, където е важно, просто, където не е, и никога реклама под прикритие.',
  posts: [{ id: 'guide-magnesium' }, { id: 'guide-l-theanine' }, { id: 'guide-melatonin' }, { id: 'guide-valerian-passionflower' }, { id: 'guide-just-checking' }, { id: 'guide-night-shift' }, { id: 'guide-switch-off' }],
  // списъкът, на групи: първо вечерта (пътят към безплатния ритуал), после съставките
  groups: [
    { title: 'Вечерта', ids: ['guide-switch-off', 'guide-night-shift', 'guide-just-checking'] },
    {
      title: 'От краткия списък на RESET',
      note: 'Какво е всяка съставка кандидат, какво казват изследванията и какво няма да твърдим.',
      ids: ['guide-magnesium', 'guide-l-theanine', 'guide-melatonin', 'guide-valerian-passionflower'],
    },
  ],
  plannedTitle: 'Предстоят',
  planned: [
    'Кафе след обяд: колко дълго всъщност остава',
    'Алкохолът като копче за изключване и защо се обръща срещу теб',
    'Светлината вечер: екрани, лампи и какво всъщност има значение',
  ],
  plannedNote: 'Предстои',
  tonight: { title: 'За тази вечер', lead: 'Отбележи какво ще направиш. Остава на това устройство и първата стъпка на ритуала ще ти напомни.', saved: 'Запазено само на това устройство.' },
  readNext: 'Прочети още',
  all: 'Всички ръководства',
  readTime: (n) => `${n} мин. четене`,
});
