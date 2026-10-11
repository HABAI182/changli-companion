import type { Signal } from '../domain';
import type { GamepadInput } from '../native';

export interface MappedGamepadInput {
  signal: Signal;
  x: number;
  y: number;
}
// Gamepad input joins the same semantic path as keyboard and mouse input.
// XInput thumb Y is positive upwards; renderer gaze Y is positive downwards.
export function mapGamepadInput(
  event: GamepadInput,
  bindings: Record<string, Signal>,
): MappedGamepadInput | null {
  const signal = bindings[event.control];
  if (!signal) return null;
  if (event.control.endsWith('_stick')) {
    if (signal !== 'move') return null;
    return {
      signal,
      x: Math.max(-1, Math.min(1, event.x)),
      y: event.y === 0 ? 0 : Math.max(-1, Math.min(1, -event.y)),
    };
  }
  if (!event.pressed) return null;
  return { signal, x: 0, y: 0 };
}
