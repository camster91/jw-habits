/**
 * Pure helpers behind the Today screen: Bible chapters and catch-up, the
 * month's ministry entry, which meeting the prep is for, and small labels.
 */
import { addDays, monthKey, weekday, weekStart } from './day.js';
import { BOOKS, chapterAt, chapterIndex, nextChapters, portionSize } from './bible.js';
import { ROUTINE_IDS, checkInDays, countIn, weeklyTarget } from './routines.js';
import { scheduleOn } from './schedule.js';
import { addCheckIn, removeCheckIn } from './store.js';

const findEntry = (store, routine, day) =>
  store.log.find((e) => e.routine === routine && e.day === day) ?? null;

const nameOf = ({ book, chapter }) => `${BOOKS[book - 1].name} ${chapter}`;

/** "Psalms 3", "Psalms 3–5" or "Psalms 150 – Proverbs 2"; '' for none. */
export function chaptersLabel(chapters) {
  if (chapters.length === 0) return '';
  const first = chapters[0];
  const last = chapters[chapters.length - 1];
  if (chapters.length === 1) return nameOf(first);
  if (first.book === last.book) return `${nameOf(first)}–${last.chapter}`;
  return `${nameOf(first)} – ${nameOf(last)}`;
}

/** The chapters logged on `day`, or today's portion from the next unread chapter. */
export function todaysChapters(store, day) {
  const chapters = findEntry(store, 'bibleReading', day)?.value?.chapters;
  if (Array.isArray(chapters) && chapters.length > 0) return chapters.map(chapterAt);
  const before = removeCheckIn(store, 'bibleReading', day);
  return nextChapters(before, portionSize(store, day));
}

/** Chapters read on `day`; a bare `true` check-in counts as one portion. */
export function chaptersReadOn(store, day) {
  const value = findEntry(store, 'bibleReading', day)?.value;
  if (value === undefined) return 0;
  if (Array.isArray(value?.chapters)) return value.chapters.length;
  return portionSize(store, day);
}

/** The catch-up marker: a check-in with no chapters, never written by a real reading. */
const isCatchUp = (entry) =>
  Array.isArray(entry?.value?.chapters) &&
  entry.value.chapters.length === 0 &&
  Object.keys(entry.value).length === 1;

/** Record chapters on their actual activity day; extra reading never invents yesterday. */
export function setChaptersRead(store, day, n) {
  const yesterday = addDays(day, -1);
  let before = removeCheckIn(store, 'bibleReading', day);
  // Editing/undoing the associated day removes only the legacy synthetic
  // marker. Actual chapter records and bare widget check-ins remain intact.
  if (isCatchUp(findEntry(before, 'bibleReading', yesterday))) {
    before = removeCheckIn(before, 'bibleReading', yesterday);
  }
  if (n <= 0) return before;
  const chapters = nextChapters(before, n).map((c) => chapterIndex(c.book, c.chapter));
  return addCheckIn(before, { routine: 'bibleReading', day, value: { chapters } });
}

/** This calendar month's ministry entry (on or before `day`), or null. */
export function ministryEntry(store, day) {
  return (
    store.log.find(
      (e) => e.routine === 'ministry' && e.day <= day && monthKey(e.day) === monthKey(day)
    ) ?? null
  );
}

/**
 * Merge `patch` into the month's single ministry entry and move it to `day`,
 * so an edit counts for the day it is made (and stays undoable on Today).
 * A patch key set to `undefined` removes that field (e.g. `hours`).
 */
export function setMinistry(store, day, patch) {
  const existing = ministryEntry(store, day);
  const base = existing ? removeCheckIn(store, 'ministry', existing.day) : store;
  const merged = { shared: false, studies: 0, ...existing?.value, ...patch };
  const value = Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== undefined));
  return addCheckIn(base, { routine: 'ministry', day, value });
}

/**
 * The meeting that today's prep is for: today's, if it is a meeting day and
 * was not prepared yesterday; otherwise tomorrow's (or today's when tomorrow
 * has none).
 */
export function meetingDayFor(store, day) {
  const isMeeting = (d) => scheduleOn(store, d).meetingDays.includes(weekday(d));
  const tomorrow = addDays(day, 1);
  const preppedYesterday = checkInDays(store, 'meetingPrep', addDays(day, -1)).has(
    addDays(day, -1)
  );
  if (isMeeting(day) && !preppedYesterday) return day;
  return isMeeting(tomorrow) ? tomorrow : day;
}

/** Personal-study check-ins this week up to and including `day`, and the weekly target. */
export function studyProgress(store, day) {
  const count = countIn(checkInDays(store, 'personalStudy', day), weekStart(day), day);
  return { count, target: weeklyTarget(scheduleOn(store, day), 'personalStudy') };
}

function dayOfYear(day) {
  const [y, m, d] = day.split('-').map(Number);
  return (Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000 + 1;
}

/** Seed for pickEncouragement: day-of-year × 7 + the routine's index. */
export function encouragementSeed(day, id) {
  return dayOfYear(day) * 7 + ROUTINE_IDS.indexOf(id);
}

/** 'newMonth' on the 1st, 'newWeek' on a Monday, else null. */
export function freshStart(day) {
  if (day.endsWith('-01')) return 'newMonth';
  if (weekday(day) === 1) return 'newWeek';
  return null;
}
