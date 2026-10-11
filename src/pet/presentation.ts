import type { Signal, Settings } from '../domain';
import { model } from '../model';
import { ResponseDeck, type ResponseTopic } from './responses';

export type ActionId =
  | 'keyboard_left'
  | 'keyboard_right'
  | 'space'
  | 'enter'
  | 'backspace'
  | 'mouse_left'
  | 'mouse_right'
  | 'wheel'
  | 'move'
  | 'rapid'
  | 'pet'
  | 'body';
export interface ActionSnapshot {
  id: ActionId;
  startedAt: number;
  until: number;
  phase: 'down' | 'up';
}
export interface AnimationSnapshot {
  id: string;
  startedAt: number;
  until: number;
  priority: number;
  status: 'awaiting-art' | 'ready';
}
export interface IdleParameters {
  breathe: number;
  blink: number;
  hairSway: number;
  ornamentSway: number;
  phoenixFloat: number;
  gazeX: number;
  gazeY: number;
  headTilt: number;
  headTurn: number;
  keyboardReach?: number;
  mouseHandX?: number;
  mouseHandY?: number;
}
export interface SpeechBubble {
  text: string;
  kind: 'speech' | 'thinking';
  until: number;
}
export interface RenderSnapshot {
  base: 'keyboard_mouse' | 'keyboard_only' | 'sleep';
  action: ActionSnapshot | null;
  expression: string;
  animation: AnimationSnapshot | null;
  phoenix: 'normal' | 'happy' | 'ruffled' | 'sleep' | 'flying';
  idle: IdleParameters;
  ambient: 'none' | 'glance' | 'nod' | 'curious';
  drag: 'idle' | 'dragging' | 'release';
  bubble: SpeechBubble | null;
  mouthOpen: number;
  motionLevel: Settings['motion'];
}
const durations: Record<ActionId, number> = {
  keyboard_left: 170,
  keyboard_right: 170,
  space: 210,
  enter: 340,
  backspace: 270,
  mouse_left: 190,
  mouse_right: 190,
  wheel: 250,
  move: 100,
  rapid: 450,
  pet: 450,
  body: 450,
};
const actions: Partial<Record<Signal, ActionId>> = {
  keyboard_left: 'keyboard_left',
  keyboard_right: 'keyboard_right',
  key: 'keyboard_right',
  space: 'space',
  enter: 'enter',
  backspace: 'backspace',
  left: 'mouse_left',
  right: 'mouse_right',
  wheel: 'wheel',
  move: 'move',
  pet: 'pet',
  body: 'body',
};
const mouseSignals: Signal[] = ['left', 'right', 'wheel', 'move'];

// Rig names refer to image sides: RightPress is Changli's anatomical left
// hand over the keyboard. Every keyboard region uses it; mouse uses LeftPress.
export function handAction(id: string, _base: RenderSnapshot['base']): string {
  if (['keyboard_left', 'keyboard_right', 'space', 'enter', 'backspace', 'rapid'].includes(id))
    return 'keyboard_right';
  return id;
}

// Accelerate into closure, hold, then reopen promptly and ease to rest.
// Easing to rest at BOTH closed endpoints stalls in a thin, translucent slit.
export function blinkClosure(elapsed: number): number {
  if (elapsed < 0 || elapsed >= 260) return 0;
  if (elapsed < 80) return 1 - Math.cos((elapsed / 80) * Math.PI / 2);
  if (elapsed < 115) return 1;
  return 1 - Math.sin(((elapsed - 115) / 145) * Math.PI / 2);
}

