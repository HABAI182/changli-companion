import { expect, it } from 'vitest';
import { model } from '../src/model';
import { mapGamepadInput } from '../src/pet/gamepad';
import type { GamepadInput } from '../src/native';

const event = (control: string, overrides: Partial<GamepadInput> = {}): GamepadInput => ({
  controller: 0,
  control,
  pressed: true,
  value: 1,
  x: 0,
  y: 0,
  ...overrides,
});

it('ABXY、肩键、扳机与十字键通过模型映射到统一动作', () => {
  const expected = {
    a: 'keyboard_left',
    b: 'keyboard_right',
    x: 'left',
    y: 'right',
    lb: 'keyboard_left',
    rb: 'keyboard_right',
    lt: 'left',
    rt: 'right',
    dpad_up: 'enter',
    dpad_down: 'backspace',
    dpad_left: 'keyboard_left',
    dpad_right: 'keyboard_right',
  };
  for (const [control, signal] of Object.entries(expected)) {
    expect(mapGamepadInput(event(control), model.gamepad_bindings)?.signal).toBe(signal);
  }
  expect(mapGamepadInput(event('a', { pressed: false }), model.gamepad_bindings)).toBeNull();
  expect(mapGamepadInput(event('unknown'), model.gamepad_bindings)).toBeNull();
});

it('左右摇杆可驱动视线，Y 轴变换且限幅，回中可恢复', () => {
  expect(mapGamepadInput(event('left_stick', { x: 2, y: 0.5 }), model.gamepad_bindings)).toEqual({
    signal: 'move',
    x: 1,
    y: -0.5,
  });
  expect(mapGamepadInput(event('right_stick', { pressed: false }), model.gamepad_bindings)).toEqual(
    { signal: 'move', x: 0, y: 0 },
  );
});
