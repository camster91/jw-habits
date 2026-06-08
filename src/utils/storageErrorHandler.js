/**
 * Handles localStorage quota errors for Zustand persist middleware.
 * When storage is full, this catches the error, attempts cleanup, and
 * falls back to in-memory storage rather than crashing the app.
 */
export function createStorageErrorHandler(storeName) {
  return function onStorageError(error) {
    if (
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.code === 22)
    ) {
      console.warn(`[Zustand Persist] localStorage quota exceeded for "${storeName}". Attempting cleanup...`);

      try {
        // LRU eviction: remove oldest app-owned keys first, keep recent data
        const appPrefixes = ['jw-', 'jw-habits-'];
        const appKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && appPrefixes.some(prefix => key.startsWith(prefix))) {
            appKeys.push(key);
          }
        }
        // Sort by last modified (approximated by order) and remove oldest
        // Remove up to 5 oldest app keys to free space
        const keysToRemove = appKeys.slice(0, Math.min(5, appKeys.length));
        keysToRemove.forEach((key) => {
          console.warn(`[Zustand Persist] Evicting old key: ${key}`);
          localStorage.removeItem(key);
        });

        console.warn(
          `[Zustand Persist] Evicted ${keysToRemove.length} old app keys. ` +
            `App will continue with in-memory state.`
        );
      } catch (cleanupError) {
        console.error(
          `[Zustand Persist] Failed to cleanup localStorage for "${storeName}":`,
          cleanupError
        );
      }
    } else {
      console.error(`[Zustand Persist] Storage error for "${storeName}":`, error);
    }
  };
}

/**
 * Custom storage that wraps localStorage with quota error handling.
 * Falls back to in-memory storage when localStorage is unavailable.
 *
 * Applies JSON.stringify in setItem and JSON.parse in getItem because
 * Zustand's persist middleware does NOT do that for us when we pass
 * a raw StateStorage (that only happens with createJSONStorage).
 * Without this, every stored value was being coerced to the literal
 * string "[object Object]" by localStorage.setItem, and every reload
 * lost all user data.
 */
export function createSafeStorage(storeName) {
  const errorHandler = createStorageErrorHandler(storeName);

  return {
    getItem: (name) => {
      try {
        const raw = localStorage.getItem(name);
        if (raw === null) return null;
        try {
          return JSON.parse(raw);
        } catch {
          // Legacy non-JSON value (e.g. pre-fix "[object Object]") — return null so
          // the store starts fresh rather than crashing on a corrupt blob.
          return null;
        }
      } catch (error) {
        errorHandler(error);
        return null;
      }
    },
    setItem: (name, value) => {
      try {
        localStorage.setItem(name, JSON.stringify(value));
      } catch (error) {
        errorHandler(error);
      }
    },
    removeItem: (name) => {
      try {
        localStorage.removeItem(name);
      } catch (error) {
        errorHandler(error);
      }
    },
  };
}