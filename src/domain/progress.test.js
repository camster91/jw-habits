import { describe, it, expect } from 'vitest';
import { occurrences, streak, totals } from './progress.js';
import { addDays } from './day.js';
import { withScheduleChange } from './schedule.js';
import { chapterIndex } from './bible.js';

const ALL_ON = {
  dailyText: true,
  bibleReading: true,
  meetingPrep: true,
  familyWorship: true,
  personalStudy: true,
  ministry: true,
};

const entry = (from, { enabled = {}, ...rest } = {}) => ({
  from,
  enabled: { ...ALL_ON, ...enabled },
  meetingDays: [2, 0],
  familyWorshipDay: 5,
  bibleDaysPerWeek: 7,
  studyPerWeek: 3,
  ...rest,
});

const makeStore = ({ schedule, log = [], pioneer = false, reading } = {}) => ({
  schedule,
  log,
  pioneer,
  reading: reading ?? { plan: 'own', start: { book: 1, chapter: 1 }, countEarlierAsRead: false },
});

const log = (routine, day, value = true) => ({ routine, day, value });

/** Every day from a to b inclusive. */
const range = (a, b) => {
  const out = [];
  for (let d = a; d <= b; d = addDays(d, 1)) out.push(d);
  return out;
};

const statusOf = (occs, key) => occs.find((o) => o.key === key)?.status;

describe('grace for daily routines (2 per calendar month)', () => {
  const missed = ['2026-10-05', '2026-10-10', '2026-10-20', '2026-11-03'];
  const store = makeStore({
    schedule: [entry('2026-10-01')],
    log: range('2026-10-01', '2026-11-10')
      .filter((d) => !missed.includes(d))
      .map((d) => log('dailyText', d)),
  });

  it('turns the first 2 October misses into grace and the third into missed; November resets', () => {
    const occs = occurrences(store, 'dailyText', '2026-10-01', '2026-11-10');
    expect(occs).toHaveLength(41);
    expect(statusOf(occs, '2026-10-05')).toBe('grace');
    expect(statusOf(occs, '2026-10-10')).toBe('grace');
    expect(statusOf(occs, '2026-10-20')).toBe('missed');
    expect(statusOf(occs, '2026-11-03')).toBe('grace');
    expect(occs.filter((o) => o.status === 'done')).toHaveLength(37);
  });

  it('applies grace from the start of history even when asked for a later window', () => {
    const occs = occurrences(store, 'dailyText', '2026-10-15', '2026-10-25');
    expect(occs.map((o) => o.key)).toEqual(range('2026-10-15', '2026-10-25'));
    expect(statusOf(occs, '2026-10-20')).toBe('missed');
  });

  it('counts the streak back to the missed day, through grace', () => {
    // 2026-10-21 .. 2026-11-10 is 21 occurrences, one of them (11-03) grace.
    expect(streak(store, 'dailyText', '2026-11-10')).toEqual({
      current: 21,
      recentDone: 28, // last 30 days: 10-12..11-10, minus 10-20 and 11-03
      recentTotal: 30,
      recentUnit: 'days',
    });
  });

  it("leaves today 'open' while not done, and the streak skips it", () => {
    const occs = occurrences(store, 'dailyText', '2026-11-10', '2026-11-11');
    expect(occs).toEqual([
      { key: '2026-11-10', status: 'done' },
      { key: '2026-11-11', status: 'open' },
    ]);
    const s = streak(store, 'dailyText', '2026-11-11');
    expect(s.current).toBe(21);
    expect(s.recentTotal).toBe(30);
    expect(s.recentDone).toBe(28);
  });
});

describe('grace for ministry (1 per service year)', () => {
  const missedMonths = ['2026-10', '2026-12', '2027-10'];
  const months = [];
  for (let y = 2026, m = 9; y < 2027 || m <= 10; m === 12 ? ((m = 1), y++) : m++) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
  }
  const store = makeStore({
    schedule: [entry('2026-09-01')],
    log: [
      ...months
        .filter((mk) => !missedMonths.includes(mk))
        .map((mk) => log('ministry', `${mk}-05`, { shared: true, studies: 1 })),
      // A "not shared" entry does not make December done.
      log('ministry', '2026-12-05', { shared: false, studies: 1 }),
    ],
  });

  it('turns the first missed month of a service year into grace and the second into missed', () => {
    const occs = occurrences(store, 'ministry', '2026-09-01', '2027-11-15');
    expect(occs).toHaveLength(15);
    expect(statusOf(occs, '2026-09-01')).toBe('done');
    expect(statusOf(occs, '2026-10-01')).toBe('grace');
    expect(statusOf(occs, '2026-12-01')).toBe('missed');
    // A new service year starts in September 2027, so October 2027 gets grace again.
    expect(statusOf(occs, '2027-10-01')).toBe('grace');
    expect(statusOf(occs, '2027-11-01')).toBe('open');
  });

  it('reports the streak in months over the last 12', () => {
    expect(streak(store, 'ministry', '2027-11-15')).toEqual({
      current: 10, // 2027-10 (grace) back to 2027-01; 2026-12 was missed
      recentDone: 10, // 2026-11..2027-10, minus 2026-12 and 2027-10
      recentTotal: 12,
      recentUnit: 'months',
    });
  });
});

