import { describe, it, expect } from 'vitest';
import {
  chaptersLabel,
  chaptersReadOn,
  encouragementSeed,
  freshStart,
  meetingDayFor,
  ministryEntry,
  setChaptersRead,
  setMinistry,
  studyProgress,
  todaysChapters,
} from './today.js';
import { defaultStore } from './store.js';
import { chapterIndex } from './bible.js';
import { withScheduleChange } from './schedule.js';

const TUE = '2026-10-06';
const READING = {
  plan: 'ownPace',
  start: { book: 19, chapter: 3 },
  startedOn: '2026-09-01',
  countEarlierAsRead: false,
};
const base = (over = {}) => ({
  ...defaultStore('2026-09-01', 'en'),
  onboardingDone: true,
  reading: READING,
  ...over,
});
const ps = (c) => chapterIndex(19, c);
const entry = (s, routine, day) => s.log.find((e) => e.routine === routine && e.day === day);

describe('chaptersLabel', () => {
  it('names a single chapter', () => {
    expect(chaptersLabel([{ book: 19, chapter: 3 }])).toBe('Psalms 3');
  });
  it('names a range within one book with an en dash', () => {
    expect(
      chaptersLabel([
        { book: 19, chapter: 3 },
        { book: 19, chapter: 4 },
        { book: 19, chapter: 5 },
      ])
    ).toBe('Psalms 3–5');
  });
  it('names a range across books', () => {
    expect(
      chaptersLabel([
        { book: 19, chapter: 150 },
        { book: 20, chapter: 1 },
        { book: 20, chapter: 2 },
      ])
    ).toBe('Psalms 150 – Proverbs 2');
  });
  it('is empty for no chapters', () => {
    expect(chaptersLabel([])).toBe('');
  });
});

describe("today's chapters", () => {
  it('are the next unread portion before reading', () => {
    expect(todaysChapters(base(), TUE)).toEqual([{ book: 19, chapter: 3 }]);
    expect(chaptersReadOn(base(), TUE)).toBe(0);
  });

  it('are the chapters logged today once read, not the next ones', () => {
    const s = setChaptersRead(base(), TUE, 3);
    expect(todaysChapters(s, TUE).map((c) => c.chapter)).toEqual([3, 4, 5]);
    expect(chaptersReadOn(s, TUE)).toBe(3);
  });

  it('a bare true entry counts as one portion', () => {
    const s = base({ log: [{ routine: 'bibleReading', day: TUE, value: true }] });
    expect(chaptersReadOn(s, TUE)).toBe(1);
  });
});

describe('setChaptersRead', () => {
  it('writes N chapters from the next unread one, replacing today', () => {
    const s0 = base({
      log: [{ routine: 'bibleReading', day: '2026-10-05', value: { chapters: [ps(3)] } }],
    });
    const s1 = setChaptersRead(s0, TUE, 2);
    expect(entry(s1, 'bibleReading', TUE).value).toEqual({ chapters: [ps(4), ps(5)] });
    const s2 = setChaptersRead(s1, TUE, 1);
    expect(entry(s2, 'bibleReading', TUE).value).toEqual({ chapters: [ps(4)] });
  });

  it('removes today at zero', () => {
    const s = setChaptersRead(setChaptersRead(base(), TUE, 1), TUE, 0);
    expect(entry(s, 'bibleReading', TUE)).toBeUndefined();
  });

  it('fills in a skipped yesterday when two portions are read', () => {
    const s = setChaptersRead(base(), TUE, 2);
    expect(entry(s, 'bibleReading', '2026-10-05')).toEqual({
      routine: 'bibleReading',
      day: '2026-10-05',
      value: true,
    });
    expect(entry(s, 'bibleReading', TUE).value).toEqual({ chapters: [ps(3), ps(4)] });
  });

  it('does not catch up for less than two portions', () => {
    expect(entry(setChaptersRead(base(), TUE, 1), 'bibleReading', '2026-10-05')).toBeUndefined();
  });

  it('leaves an existing yesterday entry alone', () => {
    const y = { routine: 'bibleReading', day: '2026-10-05', value: { chapters: [ps(1)] } };
    const s = setChaptersRead(base({ log: [y] }), TUE, 4);
    expect(entry(s, 'bibleReading', '2026-10-05')).toEqual(y);
  });

  it('does not catch up before history starts', () => {
    const s = setChaptersRead({ ...defaultStore(TUE, 'en'), reading: READING }, TUE, 2);
    expect(entry(s, 'bibleReading', '2026-10-05')).toBeUndefined();
  });

  it('catches up only when yesterday was due', () => {
    // One reading day a week.
    const weekly = withScheduleChange(base(), '2026-09-01', { bibleDaysPerWeek: 1 });
    // Nothing yet this week, so Monday was due.
    expect(entry(setChaptersRead(weekly, TUE, 2), 'bibleReading', '2026-10-05')).toBeDefined();
    // Friday met the week's target, so Saturday was not due.
    const met = { ...weekly, log: [{ routine: 'bibleReading', day: '2026-10-09', value: true }] };
    expect(
      entry(setChaptersRead(met, '2026-10-11', 2), 'bibleReading', '2026-10-10')
    ).toBeUndefined();
  });
});

