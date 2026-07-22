/**
 * Streak math — pure functions over a history array of ISO
 * YYYY-MM-DD date strings. A "day counts" if it's in the history
 * (which Home already populates from the `jw-daily-habits-state.history`
 * localStorage field — any habit checked that day).
 *
 * Used by Home to render the "🔥 N day streak" line under the
 * week strip. No external state, no jw.org content, no fetch.
 */

import { isDone } from './doneState.js';

/**
 * Compute the current streak: consecutive days ending today (or
 * yesterday — a 1-day grace so the streak doesn't break before
 * the user opens the app on a new day).
 *
 * @param {string[]} history - Sorted-ascending ISO YYYY-MM-DD date strings.
 * @param {string} today - ISO YYYY-MM-DD for "today". Pass explicitly so the
 *   function is testable (no `new Date()` dependency).
 * @returns {number} - The current streak length. 0 if no recent activity.
 */
export function currentStreak(history, today) {
  if (!Array.isArray(history) || history.length === 0 || !today) return 0;
  // De-dupe and sort descending (newest first).
  const set = new Set(
    history.filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
  );
  const sortedDesc = Array.from(set).sort().reverse();
  if (sortedDesc.length === 0) return 0;
  const todayDate = new Date(today + 'T00:00:00');
  const yesterday = new Date(todayDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = isoDate(yesterday);
  // Streak counts if the most recent checked day is today OR yesterday.
  // If the most recent is older than yesterday, the streak is broken (= 0).
  if (sortedDesc[0] !== today && sortedDesc[0] !== yesterdayStr) return 0;
  // Walk backward from the most-recent day, counting consecutive days.
  let count = 0;
  const cursor = new Date(sortedDesc[0] + 'T00:00:00');
  while (set.has(isoDate(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

/**
 * Compute the best (longest) streak ever recorded in the history
 * array. This is a stateless scan — it works on whatever dates are
 * currently in the history field. For a true all-time best, the
 * caller should persist it separately (see `bestStreak` in Home).
 *
 * @param {string[]} history
 * @returns {number}
 */
export function bestStreakFromHistory(history) {
  if (!Array.isArray(history) || history.length === 0) return 0;
  const set = new Set(
    history.filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
  );
  const sorted = Array.from(set).sort();
  if (sorted.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00');
    const curr = new Date(sorted[i] + 'T00:00:00');
    const diffDays = Math.round((curr - prev) / 86400000);
    if (diffDays === 1) {
      run++;
      if (run > best) best = run;
    } else if (diffDays > 1) {
      run = 1;
    }
    // diffDays === 0 can't happen because we de-duped above.
  }
  return best;
}

/**
 * ISO YYYY-MM-DD for a Date in local time.
 * @param {Date} d
 * @returns {string}
 */
function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Count of habits checked today vs total visible habit rows.
 * Pure local state — uses the per-day `done` map.
 *
 * Note: the `done` map may use either the legacy `{ key: boolean }`
 * shape or the new `{ key: { done: boolean, note: string } }` shape.
 * A row that has only a typed note (note + `done: false`) must NOT
 * count as done. Use `isDone()` to normalize both shapes correctly.
 *
 * @param {object} done - The `done` map from `jw-daily-habits-state.done`.
 * @param {string[]} keys - The list of row keys currently rendered (e.g. ['today','text','bible','meeting','family','thisWeek']).
 *   When the Memorial row is hidden, omit its key; this function
 *   only counts rows the user actually sees.
 * @returns {{done: number, total: number}}
 */
export function todayProgress(done, keys) {
  if (!done || !Array.isArray(keys) || keys.length === 0) return { done: 0, total: 0 };
  let count = 0;
  for (const k of keys) {
    if (isDone(done, k)) count++;
  }
  return { done: count, total: keys.length };
}
