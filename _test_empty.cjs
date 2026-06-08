const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('jw-habits-onboarded', 'true'); });
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);
  const text = await page.textContent('body');
  const hasEmpty = text.includes('Start your first streak today');
  const oldZeros = text.match(/0\s*days\s*current/g)?.length || 0;
  const oldStreakSection = await page.$('section.streak-records');
  console.log('Empty state shown:', hasEmpty);
  console.log('"0 days current" count:', oldZeros);
  console.log('Old streak section present:', !!oldStreakSection);
  await browser.close();
})();
