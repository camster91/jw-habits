const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => localStorage.clear());
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);
  const skip = await page.$('text=Skip');
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(500);
  
  // Click each prayer with 1500ms wait
  for (const label of ['Morning Prayer', 'Afternoon Prayer', 'Evening Prayer']) {
    const b = await page.$(`button:has-text("${label}")`);
    if (b) { 
      await b.click({ force: true }); 
      await page.waitForTimeout(1500); 
      const gam = await page.evaluate(() => JSON.parse(localStorage.getItem('jw-gamification-storage') || '{}')?.state);
      console.log(`After ${label}: points=${gam?.points}, prayerStreak=${gam?.prayerStreak}, prayersCompleted=${gam?.prayersCompleted}`);
    }
  }
  
  await browser.close();
})();
