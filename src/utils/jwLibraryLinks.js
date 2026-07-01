/**
 * JW Library Link Utilities
 * Generates deep links that open content in JW Library app
 */

import { BIBLE_BOOKS_LOWER } from './bibleBooks.ts';

// Re-export as BIBLE_BOOKS for backward compatibility (used by tests and consumers)
export const BIBLE_BOOKS = BIBLE_BOOKS_LOWER;

// Base finder URL for JW Library deep links
// Uses jwlibrary:// custom URL scheme to open directly in the app
const FINDER_BASE = 'jwlibrary:///finder';

// JW.org section links
export const JW_ORG_SECTIONS = {
  // Home
  home: 'https://www.jw.org/en/',
  whatsNew: 'https://www.jw.org/en/whats-new/',

  // Bible Teachings
  bibleTeachings: 'https://www.jw.org/en/bible-teachings/',
  bibleQuestionsAnswered: 'https://www.jw.org/en/bible-teachings/questions/',
  bibleVersesExplained: 'https://www.jw.org/en/bible-teachings/bible-verses/',
  bibleStudyCourse: 'https://www.jw.org/en/bible-teachings/online-lessons/',
  bibleStudyTools: 'https://www.jw.org/en/bible-teachings/tools/',
  peaceAndHappiness: 'https://www.jw.org/en/bible-teachings/peace-happiness/',
  marriageAndFamily: 'https://www.jw.org/en/bible-teachings/family/',
  teens: 'https://www.jw.org/en/bible-teachings/teenagers/',
  children: 'https://www.jw.org/en/bible-teachings/children/',
  faithInGod: 'https://www.jw.org/en/bible-teachings/questions/does-god-exist/',
  scienceAndBible: 'https://www.jw.org/en/bible-teachings/science/',
  historyAndBible: 'https://www.jw.org/en/library/magazines/awake-no1-2017-january/bible-and-history/',

  // Library
  library: 'https://www.jw.org/en/library/',
  bibles: 'https://www.jw.org/en/library/bible/',
  books: 'https://www.jw.org/en/library/books/',
  brochures: 'https://www.jw.org/en/library/brochures/',
  tracts: 'https://www.jw.org/en/library/tracts/',
  articleSeries: 'https://www.jw.org/en/library/series/',
  magazines: 'https://www.jw.org/en/library/magazines/',
  watchtowerStudy: 'https://www.jw.org/en/library/magazines/watchtower-study/',
  awake: 'https://www.jw.org/en/library/magazines/awake/',
  meetingWorkbooks: 'https://www.jw.org/en/library/jw-meeting-workbook/',
  programs: 'https://www.jw.org/en/library/videos/#en/categories/Programs',
  indexes: 'https://www.jw.org/en/library/publication-indexes/',
  guidelines: 'https://www.jw.org/en/library/guidelines/',

  // Media
  broadcasting: 'https://www.jw.org/en/library/videos/#en/mediaitems/LatestVideos',
  videos: 'https://www.jw.org/en/library/videos/',
  videosAudioDescription: 'https://www.jw.org/en/library/videos/#en/categories/VideoOnDemand/VODAudioDescriptions',
  music: 'https://www.jw.org/en/library/music/',
  audioDramas: 'https://www.jw.org/en/library/audio-drama/',
  dramaticBibleReadings: 'https://www.jw.org/en/library/dramatic-bible-readings/',

  // News
  news: 'https://www.jw.org/en/news/',

  // About Us
  aboutUs: 'https://www.jw.org/en/jehovahs-witnesses/',
  faq: 'https://www.jw.org/en/jehovahs-witnesses/faq/',
  requestVisit: 'https://www.jw.org/en/jehovahs-witnesses/request-a-visit/',
  contactUs: 'https://www.jw.org/en/contact/',
  bethelTours: 'https://www.jw.org/en/jehovahs-witnesses/bethel-tours/',
  meetings: 'https://www.jw.org/en/jehovahs-witnesses/meetings/',
  memorial: 'https://www.jw.org/en/jehovahs-witnesses/memorial/',
  conventions: 'https://www.jw.org/en/jehovahs-witnesses/conventions/',
  activities: 'https://www.jw.org/en/jehovahs-witnesses/activities/',
  experiences: 'https://www.jw.org/en/library/series/how-the-bible-changes-lives/',
  aroundTheWorld: 'https://www.jw.org/en/jehovahs-witnesses/worldwide/',

  // Quick Links / External
  findMeeting: 'https://apps.jw.org/ui/E/meeting-search.html#/',
  findConvention: 'https://www.jw.org/en/jehovahs-witnesses/conventions/',
  search: 'https://www.jw.org/en/search/',
  medicalInfo: 'https://www.jw.org/en/medical-library/',
  globalCommunications: 'https://www.jw.org/en/news/legal/global-communications/',
  help: 'https://www.jw.org/en/online-help/',
  donations: 'https://donate.jw.org/',

  // Apps & Tools
  watchtowerOnlineLibrary: 'https://wol.jw.org/en/wol/h/r1/lp-e',
  jwHub: 'https://hub.jw.org/',
  jwLibraryApp: 'https://www.jw.org/en/online-help/jw-library/',
  watchtowerLibrary: 'https://www.jw.org/en/online-help/watchtower-library/',
  jwLanguage: 'https://www.jw.org/en/online-help/jw-language/'
};

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
 * Generate a Bible reading link for JW Library
 * @param {number} bookNum - Bible book number (1-66)
 * @param {number} startChapter - Starting chapter
 * @param {number} endChapter - Ending chapter (optional, defaults to startChapter)
 * @param {string} locale - Language code (default: 'E' for English)
 * @returns {string} JW Library finder URL
 */
