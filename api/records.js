import { z } from 'zod';
import { recordSchema } from '../src/lib/domain.js';
import { authenticated, fail, HttpError, parseBody, reply } from '../server/http.js';
const operationSchema = z.object({ id: z.string().uuid(), recordId: z.string().uuid(), expectedVersion: z.number().int().min(0).max(2147483646), data: recordSchema, deleted: z.boolean() }).strict();
export default async function handler(req, res) {
  try {
    if (!['GET', 'POST'].includes(req.method)) throw new HttpError(405, 'This request method is not supported.');
    const { store } = await authenticated(req);
    if (req.method === 'GET') {
      const url = new URL(req.url, 'http://localhost');
      const cursor = url.searchParams.get('after');
      if (cursor && !z.string().uuid().safeParse(cursor).success) throw new HttpError(400, 'Invalid record cursor.');
      const records = await store.list({ after: cursor });
      return reply(res, 200, { records, next: records.length === 500 ? records.at(-1).id : null });
    }
    const parsed = operationSchema.safeParse(parseBody(req, 100000));
    if (!parsed.success) throw new HttpError(400, 'This entry contains invalid fields. Please review it before syncing.');
    return reply(res, 200, await store.apply(parsed.data));
  } catch (error) { return fail(res, error); }
}
