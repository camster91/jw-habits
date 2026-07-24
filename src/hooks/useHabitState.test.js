import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useHabitState,
  HABIT_STATE_KEYS,
  loadInitialState,
  pruneHistory,
} from '../hooks/useHabitState';

describe('useHabitState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('replaceState fully replaces state and persists (no setStateFull crash)', () => {
    const { result } = renderHook(() => useHabitState());

    act(() => {
      result.current[1]({ done: { text: { done: true, note: '' } } });
    });
    expect(result.current[0].done.text.done).toBe(true);

    const next = { date: result.current[0].date, done: {}, history: [] };
    act(() => {
      result.current[3](next); // replaceState
    });

    expect(result.current[0].done).toEqual({});
    const stored = JSON.parse(localStorage.getItem(HABIT_STATE_KEYS.state));
    expect(stored.done).toEqual({});
  });

  it('updateState can skip persist for debounced note writes', () => {
    const { result } = renderHook(() => useHabitState());

    act(() => {
      result.current[1](
        (prev) => ({
          ...prev,
          done: { ...prev.done, text: { done: false, note: 'draft' } },
        }),
        { persist: false }
      );
    });

    expect(result.current[0].done.text.note).toBe('draft');
    // Not flushed yet
    const storedBefore = localStorage.getItem(HABIT_STATE_KEYS.state);
    const parsedBefore = storedBefore ? JSON.parse(storedBefore) : { done: {} };
    expect(parsedBefore.done?.text?.note).not.toBe('draft');

    act(() => {
      result.current[4](); // persistCurrent
    });
    const storedAfter = JSON.parse(localStorage.getItem(HABIT_STATE_KEYS.state));
    expect(storedAfter.done.text.note).toBe('draft');
  });

  it('loadInitialState + pruneHistory stay pure helpers', () => {
    expect(pruneHistory(['2099-01-01', '2000-01-01'], '2026-07-24')).toEqual([]);
    expect(loadInitialState().date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
