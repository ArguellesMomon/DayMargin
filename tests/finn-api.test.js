import { afterEach, beforeEach, expect, test, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ store: {
  list: vi.fn(), reserve: vi.fn(), finishReservation: vi.fn(), finnLimitStatus: vi.fn(),
  get: vi.fn(),
} }));
vi.mock('../server/http.js', async importOriginal => ({
  ...await importOriginal(), authenticated: async () => ({ store: mocks.store }),
}));
import handler from '../api/finn.js';
import { conversationMemory, reportedTokenUsage, systemPrompt } from '../server/finn.js';
import { recordSchema, today } from '../src/lib/domain.js';
import { fromServer } from '../src/lib/storage.js';

let fetchMock;
const output = { answer: 'There are no saved entries to summarize yet.', sources: [], action: null };
const provider = (content = JSON.stringify(output), usage = { prompt_tokens: 800, completion_tokens: 200, total_tokens: 1000 }) => new Response(JSON.stringify({ choices: [{ message: { content } }], usage }));
function response() {
  return { headers: {}, setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } };
}
async function ask(res = response()) {
  await handler({ method: 'POST', headers: {}, body: { question: 'Summarize today.' } }, res);
  return res;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.store.ownerId = '10000000-0000-4000-8000-000000000001';
  for (const [name, value] of Object.entries({ GROQ_API_KEY: 'test-only-key', GROQ_MODEL: 'openai/gpt-oss-20b', GROQ_FREE_CONFIRMED: 'true', GROQ_ZDR_CONFIRMED: 'true' })) vi.stubEnv(name, value);
  mocks.store.list.mockResolvedValue([]); mocks.store.reserve.mockResolvedValue('lease');
  mocks.store.finishReservation.mockResolvedValue();
  fetchMock = vi.fn(async () => provider()); vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

test('reconciles successful usage before sending the answer to allow an immediate next question', async () => {
  const res = response();
  res.json = body => { expect(mocks.store.finishReservation).toHaveBeenCalledWith('lease', 1000); res.body = body; };
  expect((await ask(res)).statusCode).toBe(200);
  expect(mocks.store.finishReservation).toHaveBeenCalledOnce();
  expect(await ask()).toMatchObject({ statusCode: 200, body: { ...output, memory: expect.any(String) } });
});
test('charges valid reported usage even if generated JSON is invalid', async () => {
  fetchMock.mockResolvedValue(provider('not json'));
  expect((await ask()).statusCode).toBe(502);
  expect(mocks.store.finishReservation).toHaveBeenCalledWith('lease', 1000);
});
test('removes decorative emoji without rejecting a useful casual reply or altering PHP amounts', async () => {
  fetchMock.mockResolvedValue(provider(JSON.stringify({ answer: 'Bro \u{1F389} you did it. PHP 0.30, 2 entries. \u{1F1F5}\u{1F1ED} \u{1F469}\u{1F3FD}\u200D\u{1F4BB} 1\uFE0F\u20E3', sources: [], action: null })));
  const res = await ask();
  expect(res.statusCode).toBe(200); expect(res.body.answer).toBe('Bro you did it. PHP 0.30, 2 entries.');
  expect(mocks.store.finishReservation).toHaveBeenCalledWith('lease', 1000);
});
test('answers casual chat using the built-in personality and authenticated recent follow-up context', async () => {
  const memory = conversationMemory(mocks.store.ownerId, 'Suggest a hobby.', 'Try sketching.', [], 'test-only-key');
  const answer = { answer: 'Start with a five-minute sketch, bro. One page, no pressure.', sources: [], action: null };
  fetchMock.mockResolvedValue(provider(JSON.stringify(answer)));
  const res = response();
  await handler({ method: 'POST', headers: {}, body: { question: 'How do I start?', history: [memory] } }, res);
  expect(res.statusCode).toBe(200); expect(res.body.answer).toBe(answer.answer);
  const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(payload.messages.map(m => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
  expect(payload.messages[0].content).toBe(systemPrompt);
  expect(payload.messages[0].content).toContain('supportive hype bro');
  expect(payload.messages[1].content).toBe('Suggest a hobby.');
  expect(payload).toMatchObject({ reasoning_effort: 'low', include_reasoning: false, max_completion_tokens: 2048 });
  expect(mocks.store.reserve.mock.calls[0][1]).toEqual({ user: 1000, shared: 1000, minute: 30 });
});
test('keeps a fuller personal reply and its follow-up within the request budget', async () => {
  const personalAnswer = `Bro, that first sketch matters because you actually sat down and made something after putting it off. You do not have to grade it like a final exam. Getting an idea out of your head and onto a page is already the part that was holding you up, and you did that. Give yourself a minute to enjoy it instead of immediately hunting for everything you could improve.

If you feel like picking up the pencil again, you could draw one small thing from the same scene, or leave it alone for today and come back with fresh eyes. No dramatic new routine required. I would be curious what you enjoyed most: figuring out the shapes, adding the details, or finally seeing it take form. What did you draw?`;
  fetchMock.mockImplementation(async () => provider(JSON.stringify({ answer: personalAnswer, sources: [], action: null })));
  const first = response();
  await handler({ method: 'POST', headers: {}, body: { question: 'I finished my first sketch after putting it off for days.' } }, first);
  expect(first.statusCode).toBe(200); expect(first.body.answer).toBe(personalAnswer);
  const second = response();
  await handler({ method: 'POST', headers: {}, body: { question: 'It was a cat.', history: [first.body.memory] } }, second);
  expect(second.statusCode).toBe(200);
  const payload = JSON.parse(fetchMock.mock.calls[1][1].body);
  expect(payload.messages[2].role).toBe('assistant');
  expect(JSON.parse(payload.messages[2].content).answer).toBe(personalAnswer);
});
test('the richer built-in personality still accepts a maximum-length question', async () => {
  const res = response();
  await handler({ method: 'POST', headers: {}, body: { question: 'x'.repeat(1000) } }, res);
  expect(res.statusCode).toBe(200); expect(fetchMock).toHaveBeenCalledOnce();
});
test('preserves accounting and identifies a provider reply cut short by its token limit', async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: '{"answer":"' } }], usage: { prompt_tokens: 800, completion_tokens: 2048, total_tokens: 2848 } })));
  const res = await ask();
  expect(res.statusCode).toBe(502); expect(res.body.error).toContain('reply was cut short');
  expect(mocks.store.finishReservation).toHaveBeenCalledWith('lease', 2848);
});
test('Neon Date timestamps are normalized before Finn sorts equally relevant saved entries', async () => {
  const rows = [10, 20].map(amountCents => ({
    id: crypto.randomUUID(), version: 1, deleted: false,
    created_at: new Date(), updated_at: new Date(),
    data: recordSchema.parse({ type: 'expense', date: today(), category: 'Food', amountCents }),
  }));
  mocks.store.list.mockResolvedValue(rows); mocks.store.get.mockResolvedValue(rows);
  expect((await ask()).statusCode).toBe(200);
  const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
  const context = JSON.parse(payload.messages[1].content).permittedContext;
  expect(context.records).toHaveLength(2);
  expect(context.calculatedSpending.totalCents).toBe(30);
});
test('rejects an answer when a record available through conversation memory becomes excluded mid-request', async () => {
  const rows = Array.from({ length: 13 }, (_, i) => ({ id: crypto.randomUUID(), version: 1, deleted: false,
    created_at: new Date(), updated_at: new Date(), data: recordSchema.parse({ type: 'note', title: `Note ${i}` }) }));
  const memory = conversationMemory(mocks.store.ownerId, 'Summarize notes.', 'A short summary.', rows.map(fromServer), 'test-only-key');
  mocks.store.list.mockResolvedValue(rows);
  mocks.store.get.mockImplementation(ids => Promise.resolve(rows.filter(row => ids.includes(row.id)).map((row, i) => i === 0 ? { ...row, data: { ...row.data, excluded: true }, version: 2 } : row)));
  const res = response();
  await handler({ method: 'POST', headers: {}, body: { question: 'What about that?', history: [memory] } }, res);
  expect(res.statusCode).toBe(409);
  expect(mocks.store.get.mock.calls[0][0]).toHaveLength(13); // even entries omitted from the new bounded snippets
  expect(mocks.store.finishReservation).toHaveBeenCalledWith('lease', 1000);
});
test('unreported usage and provider failures retain the conservative reservation', async () => {
  fetchMock.mockResolvedValue(new Response('{}', { status: 503 }));
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  expect((await ask()).statusCode).toBe(503);
  expect(mocks.store.finishReservation).toHaveBeenCalledWith('lease', null);
  expect(log).toHaveBeenCalledWith('Finn provider request failed', { status: 503 });
});
test.each([
  ['minute', 30, 'shared free-service request limit'], ['user_daily', 3600, 'your daily Finn allowance'], ['shared_daily', 3600, 'shared daily allowance'],
])('reports local %s limits with retry timing without calling the AI provider', async (reason, retryAfter, message) => {
  mocks.store.reserve.mockResolvedValue(null); mocks.store.finnLimitStatus.mockResolvedValue({ reason, retryAfter });
  const res = await ask();
  expect(res.statusCode).toBe(429); expect(res.body.error).toContain(message);
  expect(res.headers['Retry-After']).toBe(String(retryAfter));
  expect(fetchMock).not.toHaveBeenCalled(); expect(mocks.store.finishReservation).not.toHaveBeenCalled();
});
test('distinguishes an upstream rate limit and preserves its retry header', async () => {
  fetchMock.mockResolvedValue(new Response('{}', { status: 429, headers: { 'Retry-After': '12' } }));
  const res = await ask();
  expect(res.statusCode).toBe(429); expect(res.body.error).toContain('AI provider reached a free-plan limit');
  expect(res.headers['Retry-After']).toBe('12');
  expect(mocks.store.finishReservation).toHaveBeenCalledWith('lease', null);
});
test('usage validation includes all output/reasoning tokens and rejects invalid accounting', () => {
  expect(reportedTokenUsage({ usage: { prompt_tokens: 800, completion_tokens: 200, total_tokens: 1000, completion_tokens_details: { reasoning_tokens: 150 } } })).toBe(1000);
  for (const usage of [null, { total_tokens: 1000 }, { prompt_tokens: 800, completion_tokens: -1, total_tokens: 799 },
    { prompt_tokens: 800, completion_tokens: 200, total_tokens: 999 }, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }]) {
    expect(reportedTokenUsage({ usage })).toBeNull();
  }
});
