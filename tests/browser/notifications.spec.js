import { test, expect } from '@playwright/test';

async function settings(page) {
  // Seed the existing local preview in this isolated test context. Production
  // correctly hides the development-only preview button when Auth is configured.
  await page.addInitScript(() => sessionStorage.setItem('daymargin-preview', 'true'));
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
}
async function mockNotifications(page, permission = 'default') {
  await page.addInitScript(initialPermission => {
    window.notificationCalls = 0; window.testNotifications = [];
    const notifications = { permission: initialPermission, requestPermission: async () => {
      window.notificationCalls++; notifications.permission = 'granted'; return 'granted';
    } };
    Object.defineProperty(window, 'Notification', { configurable: true, value: notifications });
    const registration = { active: {}, showNotification: async (title, options) => { window.testNotifications.push({ title, options }); } };
    // Only notification-specific methods are mocked; PWA registration remains real.
    Object.defineProperty(navigator.serviceWorker, 'getRegistration', { configurable: true, value: async () => registration });
  }, permission);
}
test('unsupported browser retains an actionable setup control and explanation', async ({ page }) => {
  await page.addInitScript(() => { delete window.Notification; });
  await settings(page);
  const setup = page.getByRole('button', { name: 'Notification setup', exact: true });
  await expect(setup).toBeEnabled();
  await setup.click();
  await expect(page.getByRole('dialog')).toContainText('This browser does not expose device notifications');
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
test('production PWA can issue a notification through its actual service worker', async ({ page, context }) => {
  const worker = await page.request.get('/sw.js');
  test.skip(!worker.ok() || !worker.headers()['content-type']?.includes('javascript'), 'Requires a built PWA; development intentionally disables its service worker.');
  const origin = new URL(test.info().project.use.baseURL).origin;
  await context.grantPermissions(['notifications'], { origin });
  await settings(page);
  await page.getByRole('button', { name: 'Send test notification', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Test notification sent' })).toBeVisible();
  const notifications = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const displayed = await registration.getNotifications({ tag: 'daymargin-test' });
    const values = displayed.map(n => ({ title: n.title, body: n.body, url: n.data.url }));
    displayed.forEach(n => n.close());
    return values;
  });
  expect(notifications).toEqual([{ title: 'Daymargin', body: 'Your test notification is ready. Your saved entries stay private.', url: '/settings' }]);
});
test('explicit enable action requests permission once and permits a private test notification', async ({ page }) => {
  await mockNotifications(page);
  await settings(page);
  await page.getByRole('button', { name: 'Enable notifications', exact: true }).click();
  expect(await page.evaluate(() => window.notificationCalls)).toBe(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Enable notifications', exact: true }).click();
  await expect(page.getByText('Permission granted', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.notificationCalls)).toBe(1);
  await page.getByRole('button', { name: 'Send test notification', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Test notification sent' })).toBeVisible();
  expect(await page.evaluate(() => window.testNotifications.length)).toBe(1);
  await expect(page.getByText('Scheduled notification delivery is not connected yet.', { exact: false })).toBeVisible();
});
test('blocked permission offers settings help and refreshes when the user returns', async ({ page }) => {
  await mockNotifications(page, 'denied');
  await settings(page);
  await page.getByRole('button', { name: 'Notification setup', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('browser settings');
  await page.getByRole('button', { name: 'Got it' }).click();
  expect(await page.evaluate(() => window.notificationCalls)).toBe(0);
  await page.evaluate(() => { Notification.permission = 'granted'; window.dispatchEvent(new Event('focus')); });
  await expect(page.getByRole('button', { name: 'Send test notification', exact: true })).toBeVisible();
});
test('iPhone browser explains installation instead of displaying a disabled control', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'iPhone' });
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: false });
  });
  await settings(page);
  await page.getByRole('button', { name: 'Notification setup', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Share → Add to Home Screen');
});
