import { test, expect } from '@playwright/test';
import { blankRecord } from '../../src/lib/domain.js';

async function preview(page) {
  await page.clock.setFixedTime(new Date('2026-10-11T01:30:00Z'));
  await page.addInitScript(() => sessionStorage.setItem('daymargin-preview', 'true'));
  await page.route('**/api/auth/**', route => route.fulfill({ json: { user: null, session: null } }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
}

test('Today completion, undo and capture keep the overview and next steps current', async ({ page }) => {
  await preview(page);
  const tasks = page.locator('.today-overview > a').first().locator('strong');
  await expect(tasks).toContainText('3');
  await expect(page.locator('.today-spending')).toContainText('₱215.00');
  await page.getByRole('button', { name: 'Complete Send the project proposal', exact: true }).click();
  await expect(tasks).toContainText('2');
  await expect(page.locator('.today-task-list').getByText('Send the project proposal', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(tasks).toContainText('3');
  await expect(page.locator('.today-task-list').getByText('Send the project proposal', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add an entry', exact: true }).click();
  await page.getByRole('link', { name: 'Task', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('A new step from Today');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await page.goto('/');
  await expect(tasks).toContainText('4');
  await expect(page.locator('.today-task-list').getByText('A new step from Today', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Ask Finn', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Ask Finn a question' })).toHaveValue('What needs my attention today?');
});

test('Today remains readable in both themes at phone, tablet and desktop widths', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await preview(page);
  for (const theme of ['Light', 'Dark']) {
    await page.goto('/settings'); await page.getByRole('button', { name: theme, exact: true }).click();
    await page.getByLabel('Reduce motion').check();
    await page.goto('/');
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.locator('.today-finn').scrollIntoViewIfNeeded();
      expect(await page.locator('.today-finn .finn-sprite').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
    }
  }
  expect(errors).toEqual([]);
});

test('Today empty states, current events and reminders use real times and record links', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-11T01:30:00Z'));
  await page.route('**/api/auth/**', route => route.fulfill({ json:
    new URL(route.request().url()).pathname.endsWith('/token') ? { token: 'isolated-test-token' } : {
      user: { id: '10000000-0000-4000-8000-000000000002', email: 'today@example.test', name: 'Richmond Test' },
      session: { id: 'today-session', expiresAt: '2099-01-01T00:00:00Z' },
    },
  }));
  let records = [];
  await page.route('**/api/records*', route => route.fulfill({ json: { records, next: null } }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
  await expect(page.locator('.save-status')).toHaveText('Synced');
  await expect(page.locator('.today-greeting')).toHaveText('Good morning, Richmond.');
  await expect(page.getByRole('heading', { name: 'No open tasks.', exact: true })).toBeVisible();
  await expect(page.locator('.today-spending')).toContainText('₱0.00');
  const row = (type, id, patch) => ({ id, version: 1, deleted: false, created_at: '2026-10-11T00:00:00Z', updated_at: '2026-10-11T00:00:00Z',
    data: { ...blankRecord(type, '2026-10-11'), title: id, ...patch } });
  records = [row('event', '20000000-0000-4000-8000-000000000001', { title: 'Morning review', start: '09:00', end: '09:45', location: 'Studio' }),
    row('reminder', '20000000-0000-4000-8000-000000000002', { title: 'Call back', start: '10:15' }),
    row('event', '20000000-0000-4000-8000-000000000003', { title: 'All-day commitment', allDay: true })];
  await page.reload();
  await expect(page.locator('.today-spotlight-caption')).toContainText('HAPPENING NOW');
  await expect(page.locator('.today-spotlight')).toContainText('Morning review');
  await expect(page.locator('.today-agenda-item')).toHaveCount(3);
  await expect(page.locator('.today-agenda-item').first()).toContainText('All day');
  await expect(page.locator('.today-agenda-item').filter({ hasText: 'Call back' })).toContainText('10:15 AM');
  await expect(page.locator('.today-agenda-item').filter({ hasText: 'Call back' })).toHaveAttribute('href', '/record/20000000-0000-4000-8000-000000000002?day=2026-10-11');
  records.push(row('task', '20000000-0000-4000-8000-000000000004', { title: 'Long'.repeat(40) }),
    row('expense', '20000000-0000-4000-8000-000000000005', { amountCents: 99999999999 }),
    row('note', '20000000-0000-4000-8000-000000000006', { title: 'Long'.repeat(40), body: 'Thought'.repeat(500) }));
  await page.setViewportSize({ width: 360, height: 844 });
  await page.reload();
  await expect(page.locator('.today-spending')).toContainText('₱999,999,999.99');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
