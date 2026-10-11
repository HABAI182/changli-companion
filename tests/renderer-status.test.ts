import { expect, it, vi } from 'vitest';
import { model } from '../src/model';
import { rendererDiagnostics } from '../src/renderer/RendererHost';
import { recordLive2DStatus } from '../src/renderer/live2d/runtimeStatus';

it('模型已配置但加载失败时报告回退，只有真实 ready 才报告 Live2D', () => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    setItem: (key: string, value: string) => values.set(key, value),
    getItem: (key: string) => values.get(key) ?? null,
  });
  try {
    recordLive2DStatus(model.renderer.live2d.entry, 'loading');
    expect(rendererDiagnostics().actual).toBe('sprite');
    recordLive2DStatus(model.renderer.live2d.entry, 'error', '贴图加载失败');
    expect(rendererDiagnostics()).toMatchObject({
      actual: 'sprite',
      live2d: 'Live2D 加载失败：贴图加载失败',
    });
    recordLive2DStatus(model.renderer.live2d.entry, 'ready');
    expect(rendererDiagnostics().actual).toBe('live2d');
    expect(rendererDiagnostics('layered2d').actual).toBe('sprite');
  } finally {
    vi.unstubAllGlobals();
  }
});
