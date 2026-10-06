/**
 * One-time migration of the v1 localStorage keys into a v2 store.
 * Pure: it is handed a `read(key)` function and never writes or deletes, so
 * the v1 keys survive for a rollback. Malformed keys count as absent.
 * Dropped on purpose: `jw-habits-best-streak` (streaks are recalculated) and
 * the state's `history` (it does not say which routine was done).
 */
import { addDays } from './day.js';
import { addCheckIn, defaultStore } from './store.js';

const STATE_KEY = 'jw-daily-habits-state';
const BIBLE_DAYS_KEY = 'jw-bible-reading-days';
const SETTINGS_KEY = 'jw-user-settings';

/** v1 row key -> v2 routine id. The other v1 rows have no v2 equivalent. */
const ROW_TO_ROUTINE = {
  text: 'dailyText',
  bible: 'bibleReading',
  meeting: 'meetingPrep',
  family: 'familyWorship',
};

const isObject = (x) => typeof x === 'object' && x !== null && !Array.isArray(x);
const isDay = (x) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && addDays(x, 0) === x;
const isTime = (x) => typeof x === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x);
const isWeekday = (x) => Number.isInteger(x) && x >= 0 && x <= 6;

function readJson(read, key) {
  try {
    const text = read(key);
    return text == null ? null : JSON.parse(text);
  } catch {
    return null;
  }
}

/** v1 stored either `{done, note}` or a bare boolean. */
const isDone = (v) => v === true || (isObject(v) && v.done === true);

/**
 * @param {(key: string) => string|null} read
 * @param {string} today app day 'YYYY-MM-DD'
 * @param {string} locale
 * @returns {object|null} a v2 store, or null when there is nothing to migrate
 */
export function migrateV1(read, today, locale) {
  const state = readJson(read, STATE_KEY);
  const bibleDays = readJson(read, BIBLE_DAYS_KEY);
  const settings = readJson(read, SETTINGS_KEY);
  const hasState = isObject(state);
  const hasBibleDays = Array.isArray(bibleDays);
  const hasSettings = isObject(settings);
  if (!hasState && !hasBibleDays && !hasSettings) return null;

  let store = defaultStore(today, locale);
  store.onboardingDone = true;

  if (hasState && isDay(state.date) && isObject(state.done)) {
    for (const [row, routine] of Object.entries(ROW_TO_ROUTINE)) {
      if (isDone(state.done[row])) {
        store = addCheckIn(store, { routine, day: state.date, value: true });
      }
    }
  }
  if (hasBibleDays) {
    for (const day of bibleDays.filter(isDay)) {
      store = addCheckIn(store, { routine: 'bibleReading', day, value: true });
    }
  }

  if (hasSettings) {
    const days = [settings.midweekDay, settings.weekendDay].filter(isWeekday);
    const meetingDays = [...new Set(days)].sort((a, b) => a - b);
    const { reminderTime, quietHours } = settings;
    const quiet =
      isObject(quietHours) && isTime(quietHours.start) && isTime(quietHours.end)
        ? { start: quietHours.start, end: quietHours.end }
        : null;
    store = {
      ...store,
      anchors: isTime(reminderTime)
        ? { ...store.anchors, dailyText: { time: reminderTime, phrase: null } }
        : store.anchors,
      reminders: {
        ...store.reminders,
        enabled: reminderTime === null ? false : store.reminders.enabled,
      },
      quietHours: quiet,
      schedule: [{ ...store.schedule[0], meetingDays }],
    };
  }

  // Migrated history must sit inside the schedule's range.
  const earliest = store.log.reduce((min, e) => (e.day < min ? e.day : min), today);
  store.schedule = [{ ...store.schedule[0], from: earliest }];
  return store;
}
