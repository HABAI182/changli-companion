import type { RendererProps } from '../../Renderer';
import { model, resource } from '../../model';
import { layerManifest } from './layerManifest';
import { SpriteRenderer } from '../../SpriteRenderer';
import { layerTransform } from './layerMotion';

// Shared-canvas layers are rendered only when every required asset is supplied.
export function ImageLayerRenderer(props: RendererProps) {
  if (layerManifest.status !== 'ready' || layerManifest.layers.some((l) => !l.asset))
    return <SpriteRenderer {...props} />;
  return (
    <div
      className={`image-layer-renderer motion-${props.settings.motion}`}
      role="img"
      aria-label="长离分层角色"
    >
      {layerManifest.layers
        .slice()
        .sort((a, b) => a.z - b.z)
        .map((layer) => (
          <img
            key={layer.id}
            className={`model-layer layer-${layer.id}`}
            src={resource(layer.asset!)}
            alt=""
            draggable={false}
            style={{
              zIndex: layer.z,
              transformOrigin: `${layer.pivot[0] * 100}% ${layer.pivot[1] * 100}%`,
              transform: props.snapshot ? layerTransform(layer.id, props.snapshot) : undefined,
            }}
          />
        ))}
      <button
        className="art-hotspot body-hotspot"
        aria-label="轻碰身体"
        onClick={props.onBody}
        style={{
          left: `${model.hotspots.body[0] * 100}%`,
          top: `${model.hotspots.body[1] * 100}%`,
          width: `${model.hotspots.body[2] * 100}%`,
          height: `${model.hotspots.body[3] * 100}%`,
        }}
      />
      <button
        className="art-hotspot head-hotspot"
        aria-label="摸摸头"
        onClick={props.onHead}
        style={{
          left: `${model.hotspots.head[0] * 100}%`,
          top: `${model.hotspots.head[1] * 100}%`,
          width: `${model.hotspots.head[2] * 100}%`,
          height: `${model.hotspots.head[3] * 100}%`,
        }}
      />
    </div>
  );
}
