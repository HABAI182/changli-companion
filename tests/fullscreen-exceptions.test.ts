import { expect, test } from 'vitest';
import { validFullscreenExceptions } from '../src/settings/fullscreenExceptions';

test('macOS accepts app bundles and exact bundle identifiers, rejects paths', () => {
  expect(validFullscreenExceptions(['Safari.app', 'com.apple.Safari', 'My Game.app'], true)).toBe(
    true,
  );
  expect(validFullscreenExceptions(['/Applications/Safari.app'], true)).toBe(false);
  expect(validFullscreenExceptions(['Safari'], true)).toBe(false);
  expect(validFullscreenExceptions(['com.apple.*'], true)).toBe(false);
  expect(validFullscreenExceptions(Array(33).fill('Safari.app'), true)).toBe(false);
});
test('Windows retains executable exception validation', () => {
  expect(validFullscreenExceptions(['game.exe', 'Player.EXE'], false)).toBe(true);
  expect(validFullscreenExceptions(['Safari.app', 'com.apple.Safari'], false)).toBe(false);
  expect(validFullscreenExceptions(['C:\\game.exe'], false)).toBe(false);
});
