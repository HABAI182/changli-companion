import { expect, it } from 'vitest';
import { AudioManager } from '../src/audio/AudioManager';
import { initialData } from '../src/domain';

it('本地音效默认关闭；开启后限音量并执行冷却', async () => {
  let now = 1000;
  const played: { url: string; volume: number }[] = [];
  const audio = new AudioManager(
    (url) => ({
      volume: 0,
      async play() {
        played.push({ url, volume: this.volume });
      },
    }),
    () => now,
  );
  const settings = initialData().settings;
  expect(await audio.play('focus_complete', settings)).toBe('disabled');
  settings.sfxEnabled = true;
  settings.sfxVolume = 0.4;
  expect(await audio.play('focus_complete', settings)).toBe('played');
  expect(played).toEqual([
    { url: '/models/changli/assets/audio/placeholder-chime.wav', volume: 0.4 },
  ]);
  expect(await audio.play('focus_complete', settings)).toBe('cooldown');
  now += 1000;
  expect(await audio.play('focus_complete', settings)).toBe('played');
  expect(await audio.play('unknown', settings)).toBe('missing');
});

it('播放失败时可重试，且不会把远程地址送给播放器', async () => {
  let attempts = 0;
  const audio = new AudioManager(() => ({
    volume: 0,
    async play() {
      if (attempts++ === 0) throw Error('autoplay blocked');
    },
  }));
  const settings = initialData().settings;
  settings.sfxEnabled = true;
  expect(await audio.play('focus_complete', settings)).toBe('failed');
  expect(await audio.play('focus_complete', settings)).toBe('played');
});
