const { chromium } = require('playwright');
async function go() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  let errors = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });

  await page.goto('https://jw-habits.ashbi.ca/?bust=split');
  await page.waitForTimeout(4000);

  // Visit every route to load all chunks
  for (const route of ['/study', '/goals', '/service', '/statistics', '/links', '/settings', '/about']) {
    await page.goto('https://jw-habits.ashbi.ca' + route);
    await page.waitForTimeout(2000);
  }
  await page.goto('https://jw-habits.ashbi.ca/?bust=back');
  await page.waitForTimeout(3000);

  process.stderr.write('Total errors after visiting 7 routes: ' + errors.length + '\n');
  errors.slice(0, 5).forEach(e => process.stderr.write('  ' + e + '\n'));

  // Read final body
  const text = await page.textContent('body');
  process.stderr.write('Has streak ring: ' + text.includes('Start your first') + '\n');
  process.stderr.write('Has Read now: ' + text.includes('Read now') + '\n');
  process.stderr.write('Has Get Started: ' + text.includes('Get Started') + '\n');

  await browser.close();
}
go().catch(e => process.stderr.write('FATAL: ' + e.message + '\n'));
