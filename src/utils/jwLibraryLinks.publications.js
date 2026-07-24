/**
 * Publication URL builders for JW Library deep links.
 *
 * These functions generate URLs that open specific Watchtower /
 * midweek-meeting-workbook articles in the JW Library app via
 * its `jwlibrary://` deep-link scheme, with a desktop-fallback
 * URL that always works in a web browser.
 *
 * Split out of jwLibraryLinks.js for readability (issue #141).
 * API is re-exported from the main module — consumers should
 * import from 'jwLibraryLinks' not this file.
 */

/**
 * Generate a JW Library deep link for a publication (Watchtower
 * article, midweek meeting workbook, etc.) given its WOL
 * docid.
 *
 * Schema (verified March 2025 on jwtalk.net):
 *   jwpub://p/<locale>:<docid>            opens the publication
 *   jwpub://p/<locale>:<docid>/<paragraph> opens at a paragraph
 *
 * The docid is WOL's internal id, e.g.:
 *   202026243 — Midweek meeting workbook (week 30, 2026)
 *   2026402   — Sunday Watchtower Study article (week 30, 2026)
 *
 * On the desktop web (no JW Library installed) the link is a
 * no-op — the user must have the app on iOS/Android/desktop to
 * receive the deep link. For desktop fallback see
 * `getPublicationFinderUrl(docid, locale)` below.
 *
 * ToS clean: this only generates a URL, no content.
 *
 * @param {string|number} docid  WOL docid
 * @param {string} locale        Language code (default 'E')
 * @returns {string} jwlibrary publication URL
 */
export function jwlibraryPublicationUrl(docid, locale = 'E') {
  if (docid == null || docid === '') return null;
  const cleanLocale = String(locale || 'E').slice(0, 4) || 'E';
  return `jwlibrary:///finder?wtlocale=${cleanLocale}&docid=${docid}`;
}

/**
 * Desktop-fallback URL that always works in a web browser
 * (whether or not JW Library is installed). Redirects to the
 * canonical jw.org article page.
 *
 * Schema:
 *   https://www.jw.org/finder?wtlocale=E&prefer=lang&docid=<id>
 *
 * The user's deep link convention with `srcid=jwlshare` is
 * mobile-only — it instructs the OS to hand the URL to the
 * JW Library app (if installed) instead of opening the
 * browser. On desktop without `srcid=jwlshare` the finder
 * redirects to the canonical jw.org surface for that
 * publication.
 *
 * @param {string|number} docid
 * @param {string} locale
 */
export function getPublicationFinderUrl(docid, locale = 'E') {
  if (docid == null || docid === '') return null;
  const cleanLocale = String(locale || 'E').slice(0, 4) || 'E';
  return `https://www.jw.org/finder?srcid=jwlshare&wtlocale=${cleanLocale}&prefer=lang&docid=${docid}`;
}
