const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });

  // Active state
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('jw-progress-storage', JSON.stringify({
      state: {
        dailyTexts: { [today]: { readScripture: true, progress: 100 } },
        prayers: { [today]: { morning: true, afternoon: false, evening: false } },
        familyWorship: {}, bibleReadings: {}, bibleChapters: {},
        meetings: {}, weeklyReadings: {},
      },
      version: 0,
    }));
    localStorage.setItem('jw-gamification-storage', JSON.stringify({
      state: { points: 25, currentStreak: 7, longestStreak: 14, lastActivityDate: today,
        prayerStreak: 5, longestPrayerStreak: 8, lastPrayerDate: today,
        familyWorshipStreak: 0, longestFamilyWorshipStreak: 2,
        dailyTextCompletions: 1, reflectionsWritten: 0, newsRead: 0,
        bibleReadingsCompleted: 0, goalsCompleted: 0, projectsCompleted: 0,
        meetingsPrepared: 0, prayersCompleted: 1, serviceEntries: 0, serviceHours: 0,
        recentAchievements: [], unlockedAchievements: [], },
      version: 1,
    }));
    localStorage.setItem('jw-habits-onboarded', 'true');
    localStorage.setItem('jw-progress-settings', JSON.stringify({
      state: { userName: 'Cam', notifications: {}, ai: {} }, version: 1,
    }));
  });
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/tmp/ios-prayer.png', fullPage: true });

  // Click a tab to test the tab bar
  await page.goto('https://jw-habits.ashbi.ca/study');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/ios-tabbar.png', fullPage: false });

  console.log('Errors:', errors.length);
  errors.forEach(e => console.log(' ', e));
  await browser.close();
})();
