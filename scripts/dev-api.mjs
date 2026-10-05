import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
// Compile with TypeScript so Nest's decorator metadata is emitted (tsx does not emit it).
const compiler = resolve('../../node_modules/typescript/bin/tsc');
const initial = spawnSync(process.execPath, [compiler, '-p', 'tsconfig.json'], {
  stdio: 'inherit',
});
if (initial.status !== 0) process.exit(initial.status ?? 1);
const watcher = spawn(process.execPath, [compiler, '--watch', '-p', 'tsconfig.json'], {
  stdio: 'inherit',
});
const server = spawn(process.execPath, ['--watch', 'dist/main.js'], { stdio: 'inherit' });
const stop = () => {
  watcher.kill();
  server.kill();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
