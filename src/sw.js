import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Precache all assets from vite build
precacheAndRoute(self.__WB_MANIFEST);

// Clean old caches on activation
cleanupOutdatedCaches();

// NOTE: We deliberately do NOT auto-call `self.skipWaiting()` on
// install. That would activate a new SW mid-session and cause a
// hard reload via controllerchange, destroying unsaved notes.
// Activation happens only after the user clicks "Update" in
// UpdatePrompt, which posts SKIP_WAITING (handled below).

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/** Only allow same-origin relative paths for notification navigation. */
function safeClientUrl(raw) {
  if (typeof raw !== 'string' || !raw) return '/';
  if (raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('\\')) {
    return raw;
  }
  try {
    const url = new URL(raw, self.location.origin);
    if (url.origin !== self.location.origin) return '/';
    return `${url.pathname}${url.search}${url.hash}` || '/';
  } catch {
    return '/';
  }
}

// ── Navigation fallback for SPA routes ───────────────────────
// Without this, deep links return the browser offline error page
// when offline, because the precache holds /index.html but no
// navigation route serves it.
registerRoute(
  new NavigationRoute(
    async ({ event }) => {
      try {
        return await fetch(event.request);
      } catch {
        // caches.match returns a Promise — must await. The previous
        // `caches.match(...) || fetch(...)` always took the Promise
        // branch (truthy) and never fell back when the match missed.
        const cached =
          (await caches.match('/index.html')) ||
          (await caches.match(new URL('/index.html', self.location.origin).href));
        if (cached) return cached;
        return Response.error();
      }
    },
    {
      denylist: [/^\/sw\.js$/, /^\/manifest\.webmanifest$/],
    }
  )
);

// ── Notification click handler ────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = safeClientUrl(event.notification.data?.url);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          const clientOrigin = (() => {
            try {
              return new URL(client.url).origin;
            } catch {
              return null;
            }
          })();
          if (clientOrigin === self.location.origin) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
      }
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// ── Runtime caching strategies ───────────────────────────────────
// Same-origin images only — avoid caching attacker-controlled hosts
// if the app ever requests a remote image URL.
registerRoute(
  ({ url, request }) =>
    request.destination === 'image' &&
    url.origin === self.location.origin &&
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/.test(url.pathname),
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);

// Same-origin fonts
registerRoute(
  ({ url }) =>
    url.origin === self.location.origin && /\.(?:woff|woff2|ttf|otf|eot)$/.test(url.pathname),
  new CacheFirst({
    cacheName: 'fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);

// Keep a tiny SWR for the web manifest (same-origin only)
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.endsWith('.webmanifest'),
  new StaleWhileRevalidate({
    cacheName: 'manifest-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 2, maxAgeSeconds: 7 * 24 * 60 * 60 })],
  })
);
