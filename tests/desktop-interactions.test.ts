import { expect, it } from 'vitest';
import { handDrawOrder } from '../src/renderer/live2d/HandDrawOrder';
import { PresentationRuntime } from '../src/pet/presentation';
import { ElasticSpring } from '../src/pet/ElasticSpring';
import { contourMesh } from '../src/renderer/live2d/ContourMesh';
const settings = {motion: 'full', inputMode: 'keyboard_mouse', autoSleepMinutes: 0} as const;
it('移动到胸部区域的两只手均在胸部前，其他图层顺序保持不变', () => {
  const ids = ['hair', 'keyboard', 'mouseHand', 'keyHand', 'chest', 'face'];
  const order = handDrawOrder(ids, [5, 0, 1, 2, 3, 4], {ids: ['mouseHand', 'keyHand'], after: 'chest'});
  expect(order.map(i => ids[i])).toEqual(['keyboard', 'chest', 'mouseHand', 'keyHand', 'face', 'hair']);
});
it('拖动清除按压，改为大头弹性回摆，快速移动惊动凤凰', () => {
  const pet = new PresentationRuntime(0, () => .5);
  pet.input('keyboard_left', 50);
  pet.snapshot(100, settings);
  pet.setDragState(true, 110);
  pet.dragMove(80, 10, 125);
  pet.input('left', 130);
  const lifted = pet.snapshot(250, settings);
  expect(lifted.action).toBeNull();
  expect('handLift' in lifted.idle).toBe(false);
  expect(Math.abs(lifted.idle.headShape!)).toBeGreaterThan(.05);
  expect(lifted.phoenix).toBe('ruffled');
  pet.setDragState(false, 300);
  expect(pet.snapshot(360, settings).idle.headY).not.toBe(0);
  const rest = pet.snapshot(2000, settings);
  expect(Math.abs(rest.idle.headShape!)).toBeLessThan(.2);
  expect(rest.idle.keyboardReach).toBeCloseTo(0);
});
it('删除倾手/滚轮手部变体，关闭动态停止大头与凤凰动态', () => {
  const a = new PresentationRuntime(0);
  a.input('right', 100);
  expect('mouseTilt' in a.snapshot(200, settings).idle).toBe(false);
  a.setDragState(true, 400);
  const off = a.snapshot(500, {...settings, motion: 'off'});
  expect(off.idle.headShape).toBe(0);
  expect(off.idle.dragSway).toBe(0);
  expect(off.idle.phoenixWing).toBe(0);
  expect(off.idle.flameStrength).toBe(0);
});
it('弹簧保留惯性、越过目标后收敛；长时间挂起不会补播抖动', () => {
  const spring = new ElasticSpring();
  let max=0;
  for(let i=0;i<120;i++)max=Math.max(max,spring.step(16,.5));
  expect(max).toBeGreaterThan(.52);
  expect(spring.value).toBeCloseTo(.5,2);
  spring.kick(10);spring.step(16,0);
  expect(spring.velocity).toBeGreaterThan(0);
  expect(spring.step(500,0)).toBe(0);
  expect(spring.velocity).toBe(0);
});
it('UV轮廓裁切去掉上缘残片，保留原贴图采样并生成非退化三角形', () => {
  const g=contourMesh(new Float32Array([1,1,0,1,1,0,0,0]),new Float32Array([1,1,0,1,1,0,0,0]),new Uint16Array([2,0,1,1,3,2]),[[0,.3],[.5,.1],[1,.3],[1,1],[0,1]]);
  expect(g.indices.length).toBeGreaterThan(6);
  expect(Math.max(...g.positions.filter((_,i)=>i%2===1))).toBeLessThanOrEqual(.90001);
  expect(g.positions).toEqual(g.uvs);
});
