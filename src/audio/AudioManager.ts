import type { Settings } from '../domain';
import { model, resource } from '../model';

type Sound = {
  volume: number;
  play: () => Promise<void>;
};
type SoundFactory = (url: string) => Sound;
export type AudioResult = 'played' | 'disabled' | 'missing' | 'cooldown' | 'failed';

export class AudioManager {
  private lastPlayed = new Map<string, number>();

  constructor(
    private create: SoundFactory = (url) => new Audio(url),
    private clock: () => number = () => Date.now(),
  ) {}

  async play(id: string, settings: Settings): Promise<AudioResult> {
    const cue = model.sounds[id];
    if (!cue) return 'missing';
    if (cue.kind === 'sfx' ? !settings.sfxEnabled : !settings.voiceEnabled) return 'disabled';
    const volume = cue.kind === 'sfx' ? settings.sfxVolume : settings.voiceVolume;
    if (volume <= 0) return 'disabled';
    const now = this.clock();
    if (now - (this.lastPlayed.get(id) ?? -Infinity) < cue.cooldownMs) return 'cooldown';
    try {
      const sound = this.create(resource(cue.asset));
      sound.volume = Math.max(0, Math.min(1, volume));
      await sound.play();
      this.lastPlayed.set(id, now);
      return 'played';
    } catch {
      return 'failed';
    }
  }
}
