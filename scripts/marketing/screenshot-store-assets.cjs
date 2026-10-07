// screenshot-store-assets.cjs
//
// Captures store-listing screenshots in the exact dimensions required by
// the Apple App Store and Google Play Store.
//
// Targets a LOCAL build by default; pass a URL as argv[2] to shoot a
// deployed copy. The previous default pointed at a host that has been
// serving 502 since 2026-07-24.
//
// Run: npm run build && npm run preview &
//      node scripts/marketing/screenshot-store-assets.cjs
//
// Outputs go to ./store-screenshots/<view-name>-<size>.png
// E.g. ./store-screenshots/home-iphone-67-1290x2796.png
//
// All shots are captured in both light and dark mode so Cam can
// pick whichever looks better for each store listing.

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const URL = process.argv[2] || 'http://localhost:4173/';
const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'store-screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Screenshots to capture. Each one sets up a specific user state
// so the shot tells the right story.
const SHOTS = [
  {
    name: 'home-daily-actions',
    description: 'Home with the daily actions visible (Bible + Prayer + Family)',
    setup: async (page) => {
      // Fresh user, picker already done (so daily actions show)
      await page.evaluate(() => {
        Object.keys(localStorage).forEach(k => { if (k.startsWith('jw-')) localStorage.removeItem(k); });
        localStorage.setItem('jw-habits-onboarded', 'true');
        localStorage.setItem('installPromptDismissed', 'true');
        localStorage.setItem('jw-habits-onboarded-v2', '1');
        localStorage.setItem('jw-progress-settings', JSON.stringify({ state: { theme: 'light' }, version: 0 }));
      });
    },
    navigations: [
      { path: '/', wait: 3000 },
    ],
  },
  {
    name: 'home-picker',
    description: 'Home with the habit picker visible (for onboarding screenshots)',
    setup: async (page) => {
      // Fresh user, picker still active (trackedHabits is empty so
      // the picker renders). After page load, click 3 of the
      // picker rows to make the screenshot show a user mid-decision.
      await page.evaluate(() => {
        Object.keys(localStorage).forEach(k => { if (k.startsWith('jw-')) localStorage.removeItem(k); });
        localStorage.setItem('jw-habits-onboarded', 'true');
        localStorage.setItem('installPromptDismissed', 'true');
        localStorage.setItem('jw-progress-settings', JSON.stringify({ state: { theme: 'light' }, version: 0 }));
      });
    },
    navigations: [
      { path: '/', wait: 3000, afterWait: async (page) => {
        // Click 3 picker rows so the screenshot shows pre-picks
        const rows = await page.locator('div.ios-grouped button.ios-row[aria-pressed]').all();
        if (rows.length > 2) {
          await rows[0].click();
          await page.waitForTimeout(150);
          await rows[1].click();
          await page.waitForTimeout(150);
          await rows[2].click();
          await page.waitForTimeout(300);
        }
      }},
    ],
  },
  {
    name: 'bible-reading',
    description: 'Bible reading plan with chapter check-offs',
    setup: async (page) => {
      await page.evaluate(() => {
        Object.keys(localStorage).forEach(k => { if (k.startsWith('jw-')) localStorage.removeItem(k); });
        localStorage.setItem('jw-habits-onboarded', 'true');
        localStorage.setItem('installPromptDismissed', 'true');
        localStorage.setItem('jw-habits-onboarded-v2', '1');
        // Pre-fill some progress for the screenshot
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10);
        const stored = {
          state: {
            dailyTexts: { [dateStr]: { read: true, readScripture: true, progress: 100, timestamp: today.toISOString() } },
            bibleReadings: { [dateStr]: { progress: 100, chaptersRead: ['Gen 1','Gen 2','Gen 3'], read: true, status: 'completed', timestamp: today.toISOString() } },
            bibleChapters: { [dateStr]: { 0: true, 1: true, 2: true } },
            prayers: { [dateStr]: { morning: true, afternoon: false, evening: false, timestamp: today.toISOString() } },
            familyWorship: {},
            meetings: {},
            weeklyReadings: {},
          },
          version: 0,
        };
        localStorage.setItem('jw-progress-storage', JSON.stringify(stored));
      });
    },
    navigations: [
      { path: '/', wait: 2000 },
      { path: '/study/reading', wait: 3000 },
    ],
  },
  {
    name: 'stats',
    description: 'Stats page with achievements, streaks, and heatmap',
    setup: async (page) => {
      await page.evaluate(() => {
        Object.keys(localStorage).forEach(k => { if (k.startsWith('jw-')) localStorage.removeItem(k); });
        localStorage.setItem('jw-habits-onboarded', 'true');
        localStorage.setItem('installPromptDismissed', 'true');
        localStorage.setItem('jw-habits-onboarded-v2', '1');
        // Pre-fill gamification state with some progress for the screenshot
        const gs = {
          state: {
            points: 320,
            level: 4,
            currentStreak: 12,
            longestStreak: 18,
            achievements: [
              { id: 'first_habit', name: 'First Step', description: 'Completed your first habit', unlocked: true, unlockedAt: '2026-06-01' },
              { id: 'streak_3', name: '3-Day Streak', description: '3 days in a row', unlocked: true, unlockedAt: '2026-06-04' },
              { id: 'streak_7', name: 'One Week', description: '7 days in a row', unlocked: true, unlockedAt: '2026-06-08' },
              { id: 'prayer_streak_7', name: 'Devoted', description: '7 days of prayer', unlocked: true, unlockedAt: '2026-06-10' },
              { id: 'meeting_prep', name: 'Ready', description: 'Prepared for a meeting', unlocked: true, unlockedAt: '2026-06-12' },
            ],
          },
          version: 0,
        };
        localStorage.setItem('jw-gamification-storage', JSON.stringify(gs));
      });
    },
    navigations: [
      { path: '/', wait: 1500 },
      { path: '/statistics', wait: 3000 },
    ],
  },
  {
    name: 'meeting-prep',
    description: 'Meeting prep with the current week\'s workbook',
    setup: async (page) => {
      await page.evaluate(() => {
        Object.keys(localStorage).forEach(k => { if (k.startsWith('jw-')) localStorage.removeItem(k); });
        localStorage.setItem('jw-habits-onboarded', 'true');
        localStorage.setItem('installPromptDismissed', 'true');
        localStorage.setItem('jw-habits-onboarded-v2', '1');
      });
    },
    navigations: [
      { path: '/', wait: 1500 },
      { path: '/study', wait: 3000 },
    ],
  },
  {
    name: 'settings-dark',
    description: 'Settings page in dark mode (the Daily routine section)',
    setup: async (page) => {
      await page.evaluate(() => {
        Object.keys(localStorage).forEach(k => { if (k.startsWith('jw-')) localStorage.removeItem(k); });
        localStorage.setItem('jw-habits-onboarded', 'true');
        localStorage.setItem('installPromptDismissed', 'true');
        localStorage.setItem('jw-habits-onboarded-v2', '1');
        localStorage.setItem('jw-progress-settings', JSON.stringify({ state: { theme: 'dark' }, version: 0 }));
      });
    },
    navigations: [
      { path: '/', wait: 1500 },
      { path: '/settings', wait: 3000 },
      { path: null, wait: 500, scrollSelector: 'text=Daily routine' },
    ],
  },
  {
    name: 'goals',
    description: 'Goals tab with a sample goal in progress',
    setup: async (page) => {
      await page.evaluate(() => {
        Object.keys(localStorage).forEach(k => { if (k.startsWith('jw-')) localStorage.removeItem(k); });
        localStorage.setItem('jw-habits-onboarded', 'true');
        localStorage.setItem('installPromptDismissed', 'true');
        localStorage.setItem('jw-habits-onboarded-v2', '1');
        const stored = {
          state: {
            goals: [
              { id: 'g1', title: 'Read the New Testament in 90 days', description: 'One NT book per week', category: 'spiritual', completed: false, tasks: [
                { id: 't1', title: 'Matthew (week 1)', done: true },
                { id: 't2', title: 'Mark (week 2)', done: true },
                { id: 't3', title: 'Luke (week 3)', done: false },
                { id: 't4', title: 'John (week 4)', done: false },
              ], createdAt: '2026-06-01' },
              { id: 'g2', title: 'Strengthen my family worship routine', description: 'Weekly, 30 min, with a rotation of Bible study topics', category: 'family', completed: false, tasks: [
                { id: 't5', title: 'Choose a book (Revelation)', done: true },
                { id: 't6', title: 'Pick a weekly time (Sundays after lunch)', done: true },
                { id: 't7', title: 'First session', done: false },
              ], createdAt: '2026-05-15' },
            ],
            projects: [],
          },
          version: 0,
        };
        localStorage.setItem('jw-goals-storage', JSON.stringify(stored));
      });
    },
    navigations: [
      { path: '/', wait: 1500 },
      { path: '/goals', wait: 3000 },
    ],
  },
  {
    name: 'links',
    description: 'JW.org quick links library',
    setup: async (page) => {
      await page.evaluate(() => {
        Object.keys(localStorage).forEach(k => { if (k.startsWith('jw-')) localStorage.removeItem(k); });
        localStorage.setItem('jw-habits-onboarded', 'true');
        localStorage.setItem('installPromptDismissed', 'true');
        localStorage.setItem('jw-habits-onboarded-v2', '1');
      });
    },
    navigations: [
      { path: '/', wait: 1500 },
      { path: '/links', wait: 3000 },
    ],
  },
  {
    name: 'service',
    description: 'Service hours tracking (for pioneers/publishers)',
    setup: async (page) => {
      await page.evaluate(() => {
        Object.keys(localStorage).forEach(k => { if (k.startsWith('jw-')) localStorage.removeItem(k); });
        localStorage.setItem('jw-habits-onboarded', 'true');
        localStorage.setItem('installPromptDismissed', 'true');
        localStorage.setItem('jw-habits-onboarded-v2', '1');
        localStorage.setItem('jw-progress-settings', JSON.stringify({ state: { theme: 'dark', publisherStatus: 'pioneer' }, version: 0 }));
        const stored = {
          state: {
            entries: [
              { id: 'e1', date: '2026-06-10', hours: 1.5, type: 'field_service', note: 'Two return visits' },
              { id: 'e2', date: '2026-06-11', hours: 1.0, type: 'field_service', note: '' },
              { id: 'e3', date: '2026-06-12', hours: 1.5, type: 'return_visit', note: 'Bible study with Maria' },
              { id: 'e4', date: '2026-06-13', hours: 2.0, type: 'field_service', note: 'Territory worked' },
            ],
            monthlyGoalHours: 50,
            yearlyGoalHours: 600,
          },
          version: 0,
        };
        localStorage.setItem('jw-service-storage', JSON.stringify(stored));
      });
    },
    navigations: [
      { path: '/', wait: 1500 },
      { path: '/service', wait: 3000 },
    ],
  },
];

