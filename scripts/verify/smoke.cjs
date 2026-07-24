#!/usr/bin/env node
// scripts/verify/smoke.cjs
//
// Automated smoke test for jw-habits. Complements the persona suite at
// scripts/verify/jw-habits.cjs (T1-T17) — this one focuses on the
// regressions caught in the 2026-07-22 repo review:
//
//   S1: Per-day reset works (state from yesterday doesn't carry over)
//   S2: Done state persists across page reload
//   S3: P0-4 regression — a row with only a typed note (done: false,
//       note: 'abc') does NOT count as done in the streak counter
//   S4: Legacy boolean done shape (`true`/`false`) still works
//       (backward compat with users on the old data shape)
//   S5: New `{ done: boolean, note: string }` shape works end-to-end
//   S6: First-launch hint hides after first checkbox tap
//   S7: Home renders without console errors
//
// Run from repo root:
//   node scripts/verify/smoke.cjs                    # uses default port 4173
//   PORT=4173 node scripts/verify/smoke.cjs         # override port
//   SMOKE_BASE_URL=https://jwhabits.ashbi.ca node scripts/verify/smoke.cjs
//                                                    # hit prod instead of local
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

async function freshContext(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 812 }, // iPhone-ish
    ignoreHTTPSErrors: true,
    serviceWorkers: 'block', // SW would interfere with state-reset tests
  });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push('PAGEERR: ' + e.message.slice(0, 200)));
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push('CONSOLE: ' + m.text().slice(0, 200));
  });
  return { ctx, page, consoleErrors };
}

async function wipeJWState(page) {
  await page.goto(BASE_URL);
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('jw-'))
      .forEach((k) => localStorage.removeItem(k));
  });
}

async function setTodayDone(page, doneShape) {
  // Seed the localStorage state directly so we don't depend on UI interaction
  // for every test. `doneShape` is the inner `done` object (e.g. {text: true}
  // for legacy, or {text: {done: true, note: ''}} for new shape).
  const today = new Date().toISOString().slice(0, 10);
  await page.evaluate(
    ({ today, doneShape }) => {
      localStorage.setItem(
        'jw-daily-habits-state',
        JSON.stringify({
          date: today,
          done: doneShape,
          history: [today],
        }),
      );
      localStorage.setItem('jw-habits-first-done', '1'); // skip first-launch hint
    },
    { today, doneShape },
  );
}

