const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 300)); });

  // Clear and start fresh
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => localStorage.clear());
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);
  const skip = await page.$('text=Skip');
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(500);

  // Click each prayer
  for (const label of ['Morning Prayer', 'Afternoon Prayer', 'Evening Prayer']) {
    const b = await page.$(`button:has-text("${label}")`);
    if (b) { await b.click({ force: true }); await page.waitForTimeout(800); }
  }
  
  const before = await page.textContent('body');
  const beforeCount = before.match(/(\d+)\s*\/\s*3/)?.[0];
  console.log('Before reload, counter:', beforeCount);
  const beforeStorage = await page.evaluate(() => localStorage.getItem('jw-progress-storage')?.slice(0, 200));
  console.log('Before reload, storage:', beforeStorage);

  // Reload
  await page.reload();
  await page.waitForTimeout(5000);
  const after = await page.textContent('body');
  const afterCount = after.match(/(\d+)\s*\/\s*3/)?.[0];
  console.log('After reload, counter:', afterCount);
  const afterStorage = await page.evaluate(() => localStorage.getItem('jw-progress-storage')?.slice(0, 200));
  console.log('After reload, storage:', afterStorage);
  
  // Settings persistence
  await page.goto('https://jw-habits.ashbi.ca/settings');
  await page.waitForTimeout(3000);
  const dark = await page.$('button:has-text("Dark Mode")');
  if (dark) await dark.click({ force: true });
  await page.waitForTimeout(1000);
  const theme1 = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log('Theme after click:', theme1);
  await page.reload();
  await page.waitForTimeout(3000);
  const theme2 = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log('Theme after reload:', theme2);

  // Goals persistence
  await page.goto('https://jw-habits.ashbi.ca/goals');
  await page.waitForTimeout(3000);
  const newBtn = await page.$('button:has-text("New")');
  if (newBtn) await newBtn.click({ force: true });
  await page.waitForTimeout(800);
  const titleInput = await page.$('input[type="text"]');
  if (titleInput) {
    await titleInput.fill('Test persist goal');
    await page.waitForTimeout(300);
    const submit = await page.$('button:has-text("Save"), button:has-text("Add"), button[type="submit"]');
    if (submit) await submit.click({ force: true });
    await page.waitForTimeout(1500);
  }
  const goalBefore = await page.textContent('body');
  console.log('Goal in list before reload:', goalBefore.includes('Test persist goal'));
  await page.reload();
  await page.waitForTimeout(3000);
  const goalAfter = await page.textContent('body');
  console.log('Goal in list after reload:', goalAfter.includes('Test persist goal'));

  console.log('\n--- Errors ---');
  errors.forEach(e => console.log(' ', e));
  console.log('Total errors:', errors.length);
  await browser.close();
})();
