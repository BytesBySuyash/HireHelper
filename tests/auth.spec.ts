import { test, expect } from '@playwright/test';
import { Client } from 'pg';
import { randomUUID } from 'node:crypto';
test('OTP expiry, five attempts, resend invalidation, one-time use, login, email and password changes', async ({
  playwright,
}) => {
  const db = new Client({
    connectionString: 'postgresql://test:test-only-password@127.0.0.1:55432/hirehelper_test',
  });
  await db.connect();
  await db.query('DELETE FROM "RateLimit"');
  const request = await playwright.request.newContext({ baseURL: 'http://localhost:4200' });
  let csrf = '';
  const boot = async () => {
    csrf = (await (await request.get('/api/v1/auth/csrf')).json()).csrfToken;
  };
  await boot();
  const post = (p: string, data: unknown = {}) =>
    request.post(`/api/v1/${p}`, {
      data,
      headers: { origin: 'http://localhost:4200', 'x-csrf-token': csrf },
    });
  const email = `auth-${randomUUID()}@hirehelper.test`,
    password = 'Auth-Testing-Password-2026!';
  const codeFor = async (address: string) => {
    let code = '';
    await expect
      .poll(async () => {
        const list = await (await request.get('http://localhost:58025/api/v1/messages')).json();
        const item = list.messages.find((m: any) => m.To.some((to: any) => to.Address === address));
        if (!item) return false;
        const msg = await (
          await request.get(`http://localhost:58025/api/v1/message/${item.ID}`)
        ).json();
        code = msg.Text.match(/code is (\d{6})/)[1];
        return true;
      })
      .toBe(true);
    return code;
  };
  const registered = await (
    await post('auth/register', {
      firstName: 'Auth',
      lastName: 'Test',
      email,
      password,
      passwordConfirmation: password,
    })
  ).json();
  let id = registered.challengeId;
  const initialCode = await codeFor(email);
  const wrong = initialCode === '000000' ? '999999' : '000000';
  expect((await post('auth/resend', { challengeId: id })).status()).toBe(429);
  for (let i = 0; i < 5; i++)
    expect((await post('auth/verify', { challengeId: id, code: wrong })).status()).toBe(400);
  expect((await post('auth/verify', { challengeId: id, code: initialCode })).status()).toBe(400);
  expect((await request.get('/api/v1/auth/me')).status()).toBe(401);
  await db.query('UPDATE "OtpChallenge" SET "sentAt"=NOW()-interval \'61 seconds\' WHERE "id"=$1', [
    id,
  ]);
  const replacement = await (await post('auth/resend', { challengeId: id })).json();
  expect(replacement.challengeId).toBeTruthy();
  expect((await post('auth/verify', { challengeId: id, code: initialCode })).status()).toBe(400);
  id = replacement.challengeId;
  const replacementCode = await codeFor(email);
  // Concurrent consumption has one winner, even when the same code is submitted twice.
  const outcomes = await Promise.all([
    post('auth/verify', { challengeId: id, code: replacementCode }),
    post('auth/verify', { challengeId: id, code: replacementCode }),
  ]);
  expect(outcomes.map((r) => r.status()).sort()).toEqual([201, 400]);
  await boot();
  expect((await request.get('/api/v1/auth/me')).status()).toBe(200);
  await post('auth/logout');
  const login = await (await post('auth/login', { email, password })).json();
  expect(login.challengeId).toBeTruthy();
  expect((await request.get('/api/v1/tasks')).status()).toBe(401);
  await db.query(
    'UPDATE "OtpChallenge" SET "expiresAt"=NOW()-interval \'1 second\',"sentAt"=NOW()-interval \'61 seconds\' WHERE "id"=$1',
    [login.challengeId],
  );
  expect(
    (
      await post('auth/verify', { challengeId: login.challengeId, code: await codeFor(email) })
    ).status(),
  ).toBe(400);
  const fresh = await (await post('auth/resend', { challengeId: login.challengeId })).json();
  expect(
    (
      await post('auth/verify', { challengeId: fresh.challengeId, code: await codeFor(email) })
    ).status(),
  ).toBe(201);
  await boot();
  const changed = `new-${randomUUID()}@hirehelper.test`;
  const change = await (
    await post('auth/email', { email: changed, currentPassword: password })
  ).json();
  expect((await (await request.get('/api/v1/auth/me')).json()).email).toBe(email);
  expect(
    (
      await post('auth/verify', { challengeId: change.challengeId, code: await codeFor(changed) })
    ).status(),
  ).toBe(201);
  await boot();
  expect((await (await request.get('/api/v1/auth/me')).json()).email).toBe(changed);
  expect(
    (
      await post('auth/password', {
        currentPassword: 'wrong-password',
        password: 'Another-Strong-Password-2026!',
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await post('auth/password', {
        currentPassword: password,
        password: 'Another-Strong-Password-2026!',
      })
    ).status(),
  ).toBe(201);
  expect((await request.get('/api/v1/auth/me')).status()).toBe(401);
  await boot();
  const unknown = `unknown-${randomUUID()}@hirehelper.test`;
  for (let i = 0; i < 5; i++) {
    await db.query(
      'UPDATE "OtpChallenge" SET "sentAt"=NOW()-interval \'61 seconds\' WHERE "targetEmail"=$1',
      [unknown],
    );
    expect((await post('auth/forgot', { email: unknown })).status()).toBe(201);
  }
  expect((await post('auth/forgot', { email: unknown })).status()).toBe(429);
  await request.dispose();
  await db.end();
});
