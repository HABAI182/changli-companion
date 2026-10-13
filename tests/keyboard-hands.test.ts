import { expect, it } from 'vitest';
import { KeyboardHands } from '../src/pet/KeyboardHands';
import { PresentationRuntime } from '../src/pet/presentation';
import { initialData } from '../src/domain';
import { nextKeyBadges, KEY_BADGE_MS } from '../src/overlay/keyOverlay';

it('长按默认只浮现一次，开启重复浮现后恢复；松开再按可重新浮现', () => {
  const first = nextKeyBadges({ label: 'W', phase: 'down' }, 100, [], true);
  const held = nextKeyBadges({ label: 'W', phase: 'down', repeat: true }, 200, first, true);
  expect(held).toBe(first);
  expect(held[0].expiresAt).toBe(100 + KEY_BADGE_MS);
  expect(
    nextKeyBadges({ label: 'W', phase: 'down', repeat: true }, 200, first, true, true),
  ).toHaveLength(2);
  expect(
    nextKeyBadges({ label: 'W', phase: 'down', repeat: false }, 300, first, true),
  ).toHaveLength(2);
});

it('两手同时响应各自键区，实体左区在画面右侧、右区在左侧', () => {
  const hands = new KeyboardHands(0);
  hands.input('keyboard_left', 100, -1);
  hands.input('keyboard_right', 110, 1);
  const state = hands.advance(200);
  expect(state.keyboardReach).toBeGreaterThan(0);
  expect(state.rightKeyboardReach).toBeLessThan(0);
  expect(state.keyboardDepth).toBeLessThan(0);
  expect(state.rightKeyboardDepth).toBeGreaterThan(0);
  expect(state.leftKeyboardPress).toBeGreaterThan(0);
  expect(state.rightKeyboardPress).toBeGreaterThan(0);
});
it('键盘优先，交替鼠标事件不能将右手拉回鼠标；空闲后恢复', () => {
  const runtime = new PresentationRuntime(0);
  const settings = initialData().settings;
  runtime.input('keyboard_right', 100);
  runtime.input('move', 150, 1, 1);
  runtime.input('left', 160);
  const busy = runtime.snapshot(200, settings).idle;
  expect(busy.rightKeyboardMix).toBeGreaterThan(0.7);
  expect(busy.mousePress).toBe(0);
  expect(busy.mouseHandX).toBe(0);
  runtime.snapshot(1400, settings);
  runtime.input('move', 1600, 1, 1);
  runtime.input('left', 1610);
  const free = runtime.snapshot(1670, settings).idle;
  expect(free.rightKeyboardMix).toBeLessThan(0.03);
  expect(free.mousePress).toBeGreaterThan(0.5);
  expect(free.mouseHandX).toBeGreaterThan(0);
});
it('速度调节改变移动过程，慢速仍能抵达键区并回位', () => {
  const slow = new KeyboardHands(0),
    fast = new KeyboardHands(0);
  slow.advance(1, 0.5);
  fast.advance(1, 2);
  slow.input('keyboard_right', 100, 0);
  fast.input('keyboard_right', 100, 0);
  expect(fast.advance(180, 2).rightKeyboardMix).toBeGreaterThan(
    slow.advance(180, 0.5).rightKeyboardMix,
  );
  expect(slow.advance(700, 0.5).rightKeyboardMix).toBeGreaterThan(0.95);
  expect(slow.advance(2500, 0.5).rightKeyboardMix).toBeLessThan(0.001);
});
it('多个按键独立过期且有上限，单键模式继续替换', () => {
  let badges = nextKeyBadges({ label: 'Q', phase: 'down' }, 100, [], true);
  badges = nextKeyBadges({ label: 'U', phase: 'down' }, 300, badges, true);
  expect(badges.map((item) => item.label)).toEqual(['Q', 'U']);
  expect(badges[0].expiresAt).toBe(100 + KEY_BADGE_MS);
  for (let i = 0; i < 10; i++)
    badges = nextKeyBadges({ label: 'A', phase: 'down' }, 400 + i, badges, true);
  expect(badges.length).toBe(6);
  expect(
    nextKeyBadges({ label: 'Space', phase: 'down' }, 500, badges, false).map((item) => item.label),
  ).toEqual(['Space']);
  expect(nextKeyBadges({ label: 'L', phase: 'down' }, 3000, badges, true)).toHaveLength(1);
});
