#!/usr/bin/env node
// scripts/verify/smoke.cjs
//
// Automated smoke test for Faithful Days. Fast, seeded checks that the build
// boots and that its storage rules hold; journeys.cjs drives the full UI.
//
//   S1: a first run renders onboarding with no console errors
//   S2: a v1 install (old jw- keys) is migrated and its check-in survives
//   S3: an unreadable v2 store is kept aside and the app starts fresh
//   S4: a check-in does not carry into the next app day
//   S5: the app day rolls over at 03:00, not midnight
//   S6: nothing leaves the origin (no third-party content)
//   S7: the stored store survives a reload
//
// Time is pinned with page.clock, so every date below is deterministic.
//
// Run from repo root:
//   node scripts/verify/smoke.cjs                    # uses default port 4173
//   PORT=4173 node scripts/verify/smoke.cjs         # override port
//   SMOKE_BASE_URL=https://example.com node scripts/verify/smoke.cjs
//                                                    # hit a deployed copy
//
// Pre-reqs:
//   1. `npm install` (Playwright is a devDependency)
//   2. `npx playwright install chromium` (one-time browser install)
//   3. If hitting local: `npm run build` first, then either:
//      - `npm run preview &` (then run this script), OR
//      - the script can spawn preview itself with `SPAWN_PREVIEW=1`
//
// Exits 0 on success, 1 on any failure.

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const lib = require('./lib.cjs');

const BASE_URL =
  process.env.SMOKE_BASE_URL ||
  `http://localhost:${process.env.PORT || 4173}`;

// Tracks the actual port vite preview landed on (may differ from PORT
// env if the requested port was in use).
let ACTIVE_PORT = process.env.PORT || 4173;

const results = [];
let pass = 0,
  fail = 0;

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? '[PASS]' : '[FAIL]'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const DAY1 = new Date(2026, 9, 6, 10, 0); // Tuesday 6 Oct 2026, 10:00

async function open(browser, at) {
  const s = await lib.openPage(browser, { at, viewport: { width: 375, height: 812 } });
  await lib.go(s.page, BASE_URL);
  return s;
}

const pressed = (page, name) => lib.routineButton(page, name).getAttribute('aria-pressed');

async function runSmoke(browser) {
  // Release UI language must match document speech even with legacy detection preferences.
  for (const locale of ['es-ES', 'fr-FR']) {
    const { ctx, page, errors } = await lib.openPage(browser, { at: DAY1, locale });
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'fr'));
    await lib.go(page, BASE_URL);
    await lib.onboardSkip(page);
    const htmlLanguage = await page.locator('html').getAttribute('lang');
    const english = await lib.routineButton(page, 'Daily text').isVisible();
    const legacyKept = await page.evaluate(() => localStorage.getItem('i18nextLng') === 'fr');
    record(`English initial release under ${locale}`, htmlLanguage === 'en' && english && legacyKept && errors.length === 0);
    await ctx.close();
  }

  // ---- S1: a first run renders onboarding with no console errors ----
  {
    const { ctx, page, errors } = await open(browser, DAY1);
    const onboarding = await page.getByTestId('onboarding').isVisible();
    await page.waitForTimeout(500);
    record(
      'S1: First run shows onboarding without console errors',
      onboarding && errors.length === 0,
      `onboarding=${onboarding}${errors.length ? ` errors: ${errors.slice(0, 2).join(' | ')}` : ''}`,
    );
    await ctx.close();
  }

  // ---- S2: v1 keys are migrated; the v1 keys themselves are left alone ----
  {
    const { ctx, page } = await lib.openPage(browser, {
      at: DAY1,
      viewport: { width: 375, height: 812 },
    });
    await page.goto(BASE_URL);
    // The first load already saved a fresh v2 store; remove it so only v1 data remains.
    await page.evaluate((key) => {
      localStorage.removeItem(key);
      localStorage.setItem(
        'jw-daily-habits-state',
        JSON.stringify({
          date: '2026-10-06',
          done: { text: { done: true, note: '' }, bible: false },
          history: ['2026-10-06'],
        }),
      );
    }, lib.STORE_KEY);
    await page.reload({ waitUntil: 'networkidle' });
    let ok = false;
    let detail = '';
    try {
      await page.getByTestId('today').waitFor({ timeout: 5000 });
      const state = await pressed(page, 'Daily text');
      const v1Kept = await page.evaluate(() => !!localStorage.getItem('jw-daily-habits-state'));
      ok = state === 'true' && v1Kept;
      detail = `dailyText pressed=${state} v1KeyKept=${v1Kept}`;
    } catch (e) {
      detail = String(e.message).slice(0, 160);
    }
    record('S2: v1 data migrates (Today shows the old check-in; v1 keys kept)', ok, detail);
    await ctx.close();
  }

  // ---- S3: an unreadable v2 store is kept aside, the app starts fresh ----
  {
    const { ctx, page } = await lib.openPage(browser, {
      at: DAY1,
      viewport: { width: 375, height: 812 },
    });
    await page.goto(BASE_URL);
    await page.evaluate(
      (key) => localStorage.setItem(key, '{not json'),
      lib.STORE_KEY,
    );
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const result = await page.evaluate((key) => {
      const keys = Object.keys(localStorage);
      const corrupt = keys.find((k) => k.startsWith(key + '-corrupt-'));
      return { corrupt: corrupt ? localStorage.getItem(corrupt) : null };
    }, lib.STORE_KEY);
    const onboarding = await page.getByTestId('onboarding').isVisible();
    record(
      'S3: Unreadable store is preserved under -corrupt- and onboarding starts',
      result.corrupt === '{not json' && onboarding,
      `copy=${JSON.stringify(result.corrupt)} onboarding=${onboarding}`,
    );
    await ctx.close();
  }

  // ---- S4 + S5 + S7 share one install: check in on Tue 6 Oct at 10:00 ----
  {
    const { ctx, page } = await open(browser, DAY1);
    await lib.onboardSkip(page);
    await lib.hold(page, lib.routineButton(page, 'Daily text'));
    const saved = await lib.storeWhere(page, (x) => x.log.length > 0);

    // S7: the store is in localStorage, and a reload shows the same state.
    await page.reload({ waitUntil: 'networkidle' });
    const after = await pressed(page, 'Daily text');
    record(
      'S7: Stored store survives a reload',
      !!saved && saved.onboardingDone && after === 'true',
      `entries=${saved ? saved.log.length : 'none'} pressed=${after}`,
    );

    // S5: 02:00 on the 7th is still the 6th (wrap-up is showing, so open the list).
    await page.clock.setSystemTime(new Date(2026, 9, 7, 2, 0));
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Show routines' }).click();
    const before3 = await pressed(page, 'Daily text');
    record(
      'S5: Before 03:00 the app day is still yesterday (check-in still shown)',
      before3 === 'true',
      `pressed=${before3}`,
    );

    // S4: 03:30 is the 7th. The 6th's check-in does not count today.
    await page.clock.setSystemTime(new Date(2026, 9, 7, 3, 30));
    await page.reload({ waitUntil: 'networkidle' });
    const next = await pressed(page, 'Daily text');
    record(
      'S4: A check-in does not carry into the next app day (reset at 03:00)',
      next === 'false',
      `pressed=${next}`,
    );
    await ctx.close();
  }

  // ---- S6: nothing leaves the origin ----
  {
    const { ctx, page, external } = await open(browser, DAY1);
    await lib.onboardSkip(page);
    await page.waitForTimeout(500);
    record(
      'S6: No third-party requests (no third-party content shipped)',
      external.length === 0,
      external.slice(0, 3).join(', '),
    );
    await ctx.close();
  }
}

