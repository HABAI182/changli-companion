import { describe, it, expect } from 'vitest';
import {
  CharacterMachine,
  startSession,
  remaining,
  formatRemaining,
  pause,
  resume,
  initialData,
  settle,
  localDay,
  addTodo,
  parseData,
} from '../src/domain';
describe('动作优先级与恢复', () => {
  it('快速输入升级而同类输入不重启动画', () => {
    const m = new CharacterMachine(0);
    m.signal('key', 2000);
    const started = m.started;
    m.signal('key', 2050);
    expect(m.started).toBe(started);
    [2100, 2150, 2200].forEach((t) => m.signal('key', t));
    expect(m.pose).toBe('rapid');
    m.tick(2700);
    expect(m.pose).toBe('idle');
  });
  it('左右手交替信号', () => {
    const m = new CharacterMachine(0);
    m.signal('key', 2000);
    expect(m.hand).toBe(1);
    m.signal('key', 2100);
    expect(m.hand).toBe(0);
  });
  it('庆祝不会被高速输入、思考或喝茶覆盖', () => {
    const m = new CharacterMachine(0);
    m.signal('complete', 2000);
    m.signal('enter', 2100);
    m.signal('backspace', 2200);
    m.signal('key', 2300);
    expect(m.pose).toBe('celebrate');
    m.tick(3501);
    expect(m.pose).toBe('idle');
  });
  it('喝茶可被输入打断，一段空闲只喝一次', () => {
    const m = new CharacterMachine(0);
    m.tick(60001);
    expect(m.pose).toBe('tea');
    m.tick(63000);
    m.tick(64000);
    expect(m.pose).toBe('idle');
    m.signal('key', 65000);
    m.tick(125001);
    expect(m.pose).toBe('tea');
    m.signal('enter', 125002);
    expect(m.pose).toBe('stamp');
  });
  it('休息后鼠标移动唤醒且限幅', () => {
    const m = new CharacterMachine(0);
    m.tick(180001);
    expect(m.pose).toBe('sleep');
    m.signal('move', 180002, 100, -100);
    expect(m.pose).toBe('mouse');
    expect(m.gaze).toEqual({ x: 1, y: -1 });
  });
  it('摸头冷却不反复触发', () => {
    const m = new CharacterMachine(0);
    m.signal('pet', 2000);
    m.tick(3400);
    m.signal('pet', 3500);
    expect(m.pose).toBe('idle');
    m.signal('pet', 5100);
    expect(m.pose).toBe('blush');
  });
  it('长时间无 tick 后恢复，不停留在结束的动作', () => {
    const m = new CharacterMachine(0);
    m.signal('enter', 2000);
    m.tick(200000);
    expect(m.pose).toBe('sleep');
  });
});
describe('时间戳会话', () => {
  it('暂停时间不计入，重复暂停/继续幂等', () => {
    const s = startSession(25, 1000, 'a');
    const p = pause(s, 61000);
    expect(remaining(p, 500000)).toBe(1440000);
    expect(pause(p, 600000)).toEqual(p);
    const r = resume(p, 600000);
    expect(r.deadline).toBe(2040000);
    expect(resume(r, 700000)).toEqual(r);
  });
  it('重启与休眠按经过时间结算一次', () => {
    const d = initialData();
    d.session = startSession(25, 1000, 'sleep');
    const restored = parseData(JSON.stringify(d));
    expect(settle(restored, 99999999)).toBe(true);
    expect(settle(restored, 99999999)).toBe(false);
    expect(restored.records).toHaveLength(1);
    expect(restored.records[0].minutes).toBe(25);
  });
  it('完成记录已有时不重复写入', () => {
    const d = initialData();
    const s = startSession(1, 0, 'same');
    d.session = s;
    settle(d, 60001);
    d.session = s;
    expect(settle(d, 70000)).toBe(false);
    expect(d.records).toHaveLength(1);
    expect(d.session).toBeNull();
  });
  it('取消与暂停均不结算', () => {
    const d = initialData();
    d.session = pause(startSession(1, 0, 'a'), 1000);
    expect(settle(d, 900000)).toBe(false);
    d.session = null;
    expect(settle(d, 900000)).toBe(false);
    expect(d.records).toHaveLength(0);
  });
  it('跨日按本地完成时间记录，不按重新打开时间', () => {
    const d = initialData();
    const start = new Date(2026, 8, 24, 23, 50).getTime();
    d.session = startSession(25, start, 'midnight');
    settle(d, start + 86400000);
    expect(d.records[0].day).toBe('2026-09-25');
  });
  it('结束边界精确，不提前完成', () => {
    const d = initialData();
    d.session = startSession(1, 0, 'edge');
    expect(settle(d, 59999)).toBe(false);
    expect(settle(d, 60000)).toBe(true);
  });
  it('拒绝非法时长', () => {
    [0, -1, NaN, Infinity, 241].forEach((v) => expect(() => startSession(v, 0, 'bad')).toThrow());
  });
  it('分钟进位与亚秒显示正确', () => {
    expect(formatRemaining(59999)).toBe('01:00');
    expect(formatRemaining(60001)).toBe('01:01');
    expect(formatRemaining(0)).toBe('00:00');
  });
});
describe('本地持久化数据', () => {
  it('中文待办、设置、优先项、暂停会话可序列化恢复', () => {
    const d = initialData();
    addTodo(d, ' 整理「离火长明」的中文资料 ', Date.now(), 'todo');
    d.priority = 'todo';
    d.todos[0].done = true;
    d.settings.motion = 'low';
    d.session = pause(startSession(45, 0, 's'), 2000);
    const r = parseData(JSON.stringify(d));
    expect(r).toEqual(d);
    expect(r.todos[0].text).toBe('整理「离火长明」的中文资料');
    r.todos[0].done = false;
    expect(r.todos[0].done).toBe(false);
  });
  it('空待办与超长内容不写入', () => {
    const d = initialData();
    expect(() => addTodo(d, '   ', 0, 'x')).toThrow();
    expect(() => addTodo(d, '长'.repeat(501), 0, 'x')).toThrow();
    expect(d.todos).toHaveLength(0);
  });
  it('损坏/未知数据显式报错，不静默重置', () => {
    expect(() => parseData('{broken')).toThrow();
    expect(() => parseData('{"version":2}')).toThrow();
  });
  it('本地日期不依赖 UTC 截断', () => {
    const time = new Date(2026, 8, 24, 0, 1).getTime();
    expect(localDay(time)).toBe('2026-09-24');
  });
});
