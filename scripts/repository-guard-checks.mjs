// Minimal original fixtures; no real character model or native export is produced.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'changli-file-guard-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (name, value) => {
    const path = join(root, name);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, typeof value === 'object' ? JSON.stringify(value) : value);
  };
  mkdirSync(join(root, 'scripts'));
  copyFileSync(new URL('./check-repository.mjs', import.meta.url), join(root, 'scripts/check-repository.mjs'));
  put('scripts/authoring-allowlist.json', { files: [] });
  put('src-tauri/tauri.conf.json', { bundle: { icon: ['icons/test.ico'] } });
  put('src-tauri/icons/test.ico', 'file-only icon fixture');
  put('public/models/changli/model.json', {
    renderer: { live2d: { entry: 'current/pet.model3.json' }, layered: { manifest: 'assets/layers.json' } },
  });
  const model = { FileReferences: { Moc: 'pet.moc3', Textures: ['texture.png'] } };
  put('public/models/changli/current/pet.model3.json', model);
  put('public/models/changli/current/pet.moc3', 'not a real MOC3; file-reference fixture only');
  put('public/models/changli/current/texture.png', 'not real art; file-reference fixture only');
  put('public/models/changli/assets/layers.json', {});
  put('public/vendor/live2d/live2dcubismcore.min.js', '// file presence fixture only');
  execFileSync('git', ['init', '-q'], { cwd: root });
  const run = () => spawnSync(process.execPath, ['scripts/check-repository.mjs'], { cwd: root, encoding: 'utf8' });
  return { root, put, model, run };
}

test('complete file fixture succeeds without claiming rendering', (t) => {
  const f = fixture(t);
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).webglRendered, false);
});
test('missing runtime texture fails', (t) => {
  const f = fixture(t);
  f.model.FileReferences.Textures = ['missing.png'];
  f.put('public/models/changli/current/pet.model3.json', f.model);
  assert.notEqual(f.run().status, 0);
});
test('runtime reference cannot escape the public root', (t) => {
  const f = fixture(t);
  f.put('private.png', 'must never enter a public runtime');
  f.model.FileReferences.Textures = ['../../../../private.png'];
  f.put('public/models/changli/current/pet.model3.json', f.model);
  const result = f.run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Asset must stay in the public root/);
});
test('new tracked editable source is blocked', (t) => {
  const f = fixture(t);
  f.put('authoring/new.cmo3', 'not a real model; upload guard fixture');
  execFileSync('git', ['add', 'authoring/new.cmo3'], { cwd: f.root });
  const result = f.run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /New authoring source requires private storage/);
});
test('grandfathered source cannot silently change bytes', (t) => {
  const f = fixture(t);
  f.put('authoring/known.cmo3', 'changed fixture bytes');
  f.put('scripts/authoring-allowlist.json', { files: [{ path: 'authoring/known.cmo3', sha256: '0'.repeat(64) }] });
  execFileSync('git', ['add', 'authoring/known.cmo3'], { cwd: f.root });
  const result = f.run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Grandfathered source bytes changed/);
});
