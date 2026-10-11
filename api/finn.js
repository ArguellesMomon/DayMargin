import { buildContext } from '../src/lib/finn-context.js';
import { fromServer } from '../src/lib/storage.js';
import { recordSchema, occursOn } from '../src/lib/domain.js';
import { authenticated, fail, HttpError, parseBody, reply, requireMethod } from '../server/http.js';
import { questionSchema, systemPrompt, validateFinnOutput } from '../server/finn.js';

export default async function handler(req, res) {
  let store, reservation;
  try {
    requireMethod(req, 'POST');
    const parsed = questionSchema.safeParse(parseBody(req, 5000));
    if (!parsed.success) throw new HttpError(400, 'Ask a question of up to 1,000 characters.');
    ({ store } = await authenticated(req));
    if (!process.env.GROQ_API_KEY || !process.env.GROQ_MODEL || process.env.GROQ_FREE_CONFIRMED !== 'true' || process.env.GROQ_ZDR_CONFIRMED !== 'true') {
      throw new HttpError(503, 'Finn’s free AI service is not connected yet. Your question is preserved.');
    }
    const rows = [];
    let cursor = null;
    for (let offset = 0; offset < 5000; offset += 500) {
      const data = await store.list({ after: cursor, activeOnly: true });
      rows.push(...data);
      if (data.length < 500) break;
      cursor = data.at(-1).id;
      if (offset === 4500) throw new HttpError(422, 'Your library needs a narrower search before Finn can answer. Please use manual filters for now.');
    }
    const records = rows.map(fromServer).filter(r => recordSchema.safeParse(r).success);
    const context = buildContext(records, parsed.data.question);
    const payload = { model: process.env.GROQ_MODEL, temperature: 0.25, max_completion_tokens: 600,
      response_format: { type: 'json_object' }, messages: [{ role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify({ question: parsed.data.question, permittedContext: context }) }] };
    // Byte count is a deliberately conservative token upper bound for the complete request.
    let reservedTokens = Buffer.byteLength(JSON.stringify(payload.messages), 'utf8') + 600;
    while (reservedTokens > 5500 && context.records.length) {
      context.records.pop(); context.coverage.selectedCount = context.records.length;
      context.coverage.incomplete = true;
      payload.messages[1].content = JSON.stringify({ question: parsed.data.question, permittedContext: context });
      reservedTokens = Buffer.byteLength(JSON.stringify(payload.messages), 'utf8') + 600;
    }
    if (reservedTokens > 5500) throw new HttpError(422, 'This question needs a smaller set of entries. Please ask a more focused question.');
    const bounded = (value, fallback, maximum) => Math.max(1, Math.min(Number(value) || fallback, maximum));
    const lease = await store.reserve(reservedTokens, {
      user: bounded(process.env.FINN_USER_DAILY_LIMIT, 10, 10),
      shared: bounded(process.env.FINN_SHARED_DAILY_LIMIT, 80, 80),
      minute: bounded(process.env.FINN_SHARED_MINUTE_LIMIT, 2, 2),
    });
    if (!lease) throw new HttpError(429, 'Finn is temporarily unavailable. Please try again later.');
    reservation = lease;
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      if (response.status === 429) {
        const retry = response.headers.get('retry-after');
        if (retry && /^\d+$/.test(retry)) res.setHeader('Retry-After', retry);
      }
      throw new HttpError(response.status === 429 ? 429 : 503, 'Finn is temporarily unavailable. Please try again later.');
    }
    const raw = await response.json();
    let output;
    try { output = JSON.parse(raw.choices?.[0]?.message?.content); } catch { throw new HttpError(502, 'Finn could not finish a clear answer. Please retry.'); }
    const result = validateFinnOutput(output, context, records);
    const used = records.filter(r => !r.excluded && (context.records.some(s => s.id === r.id)
      || r.type === 'expense' && r.date >= context.calculatedSpending.start && r.date <= context.calculatedSpending.end
      || r.type === 'event' && occursOn(r, context.focusDay)));
    for (let offset = 0; offset < used.length; offset += 500) {
      const group = used.slice(offset, offset + 500);
      const fresh = await store.get(group.map(r => r.id));
      if (fresh.length !== group.length || fresh.some(r => r.deleted || r.data.excluded || r.version !== group.find(old => old.id === r.id)?.version)) {
        throw new HttpError(409, 'Your entries changed while Finn was answering. Please retry with the latest records.');
      }
    }
    if (result.action) {
      const proposalId = crypto.randomUUID();
      await store.saveProposal({ id: proposalId, action: result.action, expiresAt: new Date(Date.now() + 10 * 60000).toISOString() });
      result.action.proposalId = proposalId;
    }
    return reply(res, 200, result);
  } catch (error) { return fail(res, error); }
  finally { if (store && reservation) await store.finishReservation(reservation).catch(() => {}); }
}
