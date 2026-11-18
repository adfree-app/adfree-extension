// The extension has no AdFree code in it: everything it injects comes from the
// app at runtime. What is left is one worker, and this config is the shortest
// way to bundle it and lay it down beside the manifest.

export default {
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: 'src/background.js',
      formats: ['iife'],
      name: 'adfreeWorker',
      fileName: () => 'background.js',
    },
  },
};
