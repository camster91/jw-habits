#!/usr/bin/env node
// Real-build data-safety checks (#315, #317, #319), run against a preview on :4173.
//   D1: damaged routine data opens recovery untouched, exports its exact bytes,
//       survives reload, and Repair keeps the readable history.
//   D2: two tabs: a check-in in one appears in the other; a newer-version
//       write from another tab pauses saving instead of being overwritten.
//   D3: after sleep across 03:00 (timers stalled), showing the page rolls the
//       day over and a check-in lands on the new day, with or without an event.
// Set EVIDENCE_DIR to keep screenshots. Exits non-zero on any failure.
const fs = require('node:fs');
const path = require('node:path');
const { AxeBuilder } = require('@axe-core/playwright');
const { launchBrowser, openPage, go, onboardSkip, hold, readStore, storeWhere, routineButton, STORE_KEY } =
  require('./lib.cjs');

const BASE = process.env.SAFETY_BASE_URL || 'http://localhost:4173';
const EVIDENCE = process.env.EVIDENCE_DIR;
let failures = 0;
const record = (name, ok, detail = '') => {
  if (!ok) failures += 1;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ' — ' + detail : ''}`);
};

async function scan(page, label) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );
  for (const v of result.violations) console.error(label, v.id, v.nodes.map((n) => n.target));
  record(`${label}: accessibility and reflow`, result.violations.length === 0 && !overflow,
    `violations=${result.violations.length} overflow=${overflow}`);
  if (EVIDENCE) {
    fs.mkdirSync(EVIDENCE, { recursive: true });
    await page.screenshot({
      path: path.join(EVIDENCE, label.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.png'),
      fullPage: true,
    });
  }
}

const pressed = (page, name) => routineButton(page, name).getAttribute('aria-pressed');

async function d1(browser, theme, viewport, enlarged) {
  const label = `${theme} ${viewport.width}px${enlarged ? ' enlarged text' : ''}`;
  const { ctx, page, errors } = await openPage(browser, { at: new Date(2026, 9, 6, 10), viewport });
  await page.emulateMedia({ colorScheme: theme });
  await go(page, BASE);
  await onboardSkip(page);
  await hold(page, routineButton(page, 'Daily text'));
  await storeWhere(page, (s) => s.log.length > 0);
  const raw = await page.evaluate((key) => {
    const s = JSON.parse(localStorage.getItem(key));
    s.log.push({ routine: 'dailyText', day: 'not-a-day', value: true });
    const text = JSON.stringify(s);
    localStorage.setItem(key, text);
    return text;
  }, STORE_KEY);
  await page.reload({ waitUntil: 'networkidle' });
  if (enlarged) await page.addStyleTag({ content: 'html{font-size:200%}' });
  await page.getByRole('heading', { name: 'Some saved data could not be read' }).waitFor();
  await scan(page, `D1 ${label} damaged-data recovery`);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save a copy of your data' }).click();
  const copied = fs.readFileSync(await (await download).path(), 'utf8');
  await page.reload({ waitUntil: 'networkidle' });
  const stillRaw = await page.evaluate((key) => localStorage.getItem(key), STORE_KEY);
  record(`D1 ${label}: copy is byte-exact and reload leaves data untouched`,
    copied === raw && stillRaw === raw);
  await page.getByRole('button', { name: 'Repair and continue' }).click();
  await page.getByTestId('today').waitFor();
  const after = await readStore(page);
  const copy = await page.evaluate((key) => {
    const k = Object.keys(localStorage).find((x) => x.startsWith(key + '-corrupt-'));
    return k ? localStorage.getItem(k) : null;
  }, STORE_KEY);
  record(`D1 ${label}: repair keeps the readable check-in and a device copy`,
    after.log.length === 1 && (await pressed(page, 'Daily text')) === 'true' && copy === raw,
    `log=${after.log.length}`);
  record(`D1 ${label}: no console errors`, errors.length === 0, errors.join(' | '));
  await ctx.close();
}

async function d2(browser, theme) {
  const { ctx, page: a } = await openPage(browser, { at: new Date(2026, 9, 6, 10), viewport: { width: 768, height: 1024 } });
  await a.emulateMedia({ colorScheme: theme });
  await go(a, BASE);
  await onboardSkip(a);
  const b = await ctx.newPage();
  await b.clock.install({ time: new Date(2026, 9, 6, 10) });
  await b.emulateMedia({ colorScheme: theme });
  await b.goto(BASE, { waitUntil: 'networkidle' });
  await b.getByTestId('today').waitFor();
  await hold(a, routineButton(a, 'Daily text'));
  await storeWhere(a, (s) => s.log.length === 1);
  await routineButton(b, 'Daily text').and(b.locator('[aria-pressed="true"]')).waitFor({ timeout: 3000 }).catch(() => {});
  const adopted = await pressed(b, 'Daily text');
  await hold(b, routineButton(b, 'Bible reading'));
  const both = await storeWhere(b, (s) => s.log.length === 2);
  record(`D2 ${theme}: the other tab shows the check-in and keeps it when it saves`,
    adopted === 'true' && both.log.length === 2, `adopted=${adopted} entries=${both.log.length}`);
  const newer = await a.evaluate((key) => {
    const text = JSON.stringify({ ...JSON.parse(localStorage.getItem(key)), version: 4 });
    localStorage.setItem(key, text);
    return text;
  }, STORE_KEY);
  await b.getByRole('alert').filter({ hasText: 'changed in another window' }).waitFor();
  await scan(b, `D2 ${theme} 768px conflict notice`);
  await routineButton(b, 'Daily text').click();
  await b.waitForTimeout(500);
  const kept = await b.evaluate((key) => localStorage.getItem(key), STORE_KEY);
  record(`D2 ${theme}: paused tab does not overwrite the other tab's data`, kept === newer);
  await ctx.close();
}

async function d3(browser, withEvent) {
  const { ctx, page } = await openPage(browser, { at: new Date(2026, 9, 7, 2, 30), viewport: { width: 375, height: 812 } });
  await go(page, BASE);
  await onboardSkip(page);
  const before = (await readStore(page)).lastSeenDay;
  await page.clock.setSystemTime(new Date(2026, 9, 7, 9, 0));
  if (withEvent) await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(300);
  await hold(page, routineButton(page, 'Daily text'));
  if (!withEvent) {
    await page.waitForTimeout(300);
    await hold(page, routineButton(page, 'Daily text'));
  }
  const s = await storeWhere(page, (x) => x.log.length > 0);
  const days = s.log.map((e) => e.day);
  record(`D3 wake ${withEvent ? 'with visibility event' : 'without any event'}: check-in lands on the new day`,
    before === '2026-10-06' && days.length === 1 && days[0] === '2026-10-07' && s.lastSeenDay === '2026-10-07',
    `before=${before} days=${days} lastSeen=${s.lastSeenDay}`);
  await ctx.close();
}

(async () => {
  const browser = await launchBrowser();
  try {
    for (const theme of ['light', 'dark']) {
      await d1(browser, theme, { width: 375, height: 812 }, false);
      await d1(browser, theme, { width: 320, height: 800 }, true);
      await d1(browser, theme, { width: 768, height: 1024 }, false);
      await d2(browser, theme);
    }
    await d3(browser, true);
    await d3(browser, false);
  } finally {
    await browser.close();
  }
  console.log(failures ? `[data-safety] ${failures} failed` : '[data-safety] all checks passed');
  if (failures) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
