import pluginCommonjs from '@rollup/plugin-commonjs';
import pluginJson from '@rollup/plugin-json';
import pluginNodeResolve from '@rollup/plugin-node-resolve';
import pluginTypescript from '@rollup/plugin-typescript';

const common = {
  plugins: [
    pluginTypescript(),
    pluginNodeResolve(),
    pluginCommonjs(),
    pluginJson(),
  ],
};

export default [
  {
    ...common,
    input: 'src/main.ts',
    output: {
      file: 'dist/main.js',
      format: 'es',
    },
  },
  {
    ...common,
    input: 'src/index.ts',
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
    },
  },
  {
    ...common,
    input: 'src/index.ts',
    output: {
      file: 'dist/index.mjs',
      format: 'es',
    },
  },
];
