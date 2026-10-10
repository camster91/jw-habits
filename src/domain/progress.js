/**
 * Occurrence streaks with scaled grace, and totals. Everything is calculated
 * from the log and the dated schedule, never stored. Log entries dated after
 * "today" are ignored.
 *
 * Each occurrence has a window: daily = the day; weeklyTarget and weekly = the
 * Monday-Sunday week; meeting = the day before through the meeting day;
 * monthly = the calendar month. Only the part up to today is considered.
 * - An occurrence exists if the routine is enabled on any day of its window
 *   within history (from `store.schedule[0].from`).
 * - It can become 'grace' or 'missed' only if the routine was enabled on every
 *   day of its window, which also means the window began within history.
 *   Otherwise (switched on or off mid-window, or the first partial period) it
 *   can only be 'done' or 'open'; if neither, it is dropped and spends no grace.
 * - Only check-ins from the start of history count towards it.
 */
import { addDays, weekday, weekStart, monthKey, serviceYear } from './day.js';
import { scheduleOn } from './schedule.js';
import { booksCompleted } from './bible.js';
import { ROUTINE_IDS, cadenceOn, checkInDays, countIn, weeklyTarget } from './routines.js';

const GRACE = { daily: 2, weeklyTarget: 2, meeting: 1, weekly: 1, monthly: 1 };
const RECENT = { daily: 30, weeklyTarget: 8, meeting: 8, weekly: 8, monthly: 12 };
const UNIT = {
  daily: 'days',
  weeklyTarget: 'weeks',
  meeting: 'meetings',
  weekly: 'weeks',
  monthly: 'months',
};

const later = (a, b) => (a > b ? a : b);
const earlier = (a, b) => (a < b ? a : b);

/** 'YYYY-MM' of the month after `ym`. */
function nextMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

/**
 * Raw occurrences of `id` from the start of history through `today`, in key
 * order, each `{key, cadence, done, open, strict}`. `strict` means the routine
 * was enabled on every day of the window up to today, so it may be missed.
 */
function rawOccurrences(store, id, today) {
  const start = store.schedule[0].from;
  const days = checkInDays(store, id, today);
  const enabledOn = (d) => d >= start && scheduleOn(store, d).enabled[id] === true;
  const out = [];

  /** Adds an occurrence for the window `from..to` (capped at today) if it exists. */
  const add = (key, cadence, from, to, isDone, open) => {
    const last = earlier(to, today);
    let on = 0;
    let total = 0;
    for (let d = from; d <= last; d = addDays(d, 1), total++) if (enabledOn(d)) on++;
    if (on === 0) return;
    const done = isDone(later(from, start), last);
    out.push({ key, cadence, done, open: !done && open, strict: on === total });
  };
  const anyIn = (from, to) => countIn(days, from, to) > 0;

  if (id === 'meetingPrep') {
    // Up to tomorrow: a meeting dated tomorrow has its window open today.
    for (let d = start; d <= addDays(today, 1); d = addDays(d, 1)) {
      if (!scheduleOn(store, d).meetingDays.includes(weekday(d))) continue;
      add(d, 'meeting', addDays(d, -1), d, anyIn, d >= today);
    }
    return out;
  }

  if (id === 'ministry') {
    for (let ym = monthKey(start); ym <= monthKey(today); ym = nextMonth(ym)) {
      const monthEnd = addDays(`${nextMonth(ym)}-01`, -1);
      add(`${ym}-01`, 'monthly', `${ym}-01`, monthEnd, anyIn, ym === monthKey(today));
    }
    return out;
  }

  // Daily and weekly cadences, walked week by week. bibleReading's cadence is
  // decided per week by the schedule in force on the week's Monday.
  for (let monday = weekStart(start); monday <= today; monday = addDays(monday, 7)) {
    const sunday = addDays(monday, 6);
    const cadence = cadenceOn(store, id, monday);
    if (cadence === 'daily') {
      for (let d = monday; d <= earlier(sunday, today); d = addDays(d, 1)) {
        add(d, cadence, d, d, anyIn, d === today);
      }
      continue;
    }
    const schedule = scheduleOn(store, earlier(sunday, today));
    if (cadence === 'weeklyTarget') {
      const target = weeklyTarget(schedule, id);
      const met = (from, to) => countIn(days, from, to) >= target;
      add(monday, cadence, monday, sunday, met, sunday >= today);
    } else {
      // Due from the family day, but "enabled throughout" uses the whole week.
      const familyDay = addDays(monday, (schedule.familyWorshipDay + 6) % 7);
      if (familyDay > today) continue;
      const doneFromFamilyDay = (from, to) => anyIn(later(from, familyDay), to);
      add(monday, cadence, monday, sunday, doneFromFamilyDay, sunday >= today);
    }
  }
  return out;
}

