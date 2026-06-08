const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0, 400)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 400)); });
  
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);
  console.log('Initial body length:', (await page.textContent('body'))?.length);
  const skip = await page.$('text=Skip');
  console.log('Skip button:', !!skip);
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(500);
  const morning = await page.$('button:has-text("Morning Prayer")');
  console.log('Morning Prayer button:', !!morning);
  if (morning) {
    await morning.click({ force: true });
    await page.waitForTimeout(2000);
  }
  const stored = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    return keys.map(k => ({ key: k, val: localStorage.getItem(k)?.slice(0, 200) }));
  });
  console.log('localStorage after click:');
  stored.forEach(s => console.log('  ' + s.key + ': ' + s.val));
  console.log('Errors:', errors.length);
  errors.forEach(e => console.log('  ' + e));
  await browser.close();
})();
