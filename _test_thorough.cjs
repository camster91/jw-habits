const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  const allConsoleMsgs = [];
  page.on('pageerror', e => errors.push({ type: 'pageerror', msg: e.message.slice(0, 200), url: page.url() }));
  page.on('console', m => { 
    if (m.type() === 'error') errors.push({ type: 'console.error', msg: m.text().slice(0, 200), url: page.url() });
    if (m.type() === 'warning') allConsoleMsgs.push({ type: 'warning', msg: m.text().slice(0, 200) });
  });

  console.log('--- Test 1: Daily text reading flow ---');
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => localStorage.clear());
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);
  const skip = await page.$('text=Skip');
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(500);
  
  // Find the daily text "read" button
  const dtRead = await page.$('button:has-text("Read today"), button:has-text("Mark read"), button:has-text("Done reading")');
  console.log('Daily text read button:', !!dtRead);
  if (dtRead) {
    await dtRead.click({ force: true });
    await page.waitForTimeout(1500);
  }

  console.log('--- Test 2: Reflection input ---');
  const reflection = await page.$('textarea[placeholder*="reflection" i], textarea[placeholder*="notes" i], input[placeholder*="reflect" i]');
  console.log('Reflection input found:', !!reflection);
  if (reflection) {
    await reflection.fill('My reflection for today');
    await page.waitForTimeout(1500);
  }
  await page.reload();
  await page.waitForTimeout(4000);
  const after = await page.textContent('body');
  console.log('Reflection persisted:', after.includes('My reflection for today'));

  console.log('--- Test 3: Bible Reading Ch buttons + reload ---');
  const ch1 = await page.$('button:has-text("Ch. 1")');
  if (ch1) await ch1.click({ force: true });
  await page.waitForTimeout(1000);
  const bibleStorage = await page.evaluate(() => localStorage.getItem('jw-progress-storage')?.slice(0, 400));
  console.log('After Ch 1, storage:', bibleStorage?.includes('bibleChapters') || bibleStorage?.includes('bibleReadings'));
  await page.reload();
  await page.waitForTimeout(4000);
  const body2 = await page.textContent('body');
  console.log('After reload, "Ch 1" still marked:', body2.match(/Ch\. 1[^a-z]?[^a-z]?[^a-z]?/i)?.[0] || 'not visible');

  console.log('--- Test 4: Family Worship reload ---');
  const fw = await page.$('button:has-text("Mark as complete")');
  if (fw) { await fw.click({ force: true }); await page.waitForTimeout(1500); }
  await page.reload();
  await page.waitForTimeout(4000);
  const fwStorage = await page.evaluate(() => localStorage.getItem('jw-progress-storage'));
  console.log('FamilyWorship stored:', JSON.parse(fwStorage || '{}')?.state?.familyWorship);

  console.log('--- Test 5: Visit all routes, collect errors ---');
  for (const r of ['/study', '/goals', '/statistics', '/links', '/settings', '/service']) {
    await page.goto('https://jw-habits.ashbi.ca' + r);
    await page.waitForTimeout(2500);
    const skipR = await page.$('text=Skip');
    if (skipR) await skipR.click({ force: true });
    await page.waitForTimeout(500);
  }
  
  console.log('\n--- ERRORS ---');
  errors.forEach(e => console.log(` [${e.type}] @ ${e.url}: ${e.msg}`));
  console.log('Total errors:', errors.length);
  await browser.close();
})();
