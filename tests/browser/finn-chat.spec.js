import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';

const accountId = '10000000-0000-4000-8000-000000000012';
async function connectedChat(page) {
  await page.route('**/api/auth/**', route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/token') ? { token: 'isolated-token' } : {
    user: { id: accountId, email: 'chat@example.test', name: 'Chat Test' }, session: { id: 'chat-session', expiresAt: '2099-01-01T00:00:00Z' },
  } }));
  await page.route('**/api/records*', route => route.fulfill({ json: { records: [], next: null } }));
  await page.goto('/finn');
  await expect(page.locator('.save-status')).toHaveText('Synced');
}

async function saveChatHistory(page) {
  await page.evaluate(async id => {
    const db = await new Promise(resolve => { const req = indexedDB.open('daymargin-v1', 1); req.onsuccess = () => resolve(req.result); });
    const tx = db.transaction('accounts', 'readwrite'), store = tx.objectStore('accounts');
    const snapshot = await new Promise(resolve => { const req = store.get(id); req.onsuccess = () => resolve(req.result); });
    snapshot.chats = Array.from({ length: 24 }, (_, i) => ({ id: `history-${i}`, role: i % 2 ? 'assistant' : 'user', content: `Saved message ${i}. ` + 'Some context to revisit. '.repeat(10), createdAt: '2026-10-12T01:00:00Z' }));
    store.put(snapshot, id); await new Promise(resolve => { tx.oncomplete = resolve; }); db.close();
  }, accountId);
  await page.reload();
  await expect(page.locator('.message')).toHaveCount(24);
}

async function expectCompactShell(page, top, height) {
  await expect.poll(() => page.locator('.chat-layout').evaluate(el => el.getBoundingClientRect().height)).toBeCloseTo(height, 0);
  const bounds = await page.evaluate(() => {
    const rect = selector => {
      const { top, bottom, height } = document.querySelector(selector).getBoundingClientRect();
      return { top, bottom, height };
    };
    return { shell: rect('.chat-layout'), composer: rect('.chat-composer'), note: rect('.chat-footnote'), nav: rect('.bottom-nav'), messages: rect('.chat-content'), scrollY, overflow: document.documentElement.scrollWidth > innerWidth };
  });
  expect(bounds.shell.top).toBeCloseTo(top, 0);
  expect(bounds.nav.bottom).toBeCloseTo(top + height, 0);
  expect(bounds.composer.bottom).toBeLessThan(bounds.note.top);
  expect(bounds.note.bottom).toBeLessThanOrEqual(bounds.nav.top);
  expect(bounds.nav.top - bounds.note.bottom).toBeLessThanOrEqual(7);
  expect(bounds.messages.height).toBeGreaterThan(25);
  expect(bounds.scrollY).toBe(0);
  expect(bounds.overflow).toBe(false);
}

test('Portrait and landscape chat keep the composer and note next to navigation without page scrolling', async ({ page }, testInfo) => {
  await connectedChat(page);
  await page.setViewportSize({ width: 844, height: 260 });
  await expectCompactShell(page, 0, 260);
  expect(await page.locator('.chat-content').evaluate(el => el.scrollTop)).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await saveChatHistory(page);
  for (const [width, height] of [[390, 844], [390, 440], [844, 390], [844, 260], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.getByRole('textbox', { name: 'Ask Finn a question' }).focus();
    await expectCompactShell(page, 0, height);
    await expect(page.locator('.message').last()).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`chat-${width}-${height}.png`) });
    await page.locator('.chat-content').evaluate(el => { el.scrollTop = 0; });
    await expect(page.getByRole('button', { name: 'Latest messages', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Latest messages', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Latest messages', exact: true })).toHaveCount(0);
  }
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Library' }).click();
  await expect(page.locator('html')).not.toHaveClass(/app-viewport/);
  expect(await page.locator('body').evaluate(el => getComputedStyle(el).position)).toBe('static');
});

