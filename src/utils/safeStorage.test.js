import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isQuotaExceededError, safeSetItem } from './safeStorage';

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
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('writes normally', () => {
    expect(safeSetItem('k', 'v')).toBe(true);
    expect(localStorage.getItem('k')).toBe('v');
  });

  it('evicts jw-error-logs and retries on quota', () => {
    localStorage.setItem('jw-error-logs', '[]');
    const realSetItem = localStorage.setItem.bind(localStorage);
    let calls = 0;
    localStorage.setItem = (key, value) => {
      calls += 1;
      if (calls === 1) {
        const err = new Error('quota');
        err.name = 'QuotaExceededError';
        throw err;
      }
      return realSetItem(key, value);
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
