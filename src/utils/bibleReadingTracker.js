/**
 * Bible reading progress tracker — on-device count of unique
 * days the user marked the "Bible reading" habit done.
 *
 * The user taps the Bible checkbox when they've read today's
 * passage. We record the ISO date in a Set (localStorage).
 * The set survives across sessions but lives only on this
 * device. No server, no sync, no analytics.
 *
 * The 366-day reading schedule (from dailyBibleReading.js)
 * loops year-over-year, so the count represents "how many
 * distinct days you've read" — not "how many chapters of
 * the Bible you've covered." The label renders as
 * "X / 366 days read" so the user sees it the same way.
 *
 * Cap: a Set in JSON would grow forever without one. We cap
 * at the most recent 730 days (2 years) so a long-time user
 * doesn't blow out their localStorage quota. 730 was picked
 * because a) the schedule wraps every year, so anything older
 * than "last year" no longer maps cleanly to a calendar
 * reading, and b) 730 is well under the 5MB localStorage
 * quota even with the longest possible date strings.
 */

import { safeSetItem } from './safeStorage';

const KEY = 'jw-bible-reading-days';
const MAX_ENTRIES = 730;

function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)));
  } catch {
    return new Set();
  }
}

function save(set) {
  const arr = Array.from(set).sort();
  // Keep the most recent MAX_ENTRIES (drop the oldest).
  const trimmed = arr.length > MAX_ENTRIES ? arr.slice(-MAX_ENTRIES) : arr;
  safeSetItem(KEY, JSON.stringify(trimmed));
}

/**
 * Mark today as a "Bible read" day. Idempotent — calling
 * twice in the same day is a no-op. Returns the new count.
 */
export function markBibleReadToday(date = new Date()) {
  const set = load();
  set.add(isoDate(date));
  save(set);
  return set.size;
}

/**
 * Unmark today as a "Bible read" day. Used when the user
 * un-checks the Bible checkbox. Idempotent — no-op if today
 * wasn't in the set. Returns the new count.
 */
export function unmarkBibleReadToday(date = new Date()) {
  const set = load();
  set.delete(isoDate(date));
  save(set);
  return set.size;
}

/**
 * Total count of unique days marked. 0..MAX_ENTRIES.
 */
export function bibleReadDaysCount() {
  return load().size;
}

/**
 * True if `date` (default today) is in the set (the user has
 * marked that day's Bible reading done). Used by Home to
 * decide whether the checkbox should appear pre-checked on a
 * fresh day (rare edge case: user re-opens the app on the
 * same day after midnight rollover).
 */
export function isTodayBibleRead(date = new Date()) {
  return load().has(isoDate(date));
}
