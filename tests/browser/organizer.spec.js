import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => { await page.goto('/'); await page.getByRole('button', { name: /Explore Daymargin|Open development preview/ }).click(); await expect(page.getByRole('heading', { name: 'A little room for today.' })).toBeVisible(); });
test('mobile capture, editing, search, deletion/undo, and reload persistence', async ({ page }) => {
  await page.getByRole('button', { name: 'Add an entry', exact: true }).click();
  await page.getByRole('link', { name: 'Note An idea worth keeping' }).click();
  await page.getByLabel('Title (optional)').fill('Browser test note');
  await page.getByLabel('Your note', { exact: true }).fill('A persistent thought.');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Browser test note' })).toBeVisible();
  await page.reload(); await expect(page.getByText('A persistent thought.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Edit entry' }).click(); await page.getByLabel('Your note', { exact: true }).fill('A revised persistent thought.');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click(); await page.getByRole('button', { name: 'Delete entry', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search saved entries' }).fill('Browser test note');
  await page.getByRole('link', { name: /Browser test note A revised/ }).click();
  await expect(page.getByText('A revised persistent thought.', { exact: true })).toBeVisible();
});
test('expense totals update without decimal drift', async ({ page }) => {
  await page.goto('/new/expense'); await page.getByLabel('Amount in Philippine pesos').fill('0.10');
  await page.getByLabel('Description (optional)').fill('Test expense'); await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByRole('heading', { name: '₱0.10' })).toBeVisible();
  await page.goto('/library?filter=expenses&period=today');
  await expect(page.locator('.expense-total>strong')).toHaveText('₱215.10');
});
test('draft restore, dark mode, reduced motion, and unavailable Finn preserve input', async ({ page }) => {
  await page.goto('/new/note'); await page.getByLabel('Your note', { exact: true }).fill('Unsaved draft');
  await expect(page.getByText('Draft saved on this device', { exact: true })).toBeVisible(); await page.goto('/'); await page.goto('/new/note');
  await expect(page.getByLabel('Your note', { exact: true })).toHaveValue('Unsaved draft');
  await page.getByRole('textbox', { name: 'Your note', exact: true }).fill('Draft survives immediate navigation');
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Today', exact: true }).click();
  await page.goto('/new/note'); await expect(page.getByRole('textbox', { name: 'Your note', exact: true })).toHaveValue('Draft survives immediate navigation');
  await page.goto('/settings'); await page.getByRole('button', { name: 'Dark', exact: true }).click(); await page.getByLabel('Reduce motion').check();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark'); await expect(page.locator('html')).toHaveAttribute('data-reduced-motion','true');
  await page.goto('/finn'); await page.getByRole('button', { name: 'Help me plan tomorrow.' }).click(); await page.getByRole('button', { name: 'Send question to Finn' }).click();
  await expect(page.getByRole('textbox', { name: 'Ask Finn a question' })).toHaveValue('Help me plan tomorrow.');
  await expect(page.getByRole('alert')).toContainText('not connected');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
test('wide and narrow layouts have no horizontal overflow or runtime errors', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  for (const width of [360,390,768,1440]) { await page.setViewportSize({ width, height: 900 }); for (const route of ['/', '/calendar','/library?filter=expenses','/finn','/settings']) { await page.goto(route); await expect(page.locator('h1')).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true); } }
  expect(errors).toEqual([]);
});
