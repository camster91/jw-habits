/**
 * The v3 store: its shape, defaults, validation, export and import.
 * Everything here is pure. Functions return new stores and never mutate their
 * input; `validateStore` hands back a deep copy so a caller that adopts an
 * imported store cannot alias the text it came from.
 *
 * Schedule-affecting settings (enabled routines, meeting days, family worship
 * day, weekly targets) live only in `store.schedule`, never at top level.
 *
 * Log entries are `{routine, day, value}`, at most one per routine and day:
 * bibleReading `{chapters: number[]}` or `true`; ministry
 * `{shared: boolean, studies: number, hours?: number}`; personalStudy
 * `{stepId: string}` (the plan step that session completed) or `true`; the
 * rest `true`. An undone check-in is deleted, never stored as a falsy value.
 *
 * v3 adds plans (study projects and family worship plans), the active study
 * plan, weekly family agendas keyed by Monday, badge earn days, and the
 * game-layer and share switches. References between them (an agenda step
 * item, `activePlan.personalStudy`, a `{stepId}` log value) may dangle:
 * validation checks only their shape, and a dangling one never makes a store
 * unloadable. Stored v2 values and v2 backup files go through `upgradeStore`
 * (upgrade.js) first.
 */
import { addDays, appDay, weekday } from './day.js';
import { BOOKS } from './bible.js';
import { ROUTINE_IDS } from './routines.js';
import { upgradeStore } from './upgrade.js';
import { MAX_AGENDA_ITEMS, MAX_NOTE, MAX_STEPS, MAX_TITLE, newId } from './ids.js';
import { isSafeHttpUrl } from '../utils/safeUrls.js';

export { newId };

export const STORE_VERSION = 3;

export const PLAN_KINDS = ['study', 'family'];
export const PLAN_ICONS = ['book', 'scroll', 'lamp', 'mountain', 'seedling', 'dove', 'sun', 'path'];
export const PLAN_COLOURS = 8;
export const BADGE_IDS = [
  'firstStep',
  'firstProject',
  'firstFamilyPlan',
  'familyWeeks4',
  'familyWeeks12',
  'familyWeeks52',
  'dailyText30',
  'dailyText100',
  'dailyText365',
  'study10',
  'plans5',
  'meetings10',
  'pentateuch',
  'gospels',
  'greekScriptures',
  'wholeBible',
  'firstFullFamilyWeek',
  'level5',
];

/** Clock time each anchor phrase stands for. */
export const ANCHOR_PHRASE_TIMES = {
  afterBreakfast: '08:00',
  withFamilyPrayer: '07:00',
  beforeBed: '21:30',
};

const TONES = ['quiet', 'warm', 'scripture'];
const THEMES = ['system', 'light', 'dark'];
const MAX_LABEL = 30;
const TOTAL_CHAPTERS = BOOKS.reduce((n, b) => n + b.chapters, 0);

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
    links: {},
    whatsNew: { enabled: true, lastCheck: null, seen: [], newCount: 0 },
    onboardingDone: false,
    log: [],
    plans: [],
    activePlan: { personalStudy: null },
    familyAgendas: {},
    badges: {},
    showGameLayer: true,
    showShare: true,
  };
}

const TOP_KEYS = Object.keys(defaultStore('2000-01-01', 'en'));

const isObject = (x) => typeof x === 'object' && x !== null && !Array.isArray(x);
const isInt = (x, min, max) => Number.isInteger(x) && x >= min && x <= max;
const isDay = (x) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && addDays(x, 0) === x;
const isTime = (x) => typeof x === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x);
const isNonNegative = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const exactKeys = (o, keys) => Object.keys(o).length === keys.length && keys.every((k) => k in o);
const isRoutineId = (x) => ROUTINE_IDS.includes(x);
const isId = (x) => typeof x === 'string' && x !== '';
const isTitle = (x) => typeof x === 'string' && x.length >= 1 && x.length <= MAX_TITLE;
const isLink = (x) => x === null || isSafeHttpUrl(x);
const isMonday = (x) => isDay(x) && weekday(x) === 1;

