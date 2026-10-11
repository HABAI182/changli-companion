import { expect, it } from 'vitest';
import { PresentationRuntime, blinkClosure, handAction } from '../src/pet/presentation';
const settings = {
  motion: 'full' as const,
  inputMode: 'keyboard_mouse' as const,
  autoSleepMinutes: 0 as const,
};
it('摸头短暂开心闭眼，重复触摸延长反应，结束后恢复默认', () => {
  const pet = new PresentationRuntime(0, () => .5);
  pet.input('pet', 100);
  expect(pet.snapshot(101, settings).expression).toBe('smile');
  pet.input('pet', 600);
  expect(pet.snapshot(1001, settings).expression).toBe('smile');
  expect(pet.snapshot(1500, settings).expression).toBe('default');
  pet.input('keyboard_left', 1600);
  expect(pet.snapshot(1601, settings).expression).toBe('default');
  pet.expression('sleepy', 'toggle', true, 1700);
  pet.expression('default', 'toggle', true, 1800);
  pet.input('pet', 1900);
  expect(pet.snapshot(1901, settings).expression).toBe('smile');
});
it('摸头不覆盖手动保持的表情，主动换表情立即取消触摸反应', () => {
  const pet = new PresentationRuntime(0, () => .5);
  pet.expression('surprised', 'hold', true, 50);
  pet.input('pet', 100);
  expect(pet.snapshot(101, settings).expression).toBe('surprised');
  pet.expression('surprised', 'hold', false, 200);
  expect(pet.snapshot(201, settings).expression).toBe('default');
  pet.input('pet', 300);
  pet.expression('sleepy', 'toggle', true, 400);
  expect(pet.snapshot(401, settings).expression).toBe('sleepy');
  expect(pet.snapshot(1500, settings).expression).toBe('sleepy');
});
it('视线逐渐跟随目标，停住鼠标不回弹，帧率不会改变速度', () => {
  const pet = new PresentationRuntime(0, () => 0.5);
  pet.input('move', 100, 1, -1);
  expect(pet.snapshot(100, settings).idle.gazeX).toBe(0);
  expect(pet.snapshot(185, settings).idle.gazeX).toBeCloseTo(1 - Math.exp(-1));
  const coarse = pet.snapshot(355, settings).idle;
  expect(coarse.gazeX).toBeGreaterThan(0.95);
  expect(coarse.gazeY).toBeLessThan(-0.95);
  const fine = new PresentationRuntime(0, () => 0.5);
  fine.input('move', 100, 1, -1);
  for (let t = 105; t <= 355; t += 5) fine.snapshot(t, settings);
  expect(fine.snapshot(355, settings).idle.gazeX).toBeCloseTo(coarse.gazeX, 10);
  expect(pet.snapshot(1500, settings).idle.gazeX).toBeCloseTo(1);
  pet.input('move', 1500, 0, 0);
  expect(pet.snapshot(1755, settings).idle.gazeX).toBeLessThan(0.05);
  expect(pet.snapshot(1755, { ...settings, motion: 'off' }).idle.gazeX).toBe(0);
});
it('输入动作与持续表情可组合，完整动画结束恢复当前表情', () => {
  const pet = new PresentationRuntime(0, () => 0.5);
  pet.expression('smile', 'toggle', true);
  pet.input('keyboard_left', 10);
  expect(pet.snapshot(20, settings).action?.id).toBe('keyboard_left');
  expect(pet.snapshot(20, settings).expression).toBe('smile');
  expect(pet.play('wave', 30)).toBe(true);
  expect(pet.snapshot(40, settings).animation?.id).toBe('wave');
  pet.input('keyboard_right', 50);
  expect(pet.snapshot(60, settings).action).toBeNull();
  expect(pet.snapshot(1830, settings).animation).toBeNull();
  expect(pet.snapshot(1830, settings).expression).toBe('smile');
});
it('hold 松开恢复，toggle 再按关闭', () => {
  const pet = new PresentationRuntime(0);
  pet.expression('angry', 'hold', true);
  expect(pet.snapshot(0, settings).expression).toBe('angry');
  pet.expression('angry', 'hold', false);
  expect(pet.snapshot(1, settings).expression).toBe('default');
  pet.expression('smile', 'toggle', true);
  pet.expression('smile', 'toggle', true);
  expect(pet.snapshot(2, settings).expression).toBe('default');
});
it('纯键盘屏蔽鼠标手，快速输入保留键区，不自动改成双手，睡眠可被新键唤醒', () => {
  const pet = new PresentationRuntime(0);
  pet.input('left', 100, 0, 0, 'keyboard_only');
  expect(pet.snapshot(100, { ...settings, inputMode: 'keyboard_only' }).action).toBeNull();
  for (let n = 0; n < 6; n++) pet.input(n % 2 ? 'keyboard_left' : 'keyboard_right', 200 + n * 40);
  expect(pet.snapshot(420, settings).action?.id).toBe('keyboard_left');
  expect(pet.snapshot(300500, settings).base).toBe('keyboard_mouse');
  const sleep = { ...settings, autoSleepMinutes: 5 as const };
  expect(pet.snapshot(300500, sleep).base).toBe('sleep');
  pet.input('keyboard_left', 300501);
  expect(pet.snapshot(300502, sleep).base).toBe('keyboard_mouse');
});
it('两种模式的所有键盘区域共用键盘手，鼠标保持独立动作', () => {
  expect(handAction('keyboard_left', 'keyboard_mouse')).toBe('keyboard_right');
  expect(handAction('keyboard_right', 'keyboard_mouse')).toBe('keyboard_right');
  expect(handAction('space', 'keyboard_mouse')).toBe('keyboard_right');
  expect(handAction('mouse_left', 'keyboard_mouse')).toBe('mouse_left');
  expect(handAction('keyboard_left', 'keyboard_only')).toBe('keyboard_right');
  expect(handAction('keyboard_right', 'keyboard_only')).toBe('keyboard_right');
});
it('同一键盘手左右移动与空格回中，鼠标独立归位，气泡关闭时不会空口说话', () => {
  const pet = new PresentationRuntime(0, () => .5);
  pet.input('keyboard_left', 100);
  expect(pet.snapshot(200, settings).idle.keyboardReach).toBeLessThan(-.8);
  pet.input('keyboard_right', 220);
  expect(pet.snapshot(320, settings).idle.keyboardReach).toBeGreaterThan(.7);
  pet.input('space', 400);
  expect(Math.abs(pet.snapshot(600, settings).idle.keyboardReach!)).toBeLessThan(.02);
  pet.snapshot(1000, settings);
  expect(Math.abs(pet.snapshot(1800, settings).idle.keyboardReach!)).toBeLessThan(.001);
  pet.input('move', 2000, 1, -1);
  expect(pet.snapshot(2200, settings).idle.mouseHandX).toBeGreaterThan(.5);
  pet.snapshot(3000, settings);
  expect(pet.snapshot(3800, settings).idle.mouseHandX).toBeLessThan(.001);
  pet.react('head', 4000);
  expect(pet.snapshot(4100, { ...settings, bubblesEnabled: false }).mouthOpen).toBe(0);
});
it('眨眼完整闭合并短暂停留，睁眼比闭眼慢，30/60/144帧率不会改变相位', () => {
  expect(blinkClosure(0)).toBe(0);
  for (const t of [80, 96, 114]) expect(blinkClosure(t)).toBe(1);
  expect(blinkClosure(260)).toBe(0);
  expect(blinkClosure(40)).toBeLessThan(0.4);
  expect(blinkClosure(187.5)).toBeLessThan(0.4);
  // Do not dwell in the native outline's short crossfade during reopening.
  expect(1 - blinkClosure(118.3)).toBeGreaterThan(0.035);
  const closing = Array.from({ length: 81 }, (_, t) => blinkClosure(t));
  const opening = Array.from({ length: 146 }, (_, t) => blinkClosure(115 + t));
  expect(closing.every((v, i) => i === 0 || v >= closing[i - 1])).toBe(true);
  expect(opening.every((v, i) => i === 0 || v <= opening[i - 1])).toBe(true);
  for (const fps of [30, 60, 144]) {
    const pet = new PresentationRuntime(0, () => 0);
    let peak = 0;
    for (let t = 3900; t <= 4300; t += 1000 / fps) peak = Math.max(peak, pet.snapshot(t, settings).idle.blink);
    expect(peak).toBe(1);
    expect(pet.snapshot(4300, settings).idle.blink).toBe(0);
  }
  const low = new PresentationRuntime(0, () => 0);
  expect(low.snapshot(4090, { ...settings, motion: 'low' }).idle.blink).toBe(1);
});
it('眨眼按实例起点计时，长时间挂起不会补播，睡眠和关闭动作时不眨眼', () => {
  const pet = new PresentationRuntime(100000, () => 0);
  expect(pet.snapshot(104090, settings).idle.blink).toBe(1);
  expect(pet.snapshot(104260, settings).idle.blink).toBe(0);
  expect(pet.snapshot(400000, settings).idle.blink).toBe(0);
  expect(pet.snapshot(800000, { ...settings, autoSleepMinutes: 5 }).idle.blink).toBe(0);
});
it('idle 使用真实时间且 motion off 归零，随机周期可注入', () => {
  const pet = new PresentationRuntime(0, () => 0);
  expect(pet.snapshot(4090, settings).idle.blink).toBeGreaterThan(0);
  const off = pet.snapshot(4090, { ...settings, motion: 'off' });
  expect(off.idle.blink).toBe(0);
  expect(off.idle.hairSway).toBe(0);
});
it('空闲短动作有冷却，输入后退出并重新计时', () => {
  const pet = new PresentationRuntime(0, () => 0.5);
  expect(pet.snapshot(11999, settings).ambient).toBe('none');
  expect(pet.snapshot(12000, settings).ambient).toBe('nod');
  expect(pet.snapshot(14101, settings).ambient).toBe('none');
  pet.input('keyboard_left', 20000);
  expect(pet.snapshot(20001, settings).ambient).toBe('none');
  expect(pet.snapshot(24000, settings).ambient).toBe('none');
});
it('点击气泡、拖动回弹和超时清理互不污染输入历史', () => {
  const pet = new PresentationRuntime(0);
  expect(pet.setSpeech('在呢。', 100)).toBe(true);
  expect(pet.snapshot(200, settings).mouthOpen).toBeGreaterThan(0);
  expect(pet.setSpeech('连续点击', 200)).toBe(false);
  pet.setDragState(true, 300);
  expect(pet.snapshot(301, settings).drag).toBe('dragging');
  pet.setDragState(false, 400);
  expect(pet.snapshot(401, settings).drag).toBe('release');
  expect(pet.snapshot(921, settings).drag).toBe('idle');
  expect(pet.snapshot(2000, settings).bubble).toBeNull();
  expect(pet.snapshot(2000, settings).mouthOpen).toBe(0);
});
