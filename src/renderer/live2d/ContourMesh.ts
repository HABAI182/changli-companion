export interface MeshGeometry { positions: Float32Array; uvs: Float32Array; indices: Uint16Array }
export type Contours = Record<string, [number, number][]>;
type Vertex = [number, number, number, number];

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
