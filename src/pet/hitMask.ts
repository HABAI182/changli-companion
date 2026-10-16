import { invoke } from '@tauri-apps/api/core';
import { native } from '../storage';

// A bounded, transient alpha silhouette, never a desktop screenshot or input log.
export function packAlphaMask(rgba: Uint8ClampedArray): string {
  const bytes = new Uint8Array(Math.ceil(rgba.length / 4 / 8));
  for (let i = 0; i < rgba.length / 4; i++) if (rgba[i * 4 + 3] > 8) bytes[i >> 3] |= 1 << (i & 7);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

let canvas: HTMLCanvasElement | undefined;
let lastAt = -Infinity;
let pending = false;
let lastMask = '';
export function publishPetHitMask(sources: (HTMLCanvasElement | HTMLImageElement)[]) {
  if (!native || location.search || pending || performance.now() - lastAt < 120) return;
  lastAt = performance.now();
  canvas ??= document.createElement('canvas');
  const width = 180,
    height = Math.max(1, Math.min(320, Math.round((width * innerHeight) / innerWidth)));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  try {
    ctx.setTransform(width / innerWidth, 0, 0, height / innerHeight, 0, 0);
    for (const source of sources) {
      const r = source.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) ctx.drawImage(source, r.x, r.y, r.width, r.height);
    }
    const handle = document.querySelector('.native-pet .drag-handle')?.getBoundingClientRect();
    if (handle) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(handle.x, handle.y, handle.width, handle.height, 6);
      ctx.fill();
    }
    const bits = packAlphaMask(ctx.getImageData(0, 0, width, height).data);
    const key = width + ':' + height + ':' + bits;
    if (key === lastMask) return;
    pending = true;
    void invoke('set_pet_hit_mask', { width, height, bits })
      .then(() => {
        lastMask = key;
      })
      .catch(console.error)
      .finally(() => {
        pending = false;
      });
  } catch (error) {
    console.error('桌宠透明区域更新失败', error);
  }
}