// Device configurations for App Store + Play Store
const TARGETS = [
  {
    // Apple iPhone 6.7" (iPhone 15 Pro Max)
    label: 'iphone-67',
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    outputSize: { width: 1290, height: 2796 },
  },
  {
    // Apple iPhone 6.5" (iPhone 11 Pro Max)
    label: 'iphone-65',
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 3,
    outputSize: { width: 1242, height: 2688 },
  },
  {
    // Apple iPhone 5.5" (iPhone 8 Plus)
    label: 'iphone-55',
    viewport: { width: 414, height: 736 },
    deviceScaleFactor: 3,
    outputSize: { width: 1242, height: 2208 },
  },
  {
    // Apple iPad Pro 12.9" (3rd gen, 2018+)
    label: 'ipad-129',
    viewport: { width: 1024, height: 1366 },
    deviceScaleFactor: 2,
    outputSize: { width: 2048, height: 2732 },
  },
  {
    // Google Play phone (1080x1920 or 1080x2340)
    label: 'android-phone',
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 3,
    outputSize: { width: 1080, height: 2340 },
  },
  {
    // Google Play 7" tablet
    label: 'android-tablet-7',
    viewport: { width: 600, height: 960 },
    deviceScaleFactor: 2,
    outputSize: { width: 1200, height: 1920 },
  },
];

