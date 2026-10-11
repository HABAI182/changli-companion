import { expect, it, vi } from 'vitest';
import { Live2DAdapter, type Live2DBackend } from '../src/renderer/live2d/Live2DAdapter';
import { PresentationRuntime } from '../src/pet/presentation';
import type { RenderSnapshot } from '../src/pet/presentation';
import { mapGamepadInput } from '../src/pet/gamepad';

it('真实 Live2D 参数收到平滑的空闲歪头，输入后回正且停用动作时归零', async () => {
  const values: Record<string, number> = {};
  const backend: Live2DBackend = {
    load: async () => {},
    setParameter: (id, value) => {
      values[id] = value;
    },
    startMotion: () => {},
    setExpression: () => {},
    resize: () => {},
    dispose: () => {},
  };
  const adapter = new Live2DAdapter(
    {
      entry: 'real.model3.json',
      parameterMap: { 'head.z': 'ParamAngleZ', 'eye.x': 'ParamEyeBallX' },
      motionMap: {},
      expressionMap: {},
    },
    backend,
  );
  await adapter.init({} as HTMLCanvasElement);
  const pet = new PresentationRuntime(0, () => 0.8);
  const settings = { motion: 'full', inputMode: 'keyboard_mouse', autoSleepMinutes: 0 } as const;
  adapter.update(pet.snapshot(13800, settings));
  expect(values.ParamAngleZ).toBe(0);
  let previous = 0,
    maxStep = 0;
  for (let t = 13816; t <= 14840; t += 16) {
    adapter.update(pet.snapshot(t, settings));
    maxStep = Math.max(maxStep, Math.abs(values.ParamAngleZ - previous));
    previous = values.ParamAngleZ;
  }
  expect(values.ParamAngleZ).toBeGreaterThan(9);
  expect(maxStep).toBeLessThan(0.4);
  pet.input('move', 14840, -1, 0);
  adapter.update(pet.snapshot(14856, settings));
  expect(values.ParamAngleZ).toBeGreaterThan(0);
  adapter.update(pet.snapshot(15700, settings));
  expect(values.ParamAngleZ).toBeLessThan(0.01);
  expect(values.ParamEyeBallX).toBeLessThan(-0.99);
  adapter.update(pet.snapshot(15701, { ...settings, motion: 'off' }));
  expect(values.ParamAngleZ).toBe(0);
  expect(values.ParamEyeBallX).toBe(0);
});

it('未制作的表情会释放此前笑脸，并且中性别名不会反复重启淡入', async () => {
  const backend: Live2DBackend = {
    load: vi.fn().mockResolvedValue(undefined),
    setParameter: vi.fn(),
    startMotion: vi.fn(),
    setExpression: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  };
  const adapter = new Live2DAdapter(
    {
      entry: 'live/Changli.model3.json',
      parameterMap: {},
      motionMap: {},
      expressionMap: { default: 'Neutral', smile: 'Smile', serious: 'Neutral' },
    },
    backend,
  );
  await adapter.init({} as HTMLCanvasElement);
  const pet = new PresentationRuntime(0, () => 0);
  const settings = { motion: 'full', inputMode: 'keyboard_mouse', autoSleepMinutes: 0 } as const;
  pet.expression('smile', 'toggle', true, 100);
  adapter.update(pet.snapshot(110, settings));
  pet.expression('think', 'toggle', true, 120);
  adapter.update(pet.snapshot(130, settings));
  expect(backend.setExpression).toHaveBeenNthCalledWith(1, 'Smile');
  expect(backend.setExpression).toHaveBeenNthCalledWith(2, 'Neutral');
  pet.expression('serious', 'toggle', true, 140);
  adapter.update(pet.snapshot(150, settings));
  pet.expression('default', 'toggle', true, 160);
  adapter.update(pet.snapshot(170, settings));
  expect(backend.setExpression).toHaveBeenCalledTimes(2);
  pet.expression('smile', 'toggle', true, 180);
  adapter.update(pet.snapshot(190, settings));
  expect(backend.setExpression).toHaveBeenLastCalledWith('Smile');
  expect(backend.setExpression).toHaveBeenCalledTimes(3);
  adapter.dispose();
});

