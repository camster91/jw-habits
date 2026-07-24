import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHabitState, loadInitialState, HABIT_STATE_KEYS } from './useHabitState.js';

describe('useHabitState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('replaceState fully replaces state (not a partial merge)', () => {
    const { result } = renderHook(() => useHabitState());
    act(() => {
      result.current[1]({ done: { text: { done: true, note: '' } } });
    });
    expect(result.current[0].done.text).toBeTruthy();

    const replacement = { date: result.current[0].date, done: {}, history: [] };
    act(() => {
      result.current[3](replacement);
    });
    expect(result.current[0].done).toEqual({});
    expect(JSON.parse(localStorage.getItem(HABIT_STATE_KEYS.state)).done).toEqual({});
  });

  it('loadInitialState survives SecurityError on getItem', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Denied', 'SecurityError');
    });
    expect(loadInitialState().date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    spy.mockRestore();
  });
});
