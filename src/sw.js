import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
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
// Network-first so live deploys work; fall back to the Workbox
// precache entry for /index.html when offline. Using
// createHandlerBoundToURL (not caches.match('/index.html')) is
// required — injectManifest revisioned URLs often won't match a
// bare pathname, and `caches.match(...) || fetch(...)` is wrong
// because caches.match returns a Promise (always truthy).
const offlineIndexHandler = createHandlerBoundToURL('/index.html');
registerRoute(
  new NavigationRoute(
    async (options) => {
      try {
        const response = await fetch(options.event.request);
        if (response && response.ok) return response;
      } catch {
        // Offline or network error — fall through to precache.
      }
      return offlineIndexHandler(options);
    },
    {
      // Don't intercept the SW itself or the manifest
      denylist: [/^\/sw\.js$/, /^\/manifest\.webmanifest$/],
    }
  )
);

/**
 * Only allow same-origin relative paths from notification data.
 * Prevents a future buggy/malicious notification payload from
 * navigating the client to an external phishing URL.
 */
function sanitizeNotificationUrl(raw) {
  const fallback = '/';
  if (raw == null || raw === '') return fallback;
  const value = String(raw).trim();
  if (!value) return fallback;
  if (value.startsWith('/') && !value.startsWith('//')) {
    if (value.includes('\\') || value.includes('\0')) return fallback;
    return value;
  }
  try {
    const parsed = new URL(value, self.location.origin);
    if (parsed.origin !== self.location.origin) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback;
  } catch {
    return fallback;
  }
}

// ── Notification click handler ────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = sanitizeNotificationUrl(event.notification.data?.url);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(urlToOpen);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window (same-origin path only)
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// ── Runtime caching strategies ───────────────────────────────────
// Intentionally minimal: the app is a link-out habit tracker and
// does not render jw.org HTML in-page. Caching third-party origins
// (www.jw.org, wol.jw.org, fonts.*, api.*) burned quota and could
// serve stale opaque responses — removed in the 2026-07-24 audit.

// Same-origin images (icons, PWA assets) — CacheFirst
registerRoute(
  ({ url, request }) =>
    url.origin === self.location.origin &&
    (request.destination === 'image' || /\.(?:png|jpg|jpeg|svg|gif|webp)$/.test(url.pathname)),
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);
