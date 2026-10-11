import { afterEach, expect, test, vi } from 'vitest';
import handler from '../api/auth.js';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function response() {
  return { headers: {}, setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; }, json(body) { this.body = body; } };
}

test.each([
  ['/api/auth/sign-up/email', undefined, 'sign-up/email'],
  ['/api/auth/sign-in/email', undefined, 'sign-in/email'],
  ['/api/auth?path=sign-up%2Femail', undefined, 'sign-up/email'],
  ['/api/auth', { path: 'sign-in/email' }, 'sign-in/email'],
  ['/api/auth', { path: ['sign-in', 'email'] }, 'sign-in/email'],
  ['/api/auth/get-session', undefined, 'get-session'],
])('forwards account requests through the deployed and local route: %s', async (url, query, path) => {
  vi.stubEnv('NEON_AUTH_BASE_URL', 'https://auth.example.test/branch/auth');
  const fetch = vi.fn().mockResolvedValue(new Response('{"accepted":true}', { status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': 'session=test-cookie; Domain=auth.example.test; Path=/branch/auth; Secure; HttpOnly' } }));
  vi.stubGlobal('fetch', fetch);
  const res = response();
  await handler({ url, query, method: 'POST', headers: { origin: 'https://daymargin.vercel.app', cookie: 'session=existing' }, body: { name: 'Test' } }, res);
  expect(fetch).toHaveBeenCalledOnce();
  const [target, options] = fetch.mock.calls[0];
  expect(target).toBe(`https://auth.example.test/branch/auth/${path}`);
  expect(options.headers.Origin).toBe('https://daymargin.vercel.app');
  expect(options.headers.Cookie).toBe('session=existing');
  expect(options.body).toBe('{"name":"Test"}');
  expect(res.statusCode).toBe(200);
  expect(res.headers['Set-Cookie']).toEqual(['session=test-cookie; Path=/; Secure; HttpOnly']);
  expect(res.headers['Cache-Control']).toBe('no-store');
});

test('preserves recovery parameters while removing only the internal routing parameter', async () => {
  vi.stubEnv('NEON_AUTH_BASE_URL', 'https://auth.example.test/auth');
  const fetch = vi.fn().mockResolvedValue(new Response('null', { status: 200 }));
  vi.stubGlobal('fetch', fetch);
  await handler({ url: '/api/auth?path=reset-password&token=abc%2Fdef&callbackURL=https%3A%2F%2Fdaymargin.vercel.app%2Fauth%2Fupdate', method: 'POST', headers: {}, body: {} }, response());
  const target = new URL(fetch.mock.calls[0][0]);
  expect(target.pathname).toBe('/auth/reset-password');
  expect(target.searchParams.get('token')).toBe('abc/def');
  expect(target.searchParams.get('callbackURL')).toBe('https://daymargin.vercel.app/auth/update');
  expect(target.searchParams.has('path')).toBe(false);
});

test.each(['../token', 'https://other.example/token', 'sign-in//email', 'sign-in%2Femail', ''])('rejects an invalid routed account path: %s', async path => {
  vi.stubEnv('NEON_AUTH_BASE_URL', 'https://auth.example.test/auth');
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  const res = response();
  await handler({ url: '/api/auth', query: { path }, method: 'POST', headers: {}, body: {} }, res);
  expect(res.statusCode).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});
