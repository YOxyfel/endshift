export default ({ url }) => ({
  meta: {
    title: 'After a night shift: how to wind down when your evening is at 7 a.m. | ENDSHIFT',
    description: 'Why switching off after a night shift is harder, what occupational health guidance says about light, sleep and caffeine, and a short wind-down that doesn’t push bedtime back.',
  },
  title: 'After a night shift',
  dek: 'How to wind down when your evening starts at 7 a.m. and the rest of the world is just waking up.',
  date: '2026-10-10',
  readTime: 5,
  body: `
<p>You finish at seven. The sun is up, the street is loud, and everyone else’s phone is waking up at the same moment you’re meant to fall asleep. Your body is tired, your head is still doing the handover, and the light outside is telling both of them that the day has just started.</p>

<h2>Why it’s harder after nights</h2>
<p>Your body clock runs on light. Morning light tells it that the day has begun, which is exactly the wrong message after a night shift. Occupational health guidance for night workers notes that they tend to get less sleep, and lighter sleep, than day workers, so the hours you do get count for a lot (NIOSH).</p>
<p>On top of that sits the ordinary problem every shift has: work doesn’t stop in your head just because it stopped on the rota. The general version of that, and why a short routine helps, is in <a href="${url('guide-switch-off')}">How to switch off after work</a>.</p>

<h2>On the way home</h2>
<p>Light is the strongest signal your body clock gets, so the last hours of the shift and the trip home matter. The NIOSH training for nurses on shift work suggests bright light in the first half of a night shift, to stay alert, and less light in the second half, to make sleeping at home easier.</p>
<p>Sunglasses on the way home are a common tip, with a real catch: they also block light’s alerting effect, which makes drowsy driving more likely. The same guidance says the safest way to use them after a night shift is when someone else is driving. On the bus, as a passenger, or on foot: fine. Behind the wheel: leave them off, and if you’re fighting sleep, don’t drive.</p>

<h2>A short wind-down, then bed</h2>
<p>NIOSH’s advice is to go to bed soon after you get home and to keep the morning and early afternoon for sleep, not errands, because the more you sleep before about 2 p.m., the better rested you tend to be. So the wind-down has to be short. Its job is to close the shift, not to fill the morning.</p>
<h3>1. Park the handover (2 minutes)</h3>
<p>Write down what’s still circling: the patient, the delivery, the thing you meant to tell the day team. On paper it has somewhere to live until your next shift.</p>
<h3>2. Change out of the shift (3 minutes)</h3>
<p>Uniform off, a quick wash. A physical line between work and home, at whatever time of day it happens to fall.</p>
<h3>3. Eat lightly, if you’re hungry</h3>
<p>The NIOSH guidance suggests a small meal with some protein and carbohydrates, cereal and milk for example, rather than going to bed hungry or very full.</p>
<h3>4. Phone on Do Not Disturb</h3>
<p>Set it so nothing but the people who matter can wake you. The work chat will still be there this afternoon.</p>
<h3>5. Five slow minutes, then sleep</h3>
<p>Breathe out longer than you breathe in, for a few minutes. Then bed, in a room that’s been made into night.</p>
<p>The <a href="${url('ritual')}">free ritual</a> has a version made for this. Under “Adjust” on the start screen, choose “Home after a night shift”: the same steps, rewritten for the morning, with the room made into night and lying down as the last step. Pick the 10- or 5-minute length if bed can’t wait.</p>

<h2>Turn the bedroom into night</h2>
<ul>
<li><strong>Dark.</strong> Blackout curtains or blinds, or an eye mask. Block light under the door and from the bathroom too, and use a dim red light if you need to get up (NIOSH).</li>
<li><strong>Quiet.</strong> Earplugs or white noise, and a phone that can’t wake you for anything that isn’t urgent.</li>
<li><strong>Protected.</strong> Ask the people you live with to keep your sleeping hours quiet. It’s easier to agree on once than to negotiate every morning.</li>
</ul>

<h2>Caffeine: think six hours</h2>
<p>In a small sleep study, a large dose of caffeine (400 mg) taken six hours before bedtime still cut measured sleep by more than an hour, and the people who took it mostly didn’t notice (Drake et al., 2013). After a night shift, “bedtime” is around 8 a.m., which puts the 2 a.m. coffee squarely in that window. A simple rule many night workers use: caffeine in the first half of the shift, water in the second.</p>

<h2>When it’s more than a hard week</h2>
<p>Some people who work nights or rotating shifts develop shift work disorder: trouble sleeping when they try to, and heavy sleepiness at work, for a month or more despite trying to get enough rest. If that sounds familiar, or if you’ve ever nodded off at the wheel on the way home, talk to a doctor. That isn’t a failed routine; it’s a different problem with its own treatments (Sleep Foundation).</p>`,
  sourcesTitle: 'Sources',
  sources: [
    {
      text: 'NIOSH (CDC). Training for Nurses on Shift Work and Long Work Hours, Module 9: Coping with the Night and Evening Shifts. Light.',
      url: 'https://www.cdc.gov/niosh/work-hour-training-for-nurses/longhours/mod9/03.html',
    },
    {
      text: 'NIOSH (CDC). Training for Nurses on Shift Work and Long Work Hours, Module 9: Coping with the Night and Evening Shifts. Sleep.',
      url: 'https://www.cdc.gov/niosh/work-hour-training-for-nurses/longhours/mod9/05.html',
    },
    {
      text: 'Drake, C., Roehrs, T., Shambroom, J., &amp; Roth, T. (2013). Caffeine effects on sleep taken 0, 3, or 6 hours before going to bed. <em>Journal of Clinical Sleep Medicine</em>, 9(11), 1195–1200.',
      url: 'https://doi.org/10.5664/jcsm.3170',
    },
    {
      text: 'Sleep Foundation. Shift Work Disorder: Signs, Diagnosis, and How to Manage It.',
      url: 'https://www.sleepfoundation.org/shift-work-disorder',
    },
  ],
  disclaimer: 'This guide is general information, not medical advice. It doesn’t describe or promote any product.',
  tonight: ['Write down the handover thoughts before bed.', 'Make the bedroom night: blinds down, eye mask ready.', 'No more caffeine in the six hours before you sleep.'],
  cta: 'Try the night-shift version of the ritual',
});
