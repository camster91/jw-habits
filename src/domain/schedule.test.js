import { describe, it, expect } from 'vitest';
import { scheduleOn, withScheduleChange } from './schedule.js';

const entry = (from, extra = {}) => ({
  from,
  enabled: {
    dailyText: true,
    bibleReading: true,
    meetingPrep: true,
    familyWorship: true,
    personalStudy: true,
    ministry: true,
  },
  meetingDays: [2, 6],
  familyWorshipDay: 3,
  bibleDaysPerWeek: 5,
  studyPerWeek: 2,
  ...extra,
});

const store = () => ({ schedule: [entry('2026-01-01'), entry('2026-06-01', { studyPerWeek: 4 })] });

describe('scheduleOn', () => {
  it('chooses the latest entry with from <= day', () => {
    const s = store();
    expect(scheduleOn(s, '2026-01-01').from).toBe('2026-01-01');
    expect(scheduleOn(s, '2026-05-31').from).toBe('2026-01-01');
    expect(scheduleOn(s, '2026-06-01').from).toBe('2026-06-01');
    expect(scheduleOn(s, '2030-01-01').studyPerWeek).toBe(4);
  });

  it('falls back to the earliest entry for days before every from', () => {
    expect(scheduleOn(store(), '2020-01-01').from).toBe('2026-01-01');
  });
});

describe('withScheduleChange', () => {
  it('appends a merged entry from the given day, without mutating input', () => {
    const s = store();
    const snapshot = JSON.parse(JSON.stringify(s));
    const next = withScheduleChange(s, '2026-09-01', { bibleDaysPerWeek: 7 });
    expect(s).toEqual(snapshot);
    expect(next).not.toBe(s);
    expect(next.schedule).toHaveLength(3);
    const added = next.schedule[2];
    expect(added.from).toBe('2026-09-01');
    expect(added.bibleDaysPerWeek).toBe(7);
    expect(added.studyPerWeek).toBe(4); // inherited from the entry in force
  });

  it('replaces the entry for the same day rather than appending', () => {
    const next = withScheduleChange(store(), '2026-06-01', { studyPerWeek: 6 });
    expect(next.schedule).toHaveLength(2);
    expect(next.schedule[1]).toMatchObject({ from: '2026-06-01', studyPerWeek: 6 });
  });

  it('keeps schedule sorted when inserting before existing entries', () => {
    const next = withScheduleChange(store(), '2026-03-01', { familyWorshipDay: 5 });
    expect(next.schedule.map((e) => e.from)).toEqual(['2026-01-01', '2026-03-01', '2026-06-01']);
    expect(next.schedule[1].studyPerWeek).toBe(2);
  });

  it('merges enabled patches without losing other routines', () => {
    const next = withScheduleChange(store(), '2026-07-01', { enabled: { ministry: false } });
    const e = scheduleOn(next, '2026-07-01');
    expect(e.enabled.ministry).toBe(false);
    expect(e.enabled.dailyText).toBe(true);
  });
});
