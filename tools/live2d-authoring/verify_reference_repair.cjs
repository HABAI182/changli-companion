const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const runtimeRequire = createRequire(
  'C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json',
);
const { chromium } = runtimeRequire('playwright');
const version = [71, 70, 69, 68, 67, 66, 64, 63, 62, 61, 60, 59, 58, 57, 56, 55, 54, 53, 52, 51, 50, 49, 48, 46, 45, 44, 43, 42, 41, 40, 39, 38, 37, 36, 35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3].find((v) => process.argv.includes(`--v${v}`)) ?? 2;
const date = version >= 32 ? '20261006' : version >= 29 ? '20261005' : version >= 16 ? '20261004' : (version >= 12 ? '20261003' : '20261002');
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1040 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (e) => {
      if (e.type() === 'error') errors.push(e.text());
    });
    page.on('response', (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
    await page.goto(
      `http://127.0.0.1:1420/tools/live2d-authoring/reference-repair-v${version >= 29 ? version : 2}-preview.html?version=${version}`,
    );
    await page.waitForFunction(
      () =>
        window.referenceRepair || document.getElementById('status').textContent.startsWith('ERROR'),
      null,
      { timeout: 20000 },
    );
    if (!(await page.evaluate(() => Boolean(window.referenceRepair))))
      throw Error(await page.locator('#report').textContent());
    const report = await page.evaluate(() => window.referenceRepair.report);
    if (report.version !== version)
      throw Error(`Preview loaded v${report.version}; expected v${version}. Refusing mislabeled verification.`);
    report.continuous = await page.evaluate(async () => {
      const start = performance.now();
      let frames = 0,
        flips = 0,
        degenerate = 0,
        nonFinite = 0;
      await new Promise((resolve) => {
        function frame(now) {
          const t = (now - start) / 1000;
          const r = window.referenceRepair.validatePose({
            ParamAngleZ: 30 * Math.sin(t * 1.6),
            ParamSideHairLeftSway: Math.sin(t * 2.1),
            ...(window.referenceRepair.report.version >= 6
              ? { ParamSideHairRightSway: Math.sin(t * 2.5) }
              : {}),
            ParamEyeLOpen: (1 + Math.cos(t * 5)) / 2,
            ParamEyeROpen: (1 + Math.cos(t * 5 + 0.3)) / 2,
            ParamEyeBallX: Math.sin(t),
            ParamEyeBallY: Math.cos(t),
            ParamBangCenterSway: Math.sin(t * 2.8),
            ParamHandLeftPress: 15 * (1 + Math.sin(t * 3)),
            ParamPhoenixSway: 30 * Math.sin(t * 2),
            ...(window.referenceRepair.report.version >= 5
              ? { ParamMouthOpenY: (1 + Math.sin(t * 4)) / 2 }
              : {}),
          });
          frames++;
          flips += r.flips;
          degenerate += r.degenerate;
          nonFinite += r.nonFinite;
          if (t >= 4) resolve();
          else requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      });
      return {
        durationMs: performance.now() - start,
        frames,
        flips,
        degenerate,
        nonFinite,
        physicsEnabled: false,
        pass: frames >= 30 && flips === 0 && degenerate === 0 && nonFinite === 0,
      };
    });
    report.errors = errors;
    if (version >= 27) {
      report.nativePhysics = await page.evaluate(() => window.referenceRepair.physics.validate());
      report.physicsContinuous = await page.evaluate(async () => {
        const physics = window.referenceRepair.physics;
        physics.reset();
        const start = performance.now(); let previous = start, frames = 0, flips = 0, degenerate = 0, nonFinite = 0;
        await new Promise(resolve => {
          function frame(now) {
            const t = (now - start) / 1000;
            const r = physics.step({ ParamAngleX: 28 * Math.sin(t * 2), ParamAngleZ: 28 * Math.sin(t * 1.5),
              ParamEyeLOpen: (1 + Math.cos(t * 5)) / 2, ParamEyeROpen: (1 + Math.cos(t * 5 + .3)) / 2 },
              Math.min((now - previous) / 1000, .05), true);
            flips += r.flips; degenerate += r.degenerate; nonFinite += r.nonFinite; frames++; previous = now;
            if (t >= 4) resolve(); else requestAnimationFrame(frame);
          }
          requestAnimationFrame(frame);
        });
        return { durationMs: performance.now() - start, frames, flips, degenerate, nonFinite, physicsEnabled: true,
          pass: frames >= 30 && flips === 0 && degenerate === 0 && nonFinite === 0 };
      });
      report.pass &&= report.nativePhysics.pass && report.physicsContinuous.pass;
    }
    report.pass = report.pass && report.continuous.pass && errors.length === 0;
    for (const id of [
      'neutral',
      'closed',
      'tiltLeft',
      ...(version >= 29 ? ['tiltRight'] : []),
      'hairLeft',
      ...(version >= 5 ? ['mouthOpen'] : []),
      ...(version >= 6 ? ['rightHairLeft', 'rightHairRight'] : []),
      ...(version >= 9 ? ['bangLeft', 'bangRight'] : []),
      ...(version >= 12 ? ['half', 'winkLeft', 'winkRight'] : []),
      ...(version >= 30 ? ['phoenixLeft','phoenixRight','phoenixWing','phoenixTail'] : []),
      ...(version >= 32 ? ['gazeLeft','gazeRight','gazeUp','gazeDown'] : []),
    ]) {
      if (id === 'neutral') await page.locator('#reset').click();
      else await page.locator('#' + id).click();
      await page.waitForTimeout(150);
      await page.screenshot({
        path: path.join(__dirname, `build/reference-repair-v${version}-${id}-${date}.png`),
      });
    }
    await page.locator('#reset').click();
    await page.evaluate(() => (document.getElementById('overlay').style.opacity = 0.5));
    await page.screenshot({
      path: path.join(__dirname, `build/reference-repair-v${version}-overlay-${date}.png`),
    });
    await fs.writeFile(
      path.join(__dirname, `build/reference-repair-v${version}-core-verification-${date}.json`),
      JSON.stringify(report, null, 2) + '\n',
    );
    console.log(
      JSON.stringify(
        {
          pass: report.pass,
          drawables: report.drawables,
          parameters: report.parameters,
          repaired: report.repaired,
          regressions: report.regressions,
          continuous: report.continuous,
          mouth: report.mouth,
          rightHair: report.rightHair,
          bangCenter: report.bangCenter,
          closedLids: report.closedLids,
          rightIris: report.rightIris,
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

