const CORE_URL = '/vendor/live2d/live2dcubismcore.min.js';
let corePromise: Promise<void> | undefined;

export function loadCubismCore(): Promise<void> {
  if (!corePromise) {
    corePromise = new Promise<void>((resolve, reject) => {
      if (typeof Live2DCubismCore !== 'undefined') return resolve();
      const script = document.createElement('script');
      script.src = CORE_URL;
      script.onload = () => {
        if (typeof Live2DCubismCore === 'undefined')
          reject(new Error('Cubism Core 脚本已加载，但未初始化'));
        else resolve();
      };
      script.onerror = () => reject(new Error('Cubism Core 加载失败'));
      document.head.append(script);
    }).catch((error) => {
      corePromise = undefined;
      throw error;
    });
  }
  return corePromise;
}
