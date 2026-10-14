#!/usr/bin/env node
/* Checks every recommended music link in src/config/music.js against the service's
   public oEmbed endpoint and prints the title the service returns. Run before launch,
   and now and then after: playlists get renamed or removed.

     npm run music:check

   Needs internet access. Exits with code 1 if any link fails. */
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const music = (await import(pathToFileURL(path.join(root, 'src/config/music.js')).href)).default;

const endpoint = {
  spotify: (u) => `https://open.spotify.com/oembed?url=${encodeURIComponent(u)}`,
  youtube: (u) => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u)}`,
  soundcloud: (u) => `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(u)}`,
  apple: (u) => u,
};

const items = [];
for (const [service, list] of Object.entries(music.recommended)) for (const it of list) items.push({ service, ...it });
for (const [service, it] of Object.entries(music.ours)) if (it && it.url) items.push({ service, id: `ours-${service}`, ...it });

let failed = 0;
for (const it of items) {
  const url = endpoint[it.service](it.url);
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'endshift-music-check' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let title = '';
    if (it.service !== 'apple') title = (await res.json()).title || '';
    console.log(`  ok    ${it.service.padEnd(10)} ${it.title}${title && title !== it.title ? `  (service says: "${title}")` : ''}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${it.service.padEnd(10)} ${it.title}  ${it.url}  ${e.message}`);
  }
}
console.log(failed ? `\n${failed} link(s) failed. Fix or remove them in src/config/music.js.` : `\nAll ${items.length} links answered.`);
process.exit(failed ? 1 : 0);
