/**
 * What's New: the official page a user can open from Today. The app does not
 * fetch, parse or collect the site's feed or content; legacy saved `whatsNew`
 * metadata stays in the store untouched and is never used to claim updates.
 */

const PAGES = {
  en: 'https://www.jw.org/en/whats-new/',
  es: 'https://www.jw.org/es/lo-nuevo/',
  fr: 'https://www.jw.org/fr/nouveautes/',
};

/** jw.org's What's New page for a locale (any other locale falls back to en). */
export function whatsNewPageUrl(locale) {
  return PAGES[locale] ?? PAGES.en;
}
