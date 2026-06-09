const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERR:', e.message.slice(0, 200), '\n  STACK:', e.stack?.slice(0, 500)));
  // Onboarded user — Onboarding should NOT show
  await page.goto('https://jw-habits.ashbi.ca/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('jw-habits-onboarded', 'true');
  });
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);
  const hasError = await page.$('text=Something went wrong');
  console.log('ErrorBoundary shown (onboarded):', !!hasError);
  await browser.close();
})();
