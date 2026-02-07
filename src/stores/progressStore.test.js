import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

// Mock date-fns before importing the store
vi.mock('date-fns', () => ({
  format: (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  getDayOfYear: (date) => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  },
}));

// Import after mocking
const { default: useProgressStore } = await import('./progressStore.js');

describe('progressStore', () => {
  beforeEach(() => {
    // Clear store state before each test
    act(() => {
      useProgressStore.getState().clearAll();
    });
  });

  describe('Daily Text Progress', () => {
    it('should initialize with empty daily texts', () => {
      const state = useProgressStore.getState();
      expect(state.dailyTexts).toEqual({});
    });

    it('should update daily text progress field', () => {
      const testDate = '2026-01-20';

      act(() => {
        useProgressStore.getState().updateDailyTextProgress(testDate, 'readScripture', true);
      });

      const state = useProgressStore.getState();
      expect(state.dailyTexts[testDate].readScripture).toBe(true);
      // Single checkbox model: readScripture = true means 100% progress
      expect(state.dailyTexts[testDate].progress).toBe(100);
    });

    it('should calculate 100% progress when all fields completed', () => {
      const testDate = '2026-01-20';

      act(() => {
        const store = useProgressStore.getState();
        store.updateDailyTextProgress(testDate, 'readScripture', true);
        store.updateDailyTextProgress(testDate, 'readComments', true);
        store.updateDailyTextProgress(testDate, 'meditated', true);
      });

      const state = useProgressStore.getState();
      expect(state.dailyTexts[testDate].progress).toBe(100);
      expect(state.dailyTexts[testDate].read).toBe(true);
    });

    it('should mark daily text as read', () => {
      const testDate = '2026-01-20';

      act(() => {
        useProgressStore.getState().markDailyTextRead(testDate);
      });

      const state = useProgressStore.getState();
      expect(state.dailyTexts[testDate].read).toBe(true);
      expect(state.dailyTexts[testDate].progress).toBe(100);
      expect(state.isDailyTextRead(testDate)).toBe(true);
    });

    it('should get daily text progress', () => {
      const testDate = '2026-01-20';

      act(() => {
        useProgressStore.getState().updateDailyTextProgress(testDate, 'readScripture', true);
      });

      const progress = useProgressStore.getState().getDailyTextProgress(testDate);
      expect(progress.readScripture).toBe(true);
      // Single checkbox model: only readScripture field exists
      expect(progress.progress).toBe(100);
    });
  });

  describe('Bible Reading Progress', () => {
    it('should mark bible reading complete', () => {
      const dayOfYear = 20;

      act(() => {
        useProgressStore.getState().markBibleReadingComplete(dayOfYear);
      });

      const state = useProgressStore.getState();
      expect(state.bibleReadings[dayOfYear].read).toBe(true);
      expect(state.bibleReadings[dayOfYear].progress).toBe(100);
      expect(state.bibleReadings[dayOfYear].status).toBe('completed');
    });

    it('should update bible reading progress partially', () => {
      const dayOfYear = 20;

      act(() => {
        useProgressStore.getState().updateBibleReadingProgress(dayOfYear, 50, ['Gen 1', 'Gen 2']);
      });

      const state = useProgressStore.getState();
      expect(state.bibleReadings[dayOfYear].progress).toBe(50);
      expect(state.bibleReadings[dayOfYear].chaptersRead).toEqual(['Gen 1', 'Gen 2']);
      expect(state.bibleReadings[dayOfYear].status).toBe('in_progress');
    });

    it('should check if bible reading is complete', () => {
      const dayOfYear = 20;

      expect(useProgressStore.getState().isBibleReadingComplete(dayOfYear)).toBe(false);

      act(() => {
        useProgressStore.getState().markBibleReadingComplete(dayOfYear);
      });

      expect(useProgressStore.getState().isBibleReadingComplete(dayOfYear)).toBe(true);
    });

    it('should get bible reading progress percentage', () => {
      const dayOfYear = 20;

      expect(useProgressStore.getState().getBibleReadingProgress(dayOfYear)).toBe(0);

      act(() => {
        useProgressStore.getState().updateBibleReadingProgress(dayOfYear, 75, []);
      });

      expect(useProgressStore.getState().getBibleReadingProgress(dayOfYear)).toBe(75);
    });
  });

  describe('Meeting Preparation Progress', () => {
    it('should initialize meeting parts', () => {
      const weekOf = '2026-W03';
      const meetingType = 'midweek';
      const partKeys = ['part1', 'part2', 'part3'];

      act(() => {
        useProgressStore.getState().initMeetingParts(weekOf, meetingType, partKeys);
      });

      const progress = useProgressStore.getState().getMeetingProgress(weekOf, meetingType);
      expect(progress.parts).toEqual({ part1: false, part2: false, part3: false });
    });

    it('should update meeting part progress', () => {
      const weekOf = '2026-W03';
      const meetingType = 'midweek';

      act(() => {
        useProgressStore.getState().updateMeetingPartProgress(weekOf, meetingType, 'part1', true);
        useProgressStore.getState().updateMeetingPartProgress(weekOf, meetingType, 'part2', true);
        useProgressStore.getState().updateMeetingPartProgress(weekOf, meetingType, 'part3', false);
      });

      const progress = useProgressStore.getState().getMeetingProgress(weekOf, meetingType);
      expect(progress.parts.part1).toBe(true);
      expect(progress.parts.part2).toBe(true);
      expect(progress.parts.part3).toBe(false);
      expect(progress.progress).toBe(67);
    });

    it('should mark meeting as fully prepared', () => {
      const weekOf = '2026-W03';
      const meetingType = 'weekend';

      act(() => {
        useProgressStore.getState().markMeetingPrepared(weekOf, meetingType, 45);
      });

      const state = useProgressStore.getState();
      expect(state.isMeetingPrepared(weekOf, meetingType)).toBe(true);
    });
  });

  describe('clearAll', () => {
    it('should clear all progress data', () => {
      act(() => {
        const store = useProgressStore.getState();
        store.markDailyTextRead('2026-01-20');
        store.markBibleReadingComplete(20);
        store.markMeetingPrepared('2026-W03', 'midweek');
        store.clearAll();
      });

      const state = useProgressStore.getState();
      expect(state.dailyTexts).toEqual({});
      expect(state.bibleReadings).toEqual({});
      expect(state.meetings).toEqual({});
    });
  });
});
