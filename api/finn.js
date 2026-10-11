import { buildContext } from '../src/lib/finn-context.js';
import { fromServer } from '../src/lib/storage.js';
import { recordSchema, occursOn } from '../src/lib/domain.js';
import { authenticated, fail, HttpError, parseBody, reply, requireMethod } from '../server/http.js';
import { conversationContext, conversationMemory, questionSchema, reportedTokenUsage, systemPrompt, validateFinnOutput } from '../server/finn.js';

export default async function handler(req, res) {
  let store, reservation, usedTokens = null;
  try {
    requireMethod(req, 'POST');
    const parsed = questionSchema.safeParse(parseBody(req, 24000));
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
    const history = conversationContext(parsed.data.history, store.ownerId, records, process.env.GROQ_API_KEY);
    const completionTokens = 2048;
    const payload = { model: process.env.GROQ_MODEL, temperature: 0.65, max_completion_tokens: completionTokens,
      ...(process.env.GROQ_MODEL.startsWith('openai/gpt-oss-') ? { reasoning_effort: 'low', include_reasoning: false } : {}),
      response_format: { type: 'json_object' }, messages: [{ role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: JSON.stringify({ question: parsed.data.question, permittedContext: context }) }] };
    // Byte count is a deliberately conservative token upper bound for the complete request.
    let reservedTokens = Buffer.byteLength(JSON.stringify(payload.messages), 'utf8') + completionTokens;
    while (reservedTokens > 7500 && payload.messages.length > 2) {
      payload.messages.splice(1, 2); // Drop the oldest complete turn first.
      reservedTokens = Buffer.byteLength(JSON.stringify(payload.messages), 'utf8') + completionTokens;
    }
    while (reservedTokens > 7500 && context.records.length) {
      context.records.pop(); context.coverage.selectedCount = context.records.length;
      context.coverage.incomplete = true;
      payload.messages.at(-1).content = JSON.stringify({ question: parsed.data.question, permittedContext: context });
      reservedTokens = Buffer.byteLength(JSON.stringify(payload.messages), 'utf8') + completionTokens;
    }
    if (reservedTokens > 7500) throw new HttpError(422, 'This question needs a smaller set of entries. Please ask a more focused question.');
    const limits = {
      user: 1000,
      shared: 1000,
      minute: 30,
    };
    const lease = await store.reserve(reservedTokens, limits);
    if (!lease) {
      const limit = await store.finnLimitStatus(reservedTokens, limits);
      res.setHeader('Retry-After', String(limit.retryAfter));
      if (limit.reason === 'user_daily') throw new HttpError(429, 'You’ve reached your daily Finn allowance. It resets at midnight in Asia/Manila. Your question is still here.');
      if (limit.reason === 'shared_daily') throw new HttpError(429, 'Finn’s shared daily allowance is used up. It resets at midnight in Asia/Manila. Your question is still here.');
      throw new HttpError(429, `Finn reached the shared free-service request limit. Try again in ${limit.retryAfter} ${limit.retryAfter === 1 ? 'second' : 'seconds'}. Your question is still here.`);
    }
    reservation = lease;
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      if (response.status === 429) {
        const retry = response.headers.get('retry-after');
        if (retry && /^\d+$/.test(retry)) {
          res.setHeader('Retry-After', retry);
          throw new HttpError(429, `Finn’s AI provider reached a free-plan limit. Try again in ${retry} seconds. Your question is still here.`);
        }
        throw new HttpError(429, 'Finn’s AI provider reached a free-plan limit. Please try again later. Your question is still here.');
      }
      console.error('Finn provider request failed', { status: response.status });
      throw new HttpError(503, 'Finn’s AI provider could not complete the request. Please try again later. Your question is still here.');
    }
    const raw = await response.json();
    usedTokens = reportedTokenUsage(raw);
    // Provider usage counts even if later output checks fail.
    if (raw.choices?.[0]?.finish_reason === 'length') throw new HttpError(502, 'Finn’s reply was cut short. Your question is still here; please retry.');
    let output;
    try { output = JSON.parse(raw.choices?.[0]?.message?.content); } catch { throw new HttpError(502, 'Finn could not finish a clear answer. Please retry.'); }
    const result = validateFinnOutput(output, context, records);
    const used = records.filter(r => !r.excluded && (history.length > 0 || context.records.some(s => s.id === r.id)
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
    // Release unused budget before the browser can send its next question.
    await store.finishReservation(reservation, usedTokens);
    reservation = null;
    result.memory = conversationMemory(store.ownerId, parsed.data.question, result.answer, records, process.env.GROQ_API_KEY);
    return reply(res, 200, result);
  } catch (error) { return fail(res, error); }
  finally { if (store && reservation) await store.finishReservation(reservation, usedTokens).catch(() => { console.error('Finn token accounting could not be completed'); }); }
}
