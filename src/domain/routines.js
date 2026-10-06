/**
 * The six fixed routines, their cadences, and what is due on a given app day.
 * Log entries dated after the day being judged are ignored everywhere.
 *
 * @typedef {import('./schedule.js').RoutineId} RoutineId
 * @typedef {'daily'|'weeklyTarget'|'meeting'|'weekly'|'monthly'} Cadence
 */
import { addDays, weekday, weekStart, monthKey } from './day.js';
import { scheduleOn } from './schedule.js';

/** @type {RoutineId[]} */
export const ROUTINE_IDS = [
  'dailyText',
  'bibleReading',
  'meetingPrep',
  'familyWorship',
  'personalStudy',
  'ministry',
];

export const DEFAULT_LABELS = {
  dailyText: 'Daily text',
  bibleReading: 'Bible reading',
  meetingPrep: 'Meeting prep',
  familyWorship: 'Family worship',
  personalStudy: 'Personal study',
  ministry: 'Ministry',
};

/**
 * Nominal cadence per routine. bibleReading is 'daily' only while the
 * schedule asks for 7 days a week; use `cadenceOn` for the cadence on a day.
 * @type {Record<RoutineId, Cadence>}
 */
export const CADENCE = {
  dailyText: 'daily',
  bibleReading: 'daily',
  meetingPrep: 'meeting',
  familyWorship: 'weekly',
  personalStudy: 'weeklyTarget',
  ministry: 'monthly',
};

/** @returns {Cadence} the cadence of `id` under the schedule in force on `day`. */
export function cadenceOn(store, id, day) {
  if (id === 'bibleReading' && scheduleOn(store, day).bibleDaysPerWeek < 7) return 'weeklyTarget';
  return CADENCE[id];
}

/** The weekly target for a weeklyTarget routine under `schedule`. */
export function weeklyTarget(schedule, id) {
  return id === 'personalStudy' ? schedule.studyPerWeek : schedule.bibleDaysPerWeek;
}

/** Ministry counts only when shared; any other entry is a check-in. */
function entryIsDone(entry) {
  return entry.routine !== 'ministry' || entry.value?.shared === true;
}

/**
 * The set of days with a done check-in for `id`, ignoring entries after `upTo`.
 * @returns {Set<string>}
 */
export function checkInDays(store, id, upTo) {
  const days = new Set();
  for (const e of store.log ?? []) {
    if (e.routine === id && e.day <= upTo && entryIsDone(e)) days.add(e.day);
  }
  return days;
}

/** Whether `id` has a done check-in on exactly `day` (the Today row's checked state). */
export function isDone(store, id, day) {
  return checkInDays(store, id, day).has(day);
}

const countIn = (days, from, to) => {
  let n = 0;
  for (const d of days) if (d >= from && d <= to) n++;
  return n;
};

/**
 * Whether `id`'s current occurrence is still unmet by check-ins made before
 * `day`. Check-ins made on `day` itself don't hide the row, so a check-in
 * can be undone from Today.
 */
function isDueOn(store, id, day) {
  const schedule = scheduleOn(store, day);
  const before = checkInDays(store, id, addDays(day, -1));
  switch (cadenceOn(store, id, day)) {
    case 'daily':
      return true;
    case 'weeklyTarget':
      return countIn(before, weekStart(day), day) < weeklyTarget(schedule, id);
    case 'meeting': {
      const isMeeting = (d) =>
        scheduleOn(store, d).enabled[id] && scheduleOn(store, d).meetingDays.includes(weekday(d));
      // Tomorrow's meeting opens today; today's meeting is met by yesterday's check-in.
      return isMeeting(addDays(day, 1)) || (isMeeting(day) && !before.has(addDays(day, -1)));
    }
    case 'weekly': {
      const familyDay = addDays(weekStart(day), (schedule.familyWorshipDay + 6) % 7);
      return familyDay <= day && countIn(before, familyDay, day) === 0;
    }
    case 'monthly':
      return store.pioneer === true || ![...before].some((d) => monthKey(d) === monthKey(day));
  }
  return false;
}

/**
 * Routines to show on Today, in ROUTINE_IDS order (plan decisions 3 and 4).
 * @returns {RoutineId[]}
 */
export function dueToday(store, day) {
  const { enabled } = scheduleOn(store, day);
  return ROUTINE_IDS.filter((id) => enabled[id] && isDueOn(store, id, day));
}
