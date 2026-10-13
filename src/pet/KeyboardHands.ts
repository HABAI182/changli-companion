import type { Signal } from '../domain';

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
  };
  private right = {
    reach: 0,
    depth: 0,
    mix: 0,
    target: 0,
    targetDepth: 0,
    until: 0,
    pressedAt: -Infinity,
  };
  private updatedAt: number;
  private speed = 1;
  constructor(now: number) {
    this.updatedAt = now;
  }
  input(signal: Signal, now: number, depth: number) {
    if (!['keyboard_left', 'keyboard_right', 'key', 'space', 'enter', 'backspace'].includes(signal))
      return;
    this.advance(now, this.speed);
    const left = signal === 'keyboard_left' || signal === 'space';
    const hand = left ? this.left : this.right;
    hand.target = signal === 'space' ? 0 : left ? 1 : -1;
    hand.targetDepth = signal === 'space' ? 1 : Math.max(-1, Math.min(1, depth));
    hand.until = now + Math.max(500, 500 / this.speed);
    hand.pressedAt = now;
  }
  reset(now: number) {
    for (const hand of [this.left, this.right]) {
      hand.until = 0;
      hand.pressedAt = -Infinity;
    }
    this.updatedAt = now;
  }
  advance(now: number, speed = 1) {
    this.speed = Number.isFinite(speed) ? Math.max(0.5, Math.min(2, speed)) : 1;
    const dt = Math.max(0, now - this.updatedAt);
    this.updatedAt = Math.max(now, this.updatedAt);
    const blend = 1 - Math.exp((-dt * this.speed) / 65);
    for (const hand of [this.left, this.right]) {
      const active = now < hand.until;
      hand.reach += ((active ? hand.target : 0) - hand.reach) * blend;
      hand.depth += ((active ? hand.targetDepth : 0) - hand.depth) * blend;
      hand.mix += ((active ? 1 : 0) - hand.mix) * blend;
    }
    const pressure = (hand: typeof this.left) => {
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
      rightKeyboardActive: now < this.right.until || this.right.mix > 0.03,
      leftKeyboardPress: pressure(this.left),
      rightKeyboardPress: pressure(this.right),
    };
  }
}
