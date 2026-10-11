import { cloudConfigured, cloudRequest } from './cloud.js';
export function notificationSupport() {
  if (!window.isSecureContext) return { available: false, message: 'Open Daymargin using its secure HTTPS address to set up notifications.' };
  if (window.top !== window.self) return { available: false, message: 'Open Daymargin directly in a browser tab. Notifications cannot be enabled from this embedded preview.' };
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installed = navigator.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches;
  if (ios && !installed) return { available: false, message: 'On iPhone or iPad, open Daymargin in Safari, choose Share → Add to Home Screen, then open the installed app and enable notifications. A supported iOS or iPadOS version is required (16.4 or later).' };
  if (typeof window.Notification?.requestPermission !== 'function' || !('serviceWorker' in navigator)) {
    return { available: false, message: 'This browser does not expose device notifications. Open Daymargin directly in a current Chrome, Edge, Firefox or Safari browser, outside an in-app browser or private window. Your reminders stay saved.' };
  }
  return { available: true, message: '' };
}
export function notificationStatus() {
  if (!notificationSupport().available) return 'unavailable';
  return window.Notification.permission;
}
export function notificationHelp() {
  const support = notificationSupport();
  if (!support.available) return support.message;
  if (notificationStatus() === 'denied') return 'Notifications are blocked. Open this site’s permissions in your browser settings, allow notifications, then return here. On an installed app, also check device notification settings.';
  return 'Choose Enable notifications, then Allow in your browser. If no pop-up appears, check the notification icon beside the address bar or this site’s permissions in browser settings.';
}

async function deviceRegistration() {
  // Use this app's scope, rather than another registration on the same origin.
  const current = await navigator.serviceWorker.getRegistration(window.location.href);
  if (current?.active) return current;
  let timer;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Device notification setup is not ready. Reload Daymargin and retry.')), 8000); }),
    ]);
  } finally { clearTimeout(timer); }
}
function decodeKey(value) {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')), c => c.charCodeAt(0));
}
export async function enableNotifications() {
  if (notificationStatus() === 'unavailable' || notificationStatus() === 'denied') return { message: notificationHelp() };
  // Keep the native request before any asynchronous setup to preserve the tap/click.
  let permission;
  try { permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission(); }
  catch { return { message: `The browser could not open the permission prompt. ${notificationHelp()}` }; }
  if (permission === 'denied') return { message: notificationHelp() };
  if (permission !== 'granted') return { message: 'Permission was not granted. Check the notification icon beside your browser’s address bar or the site’s permissions, then retry. Your reminders stay saved.' };
  const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!cloudConfigured || !vapid) return { message: 'Permission granted. Use Send test notification to check this device. Automatic scheduled reminders are not connected yet.' };
  const registration = await deviceRegistration();
  if (!registration.pushManager) return { message: 'Permission granted, but this browser cannot receive Web Push. You can still try a test notification.' };
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(vapid) });
  await cloudRequest('/api/push', { method: 'POST', body: JSON.stringify(subscription.toJSON()) });
  return { message: 'This device is connected. Scheduled delivery must also be enabled by the service.' };
}

export async function sendTestNotification() {
  if (notificationStatus() !== 'granted') return { message: notificationHelp() };
  const registration = await deviceRegistration();
  if (typeof registration.showNotification !== 'function') return { message: 'This browser cannot display device notifications. Your reminders stay saved.' };
  await registration.showNotification('Daymargin', {
    body: 'Your test notification is ready. Your saved entries stay private.',
    icon: '/icon-192.png', tag: 'daymargin-test', data: { url: '/settings' },
  });
  return { message: 'Test notification sent to this device. If it does not appear, check browser and device notification settings or Do Not Disturb. Automatic scheduled reminders are not connected yet.' };
}
