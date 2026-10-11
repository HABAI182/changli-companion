// Observe the real App -> renderer -> Core chain. Never drive model parameters
// from this test: an isolated adapter fixture cannot catch a frozen App clock.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const runtimeRequire = createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = runtimeRequire('playwright');
(async () => {
  const root = path.resolve(__dirname, '../..');
  const output = path.join(__dirname, 'build/app-animation-clock-20261011');
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
    await page.goto('http://127.0.0.1:1420/');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('changli-live2d-runtime-status') || 'null')?.status === 'ready', null, { timeout: 25000 });
    const observed = await page.evaluate(async () => {
      const { CubismBackend } = await import('/src/renderer/live2d/CubismBackend.ts');
      const original = CubismBackend.prototype.setParameter;
      let backend, updates = 0;
      CubismBackend.prototype.setParameter = function (id, value) {
        backend = this;
        if (id === 'ParamEyeLOpen') updates++;
        return original.call(this, id, value);
      };
      const samples = [], start = performance.now();
      try {
        await new Promise(resolve => {
          function observe() {
            if (backend) {
              const p = backend.getParameterSnapshot();
              samples.push({ t: performance.now() - start, left: p.ParamEyeLOpen, right: p.ParamEyeROpen, breath: p.ParamBreath });
            }
            if (performance.now() - start < 12000) requestAnimationFrame(observe);
            else resolve();
          }
          requestAnimationFrame(observe);
        });
      } finally { CubismBackend.prototype.setParameter = original; }
      return { updates, samples, durationMs: performance.now() - start, status: JSON.parse(localStorage.getItem('changli-live2d-runtime-status')), browser: true, windowsDesktopVerified: false };
    });
    const valid = observed.samples.filter(s => Number.isFinite(s.left) && Number.isFinite(s.breath));
    const minOpen = Math.min(...valid.map(s => s.left));
    const closed = valid.filter(s => s.left <= 0.01 && s.right <= 0.01);
    const restored = closed.length > 0 && valid.some(s => s.t > closed.at(-1).t && s.left > 0.99 && s.right > 0.99);
    const uniqueBreathValues = new Set(valid.map(s => s.breath.toFixed(5))).size;
    const pass = observed.updates >= 180 && uniqueBreathValues >= 120 && closed.length >= 1 && restored && errors.length === 0;
    const report = { ...observed, pass, minOpen, closedFrames: closed.length, restored, uniqueBreathValues, errors,
      appVersion: JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8')).version,
      sourceSha256: Object.fromEntries(await Promise.all(['src/renderer/live2d/RuntimeOffsets.ts','src/pet/responses.ts','src/App.tsx', 'src/pet/presentation.ts', 'src/renderer/live2d/Live2DRenderer.tsx', 'src/renderer/live2d/Live2DAdapter.ts', 'src/renderer/live2d/CubismBackend.ts', 'public/models/changli/model.json'].map(async file => [file, crypto.createHash('sha256').update(await fs.readFile(path.join(root, file))).digest('hex').toUpperCase()]))) };
    await fs.writeFile(path.join(output, `verification-${report.appVersion}.json`), JSON.stringify(report, null, 2) + '\n');
    await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
    await page.screenshot({ path: path.join(output, `main-app-${report.appVersion}.png`) });
    const { samples, ...summary } = report;
    console.log(JSON.stringify(summary, null, 2));
    if (!pass) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
