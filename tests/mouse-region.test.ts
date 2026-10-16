import { expect, it } from 'vitest';
import { partitionMouseMesh, subtractSourceRect } from '../src/renderer/live2d/MouseMesh';

it('鼠标分区覆盖原前景且不重复，UV保留，原生网格不被写入', () => {
  const original = new Float32Array([100,0,0,0,100,-100,0,-100]);
  const saved=original.slice();
  const g=partitionMouseMesh(original,new Float32Array([1,0,0,0,1,1,0,1]),
    new Uint16Array([2,0,1,1,3,2]),[[0,0],[50,0],[50,100],[0,100]],1,[0,0]);
  let movingArea=0,staticArea=0;
  for(let n=0;n<g.indices.length;n+=3) {
    const [a,b,c]=Array.from(g.indices.slice(n,n+3)),v=g.base;
    const area=Math.abs((v[b*2]-v[a*2])*(v[c*2+1]-v[a*2+1])-
      (v[b*2+1]-v[a*2+1])*(v[c*2]-v[a*2]))/2;
    if(g.moving[a])movingArea+=area;else staticArea+=area;
  }
  expect(movingArea).toBeCloseTo(5000);expect(staticArea).toBeCloseTo(5000);
  expect([...g.uvs].every(v=>v>=0&&v<=1)).toBe(true);
  expect(original).toEqual(saved);
});

it('移除旧键盘的完整矩形且不误删旁边鼠标，保留外部UV与原网格', () => {
  const source=new Float32Array([100,0,0,0,100,-100,0,-100]);
  const saved=source.slice(),uv=new Float32Array([1,0,0,0,1,1,0,1]);
  const g=subtractSourceRect(source,uv,new Uint16Array([2,0,1,1,3,2]),[40,30,100,100],1,[0,0]);
  let area=0;
  for(let n=0;n<g.indices.length;n+=3){
    const [a,b,c]=Array.from(g.indices.slice(n,n+3)),v=g.positions;
    area+=Math.abs((v[b*2]-v[a*2])*(v[c*2+1]-v[a*2+1])-(v[b*2+1]-v[a*2+1])*(v[c*2]-v[a*2]))/2;
    const x=(v[a*2]+v[b*2]+v[c*2])/3,y=-(v[a*2+1]+v[b*2+1]+v[c*2+1])/3;
    expect(x<40 || y<30).toBe(true);
  }
  expect(area).toBeCloseTo(5800);
  expect(source).toEqual(saved);
  expect([...g.uvs].every(v=>v>=0&&v<=1)).toBe(true);
});
