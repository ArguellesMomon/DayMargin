import { test, expect } from '@playwright/test';
test.use({ trace: 'off', screenshot: 'off' });
test('built PWA reloads and saves a note while offline', async ({ page, context, baseURL }) => {
  test.setTimeout(120000);
  test.skip(!baseURL.includes('4173'), 'Requires the production preview, because the dev service worker is disabled.');
  await page.goto('/'); await expect(page.locator('h1')).toBeVisible();
  const connected = await page.getByRole('link', { name: 'Get started' }).isVisible();
  test.skip(connected && process.env.DAYMARGIN_CONNECTED_TESTS !== 'true', 'Connected PWA testing creates a disposable account; enable it explicitly.');
  const password = `Test-${crypto.randomUUID()}-Aa1`;
  if (connected) {
    await page.getByRole('link', { name: 'Get started' }).click();
    await page.getByLabel('Your name').fill('PWA connection test');
    await page.getByLabel('Email', { exact: true }).fill(`pwa-${crypto.randomUUID()}@example.test`);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await page.getByRole('button', { name: 'Continue to Today' }).click();
    await expect(page.locator('.save-status')).toHaveText('Synced', { timeout: 30000 });
  } else await page.getByRole('button', { name: 'Explore Daymargin' }).click();
  await expect(page.getByRole('heading', { name: 'A little room for today.' })).toBeVisible();
  await page.evaluate(async () => { const registration = await navigator.serviceWorker.ready; if (!registration.active) throw new Error('No active service worker'); });
  await page.reload(); await expect(page.getByRole('heading', { name: 'A little room for today.' })).toBeVisible();
  await context.setOffline(true); await page.reload();
  await expect(page.getByText('Offline. Entries save on this device.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add an entry', exact: true }).click(); await page.getByRole('link', { name: 'Note An idea worth keeping' }).click();
  await page.getByLabel('Title (optional)').fill('Offline note'); await page.getByRole('textbox', { name: 'Your note', exact: true }).fill('Saved without a connection.');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Offline note' })).toBeVisible();
  await page.reload(); await expect(page.getByText('Saved without a connection.', { exact: true })).toBeVisible();
  await context.setOffline(false);
  if (connected) {
    await expect(page.locator('.save-status')).toHaveText('Synced', { timeout: 30000 });
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Delete account and records' }).click();
    await page.getByLabel('Confirm your password').fill('Incorrect-password');
    await page.getByRole('button', { name: 'Delete account', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Your password could not be confirmed');
    await page.getByLabel('Confirm your password').fill(password);
    await page.getByRole('button', { name: 'Delete account', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your day, kept in order.' })).toBeVisible({ timeout: 30000 });
  }
});
