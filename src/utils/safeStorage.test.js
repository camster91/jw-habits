import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isQuotaExceededError,
  safeSetItem,
  safeGetItem,
  safeSessionGetItem,
  safeSessionSetItem,
} from './safeStorage';

// setup.js replaces global.localStorage with a Map-backed mock.
// Tests that overwrite localStorage.setItem must restore it.
const mockSetItem = localStorage.setItem.bind(localStorage);
const mockGetItem = localStorage.getItem.bind(localStorage);
const mockRemoveItem = localStorage.removeItem.bind(localStorage);

function restoreLocalStorageMock() {
  localStorage.setItem = mockSetItem;
  localStorage.getItem = mockGetItem;
  localStorage.removeItem = mockRemoveItem;
}

describe('isQuotaExceededError', () => {
  it('detects QuotaExceededError by name', () => {
    expect(isQuotaExceededError({ name: 'QuotaExceededError' })).toBe(true);
  });

  it('detects legacy numeric codes', () => {
    expect(isQuotaExceededError({ code: 22 })).toBe(true);
    expect(isQuotaExceededError({ code: 1014 })).toBe(true);
  });

  it('rejects unrelated errors', () => {
    expect(isQuotaExceededError({ name: 'TypeError' })).toBe(false);
    expect(isQuotaExceededError(null)).toBe(false);
  });
});

describe('safeSetItem', () => {
  beforeEach(() => {
    restoreLocalStorageMock();
    localStorage.clear();
  });

  afterEach(() => {
    restoreLocalStorageMock();
  });

  it('writes normally', () => {
    expect(safeSetItem('k', 'v')).toBe(true);
    expect(localStorage.getItem('k')).toBe('v');
  });

  it('evicts jw-error-logs and retries on quota', () => {
    localStorage.setItem('jw-error-logs', '[]');
    let calls = 0;
    localStorage.setItem = (key, value) => {
      calls += 1;
      if (calls === 1) {
        const err = new Error('quota');
        err.name = 'QuotaExceededError';
        throw err;
      }
      return mockSetItem(key, value);
    };

    expect(safeSetItem('habit', '{"ok":true}')).toBe(true);
    expect(localStorage.getItem('habit')).toBe('{"ok":true}');
    expect(localStorage.getItem('jw-error-logs')).toBeNull();
  });

  it('dispatches jw-storage-full when retry still fails', () => {
    const spy = vi.fn();
    window.addEventListener('jw-storage-full', spy);
    localStorage.setItem = () => {
      const err = new Error('quota');
      err.name = 'QuotaExceededError';
      throw err;
    };

    expect(safeSetItem('habit', 'x')).toBe(false);
    expect(spy).toHaveBeenCalled();
    window.removeEventListener('jw-storage-full', spy);
  });
});

describe('safeGetItem / session helpers', () => {
  beforeEach(() => {
    restoreLocalStorageMock();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('reads existing keys', () => {
    safeSetItem('safe-get-k', '1');
    expect(safeGetItem('safe-get-k')).toBe('1');
    expect(safeGetItem('safe-get-missing')).toBeNull();
  });

  it('returns null when getItem throws', () => {
    localStorage.getItem = () => {
      throw new Error('denied');
    };
    expect(safeGetItem('x')).toBeNull();
  });

  it('round-trips sessionStorage', () => {
    expect(safeSessionSetItem('safe-sess', '1')).toBe(true);
    expect(safeSessionGetItem('safe-sess')).toBe('1');
  });
});

describe('durable storage (web)', () => {
  afterEach(() => {
    restoreLocalStorageMock();
  });
  beforeEach(() => {
    restoreLocalStorageMock();
    localStorage.clear();
  });

  it('roundtrips through localStorage when not native', async () => {
    const { durableGet, durableSet, durableRemove } = await import('./safeStorage');
    expect(await durableGet('d')).toBeNull();
    await durableSet('d', 'x');
    expect(localStorage.getItem('d')).toBe('x');
    expect(await durableGet('d')).toBe('x');
    await durableRemove('d');
    expect(await durableGet('d')).toBeNull();
  });

  it('serializes writes so the last one wins', async () => {
    const { durableSet, durableGet } = await import('./safeStorage');
    await Promise.all([durableSet('w', '1'), durableSet('w', '2'), durableSet('w', '3')]);
    expect(await durableGet('w')).toBe('3');
  });

  it('rejects an unreadable value instead of reporting it as missing', async () => {
    const { durableGet } = await import('./safeStorage');
    localStorage.getItem = () => {
      throw new Error('temporary read failure');
    };
    await expect(durableGet('jw-habits-v2')).rejects.toThrow('temporary read failure');
  });

  it('rejects when a web write fails, and later writes still run', async () => {
    const { durableSet, durableGet } = await import('./safeStorage');
    localStorage.setItem = () => {
      throw new Error('boom');
    };
    await expect(durableSet('f', 'x')).rejects.toThrow();
    restoreLocalStorageMock();
    await durableSet('f', 'y');
    expect(await durableGet('f')).toBe('y');
  });
});
