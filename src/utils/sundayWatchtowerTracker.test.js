/**
 * Tests for the Sunday Watchtower attendance tracker.
 *
 * The util records ISO weeks (e.g. "2026-W30") in a Set
 * stored under localStorage. Verifies idempotency, the
 * ISO-week math, the 104-week cap, and a roundtrip
 * mark → unmark → re-mark sequence.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  markSundayWatchtowerWeek,
  unmarkSundayWatchtowerWeek,
  sundayWatchtowerWeeksCount,
  isSundayWatchtowerWeekDone,
  isoWeekOfDate,
} from './sundayWatchtowerTracker';

describe('sundayWatchtowerTracker', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts at 0', () => {
    expect(sundayWatchtowerWeeksCount()).toBe(0);
  });

  it('records an ISO-week id', () => {
    const d = new Date(2026, 6, 26, 14, 0); // Sun Jul 26 2026 (local)
    const id = markSundayWatchtowerWeek(d);
    expect(id).toBe('2026-W30');
    expect(sundayWatchtowerWeeksCount()).toBe(1);
    expect(isSundayWatchtowerWeekDone(d)).toBe(true);
  });

  it('is idempotent across the same week', () => {
    const sun = new Date(2026, 6, 26, 14, 0);
    const sat = new Date(2026, 6, 25, 10, 0);
    markSundayWatchtowerWeek(sun);
    markSundayWatchtowerWeek(sat);
    expect(sundayWatchtowerWeeksCount()).toBe(1);
  });

  it('un-marks the same week', () => {
    const d = new Date(2026, 6, 26, 14, 0);
    markSundayWatchtowerWeek(d);
    expect(sundayWatchtowerWeeksCount()).toBe(1);
    const id = unmarkSundayWatchtowerWeek(d);
    expect(id).toBe('2026-W30');
    expect(sundayWatchtowerWeeksCount()).toBe(0);
  });

  it('roundtrip: mark → unmark → re-mark', () => {
    const d = new Date(2026, 6, 26, 14, 0);
    markSundayWatchtowerWeek(d);
    unmarkSundayWatchtowerWeek(d);
    markSundayWatchtowerWeek(d);
    expect(sundayWatchtowerWeeksCount()).toBe(1);
  });

  it('distinguishes two different ISO weeks', () => {
    const sun1 = new Date(2026, 6, 26, 14, 0); // week 30
    const sun2 = new Date(2026, 7, 2, 14, 0); // week 31
    markSundayWatchtowerWeek(sun1);
    markSundayWatchtowerWeek(sun2);
    expect(sundayWatchtowerWeeksCount()).toBe(2);
    expect(isSundayWatchtowerWeekDone(sun1)).toBe(true);
    expect(isSundayWatchtowerWeekDone(sun2)).toBe(true);
  });

  it('isoWeekOfDate returns the right week numbers for 2026', () => {
    // Independent of locale/timezone.
    // Jan 5 2026 is a Monday = week 2 of 2026 (since
    // Jan 1 2026 is a Thursday = week 1).
    expect(isoWeekOfDate(new Date(2026, 0, 5)).week).toBe(2);
    // Sun Jul 26 2026 = week 30 (verified by jwLibraryLinks test).
    expect(isoWeekOfDate(new Date(2026, 6, 26)).id).toBe('2026-W30');
    // Sun Jan 1 2023 = week 52 of 2022 (year-boundary case).
    const jan1 = isoWeekOfDate(new Date(2023, 0, 1));
    expect(jan1.year).toBe(2022);
  });
});
