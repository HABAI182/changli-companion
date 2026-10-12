import type { MeshGeometry } from './ContourMesh';

type Attachment = [number, number, number, number, number];
const templates = new WeakMap<Float32Array, MeshGeometry & { attachments: Attachment[] }>();

// UVs of v71 ArtMesh41 correspond to the original 2048px image. A stable broad
// face triangle attaches the rear artwork to the head; pressure/reach only
// affects the hands in front. Cache attachment weights instead of searching
// native triangles every frame.
export function underpaintMesh(source: Float32Array, uv: Float32Array, indices: Uint16Array): MeshGeometry {
  let mesh = templates.get(uv);
  if (!mesh) {
    let broad: number[] = [], area = 0;
    for (let n = 0; n < indices.length; n += 3) {
      const [a, b, c] = [indices[n], indices[n + 1], indices[n + 2]];
      const d = (uv[b * 2] - uv[a * 2]) * (uv[c * 2 + 1] - uv[a * 2 + 1]) - (uv[c * 2] - uv[a * 2]) * (uv[b * 2 + 1] - uv[a * 2 + 1]);
      if (Math.abs(d) > area) { area = Math.abs(d); broad = [a, b, c]; }
    }
    if (!broad.length) throw new Error('Face attachment requires a non-degenerate triangle');
    const [a, b, c] = broad, ax = uv[a * 2], ay = uv[a * 2 + 1];
    const bx = uv[b * 2], by = uv[b * 2 + 1], cx = uv[c * 2], cy = uv[c * 2 + 1];
    const determinant = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
    const attachments: Attachment[] = [], uvs: number[] = [];
    // Two bounded quads avoid allocating a full-screen artwork mesh.
    for (const [left, top, right, bottom] of [[210, 775, 410, 939], [655, 807, 870, 941]]) {
      for (const [px, py] of [[left, top], [right, top], [left, bottom], [right, bottom]]) {
        const x = px / 2048, y = 1 - py / 2048;
        const u = ((x - ax) * (cy - ay) - (y - ay) * (cx - ax)) / determinant;
        const v = ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / determinant;
        attachments.push([a, b, c, u, v]); uvs.push(px / 1254, 1 - py / 1254);
      }
    }
    mesh = {positions: new Float32Array(16), uvs: new Float32Array(uvs), indices: new Uint16Array([0, 2, 1, 1, 2, 3, 4, 6, 5, 5, 6, 7]), attachments};
    templates.set(uv, mesh);
  }
  mesh.attachments.forEach(([a, b, c, u, v], i) => {
    for (const axis of [0, 1]) mesh!.positions[i * 2 + axis] = source[a * 2 + axis] + u * (source[b * 2 + axis] - source[a * 2 + axis]) + v * (source[c * 2 + axis] - source[a * 2 + axis]);
  });
  return mesh;
}
