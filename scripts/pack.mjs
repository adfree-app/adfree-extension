// Two zips, named by the version the release is going to carry.
//
// semantic-release bumps `package.json` before this runs, and the build copies
// that version into both manifests, so the folder a tag publishes is the folder
// that was verified a line earlier in the same job.

import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'

const targets = ['chrome', 'firefox']

for (const target of targets) {
  const zip = `adfree-extension-${target}.zip`
  rmSync(zip, { force: true })
  execFileSync('zip', ['-qr', zip, '.'], { cwd: `dist/${target}` })
  console.log(`pack: ${zip}`)
}
