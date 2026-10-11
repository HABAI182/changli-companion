import { expect, it } from 'vitest';
import { handDrawOrder } from '../src/renderer/live2d/HandDrawOrder';
import { PresentationRuntime } from '../src/pet/presentation';
const settings = {motion: 'full', inputMode: 'keyboard_mouse', autoSleepMinutes: 0} as const;
it('移动到胸部区域的两只手均在胸部前，其他图层顺序保持不变', () => {
  const ids = ['hair', 'keyboard', 'mouseHand', 'keyHand', 'chest', 'face'];
  const order = handDrawOrder(ids, [5, 0, 1, 2, 3, 4], {ids: ['mouseHand', 'keyHand'], after: 'chest'});
  expect(order.map(i => ids[i])).toEqual(['keyboard', 'chest', 'mouseHand', 'keyHand', 'face', 'hair']);
});
it('拖动清除按压、抬起双手，快速移动惊动凤凰，放下后完全回中', () => {
  const pet = new PresentationRuntime(0, () => .5);
  pet.input('keyboard_left', 50);
  pet.snapshot(100, settings);
  pet.setDragState(true, 110);
  pet.dragMove(80, 10, 125);
  pet.input('left', 130);
  const lifted = pet.snapshot(250, settings);
  expect(lifted.action).toBeNull();
  expect(lifted.idle.handLift).toBeGreaterThan(.8);
  expect(lifted.phoenix).toBe('ruffled');
  pet.setDragState(false, 300);
  expect(pet.snapshot(360, settings).idle.landingBounce).not.toBe(0);
  const rest = pet.snapshot(2000, settings);
  expect(rest.idle.handLift).toBeLessThan(.0001);
  expect(rest.idle.landingBounce).toBe(0);
  expect(rest.idle.keyboardReach).toBeCloseTo(0);
});
it('右键和滚轮有独立反馈，方向相反，关闭细分/动态后反馈清零', () => {
  const a = new PresentationRuntime(0), b = new PresentationRuntime(0);
  a.input('right', 100);
  expect(a.snapshot(200, settings).idle.mouseTilt).toBeGreaterThan(.8);
  a.input('wheel', 300, 0, 1); b.input('wheel', 300, 0, -1);
  expect(a.snapshot(340, settings).idle.mouseRoll).toBeCloseTo(-b.snapshot(340, settings).idle.mouseRoll!);
  expect(a.snapshot(350, {...settings, mouseDetailsEnabled: false}).idle.mouseRoll).toBe(0);
  a.setDragState(true, 400);
  const off = a.snapshot(500, {...settings, motion: 'off'});
  expect(off.idle.handLift).toBe(0);
  expect(off.idle.dragSway).toBe(0);
});
