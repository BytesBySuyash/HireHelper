import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
config({ quiet: true });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, options: '-c timezone=UTC' }),
});
const root = resolve(process.env.UPLOAD_DIR || 'uploads');
const cutoff = new Date(Date.now() - 86400000);
let count = 0;
try {
  const candidates = await db.uploadedFile.findMany({
    where: { createdAt: { lt: cutoff }, tasks: { none: {} }, avatars: { none: {} } },
    select: { id: true, filename: true },
  });
  for (const candidate of candidates) {
    const removed = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "UploadedFile" WHERE "id"=${candidate.id}::uuid FOR UPDATE`;
      const file = await tx.uploadedFile.findFirst({
        where: {
          id: candidate.id,
          createdAt: { lt: cutoff },
          tasks: { none: {} },
          avatars: { none: {} },
        },
      });
      if (!file) return false;
      await tx.uploadedFile.delete({ where: { id: file.id } });
      return true;
    });
    if (removed) {
      try {
        await unlink(join(root, candidate.filename));
      } catch (e) {
        if (e.code !== 'ENOENT') console.error('A removed upload needs filesystem cleanup.');
      }
      count++;
    }
  }
  console.log(`Removed ${count} unattached upload records older than 24 hours.`);
} finally {
  await db.$disconnect();
}
