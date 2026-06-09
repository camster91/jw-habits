const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });

  // Seed data and capture all key states
  await page.goto('https://jw-habits.ashbi.ca/');
  await page.evaluate(() => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('jw-progress-storage', JSON.stringify({
      state: {
        dailyTexts: { [today]: { readScripture: true, progress: 100 } },
        prayers: { [today]: { morning: true, afternoon: true, evening: false } },
        familyWorship: {}, bibleReadings: {}, bibleChapters: {},
        meetings: {}, weeklyReadings: {},
      },
      version: 0,
    }));
    localStorage.setItem('jw-gamification-storage', JSON.stringify({
      state: { points: 25, currentStreak: 7, longestStreak: 14, lastActivityDate: today,
        prayerStreak: 1, longestPrayerStreak: 8, lastPrayerDate: today,
        familyWorshipStreak: 0, longestFamilyWorshipStreak: 2,
        dailyTextCompletions: 1, reflectionsWritten: 0, newsRead: 0,
        bibleReadingsCompleted: 0, goalsCompleted: 0, projectsCompleted: 0,
        meetingsPrepared: 0, prayersCompleted: 2, serviceEntries: 0, serviceHours: 0,
        recentAchievements: [], unlockedAchievements: [] },
      version: 1,
    }));
    localStorage.setItem('jw-habits-onboarded', 'true');
    localStorage.setItem('jw-progress-settings', JSON.stringify({
      state: { userName: 'Cam', notifications: {}, ai: {}, publisherStatus: 'regular' },
      version: 1,
    }));
  });
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/tmp/ios-final-home.png', fullPage: true });

  // Now try the Pioneer state
  await page.evaluate(() => {
    const settings = JSON.parse(localStorage.getItem('jw-progress-settings'));
    settings.state.publisherStatus = 'pioneer';
    localStorage.setItem('jw-progress-settings', JSON.stringify(settings));
  });
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/tmp/ios-final-pioneer.png', fullPage: true });

  console.log('Errors:', errors.length);
  errors.slice(0, 3).forEach(e => console.log(' ', e));
  await browser.close();
})();
