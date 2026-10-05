import { test, expect } from '@playwright/test';
import { Client } from 'pg';
import { randomUUID } from 'node:crypto';
test('seed login OTP, feed pagination/filters, stale expiry and task edit/delete', async ({
  playwright,
}) => {
  const db = new Client({
    connectionString: 'postgresql://test:test-only-password@127.0.0.1:55432/hirehelper_test',
  });
  await db.connect();
  const request = await playwright.request.newContext({ baseURL: 'http://localhost:4200' });
  let csrf = (await (await request.get('/api/v1/auth/csrf')).json()).csrfToken;
  const post = (path: string, data: unknown = {}) =>
    request.post(`/api/v1/${path}`, {
      data,
      headers: { origin: 'http://localhost:4200', 'x-csrf-token': csrf },
    });
  const login = await post('auth/login', {
    email: 'mira@hirehelper.test',
    password: 'Demo-Helper-2026!',
  });
  expect(login.status()).toBe(201);
  const id = (await login.json()).challengeId;
  expect((await request.get('/api/v1/tasks')).status()).toBe(401);
  let code = '';
  await expect
    .poll(async () => {
      const list = await (await request.get('http://localhost:58025/api/v1/messages')).json();
      const item = list.messages.find((m: any) =>
        m.To.some((to: any) => to.Address === 'mira@hirehelper.test'),
      );
      if (!item) return false;
      code = (
        await (await request.get(`http://localhost:58025/api/v1/message/${item.ID}`)).json()
      ).Text.match(/code is (\d{6})/)[1];
      return true;
    })
    .toBe(true);
  expect((await post('auth/verify', { challengeId: id, code })).status()).toBe(201);
  csrf = (await (await request.get('/api/v1/auth/csrf')).json()).csrfToken;
  const user = await (await request.get('/api/v1/auth/me')).json();
  const q = 'tasks?limit=2&sort=newest';
  const first = await (await request.get(`/api/v1/${q}`)).json(),
    second = await (await request.get(`/api/v1/${q}&page=2`)).json();
  expect(first.items).toHaveLength(2);
  expect(second.items).toHaveLength(2);
  expect(second.items.every((t: any) => !first.items.some((a: any) => a.id === t.id))).toBeTruthy();
  for (const t of [...first.items, ...second.items]) {
    expect(t.ownerId).not.toBe(user.id);
    expect(t.status).toBe('OPEN');
    expect(new Date(t.startAt).getTime()).toBeGreaterThan(Date.now());
  }
  const filtered = await (
    await request.get('/api/v1/tasks?location=Maple&search=Help&limit=50')
  ).json();
  expect(filtered.items.length).toBeGreaterThan(0);
  expect(
    filtered.items.every(
      (t: any) =>
        t.location.includes('Maple') &&
        (t.title.toLowerCase().includes('help') || t.description.toLowerCase().includes('help')),
    ),
  ).toBeTruthy();
  expect((await request.get('/api/v1/tasks?limit=1000')).status()).toBe(400);
  const stale = first.items[0];
  const old = (await db.query('SELECT "startAt" FROM "Task" WHERE "id"=$1', [stale.id])).rows[0]
    .startAt;
  await db.query('UPDATE "Task" SET "startAt"=NOW()-interval \'1 minute\' WHERE "id"=$1', [
    stale.id,
  ]);
  expect((await post(`tasks/${stale.id}/requests`)).status()).toBe(409);
  await db.query('UPDATE "Task" SET "startAt"=$2 WHERE "id"=$1', [stale.id, old]);
  const dto = {
    title: `Editable ${randomUUID().slice(0, 5)}`,
    description: 'A valid description of a useful task.',
    location: 'Maple district',
    startAt: new Date(Date.now() + 86400000).toISOString(),
  };
  expect((await post('tasks', { ...dto, startAt: '2020-01-01T12:00:00Z' })).status()).toBe(400);
  expect(
    (await post('tasks', { ...dto, endAt: new Date(Date.now() + 3600000).toISOString() })).status(),
  ).toBe(400);
  expect((await post('tasks', { ...dto, userId: 'malicious' })).status()).toBe(400);
  const created = await (await post('tasks', dto)).json();
  expect(
    (
      await request.patch(`/api/v1/tasks/${created.id}`, {
        headers: { origin: 'http://localhost:4200', 'x-csrf-token': csrf },
        data: { ...dto, title: 'Edited task title' },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.delete(`/api/v1/tasks/${created.id}`, {
        headers: { origin: 'http://localhost:4200', 'x-csrf-token': csrf },
      })
    ).status(),
  ).toBe(200);
  await request.dispose();
  await db.end();
});