function validScheduleEntry(e) {
  return (
    isObject(e) &&
    isDay(e.from) &&
    isObject(e.enabled) &&
    exactKeys(e.enabled, ROUTINE_IDS) &&
    ROUTINE_IDS.every((k) => typeof e.enabled[k] === 'boolean') &&
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
      Object.keys(value).every((k) => ['shared', 'studies', 'hours'].includes(k)) &&
      typeof value.shared === 'boolean' &&
      isInt(value.studies, 0, Infinity) &&
      (value.hours === undefined || isNonNegative(value.hours))
    );
  }
  if (value === true) return true;
  if (routine === 'personalStudy') {
    return isObject(value) && exactKeys(value, ['stepId']) && isId(value.stepId);
  }
  return (
    routine === 'bibleReading' &&
    isObject(value) &&
    exactKeys(value, ['chapters']) &&
    Array.isArray(value.chapters) &&
    value.chapters.every((c) => isInt(c, 0, TOTAL_CHAPTERS - 1))
  );
}

function validLogEntry(e) {
  return (
    isObject(e) &&
    exactKeys(e, ['routine', 'day', 'value']) &&
    isRoutineId(e.routine) &&
    isDay(e.day) &&
    validValue(e.routine, e.value)
  );
}

/** Every entry valid, and at most one per (routine, day). */
function validLog(log) {
  const seen = new Set();
  return log.every((e) => {
    if (!validLogEntry(e)) return false;
    const key = e.routine + '|' + e.day;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function validAnchor(a) {
  return (
    isObject(a) &&
    isTime(a.time) &&
    (a.phrase === null || Object.hasOwn(ANCHOR_PHRASE_TIMES, a.phrase))
  );
}

function validReading(r) {
  if (!isObject(r) || !exactKeys(r, ['plan', 'start', 'startedOn', 'countEarlierAsRead'])) {
    return false;
  }
  const book = isObject(r.start) ? BOOKS[r.start.book - 1] : undefined;
  return (
    ['year', 'ownPace'].includes(r.plan) &&
    book !== undefined &&
    isInt(r.start.chapter, 1, book.chapters) &&
    isDay(r.startedOn) &&
    typeof r.countEarlierAsRead === 'boolean'
  );
}

function validReminders(r) {
  return (
    isObject(r) &&
    typeof r.enabled === 'boolean' &&
    Array.isArray(r.off) &&
    r.off.every(isRoutineId)
  );
}

function validWhatsNew(w) {
  return (
    isObject(w) &&
    typeof w.enabled === 'boolean' &&
    (w.lastCheck === null || typeof w.lastCheck === 'string') &&
    Array.isArray(w.seen) &&
    w.seen.every((x) => typeof x === 'string') &&
    isInt(w.newCount, 0, Infinity)
  );
}

function validQuietHours(q) {
  return isObject(q) && exactKeys(q, ['start', 'end']) && isTime(q.start) && isTime(q.end);
}

function validStep(st) {
  return (
    isObject(st) &&
    exactKeys(st, ['id', 'title', 'link', 'note', 'doneOn']) &&
    isId(st.id) &&
    isTitle(st.title) &&
    isLink(st.link) &&
    (st.note === null || (typeof st.note === 'string' && st.note.length <= MAX_NOTE)) &&
    (st.doneOn === null || isDay(st.doneOn))
  );
}

function validPlan(p) {
  return (
    isObject(p) &&
    exactKeys(p, ['id', 'title', 'kind', 'colour', 'icon', 'steps', 'createdOn', 'archivedOn']) &&
    isId(p.id) &&
    isTitle(p.title) &&
    PLAN_KINDS.includes(p.kind) &&
    isInt(p.colour, 0, PLAN_COLOURS - 1) &&
    PLAN_ICONS.includes(p.icon) &&
    Array.isArray(p.steps) &&
    p.steps.length <= MAX_STEPS &&
    p.steps.every(validStep) &&
    isDay(p.createdOn) &&
    (p.archivedOn === null || isDay(p.archivedOn))
  );
}

/** Every plan valid; plan ids unique, and step ids unique across all plans. */
function validPlans(plans) {
  if (!Array.isArray(plans) || !plans.every(validPlan)) return false;
  const planIds = plans.map((p) => p.id);
  const stepIds = plans.flatMap((p) => p.steps.map((st) => st.id));
  return new Set(planIds).size === planIds.length && new Set(stepIds).size === stepIds.length;
}

function validActivePlan(a) {
  return (
    isObject(a) &&
    exactKeys(a, ['personalStudy']) &&
    (a.personalStudy === null || isId(a.personalStudy))
  );
}

function validAgendaItem(item) {
  if (!isObject(item) || !isId(item.id)) return false;
  if (item.kind === 'step') {
    return (
      exactKeys(item, ['id', 'kind', 'planId', 'stepId']) && isId(item.planId) && isId(item.stepId)
    );
  }
  return (
    item.kind === 'free' &&
    exactKeys(item, ['id', 'kind', 'title', 'link']) &&
    isTitle(item.title) &&
    isLink(item.link)
  );
}

/** Keyed by Monday; at most five items a week, with ids unique within the week. */
function validFamilyAgendas(agendas) {
  return (
    isObject(agendas) &&
    Object.entries(agendas).every(
      ([monday, items]) =>
        isMonday(monday) &&
        Array.isArray(items) &&
        items.length <= MAX_AGENDA_ITEMS &&
        items.every(validAgendaItem) &&
        new Set(items.map((i) => i.id)).size === items.length
    )
  );
}

function validBadges(b) {
  return (
    isObject(b) && Object.entries(b).every(([id, day]) => BADGE_IDS.includes(id) && isDay(day))
  );
}

function validShape(s) {
  return (
    Object.keys(s).every((k) => TOP_KEYS.includes(k)) &&
    TOP_KEYS.every((k) => k in s) &&
    Array.isArray(s.schedule) &&
    s.schedule.length > 0 &&
    s.schedule.every(validScheduleEntry) &&
    s.schedule.every((e, i) => i === 0 || s.schedule[i - 1].from < e.from) &&
    Array.isArray(s.log) &&
    validLog(s.log) &&
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
    isNonNegative(s.hoursGoal) &&
    validReading(s.reading) &&
    validReminders(s.reminders) &&
    validWhatsNew(s.whatsNew) &&
    isObject(s.links) &&
    Object.values(s.links).every((v) => typeof v === 'string') &&
    (s.quietHours === null || validQuietHours(s.quietHours)) &&
    isTime(s.wrapUpTime) &&
    typeof s.wrapUpNotification === 'boolean' &&
    typeof s.onboardingDone === 'boolean' &&
    validPlans(s.plans) &&
    validActivePlan(s.activePlan) &&
    validFamilyAgendas(s.familyAgendas) &&
    validBadges(s.badges) &&
    typeof s.showGameLayer === 'boolean' &&
    typeof s.showShare === 'boolean' &&
    (s.lastSeenDay === null || isDay(s.lastSeenDay))
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

/**
 * Parses, upgrades a v2 file to v3, and validates; returns a result and
 * writes nowhere.
 * @param {string} text
 * @param {string} [today] app day the upgrade dates a migrated plan from
 */
export function importJson(text, today = appDay(new Date())) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'notObject' };
  }
  return validateStore(upgradeStore(parsed, today));
}

/** The custom label if one with more than whitespace is set, else the translated default. */
export function labelFor(store, id, t) {
  const custom = store.labels?.[id];
  return typeof custom === 'string' && custom.trim() !== '' ? custom : t('fd.routine.' + id);
}
