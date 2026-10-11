import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1,
  use: { baseURL: process.env.DAYMARGIN_TEST_URL || 'http://127.0.0.1:5174', viewport: { width: 390, height: 844 },
    launchOptions: { channel: 'msedge' }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  reporter: 'list',
});
