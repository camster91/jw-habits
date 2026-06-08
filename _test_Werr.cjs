const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERR:', e.message, '\n  STACK:', e.stack?.slice(0, 600)));
  // Visit /statistics, /links, /settings
  for (const route of ['/', '/statistics', '/links', '/settings', '/study', '/goals']) {
    await page.goto('https://jw-habits.ashbi.ca' + route);
    await page.waitForTimeout(2000);
    // Click each button on the page
    const btns = await page.$$('button');
    for (let i = 0; i < Math.min(btns.length, 8); i++) {
      try { 
        const t = await btns[i].textContent();
        await btns[i].click({ force: true, timeout: 500 });
        await page.waitForTimeout(200);
      } catch(e) {}
    }
    await page.waitForTimeout(500);
  }
  await browser.close();
})();
