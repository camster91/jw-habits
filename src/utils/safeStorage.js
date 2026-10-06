/**
 * localStorage helpers that survive QuotaExceededError.
 *
 * After storageErrorHandler was deleted, habit/settings writes
 * silently no-op'd on quota failures — UI looked saved until reload.
 * These helpers evict non-essential keys once, retry, then signal
 * the UI via `jw-storage-full` when persistence still fails.
 */

import { Preferences } from '@capacitor/preferences';
import { isNative } from './native.js';

const EVICTABLE_KEYS = ['jw-error-logs'];

export function isQuotaExceededError(error) {
  if (!error) return false;
  return (
    error.name === 'QuotaExceededError' ||
    // Legacy WebKit / IE codes
    error.code === 22 ||
    error.code === 1014
  );
}

/**
 * @param {string} key
 * @param {string} value
 * @returns {boolean} true when the write succeeded
 */
export function safeSetItem(key, value) {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (!isQuotaExceededError(error)) return false;
    try {
      for (const evictKey of EVICTABLE_KEYS) {
        try {
          localStorage.removeItem(evictKey);
        } catch {
          // ignore per-key eviction failures
        }
      }
      localStorage.setItem(key, value);
      return true;
    } catch {
      try {
        window.dispatchEvent(new CustomEvent('jw-storage-full', { detail: { key } }));
      } catch {
        // SSR / non-window environments
      }
      return false;
    }
  }
}

/**
 * @param {string} key
 * @returns {boolean}
 */
export function safeRemoveItem(key) {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} key
 * @returns {string|null}
 */
export function safeGetItem(key) {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * sessionStorage variants for ephemeral UI dismissals (update banner).
 * @param {string} key
 * @returns {string|null}
 */
export function safeSessionGetItem(key) {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * @param {string} key
 * @param {string} value
 * @returns {boolean}
 */
export function safeSessionSetItem(key, value) {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Wipe every localStorage key (the error screen's "clear all data"). */
export function safeClearAll() {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.clear();
    return true;
  } catch {
    return false;
  }
}

/**
 * Durable storage: Capacitor Preferences on native (survives the WebView being
 * purged), the safe localStorage helpers on web. Writes are serialized through
 * one promise chain so the last call wins; a failed write rejects to its caller
 * but never blocks the writes queued behind it.
 */
let writeChain = Promise.resolve();

function enqueue(task) {
  const run = writeChain.then(task);
  writeChain = run.catch(() => {});
  return run;
}

/** @returns {Promise<string|null>} */
export async function durableGet(key) {
  if (isNative) {
    const { value } = await Preferences.get({ key });
    return value ?? null;
  }
  return safeGetItem(key);
}

/** @returns {Promise<void>} rejects when the write could not be stored */
export function durableSet(key, value) {
  return enqueue(async () => {
    if (isNative) {
      await Preferences.set({ key, value });
    } else if (!safeSetItem(key, value)) {
      throw new Error(`Could not persist "${key}"`);
    }
  });
}

/** @returns {Promise<void>} */
export function durableRemove(key) {
  return enqueue(async () => {
    if (isNative) {
      await Preferences.remove({ key });
    } else {
      safeRemoveItem(key);
    }
  });
}
