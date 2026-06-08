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
  
  // Click Ch. 46, 47, 48
  for (const ch of ['Ch. 46', 'Ch. 47', 'Ch. 48']) {
    const b = await page.$(`button:has-text("${ch}")`);
    if (b) { await b.click({ force: true }); await page.waitForTimeout(800); }
  }
  
  const storage = await page.evaluate(() => {
    const raw = localStorage.getItem('jw-progress-storage');
    if (!raw) return 'no storage';
    const parsed = JSON.parse(raw);
    return JSON.stringify(parsed.state?.bibleChapters, null, 2);
  });
  console.log('bibleChapters after clicking Ch 46/47/48:');
  console.log(storage);
  
  // Reload and verify
  await page.reload();
  await page.waitForTimeout(4000);
  const storage2 = await page.evaluate(() => {
    const raw = localStorage.getItem('jw-progress-storage');
    return JSON.parse(raw).state?.bibleChapters;
  });
  console.log('After reload, bibleChapters:', JSON.stringify(storage2, null, 2));
  
  await browser.close();
})();
