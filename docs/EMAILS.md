# ENDSHIFT emails: confirmation and the welcome sequence

Copy for the mailing tool, in English and Bulgarian. Paste it into Brevo or MailerLite as described at the end. The tone is the site's: short, plain, honest about what isn't finished. **No health claims.** RESET is "an evening capsule we're building" and "one optional step in the ritual". It doesn't help anyone sleep, calm down or recover in these emails.

The founder number: people are numbered in the order they confirm (the count of confirmed people on the founding list at that moment). If people leave the list, later numbers can repeat an earlier one; that's fine for a card, but don't promise anything tied to a number.

Placeholders: `{{ritual_url}}` = `https://<your domain>/ritual/` (`/bg/ritual/` in Bulgarian), `{{site_url}}`, `{{founder_name}}`, `{{founders}}` (current count) and `{{goal}}` (150). The reward line only shows for contacts whose `REWARD` attribute (Brevo) or `reward` field (MailerLite) is `switch-15`.

---

## 0. Confirmation (double opt-in)

Sent automatically by the signup function before anyone is added.

**EN**
- Subject: Confirm, and you're on the list
- Preview: One click. Then nothing until there's something real.

> Hi,
>
> Tap the button to confirm you want emails about ENDSHIFT and Batch #001.
>
> **[Confirm my email]** ← Brevo: `{{ doubleoptin }}` · MailerLite: the confirmation button
>
> If you didn't sign up, ignore this email. Nothing else will happen.
>
> ENDSHIFT

**BG**
- Тема: Потвърди и си в списъка
- Преглед: Един клик. После нищо, докато няма нещо истинско.

> Здравей,
>
> Натисни бутона, за да потвърдиш, че искаш имейли за ENDSHIFT и Партида №001.
>
> **[Потвърждавам имейла си]**
>
> Ако не си се записвал(а), просто игнорирай този имейл. Нищо друго няма да се случи.
>
> ENDSHIFT

---

## 1. Welcome (right after confirming)

**EN**
- Subject: You're in. Here's what happens next.
- Preview: And something free for tonight.

> Thanks for joining the ENDSHIFT founding list.
>
> First, the honest status: RESET, the evening capsule, is still being built. The formula isn't final, there's no price yet, and nothing can be bought. Being on this list costs nothing and commits you to nothing.
>
> What happens next:
>
> - When {{goal}} people are on this list, everyone on it gets one email to pay for their jar, if they still want it. Batch #001 is then made for the founders who pay (the manufacturer's minimum run is 500). Nothing can be bought before that email.
> - Now and then, a short build update: what we decided, what went wrong, what's next. No more than a couple a month.
>
> *[only if REWARD = switch-15]* Your 15% from the switch game is saved to this address. The code comes by email the day preorders open. It's for one RESET order from Batch #001.
>
> Something for tonight, free and finished: **the 20-minute ritual** → {{ritual_url}}
> Seven small steps and a guided breath for the end of a shift. No account, nothing to buy.
>
> If you want, reply and tell us what your shift looks like. A person reads every reply.
>
> {{founder_name}}, ENDSHIFT

**BG**
- Тема: Вътре си. Ето какво следва.
- Преглед: И нещо безплатно за довечера.

> Благодарим, че се записа в списъка на основателите на ENDSHIFT.
>
> Първо, честно докъде сме: RESET, вечерната капсула, още се прави. Формулата не е окончателна, цена още няма и нищо не може да се купи. Да си в списъка не струва нищо и не те задължава с нищо.
>
> Какво следва:
>
> - Когато в този списък има {{goal}} души, всеки в него получава един имейл да плати своя буркан, ако още го иска. После Партида №001 се прави за основателите, които платят (минималното производство на производителя е 500 броя). Преди този имейл нищо не може да се купи.
> - От време на време кратка новина по работата: какво решихме, какво се обърка, какво следва. Не повече от два пъти в месеца.
>
> *[само ако REWARD = switch-15]* Твоите 15% от играта с ключа са запазени за този имейл. Кодът идва по имейл в деня, в който отворят поръчките. Важи за една поръчка на RESET от Партида №001.
>
> Нещо за довечера, безплатно и готово: **20-минутният ритуал** → {{ritual_url}}
> Седем малки стъпки и водено дишане за края на смяната. Без регистрация, без нищо за купуване.
>
> Ако искаш, отговори ни и разкажи как изглежда твоята смяна. Всеки отговор го чете човек.
>
> {{founder_name}}, ENDSHIFT

---

## 2. Two days later: the ritual, step by step

**EN**
- Subject: The 20 minutes, step by step
- Preview: It works without buying anything.

