const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('[ERR]', m.text().slice(0, 200)); });
  // Fresh visit
  await page.goto('https://jw-habits.ashbi.ca/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('https://jw-habits.ashbi.ca/?cb=ux1');
  await page.waitForTimeout(4000);

  // Test 1: Name prompt
  const nameInput = await page.$('input[placeholder*="Sarah"]');
  console.log('1. Name input found:', !!nameInput);
  if (nameInput) {
    await nameInput.fill('Marcus');
    const skip = await page.$('text=Skip');
    if (skip) await skip.click({ force: true });
    await page.waitForTimeout(1000);
  }
  const afterSkip = await page.evaluate(() => ({
    onboarded: localStorage.getItem('jw-habits-onboarded'),
    userName: JSON.parse(localStorage.getItem('jw-progress-settings') || '{}').userName
  }));
  console.log('1. After Skip:', JSON.stringify(afterSkip));

  // Test 2: Dark mode
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(500);
  const darkClass = await page.$eval('header', el => el.className).catch(() => 'no header');
  console.log('2. Dark header class:', darkClass.includes('blue-900') ? 'CORRECT (blue-900)' : 'WRONG (' + darkClass.slice(0, 80) + ')');

  // Test 3: Form validation on Goals
  await page.goto('https://jw-habits.ashbi.ca/goals?cb=ux2');
  await page.waitForTimeout(3000);
  const skipBtn2 = await page.$('text=Skip');
  if (skipBtn2) await skipBtn2.click({ force: true });
  await page.waitForTimeout(500);
  // Find "New" button
  const newBtn = await page.$('text=New');
  console.log('3. Goals New button found:', !!newBtn);
  if (newBtn) {
    await newBtn.click({ force: true });
    await page.waitForTimeout(500);
    // Find the goal title input
    const goalInput = await page.$('input[placeholder*="goal"]') || await page.$('input[placeholder*="What"]');
    console.log('3. Goal input found:', !!goalInput);
    if (goalInput) {
      // Test 1: Try too-short title
      await goalInput.fill('ab');
      const submitBtn = await page.$('button[type=submit]');
      if (submitBtn) await submitBtn.click({ force: true });
      await page.waitForTimeout(500);
      const formStillThere = await page.$('input[placeholder*="goal"]') !== null;
      console.log('3a. Too-short title blocked:', formStillThere);
      // Test 2: Valid title
      await goalInput.fill('Read Bible every day');
      if (submitBtn) await submitBtn.click({ force: true });
      await page.waitForTimeout(500);
      const bodyText = await page.textContent('body');
      const goalCreated = bodyText.includes('Read Bible every day');
      console.log('3b. Valid goal created:', goalCreated);
    }
  }
  await browser.close();
})();
