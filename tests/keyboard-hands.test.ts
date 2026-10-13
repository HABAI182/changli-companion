import { expect, it } from 'vitest';
import { KeyboardHands } from '../src/pet/KeyboardHands';
import { PresentationRuntime } from '../src/pet/presentation';
import { initialData } from '../src/domain';
import { nextKeyBadges, KEY_BADGE_MS } from '../src/overlay/keyOverlay';

it('长按保持落键，自动重复不抖动，松开后平滑回位', () => {
  const hands = new KeyboardHands(0);
  hands.input('keyboard_left', 100, -1, { label: 'W', phase: 'down' });
  let previous = hands.advance(500).leftKeyboardPress;
  for (let now = 600; now <= 2600; now += 75) {
    hands.input('keyboard_left', now, -1, { label: 'W', phase: 'down', repeat: true });
    const state = hands.advance(now);
    expect(state.leftKeyboardPress).toBeGreaterThan(0.99);
    expect(Math.abs(state.leftKeyboardPress - previous)).toBeLessThan(0.001);
    expect(state.keyboardLanding).toBeGreaterThan(0.99);
    previous = state.leftKeyboardPress;
  }
  hands.input('keyboard_left', 2700, -1, { label: 'W', phase: 'up' });
  const released = hands.advance(3000);
  expect(released.leftKeyboardPress).toBeLessThan(0.001);
  expect(released.keyboardLanding).toBeLessThan(0.02);
  hands.input('keyboard_left', 3100, -1, { label: 'W', phase: 'down' });
  expect(hands.advance(3200).leftKeyboardPress).toBeGreaterThan(0.9);
});

it('同一只手按住两个键，松开一个仍保持另一个键区', () => {
  const hands = new KeyboardHands(0);
  hands.input('keyboard_left', 100, -1, { label: 'W', phase: 'down' });
  hands.input('space', 200, 1, { label: 'Space', phase: 'down' });
  hands.advance(500);
  hands.input('space', 600, 1, { label: 'Space', phase: 'up' });
  const state = hands.advance(1000);
  expect(state.keyboardReach).toBeGreaterThan(0.99);
  expect(state.keyboardDepth).toBeLessThan(-0.99);
  expect(state.leftKeyboardPress).toBeGreaterThan(0.99);
  hands.input('keyboard_left', 1100, -1, { label: 'W', phase: 'up' });
  expect(hands.advance(1500).keyboardLanding).toBeLessThan(0.01);
});

it('系统重复按下只维持手部，不能重启头部弹簧或动作', () => {
  const held = new PresentationRuntime(0);
  const once = new PresentationRuntime(0);
  const settings = initialData().settings;
  for (const runtime of [held, once])
    runtime.input('keyboard_left', 100, 0, -1, 'keyboard_mouse', { label: 'W', phase: 'down' });
  for (let now = 150; now < 1500; now += 50) {
    held.input('keyboard_left', now, 0, -1, 'keyboard_mouse', {
      label: 'W',
      phase: 'down',
      repeat: true,
    });
    const repeated = held.snapshot(now, settings);
    const original = once.snapshot(now, settings);
    expect(repeated.action).toEqual(original.action);
    expect(repeated.idle.headY).toBeCloseTo(original.idle.headY!, 10);
    expect(repeated.idle.headShape).toBeCloseTo(original.idle.headShape!, 10);
  }
});

it('多键浮现上限可设为1～6，并只保留最新按键', () => {
  for (const limit of [1, 3, 6]) {
    let badges: ReturnType<typeof nextKeyBadges> = [];
    for (const [index, label] of ['A', 'B', 'C', 'D', 'E', 'F', 'G'].entries())
      badges = nextKeyBadges({ label, phase: 'down' }, 100 + index, badges, true, false, limit);
    expect(badges).toHaveLength(limit);
    expect(badges.at(-1)?.label).toBe('G');
  }
});

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

// macOS distinguishes main Return / keypad Enter by hardware code even when
// the physical labels coincide. Releasing either must preserve the other hold.
it('macOS 同名物理键分别释放，Cmd 和 Fn 可浮显', () => {
  const hands = new KeyboardHands(0);
  hands.input('enter', 100, 1, { label: 'Enter', phase: 'down', code: 36 });
  hands.input('enter', 200, 1, { label: 'Enter', phase: 'down', code: 76 });
  hands.input('enter', 300, 1, { label: 'Enter', phase: 'up', code: 36 });
  expect(hands.advance(800).rightKeyboardPress).toBeGreaterThan(0.99);
  hands.input('enter', 900, 1, { label: 'Enter', phase: 'up', code: 76 });
  expect(hands.advance(1400).rightKeyboardPress).toBeLessThan(0.001);
  for (const label of ['Cmd', 'Fn', 'Clear', '+', '*']) {
    expect(nextKeyBadges({ label, phase: 'down' }, 100, [], false)[0].label).toBe(label);
  }
});
