import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';

const { default: useServiceStore } = await import('./serviceStore.js');

describe('serviceStore', () => {
  beforeEach(() => {
    act(() => {
      useServiceStore.setState({ entries: [], monthlyGoalHours: 10 });
    });
  });

  describe('addEntry', () => {
    it('creates an entry with a string id', () => {
      act(() => {
        useServiceStore.getState().addEntry({
          type: 'field-service',
          hours: 1,
          date: '2026-06-12',
        });
      });
      const entries = useServiceStore.getState().entries;
      expect(entries).toHaveLength(1);
      expect(typeof entries[0].id).toBe('string');
      expect(entries[0].id.length).toBeGreaterThan(0);
    });

    it('falls back to a timestamp+random id when crypto.randomUUID is missing', () => {
      // Simulate a non-secure-context environment (LAN http://, no crypto.randomUUID)
      const originalCrypto = globalThis.crypto;
      // @ts-ignore
      delete globalThis.crypto;

      try {
        act(() => {
          useServiceStore.getState().addEntry({
            type: 'field-service',
            hours: 1,
            date: '2026-06-12',
          });
        });
        const entries = useServiceStore.getState().entries;
        expect(entries).toHaveLength(1);
        const id = entries[0].id;
        expect(typeof id).toBe('string');
        // Fallback format: "<base36 timestamp>-<base36 random>"
        expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
      } finally {
        globalThis.crypto = originalCrypto;
      }
    });

    it('coerces hours, placements, returnVisits, bibleStudies to numbers', () => {
      act(() => {
        useServiceStore.getState().addEntry({
          type: 'bible-study',
          hours: '2',
          placements: '3',
          returnVisits: '1',
          bibleStudies: '1',
          date: '2026-06-12',
        });
      });
      const entry = useServiceStore.getState().entries[0];
      expect(entry.hours).toBe(2);
      expect(entry.placements).toBe(3);
      expect(entry.returnVisits).toBe(1);
      expect(entry.bibleStudies).toBe(1);
    });

    it('defaults missing counters to 0 instead of NaN', () => {
      act(() => {
        useServiceStore.getState().addEntry({
          type: 'field-service',
          hours: 1,
          date: '2026-06-12',
        });
      });
      const entry = useServiceStore.getState().entries[0];
      expect(entry.placements).toBe(0);
      expect(entry.returnVisits).toBe(0);
      expect(entry.bibleStudies).toBe(0);
    });

    it('always populates durationMinutes from hours when not given', () => {
      act(() => {
        useServiceStore.getState().addEntry({
          type: 'field-service',
          hours: 1.5,
          date: '2026-06-12',
        });
      });
      const entry = useServiceStore.getState().entries[0];
      expect(entry.durationMinutes).toBe(90);
    });
  });

  describe('removeEntry', () => {
    it('removes the entry with the matching id', () => {
      let id;
      act(() => {
        useServiceStore.getState().addEntry({
          type: 'field-service',
          hours: 1,
          date: '2026-06-12',
        });
        id = useServiceStore.getState().entries[0].id;
      });
      act(() => {
        useServiceStore.getState().removeEntry(id);
      });
      expect(useServiceStore.getState().entries).toHaveLength(0);
    });
  });

  describe('totals', () => {
    it('sums hours for the current month only', () => {
      act(() => {
        // Current month (system date in test env)
        useServiceStore.getState().addEntry({ type: 'field-service', hours: 2, date: new Date().toISOString().split('T')[0] });
        // A date from a year ago — should NOT count
        useServiceStore.getState().addEntry({ type: 'field-service', hours: 5, date: '2020-01-15' });
      });
      const monthly = useServiceStore.getState().getMonthlyTotal();
      expect(monthly).toBe(2);
    });

    it('counts placements from weeklyEntries only', () => {
      act(() => {
        const today = new Date().toISOString().split('T')[0];
        useServiceStore.getState().addEntry({ type: 'field-service', hours: 1, placements: 3, date: today });
        useServiceStore.getState().addEntry({ type: 'field-service', hours: 1, placements: 2, date: '2020-01-15' });
      });
      expect(useServiceStore.getState().getWeeklyPlacements()).toBe(3);
    });
  });
});
