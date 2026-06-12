import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

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
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-maskable-512x512.png'],
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      manifest: {
        name: 'JW Habits',
        short_name: 'JW Habits',
        description: 'Build daily spiritual habits: daily text, Bible reading, meeting prep, and more',
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
          {
            name: 'Daily Text',
            short_name: 'Text',
            description: 'Read today\'s daily text',
            url: '/?focus=dailytext',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Study',
            short_name: 'Study',
            description: 'Meeting prep & deeper study',
            url: '/study',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'View Stats',
            short_name: 'Stats',
            description: 'View your progress statistics',
            url: '/stats',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Settings',
            short_name: 'Settings',
            description: 'Configure app settings',
            url: '/settings',
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
        screenshots: [
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'JW Habits Home Screen'
          }
        ],
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
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3009',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
