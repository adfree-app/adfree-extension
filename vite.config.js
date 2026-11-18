// The extension ships the two files the Rust core compiles in — the page
// runtime and the YouTube userscript — copied at build time, so there is one
// source of truth and a build cannot drift from it.
//
// No framework plugin: both files are plain classic scripts and the manifest
// declares them as `world: "MAIN"`, which is what makes Chrome run them in the
// page's own world at `document_start`, before the page's first script. A
// module loader would hand them over an `import()`, which is exactly the
// timing a `ytInitialData` interceptor cannot afford.
//
// Vite bundles the one file that is ours (`src/prelude.js`, an IIFE) and the
// `closeBundle` hook lays the shared scripts down beside it.

import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');
const out = resolve(here, 'dist');

// Copied out of the repository, where they are compiled into the core.
const shared = [
  ['rust/src/mitm/page_runtime.js', 'runtime.js'],
  ['rust/assets/youtube.js', 'youtube.js'],
];

// Copied as they are: the content script is one message and the worker
// imports nothing, so there is nothing for a bundler to do.
const plain = [
  ['src/content.js', 'content.js'],
  ['src/background.js', 'background.js'],
];

/** @returns {import('vite').Plugin} */
const copySharedAssets = () => ({
  name: 'adfree-shared-assets',
  apply: 'build',
  closeBundle() {
    mkdirSync(out, { recursive: true });
    for (const [from, to] of shared) {
      copyFileSync(resolve(repo, from), resolve(out, to));
    }
    for (const [from, to] of plain) {
      copyFileSync(resolve(here, from), resolve(out, to));
    }
  },
});

export default {
  publicDir: 'public',
  plugins: [copySharedAssets()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: 'src/prelude.js',
      formats: ['iife'],
      name: 'adfreePrelude',
      fileName: () => 'prelude.js',
    },
  },
};
