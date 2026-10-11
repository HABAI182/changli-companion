import type { RendererProps } from '../Renderer';
import type { Settings } from '../domain';
import { SpriteRenderer } from '../SpriteRenderer';
import { model } from '../model';
import { ImageLayerRenderer } from './layered/ImageLayerRenderer';
import { canRenderLayers, layerManifest } from './layered/layerManifest';
import { Live2DRenderer } from './live2d/Live2DRenderer';
import { readLive2DStatus } from './live2d/runtimeStatus';

export type RendererChoice = 'sprite' | 'layered' | 'live2d';
export function chooseRenderer(
  preferred: RendererChoice,
  live2dReady: boolean,
  layersReady: boolean,
): RendererChoice {
  if (preferred === 'live2d' && live2dReady) return 'live2d';
  if (preferred !== 'sprite' && layersReady) return 'layered';
  return 'sprite';
}
export function chooseConfiguredRenderer(
  mode: Settings['rendererMode'],
  entry: string | null,
  layersReady: boolean,
): RendererChoice {
  if (mode !== 'layered2d' && entry) return 'live2d';
  return layersReady ? 'layered' : 'sprite';
}
export function rendererDiagnostics(mode: Settings['rendererMode'] = 'auto') {
  const missing = layerManifest.layers.filter((l) => !l.asset).map((l) => l.id);
  const layersReady = canRenderLayers(layerManifest);
  const configured = chooseConfiguredRenderer(mode, model.renderer.live2d.entry, layersReady);
  const runtime = readLive2DStatus();
  const observed = runtime?.entry === model.renderer.live2d.entry ? runtime : null;
  return {
    actual:
      configured === 'live2d' && observed?.status !== 'ready'
        ? layersReady
          ? 'layered'
          : 'sprite'
        : configured,
    live2d: !model.renderer.live2d.entry
      ? '缺少长离 Cubism 模型资源'
      : observed?.status === 'ready'
        ? '真实 Cubism 模型已加载'
        : observed?.status === 'error'
          ? `Live2D 加载失败：${observed.error}`
          : observed?.status === 'loading'
            ? 'Cubism 模型加载中，当前显示回退预览'
            : 'Cubism 尚未完成运行验证，当前显示回退预览',
    layers: missing.length ? `缺少 ${missing.length} 个分层素材` : '分层资源已配置',
  };
}
export function RendererHost(props: RendererProps) {
  const mode = chooseConfiguredRenderer(
    props.settings.rendererMode,
    model.renderer.live2d.entry,
    canRenderLayers(layerManifest),
  );
  if (mode === 'live2d') return <Live2DRenderer {...props} />;
  return mode === 'layered' ? <ImageLayerRenderer {...props} /> : <SpriteRenderer {...props} />;
}
