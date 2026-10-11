// Repeatable local browser verification using the bundled Playwright runtime.
// Tests the app in a separate headless browser; never controls native Cubism.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const runtimeRequire = createRequire(
  'C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json',
);
const { chromium } = runtimeRequire('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto(
      'http://127.0.0.1:1420/tools/live2d-authoring/expression-recovery-preview.html',
    );
    const button = page.locator('#run');
    await button.waitFor({ state: 'visible' });
    await page.waitForFunction(
      () =>
        !document.getElementById('run').disabled ||
        document.getElementById('status').textContent.startsWith('ERROR:'),
      null,
      {
        timeout: 20000,
      },
    );
    if (!(await button.isEnabled())) {
      await page.screenshot({
        path: path.join(__dirname, 'build/expression-recovery-load-failure-20261002.png'),
      });
      const failure = { status: await page.locator('#status').textContent(), errors, pass: false };
      await fs.writeFile(
        path.join(__dirname, 'build/expression-recovery-load-failure-20261002.json'),
        JSON.stringify(failure, null, 2),
      );
      throw Error(JSON.stringify(failure));
    }
    await button.click();
    await page.waitForFunction(
      () => {
        const text = document.getElementById('report').textContent;
        return text && JSON.parse(text).pass !== null;
      },
      null,
      { timeout: 20000 },
    );
    const report = JSON.parse(await page.locator('#report').textContent());
    report.browser = 'Microsoft Edge headless; local WebGL only';
    report.errors = errors;
    report.windowsDesktopVerified = false;
    await fs.writeFile(
      path.join(__dirname, 'build/expression-recovery-core-20261002.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    await page.screenshot({ path: path.join(__dirname, 'build/expression-recovery-20261002.png') });
    console.log(JSON.stringify(report, null, 2));
    if (!report.pass || errors.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
