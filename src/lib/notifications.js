import { cloudConfigured, cloudRequest } from './cloud.js';
export function notificationStatus() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unavailable';
  return Notification.permission;
}
function decodeKey(value) {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')), c => c.charCodeAt(0));
}
export async function enableNotifications() {
  if (notificationStatus() === 'unavailable') return { message: 'Device notifications are unavailable in this browser. Your reminders remain in Daymargin.' };
  if (Notification.permission === 'denied') return { message: 'Notifications are blocked. You can allow them in your browser or device settings.' };
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return { message: 'Notifications are not enabled. Your reminders are still saved.' };
  const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!cloudConfigured || !vapid) return { message: 'Permission granted. Scheduled device delivery is not connected yet.' };
  const registrations = await navigator.serviceWorker.getRegistrations();
  const registration = registrations.find(r => r.active);
  if (!registration) throw new Error('Install or reopen the built app, then retry notification setup.');
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(vapid) });
  await cloudRequest('/api/push', { method: 'POST', body: JSON.stringify(subscription.toJSON()) });
  return { message: 'This device is connected. Scheduled delivery must also be enabled by the service.' };
}
