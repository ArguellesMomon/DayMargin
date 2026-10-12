import { test, expect } from '@playwright/test';

test.use({ hasTouch: true });
const accountId = '10000000-0000-4000-8000-000000000014';

async function prepare(page, connected = true) {
  await page.addInitScript(() => {
    const viewport = new EventTarget();
    Object.assign(viewport, { height: innerHeight, offsetTop: 0, scale: 1 });
    Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });
    window.keyboardViewport = (height, offsetTop = 0) => {
      Object.assign(viewport, { height, offsetTop });
      viewport.dispatchEvent(new Event('resize'));
      viewport.dispatchEvent(new Event('scroll'));
    };
  });
  await page.route('**/api/auth/**', route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/token') ? { token: 'isolated-token' } : {
    user: connected ? { id: accountId, email: 'keyboard@example.test', name: 'Keyboard Test' } : null,
    session: connected ? { id: 'keyboard-session', expiresAt: '2099-01-01T00:00:00Z' } : null,
  } }));
  await page.route('**/api/records*', route => route.fulfill({ json: { records: [], next: null } }));
}

async function keyboard(page, height = 360, top = 54) {
  await page.evaluate(({ height, top }) => window.keyboardViewport(height, top), { height, top });
  await expect(page.locator('html')).toHaveClass(/app-viewport/);
  await expect(page.locator('[data-keyboard=true]')).toHaveCount(1);
  await expect.poll(() => page.locator('[data-viewport-locked=true]').evaluate(el => el.getBoundingClientRect().height)).toBeCloseTo(height, 0);
}

async function swipe(page, selector, delta, fingers = 1) {
  return page.locator(selector).evaluate((target, { delta, fingers }) => {
    const points = y => Array.from({ length: fingers }, (_, identifier) => new Touch({ identifier, target, clientX: 180 + identifier * 40, clientY: y }));
    target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: points(200) }));
    const move = new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: points(200 - delta) });
    target.dispatchEvent(move);
    target.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [] }));
    return move.defaultPrevented;
  }, { delta, fingers });
}

async function expectAnchored(page, top = 54, height = 360) {
  const state = await page.evaluate(() => {
    const shell = document.querySelector('[data-viewport-locked=true]').getBoundingClientRect();
    const nav = document.querySelector('.bottom-nav')?.getBoundingClientRect();
    return { top: shell.top, bottom: shell.bottom, navBottom: nav?.bottom, scrollY };
  });
  expect(state.top).toBeCloseTo(top, 0);
  expect(state.bottom).toBeCloseTo(top + height, 0);
  if (state.navBottom !== undefined) expect(state.navBottom).toBeCloseTo(top + height, 0);
  expect(state.scrollY).toBe(0);
}

for (const [path, label] of [
  ['/new/task', 'Title'], ['/new/note', 'Your note'], ['/new/event', 'Location (optional)'],
  ['/new/reminder', 'Title'], ['/new/expense', 'Amount in Philippine pesos'],
  ['/library', 'Search saved entries'], ['/setup', 'Your name'], ['/finn', 'Ask Finn a question'],
]) {
  test(`Keyboard keeps ${path} anchored during drags over content and navigation`, async ({ page }, testInfo) => {
    await prepare(page);
    await page.goto(path);
    const input = page.getByRole('textbox', { name: label, exact: true });
    await expect(input).toBeVisible();
    await input.focus();
    await keyboard(page);
    await input.fill(path === '/new/expense' ? '12' : 'Keyboard draft');
    await expectAnchored(page);
    if (path !== '/setup') {
      expect(await swipe(page, '.topbar', 140)).toBe(true);
      expect(await swipe(page, '.bottom-nav', -140)).toBe(true);
    }
    const content = path === '/finn' ? '.chat-content' : '#main';
    await page.locator(content).evaluate(el => { el.scrollTop = 0; });
    expect(await swipe(page, content, -100)).toBe(true);
    expect(await page.locator(content).evaluate(el => el.scrollTop)).toBe(0);
    expect(await swipe(page, content, 100)).toBe(true);
    const scrollable = await page.locator(content).evaluate(el => el.scrollHeight > el.clientHeight);
    if (scrollable) expect(await page.locator(content).evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    await page.locator(content).evaluate(el => { el.scrollTop = el.scrollHeight; });
    expect(await swipe(page, content, 140)).toBe(true);
    expect(await swipe(page, path === '/setup' ? '.auth-page h1' : '.bottom-nav', 100, 2)).toBe(false);
    await expectAnchored(page);
    await input.evaluate(el => el.blur());
    await input.focus();
    await expect(input).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath('keyboard.png') });
    await page.evaluate(() => window.keyboardViewport(844));
    if (path !== '/finn') {
      await expect(page.locator('html')).not.toHaveClass(/app-viewport/);
      expect(await swipe(page, '#main', 100)).toBe(false);
      expect(await page.locator('body').evaluate(el => getComputedStyle(el).position)).toBe('static');
    }
  });
}

