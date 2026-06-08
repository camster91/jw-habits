const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  // Bypass SW and disable cache
  await ctx.route('**/*', (route) => route.continue());
  // Also kill the SW
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) await r.unregister();
    localStorage.clear();
  });
  await page.goto('https://jw-habits.ashbi.ca/?nocache=' + Date.now());
  await page.waitForTimeout(5000);
  const skip = await page.$('text=Skip');
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(500);
  const morning = await page.$('button:has-text("Morning Prayer")');
  if (morning) await morning.click({ force: true });
  await page.waitForTimeout(1500);
  // Read what's in localStorage
  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('jw-progress-storage');
    return raw ? raw.slice(0, 400) : null;
  });
  console.log('After click, stored:', stored);
  // Reload with cache-bust
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);
  const body = await page.textContent('body');
  console.log('After reload, counter:', body.match(/(\d+)\s*\/\s*3/)?.[0]);
  await browser.close();
})();
