// scripts/verify/lib.cjs
//
// Helpers shared by smoke.cjs and journeys.cjs: opening a page with the
// browser clock pinned, driving onboarding, and the hold-to-check gesture.
// Kept free of app imports: these suites drive the built UI only.

/** Real engines for the release compatibility gate; reject accidental fallback. */
async function launchBrowser() {
  const name = process.env.PLAYWRIGHT_BROWSER || 'chromium';
  if (!['chromium', 'firefox', 'webkit'].includes(name)) throw new Error(`Unsupported browser: ${name}`);
  const browser = await require('playwright')[name].launch({ headless: true });
  console.log(`Browser engine: ${name} ${browser.version()}`);
  return browser;
}

const STORE_KEY = 'jw-habits-v2';

/**
 * A fresh context and page. `at` is a Date the page clock starts from
 * (time then flows normally, so the 600 ms hold still elapses). Console and
 * page errors, and every request that leaves the origin, are collected.
 */
async function openPage(browser, { at, viewport, locale = 'en-CA' } = {}) {
  const ctx = await browser.newContext({
    locale,
    viewport: viewport || { width: 390, height: 844 },
    ignoreHTTPSErrors: true,
    serviceWorkers: 'block', // a service worker would interfere with state tests
  });
  const page = await ctx.newPage();
  const errors = [];
  const external = [];
  page.on('pageerror', (e) => errors.push('PAGEERR: ' + String(e.message).slice(0, 200)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200));
  });
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (/^https?:$/.test(u.protocol) && u.origin !== new URL(page.__base || r.url()).origin) {
      external.push(r.url());
    }
  });
  if (at) await page.clock.install({ time: at });
  return { ctx, page, errors, external };
}

async function go(page, base) {
  page.__base = base;
  await page.goto(base, { waitUntil: 'networkidle' });
}

/** Complete a hold-to-check on a button: press, wait past 600 ms, release. */
async function hold(page, button) {
  await button.scrollIntoViewIfNeeded();
  const box = await button.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(900);
  await page.mouse.up();
}

/** The stored v2 store, parsed, or null. The app saves a moment after a change. */
async function readStore(page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORE_KEY);
}

/** Wait until the stored store satisfies `pred`; returns it (or the last value). */
async function storeWhere(page, pred, ms = 3000) {
  const end = Date.now() + ms;
  let s = null;
  while (Date.now() < end) {
    s = await readStore(page);
    if (s && pred(s)) return s;
    await page.waitForTimeout(100);
  }
  return s;
}

/** Skip every step after the welcome screen, using the defaults. */
async function onboardSkip(page) {
  await page.getByRole('button', { name: 'Get started' }).click();
  for (let i = 0; i < 5; i += 1) {
    await page.getByRole('button', { name: /^Skip/ }).click();
  }
  await page.getByTestId('today').waitFor();
}

const routineButton = (page, name) => page.getByRole('button', { name, exact: true });

module.exports = {
  launchBrowser,
  STORE_KEY,
  openPage,
  go,
  hold,
  readStore,
  storeWhere,
  onboardSkip,
  routineButton,
};
