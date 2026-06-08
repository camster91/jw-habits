const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  // First visit
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(4000);
  // Look for Install button
  const installBtn1 = await page.$('text=Install');
  console.log('1. First visit - Install button visible:', !!installBtn1);
  if (installBtn1) {
    // Look for the Not now / dismiss button
    const dismissBtn = await page.$('text=/not now|later|dismiss|close/i');
    console.log('1. Dismiss button found:', !!dismissBtn);
    if (dismissBtn) await dismissBtn.click();
    await page.waitForTimeout(1000);
  }
  // Check storage
  const after1 = await page.evaluate(() => ({
    installPromptDismissed: localStorage.getItem('installPromptDismissed'),
  }));
  console.log('1. localStorage after dismiss:', JSON.stringify(after1));
  // Reload
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const installBtn2 = await page.$('text=Install');
  console.log('2. After reload - Install button visible:', !!installBtn2);
  // Visit another page
  await page.goto('https://jw-habits.ashbi.ca/study');
  await page.waitForTimeout(3000);
  const installBtn3 = await page.$('text=Install');
  console.log('3. Different page - Install button visible:', !!installBtn3);
  await browser.close();
})();
