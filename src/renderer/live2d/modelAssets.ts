import { modelRoot, resource } from '../../model';

export interface CubismModelJson {
  Version?: number;
  Layout?: Record<string, number>;
  FileReferences: {
    Moc: string;
    Textures: string[];
    Physics?: string;
    Pose?: string;
    UserData?: string;
    Expressions?: { Name: string; File: string }[];
    Motions?: Record<string, { File: string }[]>;
  };
}

export type CubismPreflight =
  | {
      ok: true;
      entryUrl: string;
      manifest: CubismModelJson;
      resources: string[];
      warnings: string[];
    }
  | { ok: false; reason: string };

export function modelFileUrl(entry: string, file: string): string {
  if (
    !file ||
    file.includes('..') ||
    file.includes('\\') ||
    file.includes(':') ||
    file.startsWith('/') ||
    file.includes('?') ||
    file.includes('#')
  )
    throw Error('Cubism 资源路径必须位于模型目录内');
  const parent = entry.slice(0, entry.lastIndexOf('/') + 1);
  const url = resource(parent + file);
  if (!url.startsWith(modelRoot)) throw Error('Cubism 资源越界');
  return url;
}

export async function checkCubismResources(
  entry: string | null,
  fetchFile: typeof fetch = fetch,
): Promise<CubismPreflight> {
  if (!entry) return { ok: false, reason: '缺少 .model3.json 模型入口' };
  if (!entry.endsWith('.model3.json')) return { ok: false, reason: '模型入口不是 .model3.json' };
  try {
    const entryUrl = resource(entry);
    const response = await fetchFile(entryUrl);
    if (!response.ok) return { ok: false, reason: `模型入口读取失败（${response.status}）` };
    if (response.headers?.get('content-type')?.includes('text/html'))
      return { ok: false, reason: '模型入口返回页面而非 model3.json' };
    const manifest = (await response.json()) as CubismModelJson;
    const refs = manifest?.FileReferences;
    if (
      !refs ||
      !refs.Moc?.endsWith('.moc3') ||
      !Array.isArray(refs.Textures) ||
      !refs.Textures.length
    )
      return { ok: false, reason: 'model3.json 缺少 Moc 或贴图引用' };
    const warnings: string[] = [];
    const resources: string[] = [];
    const available = async (file: string): Promise<'ok' | 'missing' | 'html' | 'invalid'> => {
      const url = modelFileUrl(entry, file);
      const asset = await fetchFile(url);
      if (!asset.ok) return 'missing';
      // Tauri's asset protocol guesses unknown extensions as text/html.
      // MOC3 must be checked by its bytes rather than trusting that MIME guess;
      // CubismMoc.create subsequently verifies the actual model structure.
      if (file.endsWith('.moc3')) {
        const bytes = new Uint8Array(await asset.arrayBuffer());
        if (
          bytes.length < 4 ||
          bytes[0] !== 77 ||
          bytes[1] !== 79 ||
          bytes[2] !== 67 ||
          bytes[3] !== 51
        )
          return asset.headers?.get('content-type')?.includes('text/html') ? 'html' : 'invalid';
      } else if (asset.headers?.get('content-type')?.includes('text/html')) return 'html';
      resources.push(url);
      return 'ok';
    };
    for (const file of [refs.Moc, ...refs.Textures]) {
      const status = await available(file);
      if (status !== 'ok')
        return {
          ok: false,
          reason: `模型核心资源${status === 'html' ? '返回 HTML 页面' : status === 'invalid' ? '不是 MOC3 二进制' : '缺失'}：${modelFileUrl(entry, file)}`,
        };
    }
    const checked = { ...refs };
    for (const field of ['Physics', 'Pose', 'UserData'] as const) {
      const file = checked[field];
      if (file && (await available(file)) !== 'ok') {
        warnings.push(`可选资源缺失：${modelFileUrl(entry, file)}`);
        delete checked[field];
      }
    }
    checked.Expressions = [];
    for (const expression of refs.Expressions || []) {
      if ((await available(expression.File)) === 'ok') checked.Expressions.push(expression);
      else warnings.push(`可选表情缺失：${modelFileUrl(entry, expression.File)}`);
    }
    checked.Motions = {};
    for (const [group, motions] of Object.entries(refs.Motions || {})) {
      checked.Motions[group] = [];
      for (const motion of motions) {
        if ((await available(motion.File)) === 'ok') checked.Motions[group].push(motion);
        else warnings.push(`可选动作缺失：${modelFileUrl(entry, motion.File)}`);
      }
    }
    return {
      ok: true,
      entryUrl,
      manifest: { ...manifest, FileReferences: checked },
      resources: [...new Set(resources)],
      warnings,
    };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
