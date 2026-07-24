import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Precache all assets from vite build
precacheAndRoute(self.__WB_MANIFEST);

// Clean old caches on activation
cleanupOutdatedCaches();

// NOTE: We deliberately do NOT call `self.skipWaiting()` or
// `self.clientsClaim()` here. Those would activate a new SW mid-session
// and cause a hard reload via the `controllerchange` event, which
// destroys unsaved form state (a user mid-typing in the reflection
// textarea would lose their work). Instead, the SW waits for the
// user to click "Update now" in the UpdatePrompt banner before
// activating. The `applyUpdate()` helper in src/utils/pwa.js handles
// the activation flow.

// ── Navigation fallback for SPA routes ───────────────────────
// Without this, deep links like /study, /service, /settings return
// 404 (or the browser offline error page) when offline, because the
// precache holds /index.html but no navigation route serves it.
// This handler matches any navigation request and serves the
// precached /index.html so React Router can take over.
registerRoute(
  new NavigationRoute(
    async ({ event }) => {
      // Try the network first so live deploys work, then fall back
      // to the precached index.html when offline.
      try {
        return await fetch(event.request);
      } catch {
        // Last resort: serve the precached /index.html so React Router
        // can take over. The Workbox manifest is injected at build time
        // at the self.__WB_MANIFEST token above; we use the static URL
        // here to avoid matching the injectManifest regex twice.
        return caches.match('/index.html') || fetch('/index.html');
      }
    },
    {
      // Don't intercept the SW itself, the manifest, or the API proxy
      denylist: [/^\/api\//, /^\/sw\.js$/, /^\/manifest\.webmanifest$/],
    }
  )
);

// ── Notification click handler ────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url === self.location.origin && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// ── Runtime caching strategies ───────────────────────────────────

// JW.org pages — NetworkFirst
registerRoute(
  ({ url }) => url.hostname === 'www.jw.org',
  new NetworkFirst({
    cacheName: 'jw-org-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Watchtower Online Library — NetworkFirst
registerRoute(
  ({ url }) => url.hostname === 'wol.jw.org',
  new NetworkFirst({
    cacheName: 'wol-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Images — CacheFirst
registerRoute(
  ({ url }) => /\.(?:png|jpg|jpeg|svg|gif|webp)$/.test(url.pathname),
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Fonts — CacheFirst
registerRoute(
  ({ url }) => /\.(?:woff|woff2|ttf|otf|eot)$/.test(url.pathname),
  new CacheFirst({
    cacheName: 'fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Google Fonts stylesheets — StaleWhileRevalidate
registerRoute(
  ({ url }) => url.hostname === 'fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 })],
  })
);

// Google Fonts webfonts — CacheFirst
registerRoute(
  ({ url }) => url.hostname === 'fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// API — StaleWhileRevalidate
registerRoute(
  ({ url }) => url.hostname.startsWith('api.'),
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);
