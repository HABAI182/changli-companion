import type { Signal } from '../domain';
import type { KeyDisplay } from '../overlay/keyOverlay';

// Physical keyboard zones belong to anatomical hands. The front-facing rig
// names its meshes by image side, so character-left is the image-right mesh.
export class KeyboardHands {
  private left = {
    reach: 0,
    depth: 0,
    mix: 0,
    target: 0,
    targetDepth: 0,
    until: 0,
    pressedAt: -Infinity,
    held: false,
    tracked: false,
    pressure: 0,
  };
  private right = {
    reach: 0,
    depth: 0,
    mix: 0,
    target: 0,
    targetDepth: 0,
    until: 0,
    pressedAt: -Infinity,
    held: false,
    tracked: false,
    pressure: 0,
  };
  // Current physical state only, discarded on release; no typing history.
  private heldKeys = new Map<string | number, { signal: Signal; depth: number }>();
  private updatedAt: number;
  private speed = 1;
  constructor(now: number) {
    this.updatedAt = now;
  }
  input(signal: Signal, now: number, depth: number, key?: KeyDisplay) {
    if (!['keyboard_left', 'keyboard_right', 'key', 'space', 'enter', 'backspace'].includes(signal))
      return;
    this.advance(now, this.speed);
    const left = signal === 'keyboard_left' || signal === 'space';
    const hand = left ? this.left : this.right;
    if (key) {
      const identity = key.code ?? key.label;
      if (key.phase === 'up') this.heldKeys.delete(identity);
      else if (!this.heldKeys.has(identity)) this.heldKeys.set(identity, { signal, depth });
      hand.tracked = true;
      const remaining = [...this.heldKeys.values()].filter(
        (held) => (held.signal === 'keyboard_left' || held.signal === 'space') === left,
      );
      hand.held = remaining.length > 0;
      hand.until = 0;
      if (key.phase === 'up' || key.repeat) {
        const latest = remaining.at(-1);
        if (latest) {
          hand.target = latest.signal === 'space' ? 0 : left ? 1 : -1;
          hand.targetDepth =
            latest.signal === 'space' ? 1 : Math.max(-1, Math.min(1, latest.depth));
        }
        return;
      }
    } else {
      hand.tracked = false;
      hand.until = now + Math.max(500, 500 / this.speed);
    }
    hand.target = signal === 'space' ? 0 : left ? 1 : -1;
    hand.targetDepth = signal === 'space' ? 1 : Math.max(-1, Math.min(1, depth));
    hand.pressedAt = now;
  }
  reset(now: number) {
    this.heldKeys.clear();
    for (const hand of [this.left, this.right]) {
      hand.until = 0;
      hand.pressedAt = -Infinity;
      hand.held = false;
    }
    this.updatedAt = now;
  }
  advance(now: number, speed = 1) {
    this.speed = Number.isFinite(speed) ? Math.max(0.5, Math.min(2, speed)) : 1;
    const dt = Math.max(0, now - this.updatedAt);
    this.updatedAt = Math.max(now, this.updatedAt);
    const blend = 1 - Math.exp((-dt * this.speed) / 65);
    for (const hand of [this.left, this.right]) {
      const active = hand.held || now < hand.until;
      hand.reach += ((active ? hand.target : 0) - hand.reach) * blend;
      hand.depth += ((active ? hand.targetDepth : 0) - hand.depth) * blend;
      hand.mix += ((active ? 1 : 0) - hand.mix) * blend;
      hand.pressure +=
        ((hand.held ? 1 : 0) - hand.pressure) * (1 - Math.exp((-dt * this.speed) / 40));
    }
    const pressure = (hand: typeof this.left) => {
      if (hand.tracked) return hand.pressure;
      const age = (now - hand.pressedAt) * this.speed;
      if (age < 0 || age >= 220) return 0;
      return Math.sin(Math.PI * Math.min(1, age / 220));
    };
    return {
      keyboardReach: this.left.reach,
      keyboardDepth: this.left.depth,
      keyboardLanding: this.left.mix,
      rightKeyboardReach: this.right.reach,
      rightKeyboardDepth: this.right.depth,
      rightKeyboardMix: this.right.mix,
      // Keyboard ownership persists through release; mouse never steals the
      // right hand mid-reach, even when clicks and motion arrive in between.
      rightKeyboardActive: this.right.held || now < this.right.until || this.right.mix > 0.03,
      leftKeyboardPress: pressure(this.left),
      rightKeyboardPress: pressure(this.right),
    };
  }
}
