import type { CubismModel } from '../../../vendor/live2d/src/model/cubismmodel';
import { CubismRenderer_WebGL } from '../../../vendor/live2d/src/rendering/cubismrenderer_webgl';

export interface MouseRegion {
  mesh: string;
  outline: [number, number][];
}
import { partitionMouseMesh } from './MouseMesh';
import { handDrawOrder, type HandDrawOrder } from './HandDrawOrder';
import { contourMesh, flameMesh, skinPatchMesh, type SkinPatches, type Contours, type MeshGeometry } from './ContourMesh';

// The mouse and cable share a native foreground quad with the keyboard/body.
// Render an ephemeral partition of that quad. Never rewrite Core/MOC3 buffers
// or vendor SDK files; only the opted-in mouse/cable polygon is translated.
export class MouseRegionRenderer extends CubismRenderer_WebGL {
  private offset={x:0,y:0};
  private original?: Float32Array;
  private geometry?: ReturnType<typeof partitionMouseMesh>;
  private proxy?: CubismModel;
  private target=-1;
  private lastDrawOrder: Record<string, number> = {};
  private flame = {phase: 0, strength: 0};
  private mouthCoverage = 0;
  private keyboard?: {mesh: string; texture: number};
  setKeyboard(mesh: string, texture: number) { this.keyboard={mesh,texture}; }
  setMouthCoverage(value: number) { this.mouthCoverage = value; }
  private contourInfo: Record<string, {nativeVertices: number; renderedVertices: number}> = {};
  constructor(width: number,height: number,private region?: MouseRegion, private handOrder?: HandDrawOrder,
    private contours?: Contours, private flameId?: string, private skinPatches?: SkinPatches) {super(width,height);}
  setFlameMotion(phase: number, strength: number) { this.flame = {phase, strength}; }
  getContourSnapshot() { return {...this.contourInfo}; }
  private drawGeometry(model: Readonly<CubismModel>, index: number, g: MeshGeometry) {
    const getters: Record<string, unknown> = {
      getDrawableVertexPositions:g.positions,getDrawableVertices:g.positions,
      getDrawableVertexUvs:g.uvs,getDrawableVertexIndices:g.indices,
      getDrawableVertexCount:g.positions.length/2,getDrawableVertexIndexCount:g.indices.length,
    };
    const proxy = new Proxy(model as CubismModel, { get(target, property) {
      const original = Reflect.get(target, property);
      if (typeof original !== 'function') return original;
      return property in getters ? (i: number) => i === index ? getters[String(property)] : original.call(target, i) : original.bind(target);
    }});
    super.drawMeshWebGL(proxy, index);
  }
  getDrawOrderSnapshot() { return {...this.lastDrawOrder}; }
  public override doDrawModel(shaderPath?: string): void {
    const model = this.getModel(), orders = model.getRenderOrders(), saved = orders.slice();
    const ids = [...model.getModel().drawables.ids];
    while (ids.length < orders.length) ids.push(`__offscreen.${ids.length}`);
    handDrawOrder(ids, orders, this.handOrder).forEach((index, rank) => { orders[index] = rank; });
    this.lastDrawOrder = Object.fromEntries(ids.map((id, index) => [id, orders[index]]));
    try { super.doDrawModel(shaderPath); }
    finally { orders.set(saved); }
  }
  setMouseMotion(x:number,y:number) {this.offset={x,y};}
  getMouseMotionSnapshot() {
    if(!this.geometry)return null;
    const g=this.geometry, ppu=this.getModel().getPixelsPerUnit();
    const mouse=g.moving.findIndex(Boolean), fixed=g.moving.findIndex(v=>!v);
    const delta=(i:number)=>i<0?null:[(g.positions[i*2]-g.base[i*2])*ppu,
      -(g.positions[i*2+1]-g.base[i*2+1])*ppu];
    return {mouseDelta:delta(mouse),staticDelta:delta(fixed),
      renderedVertices:g.moving.length,mouseVertices:g.moving.filter(Boolean).length};
  }
  public override drawMeshWebGL(model: Readonly<CubismModel>,index:number):void {
    const id = model.getModel().drawables.ids[index];
    if (!this.isGeneratingMask()) {
      if(id===this.keyboard?.mesh) {
        const v=model.getDrawableVertexPositions(index),xs=[],ys=[];
        for(let i=0;i<v.length;i+=2){xs.push(v[i]);ys.push(v[i+1]);}
        const minX=Math.min(...xs),minY=Math.min(...ys),dx=Math.max(...xs)-minX,dy=Math.max(...ys)-minY;
        const uvs=new Float32Array(v.length);
        for(let i=0;i<v.length;i+=2){uvs[i]=(v[i]-minX)/dx;uvs[i+1]=(v[i+1]-minY)/dy;}
        const texture=this.keyboard.texture;
        const proxy=new Proxy(model as CubismModel,{get(target,property){
          if(property==='getDrawableTextureIndex')return(i:number)=>i===index?texture:target.getDrawableTextureIndex(i);
          if(property==='getDrawableVertexUvs')return(i:number)=>i===index?uvs:target.getDrawableVertexUvs(i);
          const value=Reflect.get(target,property);return typeof value==='function'?value.bind(target):value;
        }});
        super.drawMeshWebGL(proxy,index);return;
      }
      if (id==='ArtMesh28' && this.mouthCoverage>0) {
        const coverage=this.mouthCoverage;
        const proxy=new Proxy(model as CubismModel,{get(target,property){
          if(property==='getDrawableOpacity')return(i:number)=>target.getDrawableOpacity(i)*(i===index?1-coverage:1);
          const v=Reflect.get(target,property);return typeof v==='function'?v.bind(target):v;
        }});
        super.drawMeshWebGL(proxy,index);return;
      }
      if (this.skinPatches?.[id]) {
        const g=skinPatchMesh(model.getDrawableVertexPositions(index),model.getDrawableVertexUvs(index),model.getDrawableVertexIndices(index),this.skinPatches[id]);
        this.drawGeometry(model,index,g);return;
      }
      if (this.contours?.[id]) {
        const g = contourMesh(model.getDrawableVertexPositions(index), model.getDrawableVertexUvs(index),
          model.getDrawableVertexIndices(index), this.contours[id]);
        this.contourInfo[id] = {nativeVertices:model.getDrawableVertexCount(index),renderedVertices:g.positions.length/2};
        this.drawGeometry(model, index, g); return;
      }
      if (id === this.flameId && this.flame.strength > 0) {
        const g = flameMesh(model.getDrawableVertexPositions(index), model.getDrawableVertexUvs(index),
          this.flame.phase, this.flame.strength, model.getPixelsPerUnit());
        this.drawGeometry(model, index, g); return;
      }
    }
    if(!this.region||model.getModel().drawables.ids[index]!==this.region.mesh||this.isGeneratingMask()) {
      super.drawMeshWebGL(model,index);return;
    }
    const source=model.getDrawableVertexPositions(index);
    if(!this.original||source.some((v,i)=>v!==this.original![i])) {
      this.original=source.slice();this.target=index;
      const info=model.getModel().canvasinfo;
      this.geometry=partitionMouseMesh(source,model.getDrawableVertexUvs(index),
        model.getDrawableVertexIndices(index),this.region.outline,model.getPixelsPerUnit(),
        [info.CanvasOriginX,info.CanvasOriginY]);
      const getters: Record<string,(index:number)=>unknown>={
        getDrawableVertexPositions:()=>this.geometry!.positions,
        getDrawableVertices:()=>this.geometry!.positions,
        getDrawableVertexUvs:()=>this.geometry!.uvs,
        getDrawableVertexIndices:()=>this.geometry!.indices,
        getDrawableVertexCount:()=>this.geometry!.moving.length,
        getDrawableVertexIndexCount:()=>this.geometry!.indices.length,
      };
      this.proxy=new Proxy(model as CubismModel,{get:(target,property)=>{
        const value=Reflect.get(target,property);
        if(typeof value!=='function')return value;
        const alternate=getters[String(property)];
        return alternate?(i:number)=>i===this.target?alternate(i):value.call(target,i):value.bind(target);
      }});
    }
    const g=this.geometry!,ppu=model.getPixelsPerUnit();
    for(let i=0;i<g.moving.length;i++) {
      g.positions[i*2]=g.base[i*2]+(g.moving[i]?this.offset.x/ppu:0);
      g.positions[i*2+1]=g.base[i*2+1]-(g.moving[i]?this.offset.y/ppu:0);
    }
    super.drawMeshWebGL(this.proxy!,index);
  }
}
