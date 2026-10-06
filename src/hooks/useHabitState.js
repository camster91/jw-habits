/**
 * useHabitState — encapsulates the per-day habit state from
 * local storage. Extracted from Home.jsx (issue #140) to make
 * the Home page a thin renderer.
 *
 * Responsibilities:
 *   - Read jw-daily-habits-state on mount; auto-reset on day rollover
 *
 * NOTE: the `jw-` prefixes below are persistence keys, not branding. They
 * ship in real installs' localStorage, so renaming them would silently
 * discard every existing user's history. They are intentionally frozen.
 *   - Prune history to the last 7 days
 *   - Expose a setter that writes through to localStorage
 *   - Track the first-done marker (for the first-launch hint)
 *   - Compute best-streak monotonic (used by the streak line)
 *
 * The hook returns the same API Home.jsx was using inline:
 *   const [state, setState, isFirstSession] = useHabitState();
 * where `setState` is a callback-style setter that updates
 * both local state and localStorage in one call.
 */

import { useState, useCallback } from 'react';
import { safeGetItem, safeSetItem } from '../utils/safeStorage.js';

const STATE_KEY = 'jw-daily-habits-state';
const FIRST_DONE_KEY = 'jw-habits-first-done';
const BEST_STREAK_KEY = 'jw-habits-best-streak';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export { todayKey };

export function pruneHistory(history, today) {
  // Retain far more than the 7-day week strip needs: the streak counters
  // read this list, so pruning to a week made every streak cap at 7 and
  // made "best" meaningless. A rolling year keeps the maths honest while
  // staying bounded.
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 364); // ~1 year back inclusive
  const seen = new Set();
  const out = [];
  for (const d of history) {
    if (!d || typeof d !== 'string') continue;
    if (seen.has(d)) continue;
    if (d >= cutoff.toISOString().slice(0, 10) && d <= today) {
      seen.add(d);
      out.push(d);
    }
  }
  out.sort();
  return out;
}

function loadInitialState() {
  try {
    const raw = safeGetItem(STATE_KEY);
    if (!raw) return { date: todayKey(), done: {}, history: [] };
    const parsed = JSON.parse(raw);
    // Per-day reset: if the saved date isn't today, start fresh.
    if (parsed.date !== todayKey()) {
      const history = pruneHistory(parsed.history || [], todayKey());
      return { date: todayKey(), done: {}, history };
    }
    const history = pruneHistory(parsed.history || [], todayKey());
    return { ...parsed, history };
  } catch {
    return { date: todayKey(), done: {}, history: [] };
  }
}

export { loadInitialState };

function persist(state) {
  // Returns false on hard quota failure after eviction retry;
  // safeSetItem dispatches `jw-storage-full` so Home can warn.
  safeSetItem(STATE_KEY, JSON.stringify(state));
}

/**
 * Best-effort monotonic best-streak tracker. Returns the new
 * best-streak value (max of previous and current streak).
 */
export function readBestStreak() {
  try {
    return parseInt(safeGetItem(BEST_STREAK_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function writeBestStreak(value) {
  safeSetItem(BEST_STREAK_KEY, String(value));
}

/**
 * Mark the user as having interacted with the app at least
 * once (used to hide the first-launch hint).
 */
export function markInteracted() {
  safeSetItem(FIRST_DONE_KEY, '1');
}

/**
 * @returns {boolean} true if the user has interacted before
 *   (in their lifetime on this device).
 */
export function hasInteracted() {
  try {
    return safeGetItem(FIRST_DONE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * @returns {[{date, done, history}, (next: any | ((prev: any) => any)) => void, boolean]}
 *   - `[0]` current habit state
 *   - `[1]` setter: pass a partial or a function to merge
 *   - `[2]` `isFirstSession` true when no prior interaction recorded
 */
export function useHabitState() {
  // React's useState only returns [state, setState]. The previous
  // 3-tuple destructure left `setStateFull === undefined`, so
  // midnight / cross-tab `replaceState` threw TypeError in an
  // event handler (outside ErrorBoundary).
  const [state, setStateInternal] = useState(() => {
    const loaded = loadInitialState();
    // If the loaded state has a non-empty `done` map (e.g., from
    // yesterday's seed, or from a previous day) and we just did
    // a per-day reset to `done: {}`, persist that reset so the
    // next reload sees the wiped state. Mirrors the behavior of
    // the inline useState initializer in Home.jsx pre-#140.
    const raw = safeGetItem(STATE_KEY);
    let stored;
    try {
      stored = raw ? JSON.parse(raw) : null;
    } catch {
      stored = null;
    }
    if (!stored || Object.keys(stored.done || {}).length > 0) {
      persist(loaded);
    }
    return loaded;
  });
  const [isFirstSession] = useState(() => !hasInteracted());

  // useCallback deps are intentionally [] — setStateInternal is
  // React's useState setter and is stable across renders.
  const updateState = useCallback((patch) => {
    setStateInternal((prev) => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      persist(next);
      return next;
    });
  }, []);

  // Full replace for midnight rollover / cross-tab sync — no
  // partial-merge semantics.
  const replaceState = useCallback((next) => {
    setStateInternal(next);
    persist(next);
  }, []);

  return [state, updateState, isFirstSession, replaceState];
}

// Re-export constants for tests that need to verify the storage keys.
export const HABIT_STATE_KEYS = {
  state: STATE_KEY,
  firstDone: FIRST_DONE_KEY,
  bestStreak: BEST_STREAK_KEY,
};
