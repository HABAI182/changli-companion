import type { PointerEvent } from 'react';
import { model } from '../model';
export function InteractionMenu({
  action,
  close,
  settings,
  hide,
  quit,
  native,
  drag,
}: {
  action: (kind: 'expression' | 'animation', id: string) => void;
  close: () => void;
  settings: () => void;
  hide: () => void;
  quit: () => void;
  native: boolean;
  drag: (event: PointerEvent<HTMLDivElement>) => void;
}) {
  const expressions = model.expressions.filter(
    (e) => e.asset || model.renderer.live2d.expressionMap[e.id],
  );
  return (
    <div className="context-menu detached-menu" role="dialog" aria-label="长离互动菜单">
      <div className="pet-menu-heading" onPointerDown={drag} title="拖动互动窗口">
        <b>长离 · 互动</b>
        <span className="pet-menu-badge">公测</span>
        <button className="pet-menu-close" aria-label="关闭互动菜单" onClick={close}>
          ×
        </button>
      </div>
      <p className="pet-menu-caption">表情</p>
      <div className="expression-grid">
        {expressions
          .filter((e) => ['default', 'smile', 'surprised', 'sleepy'].includes(e.id))
          .map((e) => (
            <button key={e.id} onClick={() => action('expression', e.id)}>
              {e.name}
            </button>
          ))}
      </div>
      <div className="pet-motion-grid">
        {model.animations
          .filter((a) => model.renderer.live2d.motionMap[a.id])
          .map((a) => (
            <button
              key={a.id}
              className="pet-menu-action"
              onClick={() => action('animation', a.id)}
            >
              {a.name}
            </button>
          ))}
        <button className="pet-menu-action" onClick={() => action('expression', 'blush')}>
          脸红
        </button>
      </div>
      <details className="pet-menu-more">
        <summary>更多表情</summary>
        <div className="pet-menu-options">
          {expressions
            .filter((e) => !['default', 'smile', 'surprised', 'sleepy', 'blush'].includes(e.id))
            .map((e) => (
              <button key={e.id} onClick={() => action('expression', e.id)}>
                {e.name}
              </button>
            ))}
        </div>
      </details>
      <div className="pet-menu-navigation">
        <button aria-label="桌宠设置" onClick={settings}>
          设置与个性化
        </button>
      </div>
      {native && (
        <div className="pet-menu-footer">
          <button onClick={hide}>隐藏桌宠</button>
          <button onClick={quit}>退出桌宠</button>
        </div>
      )}
    </div>
  );
}
