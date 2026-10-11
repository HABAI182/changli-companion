import { invoke, isTauri } from '@tauri-apps/api/core';
import { initialData, parseData, type Data } from './domain';
export const native = isTauri();
const key = 'changli-companion-v1';
type Snapshot = { revision: number; json: string | null };
export class Repository {
  private queue: Promise<unknown> = Promise.resolve();
  async read(): Promise<Data> {
    const s = await this.snapshot();
    return s.json ? parseData(s.json) : initialData();
  }
  private async snapshot(): Promise<Snapshot> {
    if (native) return invoke('load_data');
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : { revision: 0, json: null };
  }
  update(fn: (data: Data) => void): Promise<Data> {
    const run = async () => {
      for (let attempt = 0; attempt < 6; attempt++) {
        const s = await this.snapshot();
        const data = s.json ? parseData(s.json) : initialData();
        fn(data);
        const next = { revision: s.revision + 1, json: JSON.stringify(data) };
        if (native) {
          if (!(await invoke<boolean>('save_data', { expected: s.revision, json: next.json })))
            continue;
        } else localStorage.setItem(key, JSON.stringify(next));
        window.dispatchEvent(new Event('companion-data'));
        return data;
      }
      throw Error('数据正在被另一窗口更新，请重试');
    };
    const locked = async (): Promise<Data> =>
      !native && navigator.locks ? await navigator.locks.request(key, run) : await run();
    const result = this.queue.then(locked, locked);
    this.queue = result.catch(() => {});
    return result;
  }
}
export const repository = new Repository();
