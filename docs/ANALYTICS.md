# Analytics event plan

Every event goes through one function, `ES.track(name, props)` in `src/assets/js/site.js`. It forwards to whichever provider is set in `site.config.js → analytics.provider`, and always fires a browser event (`es:track`) that you can listen to for debugging. Set `analytics.debug: true` to log every event to the console.

Every event carries `locale`. Most also carry `page`.

**Provider recommendation:** Plausible or Umami. Both are cookieless, so no consent banner is needed in most setups, and custom events with properties work out of the box. GA4 is supported, but it only loads after the visitor opts in (consent bar + the Cookie preferences page).

## The funnel

```
Path A  hero CTA / sticky CTA ─► ritual_start ─► ritual_complete ─► signup_success (list: ritual)
Path B  page view /reset/ ─► cta_click (batch_*) ─► signup_success (list: batch-001) ─► preorder_click ─► purchase
```

## Events

| Event | When | Properties | Answers |
|---|---|---|---|
| *page view* | Every page (automatic in all providers) | | Product page views, story page views |
| `cta_click` | Any tracked button or link | `id` (e.g. `hero_primary`, `hero_secondary`, `sticky`, `home_product`, `final_ritual`, `batch_home_product`, `film_skip`), `page` | Hero CTA click rate, which CTA placements work |
| `intro_start` | The opening montage starts (first visit to home) | | How many see it |
| `intro_skip` | Skip, a key or a scroll ended the montage before the gate | `scene` (1–7, where they left) | Whether it's too long |
| `intro_gate` | The switch appeared in the dark | | |
| `intro_enter` | Went in from the gate without flipping (Skip, Escape, scroll) | `how` | Compare with `shift_switch` `source: intro` |
| `intro_complete` | The opening handed over to the page | `skipped`, `flipped` | |
| `intro_handoff` | The opening's switch flew into the game (home with the game on) | | |
| `story_switch` | The switch is pressed in the home page film (scrolled past the moment, once per visit) | `how` (`film`) | How far people watch |
| `film_watch` | “Watch with sound”: the home page film playing by itself | `action` (`start` / `pause` / `resume` / `end` / `close` / `voice_on` / `voice_off` / `sound_on` / `sound_off`), `from` (`top` = the button under the summary, `here` = the one in the film), `via` (on `start`: `nudge` = the hand-drawn "Much better with narration" note, `button`), `voice` (`clip` = recorded, `device` = the device's speech voice, `none`, `off`), `how` (`button` / `tap` / `key` / `scroll` / `seek` / `skip` / `left` / `hidden`), `beat` (where in the film), `percent` (on `close`) | Whether people watch it rather than scroll it, and where they stop. `start` ÷ home views next to `scroll_depth` |
| `game_start` | First interaction with today's game | `game` (`bed`, `kitchen`, `ward`, `office`, `shop`, `clients`, `depot`), `type` (`room` / `flood` / `torch`) | **Game engagement** |
| `game_touch` | Something that isn't the switch was used | `game`, `object`, `kind` (`object` / `decoy`) | What people try first |
| `game_hint` | The game helped (by itself or asked) | `game`, `level` (1–4), `asked` | Whether a game is too hard |
| `game_reveal` | The thing hiding the switch moved | `game`, `object` | |
| `game_win` | The switch was found and flipped | `game`, `type`, `ms`, `level` (help reached), `touches`, `how` | **Game completions**, time to find |
| `game_skip` | "Skip the game" used | `game`, `ms`, `level` | |
| `game_replay` | "Play again" | `game` | |
| `game_reward_view` | The evening with the reward was shown | `game` | |
| `game_reward_claim` | Email left for the reward | `game` | **Reward claims**; the signup itself arrives with `reward: switch-15` |
| `shift_switch` | Work mode switched off or on | `state` (`off` / `on`), `source` (`intro` / `hero` / `header` / `ritual` / `game`), `period` (`day` / `evening` / `night`) | Whether the hook works; compare with `cta_click` `hero_primary` |
| `shift_remind` | "Still on shift? Remind me" calendar file downloaded | `out` | Daytime visitors coming back |
| `ritual_start` | Ritual started | `length` (`full` / `short` / `mini`), `context` (`work` / `study` / `mind` / `none`), `pace` (`gentle` / `steady` / `deep`), `version`, `speak`, `music` (`endshift` / `own` / `none`), `variant` (`lamp` / `rain` / `piano` / `night`), `service` (`spotify` / `youtube` / `soundcloud` / `apple`), `pick` (recommended id or `custom`), `binaural`, `guide` (Guide me on), `room` (the 3D room ran, or the flat scenes) | Ritual starts, who uses it, how, with what sound |
| `ritual_done` | Done pressed, or a guided step's time ran out | `step`, `id`, `auto`, `seconds` | How long each step really takes; whether people use Done |
| `ritual_choice` | A step's option picked (paper/typed, water/tea, read/music/sit) | `step`, `choice` | Which personal touches people use |
| `ritual_guide` | Guide me switched on or off | `on` | |
| `ritual_nudge` | The “Now with narration” note by Adjust was tapped | `where` (setup / door) | |
| `cta_click` from In short | The three lines and the way on, on the home page | `id`: `in_short_ritual` (Tonight's start button), `in_short_reset` (About RESET), `in_short_batch` (join the founding list), `in_short_film` (the film's still: where the film runs it also starts Watch with sound, see `film_watch` with `from: top`), `in_short_scroll` (or scroll through it yourself) | Which of the three lines people act on, and how they go on into the film. Counts towards the `inshort` experiment |
| `cta_click` from the In short bubbles | A bubble in “Skip the walkthrough” on the home page was opened | `id` `in_short_go_<page>` (e.g. `in_short_go_formula`; the ritual's step strip is `in_short_go_ritual_plan`), `page` | Which pages people jump to instead of scrolling the film. Counts towards the `inshort` experiment |
| `reset_turn` | The RESET bottle turned by dragging | | Whether people play with the bottle |
| `guide_tonight` | Something ticked on a guide's "Take this into tonight" | `guide`, `items` | Which guides turn into evenings |
| `404_switch` | The light switch in the 404 hallway | `on` | |
| `ritual_music_preview` | Listen pressed on a soundtrack mood | `variant` | Which moods people try |
| `ritual_music_pick` | A recommended pick chosen or a link pasted | `service`, `pick` | Which services and picks people use |
| `ritual_step` | Every step change | `step`, `id`, `auto` (true when it moved on after Done or by itself) | Where people drop off |
| `ritual_pause` / `ritual_resume` | Pause, resume, or resume after a reload | `step` | |
| `ritual_skip` / `ritual_back` | Next or previous step pressed | `step` | Steps people skip |
| `ritual_end_early` | "End now" pressed | `step`, `minutes`, `length`, `context` | |
| `ritual_breath_complete` | The breathing step ran to its end | `pace`, `length` | How many finish the five minutes of breathing |
| `ritual_complete` | Lights out at the end | `minutes`, `length`, `context`, `pace`, `step`, `evenings` (evenings ended on this device) | **Ritual completions** |
| `ritual_reminder_download` | Calendar reminder downloaded | `weekdays` | Intent to repeat |
| `ritual_sound` | Sound switched on or off during the ritual | `on` | |
| `ritual_preview_step` | A step opened in the preview on home or RESET | `step` | Interest before starting |
| `signup_submit` | Valid email submitted | `list`, `source`, `reward` (e.g. `switch-15` from the game) | |
| `signup_success` | Signup accepted by the endpoint | `list` (`batch-001`, `ritual`, `build-updates`), `source` (form location), `preview` (true while no endpoint is set) | **Waitlist signups** by placement |
| `signup_confirmed` | Came back from the confirmation email (`?confirmed=1`, via `/api/confirmed`) | `list` | **Confirmed signups** (double opt-in completion) |
| `signup_error` | Endpoint refused or network failed | `list`, `source` | Broken forms |
| `preorder_click` | "Become a founder" pressed (status `preorder` only) | `id` | **Preorder clicks** |
| `checkout_initiated` | "Buy RESET" pressed (status `in_stock` only) | `id` | **Checkout initiated** |
| `faq_open` | FAQ question expanded | `id`, `page` | **FAQ interaction**, which questions matter |
| `story_engage` | Story video, social or timeline media link opened | `id` | **Founder story engagement**, together with page views and scroll depth on `/story/` |
| `scroll_depth` | 25 / 50 / 75 / 100 % reached, once each per page view | `percent`, `page` | **Scroll depth** |
| `low_stim_toggle` | Low-stim mode switched | `state` | How many people use it |
| `sound_toggle` | The speaker in the header switched (sound for the whole site, off by default) | `state` (`on` / `off`) | How many people want the film's sound while they scroll |
| `language_switch` | Language link used | `id` | |
| `share` | Share button used on the ritual end screen | `method` (`native` / `copy`) | |
| `contact_submit` | Contact form sent | `topic`, `preview` | |
| `welcome_back` | Home page shown to someone who has done the ritual here ("Evening 3?") | `evening` | **Returning ritual users** |
| `job_pick` | A job picked under "What do you do?" | `job` | Who the visitors are; the signup carries it as `JOB` |
| `lang_hint` | The "read it in Bulgarian" note used or closed | `action` (`bg` / `close`) | Bulgarian visitors landing on English |
| `founder_sheet` | The founder card shown | `from` (`confirmed` / `note`), `numbered` | **Confirmed founders** who saw their card |
| `founder_card` | The founder card saved or shared as a picture | `action` (`download` / `share`) | Word of mouth |
| `share` | The ritual sent to someone ("Send them the ritual") | `method`, `what: ritual`, `from` (`joined` / `note` / `sheet`) | **Referrals**; arrivals show `utm_source=share` |
| `ritual_media` | Lock-screen controls started with the ritual | `on` | |
| `ritual_card_print` | The printable card printed | | |
| `push_on` / `push_off` | The phone reminder switched on or off | `days` | **Reminder opt-ins** (arrivals from it show `utm_source=reminder`) |
| `founder_voice` / `founder_video` | The founder's voice note or video played | `action` | Whether the face and voice get used |

## The weekly dashboard

Ten numbers, once a week, in the same order. In Plausible, add each **bold** event as a goal (Site settings → Goals → Custom event); the rest are page views and properties you can filter by.

| # | Number | Where it comes from | Healthy early sign |
|---|---|---|---|
| 1 | Visitors, and the share from Bulgaria | Plausible top stats, Countries | Bulgaria the largest |
| 2 | Game started / home visitors | `game_start` ÷ home page views | over 40 % |
| 3 | Games won | `game_win` ÷ `game_start` | over 50 %; lower means a game is too hard (see `game_hint` levels) |
| 4 | Rituals started | `ritual_start` | rising week on week |
| 5 | Rituals finished | `ritual_complete` ÷ `ritual_start` | over 35 % |
| 6 | Second evenings | `welcome_back`, and `ritual_complete` with `evenings` ≥ 2 | any, then rising |
| 7 | Founding list signups | `signup_success` with `list: batch-001`, by `source` | which placement works |
| 8 | Confirmed | `signup_confirmed` ÷ (7) | over 60 %; lower means the confirmation email lands in spam |
| 9 | Passed on | `share` with `what: ritual`, and visits with `utm_source=share` | any |
| 10 | Reminders on | `push_on`, `ritual_reminder_download` | intent to come back |

Read it as a line from top to bottom: the first number that looks wrong is the one to work on that week. Don't change two things at once.

If your plan has funnels (Plausible Business), make two: **home → `game_start` → `ritual_start` → `ritual_complete`** and **`/reset/` → `cta_click` (batch) → `signup_success` → `signup_confirmed`**.

## Experiments (A/B)

`experiments` in `site.config.js` holds simple tests. For each active one, every visitor is given one variant (at random, kept on their device in `es:exp`), the page gets `html[data-exp-<name>="<variant>"]` before it paints (so CSS can switch things without a flicker), and **every event carries `x_<name>: <variant>`**. Split any funnel above by that property.

Ready to switch on:

| Test | Variants | What it changes | Read it with |
|---|---|---|---|
| `teaser` | `reward` / `plain` | Whether "Find it: 15% off your first RESET order" sits under the game's mission | `game_start` and `game_win` rates, `signup_success` with `source` starting `game-` |
| `opening` | `montage` / `none` | Whether first visits get the six-second opening or go straight to the game | `game_start`, `cta_click` `hero_primary`, `scroll_depth` |
| `inshort` | `show` / `hide` | Whether the three-line summary sits right after the game | `cta_click` `in_short_*`, `ritual_start`, `signup_success` from the home page, `scroll_depth` |

Run one test at a time when traffic is small, give each variant a few hundred visits before reading anything, then set `active: false` and keep the winner as the default.

## Purchases

Purchases happen on the checkout provider's side, so track them there. Two easy options:

1. Point the provider's "success URL" at a thank-you page and fire `purchase` from it, with `value` and `currency`.
2. Better: forward the provider's webhook (Stripe `checkout.session.completed`, Shopify `orders/paid`) to your analytics provider's server-side events API. This also counts buyers who block scripts.

The webhook is also the natural place to update the founder counter (`batch.countEndpoint`).

## Adding an event

Add `data-track="event_name" data-track-id="where"` to any link or button. For anything else, call `ES.track('event_name', { ... })`. Use lowercase snake_case, and never send email addresses or free text as properties.
