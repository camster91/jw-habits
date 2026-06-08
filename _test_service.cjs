const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0, 300)));
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => localStorage.clear());
  await page.goto('https://jw-habits.ashbi.ca/service');
  await page.waitForTimeout(4000);
  await page.screenshot({ path: '/tmp/jw-service.png', fullPage: true });
  const allBtns = await page.$$eval('button', els => els.map(e => e.textContent?.trim()?.slice(0, 30)).filter(Boolean));
  console.log('Service buttons:', allBtns);
  console.log('Errors:', errors.length);
  errors.forEach(e => console.log(' ', e));
  await browser.close();
})();
