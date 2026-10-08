import { describe, it, expect } from 'vitest';
import { ROUTINE_IDS, DEFAULT_LABELS, CADENCE, cadenceOn, isDone, dueToday } from './routines.js';

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

const makeStore = ({ schedule = [entry('2026-09-01')], log = [], pioneer = false } = {}) => ({
  schedule,
  log,
  pioneer,
  reading: { plan: 'own', start: { book: 1, chapter: 1 }, countEarlierAsRead: false },
});

const log = (routine, day, value = true) => ({ routine, day, value });

// Calendar used below (October 2026): Mon 5, Tue 6, Wed 7, Thu 8, Fri 9, Sat 10, Sun 11.

describe('routine constants', () => {
  it('lists the six fixed ids in order', () => {
    expect(ROUTINE_IDS).toEqual([
      'dailyText',
      'bibleReading',
      'meetingPrep',
      'familyWorship',
      'personalStudy',
      'ministry',
    ]);
  });

  it('has the default English labels', () => {
    expect(DEFAULT_LABELS).toEqual({
      dailyText: 'Daily text',
      bibleReading: 'Bible reading',
      meetingPrep: 'Meeting preparation',
      familyWorship: 'Family worship',
      personalStudy: 'Personal study',
      ministry: 'Ministry',
    });
  });

  it('has a cadence per routine, and bibleReading resolves through the schedule', () => {
    expect(CADENCE.dailyText).toBe('daily');
    expect(CADENCE.meetingPrep).toBe('meeting');
    expect(CADENCE.familyWorship).toBe('weekly');
    expect(CADENCE.personalStudy).toBe('weeklyTarget');
    expect(CADENCE.ministry).toBe('monthly');
    const store = makeStore({
      schedule: [entry('2026-09-01'), entry('2026-10-01', { bibleDaysPerWeek: 5 })],
    });
    expect(cadenceOn(store, 'bibleReading', '2026-09-15')).toBe('daily');
    expect(cadenceOn(store, 'bibleReading', '2026-10-15')).toBe('weeklyTarget');
    expect(cadenceOn(store, 'personalStudy', '2026-10-15')).toBe('weeklyTarget');
  });
});

describe('isDone', () => {
  it('is true only when a done check-in exists on that exact day', () => {
    const store = makeStore({
      log: [
        log('dailyText', '2026-10-06'),
        log('ministry', '2026-10-06', { shared: false, studies: 1 }),
        log('ministry', '2026-10-07', { shared: true, studies: 0 }),
        log('bibleReading', '2026-10-06', { chapters: [0, 1] }),
      ],
    });
    expect(isDone(store, 'dailyText', '2026-10-06')).toBe(true);
    expect(isDone(store, 'dailyText', '2026-10-05')).toBe(false);
    expect(isDone(store, 'ministry', '2026-10-06')).toBe(false);
    expect(isDone(store, 'ministry', '2026-10-07')).toBe(true);
    expect(isDone(store, 'bibleReading', '2026-10-06')).toBe(true);
  });
});

describe('dueToday: meetings', () => {
  it('is due on a meeting day and the day before, not on other days', () => {
    const store = makeStore();
    expect(dueToday(store, '2026-10-06')).toContain('meetingPrep'); // Tuesday meeting
    expect(dueToday(store, '2026-10-05')).toContain('meetingPrep'); // Monday, day before
    expect(dueToday(store, '2026-10-07')).not.toContain('meetingPrep'); // Wednesday
    expect(dueToday(store, '2026-10-10')).toContain('meetingPrep'); // Saturday, before Sunday
    expect(dueToday(store, '2026-10-11')).toContain('meetingPrep'); // Sunday meeting
  });

  it('is not due on the meeting day once the day before has a check-in', () => {
    const store = makeStore({ log: [log('meetingPrep', '2026-10-05')] });
    expect(dueToday(store, '2026-10-06')).not.toContain('meetingPrep');
  });

  it("stays listed on the day it is checked in, so today's check-in can be undone", () => {
    const store = makeStore({ log: [log('meetingPrep', '2026-10-06')] });
    expect(dueToday(store, '2026-10-06')).toContain('meetingPrep');
  });

  it('follows the meeting days of the schedule in force on the meeting date', () => {
    const store = makeStore({
      schedule: [entry('2026-09-01'), entry('2026-10-07', { meetingDays: [3, 6] })],
    });
    // Tuesday 6th: tomorrow (Wednesday) is a meeting under the new schedule.
    expect(dueToday(store, '2026-10-06')).toContain('meetingPrep');
    // Monday 12th: Tuesday is no longer a meeting.
    expect(dueToday(store, '2026-10-12')).not.toContain('meetingPrep');
  });
});

