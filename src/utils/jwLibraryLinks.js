/**
 * JW Library Link Utilities
 * Generates deep links that open content in JW Library app
 */

// Base finder URL for JW Library deep links
// Uses jwlibrary:// custom URL scheme to open directly in the app
const FINDER_BASE = 'jwlibrary:///finder';

// Bible book number mapping (1-66)
export const BIBLE_BOOKS = {
  'genesis': 1,
  'exodus': 2,
  'leviticus': 3,
  'numbers': 4,
  'deuteronomy': 5,
  'joshua': 6,
  'judges': 7,
  'ruth': 8,
  '1 samuel': 9,
  '2 samuel': 10,
  '1 kings': 11,
  '2 kings': 12,
  '1 chronicles': 13,
  '2 chronicles': 14,
  'ezra': 15,
  'nehemiah': 16,
  'esther': 17,
  'job': 18,
  'psalms': 19,
  'psalm': 19,
  'proverbs': 20,
  'ecclesiastes': 21,
  'song of solomon': 22,
  'isaiah': 23,
  'jeremiah': 24,
  'lamentations': 25,
  'ezekiel': 26,
  'daniel': 27,
  'hosea': 28,
  'joel': 29,
  'amos': 30,
  'obadiah': 31,
  'jonah': 32,
  'micah': 33,
  'nahum': 34,
  'habakkuk': 35,
  'zephaniah': 36,
  'haggai': 37,
  'zechariah': 38,
  'malachi': 39,
  'matthew': 40,
  'mark': 41,
  'luke': 42,
  'john': 43,
  'acts': 44,
  'romans': 45,
  '1 corinthians': 46,
  '2 corinthians': 47,
  'galatians': 48,
  'ephesians': 49,
  'philippians': 50,
  'colossians': 51,
  '1 thessalonians': 52,
  '2 thessalonians': 53,
  '1 timothy': 54,
  '2 timothy': 55,
  'titus': 56,
  'philemon': 57,
  'hebrews': 58,
  'james': 59,
  '1 peter': 60,
  '2 peter': 61,
  '1 john': 62,
  '2 john': 63,
  '3 john': 64,
  'jude': 65,
  'revelation': 66
};

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
export function getDailyTextLink(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `https://wol.jw.org/en/wol/h/r1/lp-e/text-today/${year}/${month}/${day}`;
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

// Cache for meeting workbooks data
let workbooksCache = null;

/**
 * Load meeting workbooks data from JSON file
 * @returns {Promise<Object>} Meeting workbooks data
 */
export async function loadMeetingWorkbooks() {
  if (workbooksCache) {
    return workbooksCache;
  }

  try {
    const response = await fetch('/data/meeting-workbooks.json');
    workbooksCache = await response.json();
    return workbooksCache;
  } catch (error) {
    console.error('Failed to load meeting workbooks:', error);
    return {};
  }
}

/**
 * Get workbook info for a specific week
 * @param {Date} date - Date within the week
 * @returns {Promise<Object|null>} Workbook info or null if not found
 */
export async function getWorkbookForWeek(date = new Date()) {
  const weekString = getISOWeekString(date);
  const workbooks = await loadMeetingWorkbooks();
  return workbooks[weekString] || null;
}

// Cache for bible reading data
let bibleReadingCache = null;

/**
 * Load Bible reading schedule from JSON file
 * @returns {Promise<Array>} Bible reading schedule
 */
export async function loadBibleReadingSchedule() {
  if (bibleReadingCache) {
    return bibleReadingCache;
  }

  try {
    const response = await fetch('/data/bible-reading.json');
    bibleReadingCache = await response.json();
    return bibleReadingCache;
  } catch (error) {
    console.error('Failed to load Bible reading schedule:', error);
    return [];
  }
}

/**
 * Get today's Bible reading
 * @returns {Promise<Object|null>} Today's reading info
 */
export async function getTodaysBibleReading() {
  const schedule = await loadBibleReadingSchedule();
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const reading = schedule.find(r => r.day === dayOfYear) || schedule[dayOfYear - 1];
  if (reading) {
    return {
      ...reading,
      link: parseReadingToLink(reading.reading)
    };
  }
  return null;
}

/**
 * Get Bible reading for a specific day
 * @param {number} dayOfYear - Day of year (1-365)
 * @returns {Promise<Object|null>} Reading info
 */
export async function getBibleReadingForDay(dayOfYear) {
  const schedule = await loadBibleReadingSchedule();
  const reading = schedule.find(r => r.day === dayOfYear);
  if (reading) {
    return {
      ...reading,
      link: parseReadingToLink(reading.reading)
    };
  }
  return null;
}
