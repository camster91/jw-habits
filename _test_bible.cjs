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
  
  // Click Ch 1, Ch 2, Ch 3
  for (let i = 1; i <= 3; i++) {
    const b = await page.$(`button:has-text("Ch. ${i}")`);
    if (b) { await b.click({ force: true }); await page.waitForTimeout(800); }
  }
  await page.waitForTimeout(1500);
  
  // Check storage
  const storage = await page.evaluate(() => {
    const raw = localStorage.getItem('jw-progress-storage');
    return raw ? JSON.parse(raw) : null;
  });
  console.log('After 3 chapters clicked:');
  console.log('  bibleChapters:', JSON.stringify(storage?.state?.bibleChapters, null, 2));
  console.log('  bibleReadings:', JSON.stringify(storage?.state?.bibleReadings, null, 2));
  
  // Reload, verify
  await page.reload();
  await page.waitForTimeout(4000);
  const storage2 = await page.evaluate(() => {
    const raw = localStorage.getItem('jw-progress-storage');
    return raw ? JSON.parse(raw) : null;
  });
  console.log('\nAfter reload:');
  console.log('  bibleChapters:', JSON.stringify(storage2?.state?.bibleChapters, null, 2));
  
  // Check gamification
  const gam = await page.evaluate(() => {
    const raw = localStorage.getItem('jw-gamification-storage');
    return raw ? JSON.parse(raw) : null;
  });
  console.log('  bibleReadingsCompleted:', gam?.state?.bibleReadingsCompleted);
  console.log('  points:', gam?.state?.points);
  
  await browser.close();
})();
