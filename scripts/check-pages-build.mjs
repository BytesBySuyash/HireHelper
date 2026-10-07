import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const vercel = process.argv.includes('--vercel');
const baseArg = process.argv.findIndex((arg) => arg === '--base');
const expectedBase = vercel ? '/' : baseArg >= 0 ? process.argv[baseArg + 1] : '/HireHelper/';
assert(expectedBase && /^\/(?:[a-zA-Z0-9_.-]+\/)*$/.test(expectedBase), 'Invalid expected base path');
const root = resolve(`apps/web/dist/${vercel ? 'vercel' : 'pages'}/browser`);
const html = await readFile(resolve(root, 'index.html'), 'utf8');
assert(
  html.includes(`<base href="${expectedBase}">`),
  `Expected base href ${expectedBase} in Pages artifact`,
);
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
  scripts.some(
    (s) => s.includes('Interactive demo.') && s.includes('Changes stay in this browser.'),
  ),
  'The artifact must display the static demo label',
);
assert(
  scripts.some((s) => s.includes('hirehelper:pages-demo:v1')),
  'Missing browser-local demo adapter',
);


if (vercel) assert.match(html, /<base href="\/">/);
for (const name of names)
  assert(!/\.(?:map|pdf|env|md)$/.test(name), `Unexpected public document: ${name}`);
for (const source of scripts)
  assert(
    !/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/.test(source),
    'Local runtime URL in artifact',
  );

if (vercel) {
  for (const source of [html, ...scripts]) assert(!source.includes('/hirehelper/'), 'Pages base path in Vercel artifact');
}
console.log(`${vercel ? 'Vercel' : 'Pages'} artifact passed: app, adapter, disclosure, assets, base path and no local runtime links.`);
