import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const version = JSON.parse(readFileSync(new URL('./package.json', import.meta.url))).version;
let revision = process.env.APP_REVISION;
if (!revision) {
  try { revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { revision = 'local'; }
}
const releaseMarker = {
  name: 'release-marker',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'release.json', source: JSON.stringify({ version, revision }) });
  }
};

// https://vite.dev/config/
export default defineConfig({
  build: {
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Notes and Preparation are dynamically imported by App; the other screens are eager.
        // Keep one dependency chunk to avoid React/component dependency cycles.
        manualChunks(id) {
          // Extract the npm package name from a node_modules path.
          const pkgMatch = id.match(/node_modules\/((?:@[^/]+\/[^/]+)|[^/]+)/);
          const pkg = pkgMatch ? pkgMatch[1] : null;
          if (pkg) {
            // Everything in node_modules goes in one vendor chunk. The default
            // splitter also creates one, so this matches behavior but keeps
            // the bundle shape predictable.
            return 'vendor';
          }
          // NOTE: do NOT split /components/ into a shared chunk. That creates
          // a circular dep with pages (page-Home imports components, but
          // components may import from pages). The current behavior puts
          // components in the per-page chunk they belong to.
        }
      }
    }
  },
  plugins: [
    releaseMarker,
    tailwindcss(),
    react(),
  ],
})
