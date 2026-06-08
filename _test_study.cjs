const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0, 200)));
  
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(4000);
  const skip = await page.$('text=Skip');
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(500);
  await page.goto('https://jw-habits.ashbi.ca/study');
  await page.waitForTimeout(4000);
  await page.screenshot({ path: '/tmp/jw-study.png', fullPage: true });
  // Look for week navigation
  const prevBtn = await page.$('button[aria-label*="prev" i], button:has-text("←"), button:has-text("Prev")');
  const nextBtn = await page.$('button[aria-label*="next" i], button:has-text("→"), button:has-text("Next")');
  console.log('Week nav prev:', !!prevBtn, 'next:', !!nextBtn);
  
  // Check if week navigation actually works
  if (nextBtn) {
    const before = await page.textContent('body');
    await nextBtn.click({ force: true });
    await page.waitForTimeout(1000);
    const after = await page.textContent('body');
    console.log('Week changed:', before !== after);
  }
  
  // Mark All Complete test
  const mac = await page.$('text=Mark All Complete');
  console.log('Mark All Complete:', !!mac);
  if (mac) {
    await mac.click({ force: true });
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    console.log('"3 of 3" or similar:', body.match(/(\d+)\s*of\s*\d+/)?.[0]);
  }
  
  console.log('Errors:', errors.length);
  errors.forEach(e => console.log(' ', e));
  await browser.close();
})();
