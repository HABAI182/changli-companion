import { contourMesh, type MeshGeometry } from './ContourMesh';

// Small missing jaw corner in ArtMesh29. Each patch vertex follows the nearest
// native UV triangle, including its authored turn and runtime head elasticity.
type Binding = [number, number, number, number, number];
const templates = new WeakMap<Float32Array, MeshGeometry & { bindings: Binding[] }>();
type SkinLayer = MeshGeometry & { bindings: Binding[]; alpha: number };
const skinTemplates = new WeakMap<Float32Array, SkinLayer[]>();

function attachment(uv: Float32Array, indices: Uint16Array, x: number, y: number): Binding {
  let best=Infinity, result: Binding=[0,0,0,0,0];
  for(let n=0;n<indices.length;n+=3) {
    const a=indices[n],b=indices[n+1],c=indices[n+2];
    const ax=uv[a*2],ay=uv[a*2+1],bx=uv[b*2],by=uv[b*2+1],cx=uv[c*2],cy=uv[c*2+1];
    const d=(bx-ax)*(cy-ay)-(cx-ax)*(by-ay); if(Math.abs(d)<1e-9)continue;
    const u=((x-ax)*(cy-ay)-(y-ay)*(cx-ax))/d,v=((bx-ax)*(y-ay)-(by-ay)*(x-ax))/d;
    const distance=Math.max(0,-u)+Math.max(0,-v)+Math.max(0,u+v-1);
    if(distance<best){best=distance;result=[a,b,c,u,v];}
  }
  return result;
}

function makeTemplate(source: Float32Array, uv: Float32Array, indices: Uint16Array): MeshGeometry & { bindings: Binding[] } {
  const positions: number[] = [], uvs: number[] = [], triangles: number[] = [];
  const bindings: Binding[] = [];
  const cols = 17, rows = 8;
  for (let row = 0; row <= rows; row++) for (let col = 0; col <= cols; col++) {
    const x = (640 + col * 10 + 12) / 2048;
    const y = 1 - (810 + row * 10 + 687.3) / 2048;
    let best = Infinity, px = 0, py = 0, binding: Binding = [0, 0, 0, 0, 0];
    for (let n = 0; n < indices.length; n += 3) {
      const [a, b, c] = Array.from(indices.slice(n, n + 3));
      const ax = uv[a * 2], ay = uv[a * 2 + 1];
      const bx = uv[b * 2], by = uv[b * 2 + 1];
      const cx = uv[c * 2], cy = uv[c * 2 + 1];
      const determinant = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
      if (Math.abs(determinant) < 1e-9) continue;
      const u = ((x - ax) * (cy - ay) - (y - ay) * (cx - ax)) / determinant;
      const v = ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / determinant;
      const distance = Math.max(0, -u) + Math.max(0, -v) + Math.max(0, u + v - 1);
      if (distance >= best) continue;
      best = distance; binding = [a, b, c, u, v];
      px = source[a * 2] + u * (source[b * 2] - source[a * 2]) + v * (source[c * 2] - source[a * 2]);
      py = source[a * 2 + 1] + u * (source[b * 2 + 1] - source[a * 2 + 1]) + v * (source[c * 2 + 1] - source[a * 2 + 1]);
    }
    positions.push(px, py); uvs.push(x, y); bindings.push(binding);
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const i = row * (cols + 1) + col;
    triangles.push(i, i + cols + 1, i + 1, i + 1, i + cols + 1, i + cols + 2);
  }
  return {positions: new Float32Array(positions), uvs: new Float32Array(uvs), indices: new Uint16Array(triangles), bindings};
}

// The UV topology is static. Cache triangle selection; each frame only updates
// weighted native positions, without searching triangles or altering Core.
export function jawRepairMesh(source: Float32Array, uv: Float32Array, indices: Uint16Array): MeshGeometry {
  let mesh = templates.get(uv);
  if (!mesh) { mesh = makeTemplate(source, uv, indices); templates.set(uv, mesh); }
  mesh.bindings.forEach(([a, b, c, u, v], i) => {
    for (const axis of [0, 1]) mesh!.positions[i * 2 + axis] = source[a * 2 + axis] + u * (source[b * 2 + axis] - source[a * 2 + axis]) + v * (source[c * 2 + axis] - source[a * 2 + axis]);
  });
  return mesh;
}

// Reuse real skin from the native face texture instead of a flat cream fill.
// Nested layers feather only the upper/left seam; the outside jaw remains
// opaque. Both the seam and the contour follow the local native face pose.
export function jawSkinLayers(source: Float32Array, uv: Float32Array, indices: Uint16Array): SkinLayer[] {
  let layers=skinTemplates.get(uv);
  if(!layers) {
    const base=jawRepairMesh(source,uv,indices);
    layers=[0,4,8,12,16].map((inset,n)=>{
      const outline: [number,number][]=[[650+inset,817+inset],[799,817+inset],[801,839],[756,869],[700,875],[650+inset,874+inset/50]];
      const normalized=outline.map(([x,y])=>[(x-640)/170,(y-810)/80] as [number,number]);
      const geometry=contourMesh(base.positions,base.uvs,base.indices,normalized);
      const bindings: Binding[]=[];
      for(let k=0;k<geometry.uvs.length;k+=2) {
        const u=geometry.uvs[k],v=geometry.uvs[k+1];bindings.push(attachment(uv,indices,u,v));
        const x=u*2048-12,y=(1-v)*2048-687.3;
        const sampleX=x<=690?x:690-(x-690)*.5;
        geometry.uvs[k]=sampleX/2048;geometry.uvs[k+1]=1-Math.min(y-3,862)/2048;
      }
      return {...geometry,bindings,alpha:[.18,.35,.5,.75,1][n]};
    });
    skinTemplates.set(uv,layers);
  }
  for(const layer of layers) layer.bindings.forEach(([a,b,c,u,v],i)=>{
    for(const axis of [0,1]) layer.positions[i*2+axis]=source[a*2+axis]+u*(source[b*2+axis]-source[a*2+axis])+v*(source[c*2+axis]-source[a*2+axis]);
  });
  return layers;
}
