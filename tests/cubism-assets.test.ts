import { expect, it } from 'vitest';
import { checkCubismResources, modelFileUrl } from '../src/renderer/live2d/modelAssets';

const manifest = {
  Version: 3,
  FileReferences: {
    Moc: 'Changli.moc3',
    Textures: ['textures/texture_00.png'],
    Physics: 'Changli.physics3.json',
    Expressions: [{ Name: 'smile', File: 'exp/smile.exp3.json' }],
    Motions: { Idle: [{ File: 'motions/idle.motion3.json' }] },
  },
};
const fixtureResponse = (url: URL | RequestInfo) =>
  String(url).endsWith('.model3.json')
    ? new Response(JSON.stringify(manifest), { headers: { 'content-type': 'application/json' } })
    : new Response(String(url).endsWith('.moc3') ? new Uint8Array([77, 79, 67, 51, 0]) : 'fixture');

it('检查真实 Cubism 模型的入口、moc、贴图、表情和动作资源', async () => {
  const seen: string[] = [];
  const fetcher = async (url: URL | RequestInfo) => {
    seen.push(String(url));
    return fixtureResponse(url);
  };
  const result = await checkCubismResources('live/Changli.model3.json', fetcher);
  expect(result.ok).toBe(true);
  expect(seen).toContain('/models/changli/live/Changli.moc3');
  expect(seen).toContain('/models/changli/live/textures/texture_00.png');
  expect(seen).toContain('/models/changli/live/motions/idle.motion3.json');
});

it('缺失模型或任一引用资源不会误判为可用', async () => {
  expect((await checkCubismResources(null)).ok).toBe(false);
  const fetcher = async (url: URL | RequestInfo) =>
    String(url).endsWith('.moc3') ? ({ ok: false, status: 404 } as Response) : fixtureResponse(url);
  const result = await checkCubismResources('live/Changli.model3.json', fetcher);
  expect(result).toMatchObject({ ok: false });
  if (!result.ok) expect(result.reason).toContain('Changli.moc3');
});

it('缺少可选表情、动作和 physics 时仍加载核心模型', async () => {
  const fetcher = async (url: URL | RequestInfo) =>
    /\.motion3\.json$|\.exp3\.json$|\.physics3\.json$/.test(String(url))
      ? ({ ok: false, status: 404 } as Response)
      : fixtureResponse(url);
  const result = await checkCubismResources('live/Changli.model3.json', fetcher);
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.warnings).toHaveLength(3);
    expect(result.manifest.FileReferences.Physics).toBeUndefined();
    expect(result.manifest.FileReferences.Expressions).toEqual([]);
    expect(result.manifest.FileReferences.Motions?.Idle).toEqual([]);
  }
});

it('拒绝模型引用外部网址或越界路径', () => {
  expect(() => modelFileUrl('live/Changli.model3.json', '../escape.png')).toThrow();
  expect(() => modelFileUrl('live/Changli.model3.json', 'https://host/texture.png')).toThrow();
  expect(() => modelFileUrl('live/Changli.model3.json', '/texture.png')).toThrow();
});

it('Vite 页面回退不能冒充 Cubism 二进制资源', async () => {
  const fetcher = async (url: URL | RequestInfo) =>
    String(url).endsWith('.moc3')
      ? new Response('<!doctype html><title>app fallback</title>', {
          headers: { 'content-type': 'text/html' },
        })
      : fixtureResponse(url);
  const result = await checkCubismResources('live/Changli.model3.json', fetcher);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.reason).toContain('HTML');
});

it('Tauri 将未知扩展名标为 HTML 时仍识别真实 MOC3 字节', async () => {
  const fetcher = async (url: URL | RequestInfo) =>
    String(url).endsWith('.moc3')
      ? new Response(new Uint8Array([77, 79, 67, 51, 0]), {
          headers: { 'content-type': 'text/html' },
        })
      : fixtureResponse(url);
  expect((await checkCubismResources('live/Changli.model3.json', fetcher)).ok).toBe(true);
});

it('HTTP 200 和二进制 MIME 不能让无效 MOC3 混过检查', async () => {
  const fetcher = async (url: URL | RequestInfo) =>
    String(url).endsWith('.moc3')
      ? new Response('<html>fallback</html>', {
          headers: { 'content-type': 'application/octet-stream' },
        })
      : fixtureResponse(url);
  const result = await checkCubismResources('live/Changli.model3.json', fetcher);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.reason).toContain('不是 MOC3');
});
