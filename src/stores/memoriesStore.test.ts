import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

// Use fake timers for consistent date handling in updatedAt/createdAt
vi.useFakeTimers();
vi.setSystemTime(new Date('2026-04-12T12:00:00'));

// Import the store
const { default: useMemoriesStore } = await import('./memoriesStore.ts');

describe('memoriesStore', () => {
  beforeEach(() => {
    act(() => {
      useMemoriesStore.setState({ reflections: {} });
    });
    vi.setSystemTime(new Date('2026-04-12T12:00:00'));
  });

  describe('saveReflection', () => {
    it('should save a reflection for a date', () => {
      act(() => {
        useMemoriesStore.getState().saveReflection('2026-04-12', 'Today I learned about patience.');
      });

      const content = useMemoriesStore.getState().getReflection('2026-04-12');
      expect(content).toBe('Today I learned about patience.');
    });

    it('should update existing reflection preserving createdAt, updating updatedAt', () => {
      vi.setSystemTime(new Date('2026-04-12T10:00:00'));
      act(() => {
        useMemoriesStore.getState().saveReflection('2026-04-12', 'First reflection');
      });

      const firstCreatedAt = useMemoriesStore.getState().reflections['2026-04-12'].createdAt;

      // Advance time so updatedAt will differ
      vi.setSystemTime(new Date('2026-04-12T14:00:00'));
      act(() => {
        useMemoriesStore.getState().saveReflection('2026-04-12', 'Updated reflection');
      });

      const reflection = useMemoriesStore.getState().reflections['2026-04-12'];
      expect(reflection.content).toBe('Updated reflection');
      expect(reflection.createdAt).toBe(firstCreatedAt);
      expect(reflection.updatedAt).not.toBe(firstCreatedAt);
    });

    it('should set createdAt on first save', () => {
      act(() => {
        useMemoriesStore.getState().saveReflection('2026-04-12', 'New reflection');
      });

      const reflection = useMemoriesStore.getState().reflections['2026-04-12'];
      expect(reflection.createdAt).toBeDefined();
      expect(typeof reflection.createdAt).toBe('string');
    });
  });

  describe('getReflection', () => {
    it('should return content for a date with a saved reflection', () => {
      act(() => {
        useMemoriesStore.getState().saveReflection('2026-04-12', 'My reflection');
      });

      expect(useMemoriesStore.getState().getReflection('2026-04-12')).toBe('My reflection');
    });

    it('should return empty string for a date with no reflection', () => {
      expect(useMemoriesStore.getState().getReflection('2026-01-01')).toBe('');
    });
  });

  describe('deleteReflection', () => {
    it('should remove a reflection', () => {
      act(() => {
        useMemoriesStore.getState().saveReflection('2026-04-12', 'To be deleted');
      });

      expect(useMemoriesStore.getState().getReflection('2026-04-12')).toBe('To be deleted');

      act(() => {
        useMemoriesStore.getState().deleteReflection('2026-04-12');
      });

      expect(useMemoriesStore.getState().getReflection('2026-04-12')).toBe('');
    });

    it('should not affect other reflections when deleting one', () => {
      act(() => {
        useMemoriesStore.getState().saveReflection('2026-04-11', 'Keep this');
        useMemoriesStore.getState().saveReflection('2026-04-12', 'Delete this');
      });

      act(() => {
        useMemoriesStore.getState().deleteReflection('2026-04-12');
      });

      expect(useMemoriesStore.getState().getReflection('2026-04-11')).toBe('Keep this');
      expect(useMemoriesStore.getState().getReflection('2026-04-12')).toBe('');
    });
  });

  describe('searchReflections', () => {
    it('should find reflections containing query', () => {
      act(() => {
        useMemoriesStore.getState().saveReflection('2026-04-10', 'Patience is a virtue');
        useMemoriesStore.getState().saveReflection('2026-04-11', 'Gratitude brings joy');
        useMemoriesStore.getState().saveReflection('2026-04-12', 'Patience in ministry');
      });

      const results = useMemoriesStore.getState().searchReflections('patience');
      expect(results.length).toBe(2);
      expect(results.every(r => r.content.toLowerCase().includes('patience'))).toBe(true);
    });

    it('should be case-insensitive', () => {
      act(() => {
        useMemoriesStore.getState().saveReflection('2026-04-12', 'Joyful in Service');
      });

      const results = useMemoriesStore.getState().searchReflections('joyful');
      expect(results.length).toBe(1);
    });

    it('should return empty array for no matches', () => {
      act(() => {
        useMemoriesStore.getState().saveReflection('2026-04-12', 'Some content');
      });

      const results = useMemoriesStore.getState().searchReflections('nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('getReflectionsByMonth', () => {
    it('should return reflections for a specific month', () => {
      act(() => {
        useMemoriesStore.getState().saveReflection('2026-04-10', 'April reflection 1');
        useMemoriesStore.getState().saveReflection('2026-04-20', 'April reflection 2');
        useMemoriesStore.getState().saveReflection('2026-05-01', 'May reflection');
      });

      const aprilReflections = useMemoriesStore.getState().getReflectionsByMonth(2026, 4);
      expect(aprilReflections.length).toBe(2);
      expect(aprilReflections.every(r => r.date.startsWith('2026-04'))).toBe(true);
    });

    it('should return empty array for month with no reflections', () => {
      act(() => {
        useMemoriesStore.getState().saveReflection('2026-04-12', 'April only');
      });

      const mayReflections = useMemoriesStore.getState().getReflectionsByMonth(2026, 5);
      expect(mayReflections).toEqual([]);
    });
  });

  describe('getReflectionCount', () => {
    it('should return 0 for empty store', () => {
      expect(useMemoriesStore.getState().getReflectionCount()).toBe(0);
    });

    it('should return total count of reflections', () => {
      act(() => {
        useMemoriesStore.getState().saveReflection('2026-04-10', 'One');
        useMemoriesStore.getState().saveReflection('2026-04-11', 'Two');
        useMemoriesStore.getState().saveReflection('2026-04-12', 'Three');
      });

      expect(useMemoriesStore.getState().getReflectionCount()).toBe(3);
    });

    it('should update count after deletion', () => {
      act(() => {
        useMemoriesStore.getState().saveReflection('2026-04-10', 'One');
        useMemoriesStore.getState().saveReflection('2026-04-11', 'Two');
        useMemoriesStore.getState().deleteReflection('2026-04-10');
      });

      expect(useMemoriesStore.getState().getReflectionCount()).toBe(1);
    });
  });
});