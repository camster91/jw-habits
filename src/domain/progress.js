/**
 * Occurrence streaks with scaled grace, and totals. Everything is calculated
 * from the log and the dated schedule, never stored. Log entries dated after
 * "today" are ignored.
 *
 * An occurrence exists only when the routine is enabled in the schedule in
 * force on its key day, and never before the start of history
 * (`store.schedule[0].from`).
 */
import { addDays, weekday, weekStart, monthKey, serviceYear } from './day.js';
import { scheduleOn } from './schedule.js';
import { booksCompleted } from './bible.js';
import { ROUTINE_IDS, cadenceOn, checkInDays, weeklyTarget } from './routines.js';

const GRACE = { daily: 2, weeklyTarget: 2, meeting: 1, weekly: 1, monthly: 1 };
const RECENT = { daily: 30, weeklyTarget: 8, meeting: 8, weekly: 8, monthly: 12 };
const UNIT = {
  daily: 'days',
  weeklyTarget: 'weeks',
  meeting: 'meetings',
  weekly: 'weeks',
  monthly: 'months',
};

const countIn = (days, from, to) => [...days].filter((d) => d >= from && d <= to).length;

/** 'YYYY-MM' of the month after `ym`. */
function nextMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

/**
 * Raw occurrences of `id` from the start of history through `today`, in key
 * order, each `{key, cadence, done, open}`.
 */
function rawOccurrences(store, id, today) {
  const start = store.schedule[0].from;
  const days = checkInDays(store, id, today);
  const enabledOn = (d) => d >= start && scheduleOn(store, d).enabled[id] === true;
  const out = [];
  const push = (key, cadence, done, open) => out.push({ key, cadence, done, open: !done && open });

  if (id === 'meetingPrep') {
    // Up to tomorrow: a meeting dated tomorrow has its window open today.
    for (let d = start; d <= addDays(today, 1); d = addDays(d, 1)) {
      if (!enabledOn(d) || !scheduleOn(store, d).meetingDays.includes(weekday(d))) continue;
      push(d, 'meeting', days.has(d) || days.has(addDays(d, -1)), d >= today);
    }
    return out;
  }

  if (id === 'ministry') {
    for (let ym = monthKey(start); ym <= monthKey(today); ym = nextMonth(ym)) {
      const key = `${ym}-01`;
      if (enabledOn(key)) {
        const done = [...days].some((d) => monthKey(d) === ym);
        push(key, 'monthly', done, ym === monthKey(today));
      }
    }
    return out;
  }

  // Daily and weekly cadences, walked week by week. bibleReading's cadence is
  // decided per week by the schedule in force on the week's Monday.
  for (let monday = weekStart(start); monday <= today; monday = addDays(monday, 7)) {
    const sunday = addDays(monday, 6);
    const last = sunday < today ? sunday : today;
    const cadence = cadenceOn(store, id, monday);
    if (cadence === 'daily') {
      for (let d = monday; d <= last; d = addDays(d, 1)) {
        if (enabledOn(d)) push(d, cadence, days.has(d), d === today);
      }
      continue;
    }
    if (!enabledOn(monday)) continue;
    const schedule = scheduleOn(store, last);
    if (cadence === 'weeklyTarget') {
      const done = countIn(days, monday, last) >= weeklyTarget(schedule, id);
      push(monday, cadence, done, sunday >= today);
    } else {
      const familyDay = addDays(monday, (schedule.familyWorshipDay + 6) % 7);
      if (familyDay <= today) {
        push(monday, cadence, countIn(days, familyDay, last) > 0, sunday >= today);
      }
    }
  }
  return out;
}

/** All occurrences through `today` with grace applied, oldest first. */
function judged(store, id, today) {
  const used = new Map();
  return rawOccurrences(store, id, today).map(({ key, cadence, done, open }) => {
    let status = done ? 'done' : open ? 'open' : 'missed';
    if (status === 'missed') {
      // bibleReading may mix daily and weeklyTarget; both share the monthly budget.
      const period = cadence === 'monthly' ? `sy${serviceYear(key)}` : monthKey(key);
      const spent = used.get(period) ?? 0;
      if (spent < GRACE[cadence]) {
        used.set(period, spent + 1);
        status = 'grace';
      }
    }
    return { key, status };
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
