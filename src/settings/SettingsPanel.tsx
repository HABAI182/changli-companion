import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import type { Settings } from '../domain';
import { ScalePreviewQueue } from './scalePreview';
import { PositionPresets } from './PositionPresets';
import { openProjectLink } from '../native';
import './settings.css';
import runtimeLicense from '../../LICENSE-RUNTIME.txt?raw';

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
function FullscreenExceptions({
  value,
  update,
  fail,
}: {
  value: string[];
  update: Props['update'];
  fail: Props['fail'];
}) {
  const [draft, setDraft] = useState(value.join(', '));
  useEffect(() => {
    setDraft(value.join(', '));
  }, [value]);
  const save = () => {
    const items = [
      ...new Set(
        draft
          .split(/[,，;；\n]/)
          .map((v) => v.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
    if (items.length > 32 || items.some((v) => !/^[^\\/:*?"<>|]{1,120}\.exe$/i.test(v))) {
      fail(new Error('填写程序文件名，例如 game.exe；最多 32 个，用逗号分隔'));
      return;
    }
    if (items.join(',') !== value.join(',')) void update({ fullscreenExceptions: items });
  };
  return (
    <div className="fullscreen-exceptions">
      <label htmlFor="fullscreen-exceptions">这些程序全屏时仍显示桌宠</label>
      <input
        id="fullscreen-exceptions"
        aria-label="全屏避让例外"
        value={draft}
        placeholder="例如 game.exe, player.exe"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
      <small>输入程序文件名，用逗号分隔；留空则全部避让。</small>
    </div>
  );
}
function PreferenceRange({
  title,
  description,
  value,
  min,
  max,
  step = 5,
  unit = '%',
  update,
  busy,
}: {
  title: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  update: (value: number) => Promise<boolean>;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current) setDraft(value);
  }, [value]);
  const save = async () => {
    if (!dirty.current) return;
    dirty.current = false;
    if (!(await update(draft))) setDraft(value);
  };
  return (
    <div className="preference-range">
      <div className="range-heading">
        <span>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <output>
          {draft}
          {unit}
        </output>
      </div>
      <input
        aria-label={title}
        aria-valuetext={`${draft}${unit}`}
        type="range"
        min={min}
        max={max}
        step={step}
        disabled={busy}
        value={draft}
        style={{ '--range-fill': `${((draft - min) / (max - min)) * 100}%` } as CSSProperties}
        onChange={(e) => {
          dirty.current = true;
          setDraft(Number(e.target.value));
        }}
        onPointerUp={() => void save()}
        onPointerCancel={() => void save()}
        onKeyUp={() => void save()}
        onBlur={() => void save()}
      />
    </div>
  );
}
export function SettingsPanel(p: Props) {
  const s = p.value;
  const [page, setPage] = useState<'appearance' | 'interaction' | 'desktop' | 'advanced'>(
    'appearance',
  );
  const [systemDark, setSystemDark] = useState(
    () => matchMedia('(prefers-color-scheme: dark)').matches,
  );
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const changed = () => setSystemDark(media.matches);
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, []);
  const theme = s.settingsTheme === 'system' ? (systemDark ? 'dark' : 'light') : s.settingsTheme;
  const range = (
    key: 'headElasticity' | 'keyboardMotionScale' | 'mouseMotionScale' | 'bubbleDurationSeconds',
    title: string,
    description: string,
    min: number,
    max: number,
    seconds = false,
  ) => (
    <PreferenceRange
      title={title}
      description={description}
      value={Math.round(s[key] * (seconds ? 1 : 100))}
      min={min}
      max={max}
      step={seconds ? 1 : 5}
      unit={seconds ? ' 秒' : '%'}
      busy={p.busy}
      update={(value) => p.update({ [key]: value / (seconds ? 1 : 100) })}
    />
  );
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
    <section
      className="panel settings-page"
      data-theme={theme}
      data-accent={s.accentColor}
      data-density={s.settingsDensity}
      aria-label="桌宠设置"
    >
      <div className="panel-content">
        <div className="settings-heading">
          <div className="settings-avatar" aria-hidden="true">
            <img src="/assets/changli-icon-v0810.png" alt="" />
          </div>
          <div>
            <p className="settings-kicker">离火长明</p>
            <h2>偏好设置</h2>
            <p>你的桌面，长离相伴</p>
          </div>
        </div>
        <div className="character-status" role="status" aria-label="角色状态">
          <span className={`status-dot ${p.live2dReady ? 'ready' : ''}`} />
          <strong>{p.live2dReady ? 'Live2D 已加载' : '备用角色显示中'}</strong>
          <span className="model-stage">v0.7.12</span>
        </div>
        <nav className="settings-navigation" aria-label="设置分类">
          {(
            [
              ['appearance', '外观'],
              ['interaction', '互动'],
              ['desktop', '桌面'],
              ['advanced', '高级'],
            ] as const
          ).map(([id, title]) => (
            <button
              key={id}
              type="button"
              aria-pressed={page === id}
              className={page === id ? 'active' : ''}
              onClick={() => setPage(id)}
            >
              {title}
            </button>
          ))}
        </nav>
        <section
          className="settings-group"
          hidden={page !== 'appearance'}
          aria-labelledby="theme-title"
        >
          <h3 id="theme-title">界面外观</h3>
          <div className="settings-card">
            <Row title="主题" description="设置界面的明暗风格">
              <select
                aria-label="主题"
                value={s.settingsTheme}
                disabled={p.busy}
                onChange={(e) =>
                  void p.update({ settingsTheme: e.target.value as Settings['settingsTheme'] })
                }
              >
                <option value="system">跟随系统</option>
                <option value="light">浅色</option>
                <option value="dark">深色</option>
              </select>
            </Row>
            <Row title="强调色">
              <div className="accent-options" role="group" aria-label="强调色">
                {(
                  [
                    ['coral', '珊瑚'],
                    ['blue', '蓝色'],
                    ['violet', '紫色'],
                    ['sage', '青绿'],
                  ] as const
                ).map(([id, title]) => (
                  <button
                    key={id}
                    type="button"
                    className={`accent-swatch ${id}`}
                    aria-label={title}
                    title={title}
                    aria-pressed={s.accentColor === id}
                    disabled={p.busy}
                    onClick={() => void p.update({ accentColor: id })}
                  />
                ))}
              </div>
            </Row>
            <Row title="布局密度">
              <select
                aria-label="布局密度"
                value={s.settingsDensity}
                disabled={p.busy}
                onChange={(e) =>
                  void p.update({ settingsDensity: e.target.value as Settings['settingsDensity'] })
                }
              >
                <option value="comfortable">舒适</option>
                <option value="compact">紧凑</option>
              </select>
            </Row>
          </div>
        </section>
        <section
          className="settings-group"
          hidden={page !== 'appearance'}
          aria-labelledby="appearance-title"
        >
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
            {toggle('dragReactionsEnabled', '拖动弹性', '大头和发饰随拖动回摆，放下后缓缓回正')}
            {range('headElasticity', '大头弹性幅度', '调整回弹幅度，0% 关闭弹性形变', 0, 150)}
          </div>
        </section>
        <section
          className="settings-group"
          hidden={page !== 'interaction'}
          aria-labelledby="interaction-title"
        >
          <h3 id="interaction-title">键鼠互动</h3>
          <div className="settings-card">
            <Row
              title="输入模式"
              description={
                s.inputMode === 'keyboard_mouse'
                  ? '左手跟随键盘四区，前后移动较轻；右手响应鼠标'
                  : '左手跟随键盘四区，空格单独落点；不响应鼠标'
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
            {toggle('cursorFollowEnabled', '鼠标视线跟随', '随鼠标转头与转眼，不影响鼠标手动作')}
            {range(
              'keyboardMotionScale',
              '键盘手移动幅度',
              '同时调整左右和前后四区的移动距离',
              50,
              125,
            )}
            {range('mouseMotionScale', '鼠标移动幅度', '右手、鼠标与线缆一起移动', 0, 150)}
            {range(
              'bubbleDurationSeconds',
              '气泡显示时长',
              '控制每条互动气泡的停留时间',
              2,
              8,
              true,
            )}
            <Row title="空闲回应频率" description="只调整无操作时的主动聊天">
              <select
                aria-label="空闲回应频率"
                value={s.bubbleIdleIntervalSeconds}
                disabled={p.busy}
                onChange={(e) =>
                  void p.update({
                    bubbleIdleIntervalSeconds: Number(
                      e.target.value,
                    ) as Settings['bubbleIdleIntervalSeconds'],
                  })
                }
              >
                <option value="0">不主动聊天</option>
                <option value="60">每 1 分钟</option>
                <option value="90">每 1.5 分钟</option>
                <option value="180">每 3 分钟</option>
              </select>
            </Row>
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
        <section
          className="settings-group"
          hidden={page !== 'desktop'}
          aria-labelledby="desktop-title"
        >
          <h3 id="desktop-title">桌面陪伴</h3>
          <div className="settings-card">
            {toggle('topmost', '窗口置顶', '显示在其他窗口上方', true)}
            {toggle(
              'fullscreenHideEnabled',
              '全屏自动避让',
              '同屏全屏应用出现时隐藏，退出后恢复；手动隐藏不受影响',
              true,
            )}
            {s.fullscreenHideEnabled && (
              <FullscreenExceptions
                value={s.fullscreenExceptions || []}
                update={p.update}
                fail={p.fail}
              />
            )}
            {toggle(
              'edgeSnapEnabled',
              '屏幕边缘磁吸',
              '拖到边缘附近后松手，自动留出一小段边距',
              true,
            )}
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
            <PositionPresets native={p.native} fail={p.fail} />
          </div>
          {!p.native && (
            <p className="setting-hint">
              置顶、穿透、全屏避让、磁吸、常用位置和开机启动在 Windows 桌宠中可用。
            </p>
          )}
        </section>
        <section
          className="settings-group settings-advanced"
          hidden={page !== 'advanced'}
          aria-labelledby="advanced-title"
        >
          <h3 id="advanced-title">启动与运行</h3>
          <div className="settings-card">
            {toggle('autostart', '开机启动', '登录系统后自动显示桌宠', true)}
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
          <div className="project-links">
            <span>
              <strong>离火长明</strong>
              <small>版本 0.7.12 · Windows 桌宠</small>
            </span>
            <div>
              <button type="button" onClick={() => void openProjectLink('updates').catch(p.fail)}>
                GitHub 更新 ↗
              </button>
              <button type="button" onClick={() => void openProjectLink('home').catch(p.fail)}>
                项目主页 ↗
              </button>
            </div>
            <small>从 GitHub 版本页下载更新，附文件校验清单</small>
            <details className="runtime-license">
              <summary>许可与隐私说明</summary>
              <pre>{runtimeLicense}</pre>
            </details>
          </div>
        </section>
        <p className="settings-footer">自动保存 · 设置窗口优先显示</p>
      </div>
    </section>
  );
}
