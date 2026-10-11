// Read-only Core geometry and actual WebGL screenshots; no model/texture edits.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const { chromium } = createRequire(
  'C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json',
)('playwright');
const version = Number(process.argv[2] || 31);
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  });
  try {
    const page = await browser.newPage({ viewport: { width: 2600, height: 1300 } });
    await page.goto(
      `http://127.0.0.1:1420/tools/live2d-authoring/reference-repair-v${version}-preview.html`,
    );
    await page.waitForFunction(
      () =>
        window.referenceRepair || document.querySelector('#status').textContent.startsWith('ERROR'),
    );
    const result = await page.evaluate(() => {
      const r = window.referenceRepair;
      if (!r) throw Error(document.querySelector('#status').textContent);
      const ids = r.report.bounds.map((b) => b.id),
        ppu = r.report.canvasInfo.pixelsPerUnit;
      const center = (v) => [
          (v.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0) / (v.length / 2)) * ppu + r.report.canvasInfo.originX,
          (-v.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0) / (v.length / 2)) * ppu + r.report.canvasInfo.originY,
      ];
      const neutral = r.positions({});
      return {
        version: r.report.version,
        browser: true,
        formalArtComplete: false,
        samples: [-1, -0.5, 0, 0.5, 1].flatMap((x) =>
          [-1, 0, 1].map((y) => {
            const p = r.positions({ ParamEyeBallX: x, ParamEyeBallY: y });
            return {
              x,
              y,
              eyes: ['ArtMesh24', 'ArtMesh23'].map((id) => {
                const i = ids.indexOf(id),
                  c = center(p[i]),
                  n = center(neutral[i]);
                return { id, center: c, delta: c.map((v, k) => v - n[k]) };
              }),
            };
          }),
        ),
      };
    });
    const out = path.join(__dirname, `build/gaze-cutout-v${version}-${version>=32?'20261006':'20261005'}`);
    await fs.mkdir(out, { recursive: true });
    // Render enlarged eye and lower silhouette crops in the page, preserving
    // the exported pixel data and the original reference image exactly.
    await page.addStyleTag({
      content:
        '.stage{width:1254px;height:1254px}.panels{grid-template-columns:1254px 1254px}body{margin:0}.controls,h1,p,figcaption,details{display:none}',
    });
    for (const [name, params] of Object.entries({
      neutral: {},
      left: { ParamEyeBallX: -1 },
      right: { ParamEyeBallX: 1 },
      up: { ParamEyeBallY: 1 },
      down: { ParamEyeBallY: -1 },
    })) {
      await page.evaluate((p) => window.referenceRepair.setPose(p), params);
      await page.waitForTimeout(60);
      await page.screenshot({
        path: path.join(out, `${name}-eyes.png`),
        clip: { x: 1274 + 320, y: 575, width: 570, height: 255 },
      });
    }
    await page.evaluate(() => window.referenceRepair.setPose({}));
    await page.screenshot({
      path: path.join(out, 'candidate-left-flames.png'),
      clip: { x: 1274, y: 740, width: 320, height: 230 },
    });
    await page.screenshot({
      path: path.join(out, 'original-left-flames.png'),
      clip: { x: 0, y: 740, width: 320, height: 230 },
    });
    await page.screenshot({
      path: path.join(out, 'candidate-phoenix.png'),
      clip: { x: 1274 + 990, y: 745, width: 264, height: 255 },
    });
    await page.screenshot({
      path: path.join(out, 'original-phoenix.png'),
      clip: { x: 990, y: 745, width: 264, height: 255 },
    });
    await fs.writeFile(
      path.join(out, 'gaze-geometry.json'),
      JSON.stringify(result, null, 2) + '\n',
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
