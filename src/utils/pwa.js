/**
 * PWA utility — install prompt, connectivity, service worker
 * updates. Notifications are NOT included; the launchpad
 * version of the app does not schedule local notifications.
 *
 * Previously also re-exported `isNotificationSupported` etc.
 * for the settings notification panel; that panel was removed
 * during the home-strip-down so those symbols are gone too.
 */

/** PWA capability detection — true if the browser supports
 * `beforeinstallprompt` + a service worker. */
export function isPWACapable() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'BeforeInstallPromptEvent' in window
  );
}

let deferredPrompt = null;

export function getDeferredPrompt() {
  return deferredPrompt;
}

export function setDeferredPrompt(e) {
  deferredPrompt = e;
}

/** True if the app is currently running as an installed PWA. */
export function isInstalled() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
}

/** Trigger the browser's native install prompt. Returns a promise
 * resolving to `{ outcome: 'accepted' | 'dismissed' }`. */
export async function triggerInstallPrompt() {
  if (!deferredPrompt) return { outcome: 'no-prompt' };
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  return choice;
}

export function isOnline() {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

/** Subscribe to online/offline events. Returns an unsubscribe
 * function. */
export function registerConnectivityListeners(onOnline, onOffline) {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

/** Trigger a service worker update check by re-registering. */
export async function checkForUpdates() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg) await reg.update();
}

/** Apply a pending service worker update. Skips waiting and
 * reloads the page so the new SW takes over. */
export function forceUpdate() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker
    .getRegistration()
    .then((reg) => {
      if (!reg) return;
      const reloadOnce = () => {
        navigator.serviceWorker.removeEventListener('controllerchange', reloadOnce);
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener('controllerchange', reloadOnce);
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        // No waiting worker yet — nudge an update check. If nothing
        // arrives shortly, drop the reload listener to avoid a
        // surprise reload on a later update.
        reg.update().catch(() => {});
        setTimeout(() => {
          navigator.serviceWorker.removeEventListener('controllerchange', reloadOnce);
        }, 10_000);
      }
    })
    .catch(() => {});
}
