const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });
  
  await page.goto('https://jw-habits.ashbi.ca/settings');
  await page.waitForTimeout(4000);
  await page.screenshot({ path: '/tmp/jw-settings.png', fullPage: true });
  
  // List all interactive elements
  const buttons = await page.$$eval('button, input, select, [role="button"], [role="switch"]', els => 
    els.map(e => ({
      tag: e.tagName,
      type: e.type,
      role: e.getAttribute('role'),
      text: e.textContent?.trim()?.slice(0, 40) || e.getAttribute('aria-label') || e.getAttribute('placeholder') || '',
    })).filter(Boolean)
  );
  console.log('=== Interactive elements on Settings ===');
  buttons.forEach(b => console.log(`  ${b.tag} type=${b.type || '-'} role=${b.role || '-'} "${b.text}"`));
  
  // Try toggling each switch
  const switches = await page.$$('[role="switch"], input[type="checkbox"]');
  console.log('\nSwitches/toggles:', switches.length);
  for (let i = 0; i < switches.length; i++) {
    const before = await switches[i].getAttribute('aria-checked');
    await switches[i].click({ force: true });
    await page.waitForTimeout(300);
    const after = await switches[i].getAttribute('aria-checked');
    console.log(`  Switch ${i}: ${before} -> ${after}`);
  }
  
  // Look for any notification-time input or form
  const timeInputs = await page.$$('input[type="time"]');
  console.log('Time inputs:', timeInputs.length);
  
  // Look for export/import buttons
  const exportBtn = await page.$('button:has-text("Export"), button:has-text("Import"), button:has-text("Download"), button:has-text("Backup")');
  console.log('Export/Import button:', !!exportBtn);
  
  // Check for Reading pace selector
  const paceSel = await page.$('select, [role="listbox"]');
  console.log('Pace selector:', !!paceSel);
  
  console.log('\nErrors:', errors.length);
  errors.forEach(e => console.log(' ', e));
  await browser.close();
})();
