import type { RenderSnapshot } from '../../pet/presentation';

// All layers share the source canvas. Independent transforms begin working as
// soon as aligned transparent parts replace the current flattened preview.
export function layerTransform(id: string, state: RenderSnapshot): string {
  const strength = state.motionLevel === 'off' ? 0 : state.motionLevel === 'low' ? 0.35 : 1;
  const breath = state.idle.breathe * strength;
  const gazeX = state.idle.gazeX * strength;
  const gazeY = state.idle.gazeY * strength;
  const drag = (state.drag === 'dragging' ? 1 : state.drag === 'release' ? -0.35 : 0) * strength;
  const nod = (state.ambient === 'nod' ? 1 : 0) * strength;
  const glance = (state.ambient === 'glance' ? -1 : 0) * strength;
  let x = 0,
    y = 0,
    angle = 0,
    scaleX = 1,
    scaleY = 1;
  if (id === 'body') {
    y = -breath * 1.6;
    angle = drag * 1.2;
    scaleY += breath * 0.003;
  } else if (['face', 'brows', 'mouth'].includes(id)) {
    x = gazeX * 1.1 + glance;
    y = gazeY * 0.8 + nod;
    angle = drag * 2;
    if (id === 'mouth') scaleY += state.mouthOpen * 0.2;
  } else if (id === 'left_eye' || id === 'right_eye') {
    x = gazeX * 2.8 + glance;
    y = gazeY * 1.8 + nod;
    scaleY = Math.max(0.08, 1 - state.idle.blink * 0.92);
  } else if (id === 'back_hair' || id === 'front_hair') {
    x = state.idle.hairSway * (id === 'front_hair' ? 2.4 : 3.4) - drag * 1.2;
    angle = state.idle.hairSway * 0.9 - drag * 2.5;
  } else if (id === 'ornaments') {
    x = state.idle.ornamentSway * 3 - drag * 2.2;
    angle = state.idle.ornamentSway * 1.2 - drag * 3.5;
  } else if (id === 'phoenix') {
    y = state.idle.phoenixFloat * 3 - breath * 1.2;
    angle = state.phoenix === 'happy' ? -3 : state.phoenix === 'ruffled' ? 3 : 0;
  } else if (id === 'left_arm_hand' || id === 'right_arm_hand') {
    const side = id === 'left_arm_hand' ? -1 : 1;
    const active = state.action?.id.includes(side < 0 ? 'left' : 'right') ? 1 : 0;
    y = active * 2 + breath * 0.4;
    angle = side * (active * 1.5 + drag * 1.2);
  }
  return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${angle.toFixed(2)}deg) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;
}
