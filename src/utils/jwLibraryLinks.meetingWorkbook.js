/**
 * Meeting workbook link builders.
 *
 * - getThisWeekMeetingUrl: public jw.org URL for the MWB schedule
 * - parseReadingToLink: parse "1 John 3:16" → JW Library URL
 *
 * Split out of jwLibraryLinks.js for readability (issue #141).
 * API is re-exported from the main module — consumers should
 * import from 'jwLibraryLinks' not this file.
 */

import { BIBLE_BOOKS_LOWER } from './bibleBooks.ts';
import { getBibleReadingLink } from './jwLibraryLinks.dailyContent.js';

/**
 * Get the public jw.org URL for the "this week" meeting schedule
 * page. The URL pattern is:
 *   /en/library/jw-meeting-workbook/{bimonthly}-mwb/
 *     Life-and-Ministry-Meeting-Schedule-for-{Month-DD-DD-YYYY}/
 * where:
 *   - {bimonthly} is the 2-month MWB volume (e.g. may-june-2026)
 *   - the second segment uses the Monday-Sunday date range of
 *     the ISO week containing the given date
 *
 * The link is metadata-only: it identifies the week and links
 * out. No content from jw.org is displayed in the app — the
 * user lands on jw.org to see the actual schedule.
 *
 * Returns null if the date falls outside the known MWB volumes
 * (the volumes alternate 2 months and roll over 6x per year).
 * In that case the caller can fall back to the MWB landing
 * page (JW_ORG_SECTIONS.meetingWorkbooks).
 *
 * @param {Date} date - The date within the desired week
 * @param {(k: string) => string} [_t] - Optional i18n translation
 *   function (default: identity). When provided, the function
 *   returns localized month names via the i18next system.
 *   Caller passes its `t` for the active locale.
 * @returns {{ url: string, weekOf: string, weekStart: Date, weekEnd: Date } | null}
 */
export function getThisWeekMeetingUrl(date = new Date()) {
  // Compute the Monday-Sunday ISO week containing `date` in
  // LOCAL time (consistent with how a JW in their home timezone
  // thinks about the meeting week). JavaScript: weekday 0=Sun
  // ... 6=Sat, so Monday = (weekday + 6) % 7 days before.
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay(); // 0..6
  const offsetToMonday = (dow + 6) % 7; // 0 for Mon, 6 for Sun
  d.setDate(d.getDate() - offsetToMonday);
  const weekStart = new Date(d.getTime());
  const weekEnd = new Date(d.getTime());
  weekEnd.setDate(weekEnd.getDate() + 6);

  // Map our i18n language keys (en/es/fr) to BCP-47 locale
  // codes for Intl.DateTimeFormat. Falls back to en-US.
  const localeMap = { en: 'en-US', es: 'es-ES', fr: 'fr-FR' };
  // Look up the current language via the i18n module if the
  // caller provided a t — i18next exposes `i18n.language` but
  // we don't want to import that here (circular). Instead we
  // probe the active language from the navigator + localStorage.
  // For now: caller passes the language via the (unstable)
  // global window.__jw_lang if set; otherwise default to en-US.
  const activeLang = (typeof window !== 'undefined' && window.__jw_lang) || 'en';
  const fmtLocale = localeMap[activeLang] || 'en-US';
  const fmtMonth = (d) => d.toLocaleString(fmtLocale, { month: 'long' });

  const startYear = weekStart.getFullYear();
  const endYear = weekEnd.getFullYear();
  const crossMonth = weekStart.getMonth() !== weekEnd.getMonth();
  let dateSeg;
  if (startYear !== endYear) {
    // Cross-year (always also cross-month): month-day-year-month-day-year
    dateSeg = `${fmtMonth(weekStart)}-${weekStart.getDate()}-${startYear}-${fmtMonth(weekEnd)}-${weekEnd.getDate()}-${endYear}`;
  } else if (crossMonth) {
    // Cross-month, same year: month-day-month-day-year
    dateSeg = `${fmtMonth(weekStart)}-${weekStart.getDate()}-${fmtMonth(weekEnd)}-${weekEnd.getDate()}-${startYear}`;
  } else {
    // Same month: month-day-day-year
    dateSeg = `${fmtMonth(weekStart)}-${weekStart.getDate()}-${weekEnd.getDate()}-${startYear}`;
  }
  // jw.org's English URL slug is fixed ("Life-and-Ministry-
  // Meeting-Schedule-for-…"). Localized slugs would need a
  // mapping (jw.org uses different slugs per language); for
  // now the URL stays English since jw.org's primary surface
  // is English-only for this content type. The weekOf display
  // string IS localized.
  const seg = `Life-and-Ministry-Meeting-Schedule-for-${dateSeg}`;

  // Map the ISO week start month to the current MWB volume
  // slug. The volumes alternate every 2 months, starting
  // with Jan-Feb. Outside the known 2026 volumes we fall back
  // to a generic volume slug built from the start-month's pair.
  const month = weekStart.getMonth(); // 0..11
  const year = weekStart.getFullYear();
  const VOLUMES = [
    { slug: 'january-february-2026-mwb', months: [0, 1] },
    { slug: 'march-april-2026-mwb', months: [2, 3] },
    { slug: 'may-june-2026-mwb', months: [4, 5] },
    { slug: 'july-august-2026-mwb', months: [6, 7] },
    { slug: 'september-october-2026-mwb', months: [8, 9] },
    { slug: 'november-december-2026-mwb', months: [10, 11] },
  ];
  let slug = null;
  for (const v of VOLUMES) {
    if (v.months.includes(month) && year === 2026) {
      slug = v.slug;
      break;
    }
  }
  if (!slug) {
    // Generic fallback for any year. Months are paired (0-1,
    // 2-3, ...); the start-month of the pair is always even-
    // numbered (Jan=0, Mar=2, May=4, ...). For Dec (11), the
    // pair start is Nov (10).
    const pairStartMonth = month % 2 === 0 ? month : month - 1;
    const startMonth = fmtMonth(new Date(year, pairStartMonth, 1)).toLowerCase();
    const endMonth = fmtMonth(new Date(year, pairStartMonth + 1, 1)).toLowerCase();
    slug = `${startMonth}-${endMonth}-${year}-mwb`;
  }

  const url = `https://www.jw.org/en/library/jw-meeting-workbook/${slug}/` + `${seg}/`;

  return {
    url,
    // weekOf: human-readable range matching the URL format.
    //   same month    → "June 15–21, 2026"
    //   cross month   → "June 29 – July 5, 2026"
    //   cross year    → "Dec 29, 2025 – Jan 4, 2026"
    weekOf: (() => {
      if (startYear !== endYear) {
        return `${fmtMonth(weekStart)} ${weekStart.getDate()}, ${startYear} – ${fmtMonth(weekEnd)} ${weekEnd.getDate()}, ${endYear}`;
      }
      if (crossMonth) {
        return `${fmtMonth(weekStart)} ${weekStart.getDate()} – ${fmtMonth(weekEnd)} ${weekEnd.getDate()}, ${startYear}`;
      }
      return `${fmtMonth(weekStart)} ${weekStart.getDate()}–${weekEnd.getDate()}, ${startYear}`;
    })(),
    weekStart,
    weekEnd,
  };
}

