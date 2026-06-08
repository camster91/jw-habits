const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(4000);
  const skip = await page.$('text=Skip');
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(500);
  
  // Find drawer toggle
  const drawer = await page.$('button[aria-label*="menu" i], button[aria-label*="drawer" i], button[aria-label*="open" i]');
  console.log('Drawer button found:', !!drawer);
  if (drawer) {
    await drawer.click({ force: true });
    await page.waitForTimeout(1000);
  }
  
  await page.screenshot({ path: '/tmp/jw-drawer.png', fullPage: true });
  // Check what's visible
  const body = await page.textContent('body');
  console.log('Stats link present:', body.includes('Stats') || body.includes('Statistics'));
  
  // Try direct nav
  await page.goto('https://jw-habits.ashbi.ca/statistics');
  await page.waitForTimeout(3000);
  const body2 = await page.textContent('body');
  console.log('Direct /statistics nav: "Your Progress" present:', body2.includes('Your Progress'));
  
  // Open Goals page
  await page.goto('https://jw-habits.ashbi.ca/goals');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/jw-goals-page.png', fullPage: true });
  
  await browser.close();
})();
