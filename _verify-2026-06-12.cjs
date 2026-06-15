// _verify-2026-06-12.cjs
//
// Live persona verification for the launchpad version of jw-habits.
// The home screen is a single list of link-out rows to jw.org
// surfaces — no in-app tracking, no checkboxes, no counters, no
// gamification. The persona tests assert the new flow:
//   T1: Home page has a greeting
//   T2: Home page has all 6 expected link-out rows
//   T3: Each link-out row opens a real jw.org URL in a new tab
//   T4: Hamburger menu opens the side drawer
//   T5: Drawer has Settings + Ideas + About
//   T6: /settings page renders (no Notifications section)
//   T7: /about page renders
//   T8: /share page renders (PWA share target)
//   T9: Dark mode toggle writes to localStorage AND updates data-theme
//   T10: Reset all data button clears localStorage
//   T11: Service quick add removed — replaced with a "share" intent
//   T12: T13: unchanged from before (regression: onboarding ↔ picker)

const { chromium } = require('playwright');
const path = require('path');

const URL_BASE = (process.env.VERIFY_URL || 'https://jwhabits.ashbi.ca').replace(/\/$/, '');
const URL = (route = '') => `${URL_BASE}${route}`;

const results = [];
let pass = 0, fail = 0;

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  if (ok) pass++; else fail++;
  console.log(`${ok ? '[PASS]' : '[FAIL]'} ${name}`);
  if (!ok) console.log(`       ${detail}`);
}

async function fresh(browser) {
  // ignoreHTTPSErrors: headless Chromium's bundled CA store doesn't
  // include the Let's Encrypt "R10" / "R11" intermediates that
  // jwhabits.ashbi.ca uses. Real browsers (Chrome, Safari, Firefox)
  // have them.
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)) });

  async function dismissOnboarding() {
    await page.evaluate(() => {
      // Clear all data so tests start from zero
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('jw-')) localStorage.removeItem(k);
      });
      // Mark onboarded AFTER the wipe (the previous version set this BEFORE,
      // so the wipe removed it again, and Onboarding re-appeared on every
      // test that called gotoApp() — see _verify-2026-06-11.cjs history)
      localStorage.setItem('jw-habits-onboarded', 'true');
      // Mark install prompt as dismissed
      localStorage.setItem('installPromptDismissed', 'true');
    });
  }

  async function gotoApp() {
    await page.goto(URL());
    await page.waitForTimeout(5000);
    await dismissOnboarding();
    await page.goto(URL());
    await page.waitForTimeout(5000);
  }

  return { ctx, page, errors, dismissOnboarding, gotoApp };
}

