const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  
  // Fresh user simulation
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => localStorage.clear());
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/tmp/r-1-landing.png' });
  
  // Skip onboarding, see home
  const skip = await page.$('text=Skip');
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/r-2-home.png' });
  
  // Read the home page
  const homeText = await page.textContent('body');
  console.log('=== HOME PAGE TEXT (first 1500 chars) ===');
  console.log(homeText.slice(0, 1500));
  
  await browser.close();
})();
