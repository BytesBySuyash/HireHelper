import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
if (!existsSync('.env')) {
  const password = randomBytes(24).toString('hex');
  let config = readFileSync('.env.example', 'utf8')
    .replace('POSTGRES_PASSWORD=GENERATED_BY_SETUP', `POSTGRES_PASSWORD=${password}`)
    .replace(
      'DATABASE_URL=GENERATED_BY_SETUP',
      `DATABASE_URL=postgresql://hirehelper:${password}@localhost:5432/hirehelper`,
    )
    .replace(
      'SESSION_SECRET=GENERATED_BY_SETUP',
      `SESSION_SECRET=${randomBytes(32).toString('hex')}`,
    )
    .replace('OTP_SECRET=GENERATED_BY_SETUP', `OTP_SECRET=${randomBytes(32).toString('hex')}`);
  writeFileSync('.env', config, { mode: 0o600, flag: 'wx' });
  console.log('Created ignored local .env. Secrets were not printed.');
} else console.log('Existing .env preserved.');
mkdirSync('uploads', { recursive: true });
