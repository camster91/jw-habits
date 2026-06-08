const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0, 200)));
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => localStorage.clear());
  await page.goto('https://jw-habits.ashbi.ca/goals');
  await page.waitForTimeout(4000);
  const skip = await page.$('text=Skip');
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/jw-goals.png', fullPage: true });
  // Look for various button labels
  for (const txt of ['Add Goal', 'Add', 'New Goal', '+', 'Add new goal', 'Add Project']) {
    const b = await page.$(`button:has-text("${txt}")`);
    if (b) console.log(`Found button: "${txt}"`);
  }
  // Look for any buttons at all
  const allBtns = await page.$$eval('button', els => els.map(e => e.textContent?.trim()?.slice(0, 30)).filter(Boolean));
  console.log('All buttons on /goals:', allBtns);
  console.log('Errors:', errors.length);
  await browser.close();
})();