describe('Review Focus 2: changing settings mid-history', () => {
  it('keeps September Tuesdays done after meeting days move to Wed/Sat, with no September Wednesdays', () => {
    const store = makeStore({
      schedule: [entry('2026-09-01'), entry('2026-10-01', { meetingDays: [3, 6] })],
      log: [
        // Old schedule (Tue + Sun): checked on Tuesdays and on the Saturday before each Sunday.
        ...['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29'],
        ...['2026-09-05', '2026-09-12', '2026-09-19', '2026-09-26'],
        // New schedule (Wed + Sat): Fri 2nd for Sat 3rd, Tue 6th for Wed 7th, Sat 10th itself.
        ...['2026-10-02', '2026-10-06', '2026-10-10'],
      ].map((d) => log('meetingPrep', d)),
    });

    const sept = occurrences(store, 'meetingPrep', '2026-09-01', '2026-09-30');
    expect(sept).toEqual(
      ['01', '06', '08', '13', '15', '20', '22', '27', '29'].map((dd) => ({
        key: `2026-09-${dd}`,
        status: 'done',
      }))
    );

    // Judged after the change (today Saturday 10th), September is unchanged.
    const all = occurrences(store, 'meetingPrep', '2026-09-01', '2026-10-10');
    expect(all.slice(0, 9)).toEqual(sept);
    expect(all.slice(9)).toEqual([
      { key: '2026-10-03', status: 'done' },
      { key: '2026-10-07', status: 'done' },
      { key: '2026-10-10', status: 'done' },
    ]);
    expect(streak(store, 'meetingPrep', '2026-10-10')).toEqual({
      current: 12,
      recentDone: 8,
      recentTotal: 8,
      recentUnit: 'meetings',
    });
  });

  it('a routine switched off for a week has no occurrences that week and its streak continues', () => {
    let store = makeStore({ schedule: [entry('2026-09-01')] });
    store = withScheduleChange(store, '2026-09-14', { enabled: { dailyText: false } });
    store = withScheduleChange(store, '2026-09-21', { enabled: { dailyText: true } });
    store.log = range('2026-09-01', '2026-09-30')
      .filter((d) => d < '2026-09-14' || d > '2026-09-20')
      .map((d) => log('dailyText', d));

    const occs = occurrences(store, 'dailyText', '2026-09-01', '2026-09-30');
    expect(occs).toHaveLength(23);
    expect(occs.some((o) => o.key >= '2026-09-14' && o.key <= '2026-09-20')).toBe(false);
    expect(occs.every((o) => o.status === 'done')).toBe(true);
    expect(streak(store, 'dailyText', '2026-09-30').current).toBe(23);
  });
});

describe('meeting occurrences', () => {
  it("includes tomorrow's meeting as 'open' (its window opens today)", () => {
    const store = makeStore({
      schedule: [entry('2026-10-01')],
      log: [log('meetingPrep', '2026-10-03')], // for Sunday 4th
    });
    // Today is Monday 5th: Tuesday 6th is tomorrow.
    expect(occurrences(store, 'meetingPrep', '2026-10-01', '2026-10-05')).toEqual([
      { key: '2026-10-04', status: 'done' },
      { key: '2026-10-06', status: 'open' },
    ]);
    // On Tuesday 6th itself, the unprepared meeting is still 'open'.
    expect(occurrences(store, 'meetingPrep', '2026-10-01', '2026-10-06')).toEqual([
      { key: '2026-10-04', status: 'done' },
      { key: '2026-10-06', status: 'open' },
    ]);
    // On Wednesday 7th, an unprepared Tuesday becomes grace (1 per month for meetings).
    expect(occurrences(store, 'meetingPrep', '2026-10-01', '2026-10-07')).toEqual([
      { key: '2026-10-04', status: 'done' },
      { key: '2026-10-06', status: 'grace' },
    ]);
  });
});

describe('weekly target occurrences', () => {
  // Target 3 per week; history starts Monday 2026-09-07.
  const store = makeStore({
    schedule: [entry('2026-09-07')],
    log: [
      ...['2026-09-07', '2026-09-09', '2026-09-11'], // 3: done
      ...['2026-09-14', '2026-09-15'], // 2: grace
      ...['2026-09-21', '2026-09-22', '2026-09-27'], // 3: done
      ...['2026-09-28'], // 1: grace (second in September)
      ...['2026-10-05'], // current week, 1 so far
    ].map((d) => log('personalStudy', d)),
  });

  it('has one occurrence per Monday-Sunday week, keyed by Monday, open while the week runs', () => {
    expect(occurrences(store, 'personalStudy', '2026-09-07', '2026-10-08')).toEqual([
      { key: '2026-09-07', status: 'done' },
      { key: '2026-09-14', status: 'grace' },
      { key: '2026-09-21', status: 'done' },
      { key: '2026-09-28', status: 'grace' },
      { key: '2026-10-05', status: 'open' },
    ]);
    expect(streak(store, 'personalStudy', '2026-10-08')).toEqual({
      current: 4,
      recentDone: 2,
      recentTotal: 4,
      recentUnit: 'weeks',
    });
  });

  it('bibleReading counts in weeks when bibleDaysPerWeek < 7', () => {
    const s = makeStore({
      schedule: [entry('2026-09-07', { bibleDaysPerWeek: 2 })],
      log: ['2026-09-07', '2026-09-08'].map((d) => log('bibleReading', d, { chapters: [] })),
    });
    expect(occurrences(s, 'bibleReading', '2026-09-07', '2026-09-15')).toEqual([
      { key: '2026-09-07', status: 'done' },
      { key: '2026-09-14', status: 'open' },
    ]);
    expect(streak(s, 'bibleReading', '2026-09-15').recentUnit).toBe('weeks');
  });
});

