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
      const testDate = '2026-06-12';

      act(() => {
        useProgressStore.getState().markBibleReadingComplete(testDate);
      });

      const state = useProgressStore.getState();
      expect(state.bibleReadings[testDate].read).toBe(true);
      expect(state.bibleReadings[testDate].progress).toBe(100);
      expect(state.bibleReadings[testDate].status).toBe('completed');
    });

    it('should update bible reading progress partially', () => {
      const testDate = '2026-06-12';

      act(() => {
        useProgressStore.getState().updateBibleReadingProgress(testDate, 50, ['Gen 1', 'Gen 2']);
      });

      const state = useProgressStore.getState();
      expect(state.bibleReadings[testDate].progress).toBe(50);
      expect(state.bibleReadings[testDate].chaptersRead).toEqual(['Gen 1', 'Gen 2']);
      expect(state.bibleReadings[testDate].status).toBe('in_progress');
    });

    it('should check if bible reading is complete', () => {
      const testDate = '2026-06-12';

      expect(useProgressStore.getState().isBibleReadingComplete(testDate)).toBe(false);

      act(() => {
        useProgressStore.getState().markBibleReadingComplete(testDate);
      });

      expect(useProgressStore.getState().isBibleReadingComplete(testDate)).toBe(true);
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
        store.markBibleReadingComplete('2026-06-12');
        store.markMeetingPrepared('2026-W03', 'midweek');
        store.clearAll();
      });

      const state = useProgressStore.getState();
      expect(state.dailyTexts).toEqual({});
      expect(state.bibleReadings).toEqual({});
      expect(state.meetings).toEqual({});
    });
  });

  describe('bibleReadings migration (1-366 dayOfYear → yyyy-MM-dd date)', () => {
    it('translates 1-366 keys to yyyy-MM-dd keys in the current year', async () => {
      const { migrateBibleKeys } = await import('./progressStore.js');
      const state = {
        bibleReadings: {
          '1':   { progress: 100, read: true, status: 'completed', timestamp: '2026-01-01T00:00:00Z' },
          '20':  { progress: 100, read: true, status: 'completed', timestamp: '2026-01-20T00:00:00Z' },
          '365': { progress: 50,  read: false, status: 'in_progress', timestamp: '2026-12-31T00:00:00Z' },
        },
        bibleChapters: {
          '20': { 0: true, 1: false },
        },
      };
      const migrated = migrateBibleKeys(state);
      const year = new Date().getFullYear();
      // The new keys should be yyyy-MM-dd in the current year. Day 1 →
      // Jan 1, day 20 → Jan 20, day 365 → Dec 31 (non-leap year) or
      // Dec 30 (leap year).
      const expectedNewKeys = ['1', '20', '365'].map(d => {
        const date = new Date(year, 0, Number(d));
        return date.toISOString().slice(0, 10);
      });
      // The migrated state has 3 new keys, none of the old 1-366
      // numeric keys remain.
      expect(Object.keys(migrated.bibleReadings).sort()).toEqual(expectedNewKeys.slice().sort());
      // The old shape is gone
      expect(migrated.bibleReadings).not.toHaveProperty('1');
      expect(migrated.bibleReadings).not.toHaveProperty('20');
      expect(migrated.bibleReadings).not.toHaveProperty('365');
      // Values are preserved
      expect(migrated.bibleReadings[expectedNewKeys[0]].read).toBe(true);
      expect(migrated.bibleReadings[expectedNewKeys[2]].progress).toBe(50);
      // bibleChapters also migrates
      expect(Object.keys(migrated.bibleChapters).sort()).toEqual(expectedNewKeys.slice(1, 2)); // only day 20
      // The 0/1 chapter values are preserved
      expect(migrated.bibleChapters[expectedNewKeys[1]][0]).toBe(true);
      expect(migrated.bibleChapters[expectedNewKeys[1]][1]).toBe(false);
    });

    it('is a no-op when keys are already date strings', async () => {
      const { migrateBibleKeys } = await import('./progressStore.js');
      const state = {
        bibleReadings: {
          '2026-06-12': { progress: 100, read: true, status: 'completed' },
        },
      };
      const migrated = migrateBibleKeys(state);
      // No-op: same data, same keys
      expect(migrated).toBe(state);
    });

    it('handles mixed old and new keys (only translates the old ones)', async () => {
      const { migrateBibleKeys } = await import('./progressStore.js');
      const year = new Date().getFullYear();
      const state = {
        bibleReadings: {
          '1':  { progress: 50, read: false, status: 'in_progress' },  // legacy
          '2026-06-12': { progress: 100, read: true, status: 'completed' },  // new
        },
      };
      const migrated = migrateBibleKeys(state);
      // Both keys present
      expect(Object.keys(migrated.bibleReadings).sort()).toEqual(
        ['2026-06-12', new Date(year, 0, 1).toISOString().slice(0, 10)].sort()
      );
      // The legacy key's value is now under the date key
      const dateKey = new Date(year, 0, 1).toISOString().slice(0, 10);
      expect(migrated.bibleReadings[dateKey].progress).toBe(50);
      // The new key's value is preserved
      expect(migrated.bibleReadings['2026-06-12'].progress).toBe(100);
    });
  });
});
