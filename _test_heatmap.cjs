const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 150)); });
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0, 150)));
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => { localStorage.setItem('jw-habits-onboarded', 'true'); });
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);
  // Check heatmap renders
  const heatmapCells = await page.$$('[data-heatmap-cell], .heatmap-cell, svg rect, [role="gridcell"]');
  console.log('Heatmap cells rendered:', heatmapCells.length);
  const hasHeatmap = await page.$('text=/26 weeks|yearly heatmap|heatmap/i');
  console.log('Heatmap container found:', !!hasHeatmap);
  // Click "Morning Prayer" to trigger a state change
  const morning = await page.$('button:has-text("Morning Prayer")');
  if (morning) {
    await morning.click({ force: true });
    await page.waitForTimeout(800);
    const body = await page.textContent('body');
    console.log('Prayer counter after click:', body.match(/(\d+)\s*\/\s*3/)?.[0]);
  }
  console.log('Console errors:', errors.length);
  errors.slice(0, 3).forEach(e => console.log(' -', e));
  await browser.close();
})();
