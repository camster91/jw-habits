/**
 * Once-a-day check of jw.org's official RSS feed through native HTTP (the
 * feed sends no CORS header, so a WebView fetch would fail). Best-effort:
 * any failure resolves null and leaves lastCheck alone so the next
 * foreground retries.
 */
import i18n from 'i18next';
import { CapacitorHttp } from '@capacitor/core';
import { applyFeed, feedUrl, parseFeed, whatsNewPageUrl } from '../domain/whatsNew.js';
import { onForeground } from '../data/StoreProvider.jsx';
import { isNative } from '../utils/native.js';

export { whatsNewPageUrl };

const DAY_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 10000;

/**
 * @returns {Promise<object|null>} the next whatsNew state, or null when
 *   disabled, on web, checked within 24 h, or the request failed.
 */
export async function checkWhatsNew(store, now, locale) {
  const { whatsNew } = store;
  if (!isNative || !whatsNew.enabled) return null;
  if (whatsNew.lastCheck !== null && now.getTime() - Date.parse(whatsNew.lastCheck) < DAY_MS) {
    return null;
  }
  try {
    const res = await CapacitorHttp.get({
      url: feedUrl(locale),
      connectTimeout: TIMEOUT_MS,
      readTimeout: TIMEOUT_MS,
    });
    if (res.status < 200 || res.status > 299 || typeof res.data !== 'string') return null;
    return applyFeed(whatsNew, parseFeed(res.data), now);
  } catch {
    return null;
  }
}

/** Check on every foreground; the check itself rate-limits to once a day. */
export function registerWhatsNewCheck() {
  return onForeground(async ({ store, update }) => {
    const locale = (i18n.language || 'en').split('-')[0];
    const next = await checkWhatsNew(store, new Date(), locale);
    if (next) update((s) => ({ ...s, whatsNew: next }));
  });
}
