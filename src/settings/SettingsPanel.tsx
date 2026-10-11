import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import type { Settings } from '../domain';
import { ScalePreviewQueue } from './scalePreview';
import './settings.css';

type Props = {
  value: Settings;
  update: (patch: Partial<Settings>) => Promise<boolean>;
  previewScale: (scale: number) => Promise<void>;
  fail: (error: unknown) => void;
  busy: boolean;
  native: boolean;
  live2dReady: boolean;
  shortcut: string;
  setShortcut: (value: string) => void;
  reload: () => void;
  playSound: () => void;
  children: ReactNode;
};
function Row({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <label className="setting">
      <span className="setting-copy">
        <span>{title}</span>
        {description && <small>{description}</small>}
      </span>
      {children}
    </label>
  );
}
function SizeControl({
  value,
  previewScale,
  update,
  fail,
}: Pick<Props, 'previewScale' | 'update' | 'fail'> & { value: number }) {
  const [draft, setDraft] = useState(value),
    [saving, setSaving] = useState(false);
  const dirty = useRef(false),
    dragging = useRef(false),
    latest = useRef(value),
    commitRevision = useRef(0);
  const callbacks = useRef({ previewScale, update, fail });
  callbacks.current = { previewScale, update, fail };
  const queue = useRef<ScalePreviewQueue>(null);
  if (!queue.current)
    queue.current = new ScalePreviewQueue((scale) => callbacks.current.previewScale(scale));
  useEffect(() => {
    if (!dirty.current && !dragging.current && !saving) {
      setDraft(value);
      latest.current = value;
    }
  }, [value, saving]);
  const preview = (percent: number) => {
    const scale = percent / 100;
    latest.current = scale;
    dirty.current = true;
    setDraft(scale);
    void queue.current!.set(scale).catch(callbacks.current.fail);
  };
  const commit = async () => {
    dragging.current = false;
    if (!dirty.current) return;
    dirty.current = false;
    const revision = ++commitRevision.current;
    const scale = latest.current;
    setSaving(true);
    try {
      await queue.current!.flush();
      if (
        !(await callbacks.current.update({ scale })) &&
        !dirty.current &&
        revision === commitRevision.current
      ) {
        latest.current = value;
        setDraft(value);
        await queue.current!.set(value);
      }
    } catch (error) {
      callbacks.current.fail(error);
    } finally {
      if (revision === commitRevision.current) setSaving(false);
    }
  };
  const percent = Math.round(draft * 100);
  return (
    <div className="size-control">
      <div className="size-heading">
        <label htmlFor="pet-size">桌宠大小</label>
        <output htmlFor="pet-size">
          {percent}
          <small>%</small>
        </output>
      </div>
      <input
        id="pet-size"
        aria-label="桌宠大小"
        aria-valuetext={`${percent}%`}
        type="range"
        min="50"
        max="200"
        step="1"
        value={percent}
        style={{ '--range-fill': `${(percent - 50) / 1.5}%` } as CSSProperties}
        onPointerDown={() => {
          dragging.current = true;
        }}
        onChange={(e) => preview(Number(e.target.value))}
        onPointerUp={() => void commit()}
        onPointerCancel={() => void commit()}
        onKeyUp={() => void commit()}
        onBlur={() => void commit()}
      />
      <div className="size-foot">
        <span>50%</span>
        <button
          type="button"
          onClick={() => {
            preview(100);
            void commit();
          }}
        >
          恢复默认大小
        </button>
        <span>200%</span>
      </div>
      <p className="setting-hint" role="status">
        {saving ? '正在保存…' : '拖动实时预览，松开后自动保存。'}
      </p>
    </div>
  );
}
export function SettingsPanel(p: Props) {
  const s = p.value;
  const toggle = (key: keyof Settings, title: string, description?: string, desktop = false) => (
    <Row title={title} description={description}>
      <input
        aria-label={title}
        type="checkbox"
        role="switch"
        checked={Boolean(s[key])}
        disabled={p.busy || (desktop && !p.native)}
        onChange={(e) => void p.update({ [key]: e.target.checked })}
      />
    </Row>
  );
  return (
    <section className="panel settings-page" aria-label="桌宠设置">
      <div className="panel-content">
        <div className="settings-heading">
          <div className="settings-avatar" aria-hidden="true">
            <img src="/models/changli/preview.jpg" alt="" />
          </div>
          <div>
            <p className="settings-kicker">离火长明</p>
            <h2>桌宠设置</h2>
            <p>按你的习惯，陪在身边。</p>
          </div>
        </div>
        <div className="character-status" role="status" aria-label="角色状态">
          <span className={`status-dot ${p.live2dReady ? 'ready' : ''}`} />
          <strong>{p.live2dReady ? 'Live2D 已加载' : '备用角色显示中'}</strong>
          <span className="model-stage">模型精修中</span>
        </div>
        <section className="settings-group" aria-labelledby="appearance-title">
          <h3 id="appearance-title">显示与动作</h3>
          <div className="settings-card">
            <SizeControl
              value={s.scale}
              previewScale={p.previewScale}
              update={p.update}
              fail={p.fail}
            />
            <Row title="动效强度" description="选择陪伴时的活跃程度">
              <select
                aria-label="动效强度"
                value={s.motion}
                disabled={p.busy}
                onChange={(e) => void p.update({ motion: e.target.value as Settings['motion'] })}
              >
                <option value="full">完整</option>
                <option value="low">轻柔</option>
                <option value="off">关闭动态</option>
              </select>
            </Row>
            {toggle('bubblesEnabled', '互动气泡', '摸头、凤凰、拖动与空闲时回应，避免连续重复')}
          </div>
        </section>
        <section className="settings-group" aria-labelledby="interaction-title">
          <h3 id="interaction-title">键鼠互动</h3>
          <div className="settings-card">
            <Row
              title="输入模式"
              description={
                s.inputMode === 'keyboard_mouse' ? '左手随键盘左右区移动，右手响应鼠标' : '左手随键盘左右区移动，空格回中间；不响应鼠标'
              }
            >
              <select
                aria-label="输入模式"
                value={s.inputMode}
                disabled={p.busy}
                onChange={(e) =>
                  void p.update({ inputMode: e.target.value as Settings['inputMode'] })
                }
              >
                <option value="keyboard_mouse">键鼠模式</option>
                <option value="keyboard_only">纯键盘模式</option>
              </select>
            </Row>
            {toggle('keyOverlayEnabled', '按键浮显', '短暂显示按键，不记录输入内容')}
            <Row title="自动睡眠" description="一段时间无操作后小憩">
              <select
                aria-label="自动睡眠"
                value={s.autoSleepMinutes}
                disabled={p.busy}
                onChange={(e) =>
                  void p.update({
                    autoSleepMinutes: Number(e.target.value) as Settings['autoSleepMinutes'],
                  })
                }
              >
                <option value="0">关闭</option>
                <option value="5">5 分钟</option>
                <option value="10">10 分钟</option>
                <option value="15">15 分钟</option>
              </select>
            </Row>
          </div>
        </section>
        <section className="settings-group" aria-labelledby="desktop-title">
          <h3 id="desktop-title">桌面陪伴</h3>
          <div className="settings-card">
            {toggle('topmost', '窗口置顶', '显示在其他窗口上方', true)}
            {toggle('hoverHideEnabled', '靠近时淡化', '鼠标移开后恢复，减少遮挡')}
            {s.hoverHideEnabled && (
              <div className="setting-dependent">
                <Row title="淡化延迟">
                  <select
                    aria-label="淡化延迟"
                    value={s.hoverHideDelayMs}
                    disabled={p.busy}
                    onChange={(e) =>
                      void p.update({
                        hoverHideDelayMs: Number(e.target.value) as Settings['hoverHideDelayMs'],
                      })
                    }
                  >
                    <option value="250">0.25 秒</option>
                    <option value="500">0.5 秒</option>
                    <option value="1000">1 秒</option>
                  </select>
                </Row>
                <Row title="淡化后不透明度">
                  <select
                    aria-label="淡化后不透明度"
                    value={s.hoverHideOpacity}
                    disabled={p.busy}
                    onChange={(e) =>
                      void p.update({
                        hoverHideOpacity: Number(e.target.value) as Settings['hoverHideOpacity'],
                      })
                    }
                  >
                    <option value="0.2">20%</option>
                    <option value="0.4">40%</option>
                    <option value="0.6">60%</option>
                  </select>
                </Row>
              </div>
            )}
            {toggle('passthrough', '鼠标穿透', '恢复快捷键或系统托盘可关闭穿透', true)}
          </div>
          {!p.native && <p className="setting-hint">置顶、穿透和开机启动在 Windows 桌宠中可用。</p>}
        </section>
        <details className="settings-advanced">
          <summary>
            <span>
              高级设置<small>启动、快捷键与运行选项</small>
            </span>
          </summary>
          <div className="settings-card">
            {toggle('autostart', '开机启动', '登录 Windows 后显示桌宠', true)}
            <div className="recovery-shortcut">
              <label htmlFor="recovery-key">恢复快捷键</label>
              <div>
                <input
                  id="recovery-key"
                  aria-label="恢复快捷键"
                  value={p.shortcut}
                  disabled={!p.native || p.busy}
                  onChange={(e) => p.setShortcut(e.target.value)}
                />
                <button
                  disabled={!p.native || p.busy}
                  onClick={() => void p.update({ shortcut: p.shortcut })}
                >
                  应用快捷键
                </button>
              </div>
              <p className="setting-hint">
                穿透后可从系统托盘“关闭穿透并显示”恢复。快捷键冲突时保留原设置。
              </p>
            </div>
            <Row title="角色渲染">
              <select
                aria-label="角色渲染"
                value={s.rendererMode}
                disabled={p.busy}
                onChange={(e) =>
                  void p.update({ rendererMode: e.target.value as Settings['rendererMode'] })
                }
              >
                <option value="auto">自动选择</option>
                <option value="live2d">优先 Live2D</option>
                <option value="layered2d">备用分层 2D</option>
              </select>
            </Row>
            <Row title="状态刷新帧率">
              <select
                aria-label="状态刷新帧率"
                value={s.fps}
                disabled={p.busy}
                onChange={(e) => void p.update({ fps: Number(e.target.value) as 30 | 60 })}
              >
                <option value="30">30 FPS · 节能</option>
                <option value="60">60 FPS</option>
              </select>
            </Row>
            <button className="wide" onClick={p.reload}>
              重新加载角色渲染
            </button>
            <details className="settings-extra">
              <summary>手柄与音效</summary>
              {toggle('gamepadEnabled', '手柄互动', '可与键鼠同时使用', true)}
              {toggle('sfxEnabled', '互动音效', '原创占位音，默认关闭')}
              <Row title={`音效音量 ${Math.round(s.sfxVolume * 100)}%`}>
                <input
                  aria-label="音效音量"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={Math.round(s.sfxVolume * 100)}
                  disabled={!s.sfxEnabled || p.busy}
                  onChange={(e) => void p.update({ sfxVolume: Number(e.target.value) / 100 })}
                />
              </Row>
              <button className="wide" disabled={!s.sfxEnabled} onClick={p.playSound}>
                试听互动音效
              </button>
              <p className="setting-hint">键盘音与语音素材尚未接入，相关功能保持关闭。</p>
            </details>
            {p.children}
          </div>
        </details>
        <p className="settings-footer">设置自动保存 · 输入只用于触发动作</p>
      </div>
    </section>
  );
}