test('A keyboard that only shrinks and pans the visual viewport keeps the chat fixed and restores it on dismiss', async ({ page }) => {
  await page.addInitScript(() => {
    const viewport = new EventTarget();
    Object.assign(viewport, { height: 844, offsetTop: 0, scale: 1 });
    Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });
    window.resizeChatViewport = (height, offsetTop = 0) => {
      Object.assign(viewport, { height, offsetTop });
      viewport.dispatchEvent(new Event('resize'));
      viewport.dispatchEvent(new Event('scroll'));
    };
  });
  await connectedChat(page);
  await saveChatHistory(page);
  await page.getByRole('textbox', { name: 'Ask Finn a question' }).focus();
  await page.evaluate(() => window.resizeChatViewport(360, 54));
  await expectCompactShell(page, 54, 360);
  await expect(page.locator('.message').last()).toBeInViewport();
  await page.locator('.chat-content').evaluate(el => { el.scrollTop = 0; });
  await expect(page.getByRole('button', { name: 'Latest messages', exact: true })).toBeVisible();
  await page.evaluate(() => window.resizeChatViewport(330, 70));
  await expectCompactShell(page, 70, 330);
  expect(await page.locator('.chat-content').evaluate(el => el.scrollTop)).toBeLessThan(20);
  await page.getByRole('button', { name: 'Latest messages', exact: true }).click();
  await page.evaluate(() => window.resizeChatViewport(844, 70));
  await expectCompactShell(page, 0, 844);
  await expect(page.locator('.message').last()).toBeInViewport();
});

test('Sending clears the composer immediately, shows one message and preserves the next draft through failure and retry', async ({ page }) => {
  const bodies = [];
  const finish = [];
  await page.route('**/api/finn', async route => {
    const index = bodies.push(route.request().postDataJSON()) - 1;
    await new Promise(resolve => { finish[index] = resolve; });
    await route.fulfill(index === 0
      ? { status: 503, json: { error: 'Finn could not reply. Please retry.' } }
      : { json: { answer: 'A small step is enough, bro.', sources: [], memory: 'successful-turn', action: null } });
  });
  await connectedChat(page);
  const input = page.getByRole('textbox', { name: 'Ask Finn a question' });
  const send = page.getByRole('button', { name: 'Send question to Finn' });
  await input.fill('Help me get started.'); await send.click();
  await expect(input).toHaveValue('');
  await expect(page.locator('.message.user')).toHaveCount(1);
  await expect(page.locator('.message.user')).toContainText('Help me get started.');
  await expect(page.getByRole('status').filter({ hasText: 'Finn is thinking' })).toBeVisible();
  await expect(send).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Start a new chat' })).toBeDisabled();
  await expect.poll(() => typeof finish[0]).toBe('function');
  await input.fill('Keep this next draft.'); await input.press('Enter');
  expect(bodies).toHaveLength(1);
  finish[0]();
  await expect(page.getByRole('alert')).toContainText('Finn could not reply');
  await expect(input).toHaveValue('Keep this next draft.');
  await expect(page.locator('.message-delivery')).toHaveText('Not answered');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(input).toHaveValue('Keep this next draft.');
  await expect(page.locator('.message.user')).toHaveCount(1);
  await expect.poll(() => typeof finish[1]).toBe('function');
  expect(bodies[1].question).toBe('Help me get started.');
  finish[1]();
  await expect(page.locator('.message.assistant')).toHaveCount(1);
  await expect(input).toHaveValue('Keep this next draft.');
  await expect(page.locator('.message-delivery')).toHaveCount(0);
  await expect(send).toBeEnabled();
  await send.click();
  await expect(input).toHaveValue('');
  await expect.poll(() => typeof finish[2]).toBe('function');
  expect(bodies[2]).toEqual({ question: 'Keep this next draft.', history: ['successful-turn'] });
  finish[2]();
  await expect(page.locator('.message.user')).toHaveCount(2);
  await expect(page.locator('.message.assistant')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('.message.user')).toHaveCount(2);
  await expect(page.locator('.message.assistant')).toHaveCount(2);
});

