import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages serves the repository at https://mihir9702.github.io/jump/
  base: '/jump/',
  build: {
    target: 'es2022',
    // Three.js alone is roughly 600 kB minified; one chunk loads faster than several here
    chunkSizeWarningLimit: 900,
  },
  // Only scan the v2 entry, not the 2022 page kept in legacy/ (which is not deployed)
  optimizeDeps: { entries: ['index.html'] },
})
