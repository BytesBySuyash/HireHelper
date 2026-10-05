import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: 'postgresql://test:test-only-password@127.0.0.1:55432/hirehelper_test',
    options: '-c timezone=UTC',
  }),
});
const c = await db.otpChallenge.findFirst({
  where: { targetEmail: { startsWith: 'auth-' } },
  orderBy: { expiresAt: 'desc' },
  select: { id: true, sentAt: true, expiresAt: true },
});
console.log({ sentAt: c?.sentAt, expiresAt: c?.expiresAt, appNow: new Date() });
console.log(
  await db.$queryRaw`SELECT "sentAt", NOW() AS now, current_setting('TimeZone') AS timezone FROM "OtpChallenge" WHERE "id"=${c.id}::uuid`,
);
await db.$disconnect();
