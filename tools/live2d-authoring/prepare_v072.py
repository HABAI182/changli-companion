"""Add runtime motions/config without touching the verified native exports."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
def edit(path, replacements):
    file = ROOT / path
    text = file.read_text(encoding='utf-8-sig')
    for before, after in replacements:
        if before not in text: raise ValueError(f'Missing expected source: {path}: {before[:80]}')
        text = text.replace(before, after, 1)
    file.write_text(text, encoding='utf-8', newline='\n')

for path in ['package.json', 'src-tauri/tauri.conf.json']:
    edit(path, [('"version": "0.7.1"', '"version": "0.7.2"')])
edit('src-tauri/Cargo.toml', [('version = "0.7.1"', 'version = "0.7.2"')])
edit('src-tauri/Cargo.lock', [('name = "changli-companion"\nversion = "0.7.1"', 'name = "changli-companion"\nversion = "0.7.2"')])
lock = ROOT/'package-lock.json'
data=json.loads(lock.read_text(encoding='utf-8-sig')); data['version']=data['packages']['']['version']='0.7.2'
lock.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n', encoding='utf-8', newline='\n')

model_file=ROOT/'public/models/changli/model.json'
model=json.loads(model_file.read_text(encoding='utf-8-sig'));model['version']='0.12.2'
rig=model['renderer']['live2d'];rig['entry']='live-reference-repair-v71-candidate/ChangliReferenceRepairV71-desktop.model3.json'
rig['motionMap'].update(mouse_right='RightClick/0',wheel='WheelRoll/0')
rig['runtimeOffsets']['handOrder']={'ids':['ArtMesh10','ArtMesh9'],'after':'ArtMesh34'}
rig['art_status']+=' 0.7.2修复胸部遮手，新增拖动抬手回弹、右键倾手和滚轮动作；均为运行时效果。'
model_file.write_text(json.dumps(model,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
folder=model_file.parent/'live-reference-repair-v71-candidate'
entry=json.loads((folder/'ChangliReferenceRepairV71-interactions.model3.json').read_text(encoding='utf-8-sig'))
for group, name, points in [('RightClick','desktop-right-click',[(0,0),(.09,18),(.19,0),(.30,0)]),
                             ('WheelRoll','desktop-wheel-roll',[(0,0),(.055,8),(.11,0),(.16,8),(.22,0),(.28,0)])]:
    duration=points[-1][0]
    segments=[*points[0]]
    for t,v in points[1:]: segments.extend([0,t,v])
    motion={'Version':3,'Meta':{'Duration':duration,'Fps':60,'Loop':False,'AreBeziersRestricted':True,
      'CurveCount':1,'TotalSegmentCount':len(points)-1,'TotalPointCount':len(points),
      'UserDataCount':0,'TotalUserDataSize':0,'FadeInTime':.025,'FadeOutTime':.03},
      'Curves':[{'Target':'Parameter','Id':'ParamHandLeftPress','Segments':segments}],'UserData':[]}
    (folder/f'{name}.motion3.json').write_text(json.dumps(motion,indent=2)+'\n',encoding='utf-8',newline='\n')
    entry['FileReferences']['Motions'][group]=[{'File':f'{name}.motion3.json','FadeInTime':.025,'FadeOutTime':.03}]
(folder/'ChangliReferenceRepairV71-desktop.model3.json').write_text(json.dumps(entry,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')

edit('src-tauri/src/main.rs',[
 ('mod gamepad;', 'mod desktop;\nmod gamepad;'),
 ('struct Settings {','struct Settings {\n    #[serde(rename = "dragReactionsEnabled")]\n    drag_reactions_enabled: bool,\n    #[serde(rename = "fullscreenHideEnabled")]\n    fullscreen_hide_enabled: bool,\n    #[serde(rename = "edgeSnapEnabled")]\n    edge_snap_enabled: bool,\n    #[serde(rename = "mouseDetailsEnabled")]\n    mouse_details_enabled: bool,'),
 ('        Self {\n            scale:', '        Self {\n            drag_reactions_enabled: true,\n            fullscreen_hide_enabled: true,\n            edge_snap_enabled: true,\n            mouse_details_enabled: true,\n            scale:'),
 ('    app.get_webview_window("pet")\n        .ok_or("桌宠窗口不存在")?\n        .hide()\n        .map_err(|e| e.to_string())','    desktop::manual_visible(&app, false)'),
 ('    w.show().map_err(|e| e.to_string())?;\n    storage::recover_passthrough(app)', '    desktop::manual_visible(app, true)?;\n    storage::recover_passthrough(app)'),
 ('            open_panel,','            desktop::begin_pet_drag,\n            desktop::finish_pet_drag,\n            desktop::list_pet_positions,\n            desktop::save_pet_position,\n            desktop::restore_pet_position,\n            open_panel,'),
 ('            app.manage(storage::initialize(app.handle())?);','            app.manage(desktop::DesktopState::default());\n            app.manage(storage::initialize(app.handle())?);'),
 ('                                let _ = w.hide();','                                let _ = desktop::manual_visible(app, false);'),
 ('                                let _ = w.show();','                                let _ = desktop::manual_visible(app, true);'),
 ('            windows::watch(app.handle().clone());','            windows::watch(app.handle().clone());\n            desktop::watch(app.handle().clone());'),
])
edit('src-tauri/src/storage.rs', [('CREATE TABLE IF NOT EXISTS window_geometry(id INTEGER PRIMARY KEY CHECK(id=1),json TEXT NOT NULL);', 'CREATE TABLE IF NOT EXISTS window_geometry(id INTEGER PRIMARY KEY CHECK(id=1),json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS window_positions(slot INTEGER PRIMARY KEY CHECK(slot BETWEEN 1 AND 3),json TEXT NOT NULL);')])
edit('src-tauri/src/windows.rs', [
 ('            // Re-evaluate monitor', '            if app.state::<crate::desktop::DesktopState>().dragging.load(std::sync::atomic::Ordering::Relaxed) { continue; }\n            // Re-evaluate monitor'),
 ('pub fn save_now(app: &tauri::AppHandle) -> Result<(), String> {', 'pub fn current_geometry(app: &tauri::AppHandle) -> Result<Geometry, String> {'),
 ('    let json = serde_json::to_string(&g).map_err(|e| e.to_string())?;','    Ok(g)\n}\npub fn save_now(app: &tauri::AppHandle) -> Result<(), String> {\n    let g = current_geometry(app)?;\n    let json = serde_json::to_string(&g).map_err(|e| e.to_string())?;'),
])
edit('src-tauri/src/input.rs', [('WM_MOUSEWHEEL | WM_MOUSEHWHEEL => send("wheel", 0.0, 0.0, None),', 'WM_MOUSEWHEEL | WM_MOUSEHWHEEL => send("wheel", 0.0, -((e.mouseData >> 16) as i16).signum() as f64, None),')])
edit('src/renderer/live2d/Live2DAdapter.ts', [('? 4\n', '? (snapshot.idle.handLift || 0) * 4 + (snapshot.idle.dragSway || 0) * 3\n'),('? -1\n', '? -(snapshot.idle.landingBounce || 0) * 3\n')])
print('Prepared 0.7.2 runtime and native configuration; verified MOC3/source untouched.')
