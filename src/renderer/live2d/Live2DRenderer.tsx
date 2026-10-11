import { useEffect, useRef, useState } from 'react';
import type { RendererProps } from '../../Renderer';
import { SpriteRenderer } from '../../SpriteRenderer';
import { ImageLayerRenderer } from '../layered/ImageLayerRenderer';
import { canRenderLayers, layerManifest } from '../layered/layerManifest';
import { model } from '../../model';
import { Live2DAdapter } from './Live2DAdapter';
import { loadCubismCore } from './CoreLoader';
import { recordLive2DStatus } from './runtimeStatus';

export function Live2DRenderer(props: RendererProps) {
  const entry = model.renderer.live2d.entry;
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const adapter = useRef<Live2DAdapter>(null);
  const latestSnapshot = useRef(props.snapshot);
  latestSnapshot.current = props.snapshot;
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!entry || !host.current || !canvas.current) return;
    recordLive2DStatus(entry, 'loading');
    setReady(false);
    setLoadError(null);
    let active = true;
    let instance: Live2DAdapter | null = null;
    const resize = () => {
      const size = host.current?.getBoundingClientRect();
      if (size) instance?.resize(size.width, size.height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host.current);
    const target = canvas.current;
    void loadCubismCore()
      .then(() => import('./CubismBackend'))
      .then(async ({ CubismBackend }) => {
        if (!active) return;
        instance = new Live2DAdapter(model.renderer.live2d, new CubismBackend(model.renderer.live2d.runtimeOffsets));
        adapter.current = instance;
        const status = await instance.init(target);
        if (active) recordLive2DStatus(entry, status, instance.error);
        if (active && status === 'ready') {
          if (latestSnapshot.current) instance.update(latestSnapshot.current);
          setReady(true);
          resize();
        }
        if (active && status === 'error') {
          setLoadError(instance.error || '模型加载失败');
          console.error('Cubism 模型加载失败', instance.error);
        }
      })
      .catch((error) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : String(error);
        recordLive2DStatus(entry, 'error', message);
        setLoadError(message);
        console.error('Cubism 运行时加载失败', error);
      });
    return () => {
      active = false;
      observer.disconnect();
      instance?.dispose();
      adapter.current = null;
    };
  }, [entry]);

  useEffect(() => {
    if (props.snapshot) adapter.current?.update(props.snapshot);
  }, [props.snapshot]);

  const head = model.hotspots.head;
  const body = model.hotspots.body;
  return (
    <div className="live2d-renderer" ref={host}>
      <canvas ref={canvas} className="live2d-canvas" aria-label="长离 Cubism 模型" />
      {!ready &&
        (canRenderLayers(layerManifest) ? (
          <ImageLayerRenderer {...props} />
        ) : (
          <SpriteRenderer {...props} />
        ))}
      {loadError && (
        <span role="status" className="live2d-load-status">
          Live2D 加载失败：{loadError}
        </span>
      )}
      {ready && (
        <>
          <button
            className="art-hotspot body-hotspot"
            aria-label="轻碰身体"
            onClick={props.onBody}
            style={{
              left: `${body[0] * 100}%`,
              top: `${body[1] * 100}%`,
              width: `${body[2] * 100}%`,
              height: `${body[3] * 100}%`,
            }}
          />
          <button
            className="art-hotspot head-hotspot"
            aria-label="摸摸头"
            onClick={props.onHead}
            style={{
              left: `${head[0] * 100}%`,
              top: `${head[1] * 100}%`,
              width: `${head[2] * 100}%`,
              height: `${head[3] * 100}%`,
            }}
          />
        </>
      )}
    </div>
  );
}
