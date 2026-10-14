export default ({ cfg, url, fmt }) => {
  const c = cfg.company;
  const controller = c.legalName
    ? `${c.legalName}${c.uic ? `, UIC ${c.uic}` : ''}${c.address ? `, ${c.address}` : ''}`
    : 'the person running ENDSHIFT, until the company is registered (its details will replace this sentence)';
  const processors = cfg.legal.processors.length
    ? `<ul>${cfg.legal.processors.map((p) => `<li><strong>${p.name}</strong>: ${p.purpose}${p.location ? ` (${p.location})` : ''}</li>`).join('')}</ul>`
    : '<p>Each provider will be listed here by name before the site launches publicly.</p>';
  const analytics = {
    none: 'We currently don’t run any analytics.',
    plausible: 'We use Plausible Analytics, which counts visits without cookies and without collecting personal data.',
    umami: 'We use Umami, which counts visits without cookies and without collecting personal data.',
    ga4: 'We use Google Analytics only if you allow it on the Cookie preferences page. It sets cookies and processes your IP address in shortened form.',
  }[cfg.analytics.provider];

  return {
    meta: { title: 'Privacy policy | ENDSHIFT', description: 'What ENDSHIFT collects, why, how long we keep it, and your rights under the GDPR.' },
    title: 'Privacy',
    lead: 'Short version: we collect as little as possible, we never sell it, and most of what the site remembers stays on your own device.',
    updated: fmt.date(cfg.legal.lastUpdated),
    sections: [
      { id: 'who', title: 'Who is responsible', body: `<p>The data controller is ${controller}. Contact: <a href="mailto:${cfg.contact.email}">${cfg.contact.email}</a>.</p>` },
      {
        id: 'what',
        title: 'What we collect',
        body: `<ul>
<li><strong>Your email address</strong>, if you join the founding list, ask for build updates or the ritual notice, with the date, the page you signed up on, your language and, if you claimed the home page game’s discount, that reward.</li>
<li><strong>Messages you send us</strong>: your email, your name if you give it, and what you wrote.</li>
${cfg.push?.publicKey ? '<li><strong>The phone reminder</strong>, if you switch it on at the end of the ritual: the push address your browser gives us, the time you chose, your time zone, workdays or every day, and your language. Nothing else. “Turn off” deletes it, and so does uninstalling the app.</li>' : ''}
<li><strong>A reminder time</strong>, if you tick “one reminder email” on the ritual’s email form: the time and your time zone, kept with your email address.</li>
<li><strong>Visit statistics</strong>. ${analytics}</li>
<li><strong>Server logs</strong> kept briefly by our hosting provider (IP address, browser, pages requested) for security.</li>
<li><strong>Orders</strong>, once payments open: name, delivery address, email and what you ordered. Card details go straight to the payment provider; we never see them.</li>
</ul>`,
      },
      {
        id: 'device',
        title: 'What stays on your device',
        body: `<p>Some things are stored only in your browser and never sent to us: low-stimulation mode, your ritual settings, how many times you’ve completed the ritual, and your analytics choice. You can clear them on the <a href="${url('cookies')}">Cookie preferences</a> page.</p>`,
      },
      {
        id: 'music',
        title: 'Music players in the ritual',
        body: `<p>The ritual’s own soundtrack is made in your browser. Nothing is loaded or sent for it.</p><p>If you choose to play your own music, the ritual page loads that service’s player: Spotify, YouTube (through its privacy-enhanced youtube-nocookie.com player), SoundCloud or Apple Music. It loads only after you pick something from that service. From then on the service receives your IP address and browser details and may set its own cookies, under its own privacy policy: <a href="https://www.spotify.com/legal/privacy-policy/" target="_blank" rel="noopener">Spotify</a>, <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google (YouTube)</a>, <a href="https://soundcloud.com/pages/privacy" target="_blank" rel="noopener">SoundCloud</a>, <a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noopener">Apple</a>. We don’t receive anything from these players.</p><p>Which service you chose is remembered on this device, so the player can load again next time. You can clear that on the <a href="${url('cookies')}">Cookie preferences</a> page.</p>`,
      },
      {
        id: 'why',
        title: 'Why, and on what legal basis',
        body: `<ul>
<li>Emails about Batch #001 and the build: your <strong>consent</strong> (Art. 6(1)(a) GDPR). Every email has a one-click unsubscribe.</li>
<li>Replying to your messages: our <strong>legitimate interest</strong> in answering you (Art. 6(1)(f)).</li>
<li>Cookieless statistics and security logs: our <strong>legitimate interest</strong> in running a working, secure site.</li>
<li>Analytics that use cookies: your <strong>consent</strong>, which you can withdraw at any time.</li>
<li>Music players in the ritual: your <strong>consent</strong>, given by choosing a service.</li>
<li>Orders: <strong>performing the contract</strong> with you (Art. 6(1)(b)) and our <strong>legal obligations</strong> for accounting and tax (Art. 6(1)(c)).</li>
</ul><p>We don’t sell your data, and we don’t use it for automated decisions about you.</p>`,
      },
      { id: 'who-else', title: 'Who else handles it', body: `<p>Only service providers who help run the site and the mailing list, under data processing agreements.</p>${processors}<p>If a provider stores data outside the European Economic Area, the transfer is covered by the European Commission’s Standard Contractual Clauses or an adequacy decision.</p>` },
      {
        id: 'how-long',
        title: 'How long we keep it',
        body: '<ul><li>Mailing list: until you unsubscribe. We delete your address within 30 days of that.</li><li>Messages: up to 12 months after the conversation ends.</li><li>Orders and invoices: as long as Bulgarian accounting and tax law requires.</li><li>Server logs: a few weeks, set by the hosting provider.</li></ul>',
      },
      {
        id: 'rights',
        title: 'Your rights',
        body: `<p>You can ask to see, correct, export or delete your data, ask us to restrict or stop using it, and withdraw consent at any time. Write to <a href="mailto:${cfg.contact.email}">${cfg.contact.email}</a>; we reply within one month.</p><p>You can also complain to the Bulgarian Commission for Personal Data Protection (КЗЛД), <a href="https://www.cpdp.bg" target="_blank" rel="noopener">cpdp.bg</a>, or the data protection authority where you live.</p>`,
      },
      { id: 'age', title: 'Under 18', body: '<p>ENDSHIFT products are not intended for people under 18, and we don’t knowingly collect their data.</p>' },
      { id: 'changes', title: 'Changes', body: '<p>If this policy changes in a way that matters, we’ll say so on this page and, if you’re on the list, by email.</p>' },
    ],
  };
};
