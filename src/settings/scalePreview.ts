// Keep at most one native resize in flight and apply the newest dragged value.
export class ScalePreviewQueue {
  private pending: number | undefined;
  private running?: Promise<void>;
  constructor(private write: (scale: number) => Promise<void>) {}
  set(scale: number): Promise<void> {
    this.pending = scale;
    if (!this.running) {
      this.running = this.drain().finally(() => {
        this.running = undefined;
      });
    }
    return this.running;
  }
  private async drain() {
    while (this.pending !== undefined) {
      const scale = this.pending;
      this.pending = undefined;
      try {
        await this.write(scale);
      } catch (error) {
        this.pending = undefined;
        throw error;
      }
    }
  }
  async flush() {
    await this.running;
  }
}
