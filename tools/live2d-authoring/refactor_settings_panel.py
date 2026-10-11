"""Extract the settings layout while preserving existing shortcut/runtime controls."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
p=ROOT/'src/App.tsx';text=p.read_text(encoding='utf-8')
if "from './settings/SettingsPanel'" in text:raise ValueError('Settings already extracted')
start=text.index('  const panel = (')
end=text.index('  const ActiveRenderer =',start)
old=text[start:end]
slots=old[old.index('          <details className="shortcut-slots">'):old.index('          {preview && (')]
runtime=old[old.index('          <details className="runtime-information">'):old.index('          <p className="fine">输入只用于')]
panel='''  const previewScale = async (scale: number) => {
    if (native) await invoke('preview_scale', { scale });
    else setData(current => ({ ...current, settings: { ...current.settings, scale } }));
  };
  const panel = (
    <SettingsPanel value={data.settings} update={settings} previewScale={previewScale} fail={fail}
      busy={busy} native={native} live2dReady={renderInfo.actual === 'live2d'}
      shortcut={shortcut} setShortcut={setShortcut}
      reload={() => { setRendererEpoch(value => value + 1); setNotice('角色渲染已重新初始化'); }}
      playSound={() => void audio.current.play('focus_complete', data.settings).then(result => {
        if (result === 'failed') setError('本地音效播放失败');
        else if (result === 'played') setNotice('已试听本地占位音效');
      })}>
'''+slots+runtime+'''    </SettingsPanel>
  );
'''
text=text[:start]+panel+text[end:]
text=text.replace("import { model, type ShortcutSlot } from './model';","import { model, type ShortcutSlot } from './model';\nimport { SettingsPanel } from './settings/SettingsPanel';")
p.write_text(text,encoding='utf-8')
print('Settings extracted; existing 25 slots and runtime diagnostics preserved.')
