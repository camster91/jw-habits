const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0, 300)));
  await page.goto('https://jw-habits.ashbi.ca/goals');
  await page.waitForTimeout(4000);
  const skip = await page.$('text=Skip');
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(500);
  const newBtn = await page.$('button:has-text("New")');
  if (newBtn) {
    await newBtn.click({ force: true });
    await page.waitForTimeout(1000);
    const inputs = await page.$$('input, textarea');
    console.log('Input fields after click:', inputs.length);
    for (const i of inputs) {
      const ph = await i.getAttribute('placeholder');
      const type = await i.getAttribute('type');
      console.log(`  Input type=${type} placeholder="${ph}"`);
    }
    // Try to fill first text input
    const titleInput = await page.$('input[type="text"]');
    if (titleInput) {
      await titleInput.fill('Test goal');
      await page.waitForTimeout(300);
      // Find a Save/Submit
      const submit = await page.$('button:has-text("Save"), button:has-text("Add"), button[type="submit"]');
      console.log('Submit found:', !!submit);
      if (submit) {
        await submit.click({ force: true });
        await page.waitForTimeout(1500);
      }
      const body = await page.textContent('body');
      console.log('Goal appears in list:', body.includes('Test goal'));
    }
  }
  console.log('Errors:', errors.length);
  errors.forEach(e => console.log(' ', e));
  await browser.close();
})();