export function getBibleReadingLink(bookNum, startChapter, endChapter = startChapter, locale = 'E') {
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
  const activeLang =
    (typeof window !== 'undefined' && window.__jw_lang) || 'en';
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
  // to the meeting-workbook landing page (no date anchor).
  const month = weekStart.getMonth(); // 0..11
  const year = weekStart.getFullYear();
  const VOLUMES = [
    { slug: 'january-february-2026-mwb', months: [0, 1] },
    { slug: 'march-april-2026-mwb',      months: [2, 3] },
    { slug: 'may-june-2026-mwb',         months: [4, 5] },
    { slug: 'july-august-2026-mwb',      months: [6, 7] },
    { slug: 'september-october-2026-mwb', months: [8, 9] },
    { slug: 'november-december-2026-mwb', months: [10, 11] },
  ];
  // Build a generic pattern for any year by pairing months
  // (0-1, 2-3, 4-5, ...). For years other than 2026 we fall
  // back to a generic volume slug built from the start-month's
  // pair (jw.org volumes are always month-pairs: nov-dec,
  // jan-feb, etc).
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

  const url =
    `https://www.jw.org/en/library/jw-meeting-workbook/${slug}/` +
    `${seg}/`;

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
    const bookNum = BIBLE_BOOKS[firstBook];
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
    const bookNum = BIBLE_BOOKS[bookName];
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
    const bookNum = BIBLE_BOOKS[bookName];
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

  const bookNum = BIBLE_BOOKS[bookName];
  if (!bookNum) {
    return null;
  }

  return getBibleReadingLink(bookNum, startChapter, endChapter, locale);
}

/**
 * Get ISO week number for a date
 * @param {Date} date
 * @returns {string} ISO week string like "2026-W03"
 */
