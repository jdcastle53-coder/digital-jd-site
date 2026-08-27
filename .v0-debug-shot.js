const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 1400 } });
  page.on('console', (msg) => console.log('[console]', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('[pageerror]', err.message));
  page.on('requestfailed', (req) => console.log('[requestfailed]', req.url(), req.failure()?.errorText));
  await page.goto('file://' + __dirname + '/.v0-gauge-verify.html');
  await page.waitForTimeout(800);
  const rootHtmlLength = await page.evaluate(() => document.getElementById('root').innerHTML.length);
  console.log('[root html length]', rootHtmlLength);
  const svgCount = await page.evaluate(() => document.querySelectorAll('svg').length);
  console.log('[svg count]', svgCount);
  await page.screenshot({ path: '.v0-verify2.png', fullPage: true });
  await browser.close();
})();
