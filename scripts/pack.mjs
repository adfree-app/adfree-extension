// Two zips, named by the version the release is going to carry.
//
// semantic-release bumps `package.json` before this runs, and the build copies
// that version into both manifests, so the folder a tag publishes is the folder
// that was verified a line earlier in the same job.

import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('../', import.meta.url).pathname
const targets = ['chrome', 'firefox']

for (const target of targets) {
  // Absolute, because the zip is written while the working directory is the
  // folder being zipped: a relative name would land inside its own archive.
  const zip = join(root, `adfree-extension-${target}.zip`)
  const folder = join(root, 'dist', target)
  rmSync(zip, { force: true })
  execFileSync('zip', ['-qr', zip, '.'], { cwd: folder })
  console.log(`pack: ${zip.slice(root.length)}`)
}
