import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  CharacterMachine,
  initialData,
  motions,
  type Data,
  type Signal,
  type Expression,
  type Settings,
} from './domain';
import { repository, native } from './storage';
import {
  applySettings,
  drag,
  openPanel,
  subscribeInput,
  subscribeGamepad,
  type Panel,
} from './native';
import { LayeredRenderer } from './Renderer';
import { RendererHost, rendererDiagnostics } from './renderer/RendererHost';
import { PresentationRuntime } from './pet/presentation';
import { mapGamepadInput } from './pet/gamepad';
import { AudioManager } from './audio/AudioManager';
import { model, type ShortcutSlot } from './model';
import { KEY_BADGE_MS, nextKeyBadge, type KeyBadge, type KeyDisplay } from './overlay/keyOverlay';

const names: Record<string, string> = {
  keyboard_left: '左键区',
  keyboard_right: '右键区',
  mouse: '鼠标',
  arrival: '初见',
  idle: '闲庭',
  typing: '落字',
  rapid: '疾书',
  stamp: '落印',
  think: '思量',
  left: '轻叩',
  right: '轻叩',
  scroll: '展卷',
  tea: '啜茗',
  sleep: '小憩',
  blush: '莞尔',
  celebrate: '事成',
};
const expressions: Record<Expression, string> = {
  default: '从容',
  smile: '微笑',
  think: '思考',
  surprised: '惊讶',
  resigned: '无奈',
  blush: '脸红',
  sleepy: '困倦',
  serious: '认真',
  laugh: '大笑',
  angry: '生气',
  pout: '鼓脸',
  shy: '害羞',
  wronged: '委屈',
  proud: '得意',
  confused: '疑惑',
  phoenix_eyes: '凤凰瞳',
  flame_eyes: '火焰眼',
};
const titles: Record<Panel, string> = {
  focus: '桌宠设置',
  todos: '桌宠设置',
  settings: '桌宠设置',
};
const query = new URLSearchParams(location.search),
  panelWindow = native && query.has('panel');
