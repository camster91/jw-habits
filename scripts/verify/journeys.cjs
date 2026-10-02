#!/usr/bin/env node
// scripts/verify/journeys.cjs
//
// End-to-end user journeys against a running build. Unlike smoke.cjs
// (which seeds localStorage directly), this drives the real UI: open
// Settings, type a link, watch the rows pick it up, tap a checkbox,
// reload, and confirm the state survived.
//
// Run:
//   npm run build && npm run preview &
//   node scripts/verify/journeys.cjs
//
// Exits 1 if any journey fails.

const { chromium } = require('playwright');
const BASE = 'http://localhost:4173';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('jw-')).forEach(k => localStorage.removeItem(k)));
  await page.reload({ waitUntil: 'networkidle' });

  let failed = 0;
  const step = (n, ok, d) => {
    if (!ok) failed += 1;
    console.log(`[${ok ? 'PASS' : 'FAIL'}] ${n}${d ? ' — ' + d : ''}`);
  };

  // J1: open settings, save a link, confirm the row picks it up
  await page.getByRole('button', { name: /settings/i }).click().catch(() => {});
  await page.waitForTimeout(200);
  const panelVisible = await page.locator('#settings-panel').isVisible().catch(() => false);
  step('J1 settings panel opens', panelVisible);

  const primary = page.locator('#link-primary');
  if (await primary.isVisible().catch(() => false)) {
    await primary.fill('https://example.com/daily');
    await page.waitForTimeout(300);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('jw-user-settings') || '{}').links);
    step('J2 primary link saves', stored && stored.primary === 'https://example.com/daily', JSON.stringify(stored));
  } else {
    step('J2 primary link field present', false, 'input #link-primary not visible');
  }

  // J3: the row now points at the saved link
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => h.startsWith('http')));
  step('J3 saved link reaches the rows', hrefs.some((h) => h.includes('example.com')), hrefs.slice(0, 4).join(', '));

  // J4: invalid link is rejected, with a visible notice
  await page.getByRole('button', { name: /settings/i }).click().catch(() => {});
  await page.waitForTimeout(200);
  const p2 = page.locator('#link-primary');
  if (await p2.isVisible().catch(() => false)) {
    await p2.fill('not a url');
    await page.waitForTimeout(400);
    const warned = await page.getByText(/not look like a valid|sera ignorado|sera ignor/i).first().isVisible().catch(() => false);
    step('J4 invalid link shows a notice', warned);
    await p2.fill('');
    await page.waitForTimeout(200);
  }

  // J5: check a row, reload, still checked
  const firstBox = page.locator('button[aria-pressed]').first();
  await firstBox.click();
  await page.waitForTimeout(250);
  const pressedBefore = await firstBox.getAttribute('aria-pressed');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const pressedAfter = await page.locator('button[aria-pressed]').first().getAttribute('aria-pressed');
  step('J5 done state survives reload', pressedBefore === 'true' && pressedAfter === 'true', `${pressedBefore} -> ${pressedAfter}`);

  // J6: no console errors across the journey
  step('J6 no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  await browser.close();
  console.log(`\n[journeys] ${failed === 0 ? 'all journeys passed' : failed + ' journey(s) failed'}`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((err) => {
  console.error('[journeys] crashed:', err && err.message);
  process.exit(1);
});
