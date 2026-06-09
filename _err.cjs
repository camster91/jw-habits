const { chromium } = require('playwright');
async function go() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => process.stderr.write('PAGEERR: ' + e.message + '\n  STACK: ' + e.stack.slice(0, 500) + '\n'));
  page.on('console', m => { if (m.type() === 'error') process.stderr.write('CONSOLE: ' + m.text().slice(0, 400) + '\n'); });

  await page.goto('https://jw-habits.ashbi.ca/?bust=errtest');
  await page.waitForTimeout(5000);
  await browser.close();
}
go().catch(e => process.stderr.write('FATAL: ' + e.message + '\n'));
