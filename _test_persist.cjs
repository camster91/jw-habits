const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  
  // Fresh user
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => localStorage.clear());
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);
  const skip = await page.$('text=Skip');
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(500);
  
  // Click morning prayer
  const morning = await page.$('button:has-text("Morning Prayer")');
  if (morning) {
    await morning.click({ force: true });
    await page.waitForTimeout(1500);
  }
  
  // Check localStorage state
  const state1 = await page.evaluate(() => {
    return {
      progressStorage: localStorage.getItem('jw-progress-storage'),
      gamificationStorage: localStorage.getItem('jw-gamification-storage'),
    };
  });
  console.log('After click, progressStorage:');
  console.log(state1.progressStorage?.slice(0, 500));
  console.log('\ngamificationStorage:');
  console.log(state1.gamificationStorage?.slice(0, 300));

  // Now reload and check
  await page.reload();
  await page.waitForTimeout(4000);
  const body = await page.textContent('body');
  const counter = body.match(/(\d+)\s*\/\s*3/)?.[0];
  console.log('\nAfter reload, counter:', counter);

  // Check state on reload
  const state2 = await page.evaluate(() => {
    return {
      progressStorage: localStorage.getItem('jw-progress-storage'),
    };
  });
  console.log('\nAfter reload, progressStorage:');
  console.log(state2.progressStorage?.slice(0, 500));

  await browser.close();
})();
