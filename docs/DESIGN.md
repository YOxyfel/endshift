# ENDSHIFT: design direction and system

The living version of this document is the `/system/` page of the site. Tokens live in `src/assets/css/base.css`.

## The idea

**Every page is one evening.** It opens loud, cold and fast, like the end of a shift under fluorescent light, and gets darker, warmer and slower as you scroll, until it ends in lamplight. The emotional arc from the brief (chaos → recognition → transition → calm → trust → participation) is the page order, and the visual system follows it:

- The page background shifts from cool graphite to warm dark as you scroll (`--warm`, 0 → 1).
- Interactive transitions get slower further down the page (`--depth` on each section).
- **The opening (first visit to the home page only).** Before the page appears, an ordinary evening plays back faster and faster in five drawn rooms from the site's own world (v0.22: the panel posters, full screen, each pushing in slowly): the bus home at 18:40, keys down in the hallway, the sofa with the work chat still going, one more thing at the desk, bed at 00:40 with the brain still on. About six seconds. The clock runs the whole time over a soft dark pool so it always reads; darker rooms get their shadows lifted a little, brighter ones dimmed. Until a picture has loaded, its scene is the old line drawing. Every change of scene sends a dark wave out across the screen, each one stronger than the last. The last wave closes to black.
- **The gate.** In the dark, first a switch's locator light, then the switch itself (about a third of the screen tall), the clock stopped at 00:47 and "All that's left is to switch off." Nothing happens until you act: flip it (tap, click, drag the rocker down, or Space / Enter / ↓) and the biggest wave opens from the switch onto the home page, already in lamplight, while the switch flies into its place in the hero. It's a soft gate: Skip, Escape, scrolling or any other key go straight in with work mode still on, and after 6 seconds a hint says so. A tap in the dark next to the switch shows the hint instead of throwing you in. Never with reduced motion or low-stim, on a #link, or on a later visit; `?intro` replays it. Code: `assets/js/intro.js`. Light levels stay low and no change is fast enough to count as a flash.
- **The hero is a game: find the switch** (since v0.6; `game.enabled` in `site.config.js`, false brings back the classic hero). One game a day, the same for everyone that day, so a return visit is a different job (`game.week`, Monday → Sunday; `?job=<id>` plays a given one, for ads aimed at one job or for testing). The opening above still plays on a first visit, but its gate doesn't ask for a flip: the switch shows up lit for a beat ("This is your switch. Work is about to hide it."), then flies and shrinks into its hiding place in today's game and is gone. "Now find it."
  - **Drawn like a graphic novel** (since v0.8). The rooms are WebGL, on a small renderer written for this site (`game-ink.js`, no library): every edge gets an ink line, surfaces are cross-hatched where the light falls off (so a room with the lights out turns into a hatched night drawing), and there's a little paper grain. Lights are real (the big light, the lamp, a window, a screen) and the lamp only comes on once you've switched off. Props carry painted pictures and words (`game-paint.js`): tickets, rotas, a patient board, an inbox, a vitals monitor, a city at night through the window. The words come from the content files, so they're Bulgarian on `/bg/`. Browsers without WebGL get the other games.
  - **Three kinds of game.** *Rooms* in 3D (`game-scenes.js` + `game-room.js`): in bed with the phone still buzzing (the switch is by the door), a restaurant kitchen after service (behind the ticket rail), the end of a night shift on a ward (under the handover sheet). Drag or swipe to look, tap the floor to walk there, arrows/WASD on a keyboard, tap the switch from anywhere and you get up and walk over. *The flood* (`game-flood.js`): a work chat after hours (manager, shop group chat, clients on a Sunday) that speeds up message by message; the switch starts tiny next to the reply box, labelled "patience", and grows with every message until it covers the chat and says "switch off". Replying only brings more. *The torch*: the depot after the last drop, lights already out; a 3D room where your phone light is a real beam that follows the pointer (a flat drawn version, `game-torch.js`, stands in without WebGL). Behind each chat there's a drawn room (dinner going cold, the shop after closing, the sofa on Sunday) whose lights go out with the phone.
  - **Every game gets easier until it can't be missed.** Four steps, by time and by wrong taps, sooner with the Hint button: the switch's locator light pulses → arrows (chevrons on the floor, an arrow on the screen edge, arrows over the switch) → the switch doubles in size and whatever hides it moves out of the way → you're walked to it ("Just press it."). Wrong things answer with one dry line each ("That's the extractor. Wrong switch.").
  - **The way out is the point.** Flip it and the room's lights die with a flicker (your phone goes dark, the torch goes out), a beat of silence, then the world comes apart: in a room the walls, floor and ceiling break into pieces that fall away and tumble; the chat turns out to be a curtain and is pulled open from the middle in folds; the dark depot turns out to be blinds and they turn open (`game-fx.js`). Behind it all is the evening: a low sun on a line, then "OUT 23:48 · Shift over.", how long it took, the 15 % reward, tonight's free ritual, RESET, where ENDSHIFT fits that job, and tomorrow's job. The rest of the site switches off with it.
  - **The reward is real and small print is shown.** `game.reward` in the config: percent, the tag sent with the signup, the code's validity. It's claimed with an email (which also joins the founding list, said next to the field), for the first RESET order from Batch #001, one per person, not combined. The terms sit under the form and on the Terms page (`#game-reward`), marked draft until `termsConfirmed`.
  - **Accessible.** The 3D world is hidden from assistive tech; a flat layer of real buttons speaks for it, so Tab moves from thing to thing, the view turns to face the focused one and a ring marks it, Enter uses it. Reduced motion: no camera glide, no flicker, the end is a fade. Without JavaScript the hero is the title, a line and the ritual button. "Skip the game" is always there.
