export default ({ url }) => ({
  meta: {
    title: 'Why “just checking” never is: work messages and your evening | ENDSHIFT',
    description: 'What research on telepressure and after-hours email says about checking work messages in the evening, and five practical ways to keep the work chat out of your night.',
  },
  title: 'Why “just checking” never is',
  dek: 'Phones, work chats, and what one quick look at 21:40 does to the rest of your evening.',
  date: '2026-10-10',
  readTime: 5,
  body: `
<p>21:40, on the sofa. You open the work chat “just to check”. Nothing urgent: a question for tomorrow, a file, a thumbs-up on something you sent at five. You close the app. Twenty minutes later you’re still answering the question in your head, and the evening has quietly turned back into a shift.</p>

<h2>Why a quick look isn’t quick</h2>
<p>Researchers who study recovery from work call the thing you lost in that moment <strong>psychological detachment</strong>: not just being away from work, but not thinking about it in your own time. People who detach more in their free time tend to report less exhaustion and better wellbeing (Sonnentag, 2012).</p>
<p>A glance at a work message is enough to undo it. Most messages at 21:40 can’t be dealt with until tomorrow, which makes each one an open loop: something to remember, prepare for or worry about, with nowhere to put it.</p>

<h2>The pull to answer</h2>
<p>There’s a name for the urge to reply to work messages quickly, even out of hours: <strong>workplace telepressure</strong>. In studies of workers and students, people who felt more of it tended to report poorer sleep quality and more burnout (Barber &amp; Santuzzi, 2015).</p>
<p>It isn’t only a personal habit. In a set of studies with employees and their partners, simply being expected to keep an eye on email after hours was linked to more anxiety, and through it to poorer health and relationship satisfaction, and the effect reached the partners too (Becker et al., 2021).</p>
<p>A diary study adds a twist. On days when employees used their smartphones more for work, they detached less from work, and lower detachment went with more exhaustion. The link was strongest for people who felt their workplace expected work and private life to be kept apart, perhaps because checking then also feels like breaking a rule (Derks et al., 2014). The authors’ conclusion was for employers: have a clear policy on phones outside working hours.</p>

<h2>Five things you can do tonight</h2>
<h3>1. Tell your phone when your shift ends</h3>
<p>Set a Do Not Disturb or focus schedule that starts at the end of your shift, every day. Let calls from family and a couple of favourites through; let the work apps sleep. A rule set once beats a decision made every evening.</p>
<h3>2. Give work its own corner of the phone</h3>
<p>Move work apps off the home screen, switch off their badges, or use a separate work profile that pauses in the evening. Out of sight really does help: the red “3” on an icon is an invitation.</p>
<h3>3. Say it out loud, once</h3>
<p>Tell your team when you answer: “I reply between eight and six. If it’s genuinely urgent, call me.” Most messages that feel urgent at night aren’t, and colleagues are often relieved that someone said it first.</p>
<h3>4. Close the day on purpose</h3>
<p>Before you leave work, write tomorrow’s first task where you’ll see it. That one line answers the question your head would otherwise keep asking all evening. The <a href="${url('guide-switch-off')}">guide to switching off after work</a> explains why parking unfinished things works.</p>
<h3>5. Charge the phone outside the bedroom</h3>
<p>If the phone sleeps in the kitchen, “just checking” at 23:50 needs a walk. Most nights, you won’t bother.</p>

<h2>If your job really is on call</h2>
<p>Some jobs are. Then the useful question isn’t “should I check?” but “what counts as urgent, and how does it reach me?” Agree on it: real emergencies come as a call, everything else waits for the morning. The European Parliament has asked for an EU-wide “right to disconnect” for exactly this reason, and several EU countries already have rules on it (European Parliament, 2021).</p>

<p>The <a href="${url('ritual')}">free 20-minute ritual</a> has a step for this: phone down, Do Not Disturb on, face down, in another room if you can. It’s two minutes long, and it tends to be the step that changes the rest of the evening.</p>`,
  sourcesTitle: 'Sources',
  sources: [
    {
      text: 'Sonnentag, S. (2012). Psychological detachment from work during leisure time: The benefits of mentally disengaging from work. <em>Current Directions in Psychological Science</em>, 21(2), 114–118.',
      url: 'https://doi.org/10.1177/0963721411434979',
    },
    {
      text: 'Barber, L. K., &amp; Santuzzi, A. M. (2015). Please respond ASAP: Workplace telepressure and employee recovery. <em>Journal of Occupational Health Psychology</em>, 20(2), 172–189.',
      url: 'https://doi.org/10.1037/a0038278',
    },
    {
      text: 'Becker, W. J., Belkin, L. Y., Conroy, S. A., &amp; Tuskey, S. (2021). Killing me softly: Organizational e-mail monitoring expectations’ impact on employee and significant other well-being. <em>Journal of Management</em>, 47(4), 1024–1052.',
      url: 'https://doi.org/10.1177/0149206319890655',
    },
    {
      text: 'Derks, D., van Mierlo, H., &amp; Schmitz, E. B. (2014). A diary study on work-related smartphone use, psychological detachment and exhaustion: Examining the role of the perceived segmentation norm. <em>Journal of Occupational Health Psychology</em>, 19(1), 74–84.',
      url: 'https://doi.org/10.1037/a0035076',
    },
    {
      text: 'European Parliament (2021). Resolution of 21 January 2021 with recommendations to the Commission on the right to disconnect, 2019/2181(INL). Summary, Legislative Observatory.',
      url: 'https://oeil.europarl.europa.eu/oeil/en/procedure-document-summary/pdf?id=1648076',
    },
  ],
  disclaimer: 'This guide is general information, not medical or legal advice. It doesn’t describe or promote any product.',
  tonight: ['Set Do Not Disturb to start when your shift ends.', 'Move the work apps off your home screen.', 'Charge the phone outside the bedroom tonight.'],
  cta: 'Try the 20-minute ritual',
});
