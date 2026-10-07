/**
 * User settings store.
 *
 * Single localStorage key (`jw-user-settings`) holds all user
 * preferences. Schema is versioned so we can add new fields
 * later without breaking older installs — unknown fields are
 * dropped on load, missing fields fall back to defaults.
 *
 * Why a separate key from `jw-daily-habits-state`?
 *   - The per-day state is wiped daily (per-day reset).
 *   - Settings are sticky and rare — separate key keeps the
 *     daily reset path simple.
 *   - Settings may be cleared via browser site-data without
 *     affecting the day's habit progress, and vice versa.
 */

import { safeGetItem, safeSetItem, safeRemoveItem } from './safeStorage.js';

const STORAGE_KEY = 'jw-user-settings';

// Bump this when the schema changes incompatibly.
export const SETTINGS_SCHEMA_VERSION = 1;

// Canonical defaults. Keep this list short — every field
// here becomes a UI control in the Settings accordion.
const DEFAULTS = Object.freeze({
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  // Midweek meeting day. JavaScript Date.getDay() returns
  // 0 (Sun) .. 6 (Sat). The "Today" row uses this to decide
  // when to show "Tonight — Midweek Meeting" (day-of =
  // midweekDay) vs "Today — Midweek Meeting Prep" (day-of =
  // midweekDay - 1, Sun..Fri) vs other copy.
  // Default 2 = Tuesday (the global convention).
  midweekDay: 2,
  // Weekend meeting day. The "Today" row uses this to show
  // the weekend-meeting label on this day
  // and "Tomorrow" the night before.
  // Default 0 = Sunday.
  weekendDay: 0,
  // Daily check-in reminder time. 24h "HH:MM" string. Used
  // by the notification scheduler (Wave 3). null = disabled.
  reminderTime: null,
  // Quiet hours — no notifications in this window. 24h.
  // { start: "22:00", end: "07:00" } means no notifications
  // 10pm-7am. null = no quiet hours.
  quietHours: null,
  // User-owned destination links for the habit rows. Ships empty:
  // the app contains no third-party URLs by default, and each slot
  // is whatever the user pasted in Settings.
  links: { primary: '', secondary: '' },
});

// Merge a stored record over the defaults. Unknown fields
// are dropped. Missing fields fall back to defaults. Wrong
// types are coerced to defaults (defensive: if the user
// hand-edits localStorage, we still boot).
function mergeWithDefaults(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULTS };
  const out = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) {
    if (!(key in raw)) continue;
    const value = raw[key];
    const def = DEFAULTS[key];
    if (key === 'midweekDay' || key === 'weekendDay') {
      // Booleans / integers in the right range
      const n = Number(value);
      out[key] = Number.isInteger(n) && n >= 0 && n <= 6 ? n : def;
    } else if (key === 'schemaVersion') {
      out[key] = SETTINGS_SCHEMA_VERSION; // always overwrite
    } else if (key === 'reminderTime') {
      out[key] = typeof value === 'string' && /^\d{2}:\d{2}$/.test(value) ? value : def;
    } else if (key === 'quietHours') {
      if (
        value &&
        typeof value === 'object' &&
        typeof value.start === 'string' &&
        typeof value.end === 'string'
      ) {
        out[key] = { start: value.start, end: value.end };
      } else if (value === null) {
        out[key] = null;
      } else {
        out[key] = def;
      }
    } else if (key === 'links') {
      // Keep only the known slots, and only string values. The URLs
      // themselves are validated at render time by resolveUserLink.
      const src = value && typeof value === 'object' ? value : {};
      out[key] = {
        primary: typeof src.primary === 'string' ? src.primary : def.primary,
        secondary: typeof src.secondary === 'string' ? src.secondary : def.secondary,
      };
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Load settings from local storage. Always returns a complete
 * settings object (never null/undefined). On any parse error
 * or schema mismatch, returns the defaults.
 */
export function loadSettings() {
  if (typeof localStorage === 'undefined') return { ...DEFAULTS };
  try {
    const raw = JSON.parse(safeGetItem(STORAGE_KEY) || '{}');
    return mergeWithDefaults(raw);
  } catch {
    return { ...DEFAULTS };
  }
}

/**
 * Save settings to local storage. Swallows quota / private-mode
 * errors silently — the in-memory state is still updated by
 * the caller, and the next save will retry.
 */
export function saveSettings(settings) {
  if (typeof localStorage === 'undefined') return;
  // Evicts non-essential keys + signals UI on hard quota failure.
  safeSetItem(STORAGE_KEY, JSON.stringify(settings));
}

/**
 * Reset settings to defaults and remove the storage key.
 * Useful for "Reset to defaults" UI action.
 */
export function clearSettings() {
  if (typeof localStorage === 'undefined') return;
  try {
    safeRemoveItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Expose the STORAGE_KEY for tests + cleanup.
export { STORAGE_KEY, DEFAULTS };
