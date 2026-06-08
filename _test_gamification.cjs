const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => localStorage.clear());
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);
  const skip = await page.$('text=Skip');
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(500);
  
  // Click daily text read
  const dt = await page.$('button:has-text("Read today"), button:has-text("Read")');
  if (dt) { await dt.click({ force: true }); await page.waitForTimeout(1500); }
  
  // Click each prayer
  for (const label of ['Morning Prayer', 'Afternoon Prayer', 'Evening Prayer']) {
    const b = await page.$(`button:has-text("${label}")`);
    if (b) { await b.click({ force: true }); await page.waitForTimeout(800); }
  }
  
  // Get gamification storage
  const gam = await page.evaluate(() => {
    const raw = localStorage.getItem('jw-gamification-storage');
    return raw ? JSON.parse(raw) : null;
  });
  console.log('Gamification state:');
  console.log(JSON.stringify(gam?.state, null, 2));
  
  // Check achievements
  const ach = gam?.state?.unlockedAchievements || [];
  console.log('\nUnlocked achievements:', ach.length);
  ach.forEach(a => console.log('  -', a.achievementId || a.id || 'unknown'));
  
  // Visit /statistics to see what it shows
  await page.goto('https://jw-habits.ashbi.ca/statistics');
  await page.waitForTimeout(4000);
  const body = await page.textContent('body');
  // Look for "Streak" and number near it
  const streakMatch = body.match(/Streak\s*\n?\s*(\d+)/);
  const pointsMatch = body.match(/(\d+)\s*XP|Level\s*(\d+)/);
  console.log('\nOn /statistics:');
  console.log('  Streak shown:', streakMatch?.[0]);
  console.log('  Level/XP shown:', pointsMatch?.[0]);
  
  // Find displayed "Bible", "Goals", "Notes" stats
  const stats = body.match(/(Streak|Bible|Goals|Notes|Reflections|Achievements)[^0-9]*([0-9]+)/gi);
  console.log('  Other stats:', stats?.slice(0, 10));
  
  await browser.close();
})();
