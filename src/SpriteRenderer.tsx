import type { RendererProps } from './Renderer';
import { model, resource, type ModelState } from './model';
import { motions } from './domain';
// The artwork is still a single preview: input indicators are not hand animation.
// Sprite frames / expression files plug in here without changing input or timers.
export function SpriteRenderer({
  machine,
  settings,
  expression,
  onHead,
  onBody,
  snapshot,
}: RendererProps) {
  const action = snapshot?.action?.id;
  const state: ModelState =
    action === 'keyboard_left' || machine.pose === 'keyboard_left'
      ? 'keyboard_left'
      : action === 'keyboard_right' ||
          action === 'rapid' ||
          action === 'space' ||
          action === 'enter' ||
          action === 'backspace' ||
          machine.pose === 'keyboard_right' ||
          machine.pose === 'typing' ||
          machine.pose === 'rapid'
        ? 'keyboard_right'
        : action === 'mouse_left' ||
            action === 'mouse_right' ||
            action === 'wheel' ||
            machine.pose === 'mouse' ||
            machine.pose === 'left' ||
            machine.pose === 'right' ||
            machine.pose === 'scroll'
          ? 'mouse'
          : 'idle';
  const face = expression || snapshot?.expression || motions[machine.pose].expression;
  const faceAsset = model.expressions.find((e) => e.id === face)?.asset;
  const asset = faceAsset || model.assets[model.states[state].asset];
  const spot = model.hotspots[state === 'mouse' ? 'mouse' : state];
  const head = model.hotspots.head;
  const body = model.hotspots.body;
  const ambient = snapshot?.ambient === 'nod' ? 1.5 : snapshot?.ambient === 'glance' ? -0.6 : 0;
  const dragAngle = snapshot?.drag === 'dragging' ? 2.2 : snapshot?.drag === 'release' ? -0.8 : 0;
  const motion = settings.motion === 'off' ? 0 : settings.motion === 'low' ? 0.35 : 1;
  const translateY = motion * (ambient - (snapshot?.idle.breathe || 0) * 1.8);
  const angle = motion * (dragAngle + (snapshot?.idle.hairSway || 0) * 0.45);
  const scale = 1 + motion * (snapshot?.idle.breathe || 0) * 0.004;
  return (
    <div className={`sprite-renderer motion-${settings.motion}`} data-state={state}>
      <img
        className="character-art"
        src={resource(asset)}
        alt="用户指定的Q版长离造型：键鼠、小肉团手与小凤凰"
        draggable={false}
        style={{ transform: `translateY(${translateY}px) rotate(${angle}deg) scale(${scale})` }}
      />
      <button
        className="art-hotspot body-hotspot"
        aria-label="轻碰身体"
        onClick={onBody}
        style={{
          left: `${body[0] * 100}%`,
          top: `${body[1] * 100}%`,
          width: `${body[2] * 100}%`,
          height: `${body[3] * 100}%`,
        }}
      />
      <button
        className="art-hotspot head-hotspot"
        aria-label="摸摸头"
        onClick={onHead}
        style={{
          left: `${head[0] * 100}%`,
          top: `${head[1] * 100}%`,
          width: `${head[2] * 100}%`,
          height: `${head[3] * 100}%`,
        }}
      />
      {spot && (
        <div
          className={`input-feedback ${state}`}
          aria-hidden="true"
          style={{
            left: `${spot[0] * 100}%`,
            top: `${spot[1] * 100}%`,
            width: `${spot[2] * 100}%`,
            height: `${spot[3] * 100}%`,
          }}
        />
      )}
      {snapshot?.animation && (
        <div className={`placeholder-animation animation-${snapshot.animation.id}`}>
          {model.animations.find((a) => a.id === snapshot.animation?.id)?.name} ·
          播放器占位，美术待接入
        </div>
      )}
      <div className="sprite-status">
        <span>
          {snapshot?.base === 'sleep'
            ? '睡眠状态 · 美术待接入'
            : state === 'idle'
              ? '造型预览 · 分层待接入'
              : model.states[state].label}
        </span>
        {face !== 'default' && (
          <small>{model.expressions.find((e) => e.id === face)?.name} · 表情素材待接入</small>
        )}
      </div>
    </div>
  );
}
