import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mkdir('.local/qa', { recursive: true });
  await page.goto('http://127.0.0.1:5173'); await page.getByRole('button', { name: 'Explore Daymargin' }).click();
  await page.getByRole('heading', { name: 'A little room for today.' }).waitFor(); await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: '.local/qa/today-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.screenshot({ path: '.local/qa/today-desktop.png', fullPage: true });
  await page.goto('http://127.0.0.1:5173/settings'); await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await page.goto('http://127.0.0.1:5173/finn'); await page.getByRole('heading', { name: 'Finn', exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: '.local/qa/finn-dark-mobile.png', fullPage: true });
  console.log('Saved mobile, desktop, and dark Finn screenshots in .local/qa.');
} finally { await browser.close(); }
