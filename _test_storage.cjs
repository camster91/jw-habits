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
  
  const morning = await page.$('button:has-text("Morning Prayer")');
  if (morning) {
    await morning.click({ force: true });
    await page.waitForTimeout(1500);
  }
  
  const data = await page.evaluate(() => {
    const raw = localStorage.getItem('jw-progress-storage');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return raw; }
  });
  console.log('progressStore data:', JSON.stringify(data, null, 2).slice(0, 1500));
  await browser.close();
})();
