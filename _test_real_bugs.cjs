const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 300)); });

  // ============== TEST 1: Race conditions on rapid clicks ==============
  console.log('--- Test 1: Rapid double-click on Morning Prayer ---');
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => localStorage.clear());
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);
  const skip = await page.$('text=Skip');
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(500);
  const morning = await page.$('button:has-text("Morning Prayer")');
  if (morning) {
    // Click 5 times in 500ms
    for (let i = 0; i < 5; i++) await morning.click({ force: true });
    await page.waitForTimeout(1500);
    const body = await page.textContent('body');
    console.log('Counter after 5 rapid clicks:', body.match(/(\d+)\s*\/\s*3/)?.[0]);
  }

  // ============== TEST 2: Switching dates — does "yesterday" data persist? ==============
  console.log('--- Test 2: Click morning prayer, reload, see if it persists ---');
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(3000);
  const body = await page.textContent('body');
  console.log('After reload, counter:', body.match(/(\d+)\s*\/\s*3/)?.[0]);

  // ============== TEST 3: Goals tab full flow ==============
  console.log('--- Test 3: Goals CRUD ---');
  await page.goto('https://jw-habits.ashbi.ca/goals');
  await page.waitForTimeout(4000);
  const skip2 = await page.$('text=Skip');
  if (skip2) await skip2.click({ force: true });
  await page.waitForTimeout(500);
  const addGoalBtn = await page.$('button:has-text("Add")');
  console.log('Add goal button found:', !!addGoalBtn);
  if (addGoalBtn) {
    await addGoalBtn.click({ force: true });
    await page.waitForTimeout(800);
    const titleInput = await page.$('input[placeholder*="goal" i], input[type="text"]');
    console.log('Title input found:', !!titleInput);
    if (titleInput) {
      await titleInput.fill('Test goal 1');
      await page.waitForTimeout(300);
      const submit = await page.$('button[type="submit"], button:has-text("Save"), button:has-text("Add")');
      console.log('Submit found:', !!submit);
      if (submit) {
        await submit.click({ force: true });
        await page.waitForTimeout(1000);
      }
    }
    const body2 = await page.textContent('body');
    console.log('Goal appears in list:', body2.includes('Test goal 1'));
  }

  // ============== TEST 4: Service / quick add ==============
  console.log('--- Test 4: Service / quick add ---');
  await page.goto('https://jw-habits.ashbi.ca/service');
  await page.waitForTimeout(4000);
  const skip3 = await page.$('text=Skip');
  if (skip3) await skip3.click({ force: true });
  await page.waitForTimeout(500);
  const add1h = await page.$('button:has-text("+1h"), button:has-text("1h")');
  console.log('+1h button found:', !!add1h);
  if (add1h) {
    await add1h.click({ force: true });
    await page.waitForTimeout(1000);
    const body3 = await page.textContent('body');
    console.log('After +1h click, total:', body3.match(/(\d+)\s*h/i)?.[0]);
  }

  // ============== TEST 5: Stale state in Stats after activity ==============
  console.log('--- Test 5: Stats updates after activity? ---');
  await page.goto('https://jw-habits.ashbi.ca/statistics');
  await page.waitForTimeout(4000);
  const body4 = await page.textContent('body');
  console.log('Streak stat on /stats:', body4.match(/Streak[^0-9]*([0-9]+)/)?.[1]);

  // ============== TEST 6: Drawer open/close ==============
  console.log('--- Test 6: Drawer open/close ---');
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(3000);
  const menuBtn = await page.$('[aria-label*="menu" i], [aria-label*="drawer" i], button:has(svg)');
  console.log('Drawer trigger found:', !!menuBtn);

  // ============== TEST 7: Service page route (does /service exist?) ==============
  console.log('--- Test 7: Direct /service URL ---');
  const beforeNav = await page.url();
  await page.goto('https://jw-habits.ashbi.ca/service');
  await page.waitForTimeout(3000);
  const afterNav = await page.url();
  const body5 = await page.textContent('body');
  console.log('/service URL: stayed at', afterNav, '| content length:', body5.length);

  console.log('--- Page errors during test ---');
  errors.forEach(e => console.log('  ' + e));
  console.log('Total errors:', errors.length);

  await browser.close();
})();
