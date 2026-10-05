import pg from 'pg';
const db=new pg.Client({connectionString:'postgresql://test:test-only-password@127.0.0.1:55432/hirehelper_test'});await db.connect();
console.log((await db.query('SELECT "purpose","sentAt", NOW() AS now, NOW()-"sentAt" AS elapsed,"attempts","consumedAt" IS NOT NULL AS consumed FROM "OtpChallenge" ORDER BY "createdAt" DESC LIMIT 3')).rows);
console.log((await db.query('SELECT "purpose","sentAt",NOW() AS now,NOW()-"sentAt" AS elapsed,"attempts" FROM "OtpChallenge" WHERE "targetEmail" LIKE \'auth-%\' ORDER BY "expiresAt" DESC LIMIT 3')).rows);
console.log((await db.query("SELECT data_type,column_name FROM information_schema.columns WHERE table_name='OtpChallenge' AND column_name='sentAt'")).rows);
await db.end();
