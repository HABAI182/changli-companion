// Runtime probe of actual MOC3 keyforms, separate from the visible model.
export async function verifyEditorModel() {
  const response = await fetch('/models/changli/live-editor/ChangliEditor.moc3');
  if (!response.ok) throw new Error('验证模型读取失败');
  const moc = Live2DCubismCore.Moc.fromArrayBuffer(await response.arrayBuffer());
  if (!moc) throw new Error('验证模型解码失败');
  let model;
  try {
    model = Live2DCubismCore.Model.fromMoc(moc);
    if (!model) throw new Error('验证模型创建失败');
    const set = (id, value) => {
      const index = model.parameters.ids.indexOf(id);
      if (index < 0) throw new Error(`缺少参数 ${id}`);
      model.parameters.values[index] = value;
      model.update();
    };
    const snapshot = () => ({
      opacity: [...model.drawables.opacities],
      vertices: model.drawables.vertexPositions.map((values) => [...values]),
    });
    model.update();
    const initial = snapshot();
    set('ParamEyeLOpen', 0);
    const left = snapshot();
    set('ParamEyeLOpen', 1);
    set('ParamEyeROpen', 0);
    const right = snapshot();
    set('ParamEyeROpen', 1);
    const leftChanged = initial.opacity.filter(
      (v, i) => Math.abs(v - left.opacity[i]) > 0.9,
    ).length;
    const rightChanged = initial.opacity.filter(
      (v, i) => Math.abs(v - right.opacity[i]) > 0.9,
    ).length;
    const moved = (state) =>
      initial.vertices.filter((vertices, i) =>
        vertices.some((v, j) => Math.abs(v - state.vertices[i][j]) > 0.00001),
      ).length;
    set('ParamAngleZ', -30);
    const negative = moved(snapshot());
    set('ParamAngleZ', 30);
    const positive = moved(snapshot());
    set('ParamAngleZ', 0);
    const restored = moved(snapshot()) === 0;
    set('ParamMouthOpenY', 0);
    const closedMouth = snapshot();
    set('ParamMouthOpenY', 0.5);
    const halfMouth = snapshot();
    set('ParamMouthOpenY', 1);
    const openMouth = snapshot();
    const changedMouth = initial.vertices
      .map((vertices, i) => i)
      .filter((i) =>
        closedMouth.vertices[i].some((v, j) => Math.abs(v - openMouth.vertices[i][j]) > 0.00001),
      );
    const mouthIndex = changedMouth[0];
    const height = (state) => {
      const ys = state.vertices[mouthIndex].filter((v, i) => i % 2 === 1);
      return Math.max(...ys) - Math.min(...ys);
    };
    if (changedMouth.length !== 1) throw new Error('嘴部必须只改变一个 ArtMesh');
    const mouthHeights = [closedMouth, halfMouth, openMouth].map(height);
    set('ParamMouthOpenY', 0);
    const mouthReset = snapshot().vertices.every((vertices, i) =>
      vertices.every((v, j) => Math.abs(v - closedMouth.vertices[i][j]) < 0.00001),
    );
    if (!(mouthHeights[0] < mouthHeights[1] && mouthHeights[1] < mouthHeights[2]) || !mouthReset) {
      throw new Error(`嘴部关键形态验证失败：${JSON.stringify({ mouthHeights, mouthReset })}`);
    }
    if (leftChanged !== 1 || rightChanged !== 1 || negative !== 4 || positive !== 4 || !restored) {
      throw new Error(
        `关键形态验证失败：${JSON.stringify({ leftChanged, rightChanged, negative, positive, restored })}`,
      );
    }
    return {
      artMeshes: model.drawables.count,
      parameters: model.parameters.count,
      leftEyeOpacity: '通过',
      rightEyeOpacity: '通过',
      negativeRotationMeshes: negative,
      positiveRotationMeshes: positive,
      reset: '通过',
      mouthMesh: model.drawables.ids[mouthIndex],
      mouthHeights,
      mouthReset: '通过',
    };
  } finally {
    model?.release();
    moc._release();
  }
}
