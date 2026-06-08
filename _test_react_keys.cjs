const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  const warnings = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0, 200)));
  page.on('console', m => { 
    if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200));
    if (m.type() === 'warning' && m.text().includes('key')) warnings.push(m.text().slice(0, 200));
  });
  
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => localStorage.clear());
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);
  const skip = await page.$('text=Skip');
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(500);
  
  // Click all 3 prayers, all 3 bible chapters, daily text, family worship
  const allBtns = await page.$$('button');
  for (const btn of allBtns) {
    const t = await btn.textContent();
    if (t && /Morning|Afternoon|Evening|Ch\.|Read today|complete/i.test(t)) {
      try { await btn.click({ force: true }); await page.waitForTimeout(500); } catch(e) {}
    }
  }
  await page.waitForTimeout(2000);
  
  // Visit stats
  await page.goto('https://jw-habits.ashbi.ca/statistics');
  await page.waitForTimeout(3000);
  
  // Now back to home, click more
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(3000);
  const skip2 = await page.$('text=Skip');
  if (skip2) await skip2.click({ force: true });
  await page.waitForTimeout(500);
  
  // Click daily text read button
  const dtr = await page.$('button:has-text("Read today"), button:has-text("Read text"), button:has-text("Mark read")');
  if (dtr) { await dtr.click({ force: true }); await page.waitForTimeout(1500); }
  
  console.log('Errors:', errors.length);
  errors.slice(0, 5).forEach(e => console.log(' ', e));
  console.log('\nReact key warnings:', warnings.length);
  warnings.slice(0, 5).forEach(w => console.log(' ', w));
  await browser.close();
})();
