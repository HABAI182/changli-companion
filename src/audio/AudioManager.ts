import type { Settings } from '../domain';
import { model, resource } from '../model';
import type { Signal } from '../domain';
import type { KeyDisplay } from '../overlay/keyOverlay';

// Only physical press edges make sound. Speech bubbles, pointer movement,
// release and OS key repeat never produce a sound or a voice.
export function feedbackSound(signal: Signal, key?: KeyDisplay): string | null {
  if (key?.phase === 'up' || key?.repeat) return null;
  if (['keyboard_left', 'keyboard_right', 'key', 'space', 'enter', 'backspace'].includes(signal))
    return 'key_press';
  return signal === 'left' || signal === 'right' ? 'mouse_press' : null;
}

type Sound = {
  volume: number;
  play: () => Promise<void>;
  pause?: () => void;
  currentTime?: number;
};
type SoundFactory = (url: string) => Sound;
export type AudioResult = 'played' | 'disabled' | 'missing' | 'cooldown' | 'failed';

export class AudioManager {
  private lastPlayed = new Map<string, number>();
  private pools = new Map<string, { sounds: Sound[]; next: number }>();

  constructor(
    private create: SoundFactory = (url) => {
      const sound = new Audio(url);
      sound.preload = 'auto';
      return sound;
    },
    private clock: () => number = () => Date.now(),
  ) {}

  prime() {
    for (const id of ['key_press', 'mouse_press']) this.pool(id);
  }

  private pool(id: string) {
    let pool = this.pools.get(id);
    if (!pool) {
      const cue = model.sounds[id];
      if (!cue || cue.kind !== 'sfx') return null;
      pool = { sounds: Array.from({ length: 4 }, () => this.create(resource(cue.asset))), next: 0 };
      this.pools.set(id, pool);
    }
    return pool;
  }

  async play(id: string, settings: Settings): Promise<AudioResult> {
    const cue = model.sounds[id];
    if (!cue) return 'missing';
    if (cue.kind !== 'sfx' || !settings.sfxEnabled) return 'disabled';
    const volume = settings.sfxVolume;
    if (volume <= 0) return 'disabled';
    const now = this.clock();
    if (now - (this.lastPlayed.get(id) ?? -Infinity) < cue.cooldownMs) return 'cooldown';
    this.lastPlayed.set(id, now);
    try {
      const pool = this.pool(id)!;
      const sound = pool.sounds[pool.next++ % pool.sounds.length];
      sound.pause?.();
      if ('currentTime' in sound) sound.currentTime = 0;
      sound.volume = Math.max(0, Math.min(1, volume));
      await sound.play();
      return 'played';
    } catch {
      if (this.lastPlayed.get(id) === now) this.lastPlayed.delete(id);
      return 'failed';
    }
  }
}
