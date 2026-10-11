// Compare an official native export with the previously passed native export.
// No MOC3, mesh, or texture bytes are altered by this authoring-only inspector.
export async function checkHairRoot({ model, core, ids, ppu, report, CubismMoc, pose, area }) {
  const baselineMoc = CubismMoc.create(await (await fetch('/models/changli/live-reference-repair-v28-candidate/ChangliReferenceRepairV28.moc3')).arrayBuffer(), true);
  if (!baselineMoc) throw Error('Core rejected v28 baseline');
  const baselineModel = baselineMoc.createModel(), baseline = baselineModel.getModel();
  const neutral = pose(model), oldIds = [...baseline.drawables.ids], join = ids.indexOf('ArtMesh47');
  if (join < 0) throw Error('Native ArtMesh47 hair-root patch not exported');
  const same = (a, b) => JSON.stringify([...a]) === JSON.stringify([...b]);
  const parameterIdentity = ['ids', 'minimumValues', 'maximumValues', 'defaultValues'].every(k => same(core.parameters[k], baseline.parameters[k]));
  const topology = oldIds.map(id => {
    const i = ids.indexOf(id), j = oldIds.indexOf(id);
    return { id, pass: i >= 0 && same(core.drawables.indices[i], baseline.drawables.indices[j]) &&
      same(core.drawables.vertexUvs[i], baseline.drawables.vertexUvs[j]) && core.drawables.textureIndices[i] === baseline.drawables.textureIndices[j] &&
      core.drawables.constantFlags[i] === baseline.drawables.constantFlags[j] &&
      same([...core.drawables.masks[i]].map(k => ids[k]), [...baseline.drawables.masks[j]].map(k => oldIds[k])) };
  });
  const states = [{}];
  for (let i = 0; i < core.parameters.count; i++) for (const value of [core.parameters.minimumValues[i], core.parameters.maximumValues[i]]) states.push({ [core.parameters.ids[i]]: value });
  for (const angle of [-30, 0, 30]) for (let n = 0; n <= 100; n++) states.push({
    ParamAngleZ: angle, ParamEyeLOpen: n / 100, ParamEyeROpen: 1 - n / 100,
    ParamEyeBallX: n / 50 - 1, ParamEyeBallY: 1 - n / 50, ParamBangCenterSway: n / 50 - 1,
    ParamSideHairLeftSway: 1 - n / 50, ParamSideHairRightSway: n / 50 - 1,
    ParamHandLeftPress: n * .3, ParamHandRightPress: 30 - n * .3, ParamMouthOpenY: n / 100 });
  const samples = states.map(params => {
    const current = pose(model, params), previous = pose(baselineModel, params);
    let positionMaxPixels = 0, opacityMax = 0, drawOrderMax = 0, flips = 0, degenerate = 0, nonFinite = 0;
    const meshIssues = [];
    for (let i = 0; i < ids.length; i++) {
      nonFinite += current[i].filter(v => !Number.isFinite(v)).length;
      const j = oldIds.indexOf(ids[i]);
      if (j >= 0) {
        for (let k = 0; k < current[i].length; k++) positionMaxPixels = Math.max(positionMaxPixels, Math.abs(current[i][k] - previous[j][k]) * ppu);
        opacityMax = Math.max(opacityMax, Math.abs(core.drawables.opacities[i] - baseline.drawables.opacities[j]));
        drawOrderMax = Math.max(drawOrderMax, Math.abs(core.drawables.drawOrders[i] - baseline.drawables.drawOrders[j]));
      }
      // At opacity zero expression geometry can intentionally collapse. All
      // hidden geometry is still compared exactly with the v28 baseline.
      if (core.drawables.opacities[i] < .00001 && i !== join) continue;
      const tri = core.drawables.indices[i];
      for (let k = 0; k < tri.length; k += 3) {
        const a = area(current[i], ...tri.slice(k, k + 3)), b = area(neutral[i], ...tri.slice(k, k + 3));
        if (a * b < 0) { flips++; meshIssues.push({ id: ids[i], triangle: k / 3, flip: true }); }
        if (Math.abs(a) < 1e-12) { degenerate++; meshIssues.push({ id: ids[i], triangle: k / 3, degenerate: true }); }
      }
    }
    return { params, positionMaxPixels, opacityMax, drawOrderMax, flips, degenerate, nonFinite, meshIssues,
      pass: positionMaxPixels < .001 && opacityMax < .0001 && drawOrderMax === 0 && !flips && !degenerate && !nonFinite };
  });
  const fixedIds = ['ArtMesh8', 'ArtMesh9', 'ArtMesh10', 'ArtMesh15', 'ArtMesh16', 'ArtMesh20'];
  const independence = [-30, 30].map(angle => {
    const p = pose(model, { ParamAngleZ: angle });
    const fixedMaxPixels = Math.max(...fixedIds.flatMap(id => p[ids.indexOf(id)].map((v, k) => Math.abs(v - neutral[ids.indexOf(id)][k]) * ppu)));
    const joinMovesPixels = Math.max(...p[join].map((v, k) => Math.abs(v - neutral[join][k]) * ppu));
    return { angle, fixedMaxPixels, joinMovesPixels, pass: fixedMaxPixels < .001 && joinMovesPixels > .1 };
  });
  // Distances between the patch and existing upper-hair vertices must remain
  // rigid at both head endpoints; this catches accidental reparenting/scaling.
  let rigidityMaxPixels = 0;
  const hair = ids.indexOf('ArtMesh38');
  for (const angle of [-30, 30]) {
    const p = pose(model, { ParamAngleZ: angle });
    for (let k = 0; k < p[join].length; k += 2) for (const h of [0, 2, 4]) {
      const before = Math.hypot(neutral[join][k] - neutral[hair][h], neutral[join][k + 1] - neutral[hair][h + 1]);
      const after = Math.hypot(p[join][k] - p[hair][h], p[join][k + 1] - p[hair][h + 1]);
      rigidityMaxPixels = Math.max(rigidityMaxPixels, Math.abs(before - after) * ppu);
    }
  }
  pose(model);
  const detail = report.bounds[join], b = detail.bounds;
  report.regressions = { baselineVersion: 28, parameterIdentity, topology, samples, pass: parameterIdentity && topology.every(s => s.pass) && samples.every(s => s.pass) };
  report.hairRoot = { ...detail, rigidityMaxPixels, pass: ids.length === oldIds.length + 1 && !ids.includes('ArtMesh30') &&
    b[0] > 480 && b[1] > 170 && b[2] < 840 && b[3] < 500 && detail.drawOrder === 549 && detail.opacity === 1 && rigidityMaxPixels < .001 };
  report.headIndependence = { fixedIds, samples: independence, pass: independence.every(s => s.pass) };
  report.pass = report.regressions.pass && report.hairRoot.pass && report.headIndependence.pass;
  report.formalArtComplete = false;
  return { baselineMoc, baselineModel, neutral, repaired: ['ArtMesh47'] };
}
