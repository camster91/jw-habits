import { describe, it, expect } from 'vitest';
import { feedUrl, whatsNewPageUrl, parseFeed, applyFeed, markAllSeen } from './whatsNew.js';
import {
  FEED_XML,
  EMPTY_FEED_XML,
  FIXTURE_TITLES,
  FIXTURE_DESCRIPTIONS,
} from './whatsNew.fixture.js';

const NOW = new Date('2026-10-06T12:00:00.000Z');
const fresh = () => ({ enabled: true, lastCheck: null, seen: [], newCount: 0 });
const FEED_TEXT = [...FIXTURE_TITLES, ...FIXTURE_DESCRIPTIONS];

describe('feedUrl / whatsNewPageUrl', () => {
  it('maps locales and falls back to en', () => {
    expect(feedUrl('en')).toBe('https://www.jw.org/en/whats-new/rss/WhatsNewWebArticles/feed.xml');
    expect(feedUrl('es')).toBe('https://www.jw.org/es/lo-nuevo/rss/WhatsNewWebArticles/feed.xml');
    expect(feedUrl('fr')).toBe('https://www.jw.org/fr/nouveautes/rss/WhatsNewWebArticles/feed.xml');
    expect(feedUrl('de')).toBe(feedUrl('en'));
    expect(feedUrl(undefined)).toBe(feedUrl('en'));
  });

  it('page url is the feed url without the rss path', () => {
    expect(whatsNewPageUrl('es')).toBe('https://www.jw.org/es/lo-nuevo/');
    expect(whatsNewPageUrl('xx')).toBe('https://www.jw.org/en/whats-new/');
  });
});

describe('parseFeed', () => {
  it('returns objects with exactly guid and pubDate', () => {
    const items = parseFeed(FEED_XML);
    expect(items).toHaveLength(3);
    for (const entry of items) expect(Object.keys(entry)).toEqual(['guid', 'pubDate']);
    expect(items[0]).toEqual({ guid: 'aaa111', pubDate: 'Sat, 03 Oct 2026 00:00:00 +0000' });
  });

  it('never carries titles or descriptions', () => {
    const json = JSON.stringify(parseFeed(FEED_XML));
    for (const text of FEED_TEXT) expect(json).not.toContain(text);
  });

  it('returns [] for malformed XML, an empty channel, and non-strings', () => {
    expect(parseFeed('<rss><channel><item>')).toEqual([]);
    expect(parseFeed('not xml at all')).toEqual([]);
    expect(parseFeed(EMPTY_FEED_XML)).toEqual([]);
    expect(parseFeed(undefined)).toEqual([]);
  });

  it('skips items without a guid', () => {
    const xml =
      '<rss><channel><item><pubDate>x</pubDate></item><item><guid>g1</guid></item></channel></rss>';
    expect(parseFeed(xml)).toEqual([{ guid: 'g1', pubDate: '' }]);
  });
});

describe('applyFeed', () => {
  const items = parseFeed(FEED_XML);

  it('first ever check marks everything seen with newCount 0', () => {
    const next = applyFeed(fresh(), items, NOW);
    expect(next.newCount).toBe(0);
    expect(next.lastCheck).toBe(NOW.toISOString());
    expect(next.seen).toEqual(['aaa111', 'bbb222', 'ccc333']);
  });

  it('counts unseen items', () => {
    const base = { ...fresh(), lastCheck: '2026-10-05T00:00:00.000Z', seen: ['ccc333'] };
    const next = applyFeed(base, items, NOW);
    expect(next.newCount).toBe(2);
    expect(next.lastCheck).toBe(NOW.toISOString());
    expect(next.seen).toEqual(['ccc333']);
  });

  it('an empty item list keeps newCount but sets lastCheck', () => {
    const base = { ...fresh(), lastCheck: '2026-10-05T00:00:00.000Z', seen: ['x'], newCount: 4 };
    expect(applyFeed(base, [], NOW)).toEqual({ ...base, lastCheck: NOW.toISOString() });
  });

  it('stored state never contains feed text', () => {
    const json = JSON.stringify(applyFeed(fresh(), items, NOW));
    for (const text of FEED_TEXT) expect(json).not.toContain(text);
  });
});

describe('markAllSeen', () => {
  it('puts newest first, clears newCount, dedupes', () => {
    const base = { ...fresh(), seen: ['old', 'bbb222'], newCount: 2 };
    const next = markAllSeen(base, parseFeed(FEED_XML));
    expect(next.newCount).toBe(0);
    expect(next.seen).toEqual(['aaa111', 'bbb222', 'ccc333', 'old']);
  });

  it('caps seen at 100', () => {
    const many = Array.from({ length: 150 }, (_, i) => ({ guid: `g${i}`, pubDate: '' }));
    const next = markAllSeen(fresh(), many);
    expect(next.seen).toHaveLength(100);
    expect(next.seen[0]).toBe('g0');
  });
});
