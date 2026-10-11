"""Build a separate read-only QA page for the official v30 export."""
from pathlib import Path

here = Path(__file__).resolve().parent
text = (here / 'reference-repair-v29-preview.html').read_text(encoding='utf-8')
text = text.replace('const version = 29;', 'const version = 30;')
text = text.replace('原图发根衔接、发量与脸型核对 · v29', '凤凰轮廓网格与桌宠动作核对 · v30')
text = text.replace("const { checkHairRoot } = await import('./reference-repair-v29-checks.js');", "const { checkPhoenixMeshes } = await import('./reference-repair-v30-checks.js');")
text = text.replace('await checkHairRoot({', 'await checkPhoenixMeshes({')
text = text.replace('<button id="joinBefore">隐藏新增发根衔接</button>', '<button id="phoenixLeft">凤凰左摆</button><button id="phoenixRight">凤凰右摆</button><button id="phoenixWing">凤凰扇翅</button><button id="phoenixTail">凤凰尾羽</button>')
start = text.index('      let joinVisible = true;')
end = text.index('      window.referenceRepair.setPose({});\n      addEventListener(', start)
text = text[:start] + text[end:]
text = text.replace('      const actions = {', '''      const actions = {
        phoenixLeft: { ParamPhoenixSway: -30 },
        phoenixRight: { ParamPhoenixSway: 30 },
        phoenixWing: { ParamPhoenixWingSway: 30 },
        phoenixTail: { ParamPhoenixTailSway: 30 },''')
(here / 'reference-repair-v30-preview.html').write_text(text, encoding='utf-8')
print('v30 native mesh review page written')