> The ritual is the part of ENDSHIFT that's already finished. Here it is in plain words, seven steps, twenty minutes:
>
> 1. **Clock out** (2 min). Close every work app, then write down the three things still circling in your head. They're saved for tomorrow now.
> 2. **Change the room** (3 min). Work clothes off, wash your face. Your body notices the switch even when your head doesn't.
> 3. **Water** (2 min). A full glass, slowly, sitting down.
> 4. **Lower the lights** (2 min). Big light off, lamps on, screens dimmed.
> 5. **Phone down** (1 min). Do Not Disturb, face down, another room if you can.
> 6. **Breathe** (5 min). Follow the light: in as it rises, out slowly as it sets. The ritual counts it for you.
> 7. **Something quiet** (5 min). A few pages, a record, one tidy surface. Anything that isn't an inbox.
>
> Night shift? There's a version for 07:30. On the bus? There's a five-minute one. Both are on the start screen: {{ritual_url}}
>
> If you try it tonight, reply with one thing that didn't work for you. We change the ritual based on those replies.
>
> {{founder_name}}

**BG**
- Тема: 20-те минути, стъпка по стъпка
- Преглед: Работи и без да купуваш нищо.

> Ритуалът е частта от ENDSHIFT, която вече е готова. Ето го с прости думи, седем стъпки, двайсет минути:
>
> 1. **Чекирай изход** (2 мин). Затвори всички работни приложения и запиши трите неща, които още ти се въртят в главата. Вече са запазени за утре.
> 2. **Смени обстановката** (3 мин). Свали работните дрехи, измий лицето си. Тялото забелязва прехода, дори когато главата не го прави.
> 3. **Вода** (2 мин). Цяла чаша, бавно, седнал(а).
> 4. **Намали светлината** (2 мин). Голямата лампа угасва, малките светват, екраните по-тъмни.
> 5. **Телефонът настрана** (1 мин). „Не безпокойте“, с екрана надолу, в друга стая, ако можеш.
> 6. **Дишай** (5 мин). Следвай светлината: вдишване, докато се издига, бавно издишване, докато залязва. Ритуалът брои вместо теб.
> 7. **Нещо тихо** (5 мин). Няколко страници, музика, една подредена повърхност. Всичко, което не е пощата.
>
> Нощна смяна? Има версия за 07:30. В автобуса? Има петминутна. И двете са на началния екран: {{ritual_url}}
>
> Ако го пробваш довечера, отговори с едно нещо, което не ти пасна. Променяме ритуала според тези отговори.
>
> {{founder_name}}

---

## 3. A week later: what we know, what we don't yet

**EN**
- Subject: What's decided, and what isn't (yet)
- Preview: Building RESET in public, week one.

> A week in, here's where RESET stands.
>
> **Known**
> - The ritual is free and finished. It works without buying anything.
> - RESET is planned as an evening capsule: one optional step inside the ritual.
> - At {{goal}} people on the list, everyone gets an email to pay, and Batch #001 is made for the founders who do. Right now: {{founders}}.
> - Every ingredient and dose will be published before anyone pays.
>
> **Not decided yet**
> - The final formula. The shortlist is public: {{site_url}}/formula/
> - The price.
> - The packaging. What you've seen is a concept.
> - The dispatch date.
>
> The build log has every step so far, including the mistakes: {{site_url}}/story/
>
> Two ways to help, if you'd like: reply with what you'd want an evening capsule to be (or not be), and send the ritual to one person who still answers work messages at 23:00.
>
> {{founder_name}}

**BG**
- Тема: Какво е решено и какво още не е
- Преглед: Правим RESET публично, седмица първа.

> Мина седмица, ето докъде е RESET.
>
> **Ясно е**
> - Ритуалът е безплатен и готов. Работи и без да купуваш нищо.
> - RESET е замислен като вечерна капсула: една незадължителна стъпка в ритуала.
> - При {{goal}} души в списъка всеки получава имейл за плащане и Партида №001 се прави за основателите, които платят. В момента: {{founders}}.
> - Всяка съставка и доза ще бъдат публикувани, преди някой да плати.
>
> **Още не е решено**
> - Окончателната формула. Краткият списък е публичен: {{site_url}}/formula/
> - Цената.
> - Опаковката. Това, което си видял(а), е концепция.
> - Датата на изпращане.
>
> В дневника на работата е всяка стъпка досега, включително грешките: {{site_url}}/story/
>
> Два начина да помогнеш, ако искаш: отговори какво би искал(а) да бъде една вечерна капсула (или какво да не бъде), и прати ритуала на един човек, който още отговаря на работни съобщения в 23:00.
>
> {{founder_name}}

---

## P. Preorders are open (once, when the list reaches {{goal}})

Sent once, by hand, to everyone on the founding list on the day it reaches {{goal}}, after the formula, price, dispatch window and refund terms are published on the site and preorders are switched on (`product.status: 'preorder'`, `payments`). Extra placeholders: `{{price}}` (the founder price), `{{dispatch}}` (the estimated dispatch window), `{{pay_by}}` (the last day to pay) and `{{preorder_url}}` (the checkout link).

**EN**
- Subject: {{goal}} of you. Batch #001 can be made.
- Preview: How to pay for your jar, if you still want it.

