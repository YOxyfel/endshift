#!/usr/bin/env node
// npm run dev: build, serve on http://localhost:4321, rebuild when anything in src/ or build.mjs changes.
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (args) =>
  new Promise((done) => spawn(process.execPath, args, { cwd: ROOT, stdio: 'inherit' }).on('exit', (code) => done(code)));

await run(['build.mjs']);
spawn(process.execPath, ['scripts/serve.mjs', 'dist', process.env.PORT || '4321'], { cwd: ROOT, stdio: 'inherit' });

let timer = null;
let building = false;
const rebuild = () => {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    if (building) return rebuild();
    building = true;
    console.log('\n↻ change detected, rebuilding…');
    await run(['build.mjs']);
    building = false;
  }, 150);
};
watch(path.join(ROOT, 'src'), { recursive: true }, rebuild);
watch(path.join(ROOT, 'build.mjs'), rebuild);
console.log('Watching src/ for changes. Reload the browser after a rebuild.');
