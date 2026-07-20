/**
 * Tests for getSundayWatchtowerRow — verifies the date
 * window, ISO-week href, and null-safety.
 */
import { describe, it, expect } from 'vitest';
import { getSundayWatchtowerRow } from './jwLibraryLinks';

const t = (key, dflt) => dflt ?? key;

describe('getSundayWatchtowerRow', () => {
  it('returns null on Monday morning', () => {
    expect(getSundayWatchtowerRow(new Date(2026, 6, 27, 9, 0), t)).toBeNull();
  });

  it('returns null on Friday afternoon', () => {
    expect(getSundayWatchtowerRow(new Date(2026, 6, 24, 15, 0), t)).toBeNull();
  });

  it('returns null on Saturday before 8 AM', () => {
    expect(getSundayWatchtowerRow(new Date(2026, 6, 25, 7, 59), t)).toBeNull();
  });

  it('returns the row on Saturday at 8 AM', () => {
    const r = getSundayWatchtowerRow(new Date(2026, 6, 25, 8, 0), t);
    expect(r).not.toBeNull();
    expect(r.weekOf).toMatch(/^Sunday, July 26$/);
    expect(r.href).toBe('https://wol.jw.org/en/wol/meetings/r1/lp-e/2026/30');
    expect(r.studyWeek).toBe('2026-W30');
  });

  it('returns the row on Sunday at any hour', () => {
    const morning = getSundayWatchtowerRow(new Date(2026, 6, 26, 7, 0), t);
    const evening = getSundayWatchtowerRow(new Date(2026, 6, 26, 23, 0), t);
    expect(morning.weekOf).toMatch(/^Sunday, July 26$/);
    expect(evening.weekOf).toMatch(/^Sunday, July 26$/);
  });

  it('Sunday Jan 1 2024 belongs to week 52 of 2023', () => {
    // New Year's Day 2024 is a Monday, but we're using the
    // Sunday-of-the-week semantics — Sunday Dec 31 2023 is
    // the relevant Sunday, and that lives in 2023-W52
    // (verified by jwLibraryLinks test).
    const r = getSundayWatchtowerRow(new Date(2023, 11, 31, 11, 0), t);
    expect(r.studyWeek).toBe('2023-W52');
  });

  it('returns null for an invalid date', () => {
    expect(getSundayWatchtowerRow(new Date('not-a-date'), t)).toBeNull();
  });
});
