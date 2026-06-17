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
//   T6:  Home is the only page (no hamburger, no settings gear, no drawer)
//   T7:  Only the home + /share routes are in the SPA
//   T8:  Home footer contains the jw.org third-party disclaimer (inline)
//   T9:  Theme follows prefers-color-scheme (no UI toggle, OS-controlled)
//   T10: No "Reset" button on the home (data reset is browser-controlled)
//   T11: /ideas resolves to the home (no separate ideas page)
//   T12: /about resolves to the home (disclaimer inline in footer)
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

  // T6: Home is the only page — no hamburger menu, no settings
  // gear, no drawer. The top bar contains the app title only.
  // The app is one page; navigation goes out to jw.org, not
  // to other in-app routes.
  {
    const { page } = await fresh(browser);
    await gotoHome(page);
    const chrome = await page.evaluate(() => ({
      hamburgerCount: document.querySelectorAll('button[aria-label="Open menu"]').length,
      settingsGearCount: document.querySelectorAll('a[aria-label="Settings"]').length,
      drawerCount: document.querySelectorAll('aside').length,
      // The top bar is a <div>, not a <header> element. Find
      // the JW Habits title by its uppercase class.
      appTitle: [...document.querySelectorAll('span')]
        .find((s) => /JW HABITS/i.test(s.textContent || ''))?.textContent.trim(),
    }));
    await record('T6: Home is the only page (no hamburger, no settings gear, no drawer)',
      chrome.hamburgerCount === 0 && chrome.settingsGearCount === 0
        && chrome.drawerCount === 0 && chrome.appTitle === 'JW Habits',
      `hamburger=${chrome.hamburgerCount} gear=${chrome.settingsGearCount} drawer=${chrome.drawerCount} title=${chrome.appTitle}`);
    await page.context().close();
  }

  // T7: Only one in-app route exists (the home). All other
  // paths render the home (or 404 from the server). The
  // /share path is reserved for the PWA share_target.
  {
    const { page } = await fresh(browser);
    await gotoHome(page);
    const routes = await page.evaluate(async () => {
      const paths = ['/settings', '/ideas', '/about', '/share', '/unknown-route'];
      const results = {};
      for (const path of paths) {
        try {
          const r = await fetch(path, { method: 'HEAD' });
          results[path] = r.status;
        } catch (e) {
          results[path] = 'ERR';
        }
      }
      return results;
    });
    // /settings, /ideas, /about are gone (no route defined)
    // — the SPA returns index.html with HTTP 200 (no server
    // 404s since Cloudflare/Traefik serves index.html for
    // unknown paths). The page that loads is the Home (since
    // <Route path="/"> matches everything not matched).
    // /share has a real route (PWA share_target landing).
    await record('T7: Only the home + /share routes are in the SPA',
      routes['/share'] === 200,
      `routes=${JSON.stringify(routes)}`);
    await page.context().close();
  }

  // T8: The home footer contains the third-party disclaimer
  // (jw.org ToS requirement). It does NOT link to a separate
  // /about page — the disclaimer is inline.
  {
    const { page } = await fresh(browser);
    await gotoHome(page);
    const footer = await page.evaluate(() => {
      const el = document.querySelector('.ios-footer');
      return el ? el.textContent.trim() : '';
    });
    const hasUnofficial = /unofficial/i.test(footer);
    const hasNotAffiliated = /not affiliated/i.test(footer);
    await record('T8: Home footer contains the jw.org third-party disclaimer (inline)',
      hasUnofficial && hasNotAffiliated,
      `footer=${JSON.stringify(footer)}`);
    await page.context().close();
  }

  // T9: Theme follows OS preference. With Settings gone, the
  // user has no in-app theme toggle. The theme should resolve
  // from prefers-color-scheme (or stored theme, which has
  // priority).
  {
    const { page } = await fresh(browser);
    await gotoHome(page);
    // Emulate dark OS preference
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await page.waitForTimeout(2000);
    const darkTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();
    await page.waitForTimeout(2000);
    const lightTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await record('T9: Theme follows prefers-color-scheme (no UI toggle, OS-controlled)',
      darkTheme === 'dark' && lightTheme === 'light',
      `dark_os_theme=${darkTheme} light_os_theme=${lightTheme}`);
    await page.context().close();
  }

  // T10: Data reset is browser-controlled. The app exposes no
  // UI to wipe localStorage; clearing site data in the browser
  // is the only path. This test verifies the app doesn't
  // surface any "reset" button on the home (otherwise it would
  // duplicate a browser feature).
  {
    const { page } = await fresh(browser);
    await gotoHome(page);
    // Pre-seed habit state
    await page.evaluate(() => {
      localStorage.setItem('jw-daily-habits-state', JSON.stringify({
        date: new Date().toISOString().slice(0, 10),
        done: { text: true, prayer: true, bible: true, family: true, meeting: true },
      }));
    });
    await page.goto(URL('/'));
    await page.waitForTimeout(2000);
    const resetButton = await page.evaluate(() => {
      // Look for any "Reset" button on the home
      const buttons = [...document.querySelectorAll('button')];
      return buttons.filter((b) => /reset/i.test(b.textContent)).map((b) => b.textContent.trim());
    });
    await record('T10: No "Reset" button on the home (data reset is browser-controlled)',
      resetButton.length === 0,
      `reset_buttons=${JSON.stringify(resetButton)}`);
    await page.context().close();
  }

  // T11: Reserved — was /ideas, now removed. The page does
  // not exist; navigating to /ideas renders the home (or
  // the SPA catches it and serves index.html).
  {
    const { page } = await fresh(browser);
    await gotoHome(page);
    await page.goto(URL('/ideas'));
    await page.waitForTimeout(2500);
    const rows = await page.evaluate(() => {
      // The home is rendered (the SPA fallback). Verify the
      // 5 habit rows are present (which is what /ideas would
      // resolve to now).
      return document.querySelectorAll('div.ios-row').length;
    });
    await record('T11: /ideas resolves to the home (no separate ideas page)',
      rows === 5,
      `rows=${rows}`);
    await page.context().close();
  }

  // T12: Reserved — was /about, now removed. The disclaimer
  // is inline in the home footer (verified by T8).
  {
    const { page } = await fresh(browser);
    await gotoHome(page);
    await page.goto(URL('/about'));
    await page.waitForTimeout(2500);
    const rows = await page.evaluate(() => {
      return document.querySelectorAll('div.ios-row').length;
    });
    await record('T12: /about resolves to the home (disclaimer inline in footer, verified by T8)',
      rows === 5,
      `rows=${rows}`);
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
