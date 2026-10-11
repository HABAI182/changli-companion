import { expect, it } from 'vitest';
import { layerTransform } from '../src/renderer/layered/layerMotion';
import { PresentationRuntime } from '../src/pet/presentation';

it('分层眼睛可眨眼，头发和饰品独立摆动；关闭动效时回到中位', () => {
  const pet = new PresentationRuntime(0, () => 0);
  pet.input('move', 3300, 1, -1);
  const active = pet.snapshot(4090, {
    motion: 'full',
    inputMode: 'keyboard_mouse',
    autoSleepMinutes: 0,
  });
  const eye = layerTransform('left_eye', active);
  expect(eye).toContain('translate(2.80px, -1.80px)');
  expect(eye).not.toContain('scale(1.000, 1.000)');
  expect(layerTransform('front_hair', active)).not.toBe(layerTransform('ornaments', active));
  const still = pet.snapshot(4090, {
    motion: 'off',
    inputMode: 'keyboard_mouse',
    autoSleepMinutes: 0,
  });
  expect(layerTransform('left_eye', still)).toContain('scale(1.000, 1.000)');
});
