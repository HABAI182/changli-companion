import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Authoring baselines stay in the workspace for QA. Windows releases include
// only the active official model, fallback artwork and runtime dependencies.
export default defineConfig(({ command }) => ({
  publicDir: command === 'build' ? false : 'public',
  plugins: [react(), {
    // Compile the canonical resource manifests without importing a public URL
    // as JavaScript: Vite rejects that import on a cold development server.
    name: 'character-manifests',
    resolveId(id) {
      if (id === 'virtual:changli-model' || id === 'virtual:changli-layers') return '\0' + id;
    },
    load(id) {
      const resource = id === '\0virtual:changli-model' ? 'models/changli/model.json'
        : id === '\0virtual:changli-layers' ? 'models/changli/assets/layers/layers.json' : null;
      if (!resource) return;
      const filename = resolve('public', resource);
      this.addWatchFile(filename);
      return 'export default ' + JSON.stringify(JSON.parse(readFileSync(filename, 'utf8'))) + ';';
    },
  }, {
    name: 'current-desktop-resources',
    apply: 'build',
    closeBundle() {
      const publicRoot = resolve('public');
      const output = resolve('dist');
      const manifest = JSON.parse(readFileSync(resolve(publicRoot, 'models/changli/model.json'), 'utf8'));
      const entry: string = manifest.renderer.live2d.entry;
      if (!entry || entry.includes('..') || entry.includes(':') || entry.startsWith('/'))
        throw Error('Current Live2D entry must stay inside the Changli model directory');
      const activeFolder = entry.split('/')[0];
      if (!activeFolder || !entry.endsWith('.model3.json')) throw Error('Invalid current Live2D entry');
      const resources = [
        'assets', 'vendor/live2d', 'models/changli/assets',
        'models/changli/model.json', 'models/changli/preview.jpg',
        `models/changli/${activeFolder}`,
      ];
      mkdirSync(resolve(output, 'models/changli'), { recursive: true });
      for (const resource of resources)
        cpSync(resolve(publicRoot, resource), resolve(output, resource), { recursive: true });
    },
  }],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/target/**', '**/dist/**', '**/vendor/live2d/**'] },
  },
  build: { target: 'es2022' },
}));
