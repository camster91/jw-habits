import { describe, expect, it, vi } from 'vitest';
import { recoveryCopy, resetCurrentStore, refreshAppShell } from './recovery.js';
import { validateStore } from '../domain/store.js';
vi.mock('./native.js', () => ({ isNative: false }));
describe('scoped recovery', () => {
  it('preserves original bytes and resets only the current store', async () => {
    localStorage.setItem('jw-habits-v2', '{ damaged');
    localStorage.setItem('jw-habits-v2-backup', 'original');
    localStorage.setItem('other-site-data', 'keep');
    expect(await recoveryCopy()).toBe('{ damaged');
    await resetCurrentStore('en');
    expect(validateStore(JSON.parse(localStorage.getItem('jw-habits-v2'))).ok).toBe(true);
    expect(localStorage.getItem('jw-habits-v2-backup')).toBe('original');
    expect(localStorage.getItem('other-site-data')).toBe('keep');
  });
  it('refreshes only app-owned caches and service workers', async () => {
    const remove = vi.fn();
    const own = {
      active: { scriptURL: new URL('sw.js', document.baseURI).href },
      unregister: vi.fn(),
    };
    const other = {
      active: { scriptURL: new URL('other/sw.js', document.baseURI).href },
      unregister: vi.fn(),
    };
    vi.stubGlobal('caches', {
      keys: async () => ['faithful-days-precache', 'other-cache'],
      delete: remove,
    });
    const original = navigator.serviceWorker;
    navigator.serviceWorker = { getRegistrations: async () => [own, other] };
    try {
      await refreshAppShell();
      expect(remove).toHaveBeenCalledExactlyOnceWith('faithful-days-precache');
      expect(own.unregister).toHaveBeenCalledOnce();
      expect(other.unregister).not.toHaveBeenCalled();
    } finally {
      navigator.serviceWorker = original;
      vi.unstubAllGlobals();
    }
  });
});
