const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('[ERR]', m.text().slice(0, 200)); });
  // Fresh visit, dismiss Onboarding
  await page.goto('https://jw-habits.ashbi.ca/');
  await page.evaluate(() => { localStorage.setItem('jw-habits-onboarded', 'true'); localStorage.removeItem('userName'); });
  await page.goto('https://jw-habits.ashbi.ca/?cb=focus1');
  await page.waitForTimeout(4000);
  // Find the Today's Focus card
  const focusCard = await page.$('section:has(h3:has-text("Read today"))') || await page.$('section:has(h3:has-text("family worship"))') || await page.$('section:has(h3:has-text("prayer"))') || await page.$('section:has(h3:has-text("caught up"))');
  if (focusCard) {
    const text = await focusCard.textContent();
    console.log('Today\'s Focus card text:', text.slice(0, 200));
  } else {
    // List all sections
    const sections = await page.$$('section');
    console.log(`Found ${sections.length} sections, no Today's Focus match`);
    for (let i = 0; i < Math.min(sections.length, 5); i++) {
      const t = await sections[i].textContent();
      console.log(`  ${i}: ${t.slice(0, 80)}`);
    }
  }
  // Check that SmartSuggestions is NOT rendered
  const oldCards = await page.$$('section:has(h2:has-text("For you"))');
  console.log('Old "For you" cards present:', oldCards.length);
  await browser.close();
})();
