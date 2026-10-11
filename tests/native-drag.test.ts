import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PointerEvent as ReactPointerEvent } from 'react';
const bridge = vi.hoisted(() => ({
  outerPosition: vi.fn(),
  scaleFactor: vi.fn(),
  setPosition: vi.fn(),
}));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => bridge }));
vi.mock('../src/storage', () => ({ native: true }));
import { drag } from '../src/native';

class Handle extends EventTarget {
  captured = false;
  setPointerCapture() {
    this.captured = true;
  }
  hasPointerCapture() {
    return this.captured;
  }
  releasePointerCapture() {
    this.captured = false;
  }
}
function pointer(handle: Handle, button = 0) {
  return {
    currentTarget: handle,
    pointerId: 1,
    button,
    screenX: 200,
    screenY: 300,
    preventDefault: vi.fn(),
  } as unknown as ReactPointerEvent<HTMLElement>;
}
beforeEach(() => {
  vi.clearAllMocks();
  bridge.scaleFactor.mockResolvedValue(1.5);
  bridge.setPosition.mockResolvedValue(undefined);
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

it('快速拖动在原生位置查询返回前松开，仍提交最终位置并清理捕获', async () => {
  let resolve!: (value: { x: number; y: number }) => void;
  bridge.outerPosition.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const handle = new Handle();
  const fail = vi.fn();
  drag(pointer(handle), fail);
  handle.dispatchEvent(
    Object.assign(new Event('pointermove'), { pointerId: 1, screenX: 180, screenY: 280 }),
  );
  handle.dispatchEvent(
    Object.assign(new Event('pointerup'), { pointerId: 1, screenX: 100, screenY: 200 }),
  );
  expect(bridge.setPosition).not.toHaveBeenCalled();
  expect(handle.captured).toBe(false);
  resolve({ x: 1000, y: 1200 });
  await vi.waitFor(() =>
    expect(bridge.setPosition).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ x: 850, y: 1050 }),
    ),
  );
  handle.dispatchEvent(
    Object.assign(new Event('pointermove'), { pointerId: 1, screenX: 0, screenY: 0 }),
  );
  expect(bridge.setPosition).toHaveBeenCalledTimes(1);
  expect(fail).not.toHaveBeenCalled();
});

it('右键不启动窗口拖动或抢占右键菜单', () => {
  const handle = new Handle();
  const event = pointer(handle, 2);
  drag(event, vi.fn());
  expect(handle.captured).toBe(false);
  expect(event.preventDefault).not.toHaveBeenCalled();
  expect(bridge.outerPosition).not.toHaveBeenCalled();
});
