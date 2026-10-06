/**
 * Dated schedules. `store.schedule` is an array of ScheduleEntry sorted by
 * `from`; the entry in force on a day is the latest one starting on or before
 * it. Changing the schedule never rewrites history, it adds a new entry.
 *
 * @typedef {'dailyText'|'bibleReading'|'meetingPrep'|'familyWorship'|'personalStudy'|'ministry'} RoutineId
 * @typedef {Object} ScheduleEntry
 * @property {string} from 'YYYY-MM-DD' first day this entry applies
 * @property {Record<RoutineId, boolean>} enabled
 * @property {number[]} meetingDays weekdays, 0 is Sunday
 * @property {number} familyWorshipDay weekday, 0 is Sunday
 * @property {number} bibleDaysPerWeek 1..7
 * @property {number} studyPerWeek 1..7
 */

/**
 * The entry in force on `day`. Days before every entry use the earliest one.
 * @returns {ScheduleEntry}
 */
export function scheduleOn(store, day) {
  const entries = store.schedule;
  let found = entries[0];
  for (const entry of entries) {
    if (entry.from <= day) found = entry;
    else break;
  }
  return found;
}

/**
 * Pure: returns a new store whose schedule has an entry starting on `day`
 * (the entry in force on `day` merged with `patch`), replacing any entry that
 * already starts on `day`.
 * @param {Partial<ScheduleEntry>} patch
 */
export function withScheduleChange(store, day, patch) {
  const base = scheduleOn(store, day);
  const entry = {
    ...base,
    ...patch,
    enabled: { ...base.enabled, ...patch.enabled },
    from: day,
  };
  const schedule = [...store.schedule.filter((e) => e.from !== day), entry].sort((a, b) =>
    a.from < b.from ? -1 : a.from > b.from ? 1 : 0
  );
  return { ...store, schedule };
}
