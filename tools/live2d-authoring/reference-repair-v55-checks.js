// Keep the previous head/pendant/contour acceptance, then verify the native
// layering change against v54 at every existing regression pose.
import { checkGazeAlignment as previousChecks } from './reference-repair-v54-checks.js';

export async function checkGazeAlignment(context) {
  const result = await previousChecks(context);
  const { core, ids, model, CubismMoc, pose, ppu, report } = context;
  const moc = CubismMoc.create(await (await fetch('/models/changli/live-reference-repair-v54-candidate/ChangliReferenceRepairV54.moc3')).arrayBuffer(), true);
  if (!moc) throw Error('Core rejected verified v54 layering baseline');
  const baselineModel = moc.createModel(), baseline = baselineModel.getModel();
  const oldIds = [...baseline.drawables.ids];
  const same = (a, b) => JSON.stringify([...a]) === JSON.stringify([...b]);
  const topology = ids.map((id, i) => {
    const j = oldIds.indexOf(id);
    return { id, pass: j >= 0 && same(core.drawables.vertexUvs[i], baseline.drawables.vertexUvs[j]) && same(core.drawables.indices[i], baseline.drawables.indices[j]) };
  });
  const samples = report.regressions.samples.map(({ params }) => {
    const vertices = pose(model, params), previous = pose(baselineModel, params);
    let maxPixels = 0, opacityMax = 0, wrongOrder = 0;
    ids.forEach((id, i) => {
      const j = oldIds.indexOf(id);
      vertices[i].forEach((value, k) => maxPixels = Math.max(maxPixels, Math.abs(value - previous[j][k]) * ppu));
      opacityMax = Math.max(opacityMax, Math.abs(core.drawables.opacities[i] - baseline.drawables.opacities[j]));
      const expected = id === 'ArtMesh41' ? 496 : baseline.drawables.drawOrders[j];
      if (core.drawables.drawOrders[i] !== expected) wrongOrder++;
    });
    return { params, maxPixels, opacityMax, wrongOrder, pass: maxPixels < .03 && opacityMax < .0001 && wrongOrder === 0 };
  });
  report.nativeFaceLayering = {
    baselineVersion: 54, faceId: 'ArtMesh41', previousOrder: 490, newOrder: 496,
    sourceLowerFaceId: 'ArtMesh29', sourceLowerFaceOrder: 495,
    meshes: ids.length, topology, samples,
    pass: ids.length === oldIds.length && topology.every(t => t.pass) && samples.every(s => s.pass),
    scope: 'Native draw order only; exact geometry, UV, opacity and every other draw order preserved. Closed-eye visual acceptance is recorded separately.',
  };
  report.pass &&= report.nativeFaceLayering.pass;
  pose(model);
  moc.deleteModel(baselineModel); moc.release();
  return result;
}
