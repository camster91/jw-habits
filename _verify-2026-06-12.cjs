// _verify-2026-06-12.cjs
//
// Live persona verification for jw-habits. The home is a
// single page with 5 habit rows. Each row has a link to a
// jw.org surface (Daily text, Daily Bible reading, Meeting
// prep, Family worship, Prayer) and a checkbox to mark
// "done". State is per-day localStorage, no animations, no
// streak, no XP.
//
// Tests verify:
//   T1:  Home has greeting + 5 habit rows
//   T2:  Each row links to a real jw.org URL
//   T3:  Tapping a checkbox marks the habit done
//   T4:  Unchecking returns the row to its original state
//   T5:  Per-day reset (state from yesterday doesn't carry over)
//   T6:  Hamburger menu opens the side drawer
//   T7:  Drawer has Settings + Ideas + About
//   T8:  /settings renders (Appearance + Data reset)
//   T9:  Dark mode toggle writes to localStorage AND updates data-theme
//   T10: Reset button clears all jw-* localStorage keys
//   T11: /ideas page renders
//   T12: /about page renders
//   T13: No console errors, no 404s on the home page
//   T14: Done state persists across page reload
//   T15: First-launch hint shows once, hides after first tap

const { chromium } = require('playwright');

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
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message.slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });
  return { ctx, page, errors };
}

async function gotoHome(page) {
  // Wipe jw-* localStorage, then visit home
  await page.goto(URL('/'));
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    Object.keys(localStorage).forEach((k) => { if (k.startsWith('jw-')) localStorage.removeItem(k); });
  });
  await page.goto(URL('/'));
  await page.waitForTimeout(3000);
}

