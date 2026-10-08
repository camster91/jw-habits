/**
 * Checks jw.org's RSS feed through native HTTP, waiting 24 hours after success.
 * The feed sends no CORS header, so a WebView fetch would fail. Best-effort:
 * any failure, including an unparseable or empty response, resolves null and
 * leaves lastCheck alone so the next foreground retries.
 */
import i18n from 'i18next';
import { CapacitorHttp } from '@capacitor/core';
import { applyFeed, feedUrl, parseFeed, whatsNewPageUrl } from '../domain/whatsNew.js';
import { linkLocale } from '../domain/links.js';
import { onForeground } from '../data/StoreProvider.jsx';
import { isNative } from '../utils/native.js';

export { whatsNewPageUrl };

const DAY_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 10000;
const OVERALL_TIMEOUT_MS = 15000;

/** A lastCheck in the future (clock moved back) counts as stale. */
function recentlyChecked(lastCheck, now) {
  if (lastCheck === null) return false;
  const age = now.getTime() - Date.parse(lastCheck);
  return age >= 0 && age < DAY_MS;
}

/**
 * Fetch the feed's items if a check is due.
 * @returns {Promise<{guid: string, pubDate: string}[]|null>} null when
 *   disabled, on web, checked within 24 h, or the check failed or came back
 *   empty (an empty list is never a valid feed).
 */
export async function fetchFeedItems(whatsNew, now, locale) {
  if (!isNative || !whatsNew.enabled || recentlyChecked(whatsNew.lastCheck, now)) return null;
  let timer;
  try {
    const request = CapacitorHttp.get({
      url: feedUrl(locale),
      connectTimeout: TIMEOUT_MS,
      readTimeout: TIMEOUT_MS,
    });
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), OVERALL_TIMEOUT_MS);
    });
    const res = await Promise.race([request, timeout]);
    if (res.status < 200 || res.status > 299 || typeof res.data !== 'string') return null;
    const items = parseFeed(res.data);
    return items.length > 0 ? items : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** @returns {Promise<object|null>} the next whatsNew state, or null (see fetchFeedItems). */
export async function checkWhatsNew(store, now, locale) {
  const items = await fetchFeedItems(store.whatsNew, now, locale);
  return items ? applyFeed(store.whatsNew, items, now) : null;
}

let inFlight = false;

/** Check on foreground; successful checks wait 24 hours, failures may retry. */
export function registerWhatsNewCheck() {
  return onForeground(async ({ store, update }) => {
    if (inFlight) return;
    inFlight = true;
    try {
      const now = new Date();
      const locale = linkLocale(i18n.language);
      const items = await fetchFeedItems(store.whatsNew, now, locale);
      // Apply to the state as it is now, not the snapshot taken before the
      // request, and not at all if What's New was switched off meanwhile.
      if (items) {
        update((s) =>
          s.whatsNew.enabled ? { ...s, whatsNew: applyFeed(s.whatsNew, items, now) } : s
        );
      }
    } finally {
      inFlight = false;
    }
  });
}
