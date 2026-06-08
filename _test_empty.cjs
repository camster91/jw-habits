const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('jw-habits-onboarded', 'true'); });
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);
  // Force reload
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const text = await page.textContent('body');
  const hasEmpty = text.includes('Start your first streak today');
  const oldZeroDays = text.match(/0\s*days\s*current/g)?.length || 0;
  console.log('Empty state shown:', hasEmpty);
  console.log('Old "0 days current":', oldZeroDays);
  // Also check what the StreakRecords shows
  const streakSection = await page.$('section.streak-records');
  if (streakSection) {
    console.log('Streak section still rendered (old behavior)');
  } else {
    console.log('Streak section NOT rendered (new behavior)');
  }
  await browser.close();
})();
