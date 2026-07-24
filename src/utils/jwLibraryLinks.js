/**
 * JW Library Link Utilities — public API + re-exports.
 *
 * Generates deep links that open content in JW Library app
 * (jwlibrary:// scheme) plus desktop-fallback jw.org URLs.
 *
 * Implementation is split into focused modules — this file is
 * the entry point. Consumers should import from this file:
 *
 *   import { getTodayRow, jwlibraryPublicationUrl } from '../utils/jwLibraryLinks';
 *
 * Split rationale (issue #141): the original single file was
 * 854 LOC and hard to navigate. The split is along domain
 * boundaries — publications, daily content, meeting workbook,
 * and weekly observances — with this file preserving the
 * original API surface.
 *
 * Module map:
 *   jwLibraryLinks.publications.js   jwlibraryPublicationUrl, getPublicationFinderUrl
 *   jwLibraryLinks.dailyContent.js  getDailyTextLink, getCurrentYearTextUrl,
 *                                    getBibleReadingLink, getMeetingWorkbookLink
 *   jwLibraryLinks.meetingWorkbook.js getThisWeekMeetingUrl, parseReadingToLink
 *   jwLibraryLinks.weeklyObservances.js getMemorialDate, getMemorialRow,
 *                                       getSundayWatchtowerDocid,
 *                                       sundayDocidForWeek,
 *                                       getSundayWatchtowerRow,
 *                                       getTodayRow
 */

import { BIBLE_BOOKS_LOWER } from './bibleBooks.ts';
import { isoWeekOfDate } from './sundayWatchtowerTracker.js';

// Re-export as BIBLE_BOOKS for backward compatibility (used by tests and consumers)
export const BIBLE_BOOKS = BIBLE_BOOKS_LOWER;

// JW.org section links — kept in main because they're shared
// across all module boundaries and most consumers import this
// constant directly from the top-level module.
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
  historyAndBible:
    'https://www.jw.org/en/library/magazines/awake-no1-2017-january/bible-and-history/',

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
  videosAudioDescription:
    'https://www.jw.org/en/library/videos/#en/categories/VideoOnDemand/VODAudioDescriptions',
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
  jwLanguage: 'https://www.jw.org/en/online-help/jw-language/',

  // Year Text ("Examining the Scriptures Daily") — the brochure
  // that contains the annual scripture. Year-specific URLs only
  // exist for years when the brochure has been published; unknown
  // years fall back to the generic brochures landing.
  yearTextBrochures: 'https://www.jw.org/en/library/brochures/',
};

/**
 * Get ISO week string for a date (e.g. "2026-W03").
 * @param {Date} date
 * @returns {string} ISO week string
 */
export function getISOWeekString(date) {
  // Thin wrapper over isoWeekOfDate for backward compat (tests + callers).
  // Both algorithms verified identical on Jan 1, Dec 31, year boundaries,
  // and week-53 (leap year) — see issue #143.
  return isoWeekOfDate(date).id;
}

// ─── Re-exports ──────────────────────────────────────────────────
// API surface preserved. New code should import these directly
// from the focused modules; consumers (tests, Home.jsx) can keep
// importing from this file.

// Publications
export { jwlibraryPublicationUrl, getPublicationFinderUrl } from './jwLibraryLinks.publications.js';

// Daily content (text, year text, Bible reading, meeting workbook)
export {
  getDailyTextLink,
  getCurrentYearTextUrl,
  getBibleReadingLink,
  getMeetingWorkbookLink,
} from './jwLibraryLinks.dailyContent.js';

// Meeting workbook (URL parsing + week schedule)
export { getThisWeekMeetingUrl, parseReadingToLink } from './jwLibraryLinks.meetingWorkbook.js';

// Weekly observances (Memorial, Sunday Watchtower, Today)
export {
  getMemorialDate,
  getMemorialRow,
  getSundayWatchtowerDocid,
  sundayDocidForWeek,
  getSundayWatchtowerRow,
  getTodayRow,
} from './jwLibraryLinks.weeklyObservances.js';