describe('weekly (family worship) occurrences', () => {
  it('counts a check-in from the family day through Sunday, 1 grace per month', () => {
    const store = makeStore({
      schedule: [entry('2026-09-07')], // family worship on Friday
      log: [
        log('familyWorship', '2026-09-11'), // Fri: done
        // week of 14th: nothing -> grace
        log('familyWorship', '2026-09-24'), // Thu, before the family day -> missed
        log('familyWorship', '2026-10-04'), // Sun of the week of 28th -> done
      ],
    });
    // Today Thursday 8th: this week's family day (Fri 9th) hasn't come yet.
    expect(occurrences(store, 'familyWorship', '2026-09-07', '2026-10-08')).toEqual([
      { key: '2026-09-07', status: 'done' },
      { key: '2026-09-14', status: 'grace' },
      { key: '2026-09-21', status: 'missed' },
      { key: '2026-09-28', status: 'done' },
    ]);
    expect(streak(store, 'familyWorship', '2026-10-08')).toEqual({
      current: 1,
      recentDone: 2,
      recentTotal: 4,
      recentUnit: 'weeks',
    });
  });
});

describe('Review Focus 3: entries dated after today', () => {
  const store = makeStore({
    schedule: [entry('2026-10-04')],
    log: [
      ...['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07'].map((d) => log('dailyText', d)),
      log('bibleReading', '2026-10-07', { chapters: [chapterIndex(31, 1)] }), // Obadiah, tomorrow
    ],
  });

  it('are ignored by streak', () => {
    expect(streak(store, 'dailyText', '2026-10-06')).toEqual({
      current: 3,
      recentDone: 3,
      recentTotal: 3,
      recentUnit: 'days',
    });
    expect(streak(store, 'bibleReading', '2026-10-06').recentDone).toBe(0);
  });

  it('are ignored by totals', () => {
    const t = totals(store, '2026-10-06');
    expect(t.perRoutineDaysThisYear.dailyText).toBe(3);
    expect(t.readingDaysThisYear).toBe(0);
    expect(t.chaptersThisYear).toBe(0);
    expect(t.booksCompleted).toBe(0);
  });
});

describe('totals', () => {
  const reading = (countEarlierAsRead) => ({
    plan: 'own',
    start: { book: 3, chapter: 1 }, // Leviticus: Genesis and Exodus are the baseline
    countEarlierAsRead,
  });
  const lev = (c) => chapterIndex(3, c);
  const entries = [
    log('bibleReading', '2025-12-31', { chapters: [lev(1)] }), // last year
    log('bibleReading', '2026-01-02', { chapters: [lev(1), lev(2)] }),
    log('bibleReading', '2026-03-04', { chapters: [chapterIndex(31, 1)] }), // Obadiah, whole book
    log('bibleReading', '2026-03-05', true), // no chapter detail
    log('ministry', '2026-02-10', { shared: true, studies: 1 }),
    log('ministry', '2026-03-10', { shared: false, studies: 1 }),
    log('dailyText', '2026-01-02'),
    log('dailyText', '2026-01-02'), // duplicate day counts once
  ];

  it('booksCompleted includes the baseline books; readingDaysThisYear does not', () => {
    const store = makeStore({
      schedule: [entry('2025-12-01')],
      log: entries,
      reading: reading(true),
    });
    expect(totals(store, '2026-10-06')).toEqual({
      readingDaysThisYear: 3,
      chaptersThisYear: 3, // Leviticus 1, Leviticus 2, Obadiah 1
      booksCompleted: 3, // Genesis, Exodus (baseline) + Obadiah
      perRoutineDaysThisYear: {
        dailyText: 1,
        bibleReading: 3,
        meetingPrep: 0,
        familyWorship: 0,
        personalStudy: 0,
        ministry: 1,
      },
    });
  });

  it('without the baseline, only fully read books count, and days are unchanged', () => {
    const store = makeStore({
      schedule: [entry('2025-12-01')],
      log: entries,
      reading: reading(false),
    });
    const t = totals(store, '2026-10-06');
    expect(t.booksCompleted).toBe(1);
    expect(t.readingDaysThisYear).toBe(3);
  });
});
