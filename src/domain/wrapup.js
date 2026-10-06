/**
 * The evening "day in review": when it opens, and what it says. All text comes
 * from en.json (`fd.wrapUp.*`) through the `t` passed in.
 */
import { appDay, addDays, weekday, weekStart, monthKey } from './day.js';
import { booksCompleted } from './bible.js';
import {
  ROUTINE_IDS,
  cadenceOn,
  checkInDays,
  countIn,
  dueToday,
  isDone,
  weeklyTarget,
} from './routines.js';
import { occurrences, streak } from './progress.js';
import { scheduleOn } from './schedule.js';

const ROLLOVER_MINUTES = 3 * 60;
const QUIET_FROM_MINUTES = 22 * 60;

const minutesOf = (date) => date.getHours() * 60 + date.getMinutes();

/** Local time is from 22:00 until the 03:00 rollover. */
function isLateNight(now) {
  const m = minutesOf(now);
  return m >= QUIET_FROM_MINUTES || m < ROLLOVER_MINUTES;
}

/** True from `wrapUpTime` until the 03:00 rollover of that app day. */
export function isWrapUpTime(store, now) {
  const [h, m] = store.wrapUpTime.split(':').map(Number);
  const at = h * 60 + m;
  const local = minutesOf(now);
  if (at >= ROLLOVER_MINUTES) return local >= at || local < ROLLOVER_MINUTES;
  return local >= at && local < ROLLOVER_MINUTES;
}

/** The key under which an occurrence that closes on `day` is filed. */
function keyClosingOn(store, id, day) {
  switch (cadenceOn(store, id, day)) {
    case 'daily':
    case 'meeting':
      return day;
    case 'weeklyTarget':
    case 'weekly':
      return weekday(day) === 0 ? weekStart(day) : null;
    case 'monthly':
      return monthKey(addDays(day, 1)) !== monthKey(day) ? `${monthKey(day)}-01` : null;
  }
  return null;
}

/** Whether any routine's occurrence that closed yesterday was carried by grace. */
function graceUsedYesterday(store, ids, day) {
  const yesterday = addDays(day, -1);
  return ids.some((id) => {
    const key = keyClosingOn(store, id, yesterday);
    return (
      key !== null &&
      occurrences(store, id, key, day).some((o) => o.key === key && o.status === 'grace')
    );
  });
}

/** The "what moved" text for a routine done today, or null if it has none. */
function movedText(store, id, day, t) {
  switch (id) {
    case 'bibleReading': {
      const entry = store.log.find((e) => e.routine === id && e.day === day);
      const books = booksCompleted(store).length;
      const chapters = Array.isArray(entry?.value?.chapters) ? entry.value.chapters.length : 0;
      return chapters > 0
        ? t('fd.wrapUp.bibleMoved', { count: chapters, books })
        : t('fd.wrapUp.bibleBooks', { books });
    }
    case 'meetingPrep': {
      const { recentDone, recentTotal } = streak(store, id, day);
      return t('fd.wrapUp.meetingMoved', { done: recentDone, total: recentTotal });
    }
    case 'personalStudy': {
      const count = countIn(checkInDays(store, id, day), weekStart(day), day);
      const target = weeklyTarget(scheduleOn(store, day), id);
      return t('fd.wrapUp.studyMoved', { count, target });
    }
    case 'familyWorship':
      return t('fd.wrapUp.familyMoved');
    default:
      return null;
  }
}

/**
 * @param {object} store
 * @param {Date} now
 * @param {(key: string, options?: object) => string} t
 */
export function wrapUp(store, now, t) {
  const day = appDay(now);
  const due = dueToday(store, day);
  const doneAll = due.filter((id) => isDone(store, id, day));
  const open = due.filter((id) => !doneAll.includes(id));
  const late = isLateNight(now);
  const restWell = t('fd.wrapUp.restWell');

  if (doneAll.length === 0) {
    return {
      done: [],
      moved: [],
      stillOpen: [],
      graceUsedToday: graceUsedYesterday(store, ROUTINE_IDS, day),
      state: 'none',
      closingLine: restWell,
    };
  }

  const moved = doneAll.flatMap((id) => {
    const text = movedText(store, id, day, t);
    return text === null ? [] : [{ id, text }];
  });
  return {
    done: doneAll,
    moved,
    stillOpen: late ? [] : open,
    graceUsedToday: graceUsedYesterday(store, ROUTINE_IDS, day),
    state: open.length === 0 ? 'allDone' : 'some',
    closingLine: late ? restWell : null,
  };
}
