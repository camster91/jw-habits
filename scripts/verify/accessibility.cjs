#!/usr/bin/env node
const { AxeBuilder } = require('@axe-core/playwright');
const { launchBrowser, openPage, go, onboardSkip, hold, routineButton } = require('./lib.cjs');
const BASE = process.env.A11Y_BASE_URL || 'http://localhost:4173';
let failures = 0;
async function scan(page, label) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  for (const item of result.violations) {
    failures++;
    console.error(
      label,
      item.id,
      JSON.stringify(item.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })))
    );
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );
  if (overflow) {
    failures++;
    console.error(label, 'horizontal overflow');
  }
  console.log(`${label}: ${result.violations.length} automated violations; overflow=${overflow}`);
}
(async () => {
  const browser = await launchBrowser();
  try {
    for (const theme of ['light', 'dark']) {
      const { ctx, page } = await openPage(browser, {
        at: new Date(2026, 9, 6, 10),
        viewport: { width: 320, height: 800 },
      });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      const requests = [];
      page.on('request', (request) => requests.push(request.url()));
      await go(page, BASE);
      if (requests.some((url) => /\/Share-[^/]+\.js/.test(url))) {
        failures++;
        console.error('Share code fetched during initial startup');
      }
      await scan(page, `${theme} onboarding`);
      await page.getByRole('button', { name: 'Get started', exact: true }).click();
      for (let step = 2; step <= 6; step++) {
        await scan(page, `${theme} onboarding step ${step}`);
        let reachedNavigation = false;
        for (let tab = 0; tab < 80; tab++) {
          await page.keyboard.press('Tab');
          const focus = await page.evaluate(() => {
            const active = document.activeElement;
            const main = document.querySelector('[data-testid="onboarding"]');
            const nav = main.querySelector('[aria-label="Setup navigation"]');
            if (!main.contains(active)) return { outside: true };
            if (nav.contains(active)) return { navigation: true };
            const control = active.closest('label') ?? active;
            const box = control.getBoundingClientRect();
            return {
              bottom: box.bottom,
              footerTop: nav.getBoundingClientRect().top,
              name: active.getAttribute('aria-label') ?? active.textContent.slice(0, 80),
            };
          });
          if (focus.outside) throw new Error('Onboarding keyboard focus left its controls');
          if (focus.navigation) {
            reachedNavigation = true;
            break;
          }
          if (focus.bottom > focus.footerTop + 1)
            throw new Error(`${theme} step ${step} focus covered by footer: ${focus.name}`);
        }
        if (!reachedNavigation) throw new Error('Onboarding keyboard navigation was unreachable');

        if (step < 6) await page.getByRole('button', { name: 'Next', exact: true }).click();
      }
      for (let step = 6; step > 1; step--)
        await page.getByRole('button', { name: 'Back', exact: true }).click();
      await onboardSkip(page);
      await scan(page, `${theme} Today`);
      await page.getByText('A quick guide to Today', { exact: true }).click();
      await scan(page, `${theme} Today guide expanded`);
      await page.getByText('A quick guide to Today', { exact: true }).click();
      await hold(page, routineButton(page, 'Daily text'));
      await scan(page, `${theme} Today completed`);
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await scan(page, `${theme} Settings`);
      for (const summary of await page.getByRole('dialog').locator('details > summary').all()) {
        if (!(await summary.evaluate((el) => el.parentElement.open))) await summary.click();
      }
      await scan(page, `${theme} Settings expanded`);
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      for (const route of [
        'plans',
        'plans/preparation',
        'notes',
        'progress',
        'progress/badges',
        'share?text=Example%20shared%20text',
      ]) {
        await page.goto(`${BASE}/${route}`, { waitUntil: 'networkidle' });
        await scan(page, `${theme} ${route}`);
        if (route === 'notes') {
          await page.getByRole('button', { name: 'New note', exact: true }).click();
          await page.getByRole('button', { name: 'Save note', exact: true }).click();
          await page
            .getByRole('alert')
            .filter({ hasText: 'Add a title or a few words before saving.' })
            .waitFor();
          await scan(page, `${theme} blank-note validation`);
          await page
            .getByRole('textbox', { name: 'Your note', exact: true })
            .fill('Synthetic contrast note');
          await page.getByRole('button', { name: 'Save note', exact: true }).click();
          await page.getByRole('button', { name: 'Synthetic contrast note', exact: true }).click();
          await page.getByRole('button', { name: 'Delete note', exact: true }).click();
          await scan(page, `${theme} note deletion confirmation`);
          await page.getByRole('button', { name: 'Keep note', exact: true }).click();
          await page.getByRole('button', { name: 'Close', exact: true }).click();
          await page.getByRole('button', { name: 'Family idea', exact: true }).click();
          await page.getByRole('button', { name: 'Close', exact: true }).click();
          if (await page.getByRole('dialog').count())
            throw new Error('Untouched starter did not close');
          await page.getByRole('button', { name: 'Family idea', exact: true }).click();
          await page
            .getByRole('textbox', { name: 'Your note', exact: true })
            .fill('Synthetic edited family idea');
          await page.getByRole('button', { name: 'Close', exact: true }).click();
          await scan(page, `${theme} unsaved note close choice`);
          const keep = page.getByRole('button', { name: 'Keep editing', exact: true });
          if (!(await keep.evaluate((el) => el === document.activeElement)))
            throw new Error('Keep editing lacks focus');
          const discard = page.getByRole('button', { name: 'Discard changes', exact: true });
          const box = await discard.boundingBox();
          if (!box || box.y < 0 || box.y + box.height > 800)
            throw new Error('Discard choice is outside phone viewport');
          if (process.env.NOTES_CLOSE_EVIDENCE_DIR)
            await page.screenshot({
              path: `${process.env.NOTES_CLOSE_EVIDENCE_DIR}/note-close-${theme}.png`,
            });
          await keep.click();
          if (
            (await page.getByRole('textbox', { name: 'Your note', exact: true }).inputValue()) !==
            'Synthetic edited family idea'
          )
            throw new Error('Draft lost on Keep editing');
          await page.getByRole('button', { name: 'Close', exact: true }).click();
          await discard.click();
          if (await page.getByRole('dialog').count())
            throw new Error('Discard did not close the editor');
        }
        if (route === 'plans') {
          await page.getByRole('button', { name: 'Study & family', exact: true }).click();
          await scan(page, `${theme} study and family tools`);
        }
        const guide = page.locator('details.fd-guide summary');
        if (await guide.count()) {
          await guide.click();
          await scan(page, `${theme} ${route} guide expanded`);
          await guide.click();
        }
      }
      // Narrow screens with enlarged base text exposed clipped fixed tabs.
      // This exercises text resizing, not OS accessibility or browser zoom.
      for (const route of ['notes', 'plans', 'progress', '']) {
        await page.goto(`${BASE}/${route}`, { waitUntil: 'networkidle' });
        await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
        await scan(page, `${theme} ${route || 'Today'} enlarged text`);
        if (route === 'plans') {
          const board = page.getByRole('region', { name: 'Calendar and tasks' });
          for (const view of ['Week', 'Month', 'Tasks']) {
            await board.getByRole('button', { name: view, exact: true }).click();
            await scan(page, `${theme} ${view} enlarged text`);
          }
        }
        if (route === '') {
          const check = await routineButton(page, 'Daily text').boundingBox();
          if (!check || check.width < 44 || check.height < 44)
            throw new Error('Routine check target became too small with enlarged text');
        }
        const nav = page.getByRole('navigation', { name: 'Main navigation' });
        for (const item of await nav.locator('a, button').all()) {
          const bounds = await item.boundingBox();
          if (!bounds || bounds.x < 0 || bounds.x + bounds.width > 321 || bounds.width < 44)
            throw new Error('Enlarged-text navigation target is clipped or too narrow');
          const label = item.locator('span');
          if (await label.evaluate((el) => el.scrollWidth > el.clientWidth + 1))
            throw new Error('Enlarged-text navigation label is clipped');
        }
      }
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await scan(page, `${theme} Settings enlarged text`);
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      const routineBeforeCapture = await page.evaluate(() => localStorage.getItem('jw-habits-v2'));
      const agenda = page.getByRole('region', { name: 'Today agenda and tasks' });
      await agenda.getByRole('button', { name: 'Add', exact: true }).click();
      await page.getByRole('button', { name: 'Task', exact: true }).click();
      await page
        .getByRole('textbox', { name: 'Title', exact: true })
        .fill('Synthetic future capture');
      await page.getByLabel('Due date (optional)', { exact: true }).fill('2026-10-13');
      await page.getByRole('button', { name: 'Save task', exact: true }).click();
      await page.getByRole('status', { name: 'Saved activity' }).waitFor();
      await scan(page, `${theme} saved capture enlarged text`);
      await page.getByRole('link', { name: 'View saved task', exact: true }).click();
      const captured = page.getByRole('dialog', { name: 'Synthetic future capture', exact: true });
      await captured.waitFor();
      await scan(page, `${theme} captured task detail enlarged text`);
      await captured.getByRole('button', { name: 'Close', exact: true }).click();
      if (
        (await page.evaluate(() => localStorage.getItem('jw-habits-v2'))) !== routineBeforeCapture
      )
        throw new Error('Capturing and opening a task changed routine records');
      const newerRaw = JSON.stringify(
        { version: 4, theme, futureNotes: ['Synthetic private note'] },
        null,
        2
      );
      await page.evaluate((raw) => localStorage.setItem('jw-habits-v2', raw), newerRaw);
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Update Faithful Days to open your data' }).waitFor();
      await scan(page, `${theme} newer-data recovery`);
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Save a copy of your data' }).click();
      const download = await downloadPromise;
      const copied = require('node:fs').readFileSync(await download.path(), 'utf8');
      const saved = await page.evaluate(() => localStorage.getItem('jw-habits-v2'));
      if (copied !== newerRaw || saved !== newerRaw) {
        failures++;
        console.error(`${theme} newer-data copy changed raw bytes`);
      }
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Update Faithful Days to open your data' }).waitFor();
      if ((await page.evaluate(() => localStorage.getItem('jw-habits-v2'))) !== newerRaw) {
        failures++;
        console.error(`${theme} newer-data reload changed raw bytes`);
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  if (failures) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
