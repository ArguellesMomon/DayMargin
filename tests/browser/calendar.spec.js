import { test, expect } from '@playwright/test';
import { blankRecord } from '../../src/lib/domain.js';

async function preview(page) {
  await page.clock.setFixedTime(new Date('2026-10-11T01:30:00Z'));
  await page.addInitScript(() => sessionStorage.setItem('daymargin-preview', 'true'));
  await page.route('**/api/auth/**', route => route.fulfill({ json: { user: null, session: null } }));
  await page.goto('/calendar');
  await expect(page.getByRole('heading', { name: 'Calendar', exact: true })).toBeVisible();
}

test('Calendar date navigation, keyboard month selection, capture and completion preserve the selected day', async ({ page }) => {
  await preview(page);
  await page.getByRole('button', { name: 'Next week', exact: true }).click();
  await expect(page).toHaveURL(/date=2026-10-18/);
  await page.getByRole('button', { name: 'Previous week', exact: true }).click();
  await expect(page).toHaveURL(/date=2026-10-11/);
  await page.locator('.cal-week').getByRole('button', { name: /Saturday, October 10, 2026/ }).click();
  await expect(page).toHaveURL(/date=2026-10-10/);
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await page.getByRole('button', { name: 'Complete Send the project proposal', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reopen Send the project proposal', exact: true })).toBeVisible();
  await expect(page.locator('.cal-day-summary')).toContainText('1 due');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Complete Send the project proposal', exact: true })).toBeVisible();
  await expect(page.locator('.cal-day-summary')).toContainText('2 due');
  await page.locator('.cal-month-button').click();
  const dialog = page.getByRole('dialog', { name: 'Choose a date' });
  await dialog.locator('[data-day="2026-10-11"]').focus();
  await page.keyboard.press('PageDown');
  await expect(dialog.locator('[data-day="2026-11-11"]')).toBeFocused();
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/date=2026-11-12/);
  await page.locator('.cal-month-button').click();
  await dialog.getByRole('button', { name: 'Next month', exact: true }).click();
  await dialog.locator('[data-day="2026-12-31"]').click();
  await expect(page).toHaveURL(/date=2026-12-31/);
  await page.getByRole('button', { name: 'Add entry', exact: true }).first().click();
  await page.getByRole('dialog').getByRole('link', { name: 'Event', exact: true }).click();
  await expect(page.getByLabel('Date', { exact: true })).toHaveValue('2026-12-31');
  await page.getByLabel('Title', { exact: true }).fill('A year-end walk');
  await page.getByLabel('All-day event').check();
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await page.getByRole('link', { name: 'Back to calendar', exact: true }).click();
  await expect(page).toHaveURL(/date=2026-12-31/);
  await expect(page.locator('.cal-event').filter({ hasText: 'A year-end walk' })).toContainText('All day');
  await page.locator('.cal-month-button').click();
  await dialog.getByLabel('Jump to date').fill('2027-01-01');
  await expect(page).toHaveURL(/date=2027-01-01/);
  await page.locator('.cal-month-button').click(); await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.cal-month-button')).toBeFocused();
});

test('Calendar uses recurring instances, actual overlaps and source-linked reminders', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-11T01:30:00Z'));
  await page.route('**/api/auth/**', route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/token') ? { token: 'isolated-test-token' } : {
    user: { id: '10000000-0000-4000-8000-000000000003', email: 'calendar@example.test', name: 'Calendar Test' }, session: { id: 'calendar-session', expiresAt: '2099-01-01T00:00:00Z' },
  } }));
  const row = (type, id, patch) => ({ id, version: 1, deleted: false, created_at: '2026-10-11T00:00:00Z', updated_at: '2026-10-11T00:00:00Z', data: { ...blankRecord(type, '2026-10-11'), title: id, ...patch } });
  let records = [row('event', '30000000-0000-4000-8000-000000000001', { title: 'Weekly review', date: '2026-10-04', recurrence: 'weekly', start: '09:00', end: '10:00', exceptions: { '2026-10-11': { changes: { start: '11:00', end: '12:00' } } } }),
    row('event', '30000000-0000-4000-8000-000000000002', { title: 'Design session', start: '11:30', end: '12:30', location: 'Long'.repeat(45) }),
    row('event', '30000000-0000-4000-8000-000000000003', { title: 'All-day outing', allDay: true }),
    row('event', '30000000-0000-4000-8000-000000000004', { title: 'Tomorrow’s plan', date: '2026-10-12', start: '08:00', end: '09:00', reminderAt: '2026-10-11T17:00' }),
    row('reminder', '30000000-0000-4000-8000-000000000005', { title: 'Check in', start: '16:15' }),
    row('task', '30000000-0000-4000-8000-000000000006', { title: 'Long'.repeat(40) })];
  await page.route('**/api/records*', route => route.fulfill({ json: { records, next: null } }));
  await page.goto('/calendar?date=2026-10-11');
  await expect(page.locator('.save-status')).toHaveText('Synced');
  await expect(page.locator('.cal-event')).toHaveCount(3);
  await expect(page.locator('.cal-event').first()).toContainText('All-day outing');
  await expect(page.locator('.cal-event').filter({ hasText: 'Weekly review' })).toContainText('11:00 AM');
  await expect(page.locator('.cal-overlap')).toHaveCount(2);
  await expect(page.locator('.cal-due').getByText('Check in', { exact: true })).toBeVisible();
  const attached = page.locator('.cal-due .entry-content').filter({ hasText: 'Tomorrow’s plan' });
  await expect(attached).toContainText('5:00 PM');
  await expect(attached).toHaveAttribute('href', '/record/30000000-0000-4000-8000-000000000004?day=2026-10-12');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  records = []; await page.reload();
  await expect(page.getByRole('heading', { name: 'No events.', exact: true })).toBeVisible();
  await expect(page.locator('.cal-day-summary')).toHaveText('0 events0 due');
});

