import { z } from 'zod';
import { recordSchema } from '../src/lib/domain.js';
import { authenticated, fail, HttpError, parseBody, reply, requireMethod } from '../server/http.js';

export default async function handler(req, res) {
  try {
    requireMethod(req, 'POST');
    const { store } = await authenticated(req);
    const input = z.object({ proposalId: z.string().uuid() }).strict().safeParse(parseBody(req));
    if (!input.success) throw new HttpError(400, 'Please select a valid proposal.');
    const proposal = await store.proposal(input.data.proposalId);
    if (!proposal) throw new HttpError(404, 'This proposal is no longer available. Please ask Finn again.');
    if (proposal.applied_record_id) return reply(res, 200, { recordId: proposal.applied_record_id });
    const prior = await store.operation(proposal.id);
    if (prior?.status === 'applied') return reply(res, 200, { recordId: prior.record.id });
    if (new Date(proposal.expires_at) < new Date()) throw new HttpError(409, 'This proposal expired. Please ask Finn for a fresh review.');
    const action = proposal.action;
    const validated = recordSchema.safeParse(action.data);
    if (!validated.success) throw new HttpError(400, 'This proposal needs a fresh review.');
    if (action.kind === 'edit') {
      const [current] = await store.get([action.recordId]);
      if (!current || current.deleted || current.data.excluded || current.version !== action.expectedVersion) throw new HttpError(409, 'This entry changed. Cancel and ask Finn for a fresh proposal.');
    }
    const data = await store.apply({ id: proposal.id, recordId: action.recordId, expectedVersion: action.expectedVersion, data: validated.data, deleted: false });
    if (data.status === 'conflict') throw new HttpError(409, 'This entry changed. Cancel and ask for a fresh proposal.');
    await store.appliedProposal(proposal.id, action.recordId);
    return reply(res, 200, { recordId: action.recordId });
  } catch (error) { return fail(res, error); }
}
