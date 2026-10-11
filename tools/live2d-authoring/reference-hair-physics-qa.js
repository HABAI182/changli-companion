// Exercise the exact native Editor physics export through the official SDK.
export async function createReferenceHairPhysics({ version, root, manifest, model, core, ppu, ids, neutral, repaired, pose, area, draw }) {
  const { CubismPhysics } = await import('/vendor/live2d/src/physics/cubismphysics.ts');
  const filename = manifest.FileReferences.Physics;
  if (!filename) throw Error('Native physics reference missing');
  const response = await fetch(root + filename);
  if (!response.ok) throw Error('Native physics fetch failed');
  const bytes = await response.arrayBuffer();
  const settings = JSON.parse(new TextDecoder().decode(bytes));
  const expected = version >= 52 ? { ParamBangCenterSway: .65, ParamSideHairRightSway: .50, ParamSideHairLeftSway: .18, ParamHairSide: .45, ParamOrnamentLeftSway: .55 } : version >= 51 ? { ParamBangCenterSway: .65, ParamSideHairRightSway: .50, ParamSideHairLeftSway: .18, ParamHairSide: .45 } : version >= 28 ? { ParamBangCenterSway: .65, ParamSideHairRightSway: .50, ParamSideHairLeftSway: .18 }
    : { ParamBangCenterSway: .025, ParamSideHairRightSway: .020, ParamSideHairLeftSway: .022 };
  const outputs = settings.PhysicsSettings.flatMap(s => s.Output);
  const configPass = settings.Meta.Fps === 60 && settings.Meta.PhysicsSettingCount === 1 &&
    settings.Meta.PhysicsDictionary[0].Name === 'ReferenceHairInertia' && outputs.length === (version >= 52 ? 5 : version >= 51 ? 4 : 3) &&
    outputs.every(o => expected[o.Destination.Id] === o.Scale && o.Weight === 100 && o.VertexIndex === 1);
  let physics;
  const reset = () => {
    physics?.release();
    physics = CubismPhysics.create(bytes, bytes.byteLength);
    if (!physics) throw Error('SDK rejected native physics');
    pose(model);
    physics.stabilization(model);
    model.update();
  };
  reset();
  // The v57 tail backfill is a native child of SideHairLeftSwing, like ArtMesh31.
  // It must move under that physics output; the Root keyboard must stay fixed.
  const affected = ['ArtMesh27', 'ArtMesh31', 'ArtMesh35', 'ArtMesh39', ...(version >= 51 ? ['ArtMesh3'] : []), ...(version >= 52 ? ['ArtMesh38'] : []), ...(version >= 57 ? ['ArtMesh55'] : []), ...(version >= 58 ? ['ArtMesh57','ArtMesh58'] : [])];
  function step(params, deltaSeconds = 1 / 60, render = false) {
    const without = pose(model, params);
    physics.evaluate(model, deltaSeconds);
    model.update();
    const values = Object.fromEntries(Object.keys(expected).map(id => [id, core.parameters.values[core.parameters.ids.indexOf(id)]]));
    let flips = 0, degenerate = 0, nonFinite = 0, unrelatedMaxPixels = 0;
    const movement = {};
    for (let i = 0; i < ids.length; i++) {
      const p = core.drawables.vertexPositions[i];
      nonFinite += [...p].filter(v => !Number.isFinite(v)).length;
      const change = Math.max(...p.map((v, k) => Math.abs(v - without[i][k]) * ppu));
      if (affected.includes(ids[i])) movement[ids[i]] = change;
      else unrelatedMaxPixels = Math.max(unrelatedMaxPixels, change);
      if (!repaired.includes(ids[i])) continue;
      const triangles = core.drawables.indices[i];
      for (let k = 0; k < triangles.length; k += 3) {
        const indices = triangles.slice(k, k + 3);
        const current = area(p, ...indices), baseline = area(neutral[i], ...indices);
        if (current * baseline < 0) flips++;
        if (Math.abs(current) < 1e-12) degenerate++;
      }
    }
    nonFinite += Object.values(values).filter(v => !Number.isFinite(v)).length;
    if (render) draw();
    return { values, movement, flips, degenerate, nonFinite, unrelatedMaxPixels };
  }
  function validate() {
    reset();
    const ranges = Object.fromEntries(Object.keys(expected).map(id => [id, { min: Infinity, max: -Infinity }]));
    const movementMaxPixels = Object.fromEntries(affected.map(id => [id, 0]));
    let flips = 0, degenerate = 0, nonFinite = 0, unrelatedMaxPixels = 0, settleMax = 0, reboundPeak = 0;
    const trace = [];
    for (let frame = 0; frame < 1200; frame++) {
      const t = frame / 60;
      const angle = frame < 240 ? 28 * Math.sin(t * 2.2) : frame < 300 ? 30 : frame < 360 ? -30 : frame < 480 ? 30 : 0;
      const params = { ParamAngleX: frame < 240 ? 25 * Math.sin(t * 3) : 0, ParamAngleZ: angle,
        ParamEyeLOpen: (1 + Math.cos(t * 5)) / 2, ParamEyeROpen: (1 + Math.cos(t * 5 + .3)) / 2 };
      const r = step(params);
      flips += r.flips; degenerate += r.degenerate; nonFinite += r.nonFinite;
      unrelatedMaxPixels = Math.max(unrelatedMaxPixels, r.unrelatedMaxPixels);
      for (const [id, value] of Object.entries(r.values)) {
        ranges[id].min = Math.min(ranges[id].min, value); ranges[id].max = Math.max(ranges[id].max, value);
        if (frame >= 480 && frame < 540) reboundPeak = Math.max(reboundPeak, Math.abs(value));
        if (frame >= 1080) settleMax = Math.max(settleMax, Math.abs(value));
      }
      for (const [id, value] of Object.entries(r.movement)) movementMaxPixels[id] = Math.max(movementMaxPixels[id], value);
      if (frame % 30 === 0 || frame === 479 || frame === 480 || frame === 1199)
        trace.push({ frame, time: t, angle, values: r.values });
    }
    pose(model); draw();
    return { nativeEditorExport: true, filename, configPass, physicsEnabled: true, fps: 60,
      simulatedFrames: 1200, simulatedSeconds: 20, ranges, movementMaxPixels, unrelatedMaxPixels,
      reboundPeak, settleMax, flips, degenerate, nonFinite, trace,
      pass: configPass && flips === 0 && degenerate === 0 && nonFinite === 0 && unrelatedMaxPixels < .001 &&
        Object.values(ranges).every(r => r.max - r.min > .05 && Math.max(Math.abs(r.min), Math.abs(r.max)) < .99) &&
        Object.values(movementMaxPixels).every(v => v > .05) && reboundPeak > .01 && settleMax < .001 };
  }
  return { settings, reset, step, validate, release: () => physics?.release() };
}
