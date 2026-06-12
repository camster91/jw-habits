// _verify-2026-06-11.cjs
// Single-script verification of all 11 critical FAIL claims from the 4 persona runs.
// Each test is independent: fresh page state, wait 5s for app boot, click with
// 1s settle, read state directly. PASS/FAIL printed at the end.
//
// Critical rules (from jw-habits-tester skill, hardened 2026-06-08):
//   - 5000ms after page.goto (app boot)
//   - 1000ms after every click (React commit + paint)
//   - Read state via page.evaluate, not vision
//   - If state matches the FAIL claim, that's a real bug
//   - If state does NOT match, it's a FALSE POSITIVE
//
// Run: node _verify-2026-06-11.cjs

const { chromium } = require('playwright');

const URL = 'https://jwhabits.ashbi.ca/?bust=';
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
      if (!localStorage.getItem('jw-habits-onboarded')) {
        localStorage.setItem('jw-habits-onboarded', 'true');
      }
      // Clear all data so tests start from zero
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('jw-')) localStorage.removeItem(k);
      });
      // Mark install prompt as dismissed
      localStorage.setItem('installPromptDismissed', 'true');
    });
  }

  async function gotoApp() {
    await page.goto(URL + Date.now());
    await page.waitForTimeout(5000);
    await dismissOnboarding();
    await page.goto(URL + Date.now());
    await page.waitForTimeout(5000);
  }

  return { page, errors, dismissOnboarding, gotoApp };
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
    const { page, errors, gotoApp } = await fresh(browser);
    await gotoApp();

    // Read counter before
    const before = await page.evaluate(() => {
      return document.body.textContent.match(/(\d+)\s*\/\s*3/)?.[0] || 'NOT_FOUND';
    });

    // Click "Morning Prayer" button
    const btn = await page.$('button:has-text("Morning Prayer")');
    if (!btn) {
      await record('T1: Morning Prayer click registers counter change', false, 'Button not found in DOM');
    } else {
      await btn.click({ force: true });
      await page.waitForTimeout(1000);
      const after = await page.evaluate(() => {
        return {
          counter: document.body.textContent.match(/(\d+)\s*\/\s*3/)?.[0] || 'NOT_FOUND',
          storage: Object.keys(localStorage).filter(k => k.startsWith('jw-')).reduce((acc, k) => {
            const v = localStorage.getItem(k);
            try { acc[k] = JSON.parse(v); } catch { acc[k] = v?.slice(0, 100); }
            return acc;
          }, {}),
        };
      });
      const wentUp = before !== after.counter && after.counter !== 'NOT_FOUND' && after.counter !== '0/3';
      await record('T1: Morning Prayer click registers counter change',
        wentUp,
        `before=${before} after=${after.counter}  storage_keys=${Object.keys(after.storage).join(',')}`);
    }
    await page.context().close();
  }

  // ============================================================
  // T2: Marcus — Daily Text button — claims no state change
  // ============================================================
  {
    const { page, gotoApp } = await fresh(browser);
    await gotoApp();

    // Find "Daily Text" button (in the TODAY section)
    const btn = await page.$('button:has-text("Daily Text")');
    if (!btn) {
      await record('T2: Daily Text click registers', false, 'Button not found');
    } else {
      // Capture class before
      const before = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Daily Text'));
        return { className: b?.className, hasChecked: b?.querySelector('svg.lucide-check, [data-checked="true"]') !== null };
      });
      await btn.click({ force: true });
      await page.waitForTimeout(1000);
      const after = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Daily Text'));
        return { className: b?.className, hasChecked: b?.querySelector('svg.lucide-check, [data-checked="true"]') !== null };
      });
      const changed = JSON.stringify(before) !== JSON.stringify(after);
      await record('T2: Daily Text click registers',
        changed,
        `before=${JSON.stringify(before).slice(0,100)} after=${JSON.stringify(after).slice(0,100)}`);
    }
    await page.context().close();
  }

  // ============================================================
  // T3: Marcus — Bible Reading chapter button (1 Ch. 69) — claims no state change
  // ============================================================
  {
    const { page, gotoApp } = await fresh(browser);
    await gotoApp();

    // Find "1 Ch. 69" button
    const btn = await page.$('button:has-text("Ch. 69")');
    if (!btn) {
      await record('T3: Bible chapter click registers', false, 'Button not found');
    } else {
      const before = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Ch. 69'));
        return { className: b?.className, text: b?.textContent?.trim().slice(0, 50) };
      });
      await btn.click({ force: true });
      await page.waitForTimeout(1000);
      const after = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Ch. 69'));
        return { className: b?.className, text: b?.textContent?.trim().slice(0, 50) };
      });
      const changed = JSON.stringify(before) !== JSON.stringify(after);
      await record('T3: Bible chapter click registers',
        changed,
        `before=${JSON.stringify(before).slice(0,100)} after=${JSON.stringify(after).slice(0,100)}`);
    }
    await page.context().close();
  }

  // ============================================================
  // T4: Marcus/Aunt Rose — "How this app works" link — claims non-functional
  // ============================================================
  {
    const { page, gotoApp } = await fresh(browser);
    await gotoApp();

    const link = await page.$('a:has-text("How this app works"), [role="link"]:has-text("How this app works")');
    if (!link) {
      await record('T4: "How this app works" link works', false, 'Link not found in DOM');
    } else {
      const before = await page.evaluate(() => location.pathname);
      // Click — might open in new tab. Capture new pages.
      const newPagePromise = page.context().waitForEvent('page', { timeout: 3000 }).catch(() => null);
      await link.click({ force: true });
      await page.waitForTimeout(1500);
      const newPage = await newPagePromise;
      const after = await page.evaluate(() => location.pathname);
      const navigated = before !== after || (newPage !== null);
      // Capture href
      const href = await link.evaluate(el => el.href || el.getAttribute('href') || 'NO_HREF');
      await record('T4: "How this app works" link works',
        navigated,
        `before=${before} after=${after} newPage=${newPage ? 'opened' : 'no'} href=${href.slice(0, 100)}`);
    }
    await page.context().close();
  }

  // ============================================================
  // T5: Marcus/Paula — /stats page — claims blank
  // ============================================================
  {
    const { page, gotoApp } = await fresh(browser);
    await gotoApp();

    await page.goto(URL + Date.now() + '/stats');
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

    await page.goto(URL + Date.now() + '/links');
    await page.waitForTimeout(4000);
    const linksState = await page.evaluate(() => {
      const main = document.querySelector('main') || document.body;
      const headings = [...main.querySelectorAll('h1, h2, h3')].map(h => h.textContent.trim()).slice(0, 10);
      const linkCount = main.querySelectorAll('a').length;
      const mainText = main.textContent.replace(/\s+/g, ' ').trim().slice(0, 300);
      return { headings, linkCount, mainText, hasMain: !!document.querySelector('main') };
    });
    const hasContent = linksState.headings.length > 0 || linksState.linkCount > 3 || (linksState.mainText && linksState.mainText.length > 100);
    await record('T6: /links page has content',
      hasContent,
      `headings=[${linksState.headings.join(' | ')}] linkCount=${linksState.linkCount} body_text_len=${linksState.mainText.length}`);
    await page.context().close();
  }

  // ============================================================
  // T7: Aunt Rose — Onboarding appears every time — claims no returning-user flow
  // ============================================================
  {
    const { page, gotoApp } = await fresh(browser);
    await gotoApp();
    // Mark onboarded, then reload
    await page.evaluate(() => localStorage.setItem('jw-habits-onboarded', 'true'));
    await page.goto(URL + Date.now());
    await page.waitForTimeout(4000);
    const onboardingVisible = await page.evaluate(() => {
      const headings = [...document.querySelectorAll('h1, h2, h3')].map(h => h.textContent.trim());
      return headings.some(h => /welcome|get started/i.test(h));
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
    const { page, gotoApp } = await fresh(browser);
    await gotoApp();

    // Go to settings and click Dark Mode
    await page.goto(URL + Date.now() + '/settings');
    await page.waitForTimeout(3000);
    const darkBtn = await page.$('button:has-text("Dark Mode"), button:has-text("Light Mode")');
    if (!darkBtn) {
      await record('T8: Dark mode toggle applies data-theme', false, 'Dark mode button not found in Settings');
    } else {
      const themeBefore = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      const storageBefore = await page.evaluate(() => {
        const v = localStorage.getItem('jw-progress-settings');
        try { return JSON.parse(v); } catch { return null; }
      });
      await darkBtn.click({ force: true });
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
    const { page, gotoApp } = await fresh(browser);
    await gotoApp();

    await page.goto(URL + Date.now() + '/service');
    await page.waitForTimeout(3000);
    // Find the +1h quick add button (NOT the floating quick-add-service button)
    const beforeCount = await page.evaluate(() => {
      // Look for hour counts — "0h" or "0.0h" or "0 placements"
      const text = document.body.textContent;
      return text.match(/(\d+(?:\.\d+)?)\s*h/i)?.[0] || 'NOT_FOUND';
    });
    const quickAdd = await page.$('button:has-text("1h")');
    if (!quickAdd) {
      await record('T9: Service Quick Add provides feedback', false, '1h button not found');
    } else {
      await quickAdd.click({ force: true });
      await page.waitForTimeout(1000);
      const afterCount = await page.evaluate(() => {
        const text = document.body.textContent;
        return text.match(/(\d+(?:\.\d+)?)\s*h/i)?.[0] || 'NOT_FOUND';
      });
      // Look for any toast/snackbar/notification
      const feedback = await page.evaluate(() => {
        const toasts = document.querySelectorAll('[role="status"], [role="alert"], .toast, .snackbar, [data-sonner-toast]');
        return [...toasts].map(t => t.textContent.trim().slice(0, 100));
      });
      const counterChanged = beforeCount !== afterCount;
      await record('T9: Service Quick Add provides feedback',
        counterChanged,
        `hour_counter: ${beforeCount} -> ${afterCount}  toasts=[${feedback.join(' | ')}]  (claim: silent, no feedback)`);
    }
    await page.context().close();
  }

  // ============================================================
  // T10: Paula — Goals "New" button — claims non-functional
  // ============================================================
  {
    const { page, gotoApp } = await fresh(browser);
    await gotoApp();

    await page.goto(URL + Date.now() + '/goals');
    await page.waitForTimeout(3000);
    const newBtn = await page.$('button:has-text("New")');
    if (!newBtn) {
      await record('T10: Goals "New" button opens form', false, 'New button not found');
    } else {
      const beforeUrl = page.url();
      await newBtn.click({ force: true });
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
      const opened = afterState.hasInput || afterState.hasModal || afterState.inputCount > 0;
      await record('T10: Goals "New" button opens form',
        opened,
        `inputs_after_click=${afterState.inputCount} modal=${afterState.hasModal} placeholders=[${afterState.placeholderText.join(' | ')}]  (claim: button non-functional)`);
    }
    await page.context().close();
  }

  // ============================================================
  // T11: Paula — /projects page — claims completely blank
  // ============================================================
  {
    const { page, gotoApp } = await fresh(browser);
    await gotoApp();

    await page.goto(URL + Date.now() + '/projects');
    await page.waitForTimeout(4000);
    const projectsState = await page.evaluate(() => {
      const main = document.querySelector('main') || document.body;
      const headings = [...main.querySelectorAll('h1, h2, h3')].map(h => h.textContent.trim()).slice(0, 5);
      const mainText = main.textContent.replace(/\s+/g, ' ').trim();
      // Check if main has only nav chrome (BottomNav text)
      const hasOnlyNav = /Home\s*Study\s*Goals\s*Service/.test(mainText) && mainText.length < 200;
      return { headings, mainTextLen: mainText.length, hasOnlyNav, preview: mainText.slice(0, 200) };
    });
    const hasContent = projectsState.headings.length > 0 || (projectsState.mainTextLen > 200 && !projectsState.hasOnlyNav);
    await record('T11: /projects page has content',
      hasContent,
      `headings=[${projectsState.headings.join(' | ')}] body_len=${projectsState.mainTextLen} only_nav=${projectsState.hasOnlyNav} preview="${projectsState.preview.slice(0, 120)}"`);
    await page.context().close();
  }

  await browser.close();

  console.log('\n========================================');
  console.log(`VERIFICATION COMPLETE: ${pass} PASS, ${fail} FAIL out of ${results.length} tests`);
  console.log('========================================\n');

  // Detailed summary
  results.forEach((r, i) => {
    console.log(`${i+1}. [${r.ok ? '✓' : '✗'}] ${r.name}`);
  });

  process.exit(fail > 0 ? 1 : 0);
})();
