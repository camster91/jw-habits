import { describe, it, expect, vi } from 'vitest';

const prefs = new Map();
const order = [];
vi.mock('./native.js', () => ({ isNative: true }));
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
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

import { durableGet, durableSet, durableRemove } from './safeStorage';

describe('durable storage (native)', () => {
  it('uses Preferences and applies writes in call order', async () => {
    await Promise.all([durableSet('k', 'slow'), durableSet('k', 'fast')]);
    expect(order).toEqual(['slow', 'fast']);
    expect(await durableGet('k')).toBe('fast');
    expect(localStorage.getItem('k')).toBeNull();
    await durableRemove('k');
    expect(await durableGet('k')).toBeNull();
  });
});