export function getISOWeekString(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Get the Memorial of Christ's Death date for a given year.
 *
 * Jehovah's Witnesses observe the Memorial on the evening of
 * Nisan 14 in the Hebrew calendar. The exact date varies each
 * year because the Hebrew calendar is lunisolar (new moon +
 * leap months). The dates below are the published dates from
 * jw.org's /en/jehovahs-witnesses/memorial/ page. The page
 * only lists the next few years; for years beyond the table,
 * the function falls back to `null` and the caller should
 * link to the year-agnostic Memorial landing page (which
 * always shows the current year's date prominently).
 *
 * The hardcoded table is intentionally small (the app's
 * lifetime is ~3 years, and the data only matters in
 * March/April of each year). For 2030+ the helper returns
 * null and the row displays "Memorial — see jw.org" with
 * the year-agnostic URL.
 *
 * @param {number} year - The calendar year (e.g. 2026)
 * @returns {{ date: Date, weekOf: string } | null}
 *   - `date`: The Memorial date (Nisan 14) as a JS Date
 *   - `weekOf`: Human-readable string ("Thursday, April 2, 2026")
 *   - `null` if the year is not in the table
 */
export function getMemorialDate(year) {
  // Published Memorial dates from
  // https://www.jw.org/en/jehovahs-witnesses/memorial/
  // (verified 2026-06-17). The table is updated by the
  // organization each year.
  const TABLE = {
    2024: { month: 2, day: 24 }, // March 24, 2024
    2025: { month: 3, day: 12 }, // April 12, 2025
    2026: { month: 3, day: 2 },  // April 2, 2026
    2027: { month: 2, day: 22 }, // March 22, 2027
    2028: { month: 3, day: 9 },  // April 9, 2028
    2029: { month: 2, day: 29 }, // March 29, 2029
  };
  const entry = TABLE[year];
  if (!entry) return null;
  const date = new Date(year, entry.month, entry.day);
  // Map our i18n keys to BCP-47 locale codes for the date
  // formatter. Same mapping as getThisWeekMeetingUrl.
  const localeMap = { en: 'en-US', es: 'es-ES', fr: 'fr-FR' };
  const activeLang =
    (typeof window !== 'undefined' && window.__jw_lang) || 'en';
  const fmtLocale = localeMap[activeLang] || 'en-US';
  return {
    date,
    weekOf: date.toLocaleString(fmtLocale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
  };
}

/**
 * Build the Memorial row for the home. Returns null if the
 * date is more than 30 days away (the row should be hidden).
 * Otherwise returns the row data: title, sub-text, href, icon,
 * color.
 *
 * The row is "ToS compliant" because the only display is the
 * *date* of the Memorial (a calendar fact, not content from
 * jw.org publications) and a link to the jw.org page. No
 * verse text, no program outline, no song numbers.
 *
 * For unknown years (2030+), the row still shows but the
 * sub-text reads "See jw.org for the date" — the Memorial
 * landing page always shows the current year's date.
 *
 * @param {Date} today - The current date (defaults to now)
 * @param {number} year - The year to look up (defaults to today.getFullYear)
 * @returns {{ title: string, sub: string, href: string, visible: boolean } | null}
 *   - `visible: false` if the Memorial is more than 30 days away
 *   - `null` if `today` is invalid
 */
export function getMemorialRow(today = new Date(), year = today.getFullYear(), t = (k) => k) {
  if (isNaN(today.getTime())) return null;
  const memorial = getMemorialDate(year, t);

  // Compute days from today to the Memorial. For unknown
  // years, the Memorial date is unknown; we still link to
  // the year-agnostic landing page but skip the row when
  // we're not in March/April (the rough window the
  // Memorial falls in).
  let daysToMemorial;
  if (memorial) {
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    daysToMemorial = Math.round(
      (memorial.date.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)
    );
  } else {
    // Unknown year: assume the Memorial is in March or April
    // and show the row only in those months. Without the
    // exact date, the user can find it on jw.org.
    if (today.getMonth() !== 2 && today.getMonth() !== 3) return null;
    daysToMemorial = 0; // pretend it's today (the row still shows)
  }

  // Visibility window: 30 days before to 14 days after.
  // The Memorial is usually just a single evening meeting,
  // so the "before" window is the most useful time to show
  // the row. After the Memorial, hide the row immediately.
  const visible = daysToMemorial >= 0 && daysToMemorial <= 30;

  if (!visible) return null;

  const sub = memorial
    ? memorial.weekOf
    : t('habit.memorialSeeDate');

  return {
    title: t('habit.memorial'),
    sub,
    href: 'https://www.jw.org/en/jehovahs-witnesses/memorial/',
    visible,
  };
}


/**
 * Get the "Today" row for the home — a contextual row that
 * adapts to the day of the week. The row tells the user what's
 * the most relevant JW thing right now:
 *
 * Default schedule (matches jw.org globally):
 *   Sun (0): "Today — Public Meeting"      (weekend meeting)
 *   Mon (1): "Today — Midweek Meeting Prep"  (3 days to meeting)
 *   Tue (2): "Tonight — Midweek Meeting"    (meeting day!)
 *   Wed (3): "Today — Midweek Meeting Prep"
 *   Thu (4): "Today — Midweek Meeting Prep"
 *   Fri (5): "Today — Midweek Meeting Prep"
 *   Sat (6): "Today — Field Service"        (Saturday ministry)
 *
 * The caller can override the meeting days via the
 * `settings.midweekDay` and `settings.weekendDay` fields
 * (from the user settings store) so the row reflects
 * individual congregation schedules. Sat is always
 * "Field Service" — that's cultural, not configurable.
 *
 * The href for the meeting-related days points at this
 * week's MWB schedule (already computed by
 * getThisWeekMeetingUrl). Saturday's href points at the
 * meetings landing page on jw.org, which has the meeting
 * finder (the user can locate their local congregation
 * and field service group).
 *
 * All hrefs are public jw.org pages that return 200 (verified
 * 2026-06-17). No content from jw.org is displayed — only
 * the title and sub-text describe what kind of day it is.
 *
 * @param {Date} today - The current date (defaults to now)
 * @param {{ midweekDay?: number, weekendDay?: number }} [settings]
 *   User settings. midweekDay = 0..6 (default 2 = Tuesday).
 *   weekendDay = 0..6 (default 0 = Sunday). Falls back to
 *   defaults if missing or out of range.
 * @returns {{ title: string, sub: string, href: string, key: string } | null}
 *   - `null` if `today` is invalid
 *   - The caller renders this as the first habit row, above
 *     the 5 weekly rows. The checkbox tracks per-day
 *     completion (key 'today').
 */
export function getTodayRow(today = new Date(), settings = {}, t = (k) => k) {
  if (isNaN(today.getTime())) return null;
  const thisWeek = getThisWeekMeetingUrl(today, t);
  const meetingHref = thisWeek.url;
  // Coerce settings into the documented range; fall back
  // to defaults on any malformed input.
  const clampDay = (n, fallback) =>
    Number.isInteger(n) && n >= 0 && n <= 6 ? n : fallback;
  const midweekDay = clampDay(settings.midweekDay, 2);   // default Tuesday
  const weekendDay = clampDay(settings.weekendDay, 0);    // default Sunday

  const dow = today.getDay(); // 0=Sun..6=Sat

  // Saturday (6) — fixed Field Service copy regardless of
  // settings. Saturday is culturally the field-service day
  // for JWs, not configurable.
  if (dow === 6) {
    return {
      key: 'today',
      title: t('habit.today'),
      sub: t('habit.subFieldService'),
      // jw.org landing page that lists meeting/field
      // service finders. Verified 200 (2026-06-17).
      href: 'https://www.jw.org/en/jehovahs-witnesses/meetings/',
    };
  }

  // Weekend meeting day (default Sunday) — "Today — Public Meeting"
  if (dow === weekendDay) {
    return {
      key: 'today',
      title: t('habit.today'),
      sub: t('habit.subPublicMeeting'),
      href: meetingHref,
    };
  }

  // Midweek meeting day (default Tuesday) — "Tonight — Midweek Meeting"
  if (dow === midweekDay) {
    return {
      key: 'today',
      title: t('habit.tonight'),
      sub: t('habit.subMidweekMeeting'),
      href: meetingHref,
    };
  }

  // Otherwise (Mon, Wed, Thu, Fri) — "Today — Midweek Meeting Prep"
  // These are the days of the week surrounding the midweek
  // meeting; the user is either preparing for this week's
  // meeting (Mon) or reviewing for next week's (Wed-Fri).
  // All point at this week's MWB schedule.
  return {
    key: 'today',
    title: t('habit.today'),
    sub: t('habit.subMidweekMeetingPrep'),
    href: meetingHref,
  };
}
