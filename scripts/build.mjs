// Two folders, one program.
//
// Manifest v3 is the same document on both browsers except for the key that
// starts the extension: Chromium runs a service worker, Firefox runs an event
// page and asks for the id it will sign the add-on under. Everything else —
// permissions, icons, the script itself — is shared, so the shared part lives
// in `manifest.json` and each target adds exactly what it alone needs.

import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'

const root = new URL('..', import.meta.url)
const dist = new URL('dist/', root)

const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
const shared = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'))

const targets = {
  chrome: {
    // Chromium has run the worker as a worker since 111; below that the same
    // file loads as a page and `scripting` behaves differently.
    manifest: { minimum_chrome_version: '111', background: { service_worker: 'background.js' } },
  },
  firefox: {
    // Firefox runs an event page, not a service worker, and signs per add-on
    // id. 140 is where the manifest learned to declare what it collects, which
    // AMO now asks of every new add-on.
    manifest: {
      background: { scripts: ['background.js'] },
      browser_specific_settings: {
        gecko: {
          id: 'extension@adfree.app',
          strict_min_version: '140.0',
          // Asked for by AMO on every new add-on, and true here: the plan it
          // applies goes to the app on this machine and nowhere else.
          data_collection_permissions: { required: ['none'] },
        },
      },
    },
  },
}

for (const [name, target] of Object.entries(targets)) {
  const out = new URL(`${name}/`, dist)
  await rm(out, { recursive: true, force: true })
  await mkdir(out, { recursive: true })
  await cp(new URL('background.js', dist), new URL('background.js', out))
  await cp(new URL('public/icons/', root), new URL('icons/', out), { recursive: true })
  const manifest = { ...shared, ...target.manifest, version: pkg.version }
  await writeFile(new URL('manifest.json', out), JSON.stringify(manifest, null, 2) + '\n')
}

// The vite output at the top of `dist` is now copies inside each target.
await rm(new URL('background.js', dist), { force: true })

for (const name of Object.keys(targets)) {
  const manifest = JSON.parse(await readFile(new URL(`${name}/manifest.json`, dist), 'utf8'))
  const start = manifest.background.service_worker ?? manifest.background.scripts?.[0]
  console.log(`build: ${name} ${manifest.version} via ${start}`)
}