describe('ministry', () => {
  it("writes the month's entry on today when there is none", () => {
    const s = setMinistry(base(), TUE, { shared: true, studies: 1 });
    expect(ministryEntry(s, TUE)).toEqual({
      routine: 'ministry',
      day: TUE,
      value: { shared: true, studies: 1 },
    });
  });

  it("rewrites this month's entry on its own day", () => {
    const s0 = base({
      log: [{ routine: 'ministry', day: '2026-10-02', value: { shared: false, studies: 2 } }],
    });
    const s1 = setMinistry(s0, TUE, { shared: true, studies: 2 });
    expect(s1.log.filter((e) => e.routine === 'ministry')).toEqual([
      { routine: 'ministry', day: '2026-10-02', value: { shared: true, studies: 2 } },
    ]);
  });

  it("ignores last month's entry", () => {
    const s = base({
      log: [{ routine: 'ministry', day: '2026-09-30', value: { shared: true, studies: 0 } }],
    });
    expect(ministryEntry(s, TUE)).toBeNull();
  });
});

describe('meetingDayFor', () => {
  const meetings = withScheduleChange(base(), '2026-09-01', { meetingDays: [2, 0] });
  it("is today's meeting on the meeting day when not prepared yesterday", () => {
    expect(meetingDayFor(meetings, TUE)).toBe(TUE);
  });
  it("is tomorrow's meeting the day before", () => {
    expect(meetingDayFor(meetings, '2026-10-05')).toBe(TUE);
    expect(meetingDayFor(meetings, '2026-10-10')).toBe('2026-10-11');
  });
  it("is tomorrow's when today's was prepared yesterday", () => {
    const s = withScheduleChange(base(), '2026-09-01', { meetingDays: [2, 3] });
    const prepped = { ...s, log: [{ routine: 'meetingPrep', day: '2026-10-05', value: true }] };
    expect(meetingDayFor(prepped, TUE)).toBe('2026-10-07');
  });
});

describe('studyProgress', () => {
  it('counts this week against the target', () => {
    const s = base({
      log: [
        { routine: 'personalStudy', day: '2026-10-04', value: true },
        { routine: 'personalStudy', day: '2026-10-05', value: true },
        { routine: 'personalStudy', day: TUE, value: true },
      ],
    });
    expect(studyProgress(s, TUE)).toEqual({ count: 2, target: 3 });
  });
});

describe('encouragementSeed', () => {
  it('is day-of-year × 7 + the routine index', () => {
    expect(encouragementSeed('2026-01-01', 'dailyText')).toBe(7);
    expect(encouragementSeed('2026-01-02', 'bibleReading')).toBe(15);
    expect(encouragementSeed('2026-12-31', 'ministry')).toBe(365 * 7 + 5);
  });
});

describe('freshStart', () => {
  it('marks Mondays and firsts of the month', () => {
    expect(freshStart('2026-10-05')).toBe('newWeek');
    expect(freshStart('2026-10-01')).toBe('newMonth');
    expect(freshStart('2026-06-01')).toBe('newMonth'); // also a Monday: the month wins
    expect(freshStart(TUE)).toBeNull();
  });
});
