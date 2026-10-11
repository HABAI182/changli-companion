import type { MouseRegion } from './MouseRegionRenderer';
import type { HandDrawOrder } from './HandDrawOrder';
import type { CubismModel } from '../../../vendor/live2d/src/model/cubismmodel';

export interface RuntimeOffsetRig {
  leftHand: string[];
  rightHand: string[];
  reachPixels: number;
  mousePixels: number;
  mouseRegion?: MouseRegion;
  handOrder?: HandDrawOrder;
  mouth?: string[];
  smileEyes?: string[];
}

// Small procedural translations of the real model's authored hand meshes.
// The official MOC3/UV/topology are untouched. Restore before every Core update
// so repeated input and interruptions cannot accumulate vertex offsets.
export class RuntimeOffsets {
  private originals = new Map<number, Float32Array>();
  private dirty = new Set<number>();
  private mouseOffset = { x: 0, y: 0 };
  getMouseOffset() { return this.mouseOffset; }
  constructor(private rig?: RuntimeOffsetRig) {}
  restore(model: CubismModel) {
    for (const [index, positions] of this.originals) {
      model.getDrawableVertexPositions(index).set(positions);
      this.dirty.add(index);
    }
    this.originals.clear();
  }
  apply(model: CubismModel, parameters: ReadonlyMap<string, number>) {
    if (!this.rig) return;
    const core = model.getModel(), ppu = model.getPixelsPerUnit();
    const value = (id: string) => Math.max(-1, Math.min(1, parameters.get(id) || 0));
    const mouseX = value('__gesture.mouseX') * this.rig.mousePixels;
    const mouseY = value('__gesture.mouseY') * this.rig.mousePixels * .7;
    const lift = -value('__gesture.handLift') * 56 + value('__gesture.landingBounce') * 9;
    const tilt = value('__gesture.mouseTilt') * .055;
    const roll = value('__gesture.mouseRoll') * 6;
    this.mouseOffset = { x: mouseX, y: mouseY };
    const groups = [
      { ids: this.rig.leftHand, x: mouseX, y: mouseY + lift + roll, tilt },
      { ids: this.rig.rightHand, x: value('__gesture.keyboardReach') * this.rig.reachPixels, y: lift, tilt: 0 },
    ];
    for (const group of groups) {
      if (Math.abs(group.x) + Math.abs(group.y) + Math.abs(group.tilt) < .001) continue;
      for (const id of group.ids) {
        const index = core.drawables.ids.indexOf(id);
        if (index < 0) continue; // Replacement models opt in with their own rig.
        const vertices = model.getDrawableVertexPositions(index);
        this.originals.set(index, vertices.slice());
        let cx = 0, cy = 0;
        for (let i = 0; i < vertices.length; i += 2) { cx += vertices[i]; cy += vertices[i+1]; }
        cx /= vertices.length / 2; cy /= vertices.length / 2;
        for (let i = 0; i < vertices.length; i += 2) {
          const x = vertices[i] - cx, y = vertices[i+1] - cy;
          vertices[i] = cx + x * Math.cos(group.tilt) - y * Math.sin(group.tilt) + group.x / ppu;
          vertices[i+1] = cy + x * Math.sin(group.tilt) + y * Math.cos(group.tilt) - group.y / ppu;
        }
        this.dirty.add(index);
      }
    }
    const param = (id: string) => {
      const index = core.parameters.ids.indexOf(id);
      return index < 0 ? 0 : core.parameters.values[index];
    };
    const form = Math.max(-1, Math.min(1, param('ParamMouthForm')));
    const eyeSmile = Math.max(param('ParamEyeLSmile'), param('ParamEyeRSmile'));
    for (const [ids, smile] of [[this.rig.mouth || [], false], [this.rig.smileEyes || [], true]] as const) {
      const amount = smile ? eyeSmile : Math.abs(form);
      if (amount < .001) continue;
      for (const id of ids) {
        const index = core.drawables.ids.indexOf(id);
        if (index < 0) continue;
        const vertices = model.getDrawableVertexPositions(index);
        this.originals.set(index, vertices.slice());
        const xs = [], ys = [];
        for (let i = 0; i < vertices.length; i += 2) { xs.push(vertices[i]); ys.push(vertices[i + 1]); }
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const cx = (minX + maxX) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        for (let i = 0; i < vertices.length; i += 2) {
          if (smile) {
            const x = (vertices[i] - cx) / Math.max((maxX - minX) / 2, .00001);
            vertices[i + 1] -= (1 - x * x) * 3 * amount / ppu;
          } else {
            vertices[i] = cx + (vertices[i] - cx) * (1 + form * .4);
            vertices[i + 1] = cy + (vertices[i + 1] - cy) * (1 - amount * .7);
          }
        }
        this.dirty.add(index);
      }
    }
    // Use the Core's flag predicate instead of depending on a numeric SDK flag.
    let vertexFlag = 1;
    while (vertexFlag < 256 && !Live2DCubismCore.Utils.hasVertexPositionsDidChangeBit(vertexFlag)) vertexFlag <<= 1;
    for (const index of this.dirty) core.drawables.dynamicFlags[index] |= vertexFlag;
    this.dirty.clear();
  }
}