test('Reloaded unfinished messages stay recoverable and retry once without duplicate messages or automatic calls', async ({ page }) => {
  let requests = 0;
  let finish;
  await page.route('**/api/finn', async route => {
    requests++;
    if (requests === 1) await new Promise(resolve => { finish = resolve; });
    await route.fulfill({ json: { answer: 'Back with you, bro.', sources: [], action: null } }).catch(() => {});
  });
  await connectedChat(page);
  await page.getByRole('textbox', { name: 'Ask Finn a question' }).fill('Remember this interrupted message.');
  await page.getByRole('button', { name: 'Send question to Finn' }).click();
  await expect.poll(() => typeof finish).toBe('function');
  await page.reload();
  finish();
  await expect(page.locator('.message.user')).toHaveCount(1);
  await expect(page.locator('.message-delivery')).toHaveText('Interrupted');
  await expect(page.locator('.thinking-status')).toHaveCount(0);
  expect(requests).toBe(1);
  await page.getByRole('button', { name: 'Retry message', exact: true }).click();
  await expect(page.getByText('Back with you, bro.', { exact: true })).toBeVisible();
  expect(requests).toBe(2);
  await expect(page.locator('.message.user')).toHaveCount(1);
});

test('Thinking has moving rendered frames and a stable composer, while both reduced-motion preferences stop movement', async ({ page }) => {
  test.setTimeout(60000);
  let finish;
  await page.route('**/api/finn', async route => {
    await new Promise(resolve => { finish = resolve; });
    await route.fulfill({ json: { answer: 'You have got this, bro.', sources: [], action: null } });
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await connectedChat(page);
  await page.getByRole('textbox', { name: 'Ask Finn a question' }).fill('A little motivation, please.');
  await page.getByRole('button', { name: 'Send question to Finn' }).click();
  const avatar = page.locator('.thinking-avatar .finn-avatar');
  await avatar.locator('.finn-sprite').evaluate(async el => { const asset = new Image(); asset.src = '/finn-spritesheet.webp'; await asset.decode(); });
  const frames = new Set();
  const bounds = await page.locator('.thinking-avatar').boundingBox();
  const clip = { x: bounds.x - 4, y: bounds.y - 4, width: bounds.width + 8, height: bounds.height + 8 };
  for (let i = 0; i < 6; i++) {
    // A continuously swaying element never satisfies locator.screenshot's stability wait.
    frames.add(createHash('sha256').update(await page.screenshot({ clip, animations: 'allow' })).digest('hex'));
    await page.waitForTimeout(150);
  }
  expect(frames.size).toBeGreaterThanOrEqual(3);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => avatar.locator('.finn-sprite').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await expect.poll(() => page.locator('.thinking-avatar').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => { document.documentElement.dataset.reducedMotion = 'true'; });
  await expect.poll(() => page.locator('.thinking-dots i').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await expect.poll(() => avatar.locator('.finn-sprite').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await page.evaluate(() => { document.documentElement.dataset.reducedMotion = 'false'; });
  for (const [width, height] of [[360, 844], [390, 500], [768, 844], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    const composer = await page.locator('.chat-composer').boundingBox();
    const nav = await page.locator('.bottom-nav').boundingBox();
    expect(composer.y + composer.height).toBeLessThanOrEqual(nav ? nav.y : height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await expect.poll(() => typeof finish).toBe('function'); finish();
  await expect(page.getByText('You have got this, bro.', { exact: true })).toBeVisible();
});

test('A new answer does not pull the reader away from older messages; Latest messages returns to the reply', async ({ page }) => {
  let finish;
  await page.route('**/api/finn', async route => {
    await new Promise(resolve => { finish = resolve; });
    await route.fulfill({ json: { answer: 'The latest reply is here, bro.', sources: [], action: null } });
  });
  await connectedChat(page);
  await saveChatHistory(page);
  await page.getByRole('textbox', { name: 'Ask Finn a question' }).fill('A new message.');
  await page.getByRole('button', { name: 'Send question to Finn' }).click();
  await expect.poll(() => typeof finish).toBe('function');
  await page.locator('.chat-content').evaluate(el => { el.scrollTop = 0; });
  await expect(page.getByRole('button', { name: 'Latest messages', exact: true })).toBeVisible();
  finish();
  await expect(page.locator('.message.assistant').last()).toContainText('The latest reply');
  expect(await page.locator('.chat-content').evaluate(el => el.scrollTop)).toBeLessThan(20);
  await page.getByRole('button', { name: 'Latest messages', exact: true }).click();
  await expect(page.locator('.message.assistant').last()).toBeInViewport();
});
