import type { CubismModel } from '../../../vendor/live2d/src/model/cubismmodel';
import type { CubismMatrix44 } from '../../../vendor/live2d/src/math/cubismmatrix44';

// Transparent vector accents follow the real face mesh, including native
// rotation and elastic deformation. They are runtime artwork, not MOC3 parts.
export class FaceEffects {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private reference?: Float32Array;
  private faceIndex = -1;
  private weights = new Map<string, number>();
  private previous = 0;
  constructor(parent: HTMLCanvasElement, model: CubismModel) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'live2d-face-effects';
    this.canvas.setAttribute('aria-hidden', 'true');
    Object.assign(this.canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
    parent.after(this.canvas);
    this.context = this.canvas.getContext('2d')!;
    this.faceIndex = model.getModel().drawables.ids.indexOf('ArtMesh41');
    if (this.faceIndex >= 0) this.reference = model.getDrawableVertexPositions(this.faceIndex).slice();
  }
  snapshot() { return Object.fromEntries(this.weights); }
  mouthCoverage() { return Math.min(1, [...this.weights].reduce((s,[id,w])=>s+(['smile','sleepy','laugh','pout','angry','wronged','shy','proud','blush'].includes(id)?w:0),0)); }
  draw(model: CubismModel, matrix: CubismMatrix44, source: HTMLCanvasElement, expression: string, now: number, moving: boolean) {
    if (this.canvas.width !== source.width || this.canvas.height !== source.height) {
      this.canvas.width = source.width; this.canvas.height = source.height;
    }
    const c = this.context, width = source.width, height = source.height;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, width, height);
    const dt = this.previous ? Math.max(0, now - this.previous) : 16; this.previous = now;
    const blend = 1 - Math.exp(-Math.min(dt, 250) / 100);
    this.weights.set(expression, this.weights.get(expression) || 0);
    for (const [id, old] of this.weights) {
      const next = old + ((id === expression ? 1 : 0) - old) * blend;
      if (next < .002 && id !== expression) this.weights.delete(id); else this.weights.set(id, next);
    }
    if (!this.reference || this.faceIndex < 0) return;
    const ref = this.reference, current = model.getDrawableVertexPositions(this.faceIndex);
    // Locate a stable, non-collinear native triangle once in source geometry.
    let third = 4;
    const cross = (k: number) => (ref[2]-ref[0])*(ref[k+1]-ref[1])-(ref[k]-ref[0])*(ref[3]-ref[1]);
    while (third + 1 < ref.length && Math.abs(cross(third)) < .00001) third += 2;
    if (third + 1 >= ref.length) return;
    const ppu = model.getPixelsPerUnit(), info = model.getModel().canvasinfo;
    const point = (x: number, y: number): [number, number] => {
      const rx=(x-info.CanvasOriginX)/ppu-ref[0], ry=(info.CanvasOriginY-y)/ppu-ref[1], d=cross(third);
      const u=(rx*(ref[third+1]-ref[1])-ry*(ref[third]-ref[0]))/d;
      const v=((ref[2]-ref[0])*ry-(ref[3]-ref[1])*rx)/d;
      const px=current[0]+u*(current[2]-current[0])+v*(current[third]-current[0]);
      const py=current[1]+u*(current[3]-current[1])+v*(current[third+1]-current[1]);
      return [(matrix.transformX(px)+1)*width/2,(1-matrix.transformY(py))*height/2];
    };
    const a=point(0,0), b=point(1,0), d=point(0,1);
    c.setTransform(b[0]-a[0],b[1]-a[1],d[0]-a[0],d[1]-a[1],a[0],a[1]);
    const t = moving ? now / 1000 : 0;
    for (const [id, weight] of this.weights) {
      c.save(); c.globalAlpha=weight;
      c.strokeStyle='#c66d70';c.lineWidth=2.3;c.lineCap='round';c.lineJoin='round';
      if(id==='laugh'){
        c.fillStyle='#a9515b';c.beginPath();c.moveTo(559,786);c.quadraticCurveTo(578,797,597,787);c.bezierCurveTo(594,822,564,821,559,786);c.fill();c.stroke();
        c.save();c.clip();c.fillStyle='#f3a4a3';c.beginPath();c.ellipse(578,813,14,7,0,0,7);c.fill();c.restore();
      }else if(['smile','shy','proud','blush'].includes(id)){
        c.beginPath();c.moveTo(565,793);c.quadraticCurveTo(579,805,590,792);c.stroke();
      }else if(id==='pout'){
        c.beginPath();c.moveTo(570,795);c.quadraticCurveTo(582,793,587,797);c.quadraticCurveTo(583,802,573,800);c.stroke();
      }else if(['wronged','angry'].includes(id)){
        c.beginPath();c.moveTo(566,801);c.quadraticCurveTo(578,790,589,800);c.stroke();
      }
      if(id==='smile') {
        c.fillStyle='rgba(241,142,149,.22)';
        for(const [x,y] of [[394,755],[783,802]]){c.beginPath();c.ellipse(x,y,34,15,.13,0,7);c.fill();}
      }
      if(id==='sleepy') {
        // One small closed mouth, a rounded droplet and a softly floating Z trail.
        c.strokeStyle='#c66d70';c.lineWidth=2.8;c.beginPath();c.moveTo(568,797);c.quadraticCurveTo(578,801,586,796);c.stroke();
        c.fillStyle='#a4dced';c.strokeStyle='#80b9d1';c.lineWidth=1.7;
        c.beginPath();c.moveTo(585,797);c.bezierCurveTo(580,808,579,823,588,824);c.bezierCurveTo(599,822,591,807,585,797);c.fill();c.stroke();
        c.fillStyle='#ffffffdd';c.beginPath();c.ellipse(586,815,1.8,4,-.2,0,7);c.fill();
        const float=Math.sin(t*1.7)*5;
        c.fillStyle='#94736f';c.strokeStyle='#fff5e9';c.lineWidth=5;
        c.font='800 60px "Comic Sans MS", "Segoe Print", cursive';c.strokeText('z',918,373+float);c.fillText('z',918,373+float);
        c.font='800 44px "Comic Sans MS", "Segoe Print", cursive';c.strokeText('z',977,338+float*.8);c.fillText('z',977,338+float*.8);
        c.font='800 29px "Comic Sans MS", "Segoe Print", cursive';c.strokeText('z',1023,310+float*.6);c.fillText('z',1023,310+float*.6);
      }
      if (['blush','shy'].includes(id)) {
        for (const [x,y] of [[394,755],[783,802]]) {
          const g=c.createRadialGradient(x,y,2,x,y,48);g.addColorStop(0,'rgba(242,91,100,.5)');g.addColorStop(1,'rgba(242,91,100,0)');
          c.fillStyle=g;c.beginPath();c.ellipse(x,y,48,24,.13,0,Math.PI*2);c.fill();
          c.strokeStyle='rgba(225,106,112,.6)';c.lineWidth=2.5;
          for(let k=-1;k<=1;k++){c.beginPath();c.moveTo(x+k*12-3,y+4);c.lineTo(x+k*12+3,y-6);c.stroke();}
        }
      }
      if (id==='wronged') {
        c.fillStyle='rgba(153,213,249,.7)';c.strokeStyle='rgba(109,162,198,.65)';c.lineWidth=1.5;
        for(const [x,y] of [[407,750],[769,806]]){const drop=6+Math.sin(t*3)*2;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x-12,y+drop+18,x+13,y+drop+18,x,y);c.fill();c.stroke();c.fillStyle='rgba(255,255,255,.9)';c.beginPath();c.ellipse(x-3,y+8,2,4,0,0,7);c.fill();c.fillStyle='rgba(153,213,249,.7)';}
      }
      if(id==='angry'){
        // Flame silhouettes outside the hair remain legible at small desktop sizes.
        // Reduced motion pauses their flicker; the accents still identify anger.
        for(const [x,y,s] of [[180,490,1.65],[1075,570,1.45]]){
          c.save();c.translate(x,y);c.scale(s,s);const sway=Math.sin(t*6)*5;
          c.fillStyle='#f17b5a';c.strokeStyle='#b95751';c.lineWidth=2.5;c.beginPath();c.moveTo(0,25);c.bezierCurveTo(-28,12,-25,-9,-12,-24);c.quadraticCurveTo(-15,-1,-3,1);c.quadraticCurveTo(10,-16,8+sway,-38);c.bezierCurveTo(38,-5,28,24,0,25);c.fill();c.stroke();
          c.fillStyle='#ffe29c';c.beginPath();c.moveTo(0,23);c.quadraticCurveTo(-16,8,-5,-7);c.quadraticCurveTo(-3,7,6,0);c.quadraticCurveTo(22,19,0,23);c.fill();c.restore();
        }
        c.strokeStyle='#cf6864';c.lineWidth=5;c.lineCap='round';
        for(const [x,y,sx,sy] of [[917,445,-1,-1],[921,449,1,-1],[917,453,-1,1],[921,457,1,1]]){
          c.beginPath();c.moveTo(x+sx*13,y);c.quadraticCurveTo(x,y,x,y+sy*13);c.stroke();
        }
      }
      if(id==='proud'){
        c.fillStyle='#ffdf98';c.strokeStyle='#c08e56';c.lineWidth=1.5;
        for(const [x,y,r] of [[874,642,14],[910,670,8]]){c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r*.28,y-r*.28);c.lineTo(x+r,y);c.lineTo(x+r*.28,y+r*.28);c.lineTo(x,y+r);c.lineTo(x-r*.28,y+r*.28);c.lineTo(x-r,y);c.lineTo(x-r*.28,y-r*.28);c.closePath();c.fill();c.stroke();}
      }
      if(['phoenix_eyes','flame_eyes'].includes(id)){
        for(const [x,y] of [[453,690],[738,748]]){
          const g=c.createRadialGradient(x,y,1,x,y,42);g.addColorStop(0,'rgba(255,222,101,.5)');g.addColorStop(1,'rgba(255,175,79,0)');c.fillStyle=g;c.beginPath();c.ellipse(x,y,41,37,0,0,7);c.fill();
          c.fillStyle='#ffe2a0';c.strokeStyle='rgba(214,100,63,.6)';c.lineWidth=1.5;
          if(id==='phoenix_eyes'){
            c.beginPath();c.moveTo(x,y+13);c.bezierCurveTo(x-31,y-7,x-21,y-18,x-6,y-4);c.quadraticCurveTo(x,y-30,x+6,y-4);c.bezierCurveTo(x+21,y-18,x+31,y-7,x,y+13);c.fill();c.stroke();
          }else{
            const w=Math.sin(t*5)*3;c.beginPath();c.moveTo(x,y+20);c.bezierCurveTo(x-25,y+14,x-13,y-8,x-7,y-10);c.quadraticCurveTo(x-7,y,x-1,y+2);c.bezierCurveTo(x+4,y-6,x+w,y-18,x+6,y-25);c.bezierCurveTo(x+23,y-5,x+22,y+17,x,y+20);c.fill();c.stroke();
          }
        }
      }
      c.restore();
    }
  }
  dispose() { this.canvas.remove(); this.weights.clear(); }
}
