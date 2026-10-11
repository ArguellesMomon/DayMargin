import { z } from 'zod';
import { authenticated, fail, HttpError, parseBody, reply, requireMethod } from '../server/http.js';
const schema = z.object({ endpoint: z.url().startsWith('https://').max(4096), expirationTime: z.number().nullable().optional(), keys: z.object({ p256dh: z.string().min(1).max(256), auth: z.string().min(1).max(256) }).strict() }).strict();
export default async function handler(req, res) {
  try {
    requireMethod(req, 'POST');
    const { store } = await authenticated(req);
    const parsed = schema.safeParse(parseBody(req));
    if (!parsed.success) throw new HttpError(400, 'This device subscription could not be read.');
    await store.subscribe(parsed.data);
    return reply(res, 200, { connected: true });
  } catch (error) { return fail(res, error); }
}