it('屏幕下视和 XInput 上视在 Cubism 中保持正确纵向方向并能回正', async () => {
  const backend: Live2DBackend = {
    load: vi.fn().mockResolvedValue(undefined),
    setParameter: vi.fn(),
    startMotion: vi.fn(),
    setExpression: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  };
  const adapter = new Live2DAdapter(
    {
      entry: 'live/Changli.model3.json',
      parameterMap: {
        'eye.x': 'ParamEyeBallX',
        'eye.y': 'ParamEyeBallY',
        gazeY: 'LegacyEyeBallY',
        'head.y': 'ParamAngleY',
      },
      motionMap: {},
      expressionMap: {},
    },
    backend,
  );
  await adapter.init({} as HTMLCanvasElement);
  const pet = new PresentationRuntime(0, () => 0);
  const snapshot = pet.snapshot(200, {
    motion: 'full',
    inputMode: 'keyboard_mouse',
    autoSleepMinutes: 0,
  });
  snapshot.idle.gazeX = 0.5;
  snapshot.idle.gazeY = 0.75;
  adapter.update(snapshot);
  expect(backend.setParameter).toHaveBeenCalledWith('ParamEyeBallX', 0.5);
  expect(backend.setParameter).toHaveBeenCalledWith('ParamEyeBallY', -0.75);
  expect(backend.setParameter).toHaveBeenCalledWith('LegacyEyeBallY', -0.75);
  expect(backend.setParameter).toHaveBeenCalledWith('ParamAngleY', -4.5);
  const up = mapGamepadInput(
    { controller: 0, control: 'left_stick', x: 0, y: 0.8, pressed: true, value: 1 },
    { left_stick: 'move' },
  );
  expect(up?.y).toBe(-0.8);
  snapshot.idle.gazeY = up!.y;
  adapter.update(snapshot);
  expect(backend.setParameter).toHaveBeenCalledWith('ParamEyeBallY', 0.8);
  snapshot.idle.gazeY = 0;
  adapter.update(snapshot);
  expect(vi.mocked(backend.setParameter).mock.calls.filter(([id]) => id === 'ParamAngleY').at(-1)).toEqual(['ParamAngleY', 0]);
  adapter.dispose();
});

