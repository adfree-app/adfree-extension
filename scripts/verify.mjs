// The bundle a browser reads, checked before it is published.
//
// Nothing here is clever: a store or an unpacked load fails on a missing icon
// or a manifest that names a file the build did not produce, and both are
// silent in `vite build`'s own output. The version check is the same bug one
// step earlier — a release tagged v0.3.0 whose manifest still says 0.2.0
// updates nobody.

import { readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const dist = new URL('../dist/', import.meta.url).pathname
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

const fail = (message) => {
  console.error(`verify: ${message}`)
  process.exit(1)
}

const manifestPath = join(dist, 'manifest.json')
if (!existsSync(manifestPath)) fail('dist/manifest.json is missing — did the build run?')

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

if (manifest.manifest_version !== 3) fail(`manifest_version is ${manifest.manifest_version}, not 3`)
if (manifest.version !== pkg.version) {
  fail(`package.json says ${pkg.version}, manifest.json says ${manifest.version}`)
}

// Everything the manifest names has to exist, in every size a browser asks for.
const named = new Set(['background.js'])
for (const size of [16, 32, 48, 128]) {
  if (!manifest.icons?.[size]) fail(`manifest.json has no icon at ${size}px`)
  if (!manifest.action?.default_icon?.[size]) fail(`manifest.json has no action icon at ${size}px`)
  named.add(manifest.icons[size])
  named.add(manifest.action.default_icon[size])
}

for (const file of named) {
  const path = join(dist, file)
  if (!existsSync(path)) fail(`the manifest names ${file}, the build did not produce it`)
  if (statSync(path).size === 0) fail(`${file} is empty`)
}

// A service worker is the whole program: a placeholder or a source map alone
// would still load.
const worker = readFileSync(join(dist, 'background.js'), 'utf8')
if (worker.length < 500) fail('background.js looks like a stub')

console.log(`verify: ${named.size} files, ${manifest.name} ${manifest.version}`)
