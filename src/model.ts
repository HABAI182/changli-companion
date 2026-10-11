import manifest from '../public/models/changli/model.json';
import type { Signal } from './domain';
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
    };
  };
  preview: string;
  canvas: number[];
  art_status: string;
  assets: Record<string, string>;
  states: Record<ModelState, { asset: string; label: string; feedback?: string }>;
  hotspots: Record<string, number[]>;
  expressions: { id: string; name: string; asset: string | null }[];
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