it('连续同侧输入会重新按压，未绑定的动画不会吞掉输入动作', async () => {
  const backend: Live2DBackend = {
    load: vi.fn().mockResolvedValue(undefined),
    setParameter: vi.fn(),
    startMotion: vi.fn(),
    setExpression: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  };
  const adapter = new Live2DAdapter(
    {
      entry: 'live/Changli.model3.json',
      parameterMap: {},
      motionMap: { keyboard_left: 'LeftPress/0', keyboard_right: 'RightPress/0' },
      expressionMap: {},
    },
    backend,
  );
  await adapter.init({} as HTMLCanvasElement);
  const pet = new PresentationRuntime(0, () => 0);
  pet.input('keyboard_left', 100);
  const snapshot = pet.snapshot(110, {
    motion: 'full',
    inputMode: 'keyboard_mouse',
    autoSleepMinutes: 0,
  });
  adapter.update(snapshot);
  adapter.update(snapshot);
  expect(backend.startMotion).toHaveBeenCalledTimes(1);
  pet.input('keyboard_left', 140);
  const next: RenderSnapshot = pet.snapshot(150, {
    motion: 'full',
    inputMode: 'keyboard_mouse',
    autoSleepMinutes: 0,
  });
  next.animation = {
    id: 'unauthored',
    startedAt: 120,
    until: 900,
    priority: 1,
    status: 'awaiting-art',
  };
  adapter.update(next);
  expect(backend.startMotion).toHaveBeenCalledTimes(2);
  expect(backend.startMotion).toHaveBeenLastCalledWith('RightPress/0');
  adapter.dispose();
});
it('鼠标后交替键区仍只触发同一键盘手，帧基值清掉旧手压力', async () => {
  const backend: Live2DBackend = { load: vi.fn().mockResolvedValue(undefined), setParameter: vi.fn(),
    startMotion: vi.fn(), setExpression: vi.fn(), resize: vi.fn(), dispose: vi.fn() };
  const adapter = new Live2DAdapter({ entry: 'real.model3.json',
    parameterMap: { 'hand.left.press': 'ParamHandLeftPress', 'hand.right.press': 'ParamHandRightPress' },
    motionMap: { mouse_left: 'LeftPress/0', keyboard_left: 'LeftPress/0', keyboard_right: 'RightPress/0', space: 'BothPress/0' }, expressionMap: {} }, backend);
  await adapter.init({} as HTMLCanvasElement);
  const pet = new PresentationRuntime(0, () => 0);
  const settings = { motion: 'full', inputMode: 'keyboard_mouse', autoSleepMinutes: 0 } as const;
  pet.input('left', 100);adapter.update(pet.snapshot(101, settings));
  expect(backend.startMotion).toHaveBeenLastCalledWith('LeftPress/0');
  for (let n = 0; n < 12; n++) {
    pet.input(n % 2 ? 'keyboard_right' : 'keyboard_left', 140+n*30);
    adapter.update(pet.snapshot(141+n*30, settings));
    expect(backend.startMotion).toHaveBeenLastCalledWith('RightPress/0');
  }
  pet.input('space', 700);adapter.update(pet.snapshot(701, settings));
  expect(backend.startMotion).toHaveBeenLastCalledWith('RightPress/0');
  expect(backend.setParameter).toHaveBeenCalledWith('ParamHandLeftPress', 0);
  expect(backend.setParameter).toHaveBeenCalledWith('ParamHandRightPress', 0);
  pet.input('keyboard_left', 900, 0, 0, 'keyboard_only');
  adapter.update(pet.snapshot(901, { ...settings, inputMode: 'keyboard_only' }));
  expect(backend.startMotion).toHaveBeenLastCalledWith('RightPress/0');
});
it('缺失真正的模型资源或运行时会回退，不会宣称 ready', async () => {
  const missing = new Live2DAdapter({
    entry: null,
    parameterMap: {},
    motionMap: {},
    expressionMap: {},
  });
  expect(await missing.init({} as HTMLCanvasElement)).toBe('missing-model');
  const noRuntime = new Live2DAdapter({
    entry: 'real.model3.json',
    parameterMap: {},
    motionMap: {},
    expressionMap: {},
  });
  expect(await noRuntime.init({} as HTMLCanvasElement)).toBe('missing-runtime');
});
it('有模型和后端时才加载，语义参数来自 manifest 并能释放', async () => {
  const backend: Live2DBackend = {
    load: vi.fn().mockResolvedValue(undefined),
    setParameter: vi.fn(),
    startMotion: vi.fn(),
    setExpression: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  };
  const adapter = new Live2DAdapter(
    {
      entry: 'live/Changli.model3.json',
      parameterMap: {
        gazeX: 'ActualGazeX',
        breathe: 'ActualBreath',
        'mouth.open': 'ActualMouthOpen',
        'eye.left.open': 'ActualEyeLeft',
      },
      motionMap: { shy: 'ActualShy' },
      expressionMap: { shy: 'ActualShyFace' },
    },
    backend,
  );
  expect(await adapter.init({} as HTMLCanvasElement)).toBe('ready');
  const pet = new PresentationRuntime(0, () => 0);
  pet.expression('smile', 'toggle', true);
  pet.play('shy', 100);
  adapter.update(
    pet.snapshot(200, { motion: 'full', inputMode: 'keyboard_mouse', autoSleepMinutes: 0 }),
  );
  expect(backend.setParameter).toHaveBeenCalledWith('ActualGazeX', 0);
  expect(backend.setParameter).toHaveBeenCalledWith('ActualEyeLeft', 1);
  expect(backend.setParameter).toHaveBeenCalledWith('ActualMouthOpen', 0);
  expect(backend.startMotion).toHaveBeenCalledWith('ActualShy');
  expect(backend.setExpression).toHaveBeenCalledWith('ActualShyFace');
  adapter.resize(360, 320);
  adapter.dispose();
  expect(backend.dispose).toHaveBeenCalledOnce();
});

it('组件卸载时未完成的模型加载不能再变为 ready', async () => {
  let finishLoad!: () => void;
  const backend: Live2DBackend = {
    load: () => new Promise<void>((resolve) => (finishLoad = resolve)),
    setParameter: vi.fn(),
    startMotion: vi.fn(),
    setExpression: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  };
  const adapter = new Live2DAdapter(
    { entry: 'live/Changli.model3.json', parameterMap: {}, motionMap: {}, expressionMap: {} },
    backend,
  );
  const loading = adapter.init({} as HTMLCanvasElement);
  adapter.dispose();
  finishLoad();
  expect(await loading).toBe('missing-runtime');
  expect(backend.dispose).toHaveBeenCalledOnce();
});

it('模型加载失败时释放已分配资源并保留回退画面', async () => {
  const backend: Live2DBackend = {
    load: vi.fn().mockRejectedValue(new Error('着色器超时')),
    setParameter: vi.fn(),
    startMotion: vi.fn(),
    setExpression: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  };
  const adapter = new Live2DAdapter(
    { entry: 'live/Changli.model3.json', parameterMap: {}, motionMap: {}, expressionMap: {} },
    backend,
  );
  expect(await adapter.init({} as HTMLCanvasElement)).toBe('error');
  expect(adapter.error).toBe('着色器超时');
  adapter.dispose();
  expect(backend.dispose).toHaveBeenCalledOnce();
});
