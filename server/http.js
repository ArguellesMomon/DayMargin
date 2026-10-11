import { createRemoteJWKSet, jwtVerify } from 'jose';
import { databasePool, RecordStore } from './database.js';
let keySet, keySetUrl;

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function reply(res, status, body) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(body);
}
export function parseBody(req, max = 10000) {
  if (Number(req.headers['content-length'] || 0) > max) throw new HttpError(413, 'This request is too long.');
  const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  if (Buffer.byteLength(raw) > max) throw new HttpError(413, 'This request is too long.');
  try { return JSON.parse(raw); } catch { throw new HttpError(400, 'The request could not be read.'); }
}
export async function authenticated(req) {
  const url = process.env.NEON_AUTH_BASE_URL;
  if (!url || !process.env.DATABASE_URL) throw new HttpError(503, 'The account service is not connected yet.');
  const bearer = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!bearer) throw new HttpError(401, 'Please sign in before continuing.');
  const jwksUrl = process.env.NEON_AUTH_JWKS_URL || `${url.replace(/\/$/, '')}/.well-known/jwks.json`;
  if (keySetUrl !== jwksUrl) { keySet = createRemoteJWKSet(new URL(jwksUrl)); keySetUrl = jwksUrl; }
  let payload;
  try { ({ payload } = await jwtVerify(bearer, keySet, { issuer: new URL(url).origin, audience: new URL(url).origin, algorithms: ['EdDSA'], requiredClaims: ['sub', 'exp', 'iat'] })); }
  catch { throw new HttpError(401, 'Please sign in again before continuing.'); }
  if (!payload.sub || payload.role !== 'authenticated' || payload.banned) throw new HttpError(401, 'Please sign in again before continuing.');
  // Check the live identity too: a deleted account cannot keep using a previously issued JWT.
  const { rows } = await databasePool().query('select id, email, name, banned, "banExpires" from neon_auth."user" where id=$1', [payload.sub]);
  if (!rows.length || rows[0].banned && (!rows[0].banExpires || new Date(rows[0].banExpires) > new Date())) throw new HttpError(401, 'Please sign in again before continuing.');
  return { user: rows[0], store: new RecordStore(rows[0].id) };
}
export function requireMethod(req, method) {
  if (req.method !== method) throw new HttpError(405, 'This request method is not supported.');
}
export function fail(res, error) {
  return reply(res, error instanceof HttpError ? error.status : 503, { error: error instanceof HttpError ? error.message : 'The service is temporarily unavailable. Please try again later.' });
}
