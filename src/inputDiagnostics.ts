// Aggregate, process-local health counters. No key labels or event history.
let received = 0;
let frames = 0;
let lastFrame = 0;
export function noteNativeInput() {
  received++;
}
export function noteRenderedFrame(now: number) {
  frames++;
  lastFrame = now;
}
export function inputHealth() {
  return { received, frames, frameAgeMs: Math.round(Math.max(0, performance.now() - lastFrame)) };
}
