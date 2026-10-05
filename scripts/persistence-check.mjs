import pg from 'pg';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const db = new pg.Client({
  connectionString: 'postgresql://test:test-only-password@127.0.0.1:55432/hirehelper_test',
});
await db.connect();
const counts = (
  await db.query(
    'SELECT (SELECT COUNT(*)::int FROM "User") AS users,(SELECT COUNT(*)::int FROM "Task") AS tasks,(SELECT COUNT(*)::int FROM "Notification") AS notices',
  )
).rows[0];
const media = (
  await db.query(
    'SELECT "filename" FROM "UploadedFile" WHERE EXISTS (SELECT 1 FROM "User" WHERE "avatarId"="UploadedFile"."id") LIMIT 1',
  )
).rows[0];
if (media && !existsSync(resolve('.tools/test-uploads', media.filename)))
  throw new Error('Persisted avatar bytes missing.');
const path = '.tools/persistence-baseline.json';
if (process.argv.includes('--record')) {
  writeFileSync(path, JSON.stringify(counts));
  console.log('Recorded isolated DB and media persistence baseline.');
} else {
  const baseline = JSON.parse(readFileSync(path, 'utf8'));
  if (JSON.stringify(baseline) !== JSON.stringify(counts))
    throw new Error('Persistence counts changed across restart');
  console.log(
    'PostgreSQL user/task/notification counts and attached media persisted across restart.',
  );
}
await db.end();
