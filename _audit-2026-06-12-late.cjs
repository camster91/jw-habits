// _audit-2026-06-12-late.cjs
// Live post-deploy audit: tests paths the 11 persona tests skip.

const { chromium } = require('playwright');

const URL_BASE = (process.env.VERIFY_URL || 'https://jwhabits.ashbi.ca').replace(/\/$/, '');
const URL = (route = '') => `${URL_BASE}${route}`;
const results = [];
let pass = 0, fail = 0;

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  if (ok) pass++; else fail++;
  console.log(`${ok ? '✅' : '❌'} ${name} — ${detail}`);
}

async function fresh(browser) {
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  const page = await ctx.newPage();
  const errors = [];
  const network404 = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });
  page.on('response', r => {
    if (r.status() === 404) network404.push(`${r.status()} ${r.url()}`);
  });
  async function dismissOnboarding() {
    try {
      await page.evaluate(() => {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('jw-')) localStorage.removeItem(k);
        });
        localStorage.setItem('jw-habits-onboarded', 'true');
        localStorage.setItem('installPromptDismissed', 'true');
      });
    } catch (e) {
      // localStorage may be denied in some cross-origin cases
    }
  }
  return { ctx, page, errors, network404, dismissOnboarding };
}

(async () => {
  const browser = await chromium.launch();

  // ===== T1: manifest content-type
  {
    const { ctx, page, errors, network404, dismissOnboarding } = await fresh(browser);
    const res = await page.request.get(URL('/manifest.webmanifest'));
    const ct = res.headers()['content-type'] || '';
    record(
      'manifest content-type',
      ct.includes('manifest+json') || ct.includes('application/manifest'),
      `content-type="${ct}"`
    );
    await ctx.close();
  }

  // ===== T2: manifest has "id" field
  {
    const { ctx, page, errors, network404, dismissOnboarding } = await fresh(browser);
    const res = await page.request.get(URL('/manifest.webmanifest'));
    const body = await res.json();
    record('manifest has "id" field', typeof body.id === 'string' && body.id.length > 0, `id=${JSON.stringify(body.id)}`);
    await ctx.close();
  }

  // ===== T3: manifest "View Stats" shortcut URL = /statistics
  {
    const { ctx, page, errors, network404, dismissOnboarding } = await fresh(browser);
    const res = await page.request.get(URL('/manifest.webmanifest'));
    const body = await res.json();
    const stats = (body.shortcuts || []).find(s => /stats/i.test(s.name || s.short_name || ''));
    record(
      'manifest Stats shortcut URL is /statistics',
      stats && stats.url === '/statistics',
      `shortcut url=${JSON.stringify(stats && stats.url)} (React route is /statistics)`
    );
    await ctx.close();
  }

  // ===== T4: /data/bible-reading.json serves 200
  {
    const { ctx, page, errors, network404, dismissOnboarding } = await fresh(browser);
    const res = await page.request.get(URL('/data/bible-reading.json'));
    record(
      '/data/bible-reading.json serves 200',
      res.status() === 200,
      `status=${res.status()}`
    );
    await ctx.close();
  }

  // ===== T5: /sw.js Cache-Control
  {
    const { ctx, page, errors, network404, dismissOnboarding } = await fresh(browser);
    const res = await page.request.get(URL('/sw.js'));
    const cc = (res.headers()['cache-control'] || '').toLowerCase();
    record(
      '/sw.js has no-cache Cache-Control',
      cc.includes('no-cache') || cc.includes('no-store'),
      `cache-control="${cc}"`
    );
    await ctx.close();
  }

  // ===== T6: HSTS
  {
    const { ctx, page, errors, network404, dismissOnboarding } = await fresh(browser);
    const res = await page.request.get(URL('/'));
    const hsts = res.headers()['strict-transport-security'] || '';
    record('HSTS header present', hsts.length > 0, `HSTS="${hsts}"`);
    await ctx.close();
  }

  // ===== T7: X-Content-Type-Options and friends
  {
    const { ctx, page, errors, network404, dismissOnboarding } = await fresh(browser);
    const res = await page.request.get(URL('/'));
    const headers = res.headers();
    const has = (k) => (headers[k.toLowerCase()] || '').length > 0;
    record(
      'security headers (X-Frame, X-Content, Referrer-Policy)',
      has('X-Frame-Options') && has('X-Content-Type-Options') && has('Referrer-Policy'),
      `X-Frame="${headers['x-frame-options']}" X-Content="${headers['x-content-type-options']}" Referrer="${headers['referrer-policy']}"`
    );
    await ctx.close();
  }

  // ===== T8: full page load — crashes, 404s on critical assets
  {
    const { ctx, page, errors, network404, dismissOnboarding } = await fresh(browser);
    await dismissOnboarding();
    await page.goto(URL('/'));
    await page.waitForTimeout(5000);
    const pageErrs = errors.filter(e => e.startsWith('PAGEERR'));
    record(
      'home page boots with no pageerror',
      pageErrs.length === 0,
      `pageerrors=${pageErrs.length}, network404s=${network404.length}`
    );
    if (network404.length) {
      console.log('  first 5 404s:');
      network404.slice(0, 5).forEach(u => console.log('    ' + u));
    }
    await ctx.close();
  }

  // ===== T9: Settings page loads
  {
    const { ctx, page, errors, network404, dismissOnboarding } = await fresh(browser);
    await dismissOnboarding();
    await page.goto(URL('/settings'));
    await page.waitForTimeout(5000);
    const hasHeading = await page.locator('h1, h2').first().isVisible().catch(() => false);
    record('Settings page loads (no crash)', errors.filter(e => e.startsWith('PAGEERR')).length === 0 && hasHeading, `pageerrors=${errors.length} h_visible=${hasHeading}`);
    await ctx.close();
  }

  // ===== T10: Study page loads
  {
    const { ctx, page, errors, network404, dismissOnboarding } = await fresh(browser);
    await dismissOnboarding();
    await page.goto(URL('/study'));
    await page.waitForTimeout(5000);
    const pageErrs = errors.filter(e => e.startsWith('PAGEERR'));
    record(
      'Study page loads without pageerror',
      pageErrs.length === 0,
      `pageerrors=${pageErrs.length} network404s=${network404.length}`
    );
    if (network404.length) {
      console.log('  first 5 404s:');
      network404.slice(0, 5).forEach(u => console.log('    ' + u));
    }
    await ctx.close();
  }

  // ===== T11: Service page loads
  {
    const { ctx, page, errors, network404, dismissOnboarding } = await fresh(browser);
    await dismissOnboarding();
    await page.goto(URL('/service'));
    await page.waitForTimeout(5000);
    record(
      'Service page loads without pageerror',
      errors.filter(e => e.startsWith('PAGEERR')).length === 0,
      `pageerrors=${errors.length} network404s=${network404.length}`
    );
    await ctx.close();
  }

  // ===== T12: /share loads
  {
    const { ctx, page, errors, network404, dismissOnboarding } = await fresh(browser);
    await dismissOnboarding();
    await page.goto(URL('/share?title=foo&text=bar&url=https://example.com'));
    await page.waitForTimeout(5000);
    record(
      '/share page loads without pageerror',
      errors.filter(e => e.startsWith('PAGEERR')).length === 0,
      `pageerrors=${errors.length} network404s=${network404.length}`
    );
    await ctx.close();
  }

  // ===== T13: SW NavigationRoute sanity (offline fallback to index.html)
  {
    const { ctx, page, errors, network404, dismissOnboarding } = await fresh(browser);
    await dismissOnboarding();
    await page.goto(URL('/'));
    await page.waitForTimeout(6000);
    const swActive = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.ready;
      return !!reg && !!reg.active;
    }).catch(() => false);
    record('SW activated after first load', swActive, `sw_active=${swActive}`);
    if (swActive) {
      try {
        await ctx.setOffline(true);
        const resp = await page.request.get(URL('/settings'));
        const ct = (resp.headers()['content-type'] || '').toLowerCase();
        const isHtml = ct.includes('text/html') || ct.includes('html');
        record(
          'offline /settings returns index.html via SW',
          resp.status() === 200 && isHtml,
          `status=${resp.status()} ct="${ct}"`
        );
      } catch (e) {
        record('offline /settings returns index.html via SW', false, `err=${e.message}`);
      } finally {
        try { await ctx.setOffline(false); } catch (_) {}
      }
    }
    await ctx.close();
  }

  // ===== T14: LRU eviction in createSafeStorage
  {
    const { ctx, page, errors, network404, dismissOnboarding } = await fresh(browser);
    await dismissOnboarding();
    await page.goto(URL('/'));
    await page.waitForTimeout(5000);
    const fillResult = await page.evaluate(() => {
      try {
        const big = 'x'.repeat(1024 * 1024);
        let added = 0;
        for (let i = 0; i < 10; i++) {
          try {
            localStorage.setItem(`__fill_${Date.now()}_${i}`, big);
            added++;
          } catch (e) {
            return { added, error: e.name };
          }
        }
        return { added, error: null };
      } catch (e) {
        return { added: 0, error: e.message };
      }
    }).catch(e => ({ added: -1, error: e.message }));
    console.log(`  fill: added=${fillResult.added} err=${fillResult.error}`);
    const evictResult = await page.evaluate(() => {
      const big = 'x'.repeat(500 * 1024);
      const before = Object.keys(localStorage).filter(k => k.startsWith('jw-')).length;
      let threw = null;
      try {
        localStorage.setItem('jw-progress-storage', big);
      } catch (e) {
        threw = e.name;
      }
      const after = Object.keys(localStorage).filter(k => k.startsWith('jw-')).length;
      return { threw, before, after };
    }).catch(e => ({ threw: e.message, before: -1, after: -1 }));
    console.log(`  evict probe: threw=${evictResult.threw} jwKeys before=${evictResult.before} after=${evictResult.after}`);
    const alive = await page.locator('body').isVisible().catch(() => false);
    record(
      'app remains alive after localStorage quota hit',
      alive && errors.filter(e => e.startsWith('PAGEERR')).length === 0,
      `alive=${alive} pageerrors=${errors.length}`
    );
    await ctx.close();
  }

  await browser.close();

  console.log('\n=== SUMMARY ===');
  console.log(`PASS: ${pass}  FAIL: ${fail}`);
  if (fail > 0) {
    console.log('\nFailures:');
    results.filter(r => !r.ok).forEach(r => console.log(`  ❌ ${r.name} — ${r.detail}`));
    process.exit(1);
  }
})().catch(e => { console.error('FATAL', e); process.exit(2); });
