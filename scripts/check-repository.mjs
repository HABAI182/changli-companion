// File/reference verification only; does not claim Core, WebGL or native acceptance.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = process.argv.includes('--dist');
const publicRoot = resolve(root, output ? 'dist' : 'public');
const checked = new Set();
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
function dependency(base, name) {
  assert.equal(typeof name, 'string', 'Asset reference must be a string');
  assert.ok(name && !name.includes('\\') && !name.includes(':') && !name.startsWith('/'), 'Invalid asset reference');
  const path = realpathSync(resolve(base, name));
  const rel = relative(publicRoot, path);
  assert.ok(rel && rel !== '..' && !rel.startsWith(`..${sep}`), 'Asset must stay in the public root');
  assert.ok(statSync(path).isFile(), 'Asset reference must identify a file');
  checked.add(path);
  return path;
}
const modelRoot = resolve(publicRoot, 'models/changli');
const manifest = json(dependency(modelRoot, 'model.json'));
const model = dependency(modelRoot, manifest.renderer.live2d.entry);
const refs = json(model).FileReferences;
assert.ok(refs && typeof refs === 'object' && !Array.isArray(refs), 'Missing FileReferences');
assert.ok(refs.Moc && Array.isArray(refs.Textures) && refs.Textures.length, 'Missing MOC3/textures');
const modelFolder = dirname(model);
for (const key of ['Moc', 'Physics', 'Pose', 'UserData', 'DisplayInfo']) {
  if (refs[key] !== undefined) dependency(modelFolder, refs[key]);
}
for (const texture of refs.Textures) dependency(modelFolder, texture);
for (const expression of refs.Expressions ?? []) dependency(modelFolder, expression.File);
for (const motions of Object.values(refs.Motions ?? {})) {
  assert.ok(Array.isArray(motions), 'Motion group must be an array');
  for (const motion of motions) {
    dependency(modelFolder, motion.File);
    if (motion.Sound) dependency(modelFolder, motion.Sound);
  }
}
// Resolve references in fallback/layer manifests and config without interpreting prose fields.
function resources(value, base) {
  if (typeof value === 'string' && /\.(?:png|jpe?g|webp|svg|wav|mp3|ogg)$/i.test(value)) {
    dependency(base, value);
  } else if (Array.isArray(value)) {
    value.forEach((child) => resources(child, base));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((child) => resources(child, base));
  }
}
resources(manifest, modelRoot);
const layerManifest = dependency(modelRoot, manifest.renderer.layered.manifest);
// The layered renderer resolves its asset paths from modelRoot, not the JSON folder.
resources(json(layerManifest), modelRoot);
dependency(publicRoot, 'vendor/live2d/live2dcubismcore.min.js');
if (!output) {
  const config = json(resolve(root, 'src-tauri/tauri.conf.json'));
  for (const icon of config.bundle.icon) assert.ok(statSync(resolve(root, 'src-tauri', icon)).isFile());
  const allowed = json(resolve(root, 'scripts/authoring-allowlist.json')).files;
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  for (const name of tracked.filter((name) => /\.(?:cmo3|psd)$/i.test(name))) {
    const item = allowed.find((row) => row.path === name);
    assert.ok(item, `New authoring source requires private storage/review: ${name}`);
    assert.equal(createHash('sha256').update(readFileSync(resolve(root, name))).digest('hex'), item.sha256,
      `Grandfathered source bytes changed: ${name}`);
  }
}
console.log(JSON.stringify({ scope: output ? 'dist files' : 'tracked source and public files',
  runtimeFilesVerified: checked.size, webglRendered: false, nativeDesktopVerified: false }));
