import type { RenderSnapshot } from '../../pet/presentation';
import { handAction } from '../../pet/presentation';
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
  private dragging = false;
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
    if (snapshot.drag === 'dragging' && !this.dragging) this.backend.startMotion('__clear-input');
    this.dragging = snapshot.drag === 'dragging';
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
      'phoenix.wing': (snapshot.idle.phoenixWing || 0) * 30,
      'phoenix.tail': (snapshot.idle.phoenixTail || 0) * 30,
      // Clear both bases every frame: interrupted one-hand motions must not
      // retain the other hand's last sampled pressure.
      'hand.left.press': Math.max(
        snapshot.idle.rightKeyboardPress || 0,
        snapshot.idle.mousePress || 0,
      ),
      'hand.right.press': snapshot.idle.leftKeyboardPress || 0,
      'eye.x': snapshot.idle.gazeX,
      'eye.y': cubismGazeY,
      'eye.left.open': 1 - snapshot.idle.blink,
      'eye.right.open': 1 - snapshot.idle.blink,
      'head.x': snapshot.idle.gazeX * 8 + snapshot.idle.headTurn,
      'head.y': cubismGazeY * 6,
      'head.z':
        snapshot.drag === 'dragging'
          ? (snapshot.idle.dragSway || 0) * 6
          : snapshot.drag === 'release'
            ? snapshot.idle.headTilt
            : snapshot.idle.headTilt,
      'body.z': snapshot.drag === 'dragging' ? 2 : 0,
      'mouth.open': snapshot.mouthOpen,
      'mouth.form': snapshot.expression === 'smile' ? 0.5 : 0,
      breath: snapshot.idle.breathe,
    };
    for (const [semantic, value] of Object.entries(values))
      if (p[semantic]) this.backend.setParameter(p[semantic], value);
    for (const [name, value] of Object.entries({
      handInputOwned: snapshot.idle.leftKeyboardPress !== undefined ? 1 : 0,
      keyboardReach: snapshot.idle.keyboardReach || 0,
      keyboardDepth: snapshot.idle.keyboardDepth || 0,
      keyboardLanding: snapshot.idle.keyboardLanding || 0,
      rightKeyboardReach: snapshot.idle.rightKeyboardReach || 0,
      rightKeyboardDepth: snapshot.idle.rightKeyboardDepth || 0,
      rightKeyboardMix: snapshot.idle.rightKeyboardMix || 0,
      mouseX: snapshot.idle.mouseHandX || 0,
      mouseY: snapshot.idle.mouseHandY || 0,
      headX: snapshot.idle.headX || 0,
      headY: snapshot.idle.headY || 0,
      headShape: snapshot.idle.headShape || 0,
      headRotation: snapshot.idle.headRotation || 0,
      phoenixBounce: snapshot.idle.phoenixBounce || 0,
      flamePhase: snapshot.idle.flamePhase || 0,
      flameStrength: snapshot.idle.flameStrength || 0,
    }))
      this.backend.setParameter(`__gesture.${name}`, value);
    // Each input has its own start time: consecutive keys must retrigger the
    // press even when their action id stays the same. Unauthored animations
    // should also leave the available input motions usable.
    const inputOwned = snapshot.idle.leftKeyboardPress !== undefined;
    const trigger = this.dragging
      ? null
      : snapshot.animation && this.config.motionMap[snapshot.animation.id]
        ? snapshot.animation
        : inputOwned &&
            snapshot.action &&
            /^(keyboard_|space|enter|backspace|rapid|mouse_|wheel)/.test(snapshot.action.id)
          ? null
          : snapshot.action;
    const actionId =
      trigger && (trigger === snapshot.action ? handAction(trigger.id, snapshot.base) : trigger.id);
    const mapped = actionId && this.config.motionMap[actionId];
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