(async () => {
  const browser = await chromium.launch();

  // ============================================================
  // T1: Home page has the morning routine card as the
  // primary surface. This is the new front door.
  // ============================================================
  {
    const { page, gotoApp } = await fresh(browser);
    await gotoApp();
    const greetingVisible = await page.evaluate(() => {
      return [...document.querySelectorAll('h1')].some(h =>
        h.textContent.includes('Morning') || h.textContent.includes('Afternoon') || h.textContent.includes('Evening') || h.textContent.includes('night')
      );
    });
    const routineCardVisible = await page.evaluate(() => {
      // The morning routine card has a Sun icon and a "Start" or
      // "Continue" title. It's the first interactive card on the
      // page after the greeting.
      return [...document.querySelectorAll('a[href="/routine"]')].some(a =>
        a.textContent.includes('morning') || a.textContent.includes('Continue') || a.textContent.includes('Start')
      );
    });
    await record('T1: Home has greeting + morning routine card',
      greetingVisible && routineCardVisible,
      `greeting=${greetingVisible} routine_card=${routineCardVisible}`);
    await page.context().close();
  }

  // ============================================================
  // T2: /routine route renders the 4-step morning flow
  // ============================================================
  {
    const { page, gotoApp } = await fresh(browser);
    await gotoApp();
    await page.goto(URL('/routine'));
    await page.waitForTimeout(2500);
    const steps = await page.evaluate(() => {
      return [...document.querySelectorAll('.ios-row, button.ios-row')].map(b =>
        b.textContent.trim().slice(0, 60)
      );
    });
    const hasRead = steps.some(s => s.includes("today") || s.includes('Read today'));
    const hasPray = steps.some(s => s.includes('Pray') || s.toLowerCase().includes('prayer'));
    const hasReflect = steps.some(s => s.includes('Reflect'));
    await record('T2: /routine has Read, Pray, Reflect steps',
      hasRead && hasPray && hasReflect,
      `steps=${JSON.stringify(steps)}`);
    await page.context().close();
  }

  // ============================================================
  // T3: Marking "Pray" as done persists across page navigation.
  // The routine is per-day localStorage; a refresh should still
  // show the step as done.
  // ============================================================
  {
    const { page, gotoApp } = await fresh(browser);
    await gotoApp();
    await page.goto(URL('/routine'));
    await page.waitForTimeout(2500);
    // Click the "Pray" step (the second ios-row button)
    const prayBtn = page.locator('button.ios-row').filter({ hasText: /Pray|prayer/ }).first();
    if ((await prayBtn.count()) === 0) {
      await record('T3: Pray step toggles and persists across reload', false, 'Pray button not found');
    } else {
      await prayBtn.scrollIntoViewIfNeeded();
      await prayBtn.click();
      await page.waitForTimeout(800);
      // Reload and check the step is still marked done
      await page.reload();
      await page.waitForTimeout(2500);
      const stillDone = await page.evaluate(() => {
        // After tapping pray, the step shows "done" tag (a green check
        // instead of chevron) — and "Pray" with a "done" subtitle
        const raw = localStorage.getItem('jw-routine-state');
        if (!raw) return false;
        try {
          const state = JSON.parse(raw);
          return state.prayed === true && state.date === new Date().toISOString().slice(0, 10);
        } catch { return false; }
      });
      await record('T3: Pray step toggles and persists across reload', stillDone, `localStorage_prayed=${stillDone}`);
    }
    await page.context().close();
  }

  // ============================================================
  // T4: Home shows the routine card as "Continue your morning
  // routine" after 1 step is done (replaces "Start your morning
  // routine").
  // ============================================================
  {
    const { page, gotoApp } = await fresh(browser);
    await gotoApp();
    // Pre-seed 1 step done
    await page.evaluate(() => {
      localStorage.setItem('jw-routine-state', JSON.stringify({
        date: new Date().toISOString().slice(0, 10),
        textRead: true,
        prayed: false,
        reflected: false,
      }));
    });
    await page.goto(URL('/'));
    await page.waitForTimeout(2500);
    const cardText = await page.evaluate(() => {
      const a = document.querySelector('a[href="/routine"]');
      return a ? a.textContent.trim() : 'no card';
    });
    const saysContinue = cardText.includes('Continue');
    const saysLeft = cardText.includes('left') || cardText.includes('2');
    await record('T4: Home shows "Continue your morning routine" after 1 step',
      saysContinue && saysLeft,
      `card_text="${cardText.slice(0, 80)}"`);
    await page.context().close();
  }

  // ============================================================
  // T5: /habits route renders the 6-row directory
  // ============================================================
  {
    const { page, gotoApp } = await fresh(browser);
    await gotoApp();
    await page.goto(URL('/habits'));
    await page.waitForTimeout(2500);
    const linkRows = await page.evaluate(() => {
      return [...document.querySelectorAll('div.ios-grouped a.ios-row')].map(a => ({
        href: a.getAttribute('href'),
        target: a.getAttribute('target'),
      }));
    });
    const allJwOrg = linkRows.every(l => l.href && /jw\.org|wol\.jw\.org/.test(l.href));
    const allBlank = linkRows.every(l => l.target === '_blank');
    const expectedTitles = ['Daily text', 'Bible reading', 'Prayer', 'Family worship', 'Meeting prep'];
    const titles = await page.evaluate(() => {
      return [...document.querySelectorAll('a.ios-row .title')].map(t => t.textContent.trim());
    });
    const allPresent = expectedTitles.every(t => titles.includes(t));
    await record('T5: /habits has 6+ jw.org link-out rows',
      allJwOrg && allBlank && allPresent,
      `count=${linkRows.length} titles=${JSON.stringify(titles)}`);
    await page.context().close();
  }

  // ============================================================
  // T6: Hamburger menu opens the side drawer (kept from before)
  // ============================================================
  {
    const { page, gotoApp } = await fresh(browser);
    await gotoApp();
    const menuBtn = page.locator('button[aria-label="Open menu"]').first();
    if ((await menuBtn.count()) === 0) {
      await record('T6: Hamburger menu opens the side drawer', false, 'Menu button (aria-label="Open menu") not found in DOM');
    } else {
      await menuBtn.click();
      await page.waitForTimeout(800);
      const drawerVisible = await page.evaluate(() => {
        return [...document.querySelectorAll('aside, [aria-label*="menu"], [role="dialog"]')].length > 0
          || [...document.querySelectorAll('*')].some(el => el.textContent.includes('Settings') && el.textContent.includes('Ideas'));
      });
      await record('T6: Hamburger menu opens the side drawer', drawerVisible, `drawer_visible=${drawerVisible}`);
    }
    await page.context().close();
  }

  // ============================================================
  // T7: Side drawer has Routine, All habits, Settings, Ideas, About
  // ============================================================
  {
    const { page, gotoApp } = await fresh(browser);
    await gotoApp();
    const menuBtn = page.locator('button[aria-label="Open menu"]').first();
    await menuBtn.click();
    await page.waitForTimeout(800);
    const drawerItems = await page.evaluate(() => {
      return [...document.querySelectorAll('aside button')].map(b => b.textContent.trim().slice(0, 60));
    });
    const hasRoutine = drawerItems.some(t => t.toLowerCase().includes('routine'));
    const hasHabits = drawerItems.some(t => t.toLowerCase().includes('habits'));
    const hasSettings = drawerItems.some(t => t.includes('Settings'));
    const hasIdeas = drawerItems.some(t => t.includes('Ideas'));
    const hasAbout = drawerItems.some(t => t.includes('About'));
    await record('T7: Drawer has Routine, All habits, Settings, Ideas, About',
      hasRoutine && hasHabits && hasSettings && hasIdeas && hasAbout,
      `items=${JSON.stringify(drawerItems)}`);
    await page.context().close();
  }

  // ============================================================
  // T8: /settings page renders (kept from before)
  // ============================================================
  {
    const { page, gotoApp } = await fresh(browser);
    await gotoApp();
    await page.goto(URL('/settings'));
    await page.waitForTimeout(2500);
    const sections = await page.evaluate(() => {
      return [...document.querySelectorAll('h2')].map(h => h.textContent.trim().slice(0, 50));
    });
    const hasAppearance = sections.some(s => s.includes('Appearance'));
    const hasDataReset = sections.some(s => s.includes('Data reset') || s.includes('Data management'));
    const noNotifications = !sections.some(s => s.toLowerCase().includes('notification'));
    const noDailyRoutine = !sections.some(s => s.toLowerCase().includes('daily routine'));
    await record('T8: /settings has Appearance + Data reset, no Notifications',
      hasAppearance && hasDataReset && noNotifications && noDailyRoutine,
      `sections=${JSON.stringify(sections)}`);
    await page.context().close();
  }

  // ============================================================
  // T9: Dark mode toggle writes to localStorage AND updates data-theme
  // ============================================================
  {
    const { page, gotoApp } = await fresh(browser);
    await gotoApp();
    await page.goto(URL('/settings'));
    await page.waitForTimeout(2000);
    const darkBtn = page.locator('button[aria-label*="oggle light"]').first();
    if ((await darkBtn.count()) === 0) {
      await record('T9: Dark mode toggle exists in /settings', false, 'No dark-mode toggle button found');
    } else {
      const storageBefore = await page.evaluate(() => {
        const v = localStorage.getItem('jw-progress-settings');
        try { return JSON.parse(v); } catch { return null; }
      });
      const themeBefore = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      await darkBtn.scrollIntoViewIfNeeded();
      await darkBtn.click();
      await page.waitForTimeout(1500);
      const storageAfter = await page.evaluate(() => {
        const v = localStorage.getItem('jw-progress-settings');
        try { return JSON.parse(v); } catch { return null; }
      });
      const themeAfter = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      const storageChanged = JSON.stringify(storageBefore) !== JSON.stringify(storageAfter);
      const themeChanged = themeBefore !== themeAfter;
      await record('T9: Dark mode toggle writes to localStorage AND updates data-theme',
        storageChanged && themeChanged,
        `storage_changed=${storageChanged} theme_before=${themeBefore} theme_after=${themeAfter}`);
    }
    await page.context().close();
  }

  // ============================================================
  // T10: Reset all data button clears all jw-* localStorage keys
  // (including the routine state).
  // ============================================================
  {
    const { page, gotoApp } = await fresh(browser);
    await gotoApp();
    // Pre-seed routine + fake data
    await page.evaluate(() => {
      localStorage.setItem('jw-routine-state', JSON.stringify({ date: '2026-06-14', prayed: true, textRead: true }));
      localStorage.setItem('jw-fake-key', 'foo');
      localStorage.setItem('jw-progress-settings', JSON.stringify({ state: { theme: 'dark' }, version: 0 }));
    });
    await page.goto(URL('/settings'));
    await page.waitForTimeout(2000);
    await page.evaluate(() => { window.confirm = () => true; });
    const resetBtn = page.locator('button').filter({ hasText: /Reset all|clearAll|Clear all/i }).first();
    if ((await resetBtn.count()) === 0) {
      await record('T10: Reset button exists in /settings', false, 'No reset button found');
    } else {
      await resetBtn.click();
      await page.waitForTimeout(1500);
      const remainingKeys = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('jw-')));
      await record('T10: Reset all data button clears all jw-* localStorage keys (including routine)',
        remainingKeys.length === 0,
        `remaining_jw_keys=${JSON.stringify(remainingKeys)}`);
    }
    await page.context().close();
  }

  // ============================================================
  // T11: /ideas page renders with link-out rows (kept from before)
  // ============================================================
  {
    const { page, gotoApp } = await fresh(browser);
    await gotoApp();
    await page.goto(URL('/ideas'));
    await page.waitForTimeout(2500);
    const linkRows = await page.evaluate(() => {
      return [...document.querySelectorAll('div.ios-grouped a.ios-row')].length;
    });
    const hasMultiple = linkRows >= 2;
    await record('T11: /ideas has multiple jw.org link-out rows', hasMultiple, `count=${linkRows}`);
    await page.context().close();
  }

  // ============================================================
  // T12: Fresh user lands directly on the launchpad (no modal,
  // no picker). The launchpad IS the home, with the morning
  // routine as the primary CTA and the directory of 6 habits
  // as a secondary "All habits" link.
  // ============================================================
  {
    const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0, 200)));
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });

    await page.goto(URL('/?bust=' + Date.now()), { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
      Object.keys(localStorage).forEach(k => { if (k.startsWith('jw-')) localStorage.removeItem(k); });
    });
    await page.goto(URL('/?bust=' + Date.now()), { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const hasMorningCard = await page.evaluate(() => {
      return !!document.querySelector('a[href="/routine"]');
    });
    const hasHabitsLink = await page.evaluate(() => {
      return !!document.querySelector('a[href="/habits"]');
    });
    const noModal = await page.evaluate(() => {
      return ![...document.querySelectorAll('[class*="fixed"][class*="inset-0"]')].some(el =>
        el.textContent.includes('Welcome')
      );
    });
    const noConsoleErrors = errors.length === 0;
    await record(
      'T12: Fresh user lands on home with morning routine as primary CTA',
      hasMorningCard && hasHabitsLink && noModal && noConsoleErrors,
      `morning_card=${hasMorningCard} habits_link=${hasHabitsLink} no_modal=${noModal} errors=${errors.length}`
    );
    await ctx.close();
  }

  // ============================================================
  // T13: Tapping the morning routine card opens /routine
  // ============================================================
  {
    const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    await page.goto(URL('/?bust=' + Date.now()), { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
      Object.keys(localStorage).forEach(k => { if (k.startsWith('jw-')) localStorage.removeItem(k); });
    });
    await page.goto(URL('/?bust=' + Date.now()), { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.locator('a[href="/routine"]').first().click();
    await page.waitForTimeout(2500);
    const routineVisible = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 && (h1.textContent.includes('Morning') || h1.textContent.includes('routine'));
    });
    const stepsPresent = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('read') && text.includes('pray') && text.includes('reflect');
    });
    await record(
      'T13: Tapping morning routine card opens /routine with 3 steps',
      routineVisible && stepsPresent,
      `routine_visible=${routineVisible} steps_present=${stepsPresent}`
    );
    await ctx.close();
  }

  await browser.close();

  console.log('\n========================================');
  console.log(`VERIFICATION COMPLETE: ${pass} PASS, ${fail} FAIL out of ${results.length} tests`);
  console.log('========================================\n');
  results.forEach(r => {
    console.log(`${r.ok ? '✓' : '✗'} ${r.name}`);
    if (!r.ok) console.log(`   ${r.detail}`);
  });
  process.exit(fail > 0 ? 1 : 0);
})().catch(err => {
  console.error('Test crashed:', err);
  process.exit(2);
});
