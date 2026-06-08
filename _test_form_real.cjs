const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => localStorage.clear());
  await page.goto('https://jw-habits.ashbi.ca/goals');
  await page.waitForTimeout(4000);
  const skip = await page.$('text=Skip');
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(500);
  
  // Open add form but don't submit
  const newBtn = await page.$('button:has-text("New")');
  if (newBtn) await newBtn.click({ force: true });
  await page.waitForTimeout(1000);
  
  // Type partial goal
  const titleInput = await page.$('input[type="text"]');
  if (titleInput) await titleInput.fill('Half-typed');
  await page.waitForTimeout(500);
  
  // Now click somewhere else that would normally be a navigation
  // (a button that doesn't explicitly have type="button")
  const beforeUrl = page.url();
  console.log('Before click, URL:', beforeUrl);
  console.log('Before click, input value:', await titleInput.inputValue());
  
  // Click the goal-card checkbox (this is the bug case)
  const checkboxBtn = await page.$('div.card button');
  if (checkboxBtn) {
    console.log('Clicking checkbox...');
    await checkboxBtn.click({ force: true });
    await page.waitForTimeout(1500);
  }
  
  const afterUrl = page.url();
  const afterInput = await page.$('input[type="text"]');
  console.log('After click, URL:', afterUrl);
  console.log('After click, input still visible:', !!afterInput);
  if (afterInput) console.log('After click, input value:', await afterInput.inputValue());
  
  // Check for storage of partial data
  const goalsStorage = await page.evaluate(() => localStorage.getItem('jw-goals-storage'));
  console.log('Goals storage:', goalsStorage?.slice(0, 200));
  
  await browser.close();
})();
