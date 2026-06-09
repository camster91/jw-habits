const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => localStorage.clear());
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);
  const skip = await page.$('text=Skip');
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(800);
  
  // Click "Read today's text"
  const dt = await page.$('button:has-text("Read today\'s text"), button:has-text("Read today")');
  if (dt) await dt.click({ force: true });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/r-3-after-dt.png', fullPage: true });
  
  // Now click a prayer
  const morning = await page.$('button:has-text("Morning Prayer")');
  if (morning) await morning.click({ force: true });
  await page.waitForTimeout(1000);
  
  // Click a Bible chapter
  const ch = await page.$('button:has-text("Ch. 46")');
  if (ch) await ch.click({ force: true });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/r-4-after-actions.png', fullPage: true });
  
  // Reload
  await page.reload();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: '/tmp/r-5-after-reload.png', fullPage: true });
  
  // Check storage
  const storage = await page.evaluate(() => {
    return Object.entries(localStorage).filter(([k]) => k.startsWith('jw-')).map(([k, v]) => `${k}: ${v.slice(0, 100)}`);
  });
  console.log('Storage after reload:');
  storage.forEach(s => console.log('  ' + s));
  
  await browser.close();
})();
