/**
 * "What's New" badge logic. Reads ONLY each feed item's guid and pubDate and
 * never keeps any jw.org text, titles or images: the badge says how many new
 * items exist and nothing about them.
 */

const FEED_PATH = 'rss/WhatsNewWebArticles/feed.xml';
const PAGES = {
  en: 'https://www.jw.org/en/whats-new/',
  es: 'https://www.jw.org/es/lo-nuevo/',
  fr: 'https://www.jw.org/fr/nouveautes/',
};
const SEEN_CAP = 100;

/** jw.org's What's New page for a locale (any other locale falls back to en). */
export function whatsNewPageUrl(locale) {
  return PAGES[locale] ?? PAGES.en;
}

export function feedUrl(locale) {
  return `${whatsNewPageUrl(locale)}${FEED_PATH}`;
}

/**
 * @param {string} xml
 * @returns {{guid: string, pubDate: string}[]} [] for malformed XML or no items
 */
export function parseFeed(xml) {
  if (typeof xml !== 'string') return [];
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) return [];
  const items = [];
  for (const node of doc.getElementsByTagName('item')) {
    const guid = node.getElementsByTagName('guid')[0]?.textContent?.trim();
    if (!guid) continue;
    const pubDate = node.getElementsByTagName('pubDate')[0]?.textContent?.trim() ?? '';
    items.push({ guid, pubDate });
  }
  return items;
}

/** Feed guids first (newest first), then the earlier seen ones; deduped, capped at 100. */
function mergeSeen(seen, items) {
  return [...new Set([...items.map((i) => i.guid), ...seen])].slice(0, SEEN_CAP);
}

/**
 * Record a completed check. Every fetched guid joins `seen`; the ones not
 * seen before are ADDED to `newCount`, which only a badge tap resets. The
 * first ever check just seeds `seen` with newCount 0.
 */
export function applyFeed(whatsNew, items, now) {
  const lastCheck = now.toISOString();
  if (items.length === 0) return { ...whatsNew, lastCheck };
  const seen = mergeSeen(whatsNew.seen, items);
  if (whatsNew.lastCheck === null) return { ...whatsNew, lastCheck, seen, newCount: 0 };
  const known = new Set(whatsNew.seen);
  const added = new Set(items.map((i) => i.guid).filter((g) => !known.has(g))).size;
  return { ...whatsNew, lastCheck, seen, newCount: whatsNew.newCount + added };
}
