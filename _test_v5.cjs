const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto('https://jw-habits.ashbi.ca/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(4000);
  // Inspect what the state has
  const has = await page.evaluate(() => {
    const raw = localStorage.getItem('jw-progress-settings');
    if (!raw) return 'empty';
    const parsed = JSON.parse(raw);
    return {
      hasPublisherStatus: 'publisherStatus' in parsed,
      hasSetPublisherStatus: 'setPublisherStatus' in parsed,
      keys: Object.keys(parsed),
    };
  });
  console.log('Storage state:', JSON.stringify(has));
  // Click Skip — trigger the error
  const skip = await page.$('text=Skip');
  console.log('Skip button found:', !!skip);
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(2000);
  await browser.close();
})();
