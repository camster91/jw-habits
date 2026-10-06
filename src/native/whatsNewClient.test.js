import { describe, it, expect, vi, beforeEach } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn() }));
const native = vi.hoisted(() => ({ isNative: true }));
const hooks = vi.hoisted(() => ({ foreground: null }));

vi.mock('@capacitor/core', () => ({ CapacitorHttp: http }));
vi.mock('../utils/native.js', () => ({
  get isNative() {
    return native.isNative;
  },
}));
vi.mock('../data/StoreProvider.jsx', () => ({
  onForeground: (cb) => {
    hooks.foreground = cb;
    return () => {};
  },
}));

import i18n from 'i18next';
import { checkWhatsNew, registerWhatsNewCheck, whatsNewPageUrl } from './whatsNewClient.js';
import { defaultStore } from '../domain/store.js';
import { FEED_XML, FIXTURE_TITLES } from '../domain/whatsNew.fixture.js';

const NOW = new Date('2026-10-06T12:00:00.000Z');
const storeWith = (whatsNew) => ({ ...defaultStore('2026-10-01', 'en'), whatsNew });
const base = { enabled: true, lastCheck: null, seen: [], newCount: 0 };

beforeEach(() => {
  http.get.mockReset();
  native.isNative = true;
  hooks.foreground = null;
});

describe('checkWhatsNew', () => {
  it('fetches natively with a 10 s timeout and records state', async () => {
    http.get.mockResolvedValue({ status: 200, data: FEED_XML });
    const next = await checkWhatsNew(storeWith(base), NOW, 'es');
    expect(http.get).toHaveBeenCalledWith({
      url: 'https://www.jw.org/es/lo-nuevo/rss/WhatsNewWebArticles/feed.xml',
      connectTimeout: 10000,
      readTimeout: 10000,
    });
    expect(next.lastCheck).toBe(NOW.toISOString());
    expect(next.newCount).toBe(0);
    const json = JSON.stringify(next);
    for (const title of FIXTURE_TITLES) expect(json).not.toContain(title);
  });

  it('reports new items after the first check', async () => {
    http.get.mockResolvedValue({ status: 200, data: FEED_XML });
    const wn = { ...base, lastCheck: '2026-10-04T00:00:00.000Z', seen: ['ccc333'] };
    expect((await checkWhatsNew(storeWith(wn), NOW, 'en')).newCount).toBe(2);
  });

  it('makes no HTTP call within 24 h of lastCheck', async () => {
    const wn = { ...base, lastCheck: '2026-10-06T00:00:01.000Z' };
    expect(await checkWhatsNew(storeWith(wn), NOW, 'en')).toBeNull();
    expect(http.get).not.toHaveBeenCalled();
  });

  it('checks again once 24 h have passed', async () => {
    http.get.mockResolvedValue({ status: 200, data: FEED_XML });
    const wn = { ...base, lastCheck: '2026-10-05T12:00:00.000Z' };
    expect(await checkWhatsNew(storeWith(wn), NOW, 'en')).not.toBeNull();
  });

  it('does nothing when disabled or on web', async () => {
    expect(await checkWhatsNew(storeWith({ ...base, enabled: false }), NOW, 'en')).toBeNull();
    native.isNative = false;
    expect(await checkWhatsNew(storeWith(base), NOW, 'en')).toBeNull();
    expect(http.get).not.toHaveBeenCalled();
  });

  it('resolves null on a rejected request, non-2xx, or non-string body', async () => {
    http.get.mockRejectedValueOnce(new Error('offline'));
    expect(await checkWhatsNew(storeWith(base), NOW, 'en')).toBeNull();
    http.get.mockResolvedValueOnce({ status: 503, data: FEED_XML });
    expect(await checkWhatsNew(storeWith(base), NOW, 'en')).toBeNull();
    http.get.mockResolvedValueOnce({ status: 200, data: { not: 'a string' } });
    expect(await checkWhatsNew(storeWith(base), NOW, 'en')).toBeNull();
  });
});

describe('registerWhatsNewCheck', () => {
  it('on foreground, checks with the i18n locale and updates the store', async () => {
    http.get.mockResolvedValue({ status: 200, data: FEED_XML });
    await i18n.changeLanguage('fr-CA');
    registerWhatsNewCheck();
    const update = vi.fn();
    await hooks.foreground({ store: storeWith(base), update });
    expect(http.get.mock.calls[0][0].url).toContain('/fr/nouveautes/');
    const merged = update.mock.calls[0][0]({ other: 1 });
    expect(merged.other).toBe(1);
    expect(merged.whatsNew.seen).toEqual(['aaa111', 'bbb222', 'ccc333']);
    await i18n.changeLanguage('en');
  });

  it('does not update when the check yields null', async () => {
    http.get.mockRejectedValue(new Error('x'));
    registerWhatsNewCheck();
    const update = vi.fn();
    await hooks.foreground({ store: storeWith(base), update });
    expect(update).not.toHaveBeenCalled();
  });
});

describe('whatsNewPageUrl', () => {
  it('is re-exported for the Today badge', () => {
    expect(whatsNewPageUrl('fr')).toBe('https://www.jw.org/fr/nouveautes/');
  });
});
