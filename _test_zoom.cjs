const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('jw-progress-storage', JSON.stringify({
      state: { dailyTexts: {}, prayers: { [today]: { morning: true, afternoon: false, evening: false } }, familyWorship: {}, bibleReadings: {}, bibleChapters: {}, meetings: {}, weeklyReadings: {} },
      version: 0,
    }));
    localStorage.setItem('jw-habits-onboarded', 'true');
    localStorage.setItem('jw-gamification-storage', JSON.stringify({
      state: { points: 5, currentStreak: 1, longestStreak: 1, lastActivityDate: today, prayerStreak: 0, longestPrayerStreak: 0, lastPrayerDate: null, familyWorshipStreak: 0, longestFamilyWorshipStreak: 0, dailyTextCompletions: 0, reflectionsWritten: 0, newsRead: 0, bibleReadingsCompleted: 0, goalsCompleted: 0, projectsCompleted: 0, meetingsPrepared: 0, prayersCompleted: 0, serviceEntries: 0, serviceHours: 0, recentAchievements: [], unlockedAchievements: [] },
      version: 1,
    }));
  });
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);
  // Scroll to the prayer section
  await page.evaluate(() => {
    const el = document.querySelector('.ios-grouped');
    if (el) el.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(500);
  // Get the prayer card's bounding box
  const card = await page.$('.ios-grouped');
  if (card) {
    const box = await card.boundingBox();
    await page.screenshot({ path: '/tmp/ios-prayer-zoom.png', clip: box });
    console.log('Card box:', JSON.stringify(box));
  }
  await browser.close();
})();
