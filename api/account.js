import { z } from 'zod';
import { authenticated, fail, HttpError, parseBody, reply, requireMethod } from '../server/http.js';
export default async function handler(req, res) {
  try {
    requireMethod(req, 'DELETE');
    const { user } = await authenticated(req);
    const parsed = z.object({ password: z.string().min(1).max(128) }).strict().safeParse(parseBody(req));
    if (!parsed.success) throw new HttpError(400, 'Enter your password to confirm account deletion.');
    const { PRIVATE_NEON_API_KEY: key, NEON_PROJECT_ID: project, NEON_BRANCH_ID: branch, NEON_AUTH_BASE_URL: authUrl } = process.env;
    if (!key || !project || !branch) throw new HttpError(503, 'Account deletion is not connected yet. Your records are unchanged.');
    // A current password is required in addition to the signed identity. Never accept
    // a caller-selected user, project or branch, even with a valid account token.
    const confirmation = await fetch(`${authUrl.replace(/\/$/, '')}/sign-in/email`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: new URL(authUrl).origin },
      body: JSON.stringify({ email: user.email, password: parsed.data.password }), signal: AbortSignal.timeout(15000),
    });
    const identity = await confirmation.json().catch(() => ({}));
    if (!confirmation.ok || identity.user?.id !== user.id) throw new HttpError(403, 'Your password could not be confirmed. Your records are unchanged.');
    const response = await fetch(`https://console.neon.tech/api/v2/projects/${encodeURIComponent(project)}/branches/${encodeURIComponent(branch)}/auth/users/${encodeURIComponent(user.id)}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new HttpError(503, 'Account deletion could not finish. Please retry.');
    return reply(res, 200, { deleted: true });
  } catch (error) { return fail(res, error); }
}
