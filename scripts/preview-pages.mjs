// Local preview of the exact static Pages artifact. No database or API server.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve('apps/web/dist/pages/browser');
const base = process.env.PAGES_BASE_PATH || '/hirehelper/';
const port = Number(process.env.PAGES_PREVIEW_PORT || 4201);
if (!/^\/(?:[a-zA-Z0-9_.-]+\/)*$/.test(base)) throw new Error('Invalid PAGES_BASE_PATH.');
await stat(resolve(root, 'index.html'));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};
const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'HEAD'].includes(req.method || '')) {
    res.writeHead(405).end();
    return;
  }
  let path;
  try {
    path = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  if (path === '/' && base !== '/') {
    res.writeHead(302, { Location: base }).end();
    return;
  }
  if (!path.startsWith(base)) {
    res.writeHead(404).end();
    return;
  }
  const file = resolve(root, path.slice(base.length) || 'index.html');
  if (!file.startsWith(root + sep) || path.includes('\\')) {
    res.writeHead(403).end();
    return;
  }
  try {
    const bytes = await readFile(file);
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    res.writeHead(200).end(req.method === 'HEAD' ? undefined : bytes);
  } catch {
    res.writeHead(404).end('Not found');
  }
});
server.listen(port, '127.0.0.1', () =>
  console.log(`Pages demo preview: http://localhost:${port}${base}#/login`),
);