/**
 * Parse a reading text like "Genesis 26-28" and generate a JW Library link
 * @param {string} reading - Reading text (e.g., "Genesis 26-28", "1 Samuel 1-2")
 * @param {string} locale - Language code (default: 'E' for English)
 * @returns {string|null} JW Library finder URL or null if parsing fails
 */
export function parseReadingToLink(reading, locale = 'E') {
  if (!reading || reading === 'Completed!' || reading === 'Finished!') {
    return null;
  }

  // Handle special cases like "Obadiah/Jonah", "Titus/Philemon"
  if (reading.includes('/')) {
    const firstBook = reading.split('/')[0].trim().toLowerCase();
    const bookNum = BIBLE_BOOKS_LOWER[firstBook];
    if (bookNum) {
      return getBibleReadingLink(bookNum, 1, 4, locale);
    }
    return null;
  }

  // Handle verse ranges like "Psalm 119:64-176"
  const verseMatch = reading.match(/^([\d\s]*[A-Za-z\s]+)\s+(\d+):(\d+)-(\d+)$/i);
  if (verseMatch) {
    const bookName = verseMatch[1].trim().toLowerCase();
    const chapter = parseInt(verseMatch[2]);
    const bookNum = BIBLE_BOOKS_LOWER[bookName];
    if (bookNum) {
      return getBibleReadingLink(bookNum, chapter, chapter, locale);
    }
    return null;
  }

  // Handle chapter ranges like "Psalm 116-119:63" or "Psalm 116 to Psalm 119:63"
  const complexMatch = reading.match(/^([\d\s]*[A-Za-z\s]+)\s+(\d+).*?(\d+)/i);
  if (complexMatch && reading.includes('to')) {
    const bookName = complexMatch[1].trim().toLowerCase();
    const startChapter = parseInt(complexMatch[2]);
    const endChapter = parseInt(complexMatch[3]);
    const bookNum = BIBLE_BOOKS_LOWER[bookName];
    if (bookNum) {
      return getBibleReadingLink(bookNum, startChapter, endChapter, locale);
    }
    return null;
  }

  // Standard format: "Book Chapter-Chapter" or "Book Chapter"
  const match = reading.match(/^([\d\s]*[A-Za-z\s]+)\s+(\d+)(?:-(\d+))?/i);
  if (!match) {
    return null;
  }

  const bookName = match[1].trim().toLowerCase();
  const startChapter = parseInt(match[2]);
  const endChapter = match[3] ? parseInt(match[3]) : startChapter;

  const bookNum = BIBLE_BOOKS_LOWER[bookName];
  if (!bookNum) {
    return null;
  }

  return getBibleReadingLink(bookNum, startChapter, endChapter, locale);
}
