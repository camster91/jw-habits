// Bible books and reading plans. Book names and chapter counts are public
// facts; no verse text lives here.

const RAW = [
  ['Genesis', 50],
  ['Exodus', 40],
  ['Leviticus', 27],
  ['Numbers', 36],
  ['Deuteronomy', 34],
  ['Joshua', 24],
  ['Judges', 21],
  ['Ruth', 4],
  ['1 Samuel', 31],
  ['2 Samuel', 24],
  ['1 Kings', 22],
  ['2 Kings', 25],
  ['1 Chronicles', 29],
  ['2 Chronicles', 36],
  ['Ezra', 10],
  ['Nehemiah', 13],
  ['Esther', 10],
  ['Job', 42],
  ['Psalms', 150],
  ['Proverbs', 31],
  ['Ecclesiastes', 12],
  ['Song of Solomon', 8],
  ['Isaiah', 66],
  ['Jeremiah', 52],
  ['Lamentations', 5],
  ['Ezekiel', 48],
  ['Daniel', 12],
  ['Hosea', 14],
  ['Joel', 3],
  ['Amos', 9],
  ['Obadiah', 1],
  ['Jonah', 4],
  ['Micah', 7],
  ['Nahum', 3],
  ['Habakkuk', 3],
  ['Zephaniah', 3],
  ['Haggai', 2],
  ['Zechariah', 14],
  ['Malachi', 4],
  ['Matthew', 28],
  ['Mark', 16],
  ['Luke', 24],
  ['John', 21],
  ['Acts', 28],
  ['Romans', 16],
  ['1 Corinthians', 16],
  ['2 Corinthians', 13],
  ['Galatians', 6],
  ['Ephesians', 6],
  ['Philippians', 4],
  ['Colossians', 4],
  ['1 Thessalonians', 5],
  ['2 Thessalonians', 3],
  ['1 Timothy', 6],
  ['2 Timothy', 4],
  ['Titus', 3],
  ['Philemon', 1],
  ['Hebrews', 13],
  ['James', 5],
  ['1 Peter', 5],
  ['2 Peter', 3],
  ['1 John', 5],
  ['2 John', 1],
  ['3 John', 1],
  ['Jude', 1],
  ['Revelation', 22],
];

export const BOOKS = RAW.map(([name, chapters], i) => ({ n: i + 1, name, chapters }));

const TOTAL = 1189;
const YEAR_DAYS = 365;

// OFFSETS[b] = global index of chapter 1 of book b+1.
const OFFSETS = BOOKS.reduce((acc, b, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + BOOKS[i - 1].chapters);
  return acc;
}, []);

export function chapterIndex(book, chapter) {
  return OFFSETS[book - 1] + chapter - 1;
}

export function chapterAt(i) {
  let b = BOOKS.length - 1;
  while (OFFSETS[b] > i) b--;
  return { book: b + 1, chapter: i - OFFSETS[b] + 1 };
}

const dayNumber = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
};

export function portionSize(store, day) {
  const { reading } = store;
  if (reading.plan !== 'year') return 1;
  const diff = dayNumber(day) - dayNumber(reading.startedOn);
  const k = ((diff % YEAR_DAYS) + YEAR_DAYS) % YEAR_DAYS;
  return Math.floor(((k + 1) * TOTAL) / YEAR_DAYS) - Math.floor((k * TOTAL) / YEAR_DAYS);
}

/** Counts dated chapter records against the selected year plan, across cycles.
 * Legacy bare check-ins/empty catch-up markers have no measurable chapters.
 * Own-pace readers get recorded counts with no invented target or lateness.
 */
export function readingPace(store, day) {
  const recorded = (store.log ?? [])
    .filter((e) => e.routine === 'bibleReading' && e.day >= store.reading.startedOn && e.day <= day)
    .reduce((n, e) => n + (Array.isArray(e.value?.chapters) ? e.value.chapters.length : 0), 0);
  if (store.reading.plan === 'ownPace') return { recorded, planned: null, daysAhead: null };
  const elapsed = Math.max(0, dayNumber(day) - dayNumber(store.reading.startedOn) + 1);
  const planned = Math.floor((elapsed * TOTAL) / YEAR_DAYS);
  return {
    recorded,
    planned,
    daysAhead: Math.max(0, Math.floor((recorded * YEAR_DAYS) / TOTAL) - elapsed),
  };
}

// Global chapter indices from bibleReading log entries. `true` values
// (legacy days with no chapter info) contribute nothing.
function loggedChapters(log) {
  const read = new Set();
  for (const e of log ?? []) {
    if (e.routine === 'bibleReading' && e.value && Array.isArray(e.value.chapters)) {
      for (const c of e.value.chapters) read.add(c);
    }
  }
  return read;
}

/**
 * The next `count` chapters: straight after the last chapter of the most
 * recent reading that names chapters, dated on or after `reading.startedOn`
 * (so changing the start restarts there), else the start chapter. Wraps
 * Revelation 22 to Genesis 1, so a finished Bible starts over.
 */
export function nextChapters(store, count) {
  const { start, startedOn } = store.reading;
  let latest = null;
  for (const e of store.log ?? []) {
    const chapters = e.routine === 'bibleReading' ? e.value?.chapters : undefined;
    if (!Array.isArray(chapters) || chapters.length === 0 || e.day < startedOn) continue;
    if (latest === null || e.day > latest.day) latest = e;
  }
  const first = latest
    ? (latest.value.chapters[latest.value.chapters.length - 1] + 1) % TOTAL
    : chapterIndex(start.book, start.chapter);
  return Array.from({ length: count }, (_, j) => chapterAt((first + j) % TOTAL));
}

export function booksCompleted(store) {
  const { reading, log } = store;
  const read = loggedChapters(log);
  return BOOKS.filter((b) => {
    if (reading.countEarlierAsRead && b.n < reading.start.book) return true;
    for (let c = 1; c <= b.chapters; c++) if (!read.has(chapterIndex(b.n, c))) return false;
    return true;
  }).map((b) => b.n);
}

const LOCALES = { en: 'E', es: 'S', fr: 'F' };

export function finderUrl(locale, book, chapter) {
  const wt = LOCALES[locale] ?? 'E';
  const bible = String(book).padStart(2, '0') + String(chapter).padStart(3, '0') + '001';
  return `https://www.jw.org/finder?wtlocale=${wt}&prefer=lang&bible=${bible}&pub=nwtsty`;
}
