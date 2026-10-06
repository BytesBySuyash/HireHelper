import { test, expect, BrowserContext, APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const password = 'Test-Helper-Password-2026!';
async function otpFor(email: string, request: APIRequestContext) {
  let code = '';
  await expect
    .poll(async () => {
      const response = await request.get('http://localhost:58025/api/v1/messages');
      const body = await response.json();
      const item = body.messages.find((m: any) => m.To.some((to: any) => to.Address === email));
      if (!item) return false;
      const message = await (
        await request.get(`http://localhost:58025/api/v1/message/${item.ID}`)
      ).json();
      code = message.Text.match(/code is (\d{6})/)[1];
      return true;
    })
    .toBe(true);
  return code;
}
async function register(context: BrowserContext, email: string, name: string) {
  const page = await context.newPage();
  await page.goto('/register');
  await page.getByLabel('First name').fill(name);
  await page.getByLabel('Last name').fill('Test');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByLabel('Verification code')).toBeVisible();
  await page.getByLabel('Verification code').fill(await otpFor(email, context.request));
  await page.getByRole('button', { name: 'Verify code', exact: true }).click();
  await expect(page).toHaveURL(/\/feed$/);
  return page;
}
async function post(context: BrowserContext, path: string, data: unknown = {}) {
  const csrf = (await context.cookies()).find((c) => c.name === 'hh_csrf')!.value;
  return context.request.post(`/api/v1/${path}`, {
    data,
    headers: { origin: 'http://localhost:4200', 'x-csrf-token': decodeURIComponent(csrf) },
  });
}
test('real owner/helper flow, task image, notifications, lifecycle and responsive reloads', async ({
  browser,
}) => {
  const owner = await browser.newContext(),
    helper = await browser.newContext();
  const suffix = randomUUID().slice(0, 8);
  const title = `Help arrange a community bookshelf ${suffix}`;
  const a = await register(owner, `owner-${suffix}@hirehelper.test`, 'Owner');
  const b = await register(helper, `helper-${suffix}@hirehelper.test`, 'Helper');
  await a.getByRole('link', { name: 'Add Task', exact: true }).click();
  await a.getByLabel('Task title').fill(title);
  await a
    .getByLabel('What do you need help with?')
    .fill('Please help sort the books and arrange them on a bookshelf.');
  await a.getByLabel('Location', { exact: true }).fill('Maple district');
  const start = new Date(Date.now() + 86400000);
  await a
    .getByLabel('Start date', { exact: true })
    .fill(`${start.getDate()}/${start.getMonth() + 1}/${start.getFullYear()}`);
  await a.getByLabel('Start time', { exact: true }).fill('10:30');
  const sharp = (await import('sharp')).default;
  const picture = await sharp({
    create: { width: 80, height: 60, channels: 3, background: '#78a57c' },
  })
    .png()
    .toBuffer();
  await a
    .getByLabel('Task picture (optional)', { exact: false })
    .setInputFiles({ name: 'task.png', mimeType: 'image/png', buffer: picture });
  await a.getByRole('button', { name: 'Publish task' }).click();
  await expect(a).toHaveURL(/\/tasks\/[a-f0-9-]+$/);
  const taskId = a.url().split('/').at(-1)!;
  await expect
    .poll(() => a.locator('.detail-image').evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  await b.goto('/feed');
  await b.getByLabel('Search tasks').fill(title);
  await b.getByRole('button', { name: 'Search', exact: true }).click();
  await b.getByRole('link', { name: title }).click();
  await b.getByLabel('Message (optional)').fill('Happy to lend a hand.');
  await b.getByRole('button', { name: 'Offer to help' }).click();
  await expect(b.getByText('Your request:')).toBeVisible();
  await expect(a.getByRole('button', { name: 'Notifications' })).toContainText('1');
  await helper.setOffline(true);
  await a.getByRole('link', { name: 'Requests', exact: true }).click();
  a.once('dialog', (d) => d.accept());
  await a.getByRole('button', { name: 'Accept', exact: true }).click();
  await helper.setOffline(false);
  await expect(b.getByRole('button', { name: 'Notifications' })).toContainText('1');
  await b.goto(`/tasks/${taskId}`);
  await b.getByRole('button', { name: 'Start work' }).click();
  await expect(b.getByRole('button', { name: 'Request completion' })).toBeVisible();
  await b.getByRole('button', { name: 'Request completion' }).click();
  await a.goto(`/tasks/${taskId}`);
  await a.getByLabel('Reason to return to progress').fill('Please finish arranging the top shelf.');
  await a.getByRole('button', { name: 'Return to progress' }).click();
  await b.reload();
  await b.getByRole('button', { name: 'Request completion' }).click();
  await a.reload();
  a.once('dialog', (d) => d.accept());
  await a.getByRole('button', { name: 'Confirm completion' }).click();
  await expect(a.locator('.page-heading .status')).toHaveText('COMPLETED');
  const notices = await (await helper.request.get('/api/v1/notifications')).json();
  expect(notices.unread).toBeGreaterThan(0);
  expect(notices.items.some((n: any) => n.taskId === taskId)).toBeTruthy();
  for (const width of [360, 768, 1440]) {
    await a.setViewportSize({ width, height: 900 });
    await a.goto('/feed');
    await expect(a.getByRole('heading', { name: /Hello, Owner/ })).toBeVisible();
    expect(
      await a.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
    await a.screenshot({ path: `docs/screenshots/feed-${width}.png`, fullPage: true });
  }
  expect((await post(helper, `tasks/${taskId}/cancel`)).status()).toBe(403);
  // Expiring a database session must remove access after a deep-link reload.
  const { Client } = await import('pg');
  const db = new Client({
    connectionString: 'postgresql://test:test-only-password@127.0.0.1:55432/hirehelper_test',
  });
  await db.connect();
  const me = await (await owner.request.get('/api/v1/auth/me')).json();
  await db.query('UPDATE "Session" SET "expiresAt"=NOW()-interval \'1 second\' WHERE "userId"=$1', [
    me.id,
  ]);
  await db.end();
  await a.reload();
  await expect(a).toHaveURL(/\/login$/);
  await owner.close();
  await helper.close();
});
test('registration blocks dashboard before OTP, wrong code and CSRF', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const email = `pending-${randomUUID()}@hirehelper.test`;
  await page.goto('/register');
  await page.getByLabel('First name').fill('Pending');
  await page.getByLabel('Last name').fill('Test');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByLabel('Verification code')).toBeVisible();
  expect((await context.request.get('/api/v1/tasks')).status()).toBe(401);
  await page.getByLabel('Verification code').fill('000000');
  await page.getByRole('button', { name: 'Verify code', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(
    (await context.request.post('/api/v1/auth/login', { data: { email, password } })).status(),
  ).toBe(403);
  await context.close();
});
