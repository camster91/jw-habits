import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Precache all assets from vite build
precacheAndRoute(self.__WB_MANIFEST);

// Clean old caches on activation
cleanupOutdatedCaches();

// NOTE: We deliberately do NOT call `self.skipWaiting()` or
// `self.clientsClaim()` on install/activate. Those would activate
// a new SW mid-session and cause a hard reload via the
// `controllerchange` event, which destroys unsaved form state.
// Instead, the SW waits for the user to click "Update" in the
// UpdatePrompt banner. applyUpdate() in src/utils/pwa.js posts
// SKIP_WAITING; we handle that message below.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/** Only allow same-origin relative paths for notification navigation. */
function safeAppUrl(candidate) {
  if (typeof candidate !== 'string' || !candidate.startsWith('/')) return '/';
  if (candidate.startsWith('//') || candidate.includes('\\')) return '/';
  try {
    const resolved = new URL(candidate, self.location.origin);
    if (resolved.origin !== self.location.origin) return '/';
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return '/';
  }
}

// ── Navigation fallback for SPA routes ───────────────────────
registerRoute(
  new NavigationRoute(
    async ({ event }) => {
      try {
        return await fetch(event.request);
      } catch {
        return caches.match('/index.html') || fetch('/index.html');
      }
    },
    {
      denylist: [/^\/api\//, /^\/sw\.js$/, /^\/manifest\.webmanifest$/],
    }
  )
);

// ── Notification click handler ────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = safeAppUrl(event.notification.data?.url);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          try {
            const clientUrl = new URL(client.url);
            if (clientUrl.origin === self.location.origin) {
              client.navigate(urlToOpen);
              return client.focus();
            }
          } catch {
            // ignore malformed client.url
          }
        }
      }
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// ── Runtime caching strategies ───────────────────────────────────
// Restrict to same-origin only. Cross-origin JW.org / Google Fonts /
// api.* routes were unused (habit rows open jw.org in a new tab) and
// broadened the SW cache-poisoning surface.

registerRoute(
  ({ url, request }) =>
    url.origin === self.location.origin &&
    request.destination === 'image' &&
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i.test(url.pathname),
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);

registerRoute(
  ({ url }) =>
    url.origin === self.location.origin && /\.(?:woff2?|ttf|otf|eot)$/i.test(url.pathname),
  new CacheFirst({
    cacheName: 'fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);
