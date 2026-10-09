#!/usr/bin/env node
// Real built worker, controlled response revision; no backend or user content.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { onboardSkip, hold, routineButton, STORE_KEY } = require('./lib.cjs');
const WORKSPACE_KEY = 'faithful-days-workspace-v1';
let generation = 1;
const root = path.resolve('dist');
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  let file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory())
    file = path.join(root, 'index.html');
  const type =
    {
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.html': 'text/html',
      '.webmanifest': 'application/manifest+json',
      '.json': 'application/json',
      '.png': 'image/png',
      '.webp': 'image/webp',
    }[path.extname(file)] || 'application/octet-stream';
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', 'no-store');
  const bytes = fs.readFileSync(file);
  res.end(
    pathname === '/sw.js'
      ? Buffer.concat([bytes, Buffer.from(`\n// test worker generation ${generation}\n`)])
      : bytes
  );
});
(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ locale: 'en-CA', serviceWorkers: 'allow' });
    await context.addInitScript(() => {
      delete window.BeforeInstallPromptEvent;
    });
    const page = await context.newPage();
    await page.clock.install({ time: new Date(2026, 9, 6, 10) });
    await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(
      await page.evaluate(() => 'BeforeInstallPromptEvent' in window),
      false,
      'test must run without install-prompt support'
    );
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    assert.equal(
      await page.getByText('New version available', { exact: true }).count(),
      0,
      'first install must not claim an update'
    );
    console.log('SW first install ready');
    await onboardSkip(page);
    await hold(page, routineButton(page, 'Daily text'));
    await page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key))?.log.length > 0,
      STORE_KEY
    );
    const saved = await page.evaluate((key) => localStorage.getItem(key), STORE_KEY);
    assert.ok(JSON.parse(saved).log.length > 0, 'completed routine persisted');
    console.log('Testing offline navigation');
    await context.setOffline(true);
    for (const name of ['welcome', 'plans', 'notes']) {
      const artwork = await page.evaluate(async (url) => {
        const response = await fetch(url);
        const bitmap = await createImageBitmap(await response.blob());
        return { ok: response.ok, width: bitmap.width, height: bitmap.height };
      }, `/illustrations/${name}.webp`);
      assert.ok(artwork.ok && artwork.width > 0 && artwork.height > 0, `${name} artwork is decodable offline`);
    }
    console.log('All original illustrations available offline');
    await page.goto(`${base}/plans`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Plans', exact: true }).waitFor();
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), STORE_KEY),
      saved,
      'offline navigation retained all stored state'
    );
    await page.goto(`${base}/share?text=offline%20capture`, { waitUntil: 'domcontentloaded' });
    await page.getByText('offline capture', { exact: true }).waitFor();
    // First visits to these lazy screens are offline: their chunks must be precached.
    await page.goto(`${base}/notes`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Notes', exact: true }).waitFor();
    await page.getByRole('button', { name: 'New note', exact: true }).click();
    await page.getByLabel('Title', { exact: true }).fill('Offline practice idea');
    await page
      .getByLabel('Your note', { exact: true })
      .fill('A fabricated note saved without network access.');
    await page.getByLabel('Tags (separate with commas)', { exact: true }).fill('offline, practice');
    await page.getByRole('button', { name: 'Save note', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.goto(`${base}/plans/preparation`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Prepare ahead', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Add meeting', exact: true }).click();
    await page
      .getByRole('heading', { name: 'Midweek meeting · 2026-10-06', exact: true })
      .waitFor();
    await page.getByLabel('Spiritual Gems', { exact: true }).check();
    await page.getByText('1 of 6 sections prepared', { exact: true }).waitFor();
    await page.getByLabel('Assignment title', { exact: true }).fill('Offline introduction');
    await page
      .getByLabel(/^Preparation checklist \(one item per line\)/)
      .fill('Choose the main point\nPractise');
    await page.getByRole('button', { name: 'Add assignment', exact: true }).click();
    await page.getByRole('heading', { name: 'Offline introduction', exact: true }).waitFor();
    await page.getByLabel('Choose the main point', { exact: true }).check();
    await page.waitForFunction(
      (key) => JSON.parse(localStorage.getItem(key))?.assignments[0]?.tasks[0]?.done,
      WORKSPACE_KEY
    );
    const workspaceSaved = await page.evaluate((key) => localStorage.getItem(key), WORKSPACE_KEY);
    const parsed = JSON.parse(workspaceSaved);
    assert.equal(parsed.notes[0].body, 'A fabricated note saved without network access.');
    assert.deepEqual(parsed.notes[0].tags, ['offline', 'practice']);
    assert.deepEqual(parsed.meetings[0].prepared, ['Spiritual Gems']);
    assert.equal(parsed.assignments[0].tasks[1].done, false);
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), STORE_KEY),
      saved,
      'offline workspace activity must not create routine check-ins'
    );
    console.log('First offline lazy Notes/preparation visits and durable workspace edits passed.');
    const assertWorkspace = async (label) =>
      assert.equal(
        await page.evaluate((key) => localStorage.getItem(key), WORKSPACE_KEY),
        workspaceSaved,
        label
      );
    const verifyWorkspaceScreens = async () => {
      await page.goto(`${base}/notes`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Offline practice idea', exact: true }).waitFor();
      await page.goto(`${base}/plans/preparation`, { waitUntil: 'domcontentloaded' });
      await page.getByText('1 of 6 sections prepared', { exact: true }).waitFor();
      await page.getByRole('heading', { name: 'Offline introduction', exact: true }).waitFor();
      assert.equal(
        await page.getByLabel('Choose the main point', { exact: true }).isChecked(),
        true
      );
      await assertWorkspace('offline navigation/reload retains workspace bytes');
      assert.equal(
        await page.evaluate((key) => localStorage.getItem(key), STORE_KEY),
        saved,
        'workspace navigation retains routine bytes'
      );
    };
    await page.reload({ waitUntil: 'domcontentloaded' });
    await verifyWorkspaceScreens();
    await context.setOffline(false);
    await page.goto(base, { waitUntil: 'networkidle' });
    console.log('Testing waiting worker update');
    generation = 2;
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg.update();
    });
    await page.getByText('New version available', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => !!navigator.serviceWorker.controller), true);
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), STORE_KEY),
      saved,
      'waiting update did not replace user state'
    );
    await assertWorkspace('waiting update did not replace workspace bytes');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.getByRole('button', { name: 'Update', exact: true }).click(),
    ]);
    console.log('Testing offline navigation');
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByTestId('today').waitFor();
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), STORE_KEY),
      saved,
      'activated update and offline reload retained state'
    );
    await verifyWorkspaceScreens();
    console.log(
      'Activated update retained both stores exactly; offline Notes/preparation remain usable.'
    );
    await context.setOffline(false);
    const newerRaw = JSON.stringify(
      { ...JSON.parse(saved), version: 4, futureNotes: ['Synthetic note'] },
      null,
      2
    );
    await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), {
      key: STORE_KEY,
      raw: newerRaw,
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Update Faithful Days to open your data' }).waitFor();
    generation = 3;
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg.update();
    });
    await page.getByText('New version available', { exact: true }).waitFor();
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.getByRole('button', { name: 'Update', exact: true }).click(),
    ]);
    await page.getByRole('heading', { name: 'Update Faithful Days to open your data' }).waitFor();
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Update Faithful Days to open your data' }).waitFor();
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), STORE_KEY),
      newerRaw,
      'recovery update and offline reload retained unknown newer data exactly'
    );
    await assertWorkspace('newer routine recovery preserves the separate workspace');
    console.log(
      'Recovery worker update without install-prompt support retained newer routine data and workspace.'
    );
    await context.setOffline(false);
    const newerWorkspace = JSON.stringify(
      { ...parsed, version: 99, futureField: 'Fabricated future workspace' },
      null,
      2
    );
    await page.evaluate(
      ({ routineKey, routineRaw, workspaceKey, workspaceRaw }) => {
        localStorage.setItem(routineKey, routineRaw);
        localStorage.setItem(workspaceKey, workspaceRaw);
      },
      {
        routineKey: STORE_KEY,
        routineRaw: saved,
        workspaceKey: WORKSPACE_KEY,
        workspaceRaw: newerWorkspace,
      }
    );
    await page.goto(`${base}/notes`, { waitUntil: 'networkidle' });
    await page
      .getByRole('button', { name: 'Export original notes and preparation', exact: true })
      .waitFor();
    assert.equal(
      await page.getByRole('button', { name: 'New note', exact: true }).isDisabled(),
      true,
      'unsupported workspace must not become writable'
    );
    generation = 4;
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg.update();
    });
    await page.getByText('New version available', { exact: true }).waitFor();
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.getByRole('button', { name: 'Update', exact: true }).click(),
    ]);
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    const exportButton = page.getByRole('button', {
      name: 'Export original notes and preparation',
      exact: true,
    });
    await exportButton.waitFor();
    const [download] = await Promise.all([page.waitForEvent('download'), exportButton.click()]);
    assert.equal(
      fs.readFileSync(await download.path(), 'utf8'),
      newerWorkspace,
      'offline recovery exports exact unknown workspace bytes'
    );
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), WORKSPACE_KEY),
      newerWorkspace,
      'recovery update retains unknown workspace bytes'
    );
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), STORE_KEY),
      saved,
      'workspace recovery retains routine bytes'
    );
    assert.equal(
      await page.getByRole('button', { name: 'New note', exact: true }).isDisabled(),
      true,
      'offline recovery remains read-only'
    );
    console.log(
      'Unknown workspace survived update/offline reload and exported byte-exactly without altering routines.'
    );
    console.log(
      'SW install, offline lazy Share/Notes/preparation, durable edits, update activation and both-store recovery passed.'
    );
    await context.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
