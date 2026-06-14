// feature-graphic.cjs
//
// Generates the 1024x500 PNG feature graphic required by Google
// Play Store. Renders the app icon, name, and tagline on a flat
// branded background.
//
// Run: node feature-graphic.cjs
// Output: marketing/app-feature-graphic-1024x500.png

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'marketing', 'app-feature-graphic-1024x500.png');
if (!fs.existsSync(path.dirname(OUT))) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: 1024px;
          height: 500px;
          font-family: -apple-system, "SF Pro Display", system-ui, sans-serif;
          background: linear-gradient(135deg, #2D5F8B 0%, #4A6FA4 50%, #71A0D0 100%);
          color: white;
          display: flex;
          align-items: center;
          padding: 60px 80px;
          position: relative;
          overflow: hidden;
        }
        .bg-shape {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
        }
        .bg-shape-1 { width: 400px; height: 400px; right: -100px; top: -100px; }
        .bg-shape-2 { width: 250px; height: 250px; right: 200px; bottom: -50px; background: rgba(255,255,255,0.04); }
        .bg-shape-3 { width: 150px; height: 150px; left: 400px; top: 50px; background: rgba(113,188,55,0.15); }
        .content { display: flex; align-items: center; gap: 40px; z-index: 1; }
        .icon {
          width: 140px; height: 140px;
          border-radius: 32px;
          background: white;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon-inner {
          width: 84px; height: 84px;
          border-radius: 12px;
          background: linear-gradient(135deg, #2D5F8B, #1E4060);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 44px;
          font-weight: 700;
        }
        .text { display: flex; flex-direction: column; }
        .name {
          font-size: 72px; font-weight: 700; letter-spacing: -0.5px;
          line-height: 1; margin-bottom: 16px;
        }
        .tagline {
          font-size: 26px; font-weight: 400; opacity: 0.9;
          max-width: 560px; line-height: 1.3;
        }
        .badge {
          margin-top: 24px;
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 100px;
          padding: 6px 16px;
          font-size: 14px; font-weight: 500;
          width: fit-content;
        }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: #71BC37; }
      </style>
    </head>
    <body>
      <div class="bg-shape bg-shape-1"></div>
      <div class="bg-shape bg-shape-2"></div>
      <div class="bg-shape bg-shape-3"></div>
      <div class="content">
        <div class="icon">
          <div class="icon-inner">JW</div>
        </div>
        <div class="text">
          <div class="name">JW Habits</div>
          <div class="tagline">Daily spiritual habits —<br>offline, private, beautiful.</div>
          <div class="badge"><div class="dot"></div>No account required</div>
        </div>
      </div>
    </body>
    </html>
  `);
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT, type: 'png', fullPage: false, omitBackground: false });
  await browser.close();
  console.log('Feature graphic written to', OUT);
  console.log('Size:', (fs.statSync(OUT).size / 1024).toFixed(0), 'KB');
})().catch(err => { console.error(err); process.exit(1); });
