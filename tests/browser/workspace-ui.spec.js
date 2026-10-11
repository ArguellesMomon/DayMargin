import { test, expect } from '@playwright/test';

async function preview(page) {
  await page.clock.setFixedTime(new Date('2026-10-11T01:30:00Z'));
  await page.addInitScript(() => sessionStorage.setItem('daymargin-preview', 'true'));
  await page.route('**/api/auth/**', route => route.fulfill({ json: { user: null, session: null } }));
  await page.goto('/library');
  await expect(page.getByRole('heading', { name: 'Your library.', exact: true })).toBeVisible();
}

test('Library keeps filters through details, editing, reload and clearing search', async ({ page }) => {
  await preview(page);
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await page.getByLabel('Tag', { exact: true }).selectOption('Personal');
  await expect(page).toHaveURL(/tag=Personal/);
  await expect(page.locator('.entry-row')).toHaveCount(1);
  await page.getByRole('link', { name: /A few ideas for the weekend/ }).click();
  await page.getByRole('link', { name: 'Edit entry', exact: true }).click();
  await page.getByLabel('Title (optional)').fill('Weekend plans, revised');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await page.getByRole('link', { name: 'Back to library', exact: true }).click();
  await expect(page).toHaveURL(/filter=notes&tag=Personal/);
  await expect(page.getByLabel('Tag', { exact: true })).toHaveValue('Personal');
  await page.reload(); await expect(page.locator('.entry-row')).toHaveCount(1);
  await page.getByRole('textbox', { name: 'Search saved entries' }).fill('no-entry-like-this');
  await expect(page.getByRole('heading', { name: 'No matching entries.' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).first().click();
  await expect(page.locator('.entry-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'Expenses', exact: true }).click();
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await page.locator('.category-breakdown').getByRole('button', { name: /Food/ }).click();
  await expect(page).toHaveURL(/category=Food/);
  await page.reload();
  await expect(page.locator('.category-breakdown').getByRole('button', { name: /Food/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: 'Ask Finn about spending' }).click();
  await expect(page.getByRole('textbox', { name: 'Ask Finn a question' })).toHaveValue('Summarize my recorded spending from 2026-10-11 to 2026-10-11.');
});

test('Secondary entry options persist, hidden validation opens the section, and deletion still supports undo', async ({ page }) => {
  await preview(page); await page.goto('/new/note');
  await expect(page.locator('.editor-extras')).not.toHaveAttribute('open');
  await page.getByLabel('Title (optional)').fill('A private thought');
  await page.getByLabel('Your note', { exact: true }).fill('# A good start\nKeep the next step small.');
  await page.locator('.editor-extras > summary').click();
  await page.getByLabel('Tags (optional)').fill('Personal, Focus');
  await page.getByLabel('Pin this note').check();
  await page.getByLabel('Exclude this entry from Finn').check();
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByText('Excluded from Finn', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ask Finn', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Edit entry', exact: true }).click();
  await expect(page.locator('.editor-extras')).toHaveAttribute('open');
  await expect(page.getByLabel('Tags (optional)')).toHaveValue('Personal, Focus');
  await page.getByLabel('Tags (optional)').fill('1,2,3,4,5,6,7,8,9');
  await page.locator('.editor-extras > summary').click();
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.locator('.editor-extras')).toHaveAttribute('open');
  await expect(page.locator('.field-error')).toBeVisible();
  await page.getByLabel('Tags (optional)').fill('Personal');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete entry', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search saved entries' }).fill('A private thought');
  await expect(page.locator('.entry-row')).toHaveCount(1);
});

test('All organizer screens fit both themes and the Finn composer stays above mobile navigation', async ({ page }) => {
  test.setTimeout(120000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await preview(page);
  const recordPath = await page.locator('.entry-content').first().getAttribute('href');
  for (const theme of ['Light', 'Dark']) {
    await page.goto('/settings'); await page.getByRole('button', { name: theme, exact: true }).click();
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      for (const path of ['/library', '/library?filter=tasks', '/library?filter=notes', '/library?filter=expenses', '/new/task', '/new/event', '/new/reminder', '/new/note', '/new/expense', recordPath, '/settings', '/finn']) {
        await page.goto(path); await expect(page.locator('h1')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${theme}, ${width}, ${path}`).toBe(true);
        if (path === '/finn' && width < 700) {
          await expect(page.locator('.finn-welcome .finn-avatar')).toBeInViewport();
          const composer = await page.locator('.chat-composer').boundingBox();
          const navigation = await page.getByRole('navigation', { name: 'Mobile navigation' }).boundingBox();
          expect(composer.y + composer.height).toBeLessThanOrEqual(navigation.y);
        }
      }
    }
  }
  expect(errors).toEqual([]);
});

test('Setup presents the fixed defaults and persists the selected appearance without completing a real account', async ({ page }) => {
  await page.route('**/api/auth/**', route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/token') ? { token: 'isolated-token' } : {
    user: { id: '10000000-0000-4000-8000-000000000009', email: 'setup@example.test', name: 'Setup Test' }, session: { id: 'setup-ui-test', expiresAt: '2099-01-01T00:00:00Z' },
  } }));
  await page.route('**/api/records*', route => route.fulfill({ json: { records: [], next: null } }));
  await page.goto('/setup');
  await expect(page.getByRole('heading', { name: 'A few simple defaults.' })).toBeVisible();
  await expect(page.locator('.defaults-list')).toContainText('PHP · Philippine peso');
  await expect(page.locator('.defaults-list')).toContainText('Asia/Manila');
  await page.getByLabel('Appearance').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.getByLabel('Appearance')).toHaveValue('dark');
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('Finn sources and proposal review stay readable and cancelling never applies a change', async ({ page }) => {
  await page.route('**/api/auth/**', route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/token') ? { token: 'isolated-token' } : {
    user: { id: '10000000-0000-4000-8000-000000000010', email: 'review@example.test', name: 'Review Test' }, session: { id: 'review-ui-test', expiresAt: '2099-01-01T00:00:00Z' },
  } }));
  const id = '40000000-0000-4000-8000-000000000001';
  const record = { type: 'note', title: 'A source with a long title '.repeat(5), body: 'The proposal needs one more review.', date: '', start: '', end: '', allDay: false,
    location: '', amountCents: null, category: 'Other', tags: [], pinned: false, excluded: false, completed: false, completedDates: [], recurrence: 'none', reminderAt: '', exceptions: {} };
  await page.route('**/api/records*', route => route.fulfill({ json: { records: [{ id, version: 1, deleted: false, created_at: '2026-10-11T00:00:00Z', updated_at: '2026-10-11T00:00:00Z', data: record }], next: null } }));
  await page.route('**/api/finn', route => route.fulfill({ json: { answer: 'A small step is enough, bro. Give the proposal one final review.\n\nYour saved note is a good place to start.', sources: [id], action: { kind: 'create', proposalId: 'isolated-proposal', data: { type: 'task', title: 'Review the proposal', date: '2026-10-12', body: 'One final pass.', excluded: false } } } }));
  let applied = 0;
  await page.route('**/api/apply', route => { applied++; return route.fulfill({ json: { recordId: id } }); });
  await page.setViewportSize({ width: 360, height: 844 });
  await page.goto('/finn'); await expect(page.locator('.save-status')).toHaveText('Synced');
  await page.getByRole('textbox', { name: 'Ask Finn a question' }).fill('Help me with the proposal.');
  await page.getByRole('button', { name: 'Send question to Finn' }).click();
  await expect(page.locator('.source-links > a')).toHaveAttribute('href', `/record/${id}`);
  await page.getByRole('button', { name: 'Review proposed change' }).click();
  const dialog = page.getByRole('dialog', { name: 'Review the change' });
  await expect(dialog).toContainText('2026-10-12');
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0); expect(applied).toBe(0);
  await expect(page.getByRole('button', { name: 'Review proposed change' })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Welcome and account forms fit mobile and desktop; password visibility and error recovery work without a live account', async ({ page }) => {
  test.setTimeout(90000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/auth/**', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 401, json: { message: 'Test sign-in could not be completed.', code: 'INVALID_EMAIL_OR_PASSWORD' } })
    : route.fulfill({ json: { user: null, session: null } }));
  await page.goto('/welcome');
  await expect(page.getByRole('heading', { name: 'Your day, kept in order.' })).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise(resolve => { const request = indexedDB.open('daymargin-v1', 1); request.onsuccess = () => resolve(request.result); });
    const tx = db.transaction('preferences', 'readwrite'); tx.objectStore('preferences').put({ theme: 'dark', reducedMotion: true }, 'appearance');
    await new Promise(resolve => { tx.oncomplete = resolve; }); db.close();
  });
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ['/welcome', '/auth/signup', '/auth/signin', '/auth/reset', '/auth/update']) {
      await page.goto(path); await expect(page.locator('h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}, ${path}`).toBe(true);
    }
  }
  await page.goto('/auth/signin');
  await page.getByLabel('Email', { exact: true }).fill('design@example.test');
  await page.getByLabel('Password', { exact: true }).fill('test-password-only');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password' }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('design@example.test');
  expect(errors).toEqual([]);
});
