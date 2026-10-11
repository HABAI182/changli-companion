import { expect, it } from 'vitest';
import { ResponseDeck, responses } from '../src/pet/responses';

it('每个互动场景有多句回应，固定随机源也不连续重复', () => {
  const deck = new ResponseDeck(() => 0);
  for (const topic of Object.keys(responses) as (keyof typeof responses)[]) {
    expect(responses[topic].length).toBeGreaterThanOrEqual(4);
    const first = deck.pick(topic), second = deck.pick(topic);
    expect(first).not.toBe(second);
    expect(responses[topic]).toContain(first);
    expect(responses[topic]).toContain(second);
  }
});
