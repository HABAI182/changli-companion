// A damped spring keeps velocity on interruption instead of restarting a tween.
export class ElasticSpring {
  value = 0;
  velocity = 0;
  constructor(private frequency = 15, private damping = .43) {}
  kick(velocity: number) { this.velocity = Math.max(-24, Math.min(24, this.velocity + velocity)); }
  step(elapsed: number, target: number) {
    target = Math.max(-1, Math.min(1, target));
    if (elapsed > 300) { this.value = target; this.velocity = 0; return this.value; }
    let remaining = Math.max(0, elapsed) / 1000;
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 120), w = this.frequency;
      this.velocity += (w * w * (target - this.value) - 2 * this.damping * w * this.velocity) * dt;
      this.value += this.velocity * dt;
      if (Math.abs(this.value) > 1) { this.value = Math.sign(this.value); this.velocity = 0; }
      remaining -= dt;
    }
    return this.value;
  }
}
