/**
 * Sunday Watchtower Study attendance tracker — on-device
 * count of ISO weeks in which the user marked the
 * "Sunday Watchtower Study" habit done.
 *
 * The user taps the Sunday Watchtower row's checkbox when
 * they've studied (and attended) that week's meeting. We
 * record the ISO week (e.g. "2026-W30") in a Set
 * (localStorage). The set lives only on this device — no
 * server, no sync, no analytics.
 *
 * ISO weeks (Mon-Sun) are used because the Sunday Watchtower
 * Study is *weekly*, not daily. Recording the week (not the
 * Sunday's date) means checking off the habit on Saturday
 * afternoon and then again after the Sunday meeting both
 * land on the same week — not "double-counted."
 *
 * Cap: a Set in JSON would grow forever without one. We cap
 * at the most recent 104 weeks (2 years) — well under the
 * 5 MB localStorage quota even with the longest week ids,
 * and way more history than the user needs.
 */

import { safeSetItem } from './safeStorage';

const KEY = 'jw-sunday-watchtower-weeks';
const MAX_ENTRIES = 104;

/** ISO 8601 week-of-year id (e.g. "2026-W30") for a given date.
 * Pure function — does not depend on `new Date()`. */
export function isoWeekOfDate(d = new Date()) {
  // ISO weeks start on Monday. Thursday of the current week
  // determines the ISO year (the week containing Thursday
  // is week N).
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (target.getDay() + 6) % 7; // 0=Mon..6=Sun
  target.setDate(target.getDate() - dow + 3);
  // First Thursday of that ISO year = Jan 4.
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstThursdayDow = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstThursdayDow + 3);
  const week = Math.round((target - firstThursday) / (7 * 24 * 3600 * 1000)) + 1;
  const year = target.getFullYear();
  return {
    year,
    week,
    id: `${year}-W${String(week).padStart(2, '0')}`,
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    // Filter to valid ISO-week strings: "YYYY-W##"
    return new Set(arr.filter((s) => typeof s === 'string' && /^\d{4}-W\d{2}$/.test(s)));
  } catch {
    return new Set();
  }
}

function save(set) {
  const arr = Array.from(set).sort();
  const trimmed = arr.length > MAX_ENTRIES ? arr.slice(-MAX_ENTRIES) : arr;
  safeSetItem(KEY, JSON.stringify(trimmed));
}

/**
 * Mark this Sunday's study week as attended. Idempotent —
 * marking twice in the same week is a no-op. Returns the
 * new ISO-week id (e.g. "2026-W30") so callers can confirm
 * what was recorded.
 */
export function markSundayWatchtowerWeek(date = new Date()) {
  const { id } = isoWeekOfDate(date);
  const set = load();
  set.add(id);
  save(set);
  return id;
}

/**
 * Un-mark this Sunday's study week. Idempotent — no-op if
 * the week was not in the set. Returns the ISO-week id.
 */
export function unmarkSundayWatchtowerWeek(date = new Date()) {
  const { id } = isoWeekOfDate(date);
  const set = load();
  set.delete(id);
  save(set);
  return id;
}

/**
 * Total count of unique ISO weeks marked. 0..MAX_ENTRIES.
 */
export function sundayWatchtowerWeeksCount() {
  return load().size;
}

/** True iff the current week is marked attended. */
export function isSundayWatchtowerWeekDone(date = new Date()) {
  const { id } = isoWeekOfDate(date);
  return load().has(id);
}
