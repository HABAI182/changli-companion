import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { PhysicalPosition } from '@tauri-apps/api/dpi';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { native } from './storage';
import type { Settings, Signal } from './domain';
import { keyRegion } from './model';
import type { KeyDisplay } from './overlay/keyOverlay';
export type Panel = 'focus' | 'todos' | 'settings';
export const openPanel = (panel: Panel) => invoke('open_panel', { panel });
export const applySettings = (settings: Settings): Promise<Settings> =>
  native ? invoke<Settings>('apply_settings', { settings }) : Promise.resolve(settings);
export interface GamepadInput {
  controller: number;
  control: string;
  pressed: boolean;
  value: number;
  x: number;
  y: number;
}
export const subscribeGamepad = (fn: (event: GamepadInput) => void) =>
  native
    ? listen<GamepadInput>('semantic-gamepad', (event) => fn(event.payload))
    : Promise.resolve(() => {});
// Keep the pet non-focusable while dragging. Capture pointer movement immediately:
// a short drag may finish before the initial native position query returns.
export function drag(
  event: ReactPointerEvent<HTMLElement>,
  fail: (error: unknown) => void,
  onPhase?: (active: boolean) => void,
) {
  if (!native || event.button !== 0) return;
  event.preventDefault();
  onPhase?.(true);
  const element = event.currentTarget;
  const pointer = event.pointerId;
  const startX = event.screenX;
  const startY = event.screenY;
  const window = getCurrentWindow();
  const origin = Promise.all([window.outerPosition(), window.scaleFactor()]);
  let latest = { x: startX, y: startY };
  let frame = 0;
  let writes = Promise.resolve();
  const flush = () => {
    frame = 0;
    const point = latest;
    writes = writes
      .then(async () => {
        const [position, scale] = await origin;
        await window.setPosition(
          new PhysicalPosition(
            Math.round(position.x + (point.x - startX) * scale),
            Math.round(position.y + (point.y - startY) * scale),
          ),
        );
      })
      .catch(fail);
  };
  const move = (e: PointerEvent) => {
    if (e.pointerId !== pointer) return;
    latest = { x: e.screenX, y: e.screenY };
    if (!frame) frame = requestAnimationFrame(flush);
  };
  const end = (e: PointerEvent) => {
    if (e.pointerId !== pointer) return;
    if (e.type === 'pointerup') latest = { x: e.screenX, y: e.screenY };
    if (frame) cancelAnimationFrame(frame);
    element.removeEventListener('pointermove', move);
    element.removeEventListener('pointerup', end);
    element.removeEventListener('pointercancel', end);
    element.removeEventListener('lostpointercapture', end);
    if (element.hasPointerCapture(pointer)) element.releasePointerCapture(pointer);
    onPhase?.(false);
    flush();
  };
  element.setPointerCapture(pointer);
  element.addEventListener('pointermove', move);
  element.addEventListener('pointerup', end);
  element.addEventListener('pointercancel', end);
  element.addEventListener('lostpointercapture', end);
  // Attach a rejection handler even when no pointer movement occurs.
  void origin.catch(fail);
}
export async function subscribeInput(
  fn: (signal: Signal, x?: number, y?: number, key?: KeyDisplay) => void,
) {
  if (native)
    return listen<{ signal: Signal; x: number; y: number; key?: KeyDisplay }>(
      'semantic-input',
      (e) => fn(e.payload.signal, e.payload.x, e.payload.y, e.payload.key),
    );
  const editable = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    Boolean(target.closest('input,textarea,select,button,[contenteditable]'));
  const key = (e: KeyboardEvent) => {
    if (!editable(e.target) && !e.isComposing) {
      const special: Signal | undefined =
        e.code === 'Enter'
          ? 'enter'
          : e.code === 'Backspace'
            ? 'backspace'
            : e.code === 'Space'
              ? 'space'
              : undefined;
      fn(
        special ||
          (keyRegion(
            e.code.startsWith('Key')
              ? e.code.charCodeAt(3)
              : e.key === 'Enter'
                ? 13
                : e.key === 'Backspace'
                  ? 8
                  : 32,
          ) as Signal),
        0,
        0,
        { label: browserKeyLabel(e.code), phase: 'down' },
      );
    }
  };
  const move = (e: MouseEvent) =>
    fn('move', (e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2);
  const mouse = (e: MouseEvent) => {
    if (!editable(e.target)) fn(e.button === 2 ? 'right' : 'left');
  };
  const wheel = (e: WheelEvent) => {
    if (!editable(e.target)) fn('wheel');
  };
  window.addEventListener('keydown', key);
  window.addEventListener('mousemove', move);
  window.addEventListener('mousedown', mouse);
  window.addEventListener('wheel', wheel, { passive: true });
  return () => {
    window.removeEventListener('keydown', key);
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mousedown', mouse);
    window.removeEventListener('wheel', wheel);
  };
}
export function browserKeyLabel(code: string): string {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^F([1-9]|1[0-2])$/.test(code)) return code;
  return (
    (
      {
        Enter: 'Enter',
        Backspace: 'Backspace',
        Space: 'Space',
        ArrowLeft: '←',
        ArrowRight: '→',
        ArrowUp: '↑',
        ArrowDown: '↓',
        ShiftLeft: 'Shift',
        ShiftRight: 'Shift',
        ControlLeft: 'Ctrl',
        ControlRight: 'Ctrl',
        AltLeft: 'Alt',
        AltRight: 'Alt',
        Tab: 'Tab',
        Escape: 'Esc',
      } as Record<string, string>
    )[code] || 'Key'
  );
}
