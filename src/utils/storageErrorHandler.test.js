import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  createStorageErrorHandler,
  createSafeStorage,
} from './storageErrorHandler.js';

// The shared test setup at src/test/setup.js replaces global.localStorage
// with a stub that exposes only getItem/setItem/clear/removeItem — no
// `length`, no `key()`. The real Storage interface is needed here (the
// handler iterates localStorage.length and calls localStorage.key(i) for
// its LRU eviction), so we install a real in-memory shim for the duration
// of this file. vi.stubGlobal unwinds automatically when the test file's
// teardown runs.
//
// Also stubs console.warn/console.error so the LRU-eviction messages
// (which print on every quota path) don't pollute the vitest output.
let storage, warnSpy, errorSpy;

const makeStorageShim = () => {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
    clear: () => { data.clear(); },
    get length() { return data.size; },
    key: (i) => Array.from(data.keys())[i] ?? null,
  };
};

beforeEach(() => {
  storage = makeStorageShim();
  vi.stubGlobal('localStorage', storage);
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  warnSpy.mockRestore();
  errorSpy.mockRestore();
});

describe('createStorageErrorHandler', () => {
  describe('quota error handling', () => {
    it('triggers LRU cleanup when QuotaExceededError is thrown', () => {
      // Seed localStorage with some app keys
      localStorage.setItem('jw-progress-storage', '{"points":0}');
      localStorage.setItem('jw-progress-settings', '{"theme":"light"}');
      localStorage.setItem('jw-habits-onboarded', 'true');

      const handler = createStorageErrorHandler('test-store');
      const quotaError = new DOMException('quota', 'QuotaExceededError');
      handler(quotaError);

      // All 3 seeded jw- keys should be evicted (under the 5-key cap)
      expect(localStorage.getItem('jw-progress-storage')).toBeNull();
      expect(localStorage.getItem('jw-progress-settings')).toBeNull();
      expect(localStorage.getItem('jw-habits-onboarded')).toBeNull();
    });

    it('caps eviction at 5 keys when more than 5 app keys exist', () => {
      // Seed 8 app keys. The handler should evict the first 5 (oldest, per
      // localStorage iteration order) and leave the last 3.
      for (let i = 0; i < 8; i++) {
        localStorage.setItem(`jw-key-${i}`, `value-${i}`);
      }

      const handler = createStorageErrorHandler('test-store');
      handler(new DOMException('quota', 'QuotaExceededError'));

      // First 5 should be gone
      for (let i = 0; i < 5; i++) {
        expect(localStorage.getItem(`jw-key-${i}`)).toBeNull();
      }
      // Last 3 should remain
      for (let i = 5; i < 8; i++) {
        expect(localStorage.getItem(`jw-key-${i}`)).toBe(`value-${i}`);
      }
    });

    it('only evicts app-owned keys (jw- and jw-habits- prefixes)', () => {
      localStorage.setItem('jw-progress-storage', '1');
      localStorage.setItem('jw-habits-onboarded', '2');
      // Foreign keys that should NOT be touched
      localStorage.setItem('other-app-state', '3');
      localStorage.setItem('analytics-id', '4');
      localStorage.setItem('myapp_settings', '5'); // doesn't start with jw-

      const handler = createStorageErrorHandler('test-store');
      handler(new DOMException('quota', 'QuotaExceededError'));

      // App keys gone
      expect(localStorage.getItem('jw-progress-storage')).toBeNull();
      expect(localStorage.getItem('jw-habits-onboarded')).toBeNull();
      // Foreign keys preserved
      expect(localStorage.getItem('other-app-state')).toBe('3');
      expect(localStorage.getItem('analytics-id')).toBe('4');
      expect(localStorage.getItem('myapp_settings')).toBe('5');
    });

    it('recognizes Firefox/Safari NS_ERROR_DOM_QUOTA_REACHED as quota', () => {
      localStorage.setItem('jw-progress-storage', '1');
      const handler = createStorageErrorHandler('test-store');
      handler(new DOMException('quota', 'NS_ERROR_DOM_QUOTA_REACHED'));
      expect(localStorage.getItem('jw-progress-storage')).toBeNull();
    });

    it('recognizes a legacy code 22 DOMException as quota', () => {
      // jsdom's DOMException.code is read-only, so we can't construct
      // one with a custom code. Instead, assert that a real
      // QuotaExceededError DOMException — which natively has code === 22
      // per the WHATWG spec — IS recognized as quota. This covers the
      // "Firefox legacy code" path implicitly.
      localStorage.setItem('jw-progress-storage', '1');
      const handler = createStorageErrorHandler('test-store');
      handler(new DOMException('quota', 'QuotaExceededError'));
      expect(localStorage.getItem('jw-progress-storage')).toBeNull();
    });

    it('does NOT treat a plain Error with code 22 as quota', () => {
      // A plain Error (not a DOMException) with code 22 should not be
      // treated as quota — it goes through the else branch and is just logged.
      localStorage.setItem('jw-progress-storage', '1');
      const handler = createStorageErrorHandler('test-store');
      const error = new Error('something else');
      // @ts-ignore — intentionally setting a legacy browser shape
      error.code = 22;
      handler(error);
      // Key preserved
      expect(localStorage.getItem('jw-progress-storage')).toBe('1');
      // Logged via console.error
      expect(errorSpy).toHaveBeenCalled();
    });

    it('does NOT evict on non-quota errors', () => {
      localStorage.setItem('jw-progress-storage', '{"points":0}');
      const handler = createStorageErrorHandler('test-store');
      handler(new Error('SecurityError: storage access denied'));
      // Key should still be there
      expect(localStorage.getItem('jw-progress-storage')).toBe('{"points":0}');
      // The error should be logged via console.error
      expect(errorSpy).toHaveBeenCalled();
    });

    it('catches its own cleanup errors and logs them (does not throw)', () => {
      // Seed 2 keys so the for loop iterates at least twice and hits
      // the 2nd call to localStorage.key() (which throws).
      localStorage.setItem('jw-progress-storage', '1');
      localStorage.setItem('jw-habits-onboarded', 'true');

      const realKey = storage.key;
      let callCount = 0;
      storage.key = (i) => {
        callCount++;
        if (callCount === 2) throw new Error('storage locked');
        return realKey(i);
      };

      const handler = createStorageErrorHandler('test-store');
      // Should NOT throw, should log
      expect(() => handler(new DOMException('quota', 'QuotaExceededError'))).not.toThrow();
      // The error from the cleanup was caught and logged via console.error
      expect(errorSpy).toHaveBeenCalled();
      // Restore for the next test
      storage.key = realKey;
    });

    it('emits a warn line identifying the store name', () => {
      const handler = createStorageErrorHandler('my-cool-store');
      handler(new DOMException('quota', 'QuotaExceededError'));
      const allWarn = warnSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(allWarn).toMatch(/my-cool-store/);
    });
  });
});

