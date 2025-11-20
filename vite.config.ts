import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MorseCodeTranslator',
      formats: ['es', 'umd'],
      fileName: (format) => `morse-code-translator.${format}.js`,
    },
    rollupOptions: {
      output: {
        exports: 'named',
      },
    },
    sourcemap: true,
    outDir: 'dist',
  },
  plugins: [
    dts({
      outDir: 'dist',
      insertTypesEntry: true,
    }),
  ],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./test/setup.js'],
  },
});
