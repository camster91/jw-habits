import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

// Mock date-fns before importing the store
vi.mock('date-fns', () => {
  let mockToday = new Date('2026-04-12T12:00:00');

  return {
    startOfDay: (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    },
    isSameDay: (dateLeft, dateRight) => {
      return (
        dateLeft.getFullYear() === dateRight.getFullYear() &&
        dateLeft.getMonth() === dateRight.getMonth() &&
        dateLeft.getDate() === dateRight.getDate()
      );
    },
    parseISO: (str) => new Date(str),
    _setMockToday: (date) => { mockToday = date; },
    _getMockToday: () => mockToday,
  };
});

// Import after mocking
const { default: useNewsStore } = await import('./newsStore.ts');

describe('newsStore', () => {
  beforeEach(() => {
    act(() => {
      useNewsStore.setState({
        lastChecked: null,
        streak: 0,
        history: [],
        totalChecks: 0,
      });
    });
  });

  describe('checkToday', () => {
    it('should set lastChecked to today and increment streak', () => {
      act(() => {
        useNewsStore.getState().checkToday();
      });

      const state = useNewsStore.getState();
      expect(state.lastChecked).not.toBeNull();
      expect(state.streak).toBe(1);
      expect(state.totalChecks).toBe(1);
    });

    it('should not update if already checked today', () => {
      // First check
      act(() => {
        useNewsStore.getState().checkToday();
      });

      const firstState = useNewsStore.getState();

      // Second check same day
      act(() => {
        useNewsStore.getState().checkToday();
      });

      const secondState = useNewsStore.getState();
      expect(secondState.totalChecks).toBe(firstState.totalChecks);
      expect(secondState.streak).toBe(firstState.streak);
    });

    it('should reset streak if a day was missed', () => {
      // Set up as if we checked 2 days ago with a streak of 5
      const twoDaysAgo = new Date('2026-04-10T12:00:00');
      const twoDaysAgoISO = twoDaysAgo.toISOString();

      act(() => {
        useNewsStore.setState({
          lastChecked: twoDaysAgoISO,
          streak: 5,
          history: [twoDaysAgoISO],
          totalChecks: 5,
        });
      });

      // Now check today (2026-04-12) - 2 days gap
      act(() => {
        useNewsStore.getState().checkToday();
      });

      const state = useNewsStore.getState();
      expect(state.streak).toBe(1);
    });

    it('should increment streak when checked on consecutive days', () => {
      const yesterday = new Date('2026-04-11T12:00:00');
      const yesterdayISO = yesterday.toISOString();

      act(() => {
        useNewsStore.setState({
          lastChecked: yesterdayISO,
          streak: 3,
          history: [yesterdayISO],
          totalChecks: 3,
        });
      });

      // Check today (2026-04-12)
      act(() => {
        useNewsStore.getState().checkToday();
      });

      const state = useNewsStore.getState();
      expect(state.streak).toBe(4);
    });

    it('should add today to history', () => {
      act(() => {
        useNewsStore.getState().checkToday();
      });

      const state = useNewsStore.getState();
      expect(state.history.length).toBe(1);
    });
  });

  describe('getHasCheckedToday', () => {
    it('should return false before checking', () => {
      expect(useNewsStore.getState().getHasCheckedToday()).toBe(false);
    });

    it('should return true after checking today', () => {
      act(() => {
        useNewsStore.getState().checkToday();
      });

      expect(useNewsStore.getState().getHasCheckedToday()).toBe(true);
    });
  });

  describe('getStreak', () => {
    it('should return current streak', () => {
      act(() => {
        useNewsStore.setState({ streak: 7 });
      });

      expect(useNewsStore.getState().getStreak()).toBe(7);
    });

    it('should return 0 for default streak', () => {
      expect(useNewsStore.getState().getStreak()).toBe(0);
    });
  });

  describe('resetAll', () => {
    it('should reset all state to defaults', () => {
      act(() => {
        useNewsStore.getState().checkToday();
        useNewsStore.getState().resetAll();
      });

      const state = useNewsStore.getState();
      expect(state.lastChecked).toBeNull();
      expect(state.streak).toBe(0);
      expect(state.history).toEqual([]);
      expect(state.totalChecks).toBe(0);
    });
  });

});