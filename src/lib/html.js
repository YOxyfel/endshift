// Tiny templating helpers. Content strings in src/content are trusted, author-written HTML.
// Anything that comes from config is escaped with esc() before it lands in markup.

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c]);

const flat = (v) => {
  if (v == null || v === false || v === true) return '';
  if (Array.isArray(v)) return v.map(flat).join('');
  return String(v);
};

/** html`...` joins arrays and drops null/false so conditionals read naturally. */
export const html = (strings, ...values) =>
  strings.reduce((out, s, i) => out + s + (i < values.length ? flat(values[i]) : ''), '');

/** attrs({ href: '/x', hidden: true, title: null }) → 'href="/x" hidden' */
export const attrs = (obj) =>
  Object.entries(obj)
    .filter(([, v]) => v != null && v !== false)
    .map(([k, v]) => (v === true ? k : `${k}="${esc(v)}"`))
    .join(' ');

/** Strip tags for meta descriptions and JSON-LD. */
export const plain = (s) =>
  String(s ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const slug = (s) =>
  plain(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');
