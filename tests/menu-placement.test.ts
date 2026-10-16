import { expect, it } from 'vitest';
import { menuPlacement } from '../src/pet/menuPlacement';
import { initialData } from '../src/domain';
it('keeps menu beside a central pet, switching left near the right edge', () => {
  const screen = { width: 1920, height: 1080 };
  const right = menuPlacement({ left: 600, top: 700, right: 960, bottom: 1020 }, screen);
  expect(right.left).toBeGreaterThan(960);
  expect(right.top + 380).toBeLessThanOrEqual(1072);
  const left = menuPlacement({ left: 1540, top: 700, right: 1900, bottom: 1020 }, screen);
  expect(left.left + 260).toBeLessThan(1540);
});
it('uses a free vertical region on a narrow screen and enables key badges by default', () => {
  const placed = menuPlacement(
    { left: 50, top: 600, right: 410, bottom: 920 },
    { width: 460, height: 1000 },
  );
  expect(placed.top + 380).toBeLessThan(600);
  expect(initialData().settings.keyOverlayEnabled).toBe(true);
});