async function maybeSpawnPreview() {
  if (!process.env.SPAWN_PREVIEW && !process.argv.includes('--spawn')) return null;
  console.log(`[smoke] --spawn, spawning \`npm run preview\`...`);
  const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'preview'], {
    shell: process.platform === 'win32',
    cwd: path.resolve(__dirname, '..', '..'),
    stdio: ['ignore', 'pipe', 'pipe'],
    // Own process group, so the cleanup below can stop vite as well as
    // the npm wrapper. Killing only npm left vite holding the pipes and
    // the script never exited.
    detached: true,
  });
  // Wait for the server to be ready (preview prints a "Local:" line)
  return new Promise((resolve, reject) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) reject(new Error('preview server did not start within 30s'));
    }, 30000);
    child.stdout.on('data', (chunk) => {
      const s = chunk.toString();
      process.stdout.write(`[preview] ${s}`);
      // Match "Local:   http://localhost:NNNN" — vite preview may pick
      // a different port if the requested one is in use. Strip ANSI
      // colour codes first: with CI=true vite colours the line and
      // splits it ("Local\x1b[22m:", "localhost:\x1b[1m4173").
      // eslint-disable-next-line no-control-regex
      const plain = s.replace(/\x1b\[[0-9;]*m/g, '');
      const m = plain.match(/Local:\s+https?:\/\/localhost:(\d+)/i);
      if (!resolved && m) {
        ACTIVE_PORT = Number(m[1]);
        resolved = true;
        clearTimeout(timer);
        setTimeout(() => resolve(child), 500);
      }
    });
    child.stderr.on('data', (chunk) => process.stderr.write(`[preview-err] ${chunk}`));
    child.on('exit', (code) => {
      if (!resolved) reject(new Error(`preview exited with code ${code} before being ready`));
    });
  });
}

(async () => {
  let previewProcess = null;
  if (!process.env.SMOKE_BASE_URL) {
    previewProcess = await maybeSpawnPreview();
  }
  // Health-check the base URL before running. ACTIVE_PORT may have
  // changed if SPAWN_PREVIEW had to pick a different port.
  const probeUrl = process.env.SMOKE_BASE_URL || `http://localhost:${ACTIVE_PORT}`;
  try {
    const probe = await fetch(probeUrl);
    if (!probe.ok) throw new Error(`HTTP ${probe.status}`);
  } catch (e) {
    console.error(`[smoke] Cannot reach ${probeUrl}: ${e.message}`);
    console.error(`[smoke] Did you run \`npm run build && npm run preview\` first, or set SPAWN_PREVIEW=1?`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  try {
    await runSmoke(browser);
  } finally {
    await browser.close();
    if (previewProcess) {
      try {
        process.kill(process.platform === 'win32' ? previewProcess.pid : -previewProcess.pid, 'SIGTERM');
      } catch {
        previewProcess.kill('SIGTERM');
      }
    }
  }

  console.log(`\n[smoke] ${pass} passed, ${fail} failed (${results.length} total)`);
  if (fail > 0) {
    console.log('\nFailures:');
    results.filter((r) => !r.ok).forEach((r) => console.log(`  - ${r.name}: ${r.detail}`));
    process.exit(1);
  }
  process.exit(0);
})().catch((e) => {
  console.error('[smoke] Fatal:', e);
  process.exit(1);
});
