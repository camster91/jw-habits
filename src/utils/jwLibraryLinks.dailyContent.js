/**
 * Daily content link builders for jw.org / JW Library.
 *
 * - getDailyTextLink: today's daily text (jwlibrary:// deep link)
 * - getCurrentYearTextUrl: year-text brochure URL
 * - getBibleReadingLink: today's Bible reading chapter
 * - getMeetingWorkbookLink: docid-based meeting workbook
 * - getThisWeekMeetingUrl: "this week" MWB schedule URL
 * - parseReadingToLink: parse "1 John 3:16" → JW Library URL
 *
 * Split out of jwLibraryLinks.js for readability (issue #141).
 * API is re-exported from the main module — consumers should
 * import from 'jwLibraryLinks' not this file.
 */

const FINDER_BASE = 'jwlibrary:///finder';

/**
 * Generate a daily text link for JW Library
 * @param {Date} date - The date for daily text
 * @param {string} locale - Language code (default: 'E' for English)
 * @returns {string} JW Library finder URL
 */
export function getDailyTextLink(date = new Date(), locale = 'E') {
  // Format the date as YYYYMMDD. We use the LOCAL date (not UTC)
  // so that a user in EDT clicking "today's daily text" gets the
  // EDT calendar day's text, not whatever UTC's day is. This
  // matches how jw.org's date selector works.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // The "daily text" surface on jw.org's web is intentionally
  // limited — the daily text is meant to be read in the JW
  // Library app, not on a desktop browser. The previous URL
  // format (?srcid=jwlshare&alias=daily-text&date=YYYYMMDD)
  // returns 404 from the public site. The supported deep
  // link for "today's text" is the jwlibrary:// scheme, which
  // the official JW Library app registers on Android and iOS.
  // On the web (no app), the link is a no-op — same trade-off
  // as the Bible reading row.
  return `jwlibrary:///showDailyText?wtlocale=${locale}&date=${dateStr}`;
}

/**
 * Generate a link to the current year's "Year Text" brochure on jw.org.
 *
 * The Year Text is published each year as the brochure
 * "Examining the Scriptures Daily—YYYY". The URL pattern is:
 *   /en/library/brochures/Examining-the-Scriptures-Daily-YYYY/
 *
 * Verified 2026-07-01: 200 OK for 2024, 2025, 2026; 404 for 2027
 * (not yet published — typically published ~Dec for the next year).
 *
 * For unknown / not-yet-published years, fall back to the generic
 * brochures landing (JW_ORG_SECTIONS.yearTextBrochures) which
 * lists all currently available brochures including the latest
 * Year Text.
 *
 * ToS compliant: only the year + a link. No verse text, no
 * scripture reference, no theme displayed.
 *
 * @param {Date} date - The date for which to resolve the year (defaults to today)
 * @returns {{ url: string, year: number, known: boolean }}
 */
export function getCurrentYearTextUrl(date = new Date()) {
  const year = date.getFullYear();
  const KNOWN_YEARS = new Set([2024, 2025, 2026]);
  if (KNOWN_YEARS.has(year)) {
    return {
      url: `https://www.jw.org/en/library/brochures/Examining-the-Scriptures-Daily-${year}/`,
      year,
      known: true,
    };
  }
  return {
    url: 'https://www.jw.org/en/library/brochures/',
    year,
    known: false,
  };
}

/**
 * Generate a Bible reading link for JW Library
 * @param {number} bookNum - Bible book number (1-66)
 * @param {number} startChapter - Starting chapter
 * @param {number} endChapter - Ending chapter (optional, defaults to startChapter)
 * @param {string} locale - Language code (default: 'E' for English)
 * @returns {string} JW Library finder URL
 */
export function getBibleReadingLink(
  bookNum,
  startChapter,
  endChapter = startChapter,
  locale = 'E'
) {
  // Format: BBCCCVVV where BB=book(01-66), CCC=chapter(001-150), VVV=verse(001-176)
  const bookStr = String(bookNum).padStart(2, '0');
  const startRef = `${bookStr}${String(startChapter).padStart(3, '0')}001`;
  const endRef = `${bookStr}${String(endChapter).padStart(3, '0')}999`;

  return `${FINDER_BASE}?wtlocale=${locale}&bible=${startRef}-${endRef}&pub=nwtsty`;
}

/**
 * Generate a meeting workbook link for JW Library
 * @param {string} docid - Document ID for the workbook week
 * @param {string} locale - Language code (default: 'E' for English)
 * @returns {string} JW Library finder URL
 */
export function getMeetingWorkbookLink(docid, locale = 'E') {
  return `${FINDER_BASE}?wtlocale=${locale}&docid=${docid}`;
}
