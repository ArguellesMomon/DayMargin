import { test, expect } from '@playwright/test';
test.skip(process.env.DAYMARGIN_CONNECTED_TESTS !== 'true', 'Requires an explicitly selected Neon test branch.');
test.use({ trace: 'off', screenshot: 'off' });
test('real Neon signup, sync across devices, isolation, offline queue, conflicts, signout and deletion', async ({ browser, baseURL }) => {
  test.setTimeout(180000);
  const password = `Test-${crypto.randomUUID()}-Aa1`;
  const email = `daymargin-${crypto.randomUUID()}@example.test`;
  const first = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await first.newPage();
  const second = await browser.newContext({ viewport: { width: 390, height: 844 } }); const another = await second.newPage();
  const otherAccount = await browser.newContext({ viewport: { width: 390, height: 844 } }); const other = await otherAccount.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const origin = baseURL || 'http://127.0.0.1:5174';
  const signUp = async (target, address) => {
    await target.goto(`${origin}/auth/signup`);
    await target.getByLabel('Your name').fill('Connection test');
    await target.getByLabel('Email', { exact: true }).fill(address);
    await target.getByLabel('Password', { exact: true }).fill(password);
    await target.getByRole('checkbox').check();
    await target.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(target.getByRole('heading', { name: 'Setup', exact: true })).toBeVisible({ timeout: 30000 });
    await target.getByRole('button', { name: 'Continue to Today' }).click();
    await expect(target.locator('.save-status')).toHaveText('Synced', { timeout: 30000 });
  };
  const signIn = async target => {
    await target.goto(`${origin}/auth/signin`);
    await target.getByLabel('Email', { exact: true }).fill(email);
    await target.getByLabel('Password', { exact: true }).fill(password);
    await target.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(target.locator('.save-status')).toHaveText('Synced', { timeout: 30000 });
  };
  const makeNote = async (target, text) => {
    await target.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Today', exact: true }).click(); await target.getByRole('button', { name: 'Add an entry', exact: true }).click(); await target.getByRole('link', { name: 'Note', exact: true }).click();
    await target.getByLabel('Title (optional)').fill(text);
    await target.getByLabel('Your note', { exact: true }).fill('Private connected record.');
    await target.getByRole('button', { name: 'Save entry', exact: true }).click();
    await expect(target.getByRole('heading', { name: text })).toBeVisible();
  };
  const deleteOwnAccount = async target => {
    await target.goto(`${origin}/settings`);
    await target.getByRole('button', { name: 'Delete account and records' }).click();
    await target.getByLabel('Confirm your password').fill(password);
    await target.getByRole('button', { name: 'Delete account', exact: true }).click();
    await expect(target.getByRole('heading', { name: 'Your day, kept in order.' })).toBeVisible({ timeout: 30000 });
  };
  try {
    console.log('Checking signup'); await signUp(page, email); console.log('Signup and initial sync passed');
    await makeNote(page, 'Cloud-only test note');
    await expect(page.locator('.save-status')).toHaveText('Synced', { timeout: 30000 });
    const recordUrl = page.url();
    console.log('Checking second-device sign-in'); await signIn(another); await another.goto(recordUrl);
    await expect(another.getByRole('heading', { name: 'Cloud-only test note' })).toBeVisible();
    const unauthenticated = await other.request.get(`${origin}/api/records`); expect(unauthenticated.status()).toBe(401);
    await signUp(other, `daymargin-${crypto.randomUUID()}@example.test`);
    await other.goto(recordUrl);
    await expect(other.getByRole('heading', { name: 'This entry is no longer available.' })).toBeVisible();
    console.log('Checking offline queue'); await first.setOffline(true); await makeNote(page, 'Queued offline note');
    await expect(page.locator('.save-status')).toHaveText('Waiting to sync');
    await expect(page.getByRole('heading', { name: 'Queued offline note' })).toBeVisible();
    await first.setOffline(false);
    await expect(page.locator('.save-status')).toHaveText('Synced', { timeout: 30000 });
    await another.goto(`${origin}/settings`); await another.getByRole('button', { name: 'Sync now' }).click();
    await expect(another.locator('.save-status')).toHaveText('Synced', { timeout: 30000 });
    await another.goto(`${origin}/library`); await expect(another.getByRole('link', { name: /Queued offline note/ })).toBeVisible();
    // Two devices edit the same version; reconnect preserves a visible conflict.
    await page.goto(recordUrl); await first.setOffline(true); await page.getByRole('link', { name: 'Edit entry' }).click();
    await page.getByLabel('Your note', { exact: true }).fill('Offline conflicting edit'); await page.getByRole('button', { name: 'Save entry', exact: true }).click();
    await another.goto(recordUrl); await another.getByRole('link', { name: 'Edit entry' }).click();
    await another.getByLabel('Your note', { exact: true }).fill('New cloud version'); await another.getByRole('button', { name: 'Save entry', exact: true }).click();
    await expect(another.locator('.save-status')).toHaveText('Synced', { timeout: 30000 });
    await first.setOffline(false); await expect(page.locator('.save-status')).toHaveText('Review sync conflicts', { timeout: 30000 });
    await page.goto(`${origin}/settings`); await page.getByRole('button', { name: 'Use cloud version' }).click();
    await expect(page.locator('.save-status')).toHaveText('Synced', { timeout: 30000 });
    await page.getByRole('button', { name: 'Sign out on this device' }).click();
    await expect(page.getByRole('heading', { name: 'Your day, kept in order.' })).toBeVisible();
    await signIn(page); await page.goto(recordUrl); await expect(page.getByText('New cloud version', { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
    console.log('Checking deletion'); await deleteOwnAccount(page); await deleteOwnAccount(other);
    const tokenRequest = await another.evaluate(async () => {
      const { cloudRequest } = await import('/src/lib/cloud.js');
      try { await cloudRequest('/api/records'); return 'allowed'; } catch { return 'denied'; }
    }); expect(tokenRequest).toBe('denied');
  } finally { await Promise.all([first.close(), second.close(), otherAccount.close()]); }
});