/** All occurrences through `today` with grace applied, oldest first. */
function judged(store, id, today) {
  const used = new Map();
  return rawOccurrences(store, id, today).flatMap(({ key, cadence, done, open, strict }) => {
    let status = done ? 'done' : open ? 'open' : 'missed';
    if (status === 'missed' && !strict) return [];
    if (status === 'missed') {
      // bibleReading may mix daily and weeklyTarget; both share the monthly budget.
      const period = cadence === 'monthly' ? `sy${serviceYear(key)}` : monthKey(key);
      const spent = used.get(period) ?? 0;
      if (spent < GRACE[cadence]) {
        used.set(period, spent + 1);
        status = 'grace';
      }
    }
    return [{ key, status }];
  });
}

/**
 * Occurrences of `id` with keys from `fromDay`, judged as of `toDay` (which is
 * treated as today: later entries are ignored, the current occurrence is
 * 'open' while unmet, and a meeting dated the day after is included).
 * Grace is budgeted from the start of history, not from `fromDay`.
 * @returns {{key: string, status: 'done'|'grace'|'open'|'missed'}[]}
 */
export function occurrences(store, id, fromDay, toDay) {
  return judged(store, id, toDay).filter((o) => o.key >= fromDay);
}

/**
 * `current`: consecutive done/grace occurrences back from the most recent
 * closed one ('open' is skipped). `recentDone` of `recentTotal`: done
 * occurrences among the last 30 / 8 / 12 closed ones, by cadence on `today`.
 */
export function streak(store, id, today) {
  const closed = judged(store, id, today).filter((o) => o.status !== 'open');
  let current = 0;
  for (let i = closed.length - 1; i >= 0 && closed[i].status !== 'missed'; i--) current++;
  const cadence = cadenceOn(store, id, today);
  const recent = closed.slice(-RECENT[cadence]);
  return {
    current,
    recentDone: recent.filter((o) => o.status === 'done').length,
    recentTotal: recent.length,
    recentUnit: UNIT[cadence],
  };
}

/**
 * Totals for the calendar year containing `today`. Day counts are distinct
 * days with a done check-in; they never include the reading baseline, while
 * `booksCompleted` does.
 */
export function totals(store, today) {
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const past = (store.log ?? []).filter((e) => e.day <= today);
  const perRoutineDaysThisYear = {};
  for (const id of ROUTINE_IDS) {
    perRoutineDaysThisYear[id] = [...checkInDays(store, id, today)].filter(
      (d) => d >= yearStart
    ).length;
  }
  const chapters = new Set();
  for (const e of past) {
    if (e.routine === 'bibleReading' && e.day >= yearStart && Array.isArray(e.value?.chapters)) {
      for (const c of e.value.chapters) chapters.add(c);
    }
  }
  return {
    readingDaysThisYear: perRoutineDaysThisYear.bibleReading,
    chaptersThisYear: chapters.size,
    booksCompleted: booksCompleted({ ...store, log: past }).length,
    perRoutineDaysThisYear,
  };
}

/** Recorded routine/day pairs this week for routines currently enabled. */
export function weeklyActivity(store, today) {
  const from = later(weekStart(today), store.schedule[0].from);
  const { enabled } = scheduleOn(store, today);
  const days = new Set();
  let checkIns = 0;
  for (const id of ROUTINE_IDS) {
    if (!enabled[id]) continue;
    for (const day of checkInDays(store, id, today)) {
      if (day < from) continue;
      checkIns++;
      days.add(day);
    }
  }
  return { checkIns, activeDays: days.size };
}
