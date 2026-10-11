type Vertex = [number, number, number, number];

// Split original triangles along a convex source-space outline. Interpolate
// original UVs, so resting pixels are unchanged. Outside pieces stay static.
function split(poly: Vertex[], a: number[], b: number[]): [Vertex[], Vertex[]] {
  const inside: Vertex[] = [], outside: Vertex[] = [];
  const distance = (v: Vertex) => (b[0]-a[0])*(v[1]-a[1])-(b[1]-a[1])*(v[0]-a[0]);
  for (let n=0;n<poly.length;n++) {
    const p=poly[n], q=poly[(n+1)%poly.length], dp=distance(p), dq=distance(q);
    (dp >= 0 ? inside : outside).push(p);
    if ((dp >= 0) !== (dq >= 0)) {
      const t=dp/(dp-dq), v=p.map((x,i)=>x+(q[i]-x)*t) as Vertex;
      inside.push(v); outside.push(v);
    }
  }
  return [inside, outside];
}

export function partitionMouseMesh(source: Float32Array, uv: Float32Array,
  indices: Uint16Array, outline: [number, number][], ppu: number, origin: [number,number]) {
  const base: number[]=[], uvs: number[]=[], moving: boolean[]=[], triangles: number[]=[];
  const emit = (poly: Vertex[], moves: boolean) => {
    if (poly.length<3) return;
    const start=base.length/2;
    for (const p of poly) {
      base.push((p[0]-origin[0])/ppu,(origin[1]-p[1])/ppu);
      uvs.push(p[2],p[3]); moving.push(moves);
    }
    // Source Y is down; keep the original winding after conversion to Core Y.
    for(let n=1;n<poly.length-1;n++)triangles.push(start,start+n,start+n+1);
  };
  for(let n=0;n<indices.length;n+=3) {
    let remaining=Array.from(indices.slice(n,n+3), i=>[
      source[i*2]*ppu+origin[0],origin[1]-source[i*2+1]*ppu,uv[i*2],uv[i*2+1],
    ] as Vertex);
    for(let edge=0;edge<outline.length&&remaining.length;edge++) {
      const [inside,outside]=split(remaining,outline[edge],outline[(edge+1)%outline.length]);
      emit(outside,false);remaining=inside;
    }
    emit(remaining,true);
  }
  return {base:new Float32Array(base), positions:new Float32Array(base),
    uvs:new Float32Array(uvs), indices:new Uint16Array(triangles), moving};
}

