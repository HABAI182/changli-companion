import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { expect, it } from 'vitest';
import manifest from '../public/models/changli/model.json';
import { CubismModelMatrix } from '../vendor/live2d/src/math/cubismmodelmatrix';

it('默认模型留边由实际 SDK 矩阵生效，居中坐标不另加画布偏移', () => {
  const entry = resolve('public/models/changli', manifest.renderer.live2d.entry);
  const config = JSON.parse(readFileSync(entry, 'utf8'));
  const matrix = new CubismModelMatrix(1, 1);
  matrix.setupFromLayout(new Map(Object.entries(config.Layout) as [string, number][]));
  // The authored side hair extends to x=-0.545 of the source canvas.
  // The old uppercase Width key was ignored and clipped it at scale 2.
  expect(matrix.transformX(-0.545)).toBeCloseTo(-0.9265);
  expect(matrix.transformX(0)).toBe(0);
  expect(matrix.transformY(0)).toBe(0);
  expect(matrix.transformY(0.5)).toBeCloseTo(0.85);
});

it('当前桌宠入口拥有完整资源，输入映射指向存在的动作与表情', () => {
  const entry = resolve('public/models/changli', manifest.renderer.live2d.entry);
  const root = dirname(entry);
  const config = JSON.parse(readFileSync(entry, 'utf8'));
  const refs = config.FileReferences;
  const files = [
    refs.Moc,
    ...refs.Textures,
    refs.DisplayInfo,
    refs.Physics,
    ...refs.Expressions.map((r: { File: string }) => r.File),
    ...Object.values(refs.Motions).flatMap((rows) =>
      (rows as { File: string }[]).map((r) => r.File),
    ),
  ];
  for (const file of files) expect(existsSync(resolve(root, file)), file).toBe(true);
  expect(readFileSync(resolve(root, refs.Moc)).subarray(0, 4).toString()).toBe('MOC3');
  for (const mapped of Object.values(manifest.renderer.live2d.motionMap)) {
    const [group, index] = mapped.split('/');
    expect(refs.Motions[group]?.[Number(index)], mapped).toBeDefined();
  }
  for (const mapped of Object.values(manifest.renderer.live2d.expressionMap))
    expect(
      refs.Expressions.some((r: { Name: string }) => r.Name === mapped),
      mapped,
    ).toBe(true);
  const display = JSON.parse(readFileSync(resolve(root, refs.DisplayInfo), 'utf8'));
  const parameters = new Set(display.Parameters.map((row: { Id: string }) => row.Id));
  const physics = JSON.parse(readFileSync(resolve(root, refs.Physics), 'utf8'));
  expect(physics.Meta.PhysicsSettingCount).toBe(physics.PhysicsSettings.length);
  const destinations: string[] = [];
  for (const setting of physics.PhysicsSettings) {
    for (const input of setting.Input)
      expect(parameters.has(input.Source.Id), input.Source.Id).toBe(true);
    for (const output of setting.Output) {
      expect(parameters.has(output.Destination.Id), output.Destination.Id).toBe(true);
      destinations.push(output.Destination.Id);
    }
  }
  expect(new Set(destinations).size).toBe(destinations.length);
});
