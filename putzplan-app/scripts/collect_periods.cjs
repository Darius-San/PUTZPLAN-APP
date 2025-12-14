const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2] || 'http://localhost:5173/?compare=true';
  console.log('Opening', url);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    try {
      console.log('PAGE LOG>', msg.type(), msg.text());
    } catch (e) {
      console.log('PAGE LOG>', msg.type(), msg.text());
    }
  });

  page.on('pageerror', err => console.log('PAGE ERROR>', err && err.message));
  page.on('requestfailed', req => console.log('REQ FAIL>', req.url(), req.failure && req.failure().errorText));

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    const cmp = await page.evaluate(() => {
      return window.__PERIOD_COMPARE || null;
    });

    console.log('EVALUATED __PERIOD_COMPARE:', JSON.stringify(cmp, null, 2));
  } catch (err) {
    console.error('Error while loading page:', err && err.message ? err.message : err);
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
})();
