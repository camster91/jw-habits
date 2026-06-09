const { chromium } = require('playwright');
async function go() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => process.stderr.write('ERR: ' + e.message + '\n  STACK: ' + (e.stack || '').slice(0, 500) + '\n'));

  for (const route of ['/', '/study', '/goals', '/service', '/statistics', '/links', '/settings', '/about']) {
    process.stderr.write('=== ' + route + ' ===\n');
    await page.goto('https://jw-habits.ashbi.ca' + route);
    await page.waitForTimeout(1500);
  }
  await browser.close();
}
go().catch(e => process.stderr.write('FATAL: ' + e.message + '\n'));
