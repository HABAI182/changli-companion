export const responses = {
  head: ['嗯？在听。', '又被你发现了。', '轻一点，发饰会乱。', '这样就很安心。', '好啦，再摸一下。', '今日也请多关照。'],
  body: ['我陪着你。', '不必着急，一件一件来。', '歇一会儿也无妨。', '手边的事，我替你看着。', '累了就靠过来吧。', '这一刻，倒也清静。'],
  phoenix: ['小家伙，也来打个招呼。', '它今天精神很好呢。', '尾羽别碰到键盘。', '别闹，让它站稳些。', '看，它也很喜欢你。', '这点火光，留给你。'],
  drag: ['就待在这里？好。', '找到合适的位置了。', '慢些，我的发饰。', '换个地方，继续陪你。'],
  wake: ['我醒着，继续吧。', '方才小憩了一会儿。', '你回来了。', '嗯，又有事情要忙了？'],
  typing: ['落字有声，我听着呢。', '慢慢写，不必赶。', '这一段，似乎很顺利。', '思路清楚了？那便继续。'],
  idle: ['窗外的风，似乎慢了些。', '喝口水吧。', '有我在，不必时时赶路。', '稍作停留，也很好。', '安静的时候，我也在。', '把肩膀放松些。'],
} as const;
export type ResponseTopic = keyof typeof responses;

// Only the previous choice is kept; no typed text or input history is stored.
export class ResponseDeck {
  private previous = new Map<ResponseTopic, number>();
  constructor(private random: () => number = Math.random) {}
  pick(topic: ResponseTopic): string {
    const lines = responses[topic], old = this.previous.get(topic);
    const candidates = lines.map((_, i) => i).filter(i => i !== old);
    const index = candidates[Math.min(candidates.length - 1, Math.max(0, Math.floor(this.random() * candidates.length)))];
    this.previous.set(topic, index);
    return lines[index];
  }
}
