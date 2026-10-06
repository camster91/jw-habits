/**
 * The v2 store: its shape, defaults, validation, export and import.
 * Everything here is pure. Functions return new stores and never mutate their
 * input; `validateStore` hands back a deep copy so a caller that adopts an
 * imported store cannot alias the text it came from.
 *
 * Schedule-affecting settings (enabled routines, meeting days, family worship
 * day, weekly targets) live only in `store.schedule`, never at top level.
 *
 * Log entries are `{routine, day, value}`, at most one per routine and day:
 * bibleReading `{chapters: number[]}` or `true`; ministry
 * `{shared: boolean, studies: number, hours?: number}`; the rest `true`.
 * An undone check-in is deleted, never stored as a falsy value.
 */
import { addDays } from './day.js';
import { ROUTINE_IDS } from './routines.js';

export const STORE_VERSION = 2;

/** Clock time each anchor phrase stands for. */
export const ANCHOR_PHRASE_TIMES = {
  afterBreakfast: '08:00',
  withFamilyPrayer: '07:00',
  beforeBed: '21:30',
};

const TONES = ['quiet', 'warm', 'scripture'];
const THEMES = ['system', 'light', 'dark'];
const MAX_LABEL = 30;

/**
 * A fresh store for a first run.
 * @param {string} today app day 'YYYY-MM-DD'
 * @param {string} locale kept for call-site symmetry with i18n; defaults do not vary by locale
 */
// eslint-disable-next-line no-unused-vars
export function defaultStore(today, locale) {
  return {
    version: STORE_VERSION,
    schedule: [
      {
        from: today,
        enabled: Object.fromEntries(ROUTINE_IDS.map((id) => [id, true])),
        meetingDays: [],
        familyWorshipDay: 5,
        bibleDaysPerWeek: 7,
        studyPerWeek: 3,
      },
    ],
    pioneer: false,
    hoursGoal: 50,
    lastSeenDay: null,
    reading: {
      plan: 'year',
      start: { book: 1, chapter: 1 },
      startedOn: today,
      countEarlierAsRead: false,
    },
    anchors: { dailyText: { time: '07:00', phrase: null } },
    wrapUpTime: '20:00',
    wrapUpNotification: false,
    quietHours: null,
    tone: 'warm',
    reminders: { enabled: true, off: [] },
    accent: 0,
    theme: 'system',
    labels: {},
    studyTopic: '',
    links: {},
    whatsNew: { enabled: true, lastCheck: null, seen: [], newCount: 0 },
    onboardingDone: false,
    log: [],
  };
}

const TOP_KEYS = Object.keys(defaultStore('2000-01-01', 'en'));

const isObject = (x) => typeof x === 'object' && x !== null && !Array.isArray(x);
const isInt = (x, min, max) => Number.isInteger(x) && x >= min && x <= max;
const isDay = (x) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && addDays(x, 0) === x;
const isTime = (x) => typeof x === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x);
const isRoutineId = (x) => ROUTINE_IDS.includes(x);

function validScheduleEntry(e) {
  return (
    isObject(e) &&
    isDay(e.from) &&
    isObject(e.enabled) &&
    Object.entries(e.enabled).every(([k, v]) => isRoutineId(k) && typeof v === 'boolean') &&
    Array.isArray(e.meetingDays) &&
    e.meetingDays.every((d) => isInt(d, 0, 6)) &&
    isInt(e.familyWorshipDay, 0, 6) &&
    isInt(e.bibleDaysPerWeek, 1, 7) &&
    isInt(e.studyPerWeek, 1, 7)
  );
}

function validValue(routine, value) {
  if (routine === 'ministry') {
    return (
      isObject(value) &&
      typeof value.shared === 'boolean' &&
      typeof value.studies === 'number' &&
      value.studies >= 0 &&
      (value.hours === undefined || (typeof value.hours === 'number' && value.hours >= 0))
    );
  }
  if (value === true) return true;
  return (
    routine === 'bibleReading' &&
    isObject(value) &&
    Array.isArray(value.chapters) &&
    value.chapters.every((c) => typeof c === 'number')
  );
}

function validLogEntry(e) {
  return isObject(e) && isRoutineId(e.routine) && isDay(e.day) && validValue(e.routine, e.value);
}

function validAnchor(a) {
  return (
    isObject(a) &&
    isTime(a.time) &&
    (a.phrase === null || Object.hasOwn(ANCHOR_PHRASE_TIMES, a.phrase))
  );
}

function validShape(s) {
  return (
    Object.keys(s).every((k) => TOP_KEYS.includes(k)) &&
    TOP_KEYS.every((k) => k in s) &&
    Array.isArray(s.schedule) &&
    s.schedule.length > 0 &&
    s.schedule.every(validScheduleEntry) &&
    Array.isArray(s.log) &&
    s.log.every(validLogEntry) &&
    isObject(s.labels) &&
    Object.entries(s.labels).every(
      ([k, v]) => isRoutineId(k) && typeof v === 'string' && v.length <= MAX_LABEL
    ) &&
    isObject(s.anchors) &&
    Object.entries(s.anchors).every(([k, v]) => isRoutineId(k) && validAnchor(v)) &&
    TONES.includes(s.tone) &&
    THEMES.includes(s.theme) &&
    isInt(s.accent, 0, 5) &&
    typeof s.pioneer === 'boolean' &&
    typeof s.hoursGoal === 'number'
  );
}

/**
 * @returns {{ok: true, store: object} | {ok: false, reason: 'notObject'|'newerVersion'|'olderVersion'|'badShape'}}
 */
export function validateStore(x) {
  if (!isObject(x)) return { ok: false, reason: 'notObject' };
  if (!Number.isInteger(x.version)) return { ok: false, reason: 'badShape' };
  if (x.version < STORE_VERSION) return { ok: false, reason: 'olderVersion' };
  if (x.version > STORE_VERSION) return { ok: false, reason: 'newerVersion' };
  if (!validShape(x)) return { ok: false, reason: 'badShape' };
  return { ok: true, store: JSON.parse(JSON.stringify(x)) };
}

/** New store with `{routine, day, value}` logged, replacing any entry for that routine and day. */
export function addCheckIn(store, { routine, day, value }) {
  const log = store.log.filter((e) => !(e.routine === routine && e.day === day));
  return { ...store, log: [...log, { routine, day, value }] };
}

/** New store with the entry for `routine` on `day` deleted. */
export function removeCheckIn(store, routine, day) {
  return {
    ...store,
    log: store.log.filter((e) => !(e.routine === routine && e.day === day)),
  };
}

export function exportJson(store) {
  return JSON.stringify(store, null, 2);
}

/** Parses and validates; returns a result and writes nowhere. */
export function importJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'notObject' };
  }
  return validateStore(parsed);
}

/** The custom label if a non-empty string is set, else the translated default. */
export function labelFor(store, id, t) {
  const custom = store.labels?.[id];
  return typeof custom === 'string' && custom !== '' ? custom : t('fd.routine.' + id);
}
