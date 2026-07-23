import { describe, it, expect } from 'vitest';
import { currentStreak, bestStreakFromHistory, todayProgress } from './streak';

describe('currentStreak', () => {
  it('returns 0 for empty history', () => {
    expect(currentStreak([], '2026-06-30')).toBe(0);
  });

  it('returns 1 when only today is in history', () => {
    expect(currentStreak(['2026-06-30'], '2026-06-30')).toBe(1);
  });

  it('returns 1 when only yesterday is in history (grace period)', () => {
    expect(currentStreak(['2026-06-29'], '2026-06-30')).toBe(1);
  });

  it('returns 0 when last check was 2+ days ago (broken)', () => {
    expect(currentStreak(['2026-06-28'], '2026-06-30')).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    expect(
      currentStreak(
        ['2026-06-26', '2026-06-27', '2026-06-28', '2026-06-29', '2026-06-30'],
        '2026-06-30'
      )
    ).toBe(5);
  });

  it('counts consecutive days ending yesterday (grace)', () => {
    expect(
      currentStreak(
        ['2026-06-25', '2026-06-26', '2026-06-27', '2026-06-28', '2026-06-29'],
        '2026-06-30'
      )
    ).toBe(5);
  });

  it('breaks streak on gap', () => {
    // 30, 29, 28 (consec), then 26 (gap on 27) — only counts the 3
    expect(
      currentStreak(['2026-06-26', '2026-06-28', '2026-06-29', '2026-06-30'], '2026-06-30')
    ).toBe(3);
  });

  it('de-dupes duplicate dates', () => {
    expect(currentStreak(['2026-06-30', '2026-06-30', '2026-06-29'], '2026-06-30')).toBe(2);
  });

  it('ignores malformed entries', () => {
    expect(
      currentStreak(['not-a-date', '2026-06-30', null, undefined, '2026-06-29'], '2026-06-30')
    ).toBe(2);
  });

  it('handles cross-month correctly', () => {
    expect(currentStreak(['2026-06-29', '2026-06-30', '2026-07-01'], '2026-07-01')).toBe(3);
  });

  it('handles cross-year correctly', () => {
    expect(currentStreak(['2025-12-31', '2026-01-01', '2026-01-02'], '2026-01-02')).toBe(3);
  });

  it('returns 0 for null/undefined inputs', () => {
    expect(currentStreak(null, '2026-06-30')).toBe(0);
    expect(currentStreak(undefined, '2026-06-30')).toBe(0);
    expect(currentStreak(['2026-06-30'], null)).toBe(0);
  });
});

describe('bestStreakFromHistory', () => {
  it('returns 0 for empty history', () => {
    expect(bestStreakFromHistory([])).toBe(0);
  });

  it('returns 1 for a single entry', () => {
    expect(bestStreakFromHistory(['2026-06-30'])).toBe(1);
  });

  it('returns the longest consecutive run', () => {
    expect(
      bestStreakFromHistory([
        '2026-06-26',
        '2026-06-27',
        '2026-06-28',
        '2026-06-29',
        '2026-06-30',
        '2026-07-05',
        '2026-07-06',
        '2026-07-07',
      ])
    ).toBe(5);
  });

  it('returns 1 when no consecutive days', () => {
    expect(bestStreakFromHistory(['2026-06-30', '2026-06-28', '2026-06-25'])).toBe(1);
  });

  it('de-dupes and counts correctly', () => {
    expect(bestStreakFromHistory(['2026-06-30', '2026-06-30', '2026-06-29', '2026-06-28'])).toBe(3);
  });

  it('handles cross-month + cross-year runs', () => {
    expect(
      bestStreakFromHistory(['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02', '2026-01-03'])
    ).toBe(5);
  });

  it('ignores malformed entries', () => {
    expect(bestStreakFromHistory(['junk', '2026-06-30', '2026-06-29', null])).toBe(2);
  });
});

describe('todayProgress', () => {
  it('returns 0/0 for empty done map', () => {
    expect(todayProgress({}, ['today', 'text', 'bible'])).toEqual({ done: 0, total: 3 });
  });

  it('counts done keys', () => {
    expect(
      todayProgress({ today: true, text: true, bible: false, meeting: true }, [
        'today',
        'text',
        'bible',
        'meeting',
      ])
    ).toEqual({ done: 3, total: 4 });
  });

  it('ignores keys not in the visible keys array (e.g. memorial when hidden)', () => {
    expect(
      todayProgress({ today: true, text: true, memorial: true }, ['today', 'text', 'bible'])
    ).toEqual({ done: 2, total: 3 });
  });

  it('returns 0/0 when keys is empty', () => {
    expect(todayProgress({ today: true }, [])).toEqual({ done: 0, total: 0 });
  });

  // Regression: previously counted truthy non-true values (1, 'yes') as done.
  // The new done shape is { key: { done: boolean, note: string } } so any
  // truthy non-object value (or an object with done:false) must NOT count.
  // See doneState.js getDone() for the normalization rules.
  it('does NOT count legacy truthy non-true values (1, "yes") as done', () => {
    expect(
      todayProgress({ today: 1, text: 'yes', bible: false }, ['today', 'text', 'bible'])
    ).toEqual({ done: 0, total: 3 });
  });

  it('does NOT count a row that only has a typed note (done: false, note: "abc") as done', () => {
    // P0 regression: a row with a note but unchecked checkbox must NOT
    // inflate the streak counter. This was the bug caught in the
    // 2026-07-22 review.
    const done = {
      today: { done: false, note: 'reminded myself' },
      text: { done: true, note: '' },
      bible: { done: false, note: 'in progress' },
      meeting: { done: false, note: '' },
    };
    expect(todayProgress(done, ['today', 'text', 'bible', 'meeting'])).toEqual({
      done: 1,
      total: 4,
    });
  });

  it('counts rows with done:true in the new shape', () => {
    const done = {
      today: { done: true, note: '' },
      text: { done: true, note: 'extra context' },
      bible: { done: false, note: '' },
    };
    expect(todayProgress(done, ['today', 'text', 'bible'])).toEqual({ done: 2, total: 3 });
  });

  it("still handles the legacy boolean shape for users who haven't upgraded yet", () => {
    // Backward compat: an old `true`/`false` boolean value in done[k]
    // is normalized via doneState.isDone() to `{ done: true|false }`.
    expect(
      todayProgress({ today: true, text: false, bible: true }, ['today', 'text', 'bible'])
    ).toEqual({ done: 2, total: 3 });
  });
});
