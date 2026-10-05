import 'dotenv/config';
import { config } from 'dotenv';
import { PrismaClient, TaskStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
config({ path: '../../.env', quiet: true });
if (process.env.NODE_ENV === 'production' || process.env.DEMO_SEED !== 'true')
  throw new Error('Development seeding requires DEMO_SEED=true and non-production NODE_ENV.');
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    options: '-c timezone=UTC',
  }),
});
async function seed() {
  const passwordHash = await argon2.hash('Demo-Helper-2026!', { type: argon2.argon2id });
  try {
    const names = [
      ['Mira', 'Green', 'mira'],
      ['Theo', 'River', 'theo'],
      ['Sam', 'Field', 'sam'],
    ];
    const users = [];
    for (const [firstName, lastName, slug] of names)
      users.push(
        await db.user.upsert({
          where: { email: `${slug}@hirehelper.test` },
          update: {},
          create: {
            firstName,
            lastName,
            email: `${slug}@hirehelper.test`,
            passwordHash,
            emailVerifiedAt: new Date(),
          },
        }),
      );
    const topics = [
      'Help move a bookshelf',
      'Plant a balcony garden',
      'Set up a community picnic',
      'Organise a book collection',
      'Repair a bicycle puncture',
      'Assemble a small desk',
      'Carry groceries upstairs',
      'Walk a friendly dog',
      'Sort recycling for collection',
      'Water the garden',
      'Help pack for a move',
      'Hang a picture frame',
      'Teach basic spreadsheet skills',
      'Prepare a neighbourhood event',
      'Organise craft supplies',
      'Paint a garden bench',
      'Help clean a courtyard',
      'Set up a laptop',
      'Carry a potted tree',
      'Sort a tool collection',
      'Help carry picnic tables',
      'Organise a community library',
      'Help repot indoor plants',
      'Prepare supplies for a workshop',
      'Arrange a reading corner',
      'Help assemble storage shelves',
      'Set up a neighbourhood noticeboard',
      'Help label donated books',
      'Organise a shared garden shed',
      'Carry boxes to a community centre',
    ];
    const states: TaskStatus[] = [
      'OPEN',
      'ASSIGNED',
      'IN_PROGRESS',
      'COMPLETION_PENDING',
      'COMPLETED',
      'CANCELLED',
    ];
    for (let i = 0; i < topics.length; i++) {
      const id = `10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
        owner = users[i % 3],
        helper = users[(i + 1) % 3],
        status = i < 24 ? 'OPEN' : states[(i - 24) % 6];
      if (await db.task.findUnique({ where: { id } })) continue;
      await db.$transaction(async (tx) => {
        await tx.task.create({
          data: {
            id,
            ownerId: owner.id,
            title: topics[i],
            description: `Looking for a friendly helping hand to ${topics[i].toLowerCase()}. We will agree on the details before starting. All materials will be provided.`,
            location: i % 2 ? 'Maple neighbourhood' : 'River district',
            startAt: new Date(Date.now() + (i + 1) * 86400000),
            endAt: new Date(Date.now() + (i + 1) * 86400000 + 7200000),
            status,
          },
        });
        if (status !== 'OPEN' && status !== 'CANCELLED') {
          const request = await tx.taskRequest.create({
            data: {
              taskId: id,
              requesterId: helper.id,
              status: 'ACCEPTED',
              message: 'Happy to lend a hand!',
            },
          });
          await tx.taskAssignment.create({
            data: {
              taskId: id,
              helperId: helper.id,
              acceptedRequestId: request.id,
              status: status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE',
              startedAt: status !== 'ASSIGNED' ? new Date() : null,
              completionRequestedAt: ['COMPLETION_PENDING', 'COMPLETED'].includes(status)
                ? new Date()
                : null,
              completedAt: status === 'COMPLETED' ? new Date() : null,
            },
          });
        } else if (status === 'OPEN' && i % 3 === 0) {
          await tx.taskRequest.create({
            data: { taskId: id, requesterId: helper.id, message: 'I can help with this task.' },
          });
          await tx.notification.create({
            data: {
              recipientId: owner.id,
              type: 'TASK_EVENT',
              body: `New help request for ${topics[i]}`,
              taskId: id,
            },
          });
        }
      });
    }
    console.log(
      'Development demo created. Accounts: mira/theo/sam@hirehelper.test. Password: Demo-Helper-2026! OTP still required in Mailpit.',
    );
  } finally {
    await db.$disconnect();
  }
}
void seed().catch((e) => {
  console.error(e instanceof Error ? e.message : 'Seed failed');
  process.exitCode = 1;
});
