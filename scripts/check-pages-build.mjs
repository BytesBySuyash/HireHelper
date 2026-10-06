import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve('apps/web/dist/pages/browser');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
assert.match(html, /<base href="\/[^"\s]*\/"|<base href="\/"/);
assert.match(html, /<app-root>/);
const names = await readdir(root);
assert(
  names.some((n) => /^main-.*\.js$/.test(n)),
  'Missing compiled application',
);
assert(names.includes('task-fallback.svg'), 'Missing fallback image');
const scripts = await Promise.all(
  names.filter((n) => n.endsWith('.js')).map((n) => readFile(resolve(root, n), 'utf8')),
);
assert(
  scripts.some((s) => s.includes('Portfolio demo') && s.includes('browser-local data')),
  'The artifact must display the Pages demo label',
);
assert(
  scripts.some((s) => s.includes('hirehelper:pages-demo:v1')),
  'Missing browser-local demo adapter',
);
console.log('Pages artifact contains the app, demo adapter, disclosure and base-path assets.');
