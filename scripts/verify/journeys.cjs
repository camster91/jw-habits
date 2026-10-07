#!/usr/bin/env node
// scripts/verify/journeys.cjs
//
// End-to-end user journeys against a running build of Faithful Days. They
// drive the real UI (no seeded storage) with the page clock pinned, so the
// day, the 03:00 rollover and the evening wrap-up are deterministic.
//
//   J1  onboarding, full path (every step, with edits)
//   J2  onboarding, skip path (defaults)
//   J3  hold to check, reload, undo
//   J4  switch a routine off in Settings
//   J5  rename a routine
//   J6  the ministry toggle
//   J7  the wrap-up card at 21:00
//   J8  no console errors or third-party requests across all of the above
//
// Run:
//   npm run build && npm run preview &
//   node scripts/verify/journeys.cjs        # PORT or JOURNEYS_BASE_URL to override
//
// Exits 1 if any journey fails.

const { launchBrowser, openPage, go, hold, storeWhere, onboardSkip, routineButton } = require('./lib.cjs');

const BASE = process.env.JOURNEYS_BASE_URL || `http://localhost:${process.env.PORT || 4173}`;
const MORNING = new Date(2026, 9, 6, 10, 0); // Tuesday 6 Oct 2026, 10:00
const EVENING = new Date(2026, 9, 6, 21, 0); // after the default 20:00 wrap-up

