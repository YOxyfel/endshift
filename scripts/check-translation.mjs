// Compares a translated content file with the English one: same keys, same kinds of values,
// same list lengths. Usage: node scripts/check-translation.mjs bg faq   (or: bg all)
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import cfg from '../src/config/site.config.js';
import formula from '../src/config/formula.js';
import timeline from '../src/config/timeline.js';
import { deriveState } from '../src/lib/state.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [loc = 'bg', which = 'all'] = process.argv.slice(2);
const state = deriveState(cfg);
const fmt = { date: (d) => d, price: (n) => `€${n}`, priceLine: () => '', dose: () => '', benefitsList: () => 'a, b and c' };
const args = (l) => ({ cfg, state, fmt, formula, timeline, url: (id, o = {}) => `/${l}/${id}/${o.hash ? '#' + o.hash : ''}`, t: (x) => (typeof x === 'string' ? x : x?.[l] ?? x?.en ?? ''), locale: l, ui: {} });

const ids = which === 'all' ? readdirSync(path.join(root, 'src/content', loc)).map((f) => f.replace(/\.js$/, '')) : [which];
let bad = 0;
const kind = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);
function compare(a, b, at) {
  const ka = kind(a), kb = kind(b);
  if (ka !== kb && !(ka === 'null' || kb === 'null')) return [`${at}: ${ka} in English, ${kb} here`];
  if (ka === 'null' || kb === 'null') return []; // left empty on purpose (e.g. no recorded voice yet)
  const out = [];
  if (ka === 'array') {
    if (a.length !== b.length) out.push(`${at}: ${a.length} items in English, ${b.length} here`);
    for (let i = 0; i < Math.min(a.length, b.length); i++) out.push(...compare(a[i], b[i], `${at}[${i}]`));
  } else if (ka === 'object') {
    for (const k of Object.keys(a)) if (!(k in b)) out.push(`${at}.${k}: missing`);
    for (const k of Object.keys(b)) if (!(k in a)) out.push(`${at}.${k}: not in English`);
    for (const k of Object.keys(a)) if (k in b) out.push(...compare(a[k], b[k], `${at}.${k}`));
  } else if (ka === 'function') {
    try { const ra = a('X', 'Y', 'Z'), rb = b('X', 'Y', 'Z'); if (kind(ra) !== kind(rb)) out.push(`${at}(): returns ${kind(ra)} vs ${kind(rb)}`); } catch (e) { out.push(`${at}(): throws ${e.message}`); }
  }
  return out;
}
for (const id of ids) {
  const enF = path.join(root, 'src/content/en', `${id}.js`), loF = path.join(root, 'src/content', loc, `${id}.js`);
  if (!existsSync(enF) || !existsSync(loF)) { console.log(`· ${id}: ${!existsSync(loF) ? 'no translation yet' : 'no English file'}`); continue; }
  try {
    const en = (await import(pathToFileURL(enF))).default(args('en'));
    const lo = (await import(pathToFileURL(loF) + '?' + Date.now())).default(args(loc));
    // game.js and ui.js are merged over English key by key, so missing keys are allowed there
    const partial = id === 'ui' || id === 'game';
    const diffs = compare(en, lo, id).filter((d) => !(partial && /missing$/.test(d)));
    // leftover Latin letters glued to Cyrillic ones (a typo that looks right)
    // (the "\n" of a line break inside a string is an escape, not a letter)
    const mixed = JSON.stringify(lo).replace(/\\[ntr"\\]/g, ' ').match(/[а-яА-Я][a-zA-Z]|[a-zA-Z][а-яА-Я]/g);
    if (mixed) diffs.push(`mixed Latin/Cyrillic letters: ${[...new Set(mixed)].join(' ')}`);
    if (diffs.length) { bad++; console.log(`✗ ${id}\n  ${diffs.slice(0, 30).join('\n  ')}`); }
    else console.log(`✓ ${id}`);
  } catch (e) {
    bad++;
    console.log(`✗ ${id}: ${e.message}`);
  }
}
process.exit(bad ? 1 : 0);
