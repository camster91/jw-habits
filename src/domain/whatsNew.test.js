import { describe, it, expect } from 'vitest';
import { feedUrl, whatsNewPageUrl, parseFeed, applyFeed } from './whatsNew.js';
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

  it('adds unseen items to newCount and merges every guid into seen', () => {
    const base = { ...fresh(), lastCheck: '2026-10-05T00:00:00.000Z', seen: ['ccc333'] };
    const next = applyFeed(base, items, NOW);
    expect(next.newCount).toBe(2);
    expect(next.lastCheck).toBe(NOW.toISOString());
    expect(next.seen).toEqual(['aaa111', 'bbb222', 'ccc333']);
  });

  it('accumulates across checks until a tap resets it', () => {
    const item = (guid) => ({ guid, pubDate: '' });
    const day = (d) => new Date(`2026-10-0${d}T12:00:00.000Z`);
    // Check 1, the first ever: seeds seen, nothing new.
    let wn = applyFeed(fresh(), [item('a')], day(1));
    expect(wn.newCount).toBe(0);
    // Check 2: two new items.
    wn = applyFeed(wn, [item('c'), item('b'), item('a')], day(2));
    expect(wn.newCount).toBe(2);
    // Check 3 the next day: one more new, the earlier two still in the feed.
    wn = applyFeed(wn, [item('d'), item('c'), item('b'), item('a')], day(3));
    expect(wn.newCount).toBe(3);
    expect(wn.seen).toEqual(['d', 'c', 'b', 'a']);
    // Tap: the badge only zeroes the count.
    wn = { ...wn, newCount: 0 };
    // Check 4: nothing new.
    wn = applyFeed(wn, [item('d'), item('c'), item('b'), item('a')], day(4));
    expect(wn.newCount).toBe(0);
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

describe('seen', () => {
  it('puts the feed first, dedupes and caps at 100', () => {
    const many = Array.from({ length: 150 }, (_, i) => ({ guid: `g${i}`, pubDate: '' }));
    const base = { ...fresh(), lastCheck: '2026-10-05T00:00:00.000Z', seen: ['old', 'g1'] };
    const next = applyFeed(base, many, NOW);
    expect(next.seen).toHaveLength(100);
    expect(next.seen[0]).toBe('g0');
    expect(new Set(next.seen).size).toBe(100);
    expect(next.newCount).toBe(149);
  });

  it('dedupes a guid repeated in one feed', () => {
    const base = { ...fresh(), lastCheck: '2026-10-05T00:00:00.000Z' };
    const twice = [
      { guid: 'x', pubDate: '' },
      { guid: 'x', pubDate: '' },
    ];
    const next = applyFeed(base, twice, NOW);
    expect(next.newCount).toBe(1);
    expect(next.seen).toEqual(['x']);
  });
});
