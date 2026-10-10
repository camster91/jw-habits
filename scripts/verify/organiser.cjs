#!/usr/bin/env node
// Real UI, isolated fabricated records; no native or publisher content assertions.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { AxeBuilder } = require('@axe-core/playwright');
const { launchBrowser, openPage, go } = require('./lib.cjs');
const BASE = process.env.ORGANISER_BASE_URL || 'http://localhost:4173';
const output = process.env.ORGANISER_EVIDENCE_DIR;
const at = new Date(2026, 9, 10, 10);
async function saved(page, predicate) {
  await page.waitForFunction(predicate);
}
async function scan(page, label) {
  const violations = (
    await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
  ).violations;
  assert.equal(violations.length, 0, `${label}: ${JSON.stringify(violations)}`);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
    false,
    `${label}: horizontal overflow`
  );
}
async function add(page, kind, title) {
  await page
    .getByRole('region', { name: 'Calendar and tasks' })
    .getByRole('button', { name: 'Add', exact: true })
    .click();
  await page.getByRole('button', { name: kind, exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill(title);
}
async function save(page, kind) {
  await page.getByRole('button', { name: `Save ${kind}`, exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
}
(async () => {
  const browser = await launchBrowser();
  try {
    for (const width of [320, 390, 768])
      for (const theme of ['light', 'dark']) {
        const { page, ctx, errors, external } = await openPage(browser, {
          at,
          viewport: { width, height: 844 },
        });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        try {
          await go(page, BASE);
          await page.getByRole('button', { name: 'Get started', exact: true }).click();
          await page.getByRole('switch', { name: 'Personal study', exact: true }).uncheck();
          await page
            .getByRole('button', { name: 'Start with these routines', exact: true })
            .click();
          await page.getByTestId('today').waitFor();
          await saved(page, () => JSON.parse(localStorage.getItem('jw-habits-v2')).onboardingDone);
          assert.equal(
            await page.evaluate(
              () => JSON.parse(localStorage.getItem('jw-habits-v2')).reading.plan
            ),
            'ownPace'
          );
          await scan(page, `${width} ${theme} Today`);
          await page.getByRole('link', { name: 'Plan', exact: true }).click();
          await add(page, 'Event', 'Synthetic Saturday meeting');
          await page.getByText('Time, recurrence & details', { exact: true }).click();
          await page.getByLabel('Time (optional)', { exact: true }).fill('17:00');
          await page.getByLabel('Time zone', { exact: true }).fill('America/Toronto');
          await page.getByRole('combobox', { name: 'Repeat', exact: true }).selectOption('weekly');
          await scan(page, `${width} ${theme} event editor`);
          await save(page, 'event');
          await page.getByRole('button', { name: /Synthetic Saturday meeting/ }).click();
          await page.getByRole('button', { name: 'Add preparation task', exact: true }).click();
          await page.getByLabel('Title', { exact: true }).fill('Synthetic prepare reading');
          await save(page, 'task');
          await page.getByRole('button', { name: /^Synthetic prepare reading/ }).click();
          await page.getByRole('link', { name: 'Add linked note', exact: true }).click();
          await page.getByLabel('Your note', { exact: true }).fill('Synthetic question to revisit');
          await scan(page, `${width} ${theme} linked note editor`);
          await save(page, 'note');
          await page.getByRole('button', { name: 'Create task from note', exact: true }).click();
          await save(page, 'task');
          await page.getByRole('link', { name: 'Plan', exact: true }).click();
          await page.getByRole('button', { name: 'Tasks', exact: true }).click();
          await page.getByRole('combobox', { name: 'Task view', exact: true }).selectOption('All');
          await page
            .getByRole('button', { name: 'Complete Synthetic prepare reading', exact: true })
            .click();
          await saved(page, () =>
            JSON.parse(localStorage.getItem('faithful-days-organiser-v1')).exceptions.some(
              (e) => e.status === 'done'
            )
          );
          await page.getByRole('button', { name: 'Undo', exact: true }).click();
          await saved(
            page,
            () =>
              JSON.parse(localStorage.getItem('faithful-days-organiser-v1')).exceptions.length === 0
          );
          await page
            .getByRole('button', { name: 'Complete Synthetic prepare reading', exact: true })
            .click();
          await saved(page, () =>
            JSON.parse(localStorage.getItem('faithful-days-organiser-v1')).exceptions.some(
              (e) => e.status === 'done'
            )
          );
          await page.reload({ waitUntil: 'networkidle' });
          await page.getByRole('button', { name: 'Tasks', exact: true }).click();
          await page.getByRole('combobox', { name: 'Task view', exact: true }).selectOption('All');
          await page
            .getByRole('button', { name: 'Reopen Synthetic prepare reading', exact: true })
            .waitFor();
          await scan(page, `${width} ${theme} saved task list`);
          if (output) {
            fs.mkdirSync(output, { recursive: true });
            await page.screenshot({ path: path.join(output, `tasks-${theme}-${width}.png`) });
          }
          await page.getByRole('button', { name: 'Settings', exact: true }).click();
          await page.getByRole('button', { name: 'Go to Backup', exact: true }).click();
          const downloading = page.waitForEvent('download');
          await page.getByRole('button', { name: 'Export a backup', exact: true }).click();
          const backupPath = await (await downloading).path();
          const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
          assert.equal(backup.format, 'faithful-days-organiser-backup');
          assert.equal(backup.organiser.tasks.length, 2);
          assert.equal(backup.organiser.events.length, 1);
          assert.equal(backup.workspace.notes.length, 1);
          assert.equal(backup.organiser.relations.length, 3);
          await page.locator('input[type=file]').setInputFiles(backupPath);
          await page.getByRole('button', { name: 'Replace', exact: true }).click();
          await page.getByRole('dialog').waitFor({ state: 'hidden' });
          await saved(
            page,
            () =>
              JSON.parse(localStorage.getItem('faithful-days-restore-journal-v1')).status ===
              'complete'
          );
          assert.equal(
            await page.evaluate(
              () => JSON.parse(localStorage.getItem('faithful-days-organiser-v1')).tasks.length
            ),
            2
          );
          assert.equal(
            await page.evaluate(() => JSON.parse(localStorage.getItem('jw-habits-v2')).log.length),
            0
          );
          assert.deepEqual(errors, []);
          assert.deepEqual(external, []);
          console.log(
            `[PASS] ${width}px ${theme}: connected event/task/note, recurrence, completion/Undo/reload, full backup restore and accessibility`
          );
        } finally {
          await ctx.close();
        }
      }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
