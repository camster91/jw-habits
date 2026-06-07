const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() !== 'log') console.log('[B]', m.type(), m.text()); });
  // First visit: clear localStorage to simulate fresh user
  await page.goto('https://jw-habits.ashbi.ca/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('https://jw-habits.ashbi.ca/study?cb=99');
  await page.waitForTimeout(4000);
  // Dismiss onboarding
  const skip = await page.$('text=Skip');
  if (skip) await skip.click();
  await page.waitForTimeout(500);
  // Check state
  const before = await page.evaluate(() => {
    return { progress: localStorage.getItem('jw-progress-storage') };
  });
  console.log('BEFORE click:', before.progress);
  // Click Mark All Complete
  const mark = await page.$('text=Mark All Complete');
  console.log('Mark btn found:', !!mark);
  await mark.click();
  await page.waitForTimeout(2000);
  const after = await page.evaluate(() => {
    return {
      progress: localStorage.getItem('jw-progress-storage'),
      checks: Array.from(document.querySelectorAll('input[type=checkbox]')).map(el => ({ checked: el.checked, name: el.parentElement?.parentElement?.textContent || el.name })),
      progressText: document.querySelector('span.text-base-content\\/50')?.textContent || 'no span'
    };
  });
  console.log('AFTER click progress:', after.progress);
  console.log('CHECKBOXES:', JSON.stringify(after.checks, null, 2));
  console.log('Progress text:', after.progressText);
  await browser.close();
})();
