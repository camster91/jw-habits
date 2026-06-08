const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0, 200)));
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => { localStorage.setItem('jw-habits-onboarded', 'true'); localStorage.setItem('jw-progress-storage', JSON.stringify({ state: { dailyTexts: {}, prayers: {}, bibleReadings: {}, familyWorship: {}, meetings: {}, reflections: {} }, version: 0 })); });
  await page.goto('https://jw-habits.ashbi.ca/stats');
  await page.waitForTimeout(5000);
  const cells = await page.$$eval('[class*="heatmap"], [class*="cell"], [data-cell]', els => els.length);
  console.log('Stats page heatmap-like cells:', cells);
  const body = await page.textContent('body');
  console.log('Page contains "Last 6 months" or "weeks":', /weeks|Last 6 months|activity|streak/i.test(body));
  console.log('Page errors:', errors.length);
  errors.forEach(e => console.log(' -', e));
  await browser.close();
})();
