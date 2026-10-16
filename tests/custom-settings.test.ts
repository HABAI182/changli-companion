import { expect, it } from 'vitest';
import { initialData, parseData } from '../src/domain';
import { PresentationRuntime } from '../src/pet/presentation';

it('keeps legacy preferences while filling new settings', () => {
  const old = { ...initialData(), settings: { scale: 1.31, topmost: false } };
  const data = parseData(JSON.stringify(old));
  expect(data.settings.scale).toBe(1.31);
  expect(data.settings.topmost).toBe(false);
  expect(data.settings.settingsTheme).toBe('system');
  expect(data.settings.keyboardMotionScale).toBe(1);
  expect(data.settings.settingsTextScale).toBe(1);
});

it('persists the settings text size independently of the desktop-pet size', () => {
  const data = initialData();
  data.settings.settingsTextScale = 1.25;
  data.settings.scale = 0.75;
  const saved = parseData(JSON.stringify(data));
  expect(saved.settings.settingsTextScale).toBe(1.25);
  expect(saved.settings.scale).toBe(0.75);
});

it('keeps the pet visible in full-screen apps by default but preserves a chosen hide setting', () => {
  expect(initialData().settings.fullscreenHideEnabled).toBe(false);
  const optedIn = initialData();
  optedIn.settings.fullscreenHideEnabled = true;
  expect(parseData(JSON.stringify(optedIn)).settings.fullscreenHideEnabled).toBe(true);
});

it('changes reach distance without swapping hands and disables mouse following independently', () => {
  const settings = initialData().settings;
  const render = (
    keyboardMotionScale: number,
    mouseMotionScale: number,
    cursorFollowEnabled: boolean,
  ) => {
    const pet = new PresentationRuntime(0, () => 0.5);
    pet.input('move', 1000, 0.8, -0.4);
    pet.snapshot(1060, settings);
    pet.input('keyboard_right', 1100, 0, -1);
    return pet.snapshot(1180, {
      ...settings,
      keyboardMotionScale,
      mouseMotionScale,
      cursorFollowEnabled,
      headElasticity: 0,
    });
  };
  const full = render(1, 1, true),
    half = render(0.5, 0, false);
  expect(half.idle.keyboardReach).toBeCloseTo(full.idle.keyboardReach! * 0.5);
  expect(half.idle.keyboardDepth).toBeCloseTo(full.idle.keyboardDepth! * 0.5);
  expect(half.action?.id).toBe('keyboard_right');
  expect(half.idle.mouseHandX).toBe(0);
  expect(half.idle.gazeX).toBe(0);
  expect(half.idle.headShape).toBe(0);
});

it('uses configured bubble duration and can stop only automatic idle speech', () => {
  const settings = {
    ...initialData().settings,
    bubbleDurationSeconds: 8,
    bubbleIdleIntervalSeconds: 0 as const,
  };
  const pet = new PresentationRuntime(0, () => 0.5);
  expect(pet.snapshot(120000, settings).bubble).toBeNull();
  pet.react('head', 121000);
  expect(pet.snapshot(128900, settings).bubble).not.toBeNull();
  expect(pet.snapshot(129001, settings).bubble).toBeNull();
});

it('returns gaze smoothly after mouse inactivity even while keyboard input continues', () => {
  const settings = { ...initialData().settings, gazeIdleSeconds: 1, headElasticity: 0 };
  const pet = new PresentationRuntime(0, () => 0.5);
  pet.input('move', 100, 1, -0.8);
  expect(pet.snapshot(1099, settings).idle.gazeX).toBeGreaterThan(0.99);
  pet.input('keyboard_left', 1150);
  const during = pet.snapshot(1420, settings).idle;
  expect(during.gazeX).toBeCloseTo(Math.exp(-1), 3);
  expect(during.gazeY).toBeCloseTo(-0.8 * Math.exp(-1), 3);
  expect(pet.snapshot(2700, settings).idle.gazeX).toBeLessThan(0.01);
  pet.input('move', 2800, -1, 0);
  const resumed = pet.snapshot(2885, settings).idle.gazeX;
  expect(resumed).toBeLessThan(-0.6);
  expect(resumed).toBeGreaterThan(-0.7);
});

it('can keep watching indefinitely and persists the recenter delay without resetting older choices', () => {
  const data = initialData();
  data.settings.gazeRecenterEnabled = false;
  data.settings.gazeIdleSeconds = 7;
  const saved = parseData(JSON.stringify(data));
  expect(saved.settings.gazeRecenterEnabled).toBe(false);
  expect(saved.settings.gazeIdleSeconds).toBe(7);
  const pet = new PresentationRuntime(0, () => 0.5);
  pet.snapshot(0, saved.settings);
  pet.input('move', 100, 0.8, 0.2);
  expect(pet.snapshot(8000, saved.settings).idle.gazeX).toBeCloseTo(0.8);
});
