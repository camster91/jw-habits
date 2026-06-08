const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => localStorage.setItem('jw-habits-onboarded', 'true'));
  await page.goto('https://jw-habits.ashbi.ca/stats');
  await page.waitForTimeout(4000);
  await page.screenshot({ path: '/tmp/jw-stats.png' });
  console.log('Screenshot saved');
  await browser.close();
})();
