import { afterEach, beforeEach, expect, test, vi } from 'vitest';
vi.mock('../src/lib/cloud.js', () => ({ cloudConfigured: false, cloudRequest: vi.fn() }));
import { enableNotifications, notificationHelp, notificationStatus, sendTestNotification } from '../src/lib/notifications.js';

let notification, device, registration, browser;
beforeEach(() => {
  notification = { permission: 'default', requestPermission: vi.fn(async () => { notification.permission = 'granted'; return 'granted'; }) };
  registration = { active: {}, showNotification: vi.fn(async () => {}) };
  device = { userAgent: 'Desktop browser', platform: 'Win32', maxTouchPoints: 0,
    serviceWorker: { getRegistration: vi.fn(async () => registration), ready: Promise.resolve(registration) } };
  browser = { isSecureContext: true, Notification: notification, location: { href: 'https://daymargin.example/settings' }, matchMedia: () => ({ matches: false }) };
  browser.top = browser; browser.self = browser;
  vi.stubGlobal('window', browser); vi.stubGlobal('Notification', notification); vi.stubGlobal('navigator', device);
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

test('requests native permission immediately from the action before asynchronous delivery setup', async () => {
  const pending = enableNotifications();
  expect(notification.requestPermission).toHaveBeenCalledOnce();
  expect(await pending).toEqual({ message: expect.stringContaining('Permission granted') });
  expect(notificationStatus()).toBe('granted');
});
test('unavailable browser offers a next step instead of attempting a nonexistent API', async () => {
  delete browser.Notification;
  expect(notificationStatus()).toBe('unavailable');
  expect((await enableNotifications()).message).toContain('current Chrome');
  expect(notification.requestPermission).not.toHaveBeenCalled();
});
test('iPhone and iPad need Home Screen installation even if partial APIs exist', async () => {
  device.userAgent = 'iPhone';
  expect(notificationHelp()).toContain('Add to Home Screen');
  expect(notificationStatus()).toBe('unavailable');
  device.standalone = true;
  expect(notificationStatus()).toBe('default');
  device.standalone = false; device.userAgent = 'Desktop Safari'; device.platform = 'MacIntel'; device.maxTouchPoints = 5;
  expect(notificationHelp()).toContain('Add to Home Screen');
});
test('insecure or embedded views explain the correct place to enable notifications', () => {
  browser.isSecureContext = false;
  expect(notificationHelp()).toContain('HTTPS');
  browser.isSecureContext = true; browser.top = {};
  expect(notificationHelp()).toContain('directly in a browser tab');
});
test('blocked permission does not repeatedly request permission', async () => {
  notification.permission = 'denied';
  expect((await enableNotifications()).message).toContain('browser settings');
  expect(notification.requestPermission).not.toHaveBeenCalled();
});
test('dismissed permission and suppressed prompt produce clear retry guidance', async () => {
  notification.requestPermission.mockResolvedValue('default');
  expect((await enableNotifications()).message).toContain('Permission was not granted');
  notification.requestPermission.mockRejectedValue(new Error('Browser rejected request'));
  expect((await enableNotifications()).message).toContain('could not open the permission prompt');
});
test('granted permission skips the native prompt and does not claim scheduled delivery', async () => {
  notification.permission = 'granted';
  expect((await enableNotifications()).message).toContain('not connected yet');
  expect(notification.requestPermission).not.toHaveBeenCalled();
});
test('test notifications use the scoped service worker with generic private content', async () => {
  notification.permission = 'granted';
  expect((await sendTestNotification()).message).toContain('Test notification sent');
  expect(device.serviceWorker.getRegistration).toHaveBeenCalledWith(browser.location.href);
  expect(registration.showNotification).toHaveBeenCalledWith('Daymargin', expect.objectContaining({
    body: 'Your test notification is ready. Your saved entries stay private.', data: { url: '/settings' },
  }));
  expect(notification.requestPermission).not.toHaveBeenCalled();
});
test('test delivery cannot ask for permission or send without explicit permission', async () => {
  await sendTestNotification();
  expect(registration.showNotification).not.toHaveBeenCalled();
  expect(notification.requestPermission).not.toHaveBeenCalled();
});
test('slow service-worker activation waits for readiness; missing activation times out', async () => {
  notification.permission = 'granted';
  device.serviceWorker.getRegistration.mockResolvedValue(undefined);
  await sendTestNotification();
  expect(registration.showNotification).toHaveBeenCalledOnce();
  vi.useFakeTimers();
  device.serviceWorker.ready = new Promise(() => {});
  const pending = sendTestNotification();
  const assertion = expect(pending).rejects.toThrow('Reload Daymargin and retry');
  await vi.advanceTimersByTimeAsync(8000);
  await assertion;
});
