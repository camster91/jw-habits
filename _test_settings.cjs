const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('[ERR]', m.text().slice(0, 200)); });
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => localStorage.setItem('jw-habits-onboarded', 'true'));
  await page.goto('https://jw-habits.ashbi.ca/settings');
  await page.waitForTimeout(4000);
  // Find Dark Mode button
  const darkBtn = await page.$('button:has-text("Dark Mode")');
  console.log('Dark Mode button found:', !!darkBtn);
  if (darkBtn) {
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await darkBtn.click({ force: true });
    await page.waitForTimeout(1000);
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    const url = page.url();
    console.log('Before:', before, 'After:', after, 'URL:', url);
  }
  await browser.close();
})();
