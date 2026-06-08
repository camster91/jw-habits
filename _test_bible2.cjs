const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0, 200)));
  
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => localStorage.clear());
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);
  const skip = await page.$('text=Skip');
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(500);
  
  // Find any Ch. buttons
  const allBtns = await page.$$eval('button', els => els.map(e => e.textContent?.trim()?.slice(0, 30)).filter(Boolean));
  console.log('Buttons:', allBtns.slice(0, 20));
  
  // Click Ch 1
  const ch1 = await page.$('button:has-text("Ch. 1")');
  console.log('Ch. 1 button:', !!ch1);
  if (ch1) { await ch1.click({ force: true }); await page.waitForTimeout(1000); }
  
  const storage = await page.evaluate(() => {
    const raw = localStorage.getItem('jw-progress-storage');
    if (!raw) return 'no storage';
    const parsed = JSON.parse(raw);
    return JSON.stringify(parsed.state?.bibleChapters, null, 2);
  });
  console.log('bibleChapters after click:', storage);
  console.log('Errors:', errors.length);
  errors.forEach(e => console.log(' ', e));
  await browser.close();
})();