test('Calendar and the month picker stay readable in both themes on phones, tablets and desktop', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await preview(page);
  for (const theme of ['Light', 'Dark']) {
    await page.goto('/settings'); await page.getByRole('button', { name: theme, exact: true }).click();
    await page.getByLabel('Reduce motion').check();
    await page.goto('/calendar');
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.locator('.cal-month-button').click();
      const dialog = page.getByRole('dialog', { name: 'Choose a date' });
      await expect(dialog).toBeVisible();
      expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      await dialog.getByRole('button', { name: 'Close dialog' }).click();
    }
  }
  expect(errors).toEqual([]);
});

test('Entries captured outside Calendar share their creation, edits and deletion with Calendar', async ({ page }) => {
  await preview(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Add an entry', exact: true }).click();
  await page.getByRole('link', { name: 'Event', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('One shared appointment');
  await page.getByLabel('Date', { exact: true }).fill('2026-10-22');
  await page.getByLabel('All-day event').check();
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page).toHaveURL(/\/record\/[\w-]+$/);
  const detailUrl = page.url();
  await page.getByRole('link', { name: 'View on calendar', exact: true }).click();
  await expect(page).toHaveURL(/date=2026-10-22/);
  await expect(page.locator('.cal-event').filter({ hasText: 'One shared appointment' })).toHaveCount(1);
  await page.goto('/library?q=One%20shared%20appointment');
  await expect(page.locator('.entry-content')).toHaveCount(1);
  await page.locator('.entry-content').click();
  expect(page.url()).toBe(detailUrl);
  await page.getByRole('link', { name: 'Edit entry', exact: true }).click();
  await page.getByLabel('Date', { exact: true }).fill('2026-10-23');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await page.getByRole('link', { name: 'View on calendar', exact: true }).click();
  await expect(page).toHaveURL(/date=2026-10-23/);
  await expect(page.locator('.cal-event').filter({ hasText: 'One shared appointment' })).toHaveCount(1);
  await page.goto('/calendar?date=2026-10-22');
  await expect(page.locator('.cal-event').filter({ hasText: 'One shared appointment' })).toHaveCount(0);
  await page.goto('/calendar?date=2026-10-23');
  await page.locator('.cal-event').filter({ hasText: 'One shared appointment' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete entry', exact: true }).click();
  await expect(page).toHaveURL(/date=2026-10-23/);
  await expect(page.locator('.cal-event').filter({ hasText: 'One shared appointment' })).toHaveCount(0);
  await page.goto('/library?q=One%20shared%20appointment');
  await expect(page.locator('.entry-content')).toHaveCount(0);
});

test('Calendar-created reminders and tasks appear in Library and Today without losing the selected date', async ({ page }) => {
  await preview(page);
  // Avoid opening native permission UI; delivery setup is covered separately.
  await page.addInitScript(() => Object.defineProperty(window, 'Notification', { configurable: true, value: undefined }));
  await page.goto('/calendar?date=2026-10-11');
  await page.getByRole('link', { name: 'Add a reminder for this day', exact: true }).click();
  await expect(page.getByLabel('Date', { exact: true })).toHaveValue('2026-10-11');
  await expect(page.getByRole('button', { name: 'Back to calendar', exact: true })).toBeVisible();
  await page.getByLabel('Title', { exact: true }).fill('Shared reminder from Calendar');
  await page.getByLabel('Reminder time · Asia/Manila').fill('14:15');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await page.getByRole('link', { name: 'Back to calendar', exact: true }).click();
  await expect(page).toHaveURL(/date=2026-10-11/);
  await expect(page.locator('.cal-due .entry-content').filter({ hasText: 'Shared reminder from Calendar' })).toContainText('2:15 PM');
  await expect(page.locator('.cal-week').getByRole('button', { name: /Sunday, October 11, 2026/ })).toHaveAttribute('aria-label', /3 due/);
  await page.goto('/');
  await expect(page.locator('.today-agenda-item').filter({ hasText: 'Shared reminder from Calendar' })).toBeVisible();
  await page.goto('/library?q=Shared%20reminder%20from%20Calendar');
  await expect(page.locator('.entry-content')).toHaveCount(1);
  await page.locator('.entry-content').click();
  await page.getByRole('link', { name: 'Edit entry', exact: true }).click();
  await page.getByLabel('Reminder time · Asia/Manila').fill('15:45');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await page.getByRole('link', { name: 'View on calendar', exact: true }).click();
  await expect(page.locator('.cal-due .entry-content').filter({ hasText: 'Shared reminder from Calendar' })).toContainText('3:45 PM');
  await page.getByRole('link', { name: 'Add a task for this day', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('Shared task from Calendar');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await page.getByRole('link', { name: 'Back to calendar', exact: true }).click();
  await expect(page).toHaveURL(/date=2026-10-11/);
  await page.getByRole('button', { name: 'Complete Shared task from Calendar', exact: true }).click();
  await page.goto('/library?q=Shared%20task%20from%20Calendar');
  await expect(page.getByRole('button', { name: 'Reopen Shared task from Calendar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reopen Shared task from Calendar', exact: true }).click();
  await page.goto('/calendar?date=2026-10-11');
  await expect(page.getByRole('button', { name: 'Complete Shared task from Calendar', exact: true })).toBeVisible();
  await page.locator('.cal-due .entry-content').filter({ hasText: 'Shared reminder from Calendar' }).click();
  await page.getByRole('link', { name: 'Edit entry', exact: true }).click();
  await page.getByLabel('Date', { exact: true }).fill('2026-10-12');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await page.getByRole('link', { name: 'Back to calendar', exact: true }).click();
  await expect(page).toHaveURL(/date=2026-10-12/);
  await expect(page.locator('.cal-due .entry-content').filter({ hasText: 'Shared reminder from Calendar' })).toBeVisible();
  await page.goto('/calendar?date=2026-10-11');
  await expect(page.locator('.cal-due .entry-content').filter({ hasText: 'Shared reminder from Calendar' })).toHaveCount(0);
});

test('Calendar offers event/task/reminder capture and keeps its existing date picker', async ({ page }) => {
  await preview(page);
  await page.goto('/calendar?date=2026-11-12&view=month');
  await expect(page.getByRole('button', { name: 'Expand calendar', exact: true })).toHaveCount(0);
  await expect(page.locator('.cal-week')).toBeVisible();
  for (const [choice, route] of [['Event', 'event'], ['Task', 'task'], ['Reminder', 'reminder']]) {
    const trigger = page.getByRole('button', { name: 'Add entry', exact: true }).first();
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Add entry', exact: true });
    await expect(dialog.getByRole('link')).toHaveCount(3);
    await dialog.getByRole('link', { name: choice, exact: true }).click();
    await expect(page).toHaveURL(new RegExp('/new/' + route + '[?]day=2026-11-12'));
    await expect(page.getByLabel(route === 'task' ? 'Due date (optional)' : 'Date', { exact: true })).toHaveValue('2026-11-12');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page).toHaveURL(/calendar[?]date=2026-11-12$/);
  }
  await page.getByRole('button', { name: 'Add entry', exact: true }).first().click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Add entry', exact: true }).first()).toBeFocused();
  await page.locator('.cal-month-button').click();
  const picker = page.getByRole('dialog', { name: 'Choose a date' });
  await expect(picker.locator('.cal-month-grid button')).toHaveCount(42);
  await picker.getByLabel('Jump to date').fill('2026-12-31');
  await expect(page).toHaveURL(/date=2026-12-31$/);
});