export class PresentationRuntime {
  private action: ActionSnapshot | null = null;
  private animation: AnimationSnapshot | null = null;
  private manualExpression: string | null = null;
  private expressionUntil = 0;
  private touchSmileUntil = 0;
  private pressed = new Set<string>();
  private nextBlinkAt: number;
  private blinkStartedAt: number | null = null;
  private lastInput: number;
  private gaze = { x: 0, y: 0 };
  private gazeTarget = { x: 0, y: 0 };
  private gazeUpdatedAt: number;
  private dragActive = false;
  private dragReleaseUntil = 0;
  private bubble: SpeechBubble | null = null;
  private lastSpeechAt = -Infinity;
  private ambient: RenderSnapshot['ambient'] = 'none';
  private ambientUntil = 0;
  private ambientStartedAt = 0;
  private ambientDirection = 1;
  private ambientPose = { x: 0, y: 0, tilt: 0, turn: 0 };
  private poseUpdatedAt: number;
  private nextAmbientAt: number;
  private responses: ResponseDeck;
  private keyboardReach = 0;
  private handUpdatedAt: number;
  private keyboardTarget = 0;
  private reachUntil = 0;
  private mouseUntil = 0;
  private mouseHand = { x: 0, y: 0 };
  private keyBurst = { count: 0, startedAt: 0 };
  private lastAutomaticSpeechAt = -Infinity;
  private nextIdleSpeechAt: number;
  constructor(
    now: number,
    private random: () => number = Math.random,
  ) {
    this.lastInput = now;
    this.gazeUpdatedAt = now;
    this.poseUpdatedAt = now;
    this.nextAmbientAt = now + 9000 + this.random() * 6000;
    this.nextBlinkAt = now + 4000 + this.random() * 2600;
    this.responses = new ResponseDeck(this.random);
    this.handUpdatedAt = now;
    this.nextIdleSpeechAt = now + 60000;
  }
  get activeAnimationId() {
    return this.animation?.id;
  }
  input(signal: Signal, now: number, x = 0, y = 0, mode: Settings['inputMode'] = 'keyboard_mouse') {
    this.tick(now);
    if (mode === 'keyboard_only' && mouseSignals.includes(signal)) return;
    if (signal === 'complete') {
      this.play('wave', now);
      return;
    }
    if (now - this.lastInput > 300000) this.react('wake', now);
    this.lastInput = now;
    this.ambient = 'none';
    this.nextAmbientAt = now + 9000 + this.random() * 6000;
    // A head touch briefly closes the real native eyes in a happy reaction.
    // Explicit toggle/hold expressions retain priority and are never replaced.
    if (signal === 'pet') this.touchSmileUntil = now + 900;
    if (signal === 'move') {
      this.mouseUntil = now + 320;
      this.advanceGaze(now);
      this.gazeTarget = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
      if (this.action && this.action.id !== 'move') return;
    }
    const id = actions[signal];
    if (!id) return;
    if (['keyboard_left', 'keyboard_right', 'key', 'space', 'enter', 'backspace'].includes(signal)) {
      this.keyboardTarget = signal === 'space' ? 0 : signal === 'keyboard_left' ? -1 : 1;
      this.reachUntil = now + 310;
      if (now - this.keyBurst.startedAt > 6000) this.keyBurst = { count: 0, startedAt: now };
      if (++this.keyBurst.count >= 12 && now - this.lastAutomaticSpeechAt >= 25000) {
        if (this.react('typing', now)) this.lastAutomaticSpeechAt = now;
        this.keyBurst.count = 0;
      }
    } else if (['left', 'right', 'wheel'].includes(signal)) {
      this.mouseUntil = now + 320;
    }
    if (this.action?.id === id && now < this.action.until && id !== 'move') {
      this.action = {
        id,
        startedAt: now,
        until: now + durations[id],
        phase: this.action.phase === 'down' ? 'up' : 'down',
      };
    } else this.action = { id, startedAt: now, until: now + durations[id], phase: 'down' };
  }
  setDragState(active: boolean, now: number) {
    this.dragActive = active;
    this.dragReleaseUntil = active ? 0 : now + 520;
    this.lastInput = now;
    this.ambient = 'none';
    this.nextAmbientAt = now + 22000;
    if (!active) this.react('drag', now);
  }
  react(topic: ResponseTopic, now: number) {
    if (now - this.lastSpeechAt < 1600) return false;
    return this.setSpeech(this.responses.pick(topic), now);
  }
  setSpeech(text: string, now: number, kind: SpeechBubble['kind'] = 'speech') {
    const trimmed = text.trim().slice(0, 100);
    if (!trimmed || now - this.lastSpeechAt < 1600) return false;
    this.lastSpeechAt = now;
    this.ambient = 'none';
    this.bubble = {
      text: trimmed,
      kind,
      until: now + (kind === 'thinking' ? 2200 : Math.min(6000, 1500 + trimmed.length * 100)),
    };
    return true;
  }
  expression(id: string, mode: 'toggle' | 'hold' | 'once', pressed: boolean, now = Date.now()) {
    if (!model.expressions.some((e) => e.id === id)) return false;
    this.touchSmileUntil = 0;
    if (id === 'default') {
      this.pressed.clear();
      this.manualExpression = null;
      this.expressionUntil = 0;
      return true;
    }
    if (mode === 'hold') {
      if (pressed) this.pressed.add(id);
      else this.pressed.delete(id);
      this.manualExpression = this.pressed.size ? [...this.pressed].at(-1)! : null;
    } else if (pressed) {
      this.manualExpression = mode === 'toggle' && this.manualExpression === id ? null : id;
      this.expressionUntil = mode === 'once' ? now + 1500 : 0;
    }
    return true;
  }
  play(id: string, now: number): boolean {
    const definition = model.animations.find((a) => a.id === id);
    if (!definition) return false;
    if (this.animation && now < this.animation.until) {
      if (definition.priority <= this.animation.priority || this.animation.id === id) return false;
      const previous = model.animations.find((a) => a.id === this.animation!.id);
      if (previous?.interrupt === 'none') return false;
    }
    this.animation = {
      id,
      startedAt: now,
      until: now + definition.duration * definition.loopCount,
      priority: definition.priority,
      status: definition.status as AnimationSnapshot['status'],
    };
    return true;
  }
  tick(now: number) {
    if (this.bubble && now >= this.bubble.until) this.bubble = null;
    if (this.ambient !== 'none' && now >= this.ambientUntil) this.ambient = 'none';
    if (this.expressionUntil && now >= this.expressionUntil) {
      this.manualExpression = null;
      this.expressionUntil = 0;
    }
    if (this.action && now >= this.action.until) this.action = null;
    if (this.animation && now >= this.animation.until) this.animation = null;
  }
  snapshot(
    now: number,
    settings: Pick<Settings, 'motion' | 'inputMode' | 'autoSleepMinutes'> & Partial<Pick<Settings, 'bubblesEnabled'>>,
  ): RenderSnapshot {
    this.tick(now);
    this.advanceGaze(now);
    const base =
      settings.autoSleepMinutes > 0 && now - this.lastInput >= settings.autoSleepMinutes * 60000
        ? 'sleep'
        : settings.inputMode;
    const animation = this.animation;
    const expression =
      this.manualExpression ||
      (base === 'sleep' ? 'sleepy' : now < this.touchSmileUntil ? 'smile' : 'default');
    const phoenix =
      animation?.id === 'phoenix'
        ? 'flying'
        : base === 'sleep'
          ? 'sleep'
          : expression === 'angry' || expression === 'flame_eyes'
            ? 'ruffled'
            : expression === 'smile' || expression === 'laugh'
              ? 'happy'
              : 'normal';
    const factor = settings.motion === 'off' ? 0 : settings.motion === 'low' ? 0.35 : 1;
    const handBlend = 1 - Math.exp(-Math.max(0, now - this.handUpdatedAt) / 45);
    this.handUpdatedAt = Math.max(now, this.handUpdatedAt);
    const keyboardTarget = now < this.reachUntil ? this.keyboardTarget : 0;
    this.keyboardReach += (keyboardTarget - this.keyboardReach) * handBlend;
    const mouseActive = base === 'keyboard_mouse' && now < this.mouseUntil;
    for (const axis of ['x', 'y'] as const) {
      const target = mouseActive ? this.gaze[axis] : 0;
      this.mouseHand[axis] += (target - this.mouseHand[axis]) * handBlend;
    }
    if (settings.bubblesEnabled !== false && base !== 'sleep' && !this.manualExpression &&
        !animation && now - this.lastInput >= 45000 && now >= this.nextIdleSpeechAt) {
      if (this.react('idle', now)) this.lastAutomaticSpeechAt = now;
      this.nextIdleSpeechAt = now + 90000;
    }
    const visibleBubble = settings.bubblesEnabled === false ? null : this.bubble;
    if (
      factor > 0 &&
      base !== 'sleep' &&
      !this.dragActive &&
      !this.action &&
      !animation &&
      !this.bubble &&
      now >= this.nextAmbientAt
    ) {
      const pick = this.random();
      this.ambient = pick < 0.33 ? 'glance' : pick < 0.66 ? 'nod' : 'curious';
      this.ambientDirection = this.random() < 0.5 ? -1 : 1;
      this.ambientStartedAt = now;
      this.ambientUntil = now + 2100;
      this.nextAmbientAt = now + 11000 + this.random() * 8000;
    }
    // Ease in and out of each tiny gesture. Pointer input wins immediately;
    // the previous head pose settles instead of jumping on interruption.
    const activeAmbient =
      factor > 0 && base !== 'sleep' && !this.dragActive && !animation ? this.ambient : 'none';
    const phase = Math.min(1, Math.max(0, (now - this.ambientStartedAt) / 2100));
    const envelope = activeAmbient === 'none' ? 0 : Math.sin(Math.PI * phase) ** 2;
    const direction = this.ambientDirection;
    const desired = {
      x: activeAmbient === 'glance' ? direction * 0.32 * envelope : 0,
      y: activeAmbient === 'nod' ? 0.18 * envelope : 0,
      tilt:
        (activeAmbient === 'curious'
          ? direction * 11
          : activeAmbient === 'nod'
            ? -4
            : direction * 3) * envelope,
      turn: activeAmbient === 'glance' ? direction * 9 * envelope : 0,
    };
    const poseBlend = 1 - Math.exp(-Math.max(0, now - this.poseUpdatedAt) / 90);
    this.poseUpdatedAt = Math.max(now, this.poseUpdatedAt);
    for (const key of ['x', 'y', 'tilt', 'turn'] as const)
      this.ambientPose[key] += (desired[key] - this.ambientPose[key]) * poseBlend;
    const blink = this.advanceBlink(now, factor > 0 && base !== 'sleep');
    return {
      base,
      action: animation ? null : this.action,
      expression,
      animation,
      phoenix,
      motionLevel: settings.motion,
      ambient: activeAmbient,
      drag: this.dragActive ? 'dragging' : now < this.dragReleaseUntil ? 'release' : 'idle',
      bubble: visibleBubble,
      mouthOpen:
        visibleBubble?.kind === 'speech' && factor
          ? (0.12 + Math.max(0, Math.sin(now / 115)) * 0.2) * factor
          : 0,
      idle: {
        breathe: (Math.sin(now / 920) + 1) * 0.5 * factor,
        blink,
        hairSway: Math.sin(now / 1510) * 0.35 * factor,
        ornamentSway: Math.sin(now / 1230) * 0.45 * factor,
        phoenixFloat: Math.sin(now / 970) * 0.4 * factor,
        gazeX: factor ? Math.max(-1, Math.min(1, this.gaze.x + this.ambientPose.x)) * factor : 0,
        gazeY: factor ? Math.max(-1, Math.min(1, this.gaze.y + this.ambientPose.y)) * factor : 0,
        headTilt: factor ? this.ambientPose.tilt * factor : 0,
        headTurn: factor ? this.ambientPose.turn * factor : 0,
        keyboardReach: this.keyboardReach * factor,
        mouseHandX: base === 'keyboard_mouse' ? this.mouseHand.x * factor : 0,
        mouseHandY: base === 'keyboard_mouse' ? this.mouseHand.y * factor : 0,
      },
    };
  }
  private advanceBlink(now: number, enabled: boolean): number {
    if (!enabled) {
      this.blinkStartedAt = null;
      this.nextBlinkAt = now + 4000 + this.random() * 2600;
      return 0;
    }
    if (this.blinkStartedAt === null && now >= this.nextBlinkAt) {
      // After a suspended/minimized renderer, schedule a fresh blink rather
      // than replaying missed events or jumping straight into a closed eye.
      if (now - this.nextBlinkAt > 500) {
        this.nextBlinkAt = now + 4000 + this.random() * 2600;
        return 0;
      }
      this.blinkStartedAt = this.nextBlinkAt;
    }
    if (this.blinkStartedAt === null) return 0;
    const elapsed = now - this.blinkStartedAt;
    if (elapsed >= 260) {
      this.blinkStartedAt = null;
      this.nextBlinkAt = now + 4000 + this.random() * 2600;
      return 0;
    }
    return blinkClosure(elapsed);
  }
  private advanceGaze(now: number) {
    const elapsed = Math.max(0, now - this.gazeUpdatedAt);
    this.gazeUpdatedAt = Math.max(now, this.gazeUpdatedAt);
    const blend = 1 - Math.exp(-elapsed / 85);
    this.gaze.x += (this.gazeTarget.x - this.gaze.x) * blend;
    this.gaze.y += (this.gazeTarget.y - this.gaze.y) * blend;
  }
}
