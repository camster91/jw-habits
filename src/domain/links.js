/**
 * Where each routine's link button goes: the user's own link when it is a
 * safe http(s) URL, otherwise a default by locale (en, es or fr; anything else
 * uses en). Links are URLs only; nothing from jw.org is fetched or kept.
 */
import { finderUrl } from './bible.js';
import { dailyTextUrl } from './jwlinks.js';
import { appDay } from './day.js';
import { isSafeHttpUrl } from '../utils/safeUrls.js';

const DEFAULTS = {
  meetingPrep: {
    en: 'https://wol.jw.org/en/wol/meetings/r1/lp-e',
    es: 'https://wol.jw.org/es/wol/meetings/r4/lp-s',
    fr: 'https://wol.jw.org/fr/wol/meetings/r30/lp-f',
  },
};

const SUPPORTED = ['en', 'es', 'fr'];

/** The primary subtag of `language` if it is en, es or fr; otherwise 'en'. */
export function linkLocale(language) {
  const primary = String(language ?? '').split(/[-_]/)[0];
  return SUPPORTED.includes(primary) ? primary : 'en';
}

/**
 * @param {object} store
 * @param {import('./schedule.js').RoutineId} id
 * @param {string} language e.g. i18n.language
 * @param {{book: number, chapter: number}} [chapter] the first of today's chapters (bibleReading)
 * @param {string} [day] the app day for the daily text; the current app day when absent
 * @returns {string|null} null when the routine has no link
 */
export function routineLink(store, id, language, chapter, day) {
  const custom = store.links?.[id];
  if (typeof custom === 'string' && custom !== '' && isSafeHttpUrl(custom)) return custom.trim();
  const locale = linkLocale(language);
  if (id === 'dailyText') return dailyTextUrl(locale, day ?? appDay(new Date()));
  if (DEFAULTS[id]) return DEFAULTS[id][locale];
  if (id === 'bibleReading' && chapter) return finderUrl(locale, chapter.book, chapter.chapter);
  return null;
}
