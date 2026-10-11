"""Remove the former focus/task product surface; preserve stored historical data."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / 'src/App.tsx'
s = path.read_text(encoding='utf-8')
for line in ('  localDay,\n', '  startSession,\n', '  remaining,\n', '  formatRemaining,\n', '  pause,\n', '  resume,\n', '  settle,\n', '  addTodo,\n'):
    s = s.replace(line, '')
start = s.index('  const [tab, setTab]')
end = s.index('    [expression, setExpression]', start)
s = s[:start] + "  const tab: Panel = 'settings';\n  const [now, setNow] = useState(Date.now());\n  const [expression, setExpression]" + s[end + len('    [expression, setExpression]'):]
s = s.replace('  const settling = useRef(false);\n', '')
start = s.index('  const celebrate = async')
end = s.index('  const settings = async', start)
s = s[:start] + "  const navigate = (_panel: Panel = 'settings') => {\n    setMenu(false);\n    if (native && !panelWindow) void openPanel('settings').catch(fail);\n  };\n" + s[end:]
start = s.index('  const today = localDay(now)')
end = s.index('  const renderInfo =', start)
s = s[:start] + s[end:]
start = s.index('      <nav className="tabs">')
end = s.index('            <p className="muted">让陪伴，恰到好处。</p>', start)
s = s[:start] + '''      <div className="panel-content">
        <div className="eyebrow">按你喜欢的方式</div>
        <h2>桌宠设置</h2>
          <>
''' + s[end:]
old = '          </>\n        )}\n      </div>\n    </section>'
assert old in s
s = s.replace(old, '          </>\n      </div>\n    </section>', 1)
s = s.replace('progress={progress}', 'progress={0}').replace("priority={priority?.text || ''}", 'priority=""')
s = s.replace("onLamp={() => navigate('focus')}", "onLamp={() => touch('body')}").replace("onScroll={() => navigate('todos')}", "onScroll={() => touch('body')}")
start = s.index("            {(['focus', 'todos', 'settings'] as Panel[]).map((t) => (", s.index('pet-menu-navigation'))
end = s.index('          </div>', start)
s = s[:start] + '''            <button aria-label="桌宠设置" onClick={() => navigate('settings')}>设置</button>
''' + s[end:]
start = s.index('            <div className="priority-card">')
end = s.index('            {import.meta.env.DEV', start)
s = s[:start] + s[end:]
s = s.replace('一盏灯 · 一卷书 · 一人相伴', '长离 · 在你身旁').replace('v0.5.6', 'v0.5.9')
s = s.replace('完成音效（原创占位音，默认关闭）', '互动音效（原创占位音，默认关闭）').replace('试听完成音效', '试听互动音效')
path.write_text(s, encoding='utf-8')
print('Removed timer/task screens, menu tabs, shortcuts to them and timer completion effect.')
