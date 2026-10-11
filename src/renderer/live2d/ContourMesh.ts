export interface MeshGeometry { positions: Float32Array; uvs: Float32Array; indices: Uint16Array }
export type Contours = Record<string, [number, number][]>;
export type SkinPatches = Record<string, { bounds: [number, number, number, number]; shift: [number, number]; erase?: boolean }>;
type Vertex = [number, number, number, number];

// A blank skin sample from the same native texture replaces the baked mouth
// beneath the separate animated mouth. Split in UV space so only this small
// rectangle changes, and the repair follows native face deformation exactly.
export function skinPatchMesh(source: Float32Array, uv: Float32Array, indices: Uint16Array,
  patch: SkinPatches[string]): MeshGeometry {
  const us=Array.from(uv).filter((_,i)=>i%2===0),vs=Array.from(uv).filter((_,i)=>i%2===1);
  const minU=Math.min(...us),maxU=Math.max(...us),minV=Math.min(...vs),maxV=Math.max(...vs);
  const local=(v: Vertex)=>[(v[2]-minU)/(maxU-minU),(maxV-v[3])/(maxV-minV)];
  const [x,y,w,h]=patch.bounds, outline=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
  const positions:number[]=[],uvs:number[]=[],triangles:number[]=[];
  const emit=(poly:Vertex[], repair:boolean)=>{
    if(poly.length<3)return;const start=positions.length/2;
    for(const p of poly){positions.push(p[0],p[1]);uvs.push(p[2]+(repair?patch.shift[0]*(maxU-minU):0),p[3]-(repair?patch.shift[1]*(maxV-minV):0));}
    for(let i=1;i<poly.length-1;i++)triangles.push(start,start+i,start+i+1);
  };
  for(let n=0;n<indices.length;n+=3){
    let poly=Array.from(indices.slice(n,n+3),i=>[source[i*2],source[i*2+1],uv[i*2],uv[i*2+1]] as Vertex);
    for(let e=0;e<4&&poly.length;e++){
      const a=outline[e],b=outline[(e+1)%4],inside:Vertex[]=[],outside:Vertex[]=[];
      const dist=(v:Vertex)=>{const p=local(v);return(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);};
      for(let i=0;i<poly.length;i++){
        const p=poly[i],q=poly[(i+1)%poly.length],dp=dist(p),dq=dist(q);(dp>=0?inside:outside).push(p);
        if((dp>=0)!==(dq>=0)){const t=dp/(dp-dq),v=p.map((v,k)=>v+(q[k]-v)*t) as Vertex;inside.push(v);outside.push(v);}
      }
      emit(outside,false);poly=inside;
    }
    if (!patch.erase) emit(poly,true);
  }
  return {positions:new Float32Array(positions),uvs:new Float32Array(uvs),indices:new Uint16Array(triangles)};
}

// Cut the existing triangles in UV space. This removes the sleeve's stray top
// corners at all authored pressure poses while preserving surviving texels.
export function contourMesh(source: Float32Array, uv: Float32Array, indices: Uint16Array,
  outline: [number, number][]): MeshGeometry {
  const us = Array.from(uv).filter((_, i) => i % 2 === 0), vs = Array.from(uv).filter((_, i) => i % 2 === 1);
  const minU = Math.min(...us), maxU = Math.max(...us), minV = Math.min(...vs), maxV = Math.max(...vs);
  const local = (v: Vertex) => [(v[2] - minU) / (maxU - minU), (maxV - v[3]) / (maxV - minV)];
  const positions: number[] = [], uvs: number[] = [], triangles: number[] = [];
  for (let n = 0; n < indices.length; n += 3) {
    let poly = Array.from(indices.slice(n, n + 3), i => [source[i*2], source[i*2+1], uv[i*2], uv[i*2+1]] as Vertex);
    for (let e = 0; e < outline.length && poly.length; e++) {
      const a = outline[e], b = outline[(e + 1) % outline.length], next: Vertex[] = [];
      const dist = (v: Vertex) => { const p = local(v); return (b[0]-a[0])*(p[1]-a[1]) - (b[1]-a[1])*(p[0]-a[0]); };
      for (let k = 0; k < poly.length; k++) {
        const p = poly[k], q = poly[(k + 1) % poly.length], dp = dist(p), dq = dist(q);
        if (dp >= -1e-8) next.push(p);
        if ((dp >= 0) !== (dq >= 0)) {
          const t = dp / (dp - dq); next.push(p.map((v, i) => v + (q[i]-v)*t) as Vertex);
        }
      }
      poly = next;
    }
    const start = positions.length / 2;
    for (const v of poly) { positions.push(v[0], v[1]); uvs.push(v[2], v[3]); }
    for (let k = 1; k < poly.length-1; k++) triangles.push(start, start+k, start+k+1);
  }
  return { positions: new Float32Array(positions), uvs: new Float32Array(uvs), indices: new Uint16Array(triangles) };
}

// Subdivide the native bird quad, then bend only its upper flame. Body and UVs
// remain continuous; no extra bitmap or different character illustration.
export function flameMesh(source: Float32Array, uv: Float32Array, phase: number, strength: number, ppu: number): MeshGeometry {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const rows = 8, cols = 4;
  // Native quad vertex order is TR, TL, BR, BL.
  for (let y = 0; y <= rows; y++) for (let x = 0; x <= cols; x++) {
    const s = x / cols, t = y / rows, weights = [s*(1-t), (1-s)*(1-t), s*t, (1-s)*t];
    const sample = (a: Float32Array, axis: number) => weights.reduce((sum, w, i) => sum + w*a[i*2+axis], 0);
    const bend = Math.max(0, 1 - t / .45) ** 2 * strength;
    positions.push(sample(source, 0) + Math.sin(phase+t*5)*9*bend/ppu,
      sample(source, 1) + Math.cos(phase*.8)*4*bend/ppu);
    uvs.push(sample(uv, 0), sample(uv, 1));
  }
  for (let y=0; y<rows; y++) for (let x=0; x<cols; x++) {
    const i=y*(cols+1)+x; indices.push(i+cols+1,i+1,i, i+cols+1,i+cols+2,i+1);
  }
  return {positions:new Float32Array(positions),uvs:new Float32Array(uvs),indices:new Uint16Array(indices)};
}
