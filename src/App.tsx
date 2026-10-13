import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { InteractionMenu } from './pet/InteractionMenu';
import { menuPlacement } from './pet/menuPlacement';
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
import { SettingsPanel } from './settings/SettingsPanel';
import { KEY_BADGE_MS, nextKeyBadges, type KeyBadge, type KeyDisplay } from './overlay/keyOverlay';
import { ChangliEmblem } from './overlay/ChangliEmblem';

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
const query = new URLSearchParams(location.search),
  menuWindow = native && query.has('menu'),
  panelWindow = native && (query.has('panel') || menuWindow);
const preview = !native;
export function App() {
  const [data, setData] = useState<Data>(initialData),
    [ready, setReady] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const settingsWrites = useRef<Promise<unknown>>(Promise.resolve());
  const [now, setNow] = useState(Date.now());
  const [expression, setExpression] = useState<Expression | undefined>(),
    [menu, setMenu] = useState(false),
    [busy, setBusy] = useState(false);
  const [keyBadges, setKeyBadges] = useState<KeyBadge[]>([]);
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
        setKeyBadges((current) =>
          nextKeyBadges(key, Date.now(), current, data.settings.multiKeyOverlayEnabled),
        );
      redraw((n) => n + 1);
    },
    [
      data.settings.inputMode,
      data.settings.keyOverlayEnabled,
      data.settings.multiKeyOverlayEnabled,
    ],
  );
  useEffect(() => {
    if (!keyBadges.length) return;
    const timer = window.setTimeout(
      () => setKeyBadges((current) => current.filter((item) => item.expiresAt > Date.now())),
      Math.max(0, Math.min(...keyBadges.map((item) => item.expiresAt)) - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [keyBadges]);
  useEffect(() => {
    setKeyBadges([]);
  }, [data.settings.keyOverlayEnabled, data.settings.multiKeyOverlayEnabled]);
  useEffect(() => {
    if (data.settings.hoverHideEnabled && !data.settings.passthrough && !menu) return;
    window.clearTimeout(hoverTimer.current);
    setHoverDim(false);
  }, [data.settings.hoverHideEnabled, data.settings.passthrough, menu]);
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0, maxHeight: 468 });
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
        if (action.id === 'phoenix') presentation.current.react('phoenix', Date.now());
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
        // The pet needs a fresh presentation on every animation frame. The
        // once-a-second panel clock skips short blinks and freezes gaze easing.
        !panelWindow ||
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
  const settings = (patch: Partial<Settings>): Promise<boolean> => {
    const write = async () => {
      setBusy(true);
      setError('');
      try {
        // Read persisted settings after earlier writes; dragging must not
        // overwrite another setting with a stale render's snapshot.
        const current = await repository.read();
        const next = await applySettings({ ...current.settings, ...patch });
        await change((d) => {
          d.settings = next;
        });
        setShortcut(next.shortcut);
        if (native) void invoke<string>('native_status').then(setNativeStatus).catch(fail);
        return true;
      } catch (e) {
        fail(e);
        return false;
      } finally {
        setBusy(false);
      }
    };
    const result = settingsWrites.current.then(write, write);
    settingsWrites.current = result;
    return result;
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
  const previewScale = async (scale: number) => {
    if (native) await invoke('preview_scale', { scale });
    else setData((current) => ({ ...current, settings: { ...current.settings, scale } }));
  };
  const panel = (
    <SettingsPanel
      value={data.settings}
      update={settings}
      previewScale={previewScale}
      fail={fail}
      busy={busy}
      native={native}
      live2dReady={renderInfo.actual === 'live2d'}
      shortcut={shortcut}
      setShortcut={setShortcut}
      reload={() => {
        setRendererEpoch((value) => value + 1);
        setNotice('角色渲染已重新初始化');
      }}
      playSound={() =>
        void audio.current.play('focus_complete', data.settings).then((result) => {
          if (result === 'failed') setError('本地音效播放失败');
          else if (result === 'played') setNotice('已试听本地占位音效');
        })
      }
    >
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
                    <option
                      value={id}
                      key={id}
                      disabled={
                        slot.action.type === 'expression' &&
                        !model.renderer.live2d.expressionMap[id] &&
                        !model.expressions.find((e) => e.id === id)?.asset
                      }
                    >
                      {slot.action.type === 'expression' ? expressions[id as Expression] || id : id}
                      {slot.action.type === 'expression' &&
                      !model.renderer.live2d.expressionMap[id] &&
                      !model.expressions.find((e) => e.id === id)?.asset
                        ? ' · 待制作'
                        : ''}
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
              onClick={() => void invoke<string>('native_status').then(setNativeStatus).catch(fail)}
            >
              刷新监听状态
            </button>
          )}
        </div>
      </details>
    </SettingsPanel>
  );
  const ActiveRenderer = technical ? LayeredRenderer : RendererHost;
  const renderSnapshot = presentation.current.snapshot(now, data.settings);
  // The selected default face releases manual override so native touch and
  // sleep reactions remain visible; other explicitly selected faces stay put.
  const characterSnapshot =
    expression && expression !== 'default' && !renderSnapshot.animation
      ? { ...renderSnapshot, expression }
      : renderSnapshot;
  const touch = (area: 'head' | 'body') => {
    signal(area === 'head' ? 'pet' : 'body');
    presentation.current.react(area === 'head' ? 'head' : 'body', Date.now());
  };
  const closeMenu = () => {
    setMenu(false);
    if (native) void invoke('close_pet_menu').catch(fail);
  };
  const menuView = (
    <InteractionMenu
      native={native}
      drag={(e) => {
        if (e.button !== 0 || (e.target instanceof Element && e.target.closest('button'))) return;
        e.preventDefault();
        if (native) {
          void invoke('drag_pet_menu').catch(fail);
          return;
        }
        const target = e.currentTarget,
          id = e.pointerId,
          startX = e.clientX,
          startY = e.clientY;
        const bounds = target.closest('.browser-menu-container')!.getBoundingClientRect();
        target.setPointerCapture(id);
        const move = (event: PointerEvent) =>
          setMenuPosition((current) => ({
            ...current,
            left: Math.max(
              8,
              Math.min(innerWidth - bounds.width - 8, bounds.left + event.clientX - startX),
            ),
            top: Math.max(
              8,
              Math.min(innerHeight - bounds.height - 8, bounds.top + event.clientY - startY),
            ),
          }));
        const end = () => {
          target.removeEventListener('pointermove', move);
          target.removeEventListener('pointerup', end);
          target.removeEventListener('lostpointercapture', end);
        };
        target.addEventListener('pointermove', move);
        target.addEventListener('pointerup', end);
        target.addEventListener('lostpointercapture', end);
      }}
      close={closeMenu}
      action={(kind, id) => {
        if (native) void invoke('menu_action', { kind, id }).catch(fail);
        else {
          if (kind === 'expression') {
            presentation.current.expression(id, 'toggle', true, Date.now());
            setExpression(id as Expression);
          } else {
            presentation.current.play(id, Date.now());
            redraw((n) => n + 1);
          }
          closeMenu();
        }
      }}
      settings={() => {
        closeMenu();
        if (native) void openPanel('settings').catch(fail);
        else navigate('settings');
      }}
      hide={() => {
        closeMenu();
        void invoke('hide_pet').catch(fail);
      }}
      quit={() => void invoke('quit_app').catch(fail)}
    />
  );
  if (menuWindow)
    return (
      <main
        className="native-menu"
        onKeyDown={(e) => {
          if (e.key === 'Escape') closeMenu();
        }}
      >
        {menuView}
      </main>
    );
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
        if (native) void invoke('open_pet_menu').catch(fail);
        else {
          setMenuPosition(
            menuPlacement(e.currentTarget.getBoundingClientRect(), {
              width: innerWidth,
              height: innerHeight,
            }),
          );
          setMenu((v) => !v);
        }
      }}
    >
      {data.settings.keyOverlayEnabled && keyBadges.length > 0 && (
        <div className="key-badges" aria-label="按键浮显">
          {keyBadges.map((badge) => (
            <div
              className="key-badge changli-control"
              key={badge.id}
              style={{ animationDuration: `${KEY_BADGE_MS}ms` }}
              aria-label={`当前按键 ${badge.label}`}
            >
              <span className="key-badge-label">{badge.label}</span>
              <ChangliEmblem />
            </div>
          ))}
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
      {!panelWindow && (
        <button
          className="drag-handle changli-control"
          aria-label="拖动桌宠"
          title="拖动桌宠"
          onPointerDown={(e) =>
            drag(
              e,
              fail,
              (active) => {
                presentation.current.setDragState(active, Date.now());
                redraw((n) => n + 1);
              },
              (dx, dy) => presentation.current.dragMove(dx, dy, Date.now()),
            )
          }
        >
          <ChangliEmblem />
          <svg className="drag-grip" viewBox="0 0 12 4" aria-hidden="true">
            {[2, 6, 10].map((x) => (
              <circle key={x} cx={x} cy="2" r="0.65" fill="currentColor" />
            ))}
          </svg>
        </button>
      )}
      {menu &&
        createPortal(
          <div className="browser-menu-container" style={menuPosition}>
            {menuView}
          </div>,
          document.body,
        )}
    </div>
  );
  return (
    <main className={preview ? 'preview' : panelWindow ? 'native-panel' : 'native-pet'}>
      {preview && (
        <header>
          <div className="brand">
            <img className="brand-pet-icon" src="/assets/changli-icon-v0810.png" alt="长离" />
            <div>
              <h1>离火长明</h1>
              <span>CHANGLI · DESKTOP COMPANION</span>
            </div>
          </div>
          <div className="mode-badge">
            <i /> 浏览器预览 <span>v0.7.14</span>
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
                  <button onClick={() => signal('keyboard_left', 0, -1)}>左后区 数字 / Q～T</button>
                  <button onClick={() => signal('keyboard_left', 0, 1)}>左前区 A～G / Z～B</button>
                  <button onClick={() => signal('keyboard_right', 0, -1)}>
                    右后区 数字 / Y～P
                  </button>
                  <button onClick={() => signal('keyboard_right', 0, 1)}>右前区 H～L / N～M</button>
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
                  。17 个表情可用，泛红、泪光和瞳孔特效随脸部运动。
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
