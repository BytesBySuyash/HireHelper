import { test, expect } from '@playwright/test';

const key = 'hirehelper:pages-demo:v1';
test('calendar and typed dates validate and survive editing in device timezone', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Try demo', exact: true }).click();
  await page.getByRole('link', { name: 'Add Task', exact: true }).click();
  await page.getByLabel('Task title').fill('Calendar task');
  await page
    .getByLabel('What do you need help with?')
    .fill('A task to verify calendar input and local times.');
  await page.getByLabel('Location', { exact: true }).fill('Sample district');
  await page.getByRole('button', { name: 'Open calendar' }).first().click();
  await expect(page.locator('mat-calendar')).toBeVisible();
  const pick = new Date(Date.now() + 3 * 86400000);
  if (pick.getMonth() !== new Date().getMonth())
    await page.getByRole('button', { name: 'Next month' }).click();
  await page
    .getByRole('button', {
      name: new RegExp(
        ` ${pick.getDate()} ${pick.toLocaleString('en-GB', { month: 'long' })} ${pick.getFullYear()}$`,
      ),
    })
    .click();
  await expect(page.locator('mat-calendar')).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Start date', exact: true }).fill('31/02/2027');
  await page.getByLabel('Start time', { exact: true }).fill('10:30');
  await expect(page.getByRole('button', { name: 'Publish task' })).toBeDisabled();
  const date = new Date(Date.now() + 3 * 86400000);
  const typed = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  await page.getByRole('textbox', { name: 'Start date', exact: true }).fill(typed);
  await page.getByLabel('End date (optional)', { exact: true }).fill(typed);
  await expect(page.getByRole('button', { name: 'Publish task' })).toBeDisabled();
  await page.getByLabel('End time (optional)', { exact: true }).fill('09:30');
  await expect(page.getByRole('button', { name: 'Publish task' })).toBeDisabled();
  await page.getByRole('button', { name: 'Choose start time', exact: true }).click();
  const startTimeOptions = page.getByRole('listbox', { name: 'Start time options' });
  await expect(startTimeOptions).toBeVisible();
  await startTimeOptions.getByRole('option', { name: '10:30', exact: true }).click();
  await expect(page.getByLabel('Start time', { exact: true })).toHaveValue('10:30');
  await page.getByRole('button', { name: 'Choose end time', exact: true }).click();
  const endTimeOptions = page.getByRole('listbox', { name: 'End time options' });
  await expect(endTimeOptions).toBeVisible();
  await endTimeOptions.getByRole('option', { name: '11:30', exact: true }).click();
  await expect(page.getByLabel('End time (optional)', { exact: true })).toHaveValue('11:30');
  await page.getByRole('button', { name: 'Publish task' }).click();
  await expect(page.getByRole('heading', { name: 'Calendar task', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Edit task', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Start date', exact: true })).toHaveValue(typed);
  await expect(page.getByLabel('Start time', { exact: true })).toHaveValue('10:30');
  await expect(page.getByLabel('End time (optional)', { exact: true })).toHaveValue('11:30');
  await page.getByLabel('End date (optional)', { exact: true }).fill('');
  await page.getByLabel('End time (optional)', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Calendar task', exact: true })).toBeVisible();
});

for (const raw of [
  '{broken',
  JSON.stringify({ version: 9 }),
  JSON.stringify({ version: 1, users: [null], tasks: [], requests: [], notices: [], images: {} }),
]) {
  test(`unreadable saved data stays intact until explicit reset: ${raw.slice(0, 24)}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('./');
    await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key, raw });
    await page.reload();
    await expect(page.getByText('Saved demo data cannot be read', { exact: false })).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(raw);
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
    await page.getByRole('button', { name: 'Try demo', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Hello, Mira/ })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('storage unavailable uses labelled memory; quota preserves existing data', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Blocked', 'SecurityError');
      },
    }),
  );
  await page.goto('./');
  await expect(page.getByText('This demo uses memory', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Try demo', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Hello, Mira/ })).toBeVisible();
});

test('quota errors preserve saved profile and give useful feedback', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Try demo', exact: true }).click();
  const before = await page.evaluate((key) => localStorage.getItem(key), key);
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Full', 'QuotaExceededError');
    };
  });
  await page.getByLabel('First name').fill('Unsaved change');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(
    page.getByText('Browser storage is full or unavailable.', { exact: false }),
  ).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(before);
});

test('expired sample refresh preserves visitor tasks and active assignments', async ({ page }) => {
  await page.goto('./');
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key)!);
    const old = new Date(Date.now() - 86400000).toISOString();
    state.tasks[0].startAt = old;
    state.tasks[1].startAt = old;
    state.tasks[1].status = 'ASSIGNED';
    state.tasks[1].helperId = 'sam';
    state.tasks.push({ ...state.tasks[2], id: 'visitor-task', startAt: old });
    localStorage.setItem(key, JSON.stringify(state));
  }, key);
  await page.reload();
  await page.getByRole('button', { name: 'Refresh expired sample dates' }).click();
  const dates = await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key)!);
    return ['sample-1', 'sample-2', 'visitor-task'].map((id) =>
      Date.parse(state.tasks.find((t: { id: string }) => t.id === id).startAt),
    );
  }, key);
  expect(dates[0]).toBeGreaterThan(Date.now());
  expect(dates[1]).toBeLessThan(Date.now());
  expect(dates[2]).toBeLessThan(Date.now());
});

test('optional garden walkthrough links to actions without completing them', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Try demo', exact: true }).click();
  await page.getByRole('button', { name: 'Show walkthrough' }).click();
  const guide = page.getByLabel('Guided walkthrough');
  await expect(guide).toContainText('OPEN');
  await guide.getByRole('link', { name: 'accept Theo’s garden offer' }).click();
  const request = page
    .locator('.request-card')
    .filter({ hasText: 'Help set up a community garden' });
  page.once('dialog', (d) => d.accept());
  await request.getByRole('button', { name: 'Accept', exact: true }).click();
  await page.getByLabel('Demo account').selectOption('theo');
  await guide.getByRole('link', { name: 'start the garden task and request completion' }).click();
  await page.getByRole('button', { name: 'Start work', exact: true }).click();
  await page.getByRole('button', { name: 'Request completion', exact: true }).click();
  await page.getByLabel('Demo account').selectOption('mira');
  await guide.getByRole('link', { name: 'confirm completion' }).click();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Confirm completion', exact: true }).click();
  await expect(guide).toContainText('COMPLETED');
  await page.getByRole('button', { name: 'Hide walkthrough' }).click();
  await expect(guide).toHaveCount(0);
});
