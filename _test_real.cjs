const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });

  // Fresh user
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => localStorage.clear());
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);

  // Skip onboarding
  const skip = await page.$('text=Skip');
  if (skip) { await skip.click({ force: true }); await page.waitForTimeout(800); }

  console.log('--- Test 1: Morning Prayer ---');
  const morning = await page.$('button:has-text("Morning Prayer")');
  console.log('Found:', !!morning);
  if (morning) {
    const before = await page.textContent('body');
    const beforeCount = (before.match(/(\d+)\s*\/\s*3/)?.[1]) || 'none';
    await morning.click({ force: true });
    await page.waitForTimeout(1000);
    const after = await page.textContent('body');
    const afterCount = (after.match(/(\d+)\s*\/\s*3/)?.[1]) || 'none';
    console.log('Counter: before=' + beforeCount + ', after=' + afterCount);
  }

  console.log('--- Test 2: Bible Ch 1 ---');
  const ch1 = await page.$('button:has-text("Ch. 1")');
  console.log('Found:', !!ch1);
  if (ch1) {
    const beforeBody = await page.textContent('body');
    const beforePct = beforeBody.match(/(\d+)\s*%/)?.[1];
    await ch1.click({ force: true });
    await page.waitForTimeout(1000);
    const afterBody = await page.textContent('body');
    const afterPct = afterBody.match(/(\d+)\s*%/)?.[1];
    console.log('Bible %: before=' + beforePct + ', after=' + afterPct);
  }

  console.log('--- Test 3: Family Worship Mark Complete ---');
  const fw = await page.$('button:has-text("Mark as complete")');
  console.log('Found:', !!fw);
  if (fw) {
    await fw.click({ force: true });
    await page.waitForTimeout(1000);
  }

  console.log('--- Test 4: Dark Mode ---');
  await page.goto('https://jw-habits.ashbi.ca/settings');
  await page.waitForTimeout(3000);
  const beforeTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const beforeURL = page.url();
  const darkBtn = await page.$('button:has-text("Dark Mode")');
  console.log('Dark Mode button:', !!darkBtn);
  if (darkBtn) {
    await darkBtn.click({ force: true });
    await page.waitForTimeout(1000);
  }
  const afterTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const afterURL = page.url();
  console.log('Theme: before=' + beforeTheme + ', after=' + afterTheme);
  console.log('URL: before=' + beforeURL + ', after=' + afterURL);

  console.log('--- Test 5: Mark All Complete on Study ---');
  await page.goto('https://jw-habits.ashbi.ca/study');
  await page.waitForTimeout(4000);
  const skip2 = await page.$('text=Skip');
  if (skip2) { await skip2.click({ force: true }); await page.waitForTimeout(500); }
  const mac = await page.$('text=Mark All Complete');
  console.log('Mark All Complete found:', !!mac);
  if (mac) {
    await mac.click({ force: true });
    await page.waitForTimeout(1500);
    const body = await page.textContent('body');
    const complete = body.match(/(\d+)\s*of\s*3/)?.[0];
    console.log('Treasures after click:', complete);
  }

  console.log('--- Page errors during full test ---');
  errors.forEach(e => console.log('  ' + e));
  console.log('Total errors:', errors.length);

  await browser.close();
})();
