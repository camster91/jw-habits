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

/** Record a completed check. The first ever check marks everything seen. */
export function applyFeed(whatsNew, items, now) {
  const lastCheck = now.toISOString();
  if (items.length === 0) return { ...whatsNew, lastCheck };
  if (whatsNew.lastCheck === null) return { ...markAllSeen(whatsNew, items), lastCheck };
  const seen = new Set(whatsNew.seen);
  return { ...whatsNew, lastCheck, newCount: items.filter((i) => !seen.has(i.guid)).length };
}

/** Mark every current item seen: newest first, capped at 100. */
export function markAllSeen(whatsNew, items) {
  const seen = [...new Set([...items.map((i) => i.guid), ...whatsNew.seen])].slice(0, SEEN_CAP);
  return { ...whatsNew, seen, newCount: 0 };
}
