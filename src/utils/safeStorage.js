/**
 * localStorage helpers that survive QuotaExceededError.
 *
 * After storageErrorHandler was deleted, habit/settings writes
 * silently no-op'd on quota failures — UI looked saved until reload.
 * These helpers evict non-essential keys once, retry, then signal
 * the UI via `jw-storage-full` when persistence still fails.
 */

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