let failed = 0;
const step = (name, ok, detail) => {
  if (!ok) failed += 1;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ' — ' + detail : ''}`);
};

/** Run one journey; a thrown error (a missing element, a timeout) is a FAIL. */
async function journey(name, browser, opts, body, sink) {
  const session = await openPage(browser, opts);
  try {
    await go(session.page, BASE);
    await body(session.page);
  } catch (e) {
    step(name, false, String(e.message).split('\n')[0]);
  }
  sink.errors.push(...session.errors);
  sink.external.push(...session.external);
  await session.ctx.close();
}

const lastSchedule = (s) => s.schedule[s.schedule.length - 1];

const openSettings = async (page) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('dialog').waitFor();
};
const closeSettings = async (page) => {
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
};

(async () => {
  const browser = await launchBrowser();
  const sink = { errors: [], external: [] };

  // J1: every onboarding step, changing something on the way.
  await journey(
    'J1 onboarding (full path)',
    browser,
    { at: MORNING },
    async (page) => {
      await page.getByRole('heading', { name: 'Welcome to Faithful Days' }).waitFor();
      await page.getByRole('button', { name: 'Get started' }).click();
      // Routines: switch Personal study off.
      await page.getByRole('switch', { name: 'Personal study' }).uncheck();
      await page.getByRole('button', { name: 'Next' }).click();
      // Week: pick Wednesday (weekday 3) as the midweek meeting day.
      await page.getByRole('heading', { name: 'Your week' }).waitFor();
      await page.getByRole('button', { name: 'Wednesday', exact: true }).click();
      await page.getByRole('button', { name: 'Next' }).click();
      await page.getByRole('heading', { name: 'Your reading' }).waitFor();
      await page.getByRole('button', { name: 'Next' }).click();
      await page.getByRole('heading', { name: 'Your rhythm' }).waitFor();
      await page.getByRole('button', { name: 'Next' }).click();
      await page.getByRole('heading', { name: 'Your look' }).waitFor();
      await page.getByRole('button', { name: 'Start my first day' }).click();
      await page.getByTestId('today').waitFor();
      const s = await storeWhere(page, (x) => x.onboardingDone);
      const sched = s && lastSchedule(s);
      step(
        'J1 full onboarding reaches Today with the choices saved',
        !!s &&
          sched.enabled.personalStudy === false &&
          sched.meetingDays.length === 1 &&
          sched.meetingDays[0] === 3,
        s
          ? JSON.stringify({ study: sched.enabled.personalStudy, days: sched.meetingDays })
          : 'no store'
      );
      step(
        'J1 the switched-off routine is not on Today',
        (await routineButton(page, 'Personal study').count()) === 0
      );
    },
    sink
  );

  // J2: skipping every step keeps the defaults.
  await journey(
    'J2 onboarding (skip path)',
    browser,
    { at: MORNING },
    async (page) => {
      await onboardSkip(page);
      const s = await storeWhere(page, (x) => x.onboardingDone);
      const sched = s && lastSchedule(s);
      step(
        'J2 skipping every step lands on Today with the defaults',
        !!s &&
          sched.enabled.dailyText === true &&
          sched.enabled.personalStudy === true &&
          sched.meetingDays.length === 0,
        s ? '' : 'no store'
      );
      step(
        'J2 Today lists the daily text and Bible reading',
        (await routineButton(page, 'Daily text').count()) === 1 &&
          (await routineButton(page, 'Bible reading').count()) === 1
      );
    },
    sink
  );

  // J3: hold completes, it survives a reload, a tap undoes.
  await journey(
    'J3 hold to check and undo',
    browser,
    { at: MORNING },
    async (page) => {
      await onboardSkip(page);
      const check = routineButton(page, 'Daily text');
      // A quick press must not complete it.
      await check.dispatchEvent('pointerdown');
      await page.waitForTimeout(100);
      await check.dispatchEvent('pointerup');
      step(
        'J3 a short press does not check',
        (await check.getAttribute('aria-pressed')) === 'false'
      );
      await hold(page, check);
      await page.waitForFunction(
        () => document.querySelector('button[aria-pressed="true"]') !== null
      );
      step('J3 holding checks the routine', (await check.getAttribute('aria-pressed')) === 'true');
      await storeWhere(page, (x) => x.log.length > 0);
      await page.reload({ waitUntil: 'networkidle' });
      step(
        'J3 the check survives a reload',
        (await routineButton(page, 'Daily text').getAttribute('aria-pressed')) === 'true'
      );
      await routineButton(page, 'Daily text').click();
      step(
        'J3 a tap undoes it',
        (await routineButton(page, 'Daily text').getAttribute('aria-pressed')) === 'false'
      );
      const s = await storeWhere(page, (x) => x.log.length === 0);
      step('J3 the undo is saved', !!s && s.log.length === 0, s ? '' : 'no store');
    },
    sink
  );

  // J4: a routine switched off in Settings leaves Today.
  await journey(
    'J4 switch a routine off',
    browser,
    { at: MORNING },
    async (page) => {
      await onboardSkip(page);
      await openSettings(page);
      // Scoped to the Routines section: Reminders has a 'Daily text' switch too.
      await page
        .getByRole('dialog')
        .getByRole('region', { name: 'Routines' })
        .getByRole('switch', { name: 'Daily text' })
        .uncheck();
      await closeSettings(page);
      step(
        'J4 the routine is gone from Today',
        (await routineButton(page, 'Daily text').count()) === 0
      );
      const s = await storeWhere(page, (x) => lastSchedule(x).enabled.dailyText === false);
      step('J4 the change is saved', !!s && lastSchedule(s).enabled.dailyText === false);
    },
    sink
  );

  // J5: a renamed routine shows its new name on Today and after a reload.
  await journey(
    'J5 rename a routine',
    browser,
    { at: MORNING },
    async (page) => {
      await onboardSkip(page);
      await openSettings(page);
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: 'Rename Daily text' }).click();
      const field = dialog.getByRole('textbox', { name: 'Name for Daily text' });
      await field.fill('Morning verse');
      await field.blur();
      await closeSettings(page);
      step(
        'J5 Today shows the new name',
        (await routineButton(page, 'Morning verse').count()) === 1
      );
      await storeWhere(page, (x) => x.labels.dailyText === 'Morning verse');
      await page.reload({ waitUntil: 'networkidle' });
      step(
        'J5 the new name survives a reload',
        (await routineButton(page, 'Morning verse').count()) === 1 &&
          (await routineButton(page, 'Daily text').count()) === 0
      );
    },
    sink
  );

  // J6: the ministry toggle records this month's service.
  await journey(
    'J6 ministry toggle',
    browser,
    { at: MORNING },
    async (page) => {
      await onboardSkip(page);
      const name = 'Shared in the ministry this month';
      await page.getByRole('checkbox', { name }).check();
      const s = await storeWhere(page, (x) => x.log.some((e) => e.routine === 'ministry'));
      step(
        'J6 toggling ministry saves an entry',
        !!s && s.log.some((e) => e.routine === 'ministry'),
        s ? '' : 'no store'
      );
      await page.reload({ waitUntil: 'networkidle' });
      step(
        'J6 the ministry toggle survives a reload',
        await page.getByRole('checkbox', { name }).isChecked()
      );
    },
    sink
  );

  // J7: at 21:00 the wrap-up card replaces the list; the list can be reopened.
  await journey(
    'J7 wrap-up at 21:00',
    browser,
    { at: EVENING },
    async (page) => {
      await onboardSkip(page);
      await page.getByRole('heading', { name: 'Your day in review' }).waitFor();
      step('J7 the wrap-up card shows at 21:00', true);
      step(
        'J7 the routine list is hidden behind it',
        (await routineButton(page, 'Daily text').count()) === 0
      );
      await page.getByRole('button', { name: 'Show routines' }).click();
      step(
        'J7 Show routines brings the list back',
        (await routineButton(page, 'Daily text').count()) === 1
      );
      await page.getByRole('button', { name: 'Done for today' }).click();
      step(
        'J7 Done for today leaves the one-line summary',
        await page.getByText(/Your day in review ·/).isVisible()
      );
    },
    sink
  );

  // v5.1: real UI, no seeded store. Repeat layouts at representative widths.
  for (const width of [390, 768, 1440]) {
    await journey(
      `J9 plans, badges and sharing at ${width}px`,
      browser,
      { at: MORNING, viewport: { width, height: 900 } },
      async (page) => {
        await onboardSkip(page);
        await page.getByRole('link', { name: 'Plans', exact: true }).click();
        await page.getByRole('button', { name: 'New project', exact: true }).click();
        await page.getByLabel('Steps', { exact: true }).selectOption('bibleBook');
        await page.getByLabel('Bible book', { exact: true }).selectOption('27');
        await page.getByRole('button', { name: 'Create', exact: true }).click();
        await page.getByRole('link', { name: 'Today', exact: true }).click();
        await page.getByText('Daniel · Daniel 1', { exact: true }).waitFor();
        await hold(page, routineButton(page, 'Personal study'));
        await page.getByRole('status').filter({ hasText: 'First step' }).waitFor();
        const checked = await storeWhere(page, (store) => store.plans[0]?.steps[0]?.doneOn);
        step(
          `J9 ${width}px check-in ticks the project step`,
          Boolean(checked?.plans[0]?.steps[0]?.doneOn)
        );
        await page.getByRole('link', { name: 'Plans', exact: true }).click();
        step(
          `J9 ${width}px project shows 1 of 12`,
          await page.getByText('1 of 12', { exact: true }).isVisible()
        );
        await page.getByRole('button', { name: 'New family plan', exact: true }).click();
        await page.getByLabel('Title', { exact: true }).fill('Family study');
        await page.getByLabel('Steps', { exact: true }).selectOption('lessons');
        await page.getByLabel('How many', { exact: true }).fill('2');
        await page.getByRole('button', { name: 'Create', exact: true }).click();
        await page.locator('a[href="/plans/family"]').click();
        await page.getByTestId('week-2026-10-12').getByRole('button', { name: /^Keep/ }).click();
        const kept = await storeWhere(page, (store) => store.familyAgendas['2026-10-12']?.length);
        step(
          `J9 ${width}px next week's agenda is saved`,
          Boolean(kept?.familyAgendas['2026-10-12']?.length)
        );
        await page.clock.setSystemTime(new Date(2026, 9, 18, 10, 0));
        await page.reload();
        await page.getByRole('link', { name: 'Today', exact: true }).click();
        await hold(page, routineButton(page, 'Family worship'));
        const family = await storeWhere(page, (store) =>
          store.log.some((entry) => entry.routine === 'familyWorship' && entry.day === '2026-10-18')
        );
        step(
          `J9 ${width}px family check-in records exact steps`,
          family?.log.some(
            (entry) => entry.routine === 'familyWorship' && entry.value.stepIds?.length > 0
          )
        );
        await page.getByRole('link', { name: 'Progress', exact: true }).click();
        await openSettings(page);
        await page.getByRole('switch', { name: 'Show points and levels', exact: true }).uncheck();
        await closeSettings(page);
        step(
          `J9 ${width}px hidden points keep the garden`,
          (await page.getByText(/XP$/).count()) === 0 &&
            (await page.getByRole('img', { name: /Your garden:/ }).isVisible())
        );
        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Share card', exact: true }).first().click();
        const download = await downloadPromise;
        const png = require('fs').readFileSync(await download.path());
        step(
          `J9 ${width}px share downloads a PNG`,
          png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        );
        await page.getByRole('link', { name: 'Badges', exact: true }).click();
        await page.getByRole('heading', { name: 'Badges', level: 1 }).waitFor();
        await page.locator('time').first().waitFor();
        step(
          `J9 ${width}px badge collection has an earn date`,
          (await page.locator('time').count()) > 0
        );
        step(
          `J9 ${width}px no horizontal clipping`,
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
        );
        await openSettings(page);
        await page.getByRole('switch', { name: 'Show share buttons', exact: true }).uncheck();
        await closeSettings(page);
        step(
          `J9 ${width}px sharing toggle hides buttons`,
          (await page.getByRole('button', { name: 'Share card', exact: true }).count()) === 0
        );
      },
      sink
    );
  }

  // J10: before the application loads, persisted theme wins and motion is optional.
  for (const theme of ['dark', 'light']) {
    const ctx = await browser.newContext({ locale: 'en-CA', colorScheme: theme === 'dark' ? 'light' : 'dark', reducedMotion: 'reduce' });
    await ctx.addInitScript((value) => localStorage.setItem('fd-boot-theme', value), theme);
    const page = await ctx.newPage();
    await page.route('**/*.js', route => route.abort());
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    const boot = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, background: getComputedStyle(document.documentElement).backgroundColor, motion: getComputedStyle(document.getElementById('root'), '::after').animationName, chrome: document.querySelector('meta[name="theme-color"]').content }));
    step(`J10 ${theme} startup chrome respects persisted preference`, boot.theme === theme && boot.chrome === (theme === 'dark' ? '#000000' : '#f3f4f6'));
    step(`J10 ${theme} startup has no reduced-motion spinner`, boot.motion === 'none');
    await ctx.close();
  }

  // J8: nothing went wrong, and nothing left the origin.
  step('J8 no console errors', sink.errors.length === 0, sink.errors.slice(0, 3).join(' | '));
  step(
    'J8 no third-party requests',
    sink.external.length === 0,
    sink.external.slice(0, 3).join(', ')
  );

  await browser.close();
  console.log(`\n[journeys] ${failed === 0 ? 'all journeys passed' : failed + ' check(s) failed'}`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((err) => {
  console.error('[journeys] crashed:', err && err.message);
  process.exit(1);
});
