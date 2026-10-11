import { test, expect } from '@playwright/test';

test('Finn preserves a rate-limited question, blocks duplicate sends, and permits explicit retry after cooldown', async ({ page }) => {
  await page.route('**/api/auth/**', route => {
    const token = new URL(route.request().url()).pathname.endsWith('/token');
    return route.fulfill({ json: token ? { token: 'isolated-test-token' } : {
      user: { id: '10000000-0000-4000-8000-000000000001', email: 'finn-test@example.test', name: 'Finn test' },
      session: { id: 'test-session', expiresAt: '2099-01-01T00:00:00Z' },
    } });
  });
  await page.route('**/api/records*', route => route.fulfill({ json: { records: [], next: null } }));
  let requests = 0;
  await page.route('**/api/finn', route => {
    requests++;
    return requests === 1
      ? route.fulfill({ status: 429, headers: { 'Retry-After': '2' }, json: { error: 'Finn needs a short pause. Your question is still here.' } })
      : route.fulfill({ json: { answer: 'There are no saved entries yet.', sources: [], action: null } });
  });
  await page.goto('/finn');
  await expect(page.getByRole('heading', { name: 'Finn', exact: true })).toBeVisible();
  await expect(page.locator('.save-status')).toHaveText('Synced');
  await page.clock.install();
  const input = page.getByRole('textbox', { name: 'Ask Finn a question' });
  await input.fill('What needs my attention today?');
  const send = page.getByRole('button', { name: 'Send question to Finn' });
  await send.click();
  await expect(page.getByRole('alert')).toContainText('Your question is still here');
  await expect(input).toHaveValue('What needs my attention today?');
  await expect(page.getByRole('button', { name: 'Retry in 2s' })).toBeDisabled();
  await expect(send).toBeDisabled();
  await input.press('Enter');
  expect(requests).toBe(1);
  await page.clock.runFor(2100);
  const retry = page.getByRole('button', { name: 'Retry', exact: true });
  await expect(retry).toBeEnabled();
  expect(requests).toBe(1); // no automatic provider calls after the timer
  await retry.click();
  await expect(page.getByText('There are no saved entries yet.', { exact: true })).toBeVisible();
  await expect(input).toHaveValue('');
  expect(requests).toBe(2);
});
