import { CubismFramework } from '../../../vendor/live2d/src/live2dcubismframework';
import { CubismMoc } from '../../../vendor/live2d/src/model/cubismmoc';
import type { CubismModel } from '../../../vendor/live2d/src/model/cubismmodel';
import { CubismModelMatrix } from '../../../vendor/live2d/src/math/cubismmodelmatrix';
import { CubismMatrix44 } from '../../../vendor/live2d/src/math/cubismmatrix44';
import { MouseRegionRenderer } from './MouseRegionRenderer';
import { CubismShaderManager_WebGL } from '../../../vendor/live2d/src/rendering/cubismshader_webgl';
import { CubismMotion } from '../../../vendor/live2d/src/motion/cubismmotion';
import { CubismMotionManager } from '../../../vendor/live2d/src/motion/cubismmotionmanager';
import { CubismExpressionMotion } from '../../../vendor/live2d/src/motion/cubismexpressionmotion';
import { CubismExpressionMotionManager } from '../../../vendor/live2d/src/motion/cubismexpressionmotionmanager';
import { CubismPhysics } from '../../../vendor/live2d/src/physics/cubismphysics';
import { CubismPose } from '../../../vendor/live2d/src/effect/cubismpose';
import type { Live2DBackend } from './Live2DAdapter';
import { loadCubismCore } from './CoreLoader';
import { RuntimeOffsets, type RuntimeOffsetRig } from './RuntimeOffsets';
import { checkCubismResources, modelFileUrl } from './modelAssets';
import { FaceEffects } from './FaceEffects';

const SHADER_URL = '/vendor/live2d/shaders/';
const SHADER_TIMEOUT_MS = 10000;
let frameworkStarted = false;

async function waitForShaders(gl: WebGLRenderingContext, isDisposed: () => boolean): Promise<void> {
  const started = performance.now();
  const shader = CubismShaderManager_WebGL.getInstance().getShader(gl);
  while (!shader._isShaderLoaded) {
    if (isDisposed()) throw new Error('Cubism 模型加载已取消');
    if (performance.now() - started > SHADER_TIMEOUT_MS)
      throw new Error('Cubism 着色器加载超时或编译失败');
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
}

async function fetchBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cubism 资源读取失败：${url} (${response.status})`);
  return response.arrayBuffer();
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Cubism 贴图读取失败：${url}`));
    image.src = url;
  });
}

// Uses the official R5 Framework and Core. A real .moc3 is required; the
// single-image fallback preview is never passed off as a Cubism model.
export class CubismBackend implements Live2DBackend {
  private offsets: RuntimeOffsets;
  constructor(private rig?: RuntimeOffsetRig) { this.offsets = new RuntimeOffsets(rig); }
  private canvas?: HTMLCanvasElement;
  private gl?: WebGLRenderingContext;
  private moc?: CubismMoc;
  private model?: CubismModel;
  private renderer?: MouseRegionRenderer;
  private modelMatrix?: CubismModelMatrix;
  private textures: WebGLTexture[] = [];
  private motions = new Map<string, CubismMotion>();
  private expressions = new Map<string, CubismExpressionMotion>();
  private motionManager = new CubismMotionManager();
  private expressionManager = new CubismExpressionMotionManager();
  private physics?: CubismPhysics;
  private pose?: CubismPose;
  private parameters = new Map<string, number>();
  private frame = 0;
  private previousFrame = 0;
  private disposed = false;
  private faceEffects?: FaceEffects;
  private expressionName = 'default';

