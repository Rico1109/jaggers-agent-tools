import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['cjs'],
    target: 'node18',
    clean: true,
    dts: true,
    sourcemap: true,
    outDir: 'dist',
    banner: { js: '#!/usr/bin/env node' },
    // Bundle ALL dependencies inline so dist/index.cjs is self-contained.
    // Required for npx-from-git to work (cli/node_modules won't exist).
    noExternal: [/.*/],
    splitting: false,
});

