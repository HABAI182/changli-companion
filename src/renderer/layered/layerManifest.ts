import source from '../../../public/models/changli/assets/layers/layers.json';
import { resource } from '../../model';

export interface Layer {
  id: string;
  asset: string | null;
  z: number;
  anchor: [number, number];
  pivot: [number, number];
}
export interface LayerManifest {
  canvas: [number, number];
  status: 'awaiting-art' | 'ready';
  fallback: string;
  layers: Layer[];
}
export const layerManifest = source as unknown as LayerManifest;
export const requiredLayers = [
  'back_hair',
  'body',
  'face',
  'left_eye',
  'right_eye',
  'brows',
  'mouth',
  'front_hair',
  'ornaments',
  'left_arm_hand',
  'right_arm_hand',
  'keyboard',
  'mouse',
  'phoenix',
  'foreground_effects',
];
export function validateLayerManifest(value: LayerManifest): boolean {
  if (value.canvas[0] <= 0 || value.canvas[1] <= 0) return false;
  if (new Set(value.layers.map((l) => l.id)).size !== value.layers.length) return false;
  if (!requiredLayers.every((id) => value.layers.some((l) => l.id === id))) return false;
  return value.layers.every(
    (l) =>
      Number.isFinite(l.z) &&
      l.anchor.length === 2 &&
      l.pivot.length === 2 &&
      l.anchor.every((n) => n >= 0 && n <= 1) &&
      l.pivot.every((n) => n >= 0 && n <= 1) &&
      (!l.asset || validAsset(l.asset)),
  );
}
function validAsset(path: string): boolean {
  try {
    resource(path);
    return true;
  } catch {
    return false;
  }
}
export function missingLayers(value: LayerManifest): string[] {
  return value.layers.filter((l) => !l.asset).map((l) => l.id);
}
export function canRenderLayers(value: LayerManifest): boolean {
  return (
    validateLayerManifest(value) && value.status === 'ready' && missingLayers(value).length === 0
  );
}
