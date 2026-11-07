import { describe, it, expect, vi, beforeEach } from 'vitest';

const prefs = new Map();
const order = [];
vi.mock('./native.js', () => ({ isNative: true }));
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    keys: vi.fn(async () => ({ keys: [...prefs.keys()] })),
    get: vi.fn(async ({ key }) => ({ value: prefs.has(key) ? prefs.get(key) : null })),
    set: vi.fn(async ({ key, value }) => {
      // The first write is slower; serialization must still apply it first.
      await new Promise((r) => setTimeout(r, value === 'slow' ? 20 : 0));
      order.push(value);
      prefs.set(key, value);
    }),
    remove: vi.fn(async ({ key }) => {
      prefs.delete(key);
    }),
  },
}));

import { durableGet, durableSet, durableRemove, durableKeys } from './safeStorage';
import { Preferences } from '@capacitor/preferences';
beforeEach(() => {
  prefs.clear();
  order.length = 0;
  vi.clearAllMocks();
});

describe('durable storage (native)', () => {
  it('lists retained native copies through Preferences and propagates listing failure', async () => {
    const key = 'jw-habits-v2-corrupt-1700000000000';
    await durableSet(key, '');
    expect(await durableKeys()).toContain(key);
    expect(await durableGet(key)).toBe('');
    vi.mocked(Preferences.keys).mockRejectedValueOnce(new Error('native keys unavailable'));
    await expect(durableKeys()).rejects.toThrow('native keys unavailable');
    await durableRemove(key);
  });
  it('uses Preferences and applies writes in call order', async () => {
    await Promise.all([durableSet('k', 'slow'), durableSet('k', 'fast')]);
    expect(order).toEqual(['slow', 'fast']);
    expect(await durableGet('k')).toBe('fast');
    expect(localStorage.getItem('k')).toBeNull();
    await durableRemove('k');
    expect(await durableGet('k')).toBeNull();
  });
});
