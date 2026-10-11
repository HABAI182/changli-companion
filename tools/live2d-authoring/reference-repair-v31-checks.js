// Compare an official native export with the previously passed native export.
// No MOC3, mesh, or texture bytes are altered by this authoring-only inspector.
export async function checkFaceInterior({ model, core, ids, ppu, report, CubismMoc, pose, area }) {
  const baselineMoc = CubismMoc.create(await (await fetch('/models/changli/live-reference-repair-v30-candidate/ChangliReferenceRepairV30.moc3')).arrayBuffer(), true);
  if (!baselineMoc) throw Error('Core rejected v30 baseline');
  const baselineModel = baselineMoc.createModel(), baseline = baselineModel.getModel();
  const neutral = pose(model), oldIds = [...baseline.drawables.ids], join = ids.indexOf('ArtMesh48');
  if (join < 0) throw Error('Native ArtMesh48 face interior patch not exported');
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
    ParamHandLeftPress: n * .3, ParamHandRightPress: 30 - n * .3, ParamMouthOpenY: n / 100,
    ParamPhoenixSway: 30 * Math.sin(n / 100 * Math.PI * 2), ParamPhoenixWingSway: 30 * Math.cos(n / 100 * Math.PI * 2), ParamPhoenixTailSway: 30 * Math.sin(n / 100 * Math.PI * 4) });
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
      // hidden geometry is still compared exactly with the v30 baseline.
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
  // Distances between the patch and original lower-face vertices must remain
  // rigid at both head endpoints; this catches accidental reparenting/scaling.
  let rigidityMaxPixels = 0;
  const hair = ids.indexOf('ArtMesh29');
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
  report.regressions = { baselineVersion: 30, parameterIdentity, topology, samples, pass: parameterIdentity && topology.every(s => s.pass) && samples.every(s => s.pass) };
  report.faceInterior = { ...detail, rigidityMaxPixels, pass: ids.length === oldIds.length + 1 && !ids.includes('ArtMesh30') &&
    b[0] > 530 && b[1] > 715 && b[2] < 653 && b[3] < 774 && detail.drawOrder === 496 && detail.opacity === 1 && rigidityMaxPixels < .001 };
  report.headIndependence = { fixedIds, samples: independence, pass: independence.every(s => s.pass) };
  report.pass = report.regressions.pass && report.faceInterior.pass && report.headIndependence.pass;
  report.faceInterior.originalEyeMouthOverlap = false;
  // Clip the actual native triangles against each safety rectangle. The patch
  // is concave: comparing its enclosing rectangle alone gives false positives.
  const vertices = neutral[join];
  const points = Array.from({length:vertices.length / 2},(_,i) => [vertices[i*2]*ppu + report.canvasInfo.originX,
    report.canvasInfo.originY - vertices[i*2+1]*ppu]);
  const triangles = core.drawables.indices[join];
  function clippedArea(poly,bounds) {
    for (const [axis,limit,greater] of [[0,bounds[0],true],[0,bounds[2],false],[1,bounds[1],true],[1,bounds[3],false]]) {
      const output=[];
      for(let i=0;i<poly.length;i++) {
        const a=poly[i],b=poly[(i+1)%poly.length];
        const inside=p => greater ? p[axis]>=limit : p[axis]<=limit;
        if(inside(a)) output.push(a);
        if(inside(a)!==inside(b)) {
          const t=(limit-a[axis])/(b[axis]-a[axis]);
          output.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
        }
      }
      poly=output;
    }
    return Math.abs(poly.reduce((sum,p,i) => { const q=poly[(i+1)%poly.length]; return sum+p[0]*q[1]-q[0]*p[1]; },0))/2;
  }
  const protectedIds = ['ArtMesh28','EyeLeft2','EyeRight2'];
  report.faceInterior.protectedRegions = protectedIds.map(id => {
    const bounds = report.bounds[ids.indexOf(id)].bounds;
    let overlapAreaPixels=0;
    for(let t=0;t<triangles.length;t+=3) overlapAreaPixels+=clippedArea([...triangles.slice(t,t+3)].map(i=>points[i]),bounds);
    return {id,bounds,overlapAreaPixels,overlaps:overlapAreaPixels>.001};
  });
  report.faceInterior.originalEyeMouthOverlap = report.faceInterior.protectedRegions.some(r => r.overlaps);
  report.faceInterior.pass &&= !report.faceInterior.originalEyeMouthOverlap;
  report.pass &&= report.faceInterior.pass;
  report.formalArtComplete = false;
  return { baselineMoc, baselineModel, neutral, repaired: ['ArtMesh48'] };
}
