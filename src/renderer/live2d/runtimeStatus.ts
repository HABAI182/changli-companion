import type { Live2DStatus } from './Live2DAdapter';

const key = 'changli-live2d-runtime-status';
export interface RuntimeStatus {
  entry: string | null;
  status: Live2DStatus;
  error: string | null;
  updatedAt: number;
}
let current: RuntimeStatus | null = null;

// The native settings panel is a second WebView on the same origin. Share
// observed load results so configuration is never reported as runtime success.
export function recordLive2DStatus(
  entry: string | null,
  status: Live2DStatus,
  error: string | null = null,
) {
  current = { entry, status, error, updatedAt: Date.now() };
  try {
    localStorage.setItem(key, JSON.stringify(current));
  } catch {
    /* Rendering does not require storage. */
  }
}
export function readLive2DStatus(): RuntimeStatus | null {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored) as RuntimeStatus;
  } catch {
    /* Use the current window's result if storage is unavailable. */
  }
  return current;
}
