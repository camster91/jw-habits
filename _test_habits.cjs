const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('[ERR]', m.text().slice(0, 200)); });
  // Fresh user
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => localStorage.clear());
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);
  // Close Onboarding
  const skip = await page.$('text=Skip');
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(1000);
  // Test 1: click Morning Prayer button
  const morningBtn = await page.$('button:has-text("Morning Prayer")');
  console.log('1. Morning Prayer button found:', !!morningBtn);
  if (morningBtn) {
    await morningBtn.click({ force: true });
    await page.waitForTimeout(1000);
    // Check if counter changed
    const counter = await page.textContent('body');
    const hasCounter = counter.match(/([0-9]+)\s*\/\s*3\s*prayers?/i)?.[1];
    console.log('1. Prayer counter after click:', hasCounter);
  }
  // Test 2: click Bible Ch 1
  const ch1 = await page.$('button:has-text("Ch. 1")');
  console.log('2. Ch. 1 button found:', !!ch1);
  if (ch1) {
    await ch1.click({ force: true });
    await page.waitForTimeout(1000);
    const body = await page.textContent('body');
    const hasProgress = body.match(/(\d+)%/)?.[1];
    console.log('2. Bible progress % after click:', hasProgress);
  }
  // Test 3: click Mark All Complete on Study
  await page.goto('https://jw-habits.ashbi.ca/study');
  await page.waitForTimeout(4000);
  const skip2 = await page.$('text=Skip');
  if (skip2) await skip2.click({ force: true });
  await page.waitForTimeout(500);
  const mark = await page.$('text=Mark All Complete');
  console.log('3. Mark All Complete found:', !!mark);
  if (mark) {
    await mark.click({ force: true });
    await page.waitForTimeout(1500);
    const body = await page.textContent('body');
    const isComplete = body.match(/(\d+)\s*of\s*3\s*complete/);
    console.log('3. Treasures complete after click:', isComplete?.[0]);
  }
  await browser.close();
})();
