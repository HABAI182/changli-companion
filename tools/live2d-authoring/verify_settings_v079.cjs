const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('node:module').createRequire('C:/Users/18769/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
(async () => {
  const root = path.resolve(__dirname, '../..'), dir = path.join(__dirname, 'build/interactions-0.7.9-20261012');
  await fs.mkdir(dir, { recursive: true });
  const b = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  try {
    const p = await b.newPage({ viewport: { width: 1240, height: 1000 }, deviceScaleFactor: 1 }), errors = [];
    p.on('pageerror', e => errors.push(String(e)));
    await p.goto('http://127.0.0.1:1420/');
    await p.waitForFunction(() => JSON.parse(localStorage.getItem('changli-live2d-runtime-status') || 'null')?.status === 'ready');
    await p.addStyleTag({ content: '.workspace{display:grid!important;grid-template-columns:540px 560px!important;gap:24px!important;margin:0!important}main.preview>header{display:none}.settings-page{width:560px!important}main.preview{padding:24px!important}.scene{padding:0!important}' });
    const settings = p.getByRole('region', { name: '桌宠设置' });
    const saved = async (key, value) => p.waitForFunction(([key, value]) => {
      const raw = localStorage.getItem('changli-companion-v1');
      return raw && JSON.parse(JSON.parse(raw).json).settings[key] === value;
    }, [key, value]);
    await p.getByLabel('主题', { exact: true }).selectOption('light'); await saved('settingsTheme', 'light');
    assert.equal(await p.getByLabel('珊瑚', { exact: true }).evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(202, 101, 93)');
    assert.notEqual(await p.getByRole('button', { name: '外观', exact: true }).evaluate(el => getComputedStyle(el).color),
      await p.getByRole('button', { name: '互动', exact: true }).evaluate(el => getComputedStyle(el).color));
    await settings.screenshot({ path: path.join(dir, 'appearance-light.png') });
    await p.getByLabel('蓝色', { exact: true }).click(); await saved('accentColor', 'blue');
    await p.getByLabel('布局密度').selectOption('compact'); await saved('settingsDensity', 'compact');
    await p.getByLabel('主题', { exact: true }).selectOption('dark'); await saved('settingsTheme', 'dark');
    await settings.screenshot({ path: path.join(dir, 'appearance-dark.png') });
    assert.equal(await settings.getAttribute('data-theme'), 'dark');
    const nav = p.getByRole('navigation', { name: '设置分类' });
    await nav.getByRole('button', { name: '互动', exact: true }).click();
    await p.getByRole('slider', { name: '键盘手移动幅度' }).press('End'); await saved('keyboardMotionScale', 1.25);
    await p.getByRole('slider', { name: '鼠标移动幅度' }).press('Home'); await saved('mouseMotionScale', 0);
    await p.getByRole('slider', { name: '气泡显示时长' }).press('End'); await saved('bubbleDurationSeconds', 8);
    await p.getByRole('switch', { name: '鼠标视线跟随' }).uncheck(); await saved('cursorFollowEnabled', false);
    await p.getByLabel('空闲回应频率').selectOption('0'); await saved('bubbleIdleIntervalSeconds', 0);
    await settings.screenshot({ path: path.join(dir, 'interaction-dark.png') });
    await nav.getByRole('button', { name: '桌面', exact: true }).click(); await settings.screenshot({ path: path.join(dir, 'desktop-dark.png') });
    await nav.getByRole('button', { name: '高级', exact: true }).click(); await settings.screenshot({ path: path.join(dir, 'advanced-dark.png') });
    const links = [];
    await p.context().route('https://github.com/**', route => route.fulfill({ contentType: 'text/html', body: '<title>Link destination check</title>' }));
    for (const [title, url] of [['GitHub 更新 ↗', 'https://github.com/HABAI182/changli-companion/releases'], ['项目主页 ↗', 'https://github.com/HABAI182/changli-companion']]) {
      const wait = p.waitForEvent('popup'); await p.getByRole('button', { name: title, exact: true }).click(); const popup = await wait;
      await popup.waitForURL(url); links.push(popup.url()); await popup.close();
    }
    await p.reload(); await p.waitForFunction(() => JSON.parse(localStorage.getItem('changli-live2d-runtime-status') || 'null')?.status === 'ready');
    assert.equal(await settings.getAttribute('data-theme'), 'dark'); assert.equal(await settings.getAttribute('data-density'), 'compact');
    await nav.getByRole('button', { name: '互动', exact: true }).click();
    assert.equal(await p.getByRole('slider', { name: '键盘手移动幅度' }).inputValue(), '125');
    assert.equal(await p.getByRole('slider', { name: '气泡显示时长' }).inputValue(), '8');
    await p.setViewportSize({ width: 420, height: 900 });
    await p.addStyleTag({ content: '.workspace{display:block!important;margin:0!important}.scene,main.preview>header{display:none!important}main.preview{padding:0!important}.settings-page{width:420px!important;border-radius:0!important}' });
    await settings.screenshot({ path: path.join(dir, 'interaction-420px.png') });
    assert(await settings.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Settings overflow horizontally');
    assert.equal(errors.length, 0, errors.join('\n'));
    const sourceHash = {}, digest = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
    for (const f of ['src/settings/SettingsPanel.tsx', 'src/settings/settings.css', 'src/native.ts', 'src/domain.ts', 'src/pet/presentation.ts', 'src/renderer/live2d/RuntimeOffsets.ts', 'src-tauri/src/main.rs', 'public/assets/changli-icon-v079.jpg', 'src-tauri/icons/icon.ico']) sourceHash[f] = digest(await fs.readFile(path.join(root, f)));
    await fs.writeFile(path.join(dir, 'verification.json'), JSON.stringify({ pass: true, appVersion: '0.7.9', webglRendered: true, windowsDesktopVerified: false, scope: 'four settings pages, light/dark theme, accent and density, custom preference persistence after reload, 420px layout, exact GitHub link destinations', savedPreferences: await p.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem('changli-companion-v1')).json).settings), links, sourceSha256: sourceHash, errors }, null, 2));
    console.log('Settings pages, saved preferences, compact layout and GitHub links passed');
  } finally { await b.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
