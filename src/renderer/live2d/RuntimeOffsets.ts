import type { MouseRegion } from './MouseRegionRenderer';
import type { HandDrawOrder } from './HandDrawOrder';
import type { Contours, SkinPatches } from './ContourMesh';
import type { CubismModel } from '../../../vendor/live2d/src/model/cubismmodel';

export interface RuntimeOffsetRig {
  leftHand: string[];
  rightHand: string[];
  reachPixels: number;
  depthPixels?: number;
  keyboardMesh?: string;
  keyboardAsset?: string;
  jawAsset?: string;
  mousePixels: number;
  mouseRegion?: MouseRegion;
  handOrder?: HandDrawOrder;
  mouth?: string[];
  smileEyes?: string[];
  contours?: Contours;
  flameMesh?: string;
  head?: { ids: string[]; anchor: [number, number] };
  tail?: { ids: string[]; anchorY: number; stretch: number };
  phoenix?: {ids: string[]; anchor: [number, number]};
  faceEffects?: boolean;
  skinPatches?: SkinPatches;
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
    this.mouseOffset = { x: mouseX, y: mouseY };
    const groups = [
      { ids: this.rig.leftHand, x: mouseX, y: mouseY },
      { ids: this.rig.rightHand, x: value('__gesture.keyboardReach') * this.rig.reachPixels,
        y: value('__gesture.keyboardLanding') * (54 - value('__gesture.keyboardDepth') * (this.rig.depthPixels || 0)) },
    ];
    for (const group of groups) {
      if (Math.abs(group.x) + Math.abs(group.y) < .001) continue;
      for (const id of group.ids) {
        const index = core.drawables.ids.indexOf(id);
        if (index < 0) continue; // Replacement models opt in with their own rig.
        const vertices = model.getDrawableVertexPositions(index);
        this.originals.set(index, vertices.slice());
        for (let i = 0; i < vertices.length; i += 2) {
          vertices[i] += group.x / ppu;
          vertices[i+1] -= group.y / ppu;
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
    const info = core.canvasinfo;
    const transform = (ids: string[], fn: (x: number, y: number) => [number, number]) => {
      for (const id of ids) {
        const i = core.drawables.ids.indexOf(id); if (i < 0) continue;
        const vertices = model.getDrawableVertexPositions(i);
        // Mouth/eye shaping may have already edited a mesh this frame.
        if (!this.originals.has(i)) this.originals.set(i, vertices.slice());
        for (let k = 0; k < vertices.length; k += 2) {
          const [x,y] = fn(vertices[k]*ppu+info.CanvasOriginX, info.CanvasOriginY-vertices[k+1]*ppu);
          vertices[k]=(x-info.CanvasOriginX)/ppu; vertices[k+1]=(info.CanvasOriginY-y)/ppu;
        }
        this.dirty.add(i);
      }
    };
    if (this.rig.tail) {
      const tail=this.rig.tail;
      transform(tail.ids,(x,y)=>[x, tail.anchorY + (y-tail.anchorY)*tail.stretch]);
    }
    if (this.rig.head) {
      const head=this.rig.head, [cx,cy]=head.anchor;
      const shape=value('__gesture.headShape')*.12, rotation=value('__gesture.headRotation')*.06;
      const dx=value('__gesture.headX')*26, dy=value('__gesture.headY')*34;
      transform(head.ids,(x,y)=>{
        const a=(x-cx)*(1+shape), b=(y-cy)*(1-shape);
        return [cx+a*Math.cos(rotation)-b*Math.sin(rotation)+dx,
          cy+a*Math.sin(rotation)+b*Math.cos(rotation)+dy];
      });
    }
    if (this.rig.phoenix) {
      const bird=this.rig.phoenix, [cx,cy]=bird.anchor;
      const bounce=value('__gesture.phoenixBounce'), sx=1+Math.abs(bounce)*.025;
      transform(bird.ids,(x,y)=>[cx+(x-cx)*sx,cy+(y-cy)*(2-sx)-bounce*9]);
    }
    // Use the Core's flag predicate instead of depending on a numeric SDK flag.
    let vertexFlag = 1;
    while (vertexFlag < 256 && !Live2DCubismCore.Utils.hasVertexPositionsDidChangeBit(vertexFlag)) vertexFlag <<= 1;
    for (const index of this.dirty) core.drawables.dynamicFlags[index] |= vertexFlag;
    this.dirty.clear();
  }
}
