import { test, expect } from '@playwright/test';

test('Finn permits immediate explicit retry and follow-ups without a countdown or page reload', async ({ page }) => {
  await page.route('**/api/auth/**', route => {
    const token = new URL(route.request().url()).pathname.endsWith('/token');
    return route.fulfill({ json: token ? { token: 'isolated-test-token' } : {
      user: { id: '10000000-0000-4000-8000-000000000001', email: 'finn-test@example.test', name: 'Finn test' },
      session: { id: 'test-session', expiresAt: '2099-01-01T00:00:00Z' },
    } });
  });
  await page.route('**/api/records*', route => route.fulfill({ json: { records: [], next: null } }));
  let requests = 0;
  const bodies = [];
  await page.route('**/api/finn', route => {
    requests++;
    bodies.push(route.request().postDataJSON());
    return requests === 1
      ? route.fulfill({ status: 429, headers: { 'Retry-After': '60' }, json: { error: 'The free AI provider is at capacity. Your question is still here.' } })
      : route.fulfill({ json: { answer: 'You have got this, bro. Start small.', sources: [], action: null, memory: 'isolated-memory-receipt' } });
  });
  await page.goto('/finn');
  await expect(page.getByRole('heading', { name: 'Finn', exact: true })).toBeVisible();
  await expect(page.locator('.save-status')).toHaveText('Synced');
  const input = page.getByRole('textbox', { name: 'Ask Finn a question' });
  await input.fill('I need some motivation.');
  const send = page.getByRole('button', { name: 'Send question to Finn' });
  await send.click();
  await expect(page.getByRole('alert')).toContainText('Your question is still here');
  await expect(input).toHaveValue('I need some motivation.');
  await expect(send).toBeEnabled();
  const retry = page.getByRole('button', { name: 'Retry', exact: true });
  await expect(retry).toBeEnabled();
  expect(requests).toBe(1); // no automatic provider calls
  await retry.click();
  await expect(page.getByText('You have got this, bro. Start small.', { exact: true })).toBeVisible();
  await expect(page.locator('.chat-age')).toHaveCount(0); // casual chat does not claim saved-entry sources
  await expect(input).toHaveValue('');
  expect(requests).toBe(2);
  await input.fill('How small?');
  await input.press('Enter');
  await expect(input).toHaveValue('');
  expect(requests).toBe(3);
  expect(bodies[2]).toEqual({ question: 'How small?', history: ['isolated-memory-receipt'] });
  await page.getByRole('button', { name: 'Start a new chat' }).click();
  await page.getByRole('button', { name: 'Start fresh' }).click();
  await input.fill('Hello again.'); await send.click();
  await expect(input).toHaveValue('');
  expect(bodies[3].history).toEqual([]);
});
