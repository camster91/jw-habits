const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0, 200)));
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => localStorage.setItem('jw-habits-onboarded', 'true'));
  await page.goto('https://jw-habits.ashbi.ca/statistics');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/tmp/jw-statistics.png', fullPage: true });
  const body = await page.textContent('body');
  console.log('Page content length:', body.length);
  console.log('Has "Statistics" or "Stats":', /stat|streak/i.test(body));
  console.log('Errors:', errors.length);
  errors.forEach(e => console.log(' -', e));
  await browser.close();
})();
