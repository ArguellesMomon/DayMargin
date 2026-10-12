import { test, expect } from '@playwright/test';

async function preview(page) {
  await page.clock.setFixedTime(new Date('2026-10-12T01:30:00Z'));
  await page.addInitScript(() => sessionStorage.setItem('daymargin-preview', 'true'));
  await page.route('**/api/auth/**', route => route.fulfill({ json: { user: null, session: null } }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
}

test('Top-bar theme toggle follows device mode, persists its choice and keeps Settings in sync', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await preview(page);
  await expect(page.getByRole('button', { name: 'Switch to light mode', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#fafaf8');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Switch to dark mode', exact: true })).toBeVisible();
  await page.goto('/settings');
  await expect(page.getByRole('button', { name: 'Light', exact: true })).toHaveClass(/selected/);
  await page.getByRole('button', { name: 'Device', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Switch to light mode', exact: true })).toBeVisible();
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.getByRole('button', { name: 'Switch to dark mode', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#101012');
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ['/', '/calendar', '/new/expense']) {
      await page.goto(route);
      await expect(page.getByRole('button', { name: 'Switch to light mode', exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

test('Expense dropdown shows all categories and preserves built-in and custom selections through save/edit/reload', async ({ page }) => {
  await preview(page);
  await page.goto('/new/expense');
  const category = page.getByLabel('Category', { exact: true });
  await expect(category.locator('option')).toHaveText(['Food', 'Transport', 'Bills', 'Shopping', 'Load/data', 'Other', 'Custom category']);
  await category.selectOption('Transport');
  await page.getByLabel('Amount in Philippine pesos').fill('72.50');
  await page.getByLabel('Description (optional)').fill('Train ride');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.locator('.record-metadata')).toContainText('Transport');
  await page.getByRole('link', { name: 'Edit entry', exact: true }).click();
  await expect(category).toHaveValue('Transport');
  await category.selectOption('__custom__');
  await page.getByLabel('Custom category', { exact: true }).fill('Pet care');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.locator('.record-metadata')).toContainText('Pet care');
  await page.reload();
  await page.getByRole('link', { name: 'Edit entry', exact: true }).click();
  await expect(category).toHaveValue('__custom__');
  await expect(page.getByLabel('Custom category', { exact: true })).toHaveValue('Pet care');
  await category.selectOption('Food');
  await expect(page.getByLabel('Custom category', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.locator('.record-metadata')).toContainText('Food');
});