async function captureAll() {
  for (const target of TARGETS) {
    console.log(`\n=== ${target.label} (${target.outputSize.width}x${target.outputSize.height}) ===`);
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({
        viewport: target.viewport,
        deviceScaleFactor: target.deviceScaleFactor,
        ignoreHTTPSErrors: true,
      });
      const page = await context.newPage();

      for (const shot of SHOTS) {
        // Setup localStorage by visiting first
        await page.goto(URL);
        await page.waitForTimeout(2000);
        await shot.setup(page);

        // Walk through navigations
        for (const nav of shot.navigations) {
          if (nav.path) {
            await page.goto(URL + nav.path);
          }
          await page.waitForTimeout(nav.wait || 1500);
          if (nav.afterWait) {
            await nav.afterWait(page);
          }
          if (nav.scrollSelector) {
            await page.evaluate((sel) => {
              const el = [...document.querySelectorAll('h1, h2, h3, p, button, div')]
                .find(e => e.textContent.includes(sel));
              if (el) el.scrollIntoView({ block: 'center' });
            }, nav.scrollSelector);
            await page.waitForTimeout(500);
          }
        }

        // Capture both light and dark
        for (const theme of ['light', 'dark']) {
          await page.evaluate((t) => {
            const k = 'jw-progress-settings';
            const raw = localStorage.getItem(k);
            const obj = raw ? JSON.parse(raw) : { state: {}, version: 0 };
            obj.state = obj.state || {};
            obj.state.theme = t;
            localStorage.setItem(k, JSON.stringify(obj));
          }, theme);
          // Reload to apply theme
          await page.reload();
          await page.waitForTimeout(2000);
          // Re-walk navigations since reload
          for (const nav of shot.navigations) {
            if (nav.path) {
              await page.goto(URL + nav.path);
            }
            await page.waitForTimeout(nav.wait || 1500);
            if (nav.afterWait) {
              await nav.afterWait(page);
            }
            if (nav.scrollSelector) {
              await page.evaluate((sel) => {
                const el = [...document.querySelectorAll('h1, h2, h3, p, button, div')]
                  .find(e => e.textContent.includes(sel));
                if (el) el.scrollIntoView({ block: 'center' });
              }, nav.scrollSelector);
              await page.waitForTimeout(500);
            }
          }
          // For store screenshots, hide the bottom tab bar so the
          // last content row isn't visually under the tab nav.
          // The PNG still has the viewport height, but the tab bar
          // is gone so the content gets a clean bottom edge.
          await page.evaluate(() => {
            const tabBar = document.querySelector('.ios-tab-bar, [class*="tab-bar"]');
            if (tabBar) tabBar.style.display = 'none';
            // Also kill the Onboarding modal if it's up — it covers
            // everything and isn't useful for a store screenshot.
            const modal = document.querySelector('[class*="fixed"][class*="inset-0"][class*="z-50"]');
            if (modal) modal.remove();
            // And the UpdatePrompt pill (also floats on top)
            const update = document.querySelector('[role="status"]');
            if (update && update.textContent.includes('New version available')) update.remove();
          });
          await page.waitForTimeout(500);
          const filename = `${shot.name}-${target.label}-${theme}.png`;
          const filepath = path.join(OUTPUT_DIR, filename);
          await page.screenshot({ path: filepath, fullPage: false });
          console.log(`  ✓ ${filename} (${(fs.statSync(filepath).size / 1024).toFixed(0)} KB)`);
        }
      }
    } finally {
      await browser.close();
    }
  }
  console.log(`\n=== Done. ${TARGETS.length * SHOTS.length * 2} screenshots saved to ${OUTPUT_DIR} ===`);
}

captureAll().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