const preview = !native;
export function App() {
  const [data, setData] = useState<Data>(initialData),
    [ready, setReady] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const tab: Panel = 'settings';
  const [now, setNow] = useState(Date.now());
  const [expression, setExpression] = useState<Expression | undefined>(),
    [menu, setMenu] = useState(false),
    [busy, setBusy] = useState(false);
  const [keyBadge, setKeyBadge] = useState<KeyBadge | undefined>();
  const [effect, setEffect] = useState<string | undefined>();
  const [hoverDim, setHoverDim] = useState(false);
  const [rendererEpoch, setRendererEpoch] = useState(0);
  const hoverTimer = useRef<number | undefined>(undefined);
  const [shortcutSlots, setShortcutSlots] = useState<ShortcutSlot[]>(model.shortcuts);
  const [slotErrors, setSlotErrors] = useState<string[]>([]);
  const [shortcut, setShortcut] = useState('Ctrl+Shift+F10'),
    [nativeStatus, setNativeStatus] = useState('');
  const [undo, setUndo] = useState<string | null>(null);
  const m = useRef(new CharacterMachine(Date.now()));
  const audio = useRef(new AudioManager());
  const presentation = useRef(new PresentationRuntime(Date.now()));
  const [, redraw] = useState(0);
  useEffect(() => {
    if (!menu) return;
    const dismissKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(false);
    };
    const dismissOutside = (event: PointerEvent) => {
      if (event.button === 2) return;
      if (event.target instanceof Element && !event.target.closest('.context-menu')) setMenu(false);
    };
    window.addEventListener('keydown', dismissKey);
    window.addEventListener('pointerdown', dismissOutside);
    return () => {
      window.removeEventListener('keydown', dismissKey);
      window.removeEventListener('pointerdown', dismissOutside);
    };
  }, [menu]);
  const signal = useCallback(
    (s: Signal, x = 0, y = 0, key?: KeyDisplay, source: 'input' | 'gamepad' = 'input') => {
      if (
        source === 'input' &&
        data.settings.inputMode === 'keyboard_only' &&
        ['move', 'left', 'right', 'wheel'].includes(s)
      )
        return;
      m.current.signal(s, Date.now(), x, y);
      presentation.current.input(
        s,
        Date.now(),
        x,
        y,
        source === 'gamepad' ? 'keyboard_mouse' : data.settings.inputMode,
      );
      if (data.settings.keyOverlayEnabled && key)
        setKeyBadge((current) => nextKeyBadge(key, Date.now(), current));
      redraw((n) => n + 1);
    },
    [data.settings.inputMode, data.settings.keyOverlayEnabled],
  );
  useEffect(() => {
    if (!keyBadge) return;
    const timer = window.setTimeout(
      () => setKeyBadge((current) => (current?.id === keyBadge.id ? undefined : current)),
      KEY_BADGE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [keyBadge]);
  useEffect(() => {
    if (data.settings.hoverHideEnabled && !data.settings.passthrough && !menu) return;
    window.clearTimeout(hoverTimer.current);
    setHoverDim(false);
  }, [data.settings.hoverHideEnabled, data.settings.passthrough, menu]);
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);
  const [technical, setTechnical] = useState(false);
  useEffect(() => {
    if (!native) return;
    void invoke<ShortcutSlot[]>('list_shortcuts').then(setShortcutSlots).catch(fail);
    let clean: (() => void) | undefined,
      disposed = false;
    void listen<{
      action: ShortcutSlot['action'];
      trigger: ShortcutSlot['trigger'];
      pressed: boolean;
    }>('shortcut-command', (e) => {
      const { action, trigger, pressed } = e.payload;
      if (action.type === 'expression') {
        presentation.current.expression(action.id, trigger, pressed);
        const face = action.id as Expression;
        if (trigger === 'hold') setExpression(pressed ? face : undefined);
        else if (pressed)
          setExpression((current) => (trigger === 'toggle' && current === face ? undefined : face));
        if (trigger === 'once' && pressed)
          window.setTimeout(
            () => setExpression((current) => (current === face ? undefined : current)),
            1500,
          );
      } else if (action.type === 'animation' && pressed) {
        presentation.current.play(action.id, Date.now());
        redraw((n) => n + 1);
      } else if (action.type === 'effect' && pressed) {
        setEffect(action.id);
        window.setTimeout(
          () => setEffect((current) => (current === action.id ? undefined : current)),
          1000,
        );
      }
    }).then((c) => {
      if (disposed) c();
      else clean = c;
    });
    return () => {
      disposed = true;
      clean?.();
    };
  }, []);
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : String(e));
  const refresh = useCallback(
    () =>
      repository
        .read()
        .then((d) => {
          setData(d);
          setReady(true);
          setShortcut(d.settings.shortcut);
        })
        .catch(fail),
    [],
  );
  useEffect(() => {
    void refresh();
    const f = () => void refresh();
    window.addEventListener('storage', f);
    window.addEventListener('companion-data', f);
    let clean: (() => void) | undefined,
      disposed = false;
    if (native)
      void listen('data-changed', f).then((c) => {
        if (disposed) c();
        else clean = c;
      });
    return () => {
      disposed = true;
      clean?.();
      window.removeEventListener('storage', f);
      window.removeEventListener('companion-data', f);
    };
  }, [refresh]);
  useEffect(() => {
    if (!native) return;
    let clean: (() => void) | undefined;
    let disposed = false;
    void listen('reload-character-resources', () => setRendererEpoch((value) => value + 1)).then(
      (unlisten) => {
        if (disposed) unlisten();
        else clean = unlisten;
      },
    );
    return () => {
      disposed = true;
      clean?.();
    };
  }, []);
  useEffect(() => {
    if (panelWindow) return;
    let clean: (() => void) | undefined,
      disposed = false;
    void subscribeInput(signal)
      .then((c) => {
        if (disposed) c();
        else clean = c;
      })
      .catch(fail);
    return () => {
      disposed = true;
      clean?.();
    };
  }, [signal]);
  useEffect(() => {
    if (!native || panelWindow || !data.settings.gamepadEnabled) return;
    let clean: (() => void) | undefined,
      disposed = false;
    void subscribeGamepad((event) => {
      const mapped = mapGamepadInput(event, model.gamepad_bindings);
      if (mapped) signal(mapped.signal, mapped.x, mapped.y, undefined, 'gamepad');
    })
      .then((c) => {
        if (disposed) c();
        else clean = c;
      })
      .catch(fail);
    return () => {
      disposed = true;
      clean?.();
    };
  }, [signal, data.settings.gamepadEnabled]);
  useEffect(() => {
    if (!native) return;
    let clean: (() => void) | undefined,
      disposed = false;
    void listen<Signal>('companion-action', (e) => signal(e.payload)).then((c) => {
      if (disposed) c();
      else clean = c;
    });
    void invoke<string>('native_status').then(setNativeStatus).catch(fail);
    return () => {
      disposed = true;
      clean?.();
    };
  }, [signal]);
  useEffect(() => {
    let second = 0;
    const timer = setInterval(() => {
      const time = Date.now(),
        before = m.current.pose;
      const beforeAnimation = presentation.current.activeAnimationId;
      m.current.tick(time);
      presentation.current.tick(time);
      const afterAnimation = presentation.current.activeAnimationId;
      const nextSecond = Math.floor(time / 1000);
      if (
        second !== nextSecond ||
        before !== m.current.pose ||
        beforeAnimation !== afterAnimation
      ) {
        second = nextSecond;
        setNow(time);
      }
    }, 1000 / data.settings.fps);
    return () => clearInterval(timer);
  }, [data.settings]);
  const change = async (fn: (d: Data) => void) => {
    if (!ready) throw Error('本地数据尚未载入');
    const next = await repository.update(fn);
    setData(next);
    return next;
  };
  const navigate = (_panel: Panel = 'settings') => {
    setMenu(false);
    if (native && !panelWindow) void openPanel('settings').catch(fail);
  };
  const settings = async (patch: Partial<Settings>) => {
    setBusy(true);
    setError('');
    try {
      const requested = { ...data.settings, ...patch };
      const next = await applySettings(requested);
      await change((d) => {
        d.settings = next;
      });
      setShortcut(next.shortcut);
      if (native) setNativeStatus(await invoke('native_status'));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  const editSlot = (index: number, patch: Partial<ShortcutSlot>) =>
    setShortcutSlots((current) =>
      current.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)),
    );
  const saveSlots = async () => {
    if (!native) return;
    setBusy(true);
    try {
      const result = await invoke<{ slots: ShortcutSlot[]; errors: string[] }>('update_shortcuts', {
        requested: shortcutSlots,
      });
      setShortcutSlots(result.slots);
      setSlotErrors(result.errors);
      setNotice(
        result.errors.length
          ? `已保存可用槽位；${result.errors.length} 个槽位未生效。`
          : '25 个动作槽已保存。',
      );
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  const renderInfo = rendererDiagnostics(data.settings.rendererMode);
  const panel = (
    <section className="panel" aria-label={titles[tab]}>
      <div className="panel-content">
        <div className="eyebrow">按你喜欢的方式</div>
        <h2>桌宠设置</h2>
        <>
          <p className="muted">让陪伴，恰到好处。</p>
          <div className="character-status" role="status" aria-label="角色状态">
            <div>
              <strong>{renderInfo.actual === 'live2d' ? 'Live2D 已加载' : '备用角色显示中'}</strong>
              <span>制作中</span>
            </div>
            <p>长离模型仍在精修，表情与动作会逐步补齐。</p>
            {renderInfo.actual !== 'live2d' && <p>{renderInfo.live2d}</p>}
          </div>
          <label className="setting">
            输入模式
            <select
              value={data.settings.inputMode}
              onChange={(e) =>
                void settings({ inputMode: e.target.value as Settings['inputMode'] })
              }
            >
              <option value="keyboard_mouse">键鼠模式</option>
              <option value="keyboard_only">纯键盘模式</option>
            </select>
          </label>
          <label className="setting">
            按键浮显（不保存输入）
            <input
              type="checkbox"
              checked={data.settings.keyOverlayEnabled}
              disabled={busy}
              onChange={(e) => void settings({ keyOverlayEnabled: e.target.checked })}
            />
          </label>
          <label className="setting">
            无操作后自动睡眠
            <select
              value={data.settings.autoSleepMinutes}
              onChange={(e) =>
                void settings({
                  autoSleepMinutes: Number(e.target.value) as Settings['autoSleepMinutes'],
                })
              }
            >
              <option value="0">关闭</option>
              <option value="5">5 分钟</option>
              <option value="10">10 分钟</option>
              <option value="15">15 分钟</option>
            </select>
          </label>
          <label className="setting">
            鼠标靠近时淡化角色
            <input
              type="checkbox"
              checked={data.settings.hoverHideEnabled}
              disabled={busy}
              onChange={(e) => void settings({ hoverHideEnabled: e.target.checked })}
            />
          </label>
          {data.settings.hoverHideEnabled && (
            <>
              <label className="setting">
                淡化延迟
                <select
                  value={data.settings.hoverHideDelayMs}
                  disabled={!data.settings.hoverHideEnabled || busy}
                  onChange={(e) =>
                    void settings({
                      hoverHideDelayMs: Number(e.target.value) as Settings['hoverHideDelayMs'],
                    })
                  }
                >
                  <option value="250">0.25 秒</option>
                  <option value="500">0.5 秒</option>
                  <option value="1000">1 秒</option>
                </select>
              </label>
              <label className="setting">
                淡化后不透明度
                <select
                  value={data.settings.hoverHideOpacity}
                  disabled={!data.settings.hoverHideEnabled || busy}
                  onChange={(e) =>
                    void settings({
                      hoverHideOpacity: Number(e.target.value) as Settings['hoverHideOpacity'],
                    })
                  }
                >
                  <option value="0.2">20%</option>
                  <option value="0.4">40%</option>
                  <option value="0.6">60%</option>
                </select>
              </label>
            </>
          )}
          <label className="setting">
            角色大小{' '}
            <select
              value={data.settings.scale}
              disabled={busy}
              onChange={(e) => void settings({ scale: Number(e.target.value) })}
            >
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((n) => (
                <option value={n} key={n}>
                  {n * 100}%
                </option>
              ))}
            </select>
          </label>
          <label className="setting">
            动效强度{' '}
            <select
              value={data.settings.motion}
              onChange={(e) => void settings({ motion: e.target.value as Settings['motion'] })}
            >
              <option value="full">完整</option>
              <option value="low">轻柔</option>
              <option value="off">关闭动态</option>
            </select>
          </label>
          <label className="setting">
            角色渲染{' '}
            <select
              value={data.settings.rendererMode}
              disabled={busy}
              onChange={(e) =>
                void settings({ rendererMode: e.target.value as Settings['rendererMode'] })
              }
            >
              <option value="auto">自动选择</option>
              <option value="live2d">优先 Live2D</option>
              <option value="layered2d">分层 2D / 预览图</option>
            </select>
          </label>
          <label className="setting">
            互动气泡
            <input
              type="checkbox"
              checked={data.settings.bubblesEnabled}
              disabled={busy}
              onChange={(e) => void settings({ bubblesEnabled: e.target.checked })}
            />
          </label>
          <button
            className="wide"
            onClick={() => {
              setRendererEpoch((value) => value + 1);
              setNotice('角色渲染已重新初始化');
            }}
          >
            重新加载角色渲染
          </button>
          <label className="setting">
            状态刷新帧率{' '}
            <select
              value={data.settings.fps}
              onChange={(e) => void settings({ fps: Number(e.target.value) as 30 | 60 })}
            >
              <option value="30">30 FPS · 节能</option>
              <option value="60">60 FPS</option>
            </select>
          </label>
          {(['topmost', 'passthrough', 'autostart'] as const).map((key, i) => (
            <label className="setting" key={key}>
              {['窗口置顶', '鼠标穿透', '开机启动'][i]}
              <input
                type="checkbox"
                checked={data.settings[key]}
                disabled={!native || busy}
                onChange={(e) => void settings({ [key]: e.target.checked })}
              />
            </label>
          ))}
          <label className="shortcut">
            恢复快捷键
            <input
              aria-label="恢复快捷键"
              value={shortcut}
              disabled={!native}
              onChange={(e) => setShortcut(e.target.value)}
            />
          </label>
          <button
            className="wide"
            disabled={!native || busy}
            onClick={() => void settings({ shortcut })}
          >
            应用快捷键
          </button>
          <p className="fine">
            穿透后可从系统托盘「关闭穿透并显示」恢复。快捷键冲突会显示错误并保留原快捷键。
          </p>
          <details className="settings-extra">
            <summary>手柄与音效</summary>
            <label className="setting">
              手柄互动（可与键鼠同时使用）
              <input
                type="checkbox"
                checked={data.settings.gamepadEnabled}
                disabled={!native || busy}
                onChange={(e) => void settings({ gamepadEnabled: e.target.checked })}
              />
            </label>
            <label className="setting">
              互动音效（原创占位音，默认关闭）
              <input
                type="checkbox"
                checked={data.settings.sfxEnabled}
                disabled={busy}
                onChange={(e) => void settings({ sfxEnabled: e.target.checked })}
              />
            </label>
            <label className="setting">
              音效音量 {Math.round(data.settings.sfxVolume * 100)}%
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={Math.round(data.settings.sfxVolume * 100)}
                disabled={!data.settings.sfxEnabled || busy}
                onChange={(e) => void settings({ sfxVolume: Number(e.target.value) / 100 })}
              />
            </label>
            <button
              className="wide"
              disabled={!data.settings.sfxEnabled}
              onClick={() =>
                void audio.current.play('focus_complete', data.settings).then((result) => {
                  if (result === 'failed') setError('本地音效播放失败');
                  else if (result === 'played') setNotice('已试听本地占位音效');
                })
              }
            >
              试听互动音效
            </button>
            <p className="fine">键盘音与语音素材尚未接入；对应功能保持关闭。不会打包游戏语音。</p>
          </details>
          <details className="shortcut-slots">
            <summary>动作快捷键 · 25 槽</summary>
            <p className="fine">恢复键独立保留。缺少素材的表情、动画、音效会标为待接入。</p>
            <div className="slot-list">
              {shortcutSlots.map((slot, index) => {
                const ids =
                  slot.action.type === 'expression'
                    ? model.expressions.map((e) => e.id)
                    : slot.action.type === 'animation'
                      ? model.animations.map((a) => a.id)
                      : slot.action.type === 'effect'
                        ? ['fire', 'stars', 'zzz']
                        : slot.action.type === 'voice'
                          ? ['voice-01']
                          : ['compound-01'];
                return (
                  <div className="slot-row" key={slot.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={slot.enabled}
                        disabled={!native || busy}
                        onChange={(e) => editSlot(index, { enabled: e.target.checked })}
                      />{' '}
                      {index + 1}
                    </label>
                    <input
                      aria-label={`第 ${index + 1} 槽快捷键`}
                      value={slot.shortcut}
                      placeholder="Ctrl+Alt+1"
                      disabled={!native || busy}
                      onChange={(e) => editSlot(index, { shortcut: e.target.value })}
                    />
                    <select
                      aria-label={`第 ${index + 1} 槽动作类型`}
                      value={slot.action.type}
                      disabled={!native || busy}
                      onChange={(e) => {
                        const type = e.target.value as ShortcutSlot['action']['type'];
                        const id =
                          type === 'animation'
                            ? model.animations[0].id
                            : type === 'expression'
                              ? model.expressions[0].id
                              : type === 'effect'
                                ? 'fire'
                                : type === 'voice'
                                  ? 'voice-01'
                                  : 'compound-01';
                        editSlot(index, { action: { type, id }, expression: id });
                      }}
                    >
                      <option value="expression">表情</option>
                      <option value="animation">动画</option>
                      <option value="effect">特效</option>
                      <option value="voice">语音·待接入</option>
                      <option value="compound">组合·待接入</option>
                    </select>
                    <select
                      aria-label={`第 ${index + 1} 槽动作`}
                      value={slot.action.id}
                      disabled={!native || busy}
                      onChange={(e) =>
                        editSlot(index, {
                          action: { ...slot.action, id: e.target.value },
                          expression: e.target.value,
                        })
                      }
                    >
                      {ids.map((id) => (
                        <option value={id} key={id}>
                          {id}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label={`第 ${index + 1} 槽触发方式`}
                      value={slot.trigger}
                      disabled={!native || busy}
                      onChange={(e) =>
                        editSlot(index, {
                          trigger: e.target.value as ShortcutSlot['trigger'],
                          mode: e.target.value,
                        })
                      }
                    >
                      <option value="toggle">切换</option>
                      <option value="hold">按住</option>
                      <option value="once">单次</option>
                    </select>
                  </div>
                );
              })}
            </div>
            {slotErrors.map((error) => (
              <p className="slot-error" key={error}>
                {error}
              </p>
            ))}
            <button className="wide" disabled={!native || busy} onClick={() => void saveSlots()}>
              保存并立即应用动作槽
            </button>
          </details>
          {preview && (
            <p className="fine">
              当前为浏览器预览，只响应页面内输入。透明桌面窗口、全局键鼠、托盘和穿透需使用 Windows
              版。
            </p>
          )}
          <details className="runtime-information">
            <summary>查看运行信息</summary>
            <div className="capabilities">
              <strong>{preview ? '浏览器预览模式' : 'Windows 原生模式'}</strong>
              {!preview && <p>{nativeStatus || '正在读取原生状态…'}</p>}
              <p>
                当前渲染：{renderInfo.actual}；{renderInfo.live2d}。
              </p>
              <p>备用分层素材：{renderInfo.layers}。</p>
              {native && (
                <button
                  onClick={() =>
                    void invoke<string>('native_status').then(setNativeStatus).catch(fail)
                  }
                >
                  刷新监听状态
                </button>
              )}
            </div>
          </details>
          <p className="fine">输入只用于触发动作，不保存输入文字，也不监控应用使用情况。</p>
        </>
      </div>
    </section>
  );
  const ActiveRenderer = technical ? LayeredRenderer : RendererHost;
  const renderSnapshot = presentation.current.snapshot(now, data.settings);
  // The selected default face releases manual override so native touch and
  // sleep reactions remain visible; other explicitly selected faces stay put.
  const characterSnapshot =
    expression && expression !== 'default' ? { ...renderSnapshot, expression } : renderSnapshot;
  const touch = (area: 'head' | 'body') => {
    signal(area === 'head' ? 'pet' : 'body');
    presentation.current.setSpeech(area === 'head' ? '在呢。' : '一起慢慢来。', Date.now());
  };
  const pet = (
    <div
      className={`pet-wrap${hoverDim ? ' hover-dim' : ''}`}
      style={{ '--hover-opacity': data.settings.hoverHideOpacity } as React.CSSProperties}
      onPointerEnter={() => {
        if (!data.settings.hoverHideEnabled || data.settings.passthrough || menu) return;
        window.clearTimeout(hoverTimer.current);
        hoverTimer.current = window.setTimeout(
          () => setHoverDim(true),
          data.settings.hoverHideDelayMs,
        );
      }}
      onPointerLeave={() => {
        window.clearTimeout(hoverTimer.current);
        setHoverDim(false);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu((v) => !v);
      }}
    >
      {data.settings.keyOverlayEnabled && keyBadge && (
        <div className="key-badge" key={keyBadge.id} aria-label={`当前按键 ${keyBadge.label}`}>
          {keyBadge.label}
        </div>
      )}
      {effect && (
        <div className={`pet-effect effect-${effect}`} aria-label={`占位特效 ${effect}`}>
          {effect === 'fire' ? '✦' : effect === 'stars' ? '✧' : 'Zzz'}
        </div>
      )}
      {data.settings.bubblesEnabled && renderSnapshot.bubble && (
        <div className={`pet-bubble bubble-${renderSnapshot.bubble.kind}`} role="status">
          {renderSnapshot.bubble.text}
        </div>
      )}
      <ActiveRenderer
        key={rendererEpoch}
        machine={m.current}
        expression={expression}
        settings={data.settings}
        progress={0}
        priority=""
        onHead={() => touch('head')}
        onBody={() => touch('body')}
        onLamp={() => touch('body')}
        onScroll={() => touch('body')}
        snapshot={characterSnapshot}
      />
      {native && !panelWindow && (
        <button
          className="drag-handle"
          aria-label="拖动桌宠"
          onPointerDown={(e) =>
            drag(e, fail, (active) => {
              presentation.current.setDragState(active, Date.now());
              redraw((n) => n + 1);
            })
          }
        >
          ⠿
        </button>
      )}
      {menu && (
        <div className="context-menu" role="dialog" aria-label="长离互动菜单">
          <div className="pet-menu-heading">
            <b>长离 · 互动</b>
            <span className="pet-menu-badge">试作版</span>
            <button
              className="pet-menu-close"
              aria-label="关闭互动菜单"
              onClick={() => setMenu(false)}
            >
              ×
            </button>
          </div>
          <p className="pet-menu-caption">换个表情</p>
          <div className="expression-grid">
            {model.expressions
              .filter((e) => e.asset || model.renderer.live2d.expressionMap[e.id])
              .map((e) => (
                <button
                  key={e.id}
                  aria-pressed={(expression || 'default') === e.id}
                  onClick={() => {
                    if (e.id === 'default')
                      presentation.current.expression('default', 'toggle', true, Date.now());
                    setExpression(e.id as Expression);
                    setMenu(false);
                  }}
                >
                  {e.name}
                </button>
              ))}
          </div>
          {model.animations
            .filter((a) => model.renderer.live2d.motionMap[a.id])
            .map((a) => (
              <button
                key={a.id}
                className="pet-menu-action"
                aria-label={a.name}
                onClick={() => {
                  presentation.current.play(a.id, Date.now());
                  setMenu(false);
                  redraw((n) => n + 1);
                }}
              >
                <span>{a.name}</span>
              </button>
            ))}
          <div className="pet-menu-navigation">
            <button aria-label="桌宠设置" onClick={() => navigate('settings')}>
              设置
            </button>
          </div>
          <details className="pet-menu-more">
            <summary>更多选项</summary>
            <div className="pet-menu-options">
              <button
                onClick={() =>
                  void settings({
                    inputMode:
                      data.settings.inputMode === 'keyboard_mouse'
                        ? 'keyboard_only'
                        : 'keyboard_mouse',
                  })
                }
              >
                {data.settings.inputMode === 'keyboard_mouse' ? '切换纯键盘' : '切换键鼠模式'}
              </button>
              <button
                onClick={() => void settings({ topmost: !data.settings.topmost })}
                disabled={!native}
              >
                置顶：{data.settings.topmost ? '开' : '关'}
              </button>
              <button
                onClick={() => void settings({ passthrough: !data.settings.passthrough })}
                disabled={!native}
              >
                鼠标穿透
              </button>
              {native && (
                <button onClick={() => void invoke('reset_position').catch(fail)}>重置位置</button>
              )}
              <button
                onClick={() => {
                  setRendererEpoch((value) => value + 1);
                  setMenu(false);
                }}
              >
                刷新角色渲染
              </button>
            </div>
          </details>
          {native && (
            <div className="pet-menu-footer">
              <button
                onClick={() => {
                  setMenu(false);
                  void invoke('hide_pet').catch(fail);
                }}
              >
                隐藏桌宠
              </button>
              <button onClick={() => void invoke('quit_app').catch(fail)}>退出桌宠</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
  return (
    <main className={preview ? 'preview' : panelWindow ? 'native-panel' : 'native-pet'}>
      {preview && (
        <header>
          <div className="brand">
            <span className="seal">离</span>
            <div>
              <h1>离火长明</h1>
              <span>CHANGLI · DESKTOP COMPANION</span>
            </div>
          </div>
          <div className="mode-badge">
            <i /> 浏览器预览 <span>v0.6.4</span>
          </div>
        </header>
      )}
      {preview ? (
        <div className="workspace">
          <section className="scene">
            <div className="scene-heading">
              <span className="eyebrow">长离 · 在你身旁</span>
              <span className="state-chip">
                <i />
                {names[m.current.pose]}
              </span>
            </div>
            <div className="scene-art">
              <div className="sun-disc" />
              <div className="orbit one" />
              <div className="orbit two" />
              <span className="vertical-poem">
                离火不息
                <br />
                长明相伴
              </span>
              <div className="art-scale" style={{ width: `${360 * data.settings.scale}px` }}>
                {pet}
              </div>
              <span className="little-mark">
                长离
                <br />
                <small>CHANGLI</small>
              </span>
            </div>
            <div className="scene-foot">
              <p>键落有声，陪你把日常过成喜欢的模样。</p>
              <span>点击头部互动 · 右键打开菜单 · 下方可模拟输入</span>
            </div>
            {import.meta.env.DEV && (
              <details className="dev-tools">
                <summary>
                  动作实验室 <span>仅开发模式 · 模拟事件</span>
                </summary>
                <label className="renderer-switch">
                  <input
                    type="checkbox"
                    checked={technical}
                    onChange={(e) => setTechnical(e.target.checked)}
                  />{' '}
                  显示旧版分层逻辑测试稿（非目标美术）
                </label>
                <div className="event-buttons">
                  <button onClick={() => signal('keyboard_left')}>左键区 Q / A / Z</button>
                  <button onClick={() => signal('keyboard_right')}>右键区 Y / H / N</button>
                  {(
                    [
                      'key',
                      'enter',
                      'backspace',
                      'left',
                      'right',
                      'wheel',
                      'pet',
                      'complete',
                    ] as Signal[]
                  ).map((e, i) => (
                    <button key={e} onClick={() => signal(e)}>
                      {['打字', '盖章', '思考', '左手', '右手', '滚轮', '摸头', '庆祝'][i]}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      m.current.lastInput = Date.now() - 60001;
                      m.current.teaDone = false;
                      m.current.set('idle', Date.now());
                    }}
                  >
                    空闲 60 秒
                  </button>
                  <button
                    onClick={() => {
                      m.current.lastInput = Date.now() - 180001;
                      m.current.set('idle', Date.now());
                    }}
                  >
                    空闲 180 秒
                  </button>
                </div>
                <label>
                  表情{' '}
                  <select
                    aria-label="预览表情"
                    value={expression || ''}
                    onChange={(e) =>
                      setExpression((e.target.value || undefined) as Expression | undefined)
                    }
                  >
                    <option value="">跟随动作</option>
                    {Object.entries(expressions).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="fine">
                  当前状态：{names[m.current.pose]} /{' '}
                  {expressions[expression || motions[m.current.pose].expression]}
                  。已绑定表情为 Live2D 技术版，其余素材待制作。
                </p>
              </details>
            )}
          </section>
          {panel}
        </div>
      ) : panelWindow ? (
        panel
      ) : (
        pet
      )}
      {error && (
        <div role="alert" className="message error">
          {error}
          <button onClick={() => setError('')}>关闭</button>
        </div>
      )}
      {notice && (
        <div role="status" className="message">
          {notice}
          <button onClick={() => setNotice('')}>知道了</button>
        </div>
      )}
      {preview && (
        <footer>
          <span>本地陪伴，安心离线。</span>
          <span>Live2D 技术候选版 · 精细分层动作待制作 · 原生能力以实机报告为准</span>
        </footer>
      )}
    </main>
  );
}
