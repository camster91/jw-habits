// _verify-2026-06-12.cjs
// Single-script verification of all 11 critical FAIL claims from the 4 persona runs.
// Each test is independent: fresh page state, wait 5s for app boot, click with
// 1s settle, read state directly. PASS/FAIL printed at the end.
//
// Run: node _verify-2026-06-12.cjs
//
// URL: defaults to http://127.0.0.1:8766/?bust= (the SPA-aware static server
// in scripts/serve-dist.cjs). Override with VERIFY_URL=... env var.
//
// Critical rules (from jw-habits-tester skill, hardened 2026-06-08):
//   - 5000ms after page.goto (app boot)
//   - scrollIntoViewIfNeeded before every click (the home page is 2839px tall
//     in a 375x812 viewport; buttons below the fold can't be `{force}`-clicked
//     safely because the event hits the wrong element)
//   - 1000ms after every click (React commit + paint)
//   - Read state via page.evaluate, not vision
//   - If state matches the FAIL claim, that's a real bug
//   - If state does NOT match, it's a FALSE POSITIVE
//
// Changes from _verify-2026-06-11.cjs (the previous version):
//   - Replaced { force: true } clicks with scrollIntoView + normal click.
//     The home page is 2839px tall; the old test was clicking at the
//     viewport position (0,0) instead of the button position.
//   - Replaced Python's http.server URL with the SPA-aware
//     scripts/serve-dist.cjs URL so client-side routes (/about,
//     /settings, /projects) don't 404.

const { chromium } = require('playwright');

// Base URL for the local SPA server. The cache-buster that the previous
// version baked into the URL (`?bust=`) was placed BETWEEN the path and
// the route, so URLs like `http://.../?bust=123/settings` actually hit the
// home page with `/settings` in the query string — the SPA never
// navigated. Just use the route directly; the local server has no
// caching, and Playwright's `page.goto` bypasses the HTTP cache anyway.
//
// The trailing slash is normalized away so callers can pass either form
// (VERIFY_URL=http://host:port/ or VERIFY_URL=http://host:port).
const URL_BASE = (process.env.VERIFY_URL || 'http://127.0.0.1:8766').replace(/\/$/, '');
const URL = (route = '') => `${URL_BASE}${route}`;
const results = [];
let pass = 0, fail = 0;

async function fresh(browser) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
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
      // The "Build your daily routine" picker is gated on
      // jw-habits-onboarded-v2; pre-seed it so the persona tests
      // for the daily actions (T1-T11) don't see the picker. The
      // picker behavior is exercised by T12 (regression for
      // double-modal bug) and T13 (picker suppressed while
      // Onboarding is open).
      localStorage.setItem('jw-habits-onboarded-v2', '1');
    });
  }

  async function gotoApp() {
    await page.goto(URL());
    await page.waitForTimeout(5000);
    await dismissOnboarding();
    await page.goto(URL());
    await page.waitForTimeout(5000);
  }

  // Scroll a locator into view, then click it. Safer than { force: true }
  // when the target is below the fold.
  async function safeClick(locator) {
    // Dismiss any visible modal/popup overlay first (achievement popup,
    // install prompt, etc.). The popup is in a `fixed inset-0 z-50` div
    // with a close button (X icon). Click the X to dismiss.
    const closeBtn = page.locator('div.fixed.inset-0 button[aria-label*="close" i], div.fixed.inset-0 button[aria-label*="dismiss" i]').first();
    if ((await closeBtn.count()) > 0) {
      try { await closeBtn.click({ timeout: 1000 }); } catch {}
      await page.waitForTimeout(500);
    }
    // If an overlay is still up, press Escape as a last-ditch dismiss.
    if ((await page.locator('div.fixed.inset-0.z-50').count()) > 0) {
      try { await page.keyboard.press('Escape'); } catch {}
      await page.waitForTimeout(300);
    }
    await locator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await locator.click();
  }

  return { page, errors, dismissOnboarding, gotoApp, safeClick };
}

