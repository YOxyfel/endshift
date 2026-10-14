#!/usr/bin/env node
// Static server for dist/ with clean URLs, the 404 page and the same headers as production
// (read from dist/_headers). Usage: node scripts/serve.mjs [dir] [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const dir = path.resolve(process.argv[2] || 'dist');
const port = Number(process.argv[3] || process.env.PORT || 4321);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

// Global headers from the "/*" block of _headers. upgrade-insecure-requests is dropped locally (no https on localhost).
async function globalHeaders() {
  const out = {};
  try {
    const txt = await readFile(path.join(dir, '_headers'), 'utf8');
    const block = txt.split(/\n(?=\S)/).find((b) => b.startsWith('/*'));
    for (const line of (block || '').split('\n').slice(1)) {
      const m = line.match(/^\s+([\w-]+):\s*(.+)$/);
      if (m) out[m[1]] = m[2].replace(/;\s*upgrade-insecure-requests/, '');
    }
  } catch {}
  return out;
}

async function resolve(urlPath) {
  let p = path.join(dir, decodeURIComponent(urlPath.split('?')[0]));
  if (!p.startsWith(dir)) return null;
  try {
    const s = await stat(p);
    if (s.isDirectory()) p = path.join(p, 'index.html');
    await stat(p);
    return p;
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const base = await globalHeaders();
  const file = await resolve(req.url);
  if (!file) {
    res.writeHead(404, { ...base, 'Content-Type': types['.html'] });
    res.end(await readFile(path.join(dir, '404.html')).catch(() => 'Not found'));
    return;
  }
  res.writeHead(200, { ...base, 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  res.end(await readFile(file));
}).listen(port, () => console.log(`ENDSHIFT → http://localhost:${port}  (serving ${path.relative(process.cwd(), dir) || '.'})`));