test('Sign-up inputs stay usable and the account form scrolls inside the keyboard viewport', async ({ page }, testInfo) => {
  await prepare(page, false);
  await page.goto('/auth/signup');
  await page.getByRole('textbox', { name: 'Email', exact: true }).focus();
  await keyboard(page);
  await expectAnchored(page);
  expect(await swipe(page, '.auth-page h1', 120)).toBe(true);
  expect(await page.locator('#main').evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await page.getByLabel('Password', { exact: true }).focus();
  await expect(page.getByLabel('Password', { exact: true })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('signup-keyboard.png') });
  await page.evaluate(() => window.keyboardViewport(844));
  await expect(page.locator('html')).not.toHaveClass(/app-viewport/);
});

test('Password dialogs remain scrollable above the keyboard without moving the page', async ({ page }) => {
  await prepare(page);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Delete account and records', exact: true }).click();
  await page.getByLabel('Confirm your password').focus();
  await keyboard(page, 260, 54);
  await expectAnchored(page, 54, 260);
  const dialog = page.getByRole('dialog');
  expect((await dialog.boundingBox()).height).toBeLessThanOrEqual(236);
  await dialog.evaluate(el => { el.scrollTop = 0; });
  expect(await swipe(page, '.dialog-heading', 80)).toBe(true);
  expect(await dialog.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await expectAnchored(page, 54, 260);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test('Browser touch drags scroll the form while navigation stays anchored', async ({ page }) => {
  await prepare(page);
  await page.goto('/new/task');
  await page.getByRole('textbox', { name: 'Title', exact: true }).focus();
  await keyboard(page, 360, 0);
  await page.locator('#main').evaluate(el => { el.scrollTop = 0; });
  const session = await page.context().newCDPSession(page);
  const drag = async (x, startY, endY) => {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: startY }] });
    for (let i = 1; i <= 5; i++) await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: [{ x, y: startY + (endY - startY) * i / 5 }],
    });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await drag(20, 280, 120);
  expect(await page.locator('#main').evaluate(el => el.scrollTop)).toBeGreaterThan(50);
  await expectAnchored(page, 0, 360);
  const nav = await page.locator('.bottom-nav').boundingBox();
  await drag(180, nav.y + 20, nav.y - 90);
  await expectAnchored(page, 0, 360);
  await page.locator('#main').evaluate(el => { el.scrollTop = el.scrollHeight; });
  await drag(20, 280, 120);
  await expectAnchored(page, 0, 360);
  await session.detach();
});

test('Rotating an editor with the keyboard open keeps landscape navigation above it', async ({ page }) => {
  await prepare(page);
  await page.goto('/new/task');
  await page.getByRole('textbox', { name: 'Title', exact: true }).focus();
  await keyboard(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await keyboard(page, 230, 20);
  await expectAnchored(page, 20, 230);
  expect(await swipe(page, '.bottom-nav', 100)).toBe(true);
  await expectAnchored(page, 20, 230);
  await page.evaluate(() => window.keyboardViewport(390));
  await expect(page.locator('html')).not.toHaveClass(/app-viewport/);
  await page.getByRole('link', { name: 'Library', exact: true }).first().click();
  await expect(page).toHaveURL(/\/library$/);
  expect(await swipe(page, '#main', 100)).toBe(false);
});
