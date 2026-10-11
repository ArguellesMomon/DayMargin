import { afterEach, beforeEach, expect, test, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ store: {
  list: vi.fn(), reserve: vi.fn(), finishReservation: vi.fn(), finnLimitStatus: vi.fn(),
} }));
vi.mock('../server/http.js', async importOriginal => ({
  ...await importOriginal(), authenticated: async () => ({ store: mocks.store }),
}));
import handler from '../api/finn.js';
import { reportedTokenUsage } from '../server/finn.js';

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
  expect(await ask()).toMatchObject({ statusCode: 200, body: output });
});
test('charges valid reported usage even if generated JSON is invalid', async () => {
  fetchMock.mockResolvedValue(provider('not json'));
  expect((await ask()).statusCode).toBe(502);
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
  ['minute', 30, 'short pause'], ['user_daily', 3600, 'your daily Finn allowance'], ['shared_daily', 3600, 'shared daily allowance'],
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
