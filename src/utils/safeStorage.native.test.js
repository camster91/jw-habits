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

it('blocks normal data writes during interrupted restore, permits only restore writes, and recovers its queue', async () => {
  prefs.set('faithful-days-restore-journal-v1', JSON.stringify({ status: 'pending' }));
  await expect(durableSet('faithful-days-organiser-v1', 'unsafe')).rejects.toThrow(
    'Restore is incomplete'
  );
  expect(prefs.get('faithful-days-organiser-v1')).toBeUndefined();
  await durableSet('faithful-days-organiser-v1', 'recovered', { restore: true });
  expect(prefs.get('faithful-days-organiser-v1')).toBe('recovered');
  prefs.set(
    'faithful-days-restore-journal-v1',
    JSON.stringify({ version: 99, status: 'complete' })
  );
  await expect(durableSet('faithful-days-organiser-v1', 'unsafe')).rejects.toThrow(
    'Restore is incomplete'
  );
  prefs.set('faithful-days-restore-journal-v1', 'broken');
  await expect(durableSet('faithful-days-organiser-v1', 'unsafe')).rejects.toThrow();
  prefs.set('faithful-days-restore-journal-v1', JSON.stringify({ version: 1, status: 'complete' }));
  await durableSet('faithful-days-organiser-v1', 'safe');
  expect(prefs.get('faithful-days-organiser-v1')).toBe('safe');
  prefs.delete('faithful-days-restore-journal-v1');
});
