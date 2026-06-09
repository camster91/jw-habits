const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });

  // Fresh user view
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.evaluate(() => localStorage.clear());
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);
  const skip = await page.$('text=Skip');
  if (skip) await skip.click({ force: true });
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/ios-home-fresh.png', fullPage: true });

  // Set a name and complete some habits to see the active state
  await page.evaluate(() => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('jw-progress-storage', JSON.stringify({
      state: {
        dailyTexts: { [today]: { readScripture: true, progress: 100, timestamp: new Date().toISOString() } },
        prayers: { [today]: { morning: true, afternoon: false, evening: false, timestamp: new Date().toISOString() } },
        familyWorship: {},
        bibleReadings: {},
        bibleChapters: {},
        meetings: {},
        weeklyReadings: {},
      },
      version: 0,
    }));
    localStorage.setItem('jw-gamification-storage', JSON.stringify({
      state: {
        points: 45, currentStreak: 7, longestStreak: 14, lastActivityDate: today,
        prayerStreak: 1, longestPrayerStreak: 5, lastPrayerDate: today,
        familyWorshipStreak: 0, longestFamilyWorshipStreak: 2,
        dailyTextCompletions: 3, reflectionsWritten: 0, newsRead: 0,
        bibleReadingsCompleted: 0, goalsCompleted: 0, projectsCompleted: 0,
        meetingsPrepared: 0, prayersCompleted: 1, serviceEntries: 0, serviceHours: 0,
        recentAchievements: [], unlockedAchievements: [],
      },
      version: 1,
    }));
    localStorage.setItem('jw-habits-onboarded', 'true');
    localStorage.setItem('jw-progress-settings', JSON.stringify({
      state: { userName: 'Cam', notifications: {}, ai: {} }, version: 1,
    }));
  });
  await page.goto('https://jw-habits.ashbi.ca/?bust=' + Date.now());
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/tmp/ios-home-active.png', fullPage: true });

  console.log('Errors:', errors.length);
  errors.forEach(e => console.log(' ', e));
  await browser.close();
})();
