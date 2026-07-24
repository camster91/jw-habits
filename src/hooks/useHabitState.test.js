import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHabitState, HABIT_STATE_KEYS, todayKey } from './useHabitState';

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
