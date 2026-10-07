import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

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
    rollupOptions: {
      output: {
        // Per-page code splitting. We rely on React.lazy() in App.jsx
        // for routes, plus Vite's default vendor splitting. manualChunks
        // was tried and caused circular dependency issues (some chunks
        // were loaded before React, breaking createContext). The default
        // splitter is safer.
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
          // Split each page into its own chunk
          if (id.includes('/pages/')) {
            const pageName = id.split('/pages/')[1].split('.')[0];
            return `page-${pageName}`;
          }
          // Split stores into separate chunks
          if (id.includes('/stores/')) {
            const storeName = id.split('/stores/')[1].split('.')[0];
            return `store-${storeName}`;
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
    VitePWA({
      registerType: 'autoUpdate',
      // main.jsx registers the worker itself, and only on the web.
      injectRegister: false,
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-maskable-512x512.png'],
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      manifest: {
    id: '/',
        name: 'Faithful Days',
        short_name: 'Faithful Days',
        description: 'Track daily habits and routines on your own device.',
        theme_color: '#4A6FA4',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        categories: ['lifestyle', 'education', 'productivity'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          // All shortcuts route to `/` (the only page). Each shortcut's
          // URL is informational for the OS launcher; the home renders
          // the full list of habit rows. Future per-shortcut focus
          // behavior (e.g., scroll to a specific row, open a specific
          // section) requires Home.jsx to read `useSearchParams` and
          // match against row ids — deferred until the Home.jsx split
          // (issue #140) lands.
          {
            name: 'Today\'s Habits',
            short_name: 'Today',
            description: 'Open the home screen and start your daily habits',
            url: '/',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          }
        ],
        // Enable share target for receiving shared content
        share_target: {
          action: '/share',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url'
          }
        },
        // No `screenshots` entry: the previous one pointed at the app icon
        // and labelled it a Home screenshot. A 512x512 square icon is not a
        // valid narrow-form-factor screenshot, and shipping a wrong one is
        // worse than shipping none. Add real captures here when available.
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf}'],
        cleanupOutdatedCaches: true,
        // We deliberately do NOT set skipWaiting/clientsClaim here —
        // those are controlled in src/sw.js so the user gets a
        // "Update available — reload now?" prompt instead of a silent
        // hard-reload that destroys unsaved form state.
        // The SPA navigation fallback is also handled in src/sw.js
        // (via NavigationRoute + precached /index.html) rather than
        // here, so the workbox-generated manifest picks up the
        // /index.html entry from the precache glob.
        navigationPreload: false,
      },

      // Development options
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html'
      }
    })
  ],
})
