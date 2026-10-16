import { expect, it } from 'vitest';
import { packAlphaMask } from '../src/pet/hitMask';

it('keeps transparent holes and bottom padding click-through while packing partial bytes', () => {
  const rgba = new Uint8ClampedArray(12 * 4);
  for (const i of [1, 2, 5, 6]) rgba[i * 4 + 3] = 255;
  rgba[9 * 4 + 3] = 8;
  expect(packAlphaMask(rgba)).toBe('6600');
});
