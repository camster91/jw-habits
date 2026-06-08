const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push({msg: e.message, stack: e.stack?.slice(0, 500), url: page.url()}));
  page.on('console', m => { if (m.type() === 'error') errors.push({console: m.text().slice(0, 300), url: page.url()}); });

  // Visit each route
  const routes = ['/', '/study', '/goals', '/statistics', '/links', '/settings', '/service'];
  for (const r of routes) {
    await page.goto('https://jw-habits.ashbi.ca' + r);
    await page.waitForTimeout(3000);
    const skip = await page.$('text=Skip');
    if (skip) await skip.click({ force: true });
    await page.waitForTimeout(500);
    // Click anything interactive
    const allBtns = await page.$$('button');
    for (let i = 0; i < Math.min(allBtns.length, 5); i++) {
      try { await allBtns[i].click({ force: true, timeout: 500 }); } catch(e) {}
    }
    await page.waitForTimeout(1000);
  }

  // Also try the home page interactions
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(3000);
  const skip = await page.$('text=Skip');
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(500);
  
  // Click each prayer
  for (const label of ['Morning Prayer', 'Afternoon Prayer', 'Evening Prayer']) {
    const btn = await page.$(`button:has-text("${label}")`);
    if (btn) { await btn.click({ force: true }); await page.waitForTimeout(300); }
  }
  
  // Click Bible chapters
  for (let i = 1; i <= 3; i++) {
    const btn = await page.$(`button:has-text("Ch. ${i}")`);
    if (btn) { await btn.click({ force: true }); await page.waitForTimeout(300); }
  }

  // Family worship
  const fw = await page.$('button:has-text("Mark as complete")');
  if (fw) { await fw.click({ force: true }); await page.waitForTimeout(500); }

  // Mark daily text read
  const dt = await page.$('button:has-text("Mark as read"), button:has-text("Read today")');
  if (dt) { await dt.click({ force: true }); await page.waitForTimeout(500); }

  console.log('=== ERRORS ===');
  errors.forEach((e, i) => {
    console.log(`\n--- Error ${i+1} ---`);
    if (e.msg) console.log('msg:', e.msg);
    if (e.stack) console.log('stack:', e.stack);
    if (e.console) console.log('console:', e.console);
    if (e.url) console.log('url:', e.url);
  });
  console.log('\nTotal errors:', errors.length);

  await browser.close();
})();
