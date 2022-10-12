import typescript from '@rollup/plugin-typescript';

export default {
  input: './src/index.ts',
  output: {
    file: './src/index.js',
    format: 'cjs'
  },
  plugins: [typescript()]
};
