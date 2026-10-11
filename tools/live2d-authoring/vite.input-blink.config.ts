import config from '../../vite.config.ts';
import {resolve} from 'node:path';

export default (env: Parameters<typeof config>[0]) => ({
  ...config(env),
  build: {
    target: 'es2022',
    outDir: resolve('tools/live2d-authoring/build/offline-input-blink'),
    emptyOutDir: false,
    rollupOptions: {input: resolve('tools/live2d-authoring/input-blink-preview.html')},
  },
});