describe('dueToday: weekly target', () => {
  it('with a target of 3 and 2 check-ins this week, personalStudy is due; with 3 it is not', () => {
    const two = makeStore({
      log: [log('personalStudy', '2026-10-05'), log('personalStudy', '2026-10-06')],
    });
    expect(dueToday(two, '2026-10-08')).toContain('personalStudy');
    const three = makeStore({
      log: [
        log('personalStudy', '2026-10-05'),
        log('personalStudy', '2026-10-06'),
        log('personalStudy', '2026-10-07'),
      ],
    });
    expect(dueToday(three, '2026-10-08')).not.toContain('personalStudy');
  });

  it('counts only this week (last week does not carry over)', () => {
    const store = makeStore({
      log: [
        log('personalStudy', '2026-09-30'),
        log('personalStudy', '2026-10-01'),
        log('personalStudy', '2026-10-02'),
      ],
    });
    expect(dueToday(store, '2026-10-05')).toContain('personalStudy');
  });

  it('stays listed when the target is met by a check-in made today', () => {
    const store = makeStore({
      log: [
        log('personalStudy', '2026-10-05'),
        log('personalStudy', '2026-10-06'),
        log('personalStudy', '2026-10-08'),
      ],
    });
    expect(dueToday(store, '2026-10-08')).toContain('personalStudy');
    expect(isDone(store, 'personalStudy', '2026-10-08')).toBe(true);
  });

  it('bibleReading uses the weekly target when bibleDaysPerWeek < 7', () => {
    const store = makeStore({
      schedule: [entry('2026-09-01', { bibleDaysPerWeek: 2 })],
      log: [log('bibleReading', '2026-10-05', true), log('bibleReading', '2026-10-06', true)],
    });
    expect(dueToday(store, '2026-10-07')).not.toContain('bibleReading');
    expect(dueToday(makeStore(), '2026-10-07')).toContain('bibleReading');
  });
});

describe('dueToday: family worship', () => {
  it('is due from the family worship day through Sunday until done', () => {
    const store = makeStore(); // family worship on Friday
    expect(dueToday(store, '2026-10-08')).not.toContain('familyWorship'); // Thursday
    expect(dueToday(store, '2026-10-09')).toContain('familyWorship'); // Friday
    expect(dueToday(store, '2026-10-11')).toContain('familyWorship'); // Sunday
    expect(dueToday(store, '2026-10-12')).not.toContain('familyWorship'); // next Monday
  });

  it('is not due after a check-in on or after the family day; an earlier one does not count', () => {
    const done = makeStore({ log: [log('familyWorship', '2026-10-09')] });
    expect(dueToday(done, '2026-10-10')).not.toContain('familyWorship');
    const early = makeStore({ log: [log('familyWorship', '2026-10-08')] });
    expect(dueToday(early, '2026-10-10')).toContain('familyWorship');
  });
});

describe('dueToday: ministry (decision 4)', () => {
  it('is due all month until done for the month', () => {
    expect(dueToday(makeStore(), '2026-10-20')).toContain('ministry');
    const done = makeStore({ log: [log('ministry', '2026-10-03', { shared: true, studies: 0 })] });
    expect(dueToday(done, '2026-10-20')).not.toContain('ministry');
    expect(dueToday(done, '2026-11-01')).toContain('ministry');
    const notShared = makeStore({
      log: [log('ministry', '2026-10-03', { shared: false, studies: 2 })],
    });
    expect(dueToday(notShared, '2026-10-20')).toContain('ministry');
  });

  it('in pioneer mode it is due all month regardless', () => {
    const store = makeStore({
      pioneer: true,
      log: [log('ministry', '2026-10-03', { shared: true, studies: 0, hours: 5 })],
    });
    expect(dueToday(store, '2026-10-20')).toContain('ministry');
  });
});

describe('dueToday: general', () => {
  it('lists due routines in ROUTINE_IDS order', () => {
    // Tuesday 6th: meeting day; family worship not yet (Friday).
    expect(dueToday(makeStore(), '2026-10-06')).toEqual([
      'dailyText',
      'bibleReading',
      'meetingPrep',
      'personalStudy',
      'ministry',
    ]);
  });

  it('omits routines switched off in the schedule in force today', () => {
    const store = makeStore({
      schedule: [
        entry('2026-09-01'),
        entry('2026-10-01', { enabled: { dailyText: false, ministry: false } }),
      ],
    });
    const due = dueToday(store, '2026-10-06');
    expect(due).not.toContain('dailyText');
    expect(due).not.toContain('ministry');
    expect(dueToday(store, '2026-09-29')).toContain('dailyText');
  });

  it('ignores log entries dated after today', () => {
    const store = makeStore({
      schedule: [entry('2026-09-01', { studyPerWeek: 1 })],
      log: [log('personalStudy', '2026-10-09'), log('ministry', '2026-10-09', { shared: true })],
    });
    expect(dueToday(store, '2026-10-06')).toContain('personalStudy');
    expect(dueToday(store, '2026-10-06')).toContain('ministry');
  });
});
