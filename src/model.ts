import manifest from 'virtual:changli-model';
import type { Signal } from './domain';
import type { RuntimeOffsetRig } from './renderer/live2d/RuntimeOffsets';
export type InputMode = 'keyboard_mouse' | 'keyboard_only';
export type ModelState = 'idle' | 'keyboard_left' | 'keyboard_right' | 'mouse';
export interface Model {
  schema: number;
  name: string;
  display_name: string;
  version: string;
  renderer: {
    preferred: 'live2d' | 'layered' | 'sprite';
    fallback: 'layered' | 'sprite';
    layered: { manifest: string };
    live2d: {
      entry: string | null;
      parameterMap: Record<string, string>;
      motionMap: Record<string, string>;
      expressionMap: Record<string, string>;
      runtimeOffsets?: RuntimeOffsetRig;
    };
  };
  preview: string;
  canvas: number[];
  art_status: string;
  assets: Record<string, string>;
  states: Record<ModelState, { asset: string; label: string; feedback?: string }>;
  hotspots: Record<string, number[]>;
  expressions: { id: string; name: string; asset: string | null; status?: string }[];
  animations: {
    id: string;
    name: string;
    duration: number;
    frames: string[];
    status: string;
    loopCount: number;
    priority: number;
    interrupt: 'none' | 'higher-only' | 'any';
    restore: 'previous' | 'idle';
  }[];
  key_bindings: { left_vkeys: number[]; right_vkeys: number[]; fallback: string };
  gamepad_bindings: Record<string, Signal>;
  sounds: Record<
    string,
    { asset: string; kind: 'sfx' | 'voice'; cooldownMs: number; status: string }
  >;
  shortcuts: {
    id: string;
    enabled: boolean;
    shortcut: string;
    expression: string;
    mode: string;
    trigger: 'toggle' | 'hold' | 'once';
    action: { type: 'expression' | 'animation' | 'effect' | 'voice' | 'compound'; id: string };
  }[];
  capabilities: { layered: boolean; live2d: boolean; audio: boolean };
}
export type ShortcutSlot = Model['shortcuts'][number];
export const model = manifest as Model;
export const modelRoot = '/models/changli/';
export function validateModel(candidate: unknown): candidate is Model {
  if (!candidate || typeof candidate !== 'object') return false;
  const m = candidate as Partial<Model>;
  return (
    m.schema === 2 &&
    !!m.renderer &&
    ['live2d', 'layered', 'sprite'].includes(m.renderer.preferred) &&
    Array.isArray(m.expressions) &&
    m.expressions.length >= 16 &&
    Array.isArray(m.animations) &&
    m.animations.length >= 5 &&
    Array.isArray(m.shortcuts) &&
    m.shortcuts.length === 25 &&
    new Set(m.shortcuts.map((s) => s.id)).size === 25 &&
    !!m.key_bindings &&
    Array.isArray(m.key_bindings.left_vkeys) &&
    Array.isArray(m.key_bindings.right_vkeys) &&
    !!m.gamepad_bindings &&
    !!m.sounds
  );
}
if (!validateModel(model)) throw Error('model.json schema v2 校验失败');
export function resource(path: string) {
  if (path.includes('..') || path.includes(':') || path.startsWith('/'))
    throw Error('模型资源须位于模型目录内');
  return modelRoot + path;
}
export function keyRegion(code: number): ModelState {
  return model.key_bindings.left_vkeys.includes(code) ? 'keyboard_left' : 'keyboard_right';
}

// Share Windows virtual-key zones with the browser, including number row and
// punctuation. Key labels remain transient and no typed content is retained.
export function browserVirtualKey(code: string): number {
  if (/^Key[A-Z]$/.test(code)) return code.charCodeAt(3);
  if (/^Digit[0-9]$/.test(code)) return code.charCodeAt(5);
  if (/^F([1-9]|1[0-2])$/.test(code)) return 111 + Number(code.slice(1));
  if (/^Numpad[0-9]$/.test(code)) return 96 + Number(code.slice(6));
  return ({ Escape:27, Tab:9, CapsLock:20, Backquote:192, Minus:189, Equal:187,
    BracketLeft:219, BracketRight:221, Backslash:220, Semicolon:186, Quote:222,
    Comma:188, Period:190, Slash:191, Enter:13, NumpadEnter:13, Backspace:8,
    Space:32, ShiftLeft:160, ShiftRight:161, ControlLeft:162, ControlRight:163,
    AltLeft:164, AltRight:165, ArrowLeft:37, ArrowUp:38, ArrowRight:39, ArrowDown:40,
    Home:36, End:35, PageUp:33, PageDown:34, Insert:45, Delete:46,
    NumpadMultiply:106, NumpadAdd:107, NumpadSubtract:109, NumpadDecimal:110,
    NumpadDivide:111 } as Record<string, number>)[code] || 0;
}
