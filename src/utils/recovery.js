import { durableGet, durableSet } from './safeStorage.js';
import { defaultStore } from '../domain/store.js';
import { appDay } from '../domain/day.js';
const STORE_KEY = 'jw-habits-v2';

/** Read the original bytes, even if a damaged value cannot be parsed. */
export const recoveryCopy = () => durableGet(STORE_KEY);

/** Explicit user-confirmed reset: only the current app store, never the origin. */
export const resetCurrentStore = (locale = 'en') =>
  durableSet(STORE_KEY, JSON.stringify(defaultStore(appDay(new Date()), locale)));

export async function refreshAppShell() {
  if ('caches' in window) {
    const names = await caches.keys();
    await Promise.all(
      names.filter((name) => name.startsWith('faithful-days-')).map((name) => caches.delete(name))
    );
  }
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const expected = new URL('sw.js', document.baseURI).href;
    await Promise.all(
      registrations
        .filter((reg) =>
          [reg.active, reg.waiting, reg.installing].some((worker) => worker?.scriptURL === expected)
        )
        .map((reg) => reg.unregister())
    );
  }
}
