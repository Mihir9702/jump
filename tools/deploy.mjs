// Tests, builds, and publishes dist/ to the gh-pages branch, which GitHub Pages serves.
// Run with `npm run deploy`. It needs only ordinary push access, no Actions workflow.
import { execFileSync } from 'node:child_process'
import { rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// npm is a .cmd shim on Windows, so it needs a shell; git doesn't, and without a shell
// the commit message's spaces survive intact
const npm = (...args) =>
  execFileSync('npm', args, { stdio: 'inherit', shell: process.platform === 'win32' })
const git = (args, cwd) => execFileSync('git', args, { cwd, stdio: 'inherit' })
const read = args => execFileSync('git', args).toString().trim()

if (read(['status', '--porcelain'])) {
  console.error('Commit or stash your changes first, so the live site matches a commit.')
  process.exit(1)
}

const commit = read(['rev-parse', '--short', 'HEAD'])
const remote = read(['remote', 'get-url', 'origin'])

npm('test')
npm('run', 'build')

const dist = 'dist'
// Serve the files as they are, without Jekyll processing
writeFileSync(join(dist, '.nojekyll'), '')
rmSync(join(dist, '.git'), { recursive: true, force: true })
try {
  git(['init', '-q', '-b', 'gh-pages'], dist)
  git(['add', '-A'], dist)
  git(['commit', '-q', '-m', `Deploy ${commit}`], dist)
  git(['push', '-q', '--force', remote, 'gh-pages'], dist)
} finally {
  rmSync(join(dist, '.git'), { recursive: true, force: true })
}

console.log(`Deployed ${commit}. GitHub Pages publishes it within a minute or two.`)
