import { cpSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

// The 2022 version is plain HTML, CSS and JS. Copy it into the build untouched so it
// stays playable at /jump/legacy/ next to v2.
function copyLegacy(): Plugin {
  let root = process.cwd()
  let outDir = 'dist'
  return {
    name: 'jump:copy-legacy',
    apply: 'build',
    configResolved(config) {
      root = config.root
      outDir = resolve(config.root, config.build.outDir)
    },
    writeBundle() {
      cpSync(resolve(root, 'legacy'), resolve(outDir, 'legacy'), { recursive: true })
    },
  }
}

export default defineConfig({
  // GitHub Pages serves the repository at https://mihir9702.github.io/jump/
  base: '/jump/',
  build: {
    target: 'es2022',
    // Three.js alone is roughly 600 kB minified; one chunk loads faster than several here
    chunkSizeWarningLimit: 900,
  },
  // Only scan the v2 entry, not the legacy page
  optimizeDeps: { entries: ['index.html'] },
  plugins: [copyLegacy()],
})
