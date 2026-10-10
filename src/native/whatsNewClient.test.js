import { describe, it, expect, vi } from 'vitest';
import { CapacitorHttp } from '@capacitor/core';
import { fetchFeedItems, checkWhatsNew, registerWhatsNewCheck } from './whatsNewClient.js';
vi.mock('@capacitor/core', () => ({ CapacitorHttp: { get: vi.fn() } }));
describe('link-only What’s New', () => {
  it('does not collect site data even with legacy native update metadata', async () => {
    const metadata = { enabled: true, lastCheck: null, seen: [], newCount: 4 };
    const before = structuredClone(metadata);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      expect(await fetchFeedItems(metadata, new Date(), 'en')).toBeNull();
      expect(await checkWhatsNew({ whatsNew: metadata }, new Date(), 'en')).toBeNull();
      registerWhatsNewCheck()();
      expect(CapacitorHttp.get).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(metadata).toEqual(before);
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
