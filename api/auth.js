import { fail, HttpError } from '../server/http.js';
export default async function handler(req, res) {
  try {
    if (!process.env.NEON_AUTH_BASE_URL) throw new HttpError(503, 'The account service is not connected.');
    if (!['GET', 'POST'].includes(req.method)) throw new HttpError(405, 'This request method is not supported.');
    const incoming = new URL(req.url, 'http://localhost');
    // Vercel's Vite functions need an explicit rewrite for multi-segment paths.
    // Locally the original URL is retained; a deployment may expose the rewrite
    // destination instead. Support both without forwarding the routing parameter.
    const routed = req.query?.path || incoming.searchParams.get('path');
    const path = incoming.pathname.startsWith('/api/auth/')
      ? incoming.pathname.slice('/api/auth/'.length)
      : Array.isArray(routed) ? routed.join('/') : routed;
    if (typeof path !== 'string' || !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(path)) throw new HttpError(400, 'Invalid account request.');
    incoming.searchParams.delete('path');
    const search = incoming.searchParams.toString();
    const headers = { 'Content-Type': 'application/json' };
    if (req.headers.cookie) headers.Cookie = req.headers.cookie;
    if (req.headers.origin) headers.Origin = req.headers.origin;
    const body = req.method === 'POST' ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})) : undefined;
    if (body && Buffer.byteLength(body) > 12000) throw new HttpError(413, 'This request is too long.');
    const response = await fetch(`${process.env.NEON_AUTH_BASE_URL.replace(/\/$/, '')}/${path}${search ? `?${search}` : ''}`, { method: req.method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(20000) });
    // Host-only cookies belong to this app, rather than the upstream auth domain.
    const cookies = response.headers.getSetCookie().map(cookie => cookie.replace(/;\s*Domain=[^;]+/ig, '').replace(/;\s*Path=[^;]+/ig, '; Path=/'));
    if (cookies.length) res.setHeader('Set-Cookie', cookies);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    for (const key of ['content-type', 'set-auth-jwt']) { const value = response.headers.get(key); if (value) res.setHeader(key, value); }
    const destination = response.headers.get('location');
    if (destination) {
      const redirect = new URL(destination, process.env.NEON_AUTH_BASE_URL);
      const origin = req.headers.origin || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
      if (redirect.origin !== new URL(origin).origin) throw new HttpError(400, 'Unexpected account redirect.');
      res.setHeader('Location', redirect.href);
    }
    return res.status(response.status).send(await response.text());
  } catch (error) { return fail(res, error); }
}
