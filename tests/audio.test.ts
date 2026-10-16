import { expect, it } from 'vitest';
import { AudioManager, feedbackSound } from '../src/audio/AudioManager';
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
  expect(await audio.play('key_press', settings)).toBe('disabled');
  settings.sfxEnabled = true;
  settings.sfxVolume = 0.4;
  expect(await audio.play('key_press', settings)).toBe('played');
  expect(played).toEqual([
    { url: '/models/changli/assets/audio/key-press-v0716.wav', volume: 0.4 },
  ]);
  expect(await audio.play('key_press', settings)).toBe('cooldown');
  now += 1000;
  expect(await audio.play('key_press', settings)).toBe('played');
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
  expect(await audio.play('key_press', settings)).toBe('failed');
  expect(await audio.play('key_press', settings)).toBe('played');
});

it('按键和点击有反馈；长按、释放、文字互动和移动保持静音', () => {
  expect(
    feedbackSound('keyboard_left', { code: 65, label: 'A', phase: 'down', repeat: false }),
  ).toBe('key_press');
  expect(feedbackSound('space')).toBe('key_press');
  expect(feedbackSound('left')).toBe('mouse_press');
  expect(feedbackSound('right')).toBe('mouse_press');
  expect(
    feedbackSound('keyboard_left', { code: 65, label: 'A', phase: 'down', repeat: true }),
  ).toBeNull();
  expect(
    feedbackSound('keyboard_left', { code: 65, label: 'A', phase: 'up', repeat: false }),
  ).toBeNull();
  for (const signal of ['move', 'pet', 'body', 'complete', 'wheel'] as const)
    expect(feedbackSound(signal)).toBeNull();
});
