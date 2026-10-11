import { createAuthClient } from '@neondatabase/auth';
import { BetterAuthVanillaAdapter } from '@neondatabase/auth/vanilla/adapters';

export const cloudConfigured = Boolean(import.meta.env.VITE_NEON_AUTH_URL);
// Same-origin cookies also work on browsers that block third-party auth cookies.
export const neonAuth = cloudConfigured ? createAuthClient(`${location.origin}/api/auth`, {
  adapter: BetterAuthVanillaAdapter({ fetchOptions: { credentials: 'include' } }),
}) : null;
const cacheKey = `daymargin-identity:${import.meta.env.VITE_NEON_AUTH_URL || 'preview'}`;
const listeners = new Set();
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('daymargin-auth') : null;
let lastUser = undefined;
function cachedUser() { try { return JSON.parse(localStorage.getItem(cacheKey)); } catch { return null; } }
function publish(user, event) {
  const normalized = user ? { id: user.id, email: user.email, user_metadata: { display_name: user.name || '' } } : null;
  if (normalized) localStorage.setItem(cacheKey, JSON.stringify(normalized)); else localStorage.removeItem(cacheKey);
  if (JSON.stringify(lastUser) !== JSON.stringify(normalized) || event) {
    lastUser = normalized; listeners.forEach(fn => fn(event || (normalized ? 'SIGNED_IN' : 'SIGNED_OUT'), normalized ? { user: normalized } : null));
  }
  return normalized;
}
async function refresh() {
  if (!neonAuth) return { data: { session: null } };
  if (!navigator.onLine) return { data: { session: cachedUser() ? { user: cachedUser() } : null } };
  try {
    const result = await neonAuth.getSession({ fetchOptions: { timeout: 10000 } });
    if (result.error) throw new Error(result.error.message);
    const user = publish(result.data?.user || null);
    return { data: { session: user ? { user } : null } };
  } catch (error) {
    // Cached identity unlocks only this device's cache; API access still requires a verified token.
    return { data: { session: cachedUser() ? { user: cachedUser() } : null }, error };
  }
}
async function complete(result, event) {
  if (result.error) return result;
  const session = await refresh();
  if (event) channel?.postMessage('changed');
  return { data: { ...result.data, session: session.data.session }, error: null };
}
export const auth = {
  getSession: refresh,
  onAuthStateChange(fn) {
    listeners.add(fn);
    return { data: { subscription: { unsubscribe: () => listeners.delete(fn) } } };
  },
  async signUp({ email, password, options }) {
    return complete(await neonAuth.signUp.email({ email, password, name: options?.data?.display_name || email.split('@')[0] }), true);
  },
  async signInWithPassword({ email, password }) { return complete(await neonAuth.signIn.email({ email, password }), true); },
  async resetPasswordForEmail(email, { redirectTo }) { return neonAuth.requestPasswordReset({ email, redirectTo }); },
  async updateUser({ password, data }) {
    if (password) {
      const token = new URLSearchParams(location.search).get('token');
      if (!token) return { error: new Error('Open the recovery link from your email before setting a new password.') };
      return neonAuth.resetPassword({ newPassword: password, token });
    }
    return complete(await neonAuth.updateUser({ name: data?.display_name }), true);
  },
  async signOut() {
    const result = await neonAuth.signOut();
    if (!result.error) { publish(null, 'SIGNED_OUT'); channel?.postMessage('changed'); }
    return result;
  },
  async deleteAccount(password) {
    await cloudRequest('/api/account', { method: 'DELETE', body: JSON.stringify({ password }) });
    await neonAuth.signOut().catch(() => {});
    publish(null, 'SIGNED_OUT'); channel?.postMessage('changed');
  },
};
channel?.addEventListener('message', () => refresh());
window.addEventListener('focus', () => { if (listeners.size) refresh(); });
window.addEventListener('online', () => { if (listeners.size) refresh(); });

export async function cloudRequest(path, options = {}) {
  if (!neonAuth) throw new Error('The account service is not connected.');
  // The installed SDK conflates /token and /get-session in its response cache.
  // Fetch the documented token endpoint directly using the existing session cookie.
  const tokenResponse = await fetch('/api/auth/token', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000) });
  const tokenData = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenData.token) throw new Error('Please sign in again before continuing.');
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers, Authorization: `Bearer ${tokenData.token}` }, signal: options.signal || AbortSignal.timeout(45000) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The service is temporarily unavailable. Please retry.');
  return result;
}
