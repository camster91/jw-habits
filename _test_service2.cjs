const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => localStorage.clear());
  await page.goto('https://jw-habits.ashbi.ca/service');
  await page.waitForTimeout(4000);
  const skip = await page.$('text=Skip');
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(500);
  const oneHour = await page.$('button:has-text("+ 1h"), button:has-text("1h")');
  console.log('+1h button:', !!oneHour);
  if (oneHour) await oneHour.click({ force: true });
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/jw-service2.png', fullPage: true });
  await browser.close();
})();