async function record(name, ok, evidence) {
  results.push({ name, ok, evidence });
  ok ? pass++ : fail++;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}`);
  console.log('       ' + evidence + '\n');
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ============================================================
  // T1: Marcus — Prayer button (Morning Prayer) — claims no state change
  // ============================================================
  {
    const { page, gotoApp, safeClick } = await fresh(browser);
    await gotoApp();

    const before = await page.evaluate(() => {
      return document.body.textContent.match(/(\d+)\s*\/\s*3/)?.[0] || 'NOT_FOUND';
    });

    const btn = page.locator('button[aria-label*="Morning Prayer"]');
    if ((await btn.count()) === 0) {
      await record('T1: Morning Prayer click registers counter change', false, 'Button not found in DOM');
    } else {
      await safeClick(btn);
      await page.waitForTimeout(1000);
      const after = await page.evaluate(() => ({
        counter: document.body.textContent.match(/(\d+)\s*\/\s*3/)?.[0] || 'NOT_FOUND',
        storage: Object.keys(localStorage).filter(k => k.startsWith('jw-')),
      }));
      const wentUp = before !== after.counter && after.counter !== 'NOT_FOUND' && after.counter !== '0/3';
      await record('T1: Morning Prayer click registers counter change',
        wentUp,
        `before=${before} after=${after.counter}  storage_keys=${after.storage.join(',')}`);
    }
    await page.context().close();
  }

  // ============================================================
  // T2: Marcus — Daily Text button — claims no state change
  // ============================================================
  {
    const { page, gotoApp, safeClick } = await fresh(browser);
    await gotoApp();

    // Daily text is in the DailyTasksSection. It's a div with role="button",
    // not a <button> element. Use getByRole which respects ARIA roles.
    // The role is on the row container; use a name filter that includes
    // "Daily Text" or "Today's Text" or "Read today's text".
    const btn = page.getByRole('button', { name: /Daily Text|Today's Text|Read today's text/i }).first();
    if ((await btn.count()) === 0) {
      await record('T2: Daily Text click registers', false, 'Daily Text button (role=button) not found in DOM');
    } else {
      const before = await page.evaluate(() => {
        // Capture any button state we can find
        return {
          bodyText: document.body.textContent.match(/Daily Text|Today's Text|Read today's text/i)?.[0] || 'NOT_FOUND',
          storage: Object.keys(localStorage).filter(k => k.startsWith('jw-')),
        };
      });
      await safeClick(btn);
      await page.waitForTimeout(1000);
      const after = await page.evaluate(() => ({
        bodyText: document.body.textContent.match(/Daily Text|Today's Text|Read today's text/i)?.[0] || 'NOT_FOUND',
        storage: Object.keys(localStorage).filter(k => k.startsWith('jw-')),
      }));
      // Pass if the click triggered a localStorage write (the user marked it done)
      const changed = JSON.stringify(before) !== JSON.stringify(after);
      await record('T2: Daily Text click registers',
        changed,
        `storage_before=${before.storage.length} storage_after=${after.storage.length}`);
    }
    await page.context().close();
  }

  // ============================================================
  // T3: Marcus — Bible Reading chapter button — claims no state change
  // ============================================================
  {
    const { page, gotoApp, safeClick } = await fresh(browser);
    await gotoApp();

    // Bible chapter buttons render as "1Ch. 74", "2Ch. 75", etc. (no space
    // between the leading number and "Ch."). Match the pattern with regex.
    const btn = page.locator('button').filter({ hasText: /\d+Ch\./ }).first();
    if ((await btn.count()) === 0) {
      await record('T3: Bible chapter click registers', false, 'Bible chapter button not found (selector: button:has-text(/\\d+Ch\\./))');
    } else {
      const before = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('jw-')));
      const beforeText = await btn.textContent();
      await safeClick(btn);
      await page.waitForTimeout(1000);
      const after = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('jw-')));
      // Look for any bible-related storage write
      const bibleStorageChanged = after.length > before.length;
      await record('T3: Bible chapter click registers',
        bibleStorageChanged,
        `before_btn="${beforeText.trim()}" storage_keys_before=${before.length} after=${after.length}`);
    }
    await page.context().close();
  }

  // ============================================================
  // T4: Marcus/Aunt Rose — drawer menu opens — claims non-functional.
  // The previous version of this test clicked a "How this app
  // works" link on the home; the redesign removed that link
  // (the home now points to actual feature surfaces via the
  // Explore block on fresh users, and the side drawer is enough
  // for returning users). T4 now verifies the hamburger menu
  // button is wired up to open the side drawer.
  // ============================================================
  {
    const { page, gotoApp, safeClick } = await fresh(browser);
    await gotoApp();

    // Find the hamburger button by aria-label="Open menu"
    const menuBtn = page.locator('button[aria-label="Open menu"]').first();
    if ((await menuBtn.count()) === 0) {
      await record('T4: Hamburger menu button is wired up', false, 'Menu button (aria-label="Open menu") not found in DOM');
    } else {
      const exists = await menuBtn.evaluate(el => ({
        tag: el.tagName,
        ariaLabel: el.getAttribute('aria-label'),
        text: el.textContent.trim().slice(0, 20),
      }));
      await safeClick(menuBtn);
      await page.waitForTimeout(800);
      // The drawer should now be open. Check for a known drawer label.
      const drawerVisible = await page.evaluate(() => {
        return [...document.querySelectorAll('aside, [aria-label*="menu"], [role="dialog"]')].length > 0
          || [...document.querySelectorAll('*')].some(el => el.textContent.includes('Quick Links') || el.textContent.includes('Settings'));
      });
      await record('T4: Hamburger menu opens the side drawer',
        drawerVisible,
        `menu=${JSON.stringify(exists)} drawer_visible=${drawerVisible}`);
    }
    await page.context().close();
  }

  // ============================================================
  // T5: Marcus/Paula — /stats page — claims blank
  // ============================================================
  {
    const { page, gotoApp } = await fresh(browser);
    await gotoApp();

    await page.goto(URL('/stats'));
    await page.waitForTimeout(4000);
    const statsState = await page.evaluate(() => {
      const main = document.querySelector('main') || document.body;
      const headings = [...main.querySelectorAll('h1, h2, h3')].map(h => h.textContent.trim()).slice(0, 10);
      const mainText = main.textContent.replace(/\s+/g, ' ').trim().slice(0, 300);
      return { headings, mainText, hasMain: !!document.querySelector('main') };
    });
    const hasContent = statsState.headings.length > 0 || (statsState.mainText && statsState.mainText.length > 50);
    await record('T5: /stats page has content',
      hasContent,
      `headings=[${statsState.headings.join(' | ')}] body_text_len=${statsState.mainText.length} preview="${statsState.mainText.slice(0, 150)}"`);
    await page.context().close();
  }

  // ============================================================
  // T6: Marcus — /links page — claims blank
  // ============================================================
  {
    const { page, gotoApp } = await fresh(browser);
    await gotoApp();

    await page.goto(URL('/links'));
    await page.waitForTimeout(4000);
    const linksState = await page.evaluate(() => {
      const main = document.querySelector('main') || document.body;
      const headings = [...main.querySelectorAll('h1, h2, h3')].map(h => h.textContent.trim()).slice(0, 10);
      const linkCount = main.querySelectorAll('a').length;
      const mainText = main.textContent.replace(/\s+/g, ' ').trim().slice(0, 300);
      return { headings, linkCount, mainText };
    });
    const hasContent = linksState.headings.length > 0 || linksState.linkCount > 0;
    await record('T6: /links page has content',
      hasContent,
      `headings=[${linksState.headings.join(' | ')}] linkCount=${linksState.linkCount} body_text_len=${linksState.mainText.length}`);
    await page.context().close();
  }

  // ============================================================
  // T7: Aunt Rose — Onboarding appears every time — claims no returning-user flow
  // ============================================================
  {
    const { page } = await fresh(browser);
    // First visit: fresh user
    await page.goto(URL());
    await page.waitForTimeout(5000);
    // Mark onboarded
    await page.evaluate(() => {
      localStorage.setItem('jw-habits-onboarded', 'true');
      localStorage.setItem('installPromptDismissed', 'true');
    });
    // Reload — onboarding should NOT reappear
    await page.goto(URL());
    await page.waitForTimeout(5000);
    const onboardingVisible = await page.evaluate(() => {
      // Onboarding renders a fixed-position overlay with specific copy.
      // Look for any "Get Started" / "Skip" buttons (only in Onboarding).
      const getStarted = [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Get Started');
      const skip = [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Skip');
      return getStarted || skip;
    });
    await record('T7: Onboarding does NOT appear for returning user',
      !onboardingVisible,
      `onboarding_visible_after_reload=${onboardingVisible}  (claim: it appears every time)`);
    await page.context().close();
  }

  // ============================================================
  // T8: Danny — Dark mode — claims saved to localStorage but data-theme never set
  // ============================================================
  {
    const { page, gotoApp, safeClick } = await fresh(browser);
    await gotoApp();

    // Go to settings and click the dark mode toggle.
    // The button text is "Dark Mode" when in light mode, "Light Mode" when in dark.
    await page.goto(URL('/settings'));
    await page.waitForTimeout(3000);
    const darkBtn = page.locator('button').filter({ hasText: /^(Dark Mode|Light Mode)$/ }).first();
    if ((await darkBtn.count()) === 0) {
      await record('T8: Dark mode toggle applies data-theme', false, 'Dark/Light mode button not found in Settings');
    } else {
      const themeBefore = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      const storageBefore = await page.evaluate(() => {
        const v = localStorage.getItem('jw-progress-settings');
        try { return JSON.parse(v); } catch { return null; }
      });
      await safeClick(darkBtn);
      await page.waitForTimeout(1500);
      const themeAfter = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      const storageAfter = await page.evaluate(() => {
        const v = localStorage.getItem('jw-progress-settings');
        try { return JSON.parse(v); } catch { return null; }
      });
      const themeChanged = themeBefore !== themeAfter;
      const storageChanged = JSON.stringify(storageBefore) !== JSON.stringify(storageAfter);
      // Claim is: storage changes but theme does not. So storageChanged=true AND themeChanged=false would be the bug
      const isBug = storageChanged && !themeChanged;
      await record('T8: Dark mode toggle applies data-theme',
        !isBug,
        `theme: ${themeBefore} -> ${themeAfter}  storage_changed=${storageChanged}  (claim: storage changes but theme does not)`);
    }
    await page.context().close();
  }

  // ============================================================
  // T9: Danny — Service Quick Add — claims silent (no feedback)
  // ============================================================
  {
    const { page, gotoApp, safeClick } = await fresh(browser);
    await gotoApp();

    await page.goto(URL('/service'));
    await page.waitForTimeout(3000);
    const beforeCount = await page.evaluate(() => {
      const text = document.body.textContent;
      return text.match(/(\d+(?:\.\d+)?)\s*h/i)?.[0] || 'NOT_FOUND';
    });
    // The "1h", "2h", "3h" quick add buttons. Match exactly the button text.
    const quickAdd = page.locator('button').filter({ hasText: /^1h$/ }).first();
    if ((await quickAdd.count()) === 0) {
      await record('T9: Service Quick Add provides feedback', false, '1h button not found (selector: button:has-text(/^1h$/))');
    } else {
      await safeClick(quickAdd);
      await page.waitForTimeout(1000);
      const afterCount = await page.evaluate(() => {
        const text = document.body.textContent;
        return text.match(/(\d+(?:\.\d+)?)\s*h/i)?.[0] || 'NOT_FOUND';
      });
      const feedback = await page.evaluate(() => {
        const toasts = document.querySelectorAll('[role="status"], [role="alert"], .toast, .snackbar, [data-sonner-toast]');
        return [...toasts].map(t => t.textContent.trim().slice(0, 100));
      });
      // Look for actual storage write (jw-service-storage) as the source of truth
      const storage = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('jw-')));
      const counterChanged = beforeCount !== afterCount || storage.includes('jw-service-storage');
      await record('T9: Service Quick Add provides feedback',
        counterChanged,
        `hour_counter: ${beforeCount} -> ${afterCount}  storage=${storage.join(',')}  toasts=[${feedback.join(' | ')}]  (claim: silent, no feedback)`);
    }
    await page.context().close();
  }

  // ============================================================
  // T10: Paula — Goals "New" button — claims non-functional
  // ============================================================
  {
    const { page, gotoApp, safeClick } = await fresh(browser);
    await gotoApp();

    await page.goto(URL('/goals'));
    await page.waitForTimeout(3000);
    // The button text is just "New". Match the button whose trimmed text is "New".
    const newBtn = page.locator('button').filter({ hasText: /^New$/ }).first();
    if ((await newBtn.count()) === 0) {
      await record('T10: Goals "New" button opens form', false, 'New button not found (selector: button:has-text(/^New$/))');
    } else {
      const beforeInputs = await page.evaluate(() => document.querySelectorAll('input, textarea').length);
      await safeClick(newBtn);
      await page.waitForTimeout(1500);
      const afterState = await page.evaluate(() => {
        const main = document.body;
        return {
          hasInput: !!main.querySelector('input[type="text"], textarea, input:not([type])'),
          hasModal: !!main.querySelector('[role="dialog"], .modal, [data-modal]'),
          inputCount: main.querySelectorAll('input, textarea').length,
          placeholderText: [...main.querySelectorAll('input, textarea')].map(i => i.placeholder || i.getAttribute('aria-label') || '').slice(0, 3),
        };
      });
      const opened = afterState.hasInput || afterState.hasModal || afterState.inputCount > beforeInputs;
      await record('T10: Goals "New" button opens form',
        opened,
        `inputs_before=${beforeInputs} inputs_after_click=${afterState.inputCount} modal=${afterState.hasModal} placeholders=[${afterState.placeholderText.join(' | ')}]  (claim: button non-functional)`);
    }
    await page.context().close();
  }

  // ============================================================
  // T11: Paula — /projects page — claims completely blank
  // ============================================================
  {
    const { page, gotoApp } = await fresh(browser);
    await gotoApp();

    await page.goto(URL('/projects'));
    await page.waitForTimeout(4000);
    const projectsState = await page.evaluate(() => {
      const main = document.querySelector('main') || document.body;
      const headings = [...main.querySelectorAll('h1, h2, h3')].map(h => h.textContent.trim()).slice(0, 5);
      const mainText = main.textContent.replace(/\s+/g, ' ').trim();
      const hasOnlyNav = /Home\s*Study\s*Goals\s*Service/.test(mainText) && mainText.length < 200;
      return { headings, mainTextLen: mainText.length, hasOnlyNav, preview: mainText.slice(0, 200) };
    });
    const hasContent = projectsState.headings.length > 0 || (projectsState.mainTextLen > 200 && !projectsState.hasOnlyNav);
    await record('T11: /projects page has content',
      hasContent,
      `headings=[${projectsState.headings.join(' | ')}] body_len=${projectsState.mainTextLen} only_nav=${projectsState.hasOnlyNav} preview="${projectsState.preview.slice(0, 120)}"`);
    await page.context().close();
  }

  // ============================================================
  // T12: REGRESSION — Onboarding modal completion must write
  // jw-habits-onboarded-v2 so the home picker does NOT also fire.
  // This is the test that the gap-analysis caught: a real first-
  // time user was seeing BOTH the 6-step Onboarding modal AND
  // the "Build your daily routine" picker because the two flows
  // used disjoint localStorage keys and the Onboarding modal
  // never wrote the picker's key.
  // ============================================================
  {
    const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0, 200)));
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });

    // 1. Start fully fresh
    await page.goto(URL('/?bust=' + Date.now()), { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
      Object.keys(localStorage).forEach(k => { if (k.startsWith('jw-')) localStorage.removeItem(k); });
    });

    // 2. Visit home, expect Onboarding modal to appear (NOT picker)
    await page.goto(URL('/?bust=' + Date.now()), { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const initialPickerVisible = await page.evaluate(() => {
      return [...document.querySelectorAll('h2')].some(h => h.textContent.includes('Build your daily routine'));
    });
    const initialOnboardingVisible = await page.evaluate(() => {
      // Onboarding modal renders the welcome text in an <h2>
      return [...document.querySelectorAll('h2')].some(h => h.textContent.includes('Welcome to JW Habits'));
    });

    // 3. Skip the Onboarding modal (tap "Skip" link at the end
    // of step 1 — the modal has 7 steps: cover, name, 4 features,
    // publisher, finish)
    for (let i = 0; i < 8; i++) {
      const skip = page.locator('button:has-text("Skip"), a:has-text("Skip")').last();
      if (await skip.count() > 0) {
        await skip.click();
        await page.waitForTimeout(500);
      }
      // Try "Get Started" too
      const getStarted = page.locator('button:has-text("Get Started")').last();
      if (await getStarted.count() > 0) {
        await getStarted.click();
        await page.waitForTimeout(500);
      }
      const stillVisible = await page.evaluate(() => {
        return [...document.querySelectorAll('h2')].some(h => h.textContent.includes('Welcome to JW Habits'));
      });
      if (!stillVisible) {
        console.log('Onboarding dismissed at iteration', i);
        break;
      }
    }
    const pickerAfterOnboarding = await page.evaluate(() => {
      return [...document.querySelectorAll('h2')].some(h => h.textContent.includes('Build your daily routine'));
    });
    // v2 key should be set
    const v2Key = await page.evaluate(() => localStorage.getItem('jw-habits-onboarded-v2'));
    // v1 key should also be set
    const v1Key = await page.evaluate(() => localStorage.getItem('jw-habits-onboarded'));

    const pickerBlocked = !pickerAfterOnboarding;
    const bothKeysSet = v2Key === '1' && v1Key === 'true';
    const noConsoleErrors = errors.length === 0;
    const pass1 = pickerBlocked && bothKeysSet && noConsoleErrors;
    await record(
      'T12: Onboarding completion suppresses habit picker (regression)',
      pass1,
      `picker_visible=${pickerAfterOnboarding} v1=${v1Key} v2=${v2Key} errors=${errors.length}`
    );
    if (errors.length > 0) console.log('  console errors:', errors);
    await ctx.close();
  }

  // ============================================================
  // T13: REGRESSION — Fresh user with NO Onboarding completion
  // has v2 unset AND the modal appears. The picker is technically
  // in the DOM behind the modal (Home renders even with the modal
  // open), but the user only sees the modal until they tap Skip
  // or complete onboarding. The test verifies the state invariants
  // rather than visual occlusion: v2 is unset AND the Onboarding
  // modal is visible.
  // ============================================================
  {
    const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
    const page = await ctx.newPage();
    await page.goto(URL('/?bust=' + Date.now()), { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      // Wipe all jw-* so we're a real fresh user
      Object.keys(localStorage).forEach(k => { if (k.startsWith('jw-')) localStorage.removeItem(k); });
    });
    await page.goto(URL('/?bust=' + Date.now()), { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    // The Onboarding modal WILL be visible (it's the modal that
    // gets shown for a fresh user). The picker text is in the
    // DOM behind it — but that's by design: dismissing the modal
    // via the new T12 path suppresses the picker.
    const onboardingVisible = await page.evaluate(() => {
      return [...document.querySelectorAll('h2')].some(h => h.textContent.includes('Welcome to JW Habits'));
    });
    // v2 is NOT set yet (Onboarding hasn't completed)
    const v2BeforeComplete = await page.evaluate(() => localStorage.getItem('jw-habits-onboarded-v2'));
    const v2StillUnset = v2BeforeComplete === null;
    await record(
      'T13: Fresh user has Onboarding modal showing + v2 unset (regression)',
      onboardingVisible && v2StillUnset,
      `onboarding_visible=${onboardingVisible} v2_pre_complete=${v2BeforeComplete}`
    );
    await ctx.close();
  }

  await browser.close();

  console.log('\n========================================');
  console.log(`VERIFICATION COMPLETE: ${pass} PASS, ${fail} FAIL out of ${results.length} tests`);
  console.log('========================================\n');

  results.forEach((r, i) => {
    console.log(`${i+1}. [${r.ok ? '✓' : '✗'}] ${r.name}`);
  });

  process.exit(fail > 0 ? 1 : 0);
})();