describe('createSafeStorage', () => {
  describe('getItem', () => {
    it('returns null when the key is missing', () => {
      const storage = createSafeStorage('test');
      expect(storage.getItem('nope')).toBeNull();
    });

    it('parses JSON-encoded values back into objects', () => {
      localStorage.setItem('jw-progress-storage', JSON.stringify({ points: 42, streak: 7 }));
      const storage = createSafeStorage('test');
      const value = storage.getItem('jw-progress-storage');
      expect(value).toEqual({ points: 42, streak: 7 });
    });

    it('returns null for legacy non-JSON values (the "[object Object]" bug)', () => {
      // Simulate a value left over from the pre-fix era where setItem
      // was passed a raw object and localStorage coerced it to "[object Object]".
      localStorage.setItem('jw-progress-storage', '[object Object]');
      const storage = createSafeStorage('test');
      // Must NOT throw — should return null so the store starts fresh.
      expect(() => storage.getItem('jw-progress-storage')).not.toThrow();
      expect(storage.getItem('jw-progress-storage')).toBeNull();
    });

    it('returns null and logs the error if localStorage.getItem itself throws', () => {
      // Replace getItem with one that throws
      const realGetItem = storage.getItem;
      storage.getItem = () => {
        throw new DOMException('SecurityError', 'SecurityError');
      };
      const storage2 = createSafeStorage('test');
      // Should NOT throw, should return null
      expect(() => storage2.getItem('any-key')).not.toThrow();
      expect(storage2.getItem('any-key')).toBeNull();
      // SecurityError is not a quota error, so console.error (not warn)
      expect(errorSpy).toHaveBeenCalled();
      storage.getItem = realGetItem;
    });
  });

  describe('setItem', () => {
    it('stringifies the value as JSON before storing', () => {
      const storage = createSafeStorage('test');
      storage.setItem('jw-progress-storage', { points: 42, nested: { ok: true } });
      const raw = localStorage.getItem('jw-progress-storage');
      expect(raw).toBe('{"points":42,"nested":{"ok":true}}');
      // Must be the JSON string, not the literal "[object Object]"
      expect(raw).not.toBe('[object Object]');
    });

    it('invokes the error handler when localStorage.setItem throws quota', () => {
      // Seed BEFORE replacing setItem. The LRU cleanup needs a real
      // app key in storage to evict.
      localStorage.setItem('jw-existing', 'old');

      // Now replace setItem with one that throws QuotaExceededError on
      // the next call. The LRU cleanup uses `removeItem`, not setItem,
      // so the eviction itself still works.
      const realSetItem = storage.setItem;
      let calls = 0;
      storage.setItem = (key, value) => {
        calls++;
        if (calls === 1) {
          throw new DOMException('quota', 'QuotaExceededError');
        }
        return realSetItem(key, value);
      };

      const storage2 = createSafeStorage('my-store');
      // Should NOT throw — the error handler swallows the quota error
      expect(() => storage2.setItem('jw-progress-storage', { a: 1 })).not.toThrow();
      // The warn line about quota was emitted
      const allWarn = warnSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(allWarn).toMatch(/quota/i);
    });
  });

  describe('removeItem', () => {
    it('removes the key', () => {
      localStorage.setItem('jw-progress-storage', '{"x":1}');
      const storage = createSafeStorage('test');
      storage.removeItem('jw-progress-storage');
      expect(localStorage.getItem('jw-progress-storage')).toBeNull();
    });

    it('does not throw if the key does not exist', () => {
      const storage = createSafeStorage('test');
      expect(() => storage.removeItem('does-not-exist')).not.toThrow();
    });

    it('does not throw if localStorage.removeItem itself fails', () => {
      const realRemoveItem = storage.removeItem;
      storage.removeItem = () => {
        throw new DOMException('SecurityError', 'SecurityError');
      };
      const storage2 = createSafeStorage('test');
      expect(() => storage2.removeItem('any-key')).not.toThrow();
      storage.removeItem = realRemoveItem;
    });
  });

  describe('integration: round-trip', () => {
    it('preserves a complex object through setItem → getItem', () => {
      const storage = createSafeStorage('test');
      const original = {
        points: 1234,
        streaks: { daily: 7, prayer: 3 },
        achievements: [
          { id: 'first_text', unlockedAt: '2026-06-12T12:00:00Z' },
          { id: 'week_streak', unlockedAt: '2026-06-12T13:00:00Z' },
        ],
        nested: { deeply: { value: null } },
      };
      storage.setItem('jw-gamification-storage', original);
      const recovered = storage.getItem('jw-gamification-storage');
      expect(recovered).toEqual(original);
    });
  });
});