- **After the game, the evening is one continuous shot** (`film.js`, `film.css`, since v0.9; reworked in v0.10 and v0.11). Scrolling moves the camera, a little at a time, like flicking through an animation; scroll back and it plays backwards. You walk down the hallway at 19:25 while the thoughts float past ("The customer." "The deadline."), the phone buzzes on the table, and you turn to the wall calendar. The calendar fills the screen and becomes the week: six evenings, from the bus at 18:40 to bed at 00:40, each crossed off in red marker, each thought in a bubble beside its own square; tonight's square gets a ring, and you dive into it. You're in bed, in the dark, and work is still there: notifications hang in the air of the room ("Can you cover Saturday?", "14 unread", "Re: Re: Re: deadline") and the captions say it plainly, "Lights off. Work still on." / "There has to be a switch for that." You get up and look round with a torch: not in the wardrobe, not by the window, under the desk (one sock), and there it is, the WORK switch on the wall by the bed. Walk over, lean in, CLICK: the notifications die, "Work: off.", and the cold picture cracks and falls away to the same room, warm. From the click on, the light only goes down, and every light has a source you can see: the big ceiling light (a home's warm white) and the desk lamp until step 4, then the bedside lamp alone (v0.18). A title card says the ritual starts now and lists its seven steps; then each step is acted out in that room (the laptop closes and the list gets written, the pleated curtains fold shut, water is poured from a carafe and sipped and a RESET capsule comes out of the bottle, the phone goes face down into the drawer, a book opens and turns its pages, and last a breathing ring, right before lights out). At "Lower the lights" the frame steps aside: the big light goes off with the desk lamp, a beat of dark, the bedside lamp clicks on, and the camera follows its light out as slow warm motes until they fill the whole room (v0.16, v0.18), then the frame comes back. When a step is done, a tick pops up on its tab and its diamond fills (v0.20). While a step is on screen an inked panel frame sits inset from the edge of the screen, like a game's HUD: the step number and name on a tab, its minutes, seven diamonds for progress, and a card with what to do and why (and, at the water, where RESET would fit, optional); between steps the frame fades so the room has the screen. Then lights out: the motes fade, three stay on. You lie down and blink twice (it is simply dark behind your eyelids), and through half-closed eyes the room melts, its own colours running into the dream around the RESET bottle while the three lights, taking on the dream's colours, circle it. The dream is a short journey in which the day lets go: the notifications from the dark room drift past and come apart in blue ink, the calendar's red crosses unravel into ribbons, tomorrow's list folds into a paper boat and sails off, the WORK switch tumbles away into the dark; nothing touches the bottle, and then it all slows and deepens. At the end, the little sun printed on the label lights up, the bottle melts into the dream, the swirl lays down into a sunset sky, and that sun sets over an ink horizon. Night, stars, "The day is over. Properly, this time.", and then it comes back up to the line, half above it: the ENDSHIFT mark, "Reset. Tomorrow starts fresh.", and the RESET section below starts on the same dark ground (the concept chip is on throughout the dream). Then the small print, Batch #001, the founder's strip, the letters page and "The end (of your shift)" as before. A Skip link jumps past it. With reduced motion, low-stim or no WebGL the same beats are plain comic panels one under another, every word still there. RESET, Batch #001 and Story open on a scene from the same world. Any comic panel can be swapped for a clip or still (`story.media` in the config).
- **Work mode is one switch for the whole site** (`assets/js/shift.js`). A wall rocker, up = work, down = off, in three sizes: the gate, the hero, and the header of every page. The state is saved for the evening (until 05:00) and set on `<html data-shift>` before first paint, so nothing flickers.
  - **Switching off:** a two-stage click and the office tube's hum dying, a short buzz on phones, then a low warm chord. The cold light gives a last low flicker and goes, the notifications fall asleep one by one, the lamp warms up slowly like a filament, the page and the background lights turn to lamplight and stay that way on every page. The locator light turns warm. "Start the free reset" becomes "Start your 20 minutes" everywhere. The time card's OUT shows the time you switched off, and the ritual's OUT stamp uses it too.
  - **It knows the time:** in the evening "Good. Now give it twenty minutes."; after midnight "It's 00:47. Twenty minutes, then sleep."; during the day "It's 13:46. Done for the day? Good." with "Still on shift? Remind me at 18:00" (a calendar file). The usual end of shift is `shiftOut` in `site.config.js`.
  - **Switching back on:** the tube strikes with two flickers and a hum, the notifications race again, and two fake work pings slide in ("Manager: quick question?"). Switching off again puts them to sleep.
  - Starting the ritual switches work mode off quietly. Other open tabs follow. Low-stim mode: no sound, no pings. Screen readers hear "Work mode off at 21:47."
- The hero is the only loud moment. Notification fragments race across the top, decelerate over 3.4 seconds and stop. The second headline line settles from three misaligned copies into one. Scrolling slows them further. Nothing else on the site moves on its own.
- A fixed ambient layer of out-of-focus lights sits behind every page (`assets/js/ambient.js`). It draws at about 30 fps at most, stops drifting after 25 seconds without input, and isn't drawn at all while the hero game fills the screen or the tab is hidden. On the home page it moves from office fluorescent to streetlights seen from the bus, then the hallway, lamplight and finally night with stars. The lights also slow down as you go: the page literally decelerates.
- Scroll-linked set pieces on the home page: the commute (time cards slide sideways past a big clock while you scroll down; on phones and touch tablets it's a plain sideways swipe with the clock following, because scroll-jacking feels wrong under a thumb), the WORK → ENDSHIFT → YOUR EVENING line that lights each word as it reaches it, the RESET bottle lit as "the lamp switches on", and the founder counter counting up. The story page's timeline fills as you read it.
- Headings come into focus (blur → sharp) and blocks rise in as they reach the screen, more slowly further down the page.
- **Each page is its own place in the same world** (`assets/js/world.js`, `world.css`, since v0.14). Every one leaves the plain page behind it: without WebGL, with reduced motion or in low-stim mode the page simply shows everything, still.
  - *RESET:* the concept jar stands on the nightstand from the film, and you can turn it: drag it (it carries on spinning and slows), use the slider or the arrow keys. The back of the jar is the spec sheet. Left alone for 4 s it turns slowly by itself (not with reduced motion or low-stim). The front angle is `world.turntable.front` in the page's config (`templates/pages/reset.js`).
  - *One jar everywhere (v0.20, v0.21):* the jar is packaging direction C, the "off switch" jar, and it is the same model in the film, the ritual, the story panels, the RESET turntable and the RESET pictures (`cJar()` in `game-scenes.js`, its print painted by `cJarFront`, `cJarPlate`, `cJarBack`, `cJarBox`, `cJarTape` in `game-paint.js`). A square warm white jar with rounded corners (one skin, so no seams), an amber ribbed screw cap, a raised switch plate on the front with the rocker at OFF and a little amber light, RESET and WORK: OFF., the spec sheet and a code on the back. Shiny parts (the cap, the corners, the rocker) catch the light as a flat drawn glint (`spec` on an ink object).
  - *RESET pictures (v0.21):* two drawings of the planned jar, made with the site's own ink renderer so they look like the rest of the world (they replaced v0.17's AI-generated photos, which looked generated and didn't fit): the jar in front of its box on a warm paper backdrop, beside the words at the top of RESET (and on the home page when there's no film), and the jar at night on the bedside table, between the alarm clock at 22:41, the phone face down, a glass of water and the lamp on two books, full width under "why". Both captions say they are drawings, not photos. They live in `assets/img/photos/` as WebP with JPEG fallbacks (`jarPhoto()` in `components.js`); on wide screens the night picture is cropped from 35% down so the lamp and the jar both stay in, its caption sits bottom right, and on phones the caption goes under the picture. How to draw them again: `scripts/stills/README.md`. Replace them with real photos before anything is sold.
  - *Batch #001:* the founders' crate, 150 places seen from above, steel corners and a stencil. Each person on the list is an amber cap; the next free place has a turning dashed ring and its number ("Nº 038 is free"). It uses the live count when there is one (`es:count`, sent by `site.js`). Under it, the whole first run of 500 as a pallet with the founders' block outlined.
  - *Story:* the founder's pinboard. The timeline is cards pinned to cork, beside the manufacturer's ad, the "Minimum 500 units." mail and the "So naturally…" sticky. Each card drops in and is pinned as it reaches the screen, then the red string runs to it. The string never crosses a card's words: along a row it runs across the tops; to the next row it goes round the outside on brass tacks. Positions come from the layout, so it's redrawn on resize.
  - *Formula:* the ingredients as test tubes in a wooden rack, each with a tag (name, status, dose). They stay empty, with a question mark, until a dose is confirmed and published; then they fill to the dose (as % of the reference intake). Each tube links to its ingredient below.
  - *Guides:* a swing-arm reading lamp on the wall (wide screens; a glow on phones) that dims as you read, and at the end "Take this into tonight": a note torn off the pad with three things from that guide to tick (a highlighter goes over what you tick). It's saved on the device for that day (`es:tonight`), and the ritual shows it on a slip by the start button and on the first step.
  - *404:* a dark hallway with five doors (free ritual, RESET, Batch #001, story, back to the start), light under each door. Your pointer (or the focused door) is the torch; or find the switch and the tube light comes on.
  - *v0.22, fewer and bigger moments:* RESET is one job in about six phone screens: the turning jar at the top (its drawn poster first), the five facts as a paper sheet beside the words, its one step in the ritual (the seven steps with Water marked RESET), the night picture as the one quiet break, the shortlist by name with its guides, three questions and the batch. Batch #001 lost the finale that repeated its opening, and its four states are a plain list on phones. Formula folds each ingredient's claims and sources away under "What we can say, and what we can't", and the label is a paper "back of the jar".
  - *Wide screens (v0.22):* FAQ has a sticky right column (the topics, the one you're reading marked, and "Ask a person"); the guides' "Take this into tonight" note sits beside the text, under the lamp.
  - *Drawn posters (v0.22):* every story panel has a picture of the same view drawn once by the same renderer (`src/assets/img/panels/`, `src/config/panels.js`; Bulgarian versions where words appear). It's under the live drawing while that loads, and it is the picture where 3D can't run, or when the device asks to save data or has little memory (`ES.lowPower`, also `?lite`): then the panels stay drawn pictures and the home page shows the comic instead of the live film. How to redraw them: `scripts/stills/README.md`.
  - *The ritual page (v0.22):* beside Start, the room you'll be in, in four drawn moments cross-fading slowly (clock out, the lamp, the window, lie down); still with low-stim. Under the steps, the ritual on one A5 page to print (`/ritual/card/`): seven steps, a box to tick each, ink on paper.
  - *Journal covers (v0.22):* the evening guides get a drawn room (the bedside lamp, the bus, the desk at night), the ingredient guides their vials on a shelf, the same glass as the formula page (`guideCover()` in `components.js`). The covers are also their share cards.
  - The legal pages stay plain on purpose.
- The ritual is a separate, full-screen experience (see below).

The recurring object is the **time card**: the "OUT 18:00 / NOW 21:47" punch strip in the hero, the punched slips in the "this is literally me" section, the "OUT 22:05" stamp at the end of the ritual, and the paper founder card. It's the one artefact that every kind of shift worker, from retail to couriers to offices, recognises.

**Joining (v0.22).** Signing up shows what's next, numbered: confirm the email, the ritual tonight, one person to send it to. The confirmation link goes through `/api/confirmed`, which counts the founding list right then, and the site opens the founder card on paper: "You're founder Nº 037.", the day you came in, "Out: never, hopefully", a postmark stamp, and Save the card (a 1080×1350 picture drawn on the device; the share sheet on phones). From then on every form for a list you're on is a short note instead ("You're on the founding list as founder Nº 037."), with your card and "Send the ritual to someone".

**Coming back (v0.22).** Someone who has done the ritual here gets "Evening 3?" and a way straight in, in the hero's words (it takes the teaser's place). After the game, one screen says what ENDSHIFT is in three lines, with "What do you do?": pick a job and the game plays it next time, the ritual suggests the night-shift version for care work, and the signup carries it. A Bulgarian browser on the English site gets a small "Прочети на български" note (a chip in the header on phones), once, never a redirect.

## The ritual

Pressing start "clocks you out": the site disappears, an OUT stamp shows the time, and the ritual runs full screen. Code: `assets/js/ritual.js` (engine), `evening-room.js` (the room since v0.12, and the warm place for the breathing), `ritual-scenes.js` (the flat fallback scenes), `ritual-audio.js` (generated sound).

**It happens in the film's bedroom (v0.12).** The run takes place in the same inked room as the home page's film, and the room is your progress: every step changes it, the light only ever goes down, and it ends with lights out.

- **You go at your own pace.** Steps 1 to 5 are things you do yourself, so they wait for you: tap **Done** when you've done it (or press Space or Enter). A ring round the button fills over about how long the step usually takes *you* (the middle of your last five times, kept within reason); when it's full the button turns amber and asks "Done?" with a soft bell. Nothing moves on by itself. "Guide me" (under More) makes every step move on by itself and reads it aloud; on the way home it's on by default.
- **Done makes something happen in the room**, then the camera glides to the next step: the laptop lid closes and tomorrow's list writes itself on the notepad (your own lines, if you typed them); the pleated curtains fold shut; the glass is poured and comes up to drink (or a mug of herbal tea, steaming); at "lower the lights" everything else steps aside for a short film (v0.18): from the far corner you see the big ceiling light (warm white, on since the start) go off with the desk lamp, a beat of dark, then the camera tilts down and goes in to the bedside lamp as it clicks on (a little stutter), and its light comes out of the shade as slow warm motes (one warm colour) that drift out and settle through the whole room, the camera following them on one smooth path until the room is full (you can push the motes gently with a finger afterwards; they glide aside and drift back); the phone turns face down, lifts clear of the table and goes down into the pulled-out drawer. Done shows where you pressed it (v0.20): the button fills with warm light and draws a tick for a moment while the room does what you did, and that step's dot at the top fills in. (v0.16 to v0.19 tried a big stamp, then a sun dropping a notch, in the middle of the screen; both collided with the room and the card, so they're gone.) In the breathing, each breath out takes the warm place's sun a little lower: it is half under the sea (the ENDSHIFT mark) about two thirds of the way through the slow breaths and gone with the last one (v0.23).
- **After "Phone's down" the rest plays by itself.** First the breathing, sitting on the edge of the bed with the lamp on (v0.15): your eyes blink shut, and behind them a warm place comes out of the dark while you arrive (no colours on the eyelids, here or in the film): a sea at sundown, the sun low over it with its road glittering on the water, thin clouds lit from below, and a beach where the edge of the water comes in as you breathe in and slides back as you breathe out (the sound's "wash" does the same). From then on the light only goes down (v0.23; before, the picture got brighter with every breath in and over the minutes, like a sunrise, which worked against winding down). Every breath out takes the sun a little lower, a long sigh further than a slow breath, and it rests while you breathe in: it touches the sea about a third of the way into the slow breaths, sits half under it (the ENDSHIFT mark) about two thirds in, and slips under with the last one, sometimes with a green spark. As it goes it gives less light and turns from gold to orange to red; the sky goes from gold to rose to the dark blue of night, the clouds keep the last pink, the evening star comes out at the half, then a few more stars with each breath, and while you let go the sky fills with them and the sea calms down. It is seen as if through a camera: soft shafts of light from the sun, split a hair into colours at their edges, a line of coloured six-sided lens ghosts through the picture that glide a little as you breathe, and a faint arc of colour, all fading with the sun. Three warm lights from the room still drift up over the water. (The sunset draws at about 30 frames a second, and smaller on low-end devices; the picture is never brighter at the end of a breath than at its start, which the tests measure.) A small brightness bar under the button (only while you breathe, kept on the device) makes the whole picture dimmer (darks darker, lights less bright) or brighter; it starts at 80%. When it's over the picture goes, your eyes open, and you're sitting in the same warm room. Then the last step, **Lie down**: the view sinks to the pillows, and you read a book in your lap (its pages turn right to left), lie looking up at the floating lights, or listen to the record player across the room. When it's time (or you press "Lamp off"), the lamp goes off, you turn onto your side, a last look at the bedside table in the moonlight, eyes close, OUT. (v0.13 made the breathing the last step and the lights out; it read as falling asleep in the middle of the breathing, so v0.15 separates them.)
- **Small choices, remembered.** Clock out on paper or typed here (three lines, saved on the device, shown on the notepad); water or herbal tea; in bed, read, music or just lie. Each is one tap on the card and is remembered for next time.
- **A little different every night**: the moon in its real phase, rain on the window some nights, where the lamp's motes drift, which windows across the street are still lit (they go out as you go).
- **Lighter with use.** After the first evening the page opens on one big button ("End my shift", with "Evening n" and last time's settings) and "Short tonight · 5 minutes"; opened from the home screen it always does. The OUT intro gets shorter after the second time. The done screen keeps a month of evenings, a ring round each one you ended. No streaks, nothing to lose.
- **Fallback:** without WebGL, with reduced motion, in low-stim mode and on the way home the run uses the flat scenes below, with the same Done button and timings.

The flat scenes (fallback):

| Step | Scene | Sound |
|---|---|---|
| Clock out | An office block across the street, its fluorescent windows switching off one by one (three warm lamps stay on) | Brightest chord, plucked notes at 74 bpm |
| Change the room | Warm steam rising | Notes slow to 64 bpm, room tone rises |
| Water | Slow ripples on dark water | Each drop makes a soft "plip"; 56 bpm |
| Lower the lights | The ceiling light fades, a table lamp warms up | 48 bpm, sparse |
| Phone down | Notifications drift, then go to sleep one at a time | Almost no notes |
| Breathe | The same sunset, quieter (v0.23): each breath out takes the sun a little lower, the water's edge comes in and goes out with the breath, and when the sun is under the stars come out one by one | The pad and a soft "wash" of air swell and fall with every breath |
| Lie down | Embers drifting, slowing down | Very sparse, low notes |

Every step changes chord (all in D major, moving lower), the low-pass filter closes a little more and the room tone changes. A soft bell marks each step change. The optional binaural layer (headphones) is two sine tones around 196 Hz whose difference glides from 10 Hz to 6 Hz.

**Sound choices (in the setup, under "Sound"):**
- **ENDSHIFT soundtrack**, generated in the browser, in four moods. All use the same step structure (lower chords, slower notes, darker filter as you go):
  - *Lamp*: the original, warm pad and plucked notes.
  - *Rain*: rain that eases off step by step, low pad, very few notes.
  - *Felt piano*: a muted piano, slow and sparse, over a quiet pad.
  - *Night*: no melody; a deep drone and a far-off bell now and then.
  Each has a Listen button (12-second preview). Measured levels sit between −23 and −31 dB RMS, so switching moods never jumps in volume.
- **My own music**: Spotify, YouTube, SoundCloud or Apple Music, from recommended picks (`src/config/music.js`, credited by name) or any pasted link. The player docks bottom right and moves to the top right during the ritual. Starts with the ritual, pauses with it; YouTube and SoundCloud get quieter step by step (to about half at the end) and fade out over the last 45 s; Spotify pauses at the end; Apple Music can't be controlled from the page, so it asks you to press play. The step bells can stay on over your music. Nothing loads from a service until the visitor picks something there (see the privacy policy). Code: `assets/js/ritual-music.js`.
- **Silence** (the binaural layer still works on its own).

**Breathing step (5 minutes in the 20-minute version, 3 in the 10-minute one):** 30 s arrive (normal breathing, tips), 6 cyclic sighs (2.5 s in, 1 s top-up, 6 s out, 0.5 s rest), slow rhythm at the chosen pace (3/5, 4/6 or 5/7 seconds) rounded to whole breaths, 30 s let go. Big cue words ("In", "A little more", "Out, slowly") sit under the bottle (over the water in the flat version) with a breaths-left count. Phones vibrate at each turn so it works with eyes closed. The phase timings live in `src/content/<lang>/ritual.js → breath`.

Accessibility: the overlay is a dialog and the rest of the page is inert (the music player stays reachable), each step and breathing phase is announced politely, Space or Enter is Done, arrows move between steps, Esc pauses (or closes More). The top bar fades after 4.5 s of no input and comes back on any touch, mouse move or key; the card and Done stay. With reduced motion or low-stim on, the flat scenes hold still except the breathing (the water's edge with each breath, the sun lower with each breath out), which carries the instruction.

## Palette

| Token | Hex | Role | Contrast on `--night` |
|---|---|---|---|
| `--night` | #0f1112 | Ground, early evening (cool graphite) | |
| `--night-warm` | #15110d | Ground, late evening | |
| `--graphite` | #181b1e | Surfaces: slips, panels, inputs | |
| `--graphite-2` | #212529 | Raised surfaces | |
| `--line` / `--line-soft` | #30363a / #24282b | Dividers | decorative |
| `--line-strong` | #686e72 | Form-control edges | 3.7:1 |
| `--paper` | #f3f0e8 | Primary text | 16.6:1 |
| `--paper-2` | #d8d4ca | Secondary text | 12.8:1 |
| `--fog` | #a7aaa8 | Muted text (never smaller than 13 px) | 8.1:1 |
| `--tungsten` | #f2a84b | **The accent.** The shift light, about to go off | 9.5:1 |
| `--fluoro` | #cde7ea | Work-mode light: "before" states only | 14.6:1 |
| `--alert` / `--ok` | #ff9b8a / #bcd7a8 | Form errors / success, always with text | 9.3:1 / 12.1:1 |

**Tungsten means live, now, or actionable. Nothing decorative gets it.** Primary buttons, the "now" clock, the current timeline step, the ritual dial, links' underlines, focus rings.

Low-stimulation mode redefines the same tokens (softer paper, warmer ground, muted tungsten). It removes the grain and all motion. All text pairs stay above 6.8:1.

## Type

- **Display: Sofia Sans Extra Condensed**, 760–880 weight. Headlines, numbers, buttons, time stamps.
- **Body: Sofia Sans**, 400–650.

Both are by Lettersoup, a type foundry in Sofia, with proper Bulgarian Cyrillic, so the Bulgarian site looks as designed rather than substituted. They're licensed under the SIL Open Font License and self-hosted with `npm run fonts`.

Caps are used for poster lines (the hero, product name, batch number, finale) and buttons. Statements people read as sentences ("Physically home. Mentally still at work.") are set in mixed case. Display type is condensed and set tight (line-height 0.84–0.92), so headlines read as signage.

| Token | Size (mobile → desktop) | Use |
|---|---|---|
| `--fs-hero` | 68 px → 184 px | Hero only |
| `--fs-display-l` | 52 px → 132 px | Page titles, product name, batch, finale |
| `--fs-display-m` | 40 px → 84 px | Section statements |
| `--fs-display-s` | 30 px → 44 px | Sub-statements, FAQ group titles |
| `--fs-h3` | 22 px → 28 px | List headings |
| `--fs-lead` | 19 px → 23 px | Lead paragraphs, 40ch max |
| `--fs-body` | 17 px → 18 px | Body, 1.55 line height, 62ch measure |

## Layout

- Left-aligned editorial columns, max 78 rem. Gutter 20 px on phones, 32 px on tablets, 48 px on desktops.
- **Rows, not cards.** Specs, ingredients, the timeline, the FAQ and benefits are hairline-divided rows. Only the time-card slips, outcome panels, the product stage and the settings panel are boxed, because each of those is a separate object.
- Radius by role: 3 px for controls, 12 px for slips and panels, a pill for status chips and toggles.
- Numbers appear as markers only where the content is a real sequence: ritual minutes (00, 02, 05…), the batch process (1–3), how-to-use steps, the build timeline.

## Components

Defined in `src/templates/components.js`, shown on `/system/`:

- Buttons: primary (tungsten), ghost and quiet, in `xl`, default and `sm` sizes, plus a text action.
- Status chips: neutral, live, warm ("Not final"), done, now.
- Notice (draft legal, preview mode) and loud notice ("Formula subject to final confirmation").
- Email capture with validation, honeypot, preview mode and a success state.
- Choice chips (radio groups) and switches (settings).
- Founding-batch meter: a progressbar with 15 ticks of 10, a human-checked date, and a live count option.
- Ritual dial: SVG segments scaled to each step's real duration.
- Time-card slips, spec rows, is/isn't lists, timeline rows, FAQ disclosure.
- The founder card (paper, with a postmark), the founder sheet after confirming, and the joined note that replaces a form.
- Drawn panel posters (`panelPoster()`), journal covers (`guideCover()`), the vial glass (`vialGlass()`).
- The founder block (`founderBlock()`): signature, photo, a line about their shifts, voice note with a thin progress line, video, transcript. Each part shows only once it's set.
- Header with the WORK switch (labelled on wide screens), the language link and one button; mobile menu, sticky mobile CTA, toast, footer.

Icons are a single 24 px line set at 1.5 px stroke, drawn for this site: bus, courier bag, phone, receipt, laptop, moon, notebook, shirt, glass, lamp, do-not-disturb, breath, book and so on.

## Motion

| Token | Duration | Use |
|---|---|---|
| `--dur-1` | 140 ms | Hover, press |
| `--dur-2` | 260 ms | Toggles, menu |
| `--dur-3` | 520 ms | Sticky CTA, stamp |
| `--dur-4` | 1100 ms | Meter fill |
| `--dur-depth` | `--dur-2 × (1 + depth × 2)` | Interactions further down the page get slower |

`prefers-reduced-motion` and low-stim mode remove all of it. The opening montage doesn't play, the hero renders already settled, and the breathing ring holds still while its "Breathe in / Breathe out" label keeps working.

## Accessibility states

- Focus: 3 px tungsten outline, 3 px offset. On tungsten buttons the outline switches to paper.
- Errors: `aria-invalid` plus an alert-coloured border plus a written message, announced through a live region.
- Disabled: 50 % opacity plus `not-allowed`. Unsupported device features (vibration, keeping the screen on) are disabled with the reason given in the hint text.
- Touch targets are at least 44 px. The ritual controls are 60–68 px, sized for tired thumbs.
- The ritual announces each step through a polite live region, moves focus to the step title, and works with Space and the arrow keys.

## Sitemap

```
/                                   Home
/ritual/                            Free 20-minute ritual (interactive)
/reset/                             RESET product page
/founding-batch/                    Batch #001
/story/                             Built in public (timeline)
/formula/                           Formula / ingredient shortlist
/faq/                               FAQ (grouped, FAQPage schema)
/ritual/card/                       The ritual on one A5 page, to print
/journal/                           Journal index (with covers)
/journal/how-to-switch-off-after-work/   Guides (Article schema, cited): also after-a-night-shift,
/journal/why-just-checking-never-is/     magnesium, l-theanine, melatonin-in-the-eu,
                                         valerian-and-passionflower
/contact/                           Contact (copyable email + form)
/shipping-returns/                  Shipping & returns
/privacy/  /terms/  /cookies/       Legal + cookie preferences
/system/                            Design system (noindex)
/404.html
/bg/…                               Every page above, in Bulgarian
```

## SEO structure

- One `h1` per page, semantic landmarks, descriptive titles and meta descriptions per page and language.
- Canonical URLs, `hreflang` alternates plus `x-default`, an XML sitemap with alternates, and `robots.txt` (`/system/` excluded).
- Open Graph and Twitter cards: a drawn 1200×630 card per page and language (`npm run og`, from the panel posters and the page's own title); pages without one use the home page's.
- Breadcrumbs (BreadcrumbList) on every inner page: ENDSHIFT › Journal › the guide.
- Self-hosted fonts (no request to Google), WebP pictures in two sizes, and the 3D starts only when it's needed.
- Structured data: Organization and WebSite (home), HowTo (ritual), FAQPage (FAQ), Article with citations (guides). Product with an Offer is added automatically only once checkout is live, so there is never a fake price in search results.
- Fast by default: static HTML, about 25 KB of JS in total, hashed and immutable assets, no layout-shifting media.

## Ready for future products

Nothing is hard-wired to "RESET". The product block, ingredient rows, state machine, batch meter and dial are all driven by config. A future NIGHT, RECOVER or START would need a second product entry and a second product page template call. No redesign. None are shown on the site, because none exist.
