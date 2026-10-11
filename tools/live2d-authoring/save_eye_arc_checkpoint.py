"""Keep the current verified eye-arc resume point at the top of handoff documents."""
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]

def main():
    entries = [
        (ROOT / 'ENGINEERING_HANDOFF.md', 'tools/live2d-authoring/', 'PROGRESS-CHECKPOINT-20261002.md'),
        (HERE / 'HAIR-TAIL-PROGRESS.md', '', '../../PROGRESS-CHECKPOINT-20261002.md'),
        (HERE / 'assets/REFERENCE-REPAIR-NOTES-20261002.md', '../', '../../../PROGRESS-CHECKPOINT-20261002.md'),
    ]
    for path, prefix, link in entries:
        body = path.read_text(encoding='utf-8-sig')
        marker = '> 2026-10-02 双眼浅弧 v2 最新续接：'
        if body.startswith(marker):
            continue
        # Preserve all history, explicitly making earlier latest labels historical.
        body = body.replace('> 2026-10-02 最新', '> 2026-10-02 历史阶段')
        body = body.replace('> 最新：左闭眼', '> 历史 v1：左闭眼')
        intro = (f'{marker}从 `{prefix}ChangliEyeArcAuthoring-v2-candidate.cmo3` 继续，'
                 f'一致快照 `{prefix}build/ChangliEyeArcAuthoring-v2-20261002.cmo3`。'
                 '左右闭合浅弧已原生制作、保存与官方导出；真实 Core 检查左右各九档无翻折、独立开合隔离、视线及原绑定回归、八个实际按钮与四轮眨眼均 PASS。'
                 '仍需精修闭眼线宽/位置、左发、下脸/嘴、完整发束/凤凰与正式表情动作。默认未切换，无新 Windows 原生验收。'
                 f'详见 [最新检查点]({link})；下方为历史记录，原图源已导入隐藏，不重复导入或细分。\n\n')
        path.write_text(intro + body, encoding='utf-8')
        print(path)

if __name__ == '__main__':
    main()
