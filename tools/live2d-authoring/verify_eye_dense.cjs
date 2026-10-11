// Separate browser review of an official Editor export, never native app control.
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
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (e) => {
      if (e.type() === 'error') errors.push(e.text());
    });
    await page.goto('http://127.0.0.1:1420/tools/live2d-authoring/eye-dense-v1-preview.html');
    await page.waitForFunction(
      () => /^(PASS|FAIL|ERROR)/.test(document.getElementById('summary').textContent),
      null,
      { timeout: 20000 },
    );
    if ((await page.locator('#summary').textContent()).startsWith('ERROR'))
      throw Error(await page.locator('#report').textContent());
    for (const id of ['neutral', 'left', 'right', 'up', 'down', 'diagonal']) {
      await page.locator('#' + id).click();
      await page.waitForFunction(
        (id) => JSON.parse(document.getElementById('report').textContent).semanticChecks?.[id],
        id,
      );
    }
    await page.locator('#animate').click();
    await page.waitForFunction(
      () => JSON.parse(document.getElementById('report').textContent).runtime,
      null,
      { timeout: 10000 },
    );
    const report = JSON.parse(await page.locator('#report').textContent());
    report.errors = errors;
    report.windowsDesktopVerified = false;
    report.browser = 'Microsoft Edge headless; real local WebGL';
    report.pass =
      report.pass &&
      report.runtime.pass &&
      Object.values(report.semanticChecks).every((c) => c.pass) &&
      errors.length === 0;
    await fs.writeFile(
      path.join(__dirname, 'build/eye-dense-v1-core-verification-20261002.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    await page.screenshot({
      path: path.join(__dirname, 'build/eye-dense-v1-preview-20261002.png'),
    });
    console.log(
      JSON.stringify(
        {
          pass: report.pass,
          topology: report.topology,
          regressions: report.regressions,
          runtime: report.runtime,
          errors,
        },
        null,
        2,
      ),
    );
    if (!report.pass) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
