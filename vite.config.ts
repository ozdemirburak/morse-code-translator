import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      name: 'MorseCodeTranslator',
      formats: ['es', 'umd'],
      // Node and bundlers use the ES build (Node >= 22.12 can also require() it);
      // the UMD build is only for <script> tags and CDNs.
      fileName: (format) => `morse-code-translator.${format}.js`,
    },
    rolldownOptions: {
      output: {
        exports: 'named',
      },
    },
    sourcemap: true,
    outDir: 'dist',
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      include: ['src/**/*.ts'],
      thresholds: { lines: 95, branches: 90 },
    },
  },
});
