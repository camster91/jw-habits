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
  
  // Click multiple things to populate all stores
  const morning = await page.$('button:has-text("Morning Prayer")');
  if (morning) await morning.click({ force: true });
  await page.waitForTimeout(500);
  // Toggle theme to write to settings store
  await page.goto('https://jw-habits.ashbi.ca/settings');
  await page.waitForTimeout(3000);
  const dark = await page.$('button:has-text("Dark Mode")');
  if (dark) await dark.click({ force: true });
  await page.waitForTimeout(800);
  // Read all storage
  const all = await page.evaluate(() => {
    return Object.entries(localStorage).map(([k,v]) => ({ k, v: v.slice(0, 100), looksLikeJSON: v.startsWith('{') || v.startsWith('[') }));
  });
  console.log('=== localStorage after activity ===');
  all.forEach(s => console.log(`  ${s.k}: ${s.looksLikeJSON ? 'JSON' : 'BAD'} | ${s.v.slice(0,80)}`));
  const badKeys = all.filter(s => !s.looksLikeJSON);
  console.log(`\nBad keys: ${badKeys.length}`);
  if (badKeys.length) badKeys.forEach(k => console.log('  -', k.k));
  
  await browser.close();
})();