  async load(canvas: HTMLCanvasElement, entryUrl: string): Promise<void> {
    this.canvas = canvas;
    const entry = entryUrl.replace(/^\/models\/changli\//, '');
    const check = await checkCubismResources(entry);
    if (!check.ok) throw new Error(check.reason);
    for (const warning of check.warnings) console.warn(warning);
    await loadCubismCore();
    if (this.disposed) return;
    if (!frameworkStarted) {
      if (!CubismFramework.startUp()) throw new Error('Cubism Framework 启动失败');
      CubismFramework.initialize();
      frameworkStarted = true;
    }
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true });
    if (!gl) throw new Error('WebGL 不可用');
    this.gl = gl;
    const refs = check.manifest.FileReferences;
    const mocData = await fetchBuffer(modelFileUrl(entry, refs.Moc));
    if (this.disposed) return;
    this.moc = CubismMoc.create(mocData, true);
    if (!this.moc) throw new Error('Cubism Moc 校验失败');
    this.model = this.moc.createModel();
    if (!this.model) throw new Error('Cubism 模型创建失败');
    this.model.saveParameters();
    this.model.update();
    if (this.rig?.faceEffects) this.faceEffects = new FaceEffects(canvas, this.model);
    this.modelMatrix = new CubismModelMatrix(
      this.model.getCanvasWidth(),
      this.model.getCanvasHeight(),
    );
    if (check.manifest.Layout) {
      this.modelMatrix.setupFromLayout(new Map(Object.entries(check.manifest.Layout)));
    }
    this.renderer = new MouseRegionRenderer(canvas.width, canvas.height, this.rig?.mouseRegion, this.rig?.handOrder, this.rig?.contours, this.rig?.flameMesh);
    this.renderer.initialize(this.model);
    this.renderer.startUp(gl);
    this.renderer.setIsPremultipliedAlpha(true);
    this.renderer.loadShaders(SHADER_URL);
    for (const [index, file] of refs.Textures.entries()) {
      const image = await loadImage(modelFileUrl(entry, file));
      if (this.disposed) return;
      const texture = gl.createTexture();
      if (!texture) throw new Error('WebGL 贴图创建失败');
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      this.textures.push(texture);
      this.renderer.bindTexture(index, texture);
    }
    for (const [group, files] of Object.entries(refs.Motions || {})) {
      for (const [index, motion] of files.entries()) {
        const data = await fetchBuffer(modelFileUrl(entry, motion.File));
        if (this.disposed) return;
        const loaded = CubismMotion.create(data, data.byteLength);
        if (loaded) {
          // Motions with no SDK-managed blink/lipsync still require non-null
          // effect ID lists in the Cubism R5 Framework.
          loaded.setEffectIds([], []);
          this.motions.set(`${group}/${index}`, loaded);
        }
      }
    }
    for (const expression of refs.Expressions || []) {
      const data = await fetchBuffer(modelFileUrl(entry, expression.File));
      if (this.disposed) return;
      this.expressions.set(expression.Name, CubismExpressionMotion.create(data, data.byteLength));
    }
    if (refs.Physics) {
      const data = await fetchBuffer(modelFileUrl(entry, refs.Physics));
      if (this.disposed) return;
      this.physics = CubismPhysics.create(data, data.byteLength);
    }
    if (refs.Pose) {
      const data = await fetchBuffer(modelFileUrl(entry, refs.Pose));
      if (this.disposed) return;
      this.pose = CubismPose.create(data, data.byteLength);
    }
    await waitForShaders(gl, () => this.disposed);
    if (this.disposed) throw new Error('Cubism 模型加载已取消');
    this.previousFrame = performance.now();
    this.frame = requestAnimationFrame(this.draw);
  }

  setParameter(id: string, value: number): void {
    this.parameters.set(id, value);
  }

  // Authoring diagnostics: only real model parameters, after motion evaluation.
  getParameterSnapshot(): Readonly<Record<string, number>> {
    const result: Record<string, number> = {};
    if (!this.model) return result;
    for (let i = 0; i < this.model.getParameterCount(); i++) {
      result[this.model.getParameterId(i).getString()] = this.model.getParameterValueByIndex(i);
    }
    return result;
  }

  // Read-only authoring evidence; not retained as input history or app data.
  getDrawableSnapshot(): Readonly<Record<string, { opacity: number; positions: number[] }>> {
    if (!this.model) return {};
    const core = this.model.getModel();
    const ppu = this.model.getPixelsPerUnit();
    return Object.fromEntries([...core.drawables.ids].map((id, i) => [id, {
      opacity: core.drawables.opacities[i],
      positions: [...core.drawables.vertexPositions[i]].map(value => value * ppu),
    }]));
  }

  getMouseMotionSnapshot() { return this.renderer?.getMouseMotionSnapshot() || null; }
  getDrawOrderSnapshot() { return this.renderer?.getDrawOrderSnapshot() || {}; }
  getContourSnapshot() { return this.renderer?.getContourSnapshot() || {}; }
  getFaceEffectsSnapshot() { return this.faceEffects?.snapshot() || {}; }

  startMotion(name: string): void {
    if (name === '__clear-input') { this.motionManager.stopAllMotions(); return; }
    const motion = this.motions.get(name) || this.motions.get(`${name}/0`);
    if (motion) {
      // Input presses replace the previous press immediately. SDK fade-out
      // blending can otherwise depress the mouse hand during the next key.
      if (/^(LeftPress|RightPress|BothPress|RightClick|WheelRoll)(\/|$)/.test(name)) this.motionManager.stopAllMotions();
      this.motionManager.startMotionPriority(motion, false, 2);
    }
  }

  setExpression(name: string): void {
    const expression = this.expressions.get(name);
    if (expression) this.expressionManager.startMotion(expression, false);
    this.expressionName = name.replace(/Reaction$/, '').replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  }

  resize(width: number, height: number): void {
    if (!this.canvas) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(width * dpr));
    this.canvas.height = Math.max(1, Math.round(height * dpr));
    this.renderer?.setRenderTargetSize(this.canvas.width, this.canvas.height);
  }

  private draw = (now: number): void => {
    if (this.disposed || !this.gl || !this.model || !this.renderer || !this.canvas) return;
    const delta = Math.min((now - this.previousFrame) / 1000, 0.1);
    this.previousFrame = now;
    this.model.loadParameters();
    for (const [id, value] of this.parameters) {
      if (id.startsWith('__gesture.')) continue;
      this.model.setParameterValueById(CubismFramework.getIdManager().getId(id), value);
    }
    this.motionManager.updateMotion(this.model, delta);
    // Expressions and physics are per-frame effects. Keeping their output as
    // the next frame's base makes Add/Multiply expressions accumulate.
    this.model.saveParameters();
    this.expressionManager.updateMotion(this.model, delta);
    this.physics?.evaluate(this.model, delta);
    this.pose?.updateParameters(this.model, delta);
    this.offsets.restore(this.model);
    this.model.update();
    this.offsets.apply(this.model, this.parameters);
    const { gl, canvas } = this;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const matrix = new CubismMatrix44();
    const aspect = canvas.width / canvas.height;
    if (aspect >= 1) matrix.scale(1 / aspect, 1);
    else matrix.scale(1, aspect);
    if (this.modelMatrix) matrix.multiplyByMatrix(this.modelMatrix);
    this.renderer.setMvpMatrix(matrix);
    this.renderer.setRenderState(null as unknown as WebGLFramebuffer, [
      0,
      0,
      canvas.width,
      canvas.height,
    ]);
    const mouse = this.offsets.getMouseOffset();
    this.renderer.setMouseMotion(mouse.x, mouse.y);
    this.renderer.setFlameMotion(this.parameters.get('__gesture.flamePhase') || 0, this.parameters.get('__gesture.flameStrength') || 0);
    this.renderer.drawModel(SHADER_URL);
    this.faceEffects?.draw(this.model, matrix, canvas, this.expressionName, now,
      (this.parameters.get('__gesture.flameStrength') || 0) > 0);
    this.frame = requestAnimationFrame(this.draw);
  };

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.motionManager.stopAllMotions();
    this.expressionManager.stopAllMotions();
    this.renderer?.release();
    this.faceEffects?.dispose();
    this.physics?.release();
    if (this.pose) CubismPose.delete(this.pose);
    for (const motion of this.motions.values()) motion.release();
    for (const expression of this.expressions.values()) expression.release();
    if (this.gl) for (const texture of this.textures) this.gl.deleteTexture(texture);
    if (this.model) this.moc?.deleteModel(this.model);
    this.moc?.release();
    this.textures = [];
    this.motions.clear();
    this.expressions.clear();
  }
}
