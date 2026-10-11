"""Reuse the tested Core renderer/UI; give v29 its own native baseline checks.

Older review pages and their historic regression checks are preserved intact.
"""
from pathlib import Path

here = Path(__file__).resolve().parent
text = (here / 'reference-repair-v2-preview.html').read_text(encoding='utf-8')
prefix = text.split('      const baselineMoc = CubismMoc.create(')[0]
prefix = prefix.replace('const version = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28].includes(requestedVersion) ? requestedVersion : 2;', 'const version = 29;')
prefix = prefix.replace('<h1>原图、左侧发量与脸型核对</h1>', '<h1>原图发根衔接、发量与脸型核对 · v29</h1>')
prefix = prefix.replace('<button id="nativePhysics" hidden>', '<button id="joinBefore">隐藏新增发根衔接</button><button id="nativePhysics" hidden>')
functions = text[text.index('      function pose(target, params = {}) {'):text.index('      const neutral = pose(model),')]
checks = '''      const { checkHairRoot } = await import('./reference-repair-v29-checks.js');
      const { baselineMoc, baselineModel, neutral, repaired } = await checkHairRoot({ model, core, ids, ppu, report, CubismMoc, pose, area });
'''
suffix = text[text.index('      report.windowsDesktopVerified = false;'):]
suffix = suffix.replace('      window.referenceRepair.setPose({});\n      addEventListener(', '''      let joinVisible = true;
      document.getElementById('joinBefore').onclick = () => {
        window.referenceRepair.setPose({}); joinVisible = !joinVisible;
        const i = ids.indexOf('ArtMesh47');
        const original = core.drawables.opacities[i];
        if (!joinVisible) core.drawables.opacities[i] = 0;
        draw(); core.drawables.opacities[i] = original;
        document.getElementById('joinBefore').textContent = joinVisible ? '隐藏新增发根衔接' : '显示新增发根衔接';
      };
      window.referenceRepair.setPose({});
      addEventListener(''')
(here / 'reference-repair-v29-preview.html').write_text(prefix + functions + checks + suffix, encoding='utf-8')
print('v29 review page written; historical pages unchanged')
