import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';

async function isolatedChat(page) {
  await page.route('**/api/auth/**', route => route.fulfill({ json:
    new URL(route.request().url()).pathname.endsWith('/token') ? { token: 'isolated-test-token' } : {
      user: { id: '10000000-0000-4000-8000-000000000001', email: 'sprite@example.test', name: 'Sprite test' },
      session: { id: 'sprite-session', expiresAt: '2099-01-01T00:00:00Z' },
    },
  }));
  await page.route('**/api/records*', route => route.fulfill({ json: { records: [], next: null } }));
}

test('Today and Finn show actual moving frames on arrival and during idle', async ({ page }) => {
  await isolatedChat(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const [path, selector] of [['/', '.finn-invitation .finn-avatar'], ['/finn', '.finn-welcome .finn-avatar']]) {
    await page.goto(path);
    const avatar = page.locator(selector);
    await avatar.scrollIntoViewIfNeeded();
    await avatar.locator('.finn-sprite').evaluate(async el => {
      const image = new Image(); image.src = getComputedStyle(el).backgroundImage.slice(5, -2); await image.decode();
    });
    const snapshots = new Set();
    for (let sample = 0; sample < 8; sample++) {
      const pixels = await avatar.screenshot({ animations: 'allow' });
      snapshots.add(createHash('sha256').update(pixels).digest('hex'));
      await page.waitForTimeout(150);
    }
    expect(snapshots.size, `${path}: the character's rendered pixels should visibly change`).toBeGreaterThanOrEqual(3);
    // Inspect real-time idle playback after the one-shot arrival wave finishes.
    const positions = await avatar.locator('.finn-sprite').evaluate(el => new Promise(resolve => {
      const result = new Set(); const start = performance.now();
      const timer = setInterval(() => {
        result.add(getComputedStyle(el).backgroundPosition);
        if (performance.now() - start >= 2000) { clearInterval(timer); resolve([...result]); }
      }, 80);
    }));
    expect(positions.length, `${path}: idle should continue changing frames`).toBeGreaterThanOrEqual(3);
  }
});

test('sprite follows a new reply without delaying sending and respects both motion preferences', async ({ page }) => {
  await isolatedChat(page);
  let finish;
  let failure = false;
  await page.route('**/api/finn', async route => {
    await new Promise(resolve => { finish = resolve; });
    await route.fulfill(failure
      ? { status: 503, json: { error: 'Finn is temporarily unavailable. Please try again later.' } }
      : { json: { answer: 'Hey, bro. What is on your mind?', sources: [], action: null } });
  });
  await page.goto('/finn');
  const avatar = page.locator('.finn-heading .finn-avatar');
  const sprite = avatar.locator('.finn-sprite');
  await expect(avatar).toHaveAttribute('aria-label', 'Finn, a fluffy white dog');
  await expect(avatar).toHaveAttribute('data-motion', 'idle');
  await expect(page.locator('.save-status')).toHaveText('Synced');
  const image = await page.evaluate(async () => {
    const asset = new Image(); asset.src = '/finn-spritesheet.webp'; await asset.decode();
    return [asset.naturalWidth, asset.naturalHeight];
  });
  expect(image).toEqual([1536, 1872]);
  await page.getByRole('textbox', { name: 'Ask Finn a question' }).fill('Hey Finn');
  const send = page.getByRole('button', { name: 'Send question to Finn' });
  await send.click();
  await expect(avatar).toHaveAttribute('data-motion', 'thinking');
  await expect(page.getByRole('status').filter({ hasText: 'Finn is thinking' })).toBeVisible();
  await expect(page.locator('.thinking-status')).toBeInViewport();
  await expect(send).toBeDisabled();
  await expect.poll(() => typeof finish).toBe('function');
  finish();
  await expect(page.getByText('Hey, bro. What is on your mind?', { exact: true })).toBeVisible();
  await expect(avatar).toHaveAttribute('data-motion', 'reply');
  // Sending becomes usable while the wave is still playing.
  await page.getByRole('textbox', { name: 'Ask Finn a question' }).fill('Another question');
  await expect(send).toBeEnabled();
  await expect.poll(() => sprite.evaluate(el => getComputedStyle(el).animationName)).toContain('finn-sprite-wave');

  failure = true;
  finish = undefined;
  await send.click();
  await expect(avatar).toHaveAttribute('data-motion', 'thinking');
  await expect.poll(() => typeof finish).toBe('function');
  finish();
  await expect(page.getByRole('alert')).toContainText('Finn is temporarily unavailable');
  await expect(avatar).toHaveAttribute('data-motion', 'idle'); // A failure does not replay the previous wave.
  await expect(send).toBeEnabled();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => sprite.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await expect.poll(() => sprite.evaluate(el => getComputedStyle(el).backgroundPosition)).toBe('0% 0%');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/settings');
  await page.getByRole('checkbox', { name: 'Reduce motion' }).check();
  await page.goto('/finn');
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
  await expect.poll(() => sprite.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await expect(avatar).toHaveAttribute('data-motion', 'idle'); // Stored chat does not replay a wave.
});

test('built PWA caches the supplied sprite for offline display', async ({ page, context, baseURL }) => {
  test.skip(!baseURL.includes('4173'), 'Requires production preview for service-worker precaching.');
  await isolatedChat(page);
  await page.goto('/finn');
  await expect(page.getByRole('heading', { name: 'Finn', exact: true })).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  // Workbox's precache key includes its generated revision query parameter.
  await expect.poll(() => page.evaluate(async () => Boolean(await caches.match('/finn-spritesheet.webp', { ignoreSearch: true })))).toBe(true);
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  expect(await page.evaluate(async () => (await fetch('/finn-spritesheet.webp', { cache: 'reload' })).ok)).toBe(true);
  const dimensions = await page.evaluate(async () => {
    const image = new Image(); image.src = '/finn-spritesheet.webp'; await image.decode();
    return [image.naturalWidth, image.naturalHeight];
  });
  expect(dimensions).toEqual([1536, 1872]);
  await context.setOffline(false);
});
