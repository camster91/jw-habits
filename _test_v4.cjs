const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERR:', e.message.slice(0, 200)));
  // Fresh user
  await page.goto('https://jw-habits.ashbi.ca/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(4000);
  // Skip onboarding
  const skip = await page.$('text=Skip');
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(2000);
  // Check what happened
  const body = await page.textContent('body');
  console.log('Body has error:', body.includes('Something went wrong'));
  // Read the settings from localStorage
  const settings = await page.evaluate(() => localStorage.getItem('jw-progress-settings'));
  console.log('Settings localStorage:', settings ? settings.slice(0, 200) : 'null');
  await browser.close();
})();