(async () => {
  const browser = await chromium.launch();

  // T1: Home has greeting + 5 habit rows (text, bible, meeting, family, prayer)
  {
    const { page } = await fresh(browser);
    await gotoHome(page);
    const greet = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.textContent : 'no h1';
    });
    // i18n keys produce capitalized "Good Morning" via
    // the default English translation, but the i18n resource
    // also has the lowercase version. Match case-insensitive.
    const hasGreeting = /good\s+(morning|afternoon|evening|night)/i.test(greet);
    const rowTitles = await page.evaluate(() => {
      return [...document.querySelectorAll('div.ios-grouped div.ios-row .title')].map((el) => el.textContent.trim());
    });
    const expected = ['Daily text', 'Daily Bible reading', 'Meeting prep', 'Family worship', 'Prayer'];
    const allPresent = expected.every((t) => rowTitles.includes(t));
    const exactOrder = JSON.stringify(rowTitles) === JSON.stringify(expected);
    await record('T1: Home has greeting + 5 habit rows in Cam\'s order',
      hasGreeting && allPresent && exactOrder,
      `greeting="${greet.slice(0, 60)}" rows=${JSON.stringify(rowTitles)}`);
    await page.context().close();
  }

  // T2: Each row links to a real jw.org URL (target=_blank)
  {
    const { page } = await fresh(browser);
    await gotoHome(page);
    const linkData = await page.evaluate(() => {
      return [...document.querySelectorAll('div.ios-grouped div.ios-row a[href]')].map((a) => ({
        href: a.getAttribute('href'),
        target: a.getAttribute('target'),
        rel: a.getAttribute('rel'),
      }));
    });
    const allJwOrg = linkData.every((l) =>
      l.href && (/^https:\/\/(www\.)?jw\.org\/|^https:\/\/wol\.jw\.org\/|^jwlibrary:\/\/\//.test(l.href)) &&
      l.target === '_blank' && l.rel && l.rel.includes('noopener')
    );
    await record('T2: All 5 habit rows open jw.org or jwlibrary in new tab (noopener)',
      allJwOrg && linkData.length === 5,
      `count=${linkData.length} urls=${JSON.stringify(linkData.map((l) => l.href?.slice(0, 50)))}`);
    await page.context().close();
  }

  // T3: Tapping a checkbox marks the habit done
  {
    const { page } = await fresh(browser);
    await gotoHome(page);
    // Find the first checkbox button
    const firstCheckbox = page.locator('button[aria-pressed]').first();
    if ((await firstCheckbox.count()) === 0) {
      await record('T3: Checkbox toggles per-habit done state', false, 'No checkbox button found');
    } else {
      const before = await firstCheckbox.evaluate((el) => el.getAttribute('aria-pressed'));
      const beforeHasCheck = await firstCheckbox.evaluate((el) => !!el.querySelector('svg polyline'));
      await firstCheckbox.click();
      await page.waitForTimeout(500);
      const after = await firstCheckbox.evaluate((el) => el.getAttribute('aria-pressed'));
      const afterHasCheck = await firstCheckbox.evaluate((el) => !!el.querySelector('svg polyline'));
      const stored = await page.evaluate(() => {
        try { return JSON.parse(localStorage.getItem('jw-daily-habits-state')); } catch { return null; }
      });
      const wasToggled = before === 'false' && after === 'true';
      const wasDrawn = !beforeHasCheck && afterHasCheck;
      const wasStored = stored && Object.values(stored.done).some(Boolean);
      await record('T3: Checkbox toggles aria-pressed + draws check + persists to localStorage',
        wasToggled && wasDrawn && wasStored,
        `aria_before=${before} aria_after=${after} svg_before=${beforeHasCheck} svg_after=${afterHasCheck} stored_keys=${Object.keys(stored?.done || {}).length}`);
    }
    await page.context().close();
  }

  // T4: Tapping again un-marks the habit (toggle behavior)
  {
    const { page } = await fresh(browser);
    await gotoHome(page);
    // Pre-seed one done
    await page.evaluate(() => {
      localStorage.setItem('jw-daily-habits-state', JSON.stringify({
        date: new Date().toISOString().slice(0, 10),
        done: { text: true },
      }));
    });
    await page.goto(URL('/'));
    await page.waitForTimeout(3000);
    const firstCheckbox = page.locator('button[aria-pressed]').first();
    if ((await firstCheckbox.count()) === 0) {
      await record('T4: Checkbox un-toggles a previously-marked habit', false, 'No checkbox button found');
    } else {
      const before = await firstCheckbox.evaluate((el) => el.getAttribute('aria-pressed'));
      await firstCheckbox.click();
      await page.waitForTimeout(500);
      const after = await firstCheckbox.evaluate((el) => el.getAttribute('aria-pressed'));
      const stored = await page.evaluate(() => {
        try { return JSON.parse(localStorage.getItem('jw-daily-habits-state')); } catch { return null; }
      });
      const wasUntoggled = before === 'true' && after === 'false';
      const wasUnStored = stored && (stored.done?.text === false || stored.done?.text === undefined);
      await record('T4: Checkbox un-toggles a previously-marked habit',
        wasUntoggled && wasUnStored,
        `aria_before=${before} aria_after=${after} stored_text=${stored?.done?.text}`);
    }
    await page.context().close();
  }

  // T5: Per-day reset (state from yesterday doesn't carry over)
  {
    const { page } = await fresh(browser);
    await gotoHome(page);
    // Pre-seed with a YESTERDAY date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);
    await page.evaluate((y) => {
      localStorage.setItem('jw-daily-habits-state', JSON.stringify({
        date: y,
        done: { text: true, bible: true, prayer: true, family: true, meeting: true },
      }));
    }, yesterdayKey);
    await page.goto(URL('/'));
    await page.waitForTimeout(3000);
    // All 5 checkboxes should be unchecked on screen (yesterday's done don't carry over)
    const checkedStates = await page.evaluate(() => {
      return [...document.querySelectorAll('button[aria-pressed]')].map((el) => el.getAttribute('aria-pressed'));
    });
    const allUnchecked = checkedStates.every((s) => s === 'false') && checkedStates.length === 5;
    // But the localStorage date should have been replaced with today
    const stored = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('jw-daily-habits-state')); } catch { return null; }
    });
    const todayKey = new Date().toISOString().slice(0, 10);
    const isToday = stored && stored.date === todayKey && Object.values(stored.done).every((v) => !v);
    await record('T5: Per-day reset (yesterday\'s done does not carry over)',
      allUnchecked && isToday,
      `aria_pressed=${JSON.stringify(checkedStates)} stored_date=${stored?.date} stored_done=${JSON.stringify(stored?.done)}`);
    await page.context().close();
  }

  // T6: Hamburger menu opens the side drawer
  {
    const { page } = await fresh(browser);
    await gotoHome(page);
    const menuBtn = page.locator('button[aria-label="Open menu"]').first();
    if ((await menuBtn.count()) === 0) {
      await record('T6: Hamburger menu opens the side drawer', false, 'Menu button (aria-label="Open menu") not found');
    } else {
      await menuBtn.click();
      await page.waitForTimeout(800);
      const drawerVisible = await page.evaluate(() => {
        return [...document.querySelectorAll('aside, [aria-label*="menu"], [role="dialog"]')].length > 0
          || [...document.querySelectorAll('*')].some((el) => el.textContent.includes('Settings') && el.textContent.includes('Ideas'));
      });
      await record('T6: Hamburger menu opens the side drawer', drawerVisible, `drawer_visible=${drawerVisible}`);
    }
    await page.context().close();
  }

  // T7: Drawer has Settings + Ideas + About (no Routine, no All habits — those are gone)
  {
    const { page } = await fresh(browser);
    await gotoHome(page);
    const menuBtn = page.locator('button[aria-label="Open menu"]').first();
    await menuBtn.click();
    await page.waitForTimeout(800);
    const drawerItems = await page.evaluate(() => {
      return [...document.querySelectorAll('aside button')].map((b) => b.textContent.trim().slice(0, 60));
    });
    const hasSettings = drawerItems.some((t) => t.includes('Settings'));
    const hasIdeas = drawerItems.some((t) => t.includes('Ideas'));
    const hasAbout = drawerItems.some((t) => t.includes('About'));
    const hasRoutine = drawerItems.some((t) => t.toLowerCase().includes('routine'));
    const hasAllHabits = drawerItems.some((t) => t.toLowerCase().includes('habits'));
    await record('T7: Drawer has Settings + Ideas + About (no Routine, no All habits)',
      hasSettings && hasIdeas && hasAbout && !hasRoutine && !hasAllHabits,
      `items=${JSON.stringify(drawerItems)}`);
    await page.context().close();
  }

  // T8: /settings page renders with Appearance + Data reset (no Notifications)
  {
    const { page } = await fresh(browser);
    await gotoHome(page);
    await page.goto(URL('/settings'));
    await page.waitForTimeout(2500);
    const sections = await page.evaluate(() => {
      return [...document.querySelectorAll('h2')].map((h) => h.textContent.trim().slice(0, 50));
    });
    const hasAppearance = sections.some((s) => s.includes('Appearance'));
    const hasDataReset = sections.some((s) => s.includes('Data reset') || s.includes('Data management'));
    const noNotifications = !sections.some((s) => s.toLowerCase().includes('notification'));
    const noDailyRoutine = !sections.some((s) => s.toLowerCase().includes('daily routine'));
    await record('T8: /settings has Appearance + Data reset, no Notifications',
      hasAppearance && hasDataReset && noNotifications && noDailyRoutine,
      `sections=${JSON.stringify(sections)}`);
    await page.context().close();
  }

  // T9: Dark mode toggle writes to localStorage AND updates data-theme
  {
    const { page } = await fresh(browser);
    await gotoHome(page);
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

  // T10: Reset all data button clears all jw-* localStorage keys (incl. habit state)
  {
    const { page } = await fresh(browser);
    await gotoHome(page);
    // Pre-seed habit state + fake data
    await page.evaluate(() => {
      localStorage.setItem('jw-daily-habits-state', JSON.stringify({
        date: '2026-06-14',
        done: { text: true, prayer: true, bible: true, family: true, meeting: true },
      }));
      localStorage.setItem('jw-fake-key', 'foo');
      localStorage.setItem('jw-progress-settings', JSON.stringify({ state: { theme: 'dark' }, version: 0 }));
    });
    await page.goto(URL('/settings'));
    await page.waitForTimeout(2000);
    await page.evaluate(() => { window.confirm = () => true; });
    const resetBtn = page.locator('button').filter({ hasText: /Reset all|Clear all/i }).first();
    if ((await resetBtn.count()) === 0) {
      await record('T10: Reset button exists in /settings', false, 'No reset button found');
    } else {
      await resetBtn.click();
      await page.waitForTimeout(1500);
      const remainingKeys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('jw-')));
      await record('T10: Reset clears all jw-* localStorage keys (including habit state)',
        remainingKeys.length === 0,
        `remaining_jw_keys=${JSON.stringify(remainingKeys)}`);
    }
    await page.context().close();
  }

  // T11: /ideas page renders
  {
    const { page } = await fresh(browser);
    await gotoHome(page);
    await page.goto(URL('/ideas'));
    await page.waitForTimeout(2500);
    const linkRows = await page.evaluate(() => {
      return [...document.querySelectorAll('div.ios-grouped a.ios-row')].length;
    });
    await record('T11: /ideas has link-out rows', linkRows >= 2, `count=${linkRows}`);
    await page.context().close();
  }

  // T12: /about page renders with disclaimer
  {
    const { page } = await fresh(browser);
    await gotoHome(page);
    await page.goto(URL('/about'));
    await page.waitForTimeout(2500);
    const hasDisclaimer = await page.evaluate(() => {
      return document.body.innerText.toLowerCase().includes('unofficial')
        || document.body.innerText.toLowerCase().includes('third-party');
    });
    await record('T12: /about page renders with disclaimer', hasDisclaimer, `body_excerpt="${(await page.evaluate(() => document.body.innerText.slice(0, 200)))})"`);
    await page.context().close();
  }

  // T13: No console errors, no 404s on the home page
  {
    const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    const errors = [];
    const network404s = [];
    page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message.slice(0, 200)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });
    page.on('response', (resp) => { if (resp.status() === 404) network404s.push(resp.url()); });

    await page.goto(URL('/?bust=' + Date.now()));
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
      Object.keys(localStorage).forEach((k) => { if (k.startsWith('jw-')) localStorage.removeItem(k); });
    });
    await page.goto(URL('/?bust=' + Date.now()), { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 5 habit rows visible + all links present + no /routine or /habits routes
    const hasFiveRows = await page.evaluate(() => {
      return document.querySelectorAll('div.ios-grouped div.ios-row').length === 5;
    });
    const noOrphanRoutes = await page.evaluate(() => {
      // The home should be a single page; verify no leftover
      // /routine or /habits links anywhere
      return ![...document.querySelectorAll('a[href*="/routine"], a[href*="/habits"]')].some((a) => {
        return a.getAttribute('href') === '/routine' || a.getAttribute('href') === '/habits'
          || a.getAttribute('href')?.startsWith('/routine/') || a.getAttribute('href')?.startsWith('/habits/');
      });
    });
    const noErrors = errors.length === 0;
    const no404s = network404s.length === 0;
    await record('T13: Home renders 5 rows, no /routine or /habits, no console errors, no 404s',
      hasFiveRows && noOrphanRoutes && noErrors && no404s,
      `rows=${hasFiveRows} no_orphan_routes=${noOrphanRoutes} errors=${errors.length} 404s=${network404s.length}`);
    if (errors.length) console.log('  errors:', errors);
    if (network404s.length) console.log('  404s:', network404s);
    await ctx.close();
  }

  // T14: Done state persists across page reload
  {
    const { page } = await fresh(browser);
    await gotoHome(page);
    // Mark first row done
    const firstCheckbox = page.locator('button[aria-pressed]').first();
    await firstCheckbox.click();
    await page.waitForTimeout(500);
    const beforeReload = await firstCheckbox.evaluate((el) => el.getAttribute('aria-pressed'));
    // Reload
    await page.reload();
    await page.waitForTimeout(3000);
    const firstCheckboxAfter = page.locator('button[aria-pressed]').first();
    const afterReload = await firstCheckboxAfter.evaluate((el) => el.getAttribute('aria-pressed'));
    const stored = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('jw-daily-habits-state')); } catch { return null; }
    });
    await record('T14: Done state persists across page reload',
      beforeReload === 'true' && afterReload === 'true' && stored,
      `before_reload=${beforeReload} after_reload=${afterReload} stored_date=${stored?.date}`);
    await page.context().close();
  }

  // T15: First-launch hint shows once, hides after first tap
  {
    const { page } = await fresh(browser);
    await gotoHome(page);
    // First visit: no jw-habits-first-done key, hint should show
    const beforeTap = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasFirstDone: localStorage.getItem('jw-habits-first-done'),
        hasHint: /Tap a row to open jw\.org\. Tap the checkbox when done\./.test(text),
      };
    });
    // Tap one checkbox
    const firstCheckbox = page.locator('button[aria-pressed]').first();
    await firstCheckbox.click();
    await page.waitForTimeout(500);
    // After tap: hint should be gone, key should be '1'
    const afterTap = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasFirstDone: localStorage.getItem('jw-habits-first-done'),
        hasHint: /Tap a row to open jw\.org\. Tap the checkbox when done\./.test(text),
      };
    });
    // Reload and verify hint stays gone
    await page.reload();
    await page.waitForTimeout(3000);
    const afterReload = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasFirstDone: localStorage.getItem('jw-habits-first-done'),
        hasHint: /Tap a row to open jw\.org\. Tap the checkbox when done\./.test(text),
      };
    });
    await record('T15: First-launch hint shows once, hides after first tap',
      beforeTap.hasHint === true && beforeTap.hasFirstDone === null &&
      afterTap.hasHint === false && afterTap.hasFirstDone === '1' &&
      afterReload.hasHint === false && afterReload.hasFirstDone === '1',
      `before: hint=${beforeTap.hasHint} firstDone=${beforeTap.hasFirstDone} | ` +
      `afterTap: hint=${afterTap.hasHint} firstDone=${afterTap.hasFirstDone} | ` +
      `afterReload: hint=${afterReload.hasHint} firstDone=${afterReload.hasFirstDone}`);
    await page.context().close();
  }

  await browser.close();

  console.log('\n========================================');
  console.log(`VERIFICATION COMPLETE: ${pass} PASS, ${fail} FAIL out of ${results.length} tests`);
  console.log('========================================\n');
  results.forEach((r) => {
    console.log(`${r.ok ? '✓' : '✗'} ${r.name}`);
    if (!r.ok) console.log(`   ${r.detail}`);
  });
  process.exit(fail > 0 ? 1 : 0);
})().catch((err) => {
  console.error('Test crashed:', err);
  process.exit(2);
});
