import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => false, invoke: vi.fn() }));
import { Repository } from '../src/storage';
import { addTodo, initialData, parseData } from '../src/domain';
const memory = new Map<string, string>();
beforeEach(() => {
  memory.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => memory.set(k, v),
  });
  vi.stubGlobal('window', { dispatchEvent: vi.fn() });
  vi.stubGlobal('navigator', {});
});
it('Repository 写入后新实例读取，连续更新不丢失', async () => {
  const repo = new Repository();
  await Promise.all([
    repo.update((d) => addTodo(d, '第一件事', 0, 'a')),
    repo.update((d) => addTodo(d, '第二件事', 0, 'b')),
  ]);
  const restored = await new Repository().read();
  expect(restored.todos.map((t) => t.text)).toEqual(['第一件事', '第二件事']);
  await repo.update((d) => {
    d.todos[0].done = true;
    d.priority = 'b';
  });
  expect((await new Repository().read()).todos[0].done).toBe(true);
});
it('存储失败向上层报错，不能显示保存成功', async () => {
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem: () => {
      throw Error('QuotaExceeded');
    },
  });
  await expect(new Repository().update((d) => addTodo(d, 'test', 0, 'a'))).rejects.toThrow(
    'QuotaExceeded',
  );
});
it('旧设置补入渲染与气泡默认值，新设置可序列化', () => {
  const old = initialData();
  const legacy = JSON.parse(JSON.stringify(old));
  delete legacy.settings.rendererMode;
  delete legacy.settings.bubblesEnabled;
  expect(parseData(JSON.stringify(legacy)).settings.rendererMode).toBe('auto');
  old.settings.rendererMode = 'layered2d';
  old.settings.bubblesEnabled = false;
  expect(parseData(JSON.stringify(old)).settings).toMatchObject({
    rendererMode: 'layered2d',
    bubblesEnabled: false,
  });
});
