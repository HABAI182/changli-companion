const fs = require('node:fs/promises');
const { createRequire } = require('node:module');
const runtimeRequire = createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = runtimeRequire('playwright');
const version = Number(process.argv[2] || 18);
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:1420/tools/live2d-authoring/reference-repair-v2-preview.html?version=${version}`);
    await page.waitForFunction(() => window.referenceRepair || document.getElementById('status').textContent.startsWith('ERROR'), null, { timeout: 20000 });
    const result = await page.evaluate(() => {
      if (!window.referenceRepair) throw Error(document.getElementById('report').textContent);
      const samples = [];
      for (let n = 0; n <= 100; n++) {
        const params = { ParamEyeROpen: n / 100 };
        const result = window.referenceRepair.validatePose(params);
        if (result.flips || result.degenerate) {
          const positions = window.referenceRepair.positions(params);
          const ids = window.referenceRepair.report.bounds.map(x => x.id);
          samples.push({ params, ...result, vertices: result.meshIssues.map(issue => ({ id: issue.id,
            triangle: issue.triangle, coordinates: issue.triangle.map(k => positions[ids.indexOf(issue.id)].slice(k * 2, k * 2 + 2)) })) });
        }
      }
      return { samples, version: window.referenceRepair.report.version };
    });
    await fs.writeFile(`tools/live2d-authoring/build/reference-repair-v${version}-contour-probe-20261004.json`, JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify({ version, failingSamples: result.samples.length, first: result.samples[0], last: result.samples.at(-1) }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
