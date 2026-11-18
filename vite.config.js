// One entry, one file, no chunk splitting: the extension has a single program
// and the browser loads it as a worker or as an event page. `scripts/build.mjs`
// then lays that file down twice, once per browser, each beside its own
// manifest.

export default {
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    target: 'es2022',
    lib: {
      entry: 'src/background.ts',
      formats: ['iife'],
      name: 'adfreeWorker',
      fileName: () => 'background.js',
    },
  },
}
