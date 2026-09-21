import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHabitState, HABIT_STATE_KEYS, todayKey, pruneHistory } from './useHabitState';

describe('useHabitState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('replaceState fully replaces state without throwing', () => {
    const { result } = renderHook(() => useHabitState());

    act(() => {
      result.current[1]({ done: { text: { done: true, note: '' } } });
    });
    expect(result.current[0].done.text.done).toBe(true);

    const next = { date: todayKey(), done: {}, history: [todayKey()] };
    act(() => {
      // Critical regression: previous code called undefined setStateFull
      result.current[3](next);
    });

    expect(result.current[0]).toEqual(next);
    const stored = JSON.parse(localStorage.getItem(HABIT_STATE_KEYS.state));
    expect(stored).toEqual(next);
  });
});

describe('history retention (issue #186)', () => {
  it('retains more than a week so streaks can exceed 7', () => {
    // Build 30 consecutive days of history and prune it. A 7-day window
    // would drop everything but the last week, capping every streak at 7.
    const today = '2026-09-21';
    const history = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(today + 'T00:00:00');
      d.setDate(d.getDate() - i);
      history.push(d.toISOString().slice(0, 10));
    }
    const pruned = pruneHistory(history, today);
    expect(pruned.length).toBeGreaterThan(7);
    expect(pruned.length).toBe(30);
  });

  it('still drops entries older than the retention window', () => {
    const today = '2026-09-21';
    const pruned = pruneHistory(['2019-01-01', today], today);
    expect(pruned).toEqual([today]);
  });
});
