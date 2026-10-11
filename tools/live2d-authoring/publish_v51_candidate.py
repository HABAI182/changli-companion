"""Use the verified native shoulder/Phoenix model in the actual desktop app."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def main():
    report = json.loads((HERE / 'build/reference-repair-v51-core-verification-20261006.json').read_text())
    required = ('regressions', 'nativeShoulderJoins', 'nativeGoldContour', 'nativePhoenix',
                'continuous', 'nativePhysics', 'physicsContinuous')
    if not report['pass'] or not all(report[k]['pass'] for k in required):
        raise ValueError('Actual native/Core/physics acceptance required')
    for name in ('package.json', 'package-lock.json', 'src-tauri/tauri.conf.json'):
        path = ROOT / name
        doc = json.loads(path.read_text(encoding='utf-8'))
        if doc['version'] not in ('0.5.15', '0.5.16'):
            raise ValueError('Unexpected application baseline')
        doc['version'] = '0.5.16'
        if name == 'package-lock.json':
            doc['packages']['']['version'] = '0.5.16'
        path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for name in ('src-tauri/Cargo.toml', 'src/App.tsx'):
        path = ROOT / name
        path.write_text(path.read_text(encoding='utf-8').replace('0.5.15', '0.5.16'), encoding='utf-8')
    path = ROOT / 'public/models/changli/model.json'
    doc = json.loads(path.read_text(encoding='utf-8'))
    doc['version'] = '0.10.1-candidate'
    live = doc['renderer']['live2d']
    live['entry'] = 'live-reference-repair-v51-candidate/ChangliReferenceRepairV51-physics.model3.json'
    live['parameterMap']['head.y'] = 'ParamAngleY'
    status = ('v51：原图凤凰身体、翅膀与尾羽已替换并绑定原生变形器；眼缘透明通道、'
              '左侧金饰/发辫裁切和肩部露底接缝已修正；桌宠接入头部上下跟随。'
              '保留双手独立输入、眼球跟随、头部XY/Z、袖口和头发物理。'
              '右侧吊饰已接入原生惯性物理；左侧饰品独立运动、完整表情与全姿态美术验收仍待完成。')
    doc['art_status'] = live['art_status'] = status
    path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Desktop now uses v51 / 0.5.16; formal art remains pending final acceptance')


if __name__ == '__main__':
    main()
