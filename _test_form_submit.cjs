const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0, 200)));
  
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => localStorage.clear());
  await page.goto('https://jw-habits.ashbi.ca/goals');
  await page.waitForTimeout(4000);
  const skip = await page.$('text=Skip');
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(500);
  
  // Add a goal
  const newBtn = await page.$('button:has-text("New")');
  if (newBtn) await newBtn.click({ force: true });
  await page.waitForTimeout(800);
  const titleInput = await page.$('input[type="text"]');
  if (titleInput) await titleInput.fill('Test goal 1');
  await page.waitForTimeout(300);
  const submit = await page.$('button:has-text("Save"), button:has-text("Add"), button[type="submit"]');
  if (submit) await submit.click({ force: true });
  await page.waitForTimeout(1500);
  
  // Now click the goal checkbox
  const body = await page.textContent('body');
  console.log('Goal in list:', body.includes('Test goal 1'));
  // Find the checkbox
  const checkbox = await page.$('div[class*="rounded-full"][class*="border"]');
  console.log('Checkbox found:', !!checkbox);
  if (checkbox) {
    await checkbox.click({ force: true });
    await page.waitForTimeout(1500);
    // Check if a NEW form opened (the submit form re-opened)
    const formVisible = await page.$('form input[type="text"]');
    console.log('Form reopened after checkbox click:', !!formVisible);
  }
  
  console.log('Errors:', errors.length);
  await browser.close();
})();