> The founding list just reached {{goal}}. That was the plan from the start: at {{goal}}, everyone on the list gets this email, and Batch #001 is made for the founders who pay.
>
> **What's final now**
> - The formula, with every dose: {{site_url}}/formula/
> - The founder price: {{price}}, shipping shown before you pay.
> - Estimated dispatch: {{dispatch}}. If it moves, you hear it from us first.
>
> **Pay for yours by {{pay_by}}** → {{preorder_url}}
>
> If you'd rather not, do nothing. You stay on the list for build updates, or leave it in one click.
>
> If Batch #001 doesn't go ahead, every payment is refunded in full, automatically. You don't have to ask.
>
> *[only if REWARD = switch-15]* Your 15% from the switch game: use the code {{reward_code}} at checkout.
>
> {{founder_name}}, ENDSHIFT

**BG**
- Тема: Вече сте {{goal}}. Партида №001 може да се направи.
- Преглед: Как да платиш своя буркан, ако още го искаш.

> Списъкът на основателите току-що стигна {{goal}}. Такъв беше планът от самото начало: при {{goal}} всеки в списъка получава този имейл и Партида №001 се прави за основателите, които платят.
>
> **Какво вече е окончателно**
> - Формулата, с всяка доза: {{site_url}}/bg/formula/
> - Цената за основатели: {{price}}, а доставката виждаш преди плащането.
> - Очакван срок за изпращане: {{dispatch}}. Ако се промени, научаваш първо от нас.
>
> **Плати своя до {{pay_by}}** → {{preorder_url}}
>
> Ако не искаш, просто не прави нищо. Оставаш в списъка за новините по работата или излизаш от него с един клик.
>
> Ако не се стигне до производство на Партида №001, всяко плащане се връща изцяло, автоматично. Не е нужно да питаш.
>
> *[само ако REWARD = switch-15]* Твоите 15% от играта с ключа: използвай кода {{reward_code}} при плащането.
>
> {{founder_name}}, ENDSHIFT

---

## R. The one reminder (only if they ticked it)

Sent once, the day after signing up on the ritual's end screen, at their `REMIND_TIME`. See `docs/REMINDERS.md`.

**EN**
- Subject: Same time as yesterday?
- Preview: Twenty minutes, then the day is over.

> It's about the time you said yesterday.
>
> If the shift is done, the 20 minutes are ready: {{ritual_url}}
>
> If it isn't, ignore this. This is the only reminder we'll send. For a daily one, add it to your calendar from the end of the ritual.
>
> {{founder_name}}

**BG**
- Тема: Пак по същото време?
- Преглед: Двайсет минути и денят свършва.

> Часът е горе-долу този, който каза вчера.
>
> Ако смяната е свършила, 20-те минути те чакат: {{ritual_url}}
>
> Ако не е, просто игнорирай този имейл. Това е единственото напомняне, което ще изпратим. За всекидневно напомняне го добави в календара си от края на ритуала.
>
> {{founder_name}}

---

## Setting it up

**Brevo**
1. Contacts → Settings → Contact attributes: create `LOCALE`, `SOURCE`, `REWARD`, `LIST`, `JOB`, `REMIND_TIME`, `TZ` (text). The signup function sends them; Brevo rejects attributes that don't exist. `JOB` is what people picked under "What do you do?" on the home page (kitchen, shop, office, ward, depot, clients), empty if they didn't.
2. Templates: make the double opt-in template from email 0 (one per language, or one template with both). It must contain the `{{ doubleoptin }}` link. Put its id in `BREVO_DOI_TEMPLATE`.
3. Automations: trigger "Contact added to list" (the founding list) → split by `LOCALE` → email 1 → wait 2 days → email 2 → wait 5 days → email 3. Show the reward paragraph with a condition on `REWARD` equals `switch-15`.
4. Nothing to set for where the confirm button goes: the signup function points it at `/api/confirmed`, which counts the founding list at that moment and sends the person to the site with their founder number. The site then shows their founder card, which they can save or share.

**MailerLite**
1. Settings → Subscribe settings: turn on "Double opt-in for API and integrations", and set the confirmation email from email 0. Where it asks what happens after confirming, choose a custom redirect URL: `https://<your domain>/api/confirmed?list=batch-001` (add `&locale=bg` if most of your list is Bulgarian; MailerLite uses one URL for everyone). That's what gives people their founder number and card.
2. Subscribers → Fields: create `locale`, `source`, `reward`, `job`, `remind_time`, `tz` (text).
3. Automations: trigger "When subscriber joins a group" (the founding list group) → condition on `locale` → emails 1, 2 and 3 with the same waits. Use a condition block on `reward` for the reward paragraph.

**Then on the site:** set the environment variables listed at the top of `server/core.mjs` in your host's dashboard, set `forms.endpoint: '/api/signup'` and `batch.countEndpoint: '/api/count'` in `site.config.js`, deploy, and sign up once yourself in each language.
