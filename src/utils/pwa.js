/**
 * PWA utility — install prompt, connectivity, service worker updates.
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
  try {
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return choice;
  } catch {
    deferredPrompt = null;
    return { outcome: 'dismissed' };
  }
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
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) await reg.update();
  } catch {
    // ignore — offline / SW unavailable
  }
}

/** Apply a pending service worker update. Posts SKIP_WAITING to the
 * waiting worker, then reloads once the new controller activates. */
export function forceUpdate() {
  if (!('serviceWorker' in navigator)) return;

  const reloadOnce = () => {
    navigator.serviceWorker.removeEventListener('controllerchange', reloadOnce);
    window.location.reload();
  };
  navigator.serviceWorker.addEventListener('controllerchange', reloadOnce);

  navigator.serviceWorker
    .getRegistration()
    .then((reg) => {
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        return;
      }
      // No waiting worker — drop the reload listener and try an update check.
      navigator.serviceWorker.removeEventListener('controllerchange', reloadOnce);
      if (reg) return reg.update();
    })
    .catch(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', reloadOnce);
    });
}
