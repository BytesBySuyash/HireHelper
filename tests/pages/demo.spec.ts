import { test, expect } from '@playwright/test';

test('Pages demo runs without API calls: image, owner/helper lifecycle, persistence, privacy and reset', async ({
  page,
  browser,
  baseURL,
}) => {
  const apiRequests: string[] = [];
  const errors: string[] = [];
  const eventSources: string[] = [];
  await page.exposeFunction('reportDemoEventSource', (url: string) => eventSources.push(url));
  page.on('request', (r) => {
    if (/^\/api(?:\/|$)/.test(new URL(r.url()).pathname)) apiRequests.push(r.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'EventSource', {
      value: class {
        constructor(url: string) {
          void (
            window as unknown as { reportDemoEventSource: (url: string) => Promise<void> }
          ).reportDemoEventSource(url);
          throw new Error('Unexpected EventSource connection');
        }
      },
    });
  });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /Post a task. Find a helper./ })).toBeVisible();
  await page.getByRole('button', { name: 'Explore as Mira' }).click();
  await expect(page.getByRole('heading', { name: /Hello, Mira/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Notifications', exact: true })).toContainText('1');
  await page.getByRole('link', { name: 'Add Task', exact: true }).click();
  const title = 'Pages demo bookshelf task';
  await page.getByLabel('Task title').fill(title);
  await page
    .getByLabel('What do you need help with?')
    .fill('Help organize the books and assemble a small neighbourhood bookshelf.');
  await page.getByLabel('Location', { exact: true }).fill('Demo district');
  const future = new Date(Date.now() + 86400000);
  await page
    .getByLabel('Start date', { exact: true })
    .fill(`${future.getDate()}/${future.getMonth() + 1}/${future.getFullYear()}`);
  await page.getByLabel('Start time', { exact: true }).fill('10:30');
  const sharp = (await import('sharp')).default;
  const image = await sharp({
    create: { width: 80, height: 60, channels: 3, background: '#78a57c' },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel('Task picture (optional)', { exact: false })
    .setInputFiles({ name: 'demo.png', mimeType: 'image/png', buffer: image });
  await page.getByRole('button', { name: 'Publish task' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  const detail = page.url();
  await expect
    .poll(() => page.locator('.detail-image').evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  await page.getByLabel('Demo account').selectOption('theo');
  await page.getByLabel('Search tasks').fill(title);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('link', { name: title, exact: true }).click();
  await page.getByRole('button', { name: 'Offer to help' }).click();
  await expect(page.getByText('Your request:')).toBeVisible();
  await page.getByLabel('Demo account').selectOption('mira');
  await expect(page.getByRole('button', { name: 'Notifications', exact: true })).toContainText('2');
  await page.getByRole('link', { name: 'Requests', exact: true }).click();
  const request = page.locator('.request-card').filter({ hasText: title });
  page.once('dialog', (dialog) => dialog.accept());
  await request.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect(request.locator('.status')).toHaveText('ACCEPTED');
  await page.getByLabel('Demo account').selectOption('theo');
  await page.goto(detail);
  await page.getByRole('button', { name: 'Start work', exact: true }).click();
  await page.getByRole('button', { name: 'Request completion', exact: true }).click();
  await page.getByLabel('Demo account').selectOption('mira');
  await page.goto(detail);
  await page.getByLabel('Reason to return to progress').fill('Please finish the top shelf.');
  await page.getByRole('button', { name: 'Return to progress', exact: true }).click();
  await expect(page.locator('.page-heading .status')).toHaveText('IN PROGRESS');
  await page.getByLabel('Demo account').selectOption('theo');
  await page.goto(detail);
  await page.getByRole('button', { name: 'Request completion', exact: true }).click();
  await page.getByLabel('Demo account').selectOption('mira');
  await page.goto(detail);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Confirm completion', exact: true }).click();
  await page.reload();
  await expect(page.locator('.page-heading .status')).toHaveText('COMPLETED');
  await expect
    .poll(() => page.locator('.detail-image').evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('./#/feed');
    await expect(page.getByRole('heading', { name: /Hello, Mira/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page.getByText('This is a portfolio simulation.', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Current password', { exact: true })).toHaveCount(0);
  await page.getByLabel('First name').fill('Demo Mira');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByText('Profile saved.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('First name')).toHaveValue('Demo Mira');
  const fresh = await browser.newContext();
  const other = await fresh.newPage();
  await other.goto(baseURL!);
  await other.getByRole('button', { name: 'Explore as Mira' }).click();
  await other.goto(`${baseURL}#/my-tasks`);
  await expect(other.getByRole('link', { name: title, exact: true })).toHaveCount(0);
  await fresh.close();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Post a task. Find a helper./ })).toBeVisible();
  await page.getByRole('button', { name: 'Explore as Mira' }).click();
  await page.goto('./#/my-tasks');
  await expect(page.getByRole('link', { name: title, exact: true })).toHaveCount(0);
  expect(eventSources).toEqual([]);
  expect(apiRequests).toEqual([]);
  expect(errors).toEqual([]);
});
