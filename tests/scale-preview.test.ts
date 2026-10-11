import { expect, it } from 'vitest';
import { ScalePreviewQueue } from '../src/settings/scalePreview';
it('慢原生窗口缩放不积压中间值，保存前等待最终预览', async () => {
  const calls: number[] = [],
    releases: Array<() => void> = [];
  const queue = new ScalePreviewQueue((scale) => {
    calls.push(scale);
    return new Promise<void>((resolve) => releases.push(resolve));
  });
  const done = queue.set(0.51);
  queue.set(0.73);
  queue.set(1.37);
  expect(calls).toEqual([0.51]);
  let flushed = false;
  const flush = queue.flush().then(() => {
    flushed = true;
  });
  releases.shift()!();
  await Promise.resolve();
  expect(calls).toEqual([0.51, 1.37]);
  expect(flushed).toBe(false);
  releases.shift()!();
  await done;
  await flush;
  expect(flushed).toBe(true);
  const next = queue.set(1);
  releases.shift()!();
  await next;
  expect(calls).toEqual([0.51, 1.37, 1]);
});
it('预览失败后可重试，不把失败当保存完成', async () => {
  let fail = true;
  const values: number[] = [];
  const queue = new ScalePreviewQueue(async (scale) => {
    if (fail) throw Error('window resize failed');
    values.push(scale);
  });
  await expect(queue.set(1.23)).rejects.toThrow('window resize failed');
  fail = false;
  await queue.set(0.87);
  await queue.flush();
  expect(values).toEqual([0.87]);
});