async function runSmoke(browser) {
  // ---- S7: Home renders without console errors ----
  {
    const { page, consoleErrors } = await freshContext(browser);
    await wipeJWState(page);
    await page.reload();
    // Give React a tick to mount and any async work to settle
    await page.waitForTimeout(500);
    record(
      'S7: Home renders without console errors',
      consoleErrors.length === 0,
      consoleErrors.length ? `${consoleErrors.length} errors: ${consoleErrors.slice(0, 2).join(' | ')}` : '',
    );
    await page.context().close();
  }

  // ---- S1: Per-day reset (state from yesterday doesn't carry over) ----
  {
    const { page } = await freshContext(browser);
    const debugLog = [];
    page.on('console', m => debugLog.push(m.text()));
    await page.goto(BASE_URL);
    // Seed yesterday's state with a checked habit.
    // Compute yesterday as a calendar date, not Date.now()-86400000 —
    // around midnight UTC the millisecond math can land on today's
    // date and the per-day reset never triggers.
    const todayDate = new Date();
    const yesterdayDate = new Date(todayDate.getTime() - 24 * 60 * 60 * 1000);
    // If the subtraction crossed midnight in UTC, step back another day
    // to be safe (defensive — the math above is usually correct).
    if (yesterdayDate.toISOString().slice(0, 10) === todayDate.toISOString().slice(0, 10)) {
      yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
    }
    const yesterday = yesterdayDate.toISOString().slice(0, 10);
    await page.evaluate((yesterday) => {
      localStorage.setItem(
        'jw-daily-habits-state',
        JSON.stringify({
          date: yesterday,
          done: { text: true, bible: true },
          history: [yesterday],
        }),
      );
    }, yesterday);
    const stateBeforeReload = await page.evaluate(() => {
      const raw = localStorage.getItem('jw-daily-habits-state');
      return raw ? JSON.parse(raw) : null;
    });
    await page.reload();
    // Wait a beat for React mount + visibility listener + any
    // other async microtask that might mutate localStorage.
    await page.waitForTimeout(800);
    // After reload, today's date is different so done should be wiped.
    // history is pruned to last 7 days, so yesterday's entry survives there.
    const state = await page.evaluate(() => {
      const raw = localStorage.getItem('jw-daily-habits-state');
      return raw ? JSON.parse(raw) : null;
    });
    const today = new Date().toISOString().slice(0, 10);
    const todayReset =
      state &&
      state.date === today &&
      Object.keys(state.done).length === 0;
    record(
      'S1: Per-day reset wipes yesterday\'s done state',
      todayReset,
      todayReset
        ? ''
        : `beforeReload=${JSON.stringify(stateBeforeReload).slice(0, 100)} | afterReload=${JSON.stringify(state).slice(0, 200)}`,
    );
    await page.context().close();
  }

  // ---- S2: Done state persists across reload ----
  {
    const { page } = await freshContext(browser);
    await wipeJWState(page);
    await setTodayDone(page, { text: { done: true, note: '' } });
    await page.reload();
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('jw-daily-habits-state')));
    const ok = state && state.done.text && state.done.text.done === true;
    record(
      'S2: Done state persists across reload (new shape)',
      ok,
      ok ? '' : `done.text after reload: ${JSON.stringify(state?.done?.text)}`,
    );
    await page.context().close();
  }

  // ---- S3: P0-4 regression — note-only row does NOT count as done ----
  // This is the bug fixed in commit 9cf40aa. Before the fix, streak.js
  // did `if (done[k])` which is truthy on `{done: false, note: 'abc'}`
  // and falsely counted the row as done.
  {
    const { page } = await freshContext(browser);
    await wipeJWState(page);
    await setTodayDone(page, {
      text: { done: true, note: '' },
      bible: { done: false, note: 'in progress' }, // note-only — must NOT count
      meeting: { done: false, note: '' },
      family: { done: false, note: '' },
      today: { done: false, note: '' },
      thisWeek: { done: false, note: '' },
      yearText: { done: false, note: '' },
      sundayWatchtower: { done: false, note: '' },
      conventions: { done: false, note: '' },
    });
    await page.reload();
    // Find the today-progress text rendered in the streak line. After
    // hiding the first-launch hint and showing the streak meta, it reads
    // something like "1/9 today" (1 done out of 9 visible rows).
    const progressText = await page
      .getByText(/\d+\/\d+\s*today/i)
      .first()
      .textContent()
      .catch(() => null);
    const m = progressText && progressText.match(/(\d+)\/(\d+)/);
    const ok = m && Number(m[1]) === 1;
    record(
      'S3: Note-only row (done:false, note:"in progress") does NOT count as done',
      ok,
      ok ? `progress text: "${progressText}"` : `expected "1/X" got: "${progressText}"`,
    );
    await page.context().close();
  }

  // ---- S4: Legacy boolean shape still works ----
  // Users on the old data shape have `done: { text: true }` (boolean, not object).
  // The isDone() helper in doneState.js must normalize this to {done: true, note: ''}.
  {
    const { page } = await freshContext(browser);
    await wipeJWState(page);
    await setTodayDone(page, {
      text: true,           // LEGACY: bare boolean
      bible: true,          // LEGACY
      meeting: false,
      family: false,
      today: false,
      thisWeek: false,
      yearText: false,
      sundayWatchtower: false,
      conventions: false,
    });
    await page.reload();
    const progressText = await page
      .getByText(/\d+\/\d+\s*today/i)
      .first()
      .textContent()
      .catch(() => null);
    const m = progressText && progressText.match(/(\d+)\/(\d+)/);
    const ok = m && Number(m[1]) === 2;
    record(
      'S4: Legacy boolean done shape (true/false) still counts correctly',
      ok,
      ok ? `progress text: "${progressText}"` : `expected "2/X" got: "${progressText}"`,
    );
    await page.context().close();
  }

  // ---- S5: New shape with notes round-trips correctly ----
  {
    const { page } = await freshContext(browser);
    await wipeJWState(page);
    const noteText = 'morning devotion reminder';
    await setTodayDone(page, {
      text: { done: true, note: noteText },
      bible: { done: true, note: '' },
      meeting: { done: true, note: 'midweek prep' },
    });
    await page.reload();
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('jw-daily-habits-state')),
    );
    const ok =
      stored?.done?.text?.done === true &&
      stored?.done?.text?.note === noteText &&
      stored?.done?.meeting?.note === 'midweek prep';
    record(
      'S5: New {done, note} shape round-trips through localStorage',
      ok,
      ok ? '' : `stored: ${JSON.stringify(stored?.done).slice(0, 200)}`,
    );
    await page.context().close();
  }

  // ---- S6: First-launch hint hides after first checkbox tap ----
  {
    const { page } = await freshContext(browser);
    await wipeJWState(page);
    await page.goto(BASE_URL);
    await page.waitForTimeout(300);
    const hintBefore = await page
      .getByText(/tap a row to open jw\.org/i)
      .first()
      .isVisible()
      .catch(() => false);
    // Tap any checkbox — the first one on the page is sufficient.
    const firstCheckbox = page.locator('button[aria-pressed]').first();
    if (await firstCheckbox.isVisible().catch(() => false)) {
      await firstCheckbox.click();
      await page.waitForTimeout(200);
    }
    const hintAfter = await page
      .getByText(/tap a row to open jw\.org/i)
      .first()
      .isVisible()
      .catch(() => false);
    record(
      'S6: First-launch hint visible before first tap, hidden after',
      hintBefore && !hintAfter,
      `before=${hintBefore} after=${hintAfter}`,
    );
    await page.context().close();
  }
}

async function maybeSpawnPreview() {
  if (!process.env.SPAWN_PREVIEW) return null;
  console.log(`[smoke] SPAWN_PREVIEW=1, spawning \`npm run preview\`...`);
  const child = spawn('npm', ['run', 'preview'], {
    cwd: path.resolve(__dirname, '..', '..'),
    stdio: ['ignore', 'pipe', 'pipe'],
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
      // a different port if the requested one is in use.
      const m = s.match(/Local:\s+https?:\/\/localhost:(\d+)/i);
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
      previewProcess.kill('SIGTERM');
    }
  }

  console.log(`\n[smoke] ${pass} passed, ${fail} failed (${results.length} total)`);
  if (fail > 0) {
    console.log('\nFailures:');
    results.filter((r) => !r.ok).forEach((r) => console.log(`  - ${r.name}: ${r.detail}`));
    process.exit(1);
  }
})().catch((e) => {
  console.error('[smoke] Fatal:', e);
  process.exit(1);
});
