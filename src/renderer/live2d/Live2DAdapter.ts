import type { RenderSnapshot } from '../../pet/presentation';
import type { Model } from '../../model';
import { resource } from '../../model';

export interface Live2DBackend {
  load(canvas: HTMLCanvasElement, entryUrl: string): Promise<void>;
  setParameter(id: string, value: number): void;
  startMotion(name: string): void;
  setExpression(name: string): void;
  resize(width: number, height: number): void;
  dispose(): void;
}
export type Live2DStatus = 'missing-model' | 'missing-runtime' | 'loading' | 'ready' | 'error';

// A genuine Cubism model must load before the adapter reports ready.
export class Live2DAdapter {
  status: Live2DStatus = 'missing-model';
  error: string | null = null;
  private activeMotion = '';
  private activeExpression = '';
  private disposed = false;
  private backendDisposed = false;
  constructor(
    private config: Model['renderer']['live2d'],
    private backend?: Live2DBackend,
  ) {
    this.status = !config.entry ? 'missing-model' : !backend ? 'missing-runtime' : 'loading';
  }
  async init(canvas: HTMLCanvasElement): Promise<Live2DStatus> {
    if (!this.config.entry || !this.backend) return this.status;
    if (!this.config.entry.endsWith('.model3.json')) {
      this.status = 'error';
      return this.status;
    }
    this.status = 'loading';
    this.error = null;
    try {
      await this.backend.load(canvas, resource(this.config.entry));
      if (!this.disposed) this.status = 'ready';
    } catch (error) {
      if (!this.disposed) {
        this.error = error instanceof Error ? error.message : String(error);
        this.status = 'error';
        this.disposeBackend();
      }
    }
    return this.status;
  }
  update(snapshot: RenderSnapshot) {
    if (this.status !== 'ready' || !this.backend) return;
    const p = this.config.parameterMap;
    // Pointer/gamepad presentation uses screen Y (down-positive). Cubism eye
    // and head parameters use up-positive; keep that conversion at this edge.
    const cubismGazeY = snapshot.idle.gazeY === 0 ? 0 : -snapshot.idle.gazeY;
    const values: Record<string, number> = {
      gazeX: snapshot.idle.gazeX,
      gazeY: cubismGazeY,
      blinkL: 1 - snapshot.idle.blink,
      blinkR: 1 - snapshot.idle.blink,
      breathe: snapshot.idle.breathe,
      hairSway: snapshot.idle.hairSway,
      ornamentSway: snapshot.idle.ornamentSway,
      phoenixFloat: snapshot.idle.phoenixFloat,
      // Supply neutral bases every frame so completed motion curves cannot
      // leave the independent wing/tail parameters at their last sampled pose.
      'phoenix.wing': 0,
      'phoenix.tail': 0,
      'eye.x': snapshot.idle.gazeX,
      'eye.y': cubismGazeY,
      'eye.left.open': 1 - snapshot.idle.blink,
      'eye.right.open': 1 - snapshot.idle.blink,
      'head.x': snapshot.idle.gazeX * 8 + snapshot.idle.headTurn,
      'head.y': cubismGazeY * 6,
      'head.z':
        snapshot.drag === 'dragging'
          ? 4
          : snapshot.drag === 'release'
            ? -1
            : snapshot.idle.headTilt,
      'body.z': snapshot.drag === 'dragging' ? 2 : 0,
      'mouth.open': snapshot.mouthOpen,
      'mouth.form': snapshot.expression === 'smile' ? 0.5 : 0,
      breath: snapshot.idle.breathe,
    };
    for (const [semantic, value] of Object.entries(values))
      if (p[semantic]) this.backend.setParameter(p[semantic], value);
    // Each input has its own start time: consecutive keys must retrigger the
    // press even when their action id stays the same. Unauthored animations
    // should also leave the available input motions usable.
    const trigger =
      snapshot.animation && this.config.motionMap[snapshot.animation.id]
        ? snapshot.animation
        : snapshot.action;
    const mapped = trigger && this.config.motionMap[trigger.id];
    const motionKey = mapped ? `${trigger.id}:${trigger.startedAt}` : '';
    if (!motionKey) this.activeMotion = '';
    if (mapped && motionKey !== this.activeMotion) {
      this.backend.startMotion(mapped);
      this.activeMotion = motionKey;
    }
    // An unauthored face must release the previous expression. Otherwise
    // selecting e.g. "think" after Smile keeps the old closed-eye expression
    // indefinitely. Compare resolved assets so aliases don't restart a fade.
    const expression =
      this.config.expressionMap[snapshot.expression] || this.config.expressionMap.default;
    if (expression && expression !== this.activeExpression) {
      this.backend.setExpression(expression);
      this.activeExpression = expression;
    }
  }
  resize(width: number, height: number) {
    if (this.status === 'ready') this.backend?.resize(width, height);
  }
  dispose() {
    this.disposed = true;
    this.disposeBackend();
    this.status = this.config.entry ? 'missing-runtime' : 'missing-model';
  }

  private disposeBackend() {
    if (!this.backend || this.backendDisposed) return;
    this.backendDisposed = true;
    this.backend.dispose();
  }
}
