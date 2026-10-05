import { test, expect, APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
const password = 'Integration-Password-2026!';
test.beforeAll(async () => {
  const db = new Client({
    connectionString: 'postgresql://test:test-only-password@127.0.0.1:55432/hirehelper_test',
  });
  await db.connect();
  const name = (await db.query('SELECT current_database() AS name')).rows[0].name;
  if (name !== 'hirehelper_test') throw new Error('Refusing to modify non-test database');
  await db.query('DELETE FROM "RateLimit"');
  await db.end();
});
class ClientSession {
  csrf = '';
  user: any;
  email = `api-${randomUUID()}@hirehelper.test`;
  constructor(public request: APIRequestContext) {}
  async boot() {
    this.csrf = (await (await this.request.get('/api/v1/auth/csrf')).json()).csrfToken;
  }
  async post(path: string, data: unknown = {}) {
    return this.request.post(`/api/v1/${path}`, {
      data,
      headers: { origin: 'http://localhost:4200', 'x-csrf-token': this.csrf },
    });
  }
  async get(path: string) {
    return this.request.get(`/api/v1/${path}`);
  }
  async code() {
    let result = '';
    await expect
      .poll(async () => {
        const list = await (
          await this.request.get('http://localhost:58025/api/v1/messages')
        ).json();
        const item = list.messages.find((m: any) =>
          m.To.some((to: any) => to.Address === this.email),
        );
        if (!item) return false;
        const msg = await (
          await this.request.get(`http://localhost:58025/api/v1/message/${item.ID}`)
        ).json();
        result = msg.Text.match(/code is (\d{6})/)[1];
        return true;
      })
      .toBe(true);
    return result;
  }
  async register() {
    await this.boot();
    const response = await this.post('auth/register', {
      firstName: 'API',
      lastName: 'Tester',
      email: this.email,
      password,
      passwordConfirmation: password,
    });
    expect(response.ok()).toBeTruthy();
    const challenge = await response.json();
    expect((await this.get('tasks')).status()).toBe(401);
    const verify = await this.post('auth/verify', {
      challengeId: challenge.challengeId,
      code: await this.code(),
    });
    expect(verify.ok()).toBeTruthy();
    this.user = (await verify.json()).user;
    await this.boot();
    return challenge;
  }
}
test('PostgreSQL concurrency, ownership, lifecycle, uploads, reset and notifications', async ({
  playwright,
}) => {
  const sessions = await Promise.all(
    [0, 1, 2].map(async () => {
      const req = await playwright.request.newContext({ baseURL: 'http://localhost:4200' });
      const session = new ClientSession(req);
      await session.register();
      return session;
    }),
  );
  const [owner, a, b] = sessions;
  const taskResponse = await owner.post('tasks', {
    title: 'Concurrent helper selection',
    description: 'A task for testing concurrent selection against PostgreSQL.',
    location: 'Test district',
    startAt: new Date(Date.now() + 86400000).toISOString(),
  });
  expect(taskResponse.status()).toBe(201);
  const task = await taskResponse.json();
  expect((await owner.post(`tasks/${task.id}/requests`)).status()).toBe(403);
  const first = await (await a.post(`tasks/${task.id}/requests`)).json(),
    second = await (await b.post(`tasks/${task.id}/requests`)).json();
  expect((await a.post(`tasks/${task.id}/requests`)).status()).toBe(409);
  const accepted = await Promise.all([
    owner.post(`requests/${first.id}/accept`),
    owner.post(`requests/${second.id}/accept`),
  ]);
  expect(accepted.map((x) => x.status()).sort()).toEqual([201, 409]);
  const detail = await (await owner.get(`tasks/${task.id}`)).json();
  expect(detail.status).toBe('ASSIGNED');
  expect(detail.contacts).toHaveLength(2);
  const chosen = detail.assignment.helperId === a.user.id ? a : b,
    other = chosen === a ? b : a;
  const db = new Client({
    connectionString: 'postgresql://test:test-only-password@127.0.0.1:55432/hirehelper_test',
  });
  await db.connect();
  expect(
    (await db.query('SELECT COUNT(*)::int AS n FROM "TaskAssignment" WHERE "taskId"=$1', [task.id]))
      .rows[0].n,
  ).toBe(1);
  expect((await other.post(`tasks/${task.id}/start`)).status()).toBe(403);
  expect((await chosen.post(`tasks/${task.id}/complete-request`)).status()).toBe(409);
  expect((await chosen.post(`tasks/${task.id}/start`)).status()).toBe(201);
  expect((await owner.post(`tasks/${task.id}/cancel`)).status()).toBe(409);
  expect((await chosen.post(`tasks/${task.id}/complete-request`)).status()).toBe(201);
  expect(
    (
      await owner.post(`tasks/${task.id}/return`, { reason: 'Please complete the remaining work.' })
    ).status(),
  ).toBe(201);
  expect((await chosen.post(`tasks/${task.id}/complete-request`)).status()).toBe(201);
  expect((await owner.post(`tasks/${task.id}/confirm`)).status()).toBe(201);
  const notices = await (await chosen.get('notifications')).json();
  expect(notices.unread).toBeGreaterThan(0);
  await chosen.post('notifications/read-all');
  expect((await (await chosen.get('notifications/unread')).json()).unread).toBe(0);
  expect(
    (await (await other.get('notifications')).json()).items.every(
      (n: any) => n.recipientId === other.user.id,
    ),
  ).toBeTruthy();
  const malicious = await owner.request.post('/api/v1/files?use=TASK', {
    headers: { origin: 'http://localhost:4200', 'x-csrf-token': owner.csrf },
    multipart: {
      file: {
        name: 'image.png',
        mimeType: 'image/png',
        buffer: Buffer.from('<svg onload="alert(1)"></svg>'),
      },
    },
  });
  expect(malicious.status()).toBe(400);
  const sharp = (await import('sharp')).default;
  const bytes = await sharp({
    create: { width: 16, height: 16, channels: 3, background: '#468765' },
  })
    .png()
    .toBuffer();
  const upload = await owner.request.post('/api/v1/files?use=AVATAR', {
    headers: { origin: 'http://localhost:4200', 'x-csrf-token': owner.csrf },
    multipart: { file: { name: 'avatar.png', mimeType: 'image/png', buffer: bytes } },
  });
  expect(upload.status()).toBe(201);
  const file = await upload.json();
  expect((await other.get(`files/${file.id}`)).status()).toBe(404);
  expect(
    (
      await owner.post('auth/profile', {
        firstName: 'Updated',
        lastName: 'Tester',
        avatarId: file.id,
      })
    ).status(),
  ).toBe(201);
  expect((await other.get(`files/${file.id}`)).status()).toBe(200);
  const cancel = await (
    await owner.post('tasks', {
      title: 'Cancellation propagation',
      description: 'Task to check assignment cancellation.',
      location: 'Test district',
      startAt: new Date(Date.now() + 86400000).toISOString(),
    })
  ).json();
  const cancelReq = await (await a.post(`tasks/${cancel.id}/requests`)).json();
  await owner.post(`requests/${cancelReq.id}/accept`);
  await owner.post(`tasks/${cancel.id}/cancel`);
  expect((await (await a.get(`tasks/${cancel.id}`)).json()).assignment.status).toBe('CANCELLED');
  const withdraw = await (
    await owner.post('tasks', {
      title: 'Withdraw pending request',
      description: 'Task to check withdrawal and duplicate prevention.',
      location: 'Test district',
      startAt: new Date(Date.now() + 86400000).toISOString(),
    })
  ).json();
  const withdrawn = await (await b.post(`tasks/${withdraw.id}/requests`)).json();
  expect((await b.post(`requests/${withdrawn.id}/withdraw`)).status()).toBe(201);
  expect((await b.post(`tasks/${withdraw.id}/requests`)).status()).toBe(409);
  const feed = await (await owner.get('tasks?search=Concurrent&limit=1')).json();
  expect(
    feed.items.every((t: any) => t.ownerId !== owner.user.id && t.status === 'OPEN'),
  ).toBeTruthy();
  await owner.post('auth/logout');
  expect((await owner.get('tasks')).status()).toBe(401);
  // Reset authorization cannot authenticate; a reset revokes an existing session.
  const forgot = await (await a.post('auth/forgot', { email: a.email })).json();
  await new Promise((r) => setTimeout(r, 30));
  const resetCode = await a.code();
  const verified = await (
    await a.post('auth/verify', { challengeId: forgot.challengeId, code: resetCode })
  ).json();
  expect(verified.authorization).toBeTruthy();
  expect(verified.user).toBeUndefined();
  expect(
    (
      await a.post('auth/reset', {
        authorization: verified.authorization,
        password: 'New-Integration-Password-2026!',
      })
    ).status(),
  ).toBe(201);
  expect((await a.get('tasks')).status()).toBe(401);
  expect(
    (await a.post('auth/reset', { authorization: verified.authorization, password })).status(),
  ).toBe(400);
  await db.end();
  for (const s of sessions) await s.request.dispose();
});
