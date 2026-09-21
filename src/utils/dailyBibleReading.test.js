import { describe, it, expect } from 'vitest';
import { getDailyReading } from './dailyBibleReading.js';

describe('getDailyReading', () => {
  // The module has a per-day cache. Each test uses a different
  // date so the cache is effectively isolated — a same-date test
  // would need explicit cache invalidation, which we avoid.

  it('returns the right reading for Jan 1 (day 1 of the year)', () => {
    const jan1 = new Date('2026-01-01T12:00:00Z');
    const reading = getDailyReading(jan1);
    expect(reading.day).toBe(1);
    expect(reading.label).toBe('Genesis 1-3');
  });

  it('returns the right reading for mid-year (June 15 = day 166)', () => {
    const jun15 = new Date('2026-06-15T12:00:00Z');
    const reading = getDailyReading(jun15);
    expect(reading.day).toBe(166);
    // Schedule entry for day 166: "Psalms 25-27"
    expect(reading.label).toBe('Psalms 25-27');
  });

  it('returns the right reading for Dec 31 (day 365 of a non-leap year)', () => {
    const dec31 = new Date('2026-12-31T12:00:00Z');
    const reading = getDailyReading(dec31);
    // 2026 is not a leap year, so day 365 wraps to (365-1) % 366 + 1 = 365
    expect(reading.day).toBe(365);
    // Schedule entry for day 365: "Romans 4-7"
    expect(reading.label).toBe('Romans 4-7');
  });

  it('caches per-day (second call with the same date returns the same object reference)', () => {
    const date = new Date('2026-07-04T12:00:00Z');
    const a = getDailyReading(date);
    const b = getDailyReading(date);
    // The cache is per-day; same date returns the same object
    // (no recomputation, no second readingToLink call).
    expect(b).toBe(a);
  });

  it('returns a different reading for a different date', () => {
    const a = getDailyReading(new Date('2026-01-01T12:00:00Z'));
    const b = getDailyReading(new Date('2026-01-02T12:00:00Z'));
    expect(a.day).toBe(1);
    expect(b.day).toBe(2);
    expect(a.label).not.toBe(b.label);
  });

  it('carries no link of its own', () => {
    // The row opens the user's saved link; the app generates none.
    const reading = getDailyReading(new Date(2026, 5, 15));
    expect(reading.url).toBeUndefined();
  });
});

describe('day-of-year math (via getDailyReading)', () => {
  // dayOfYear is not exported; we exercise it through getDailyReading.

  it('returns schedule day 1 for Jan 1 of any year', () => {
    const r = getDailyReading(new Date(2026, 0, 1));
    expect(r.day).toBe(1);
  });

  it('returns schedule day 32 for Feb 1', () => {
    // 2026 is non-leap: Jan = 31 days, Feb 1 = day 32
    const r = getDailyReading(new Date(2026, 1, 1));
    expect(r.day).toBe(32);
  });

  it('returns schedule day 60 for Feb 29 in a leap year (2028)', () => {
    // 2028 is leap: Jan = 31, Feb 29 = day 60
    const r = getDailyReading(new Date(2028, 1, 29));
    expect(r.day).toBe(60);
  });

  it('returns schedule day 61 for Mar 1 in a leap year (2028)', () => {
    // Mar 1 in a leap year = day 61 (Feb has 29 days, so 31+29+1=61)
    const r = getDailyReading(new Date(2028, 2, 1));
    expect(r.day).toBe(61);
  });
});

describe('schedule coverage', () => {
  // Test the entire 366-day schedule by iterating day-of-year
  // from 1 to 366 of a leap year (2028). Each day should produce
  // a valid reading with a non-empty label and a non-empty URL.

  it('covers all 366 days of a leap year with valid readings', () => {
    for (let d = 1; d <= 366; d++) {
      // "day d" of 2028 (a leap year)
      const r = getDailyReading(dayOf(2028, d));
      expect(r.label, `day ${d} should have a label`).toBeTruthy();
      expect(typeof r.label).toBe('string');
      expect(r.label.length).toBeGreaterThan(0);
    }
  });

  it('all 366 readings have a unique label', () => {
    // The schedule is intentionally varied (1-3 days per book
    // across the Bible). 366 distinct readings is the right count.
    const labels = new Set();
    for (let d = 1; d <= 366; d++) {
      labels.add(getDailyReading(dayOf(2028, d)).label);
    }
    expect(labels.size).toBe(366);
  });

  it('every day-of-year produces a schedule.day in [1, 366]', () => {
    for (let d = 1; d <= 366; d++) {
      const r = getDailyReading(dayOf(2028, d));
      expect(r.day).toBeGreaterThanOrEqual(1);
      expect(r.day).toBeLessThanOrEqual(366);
    }
  });

  it('the schedule wraps year-over-year (day 1 of 2027 = day 1 of 2026)', () => {
    const r2026 = getDailyReading(new Date(2026, 0, 1));
    const r2027 = getDailyReading(new Date(2027, 0, 1));
    expect(r2026.day).toBe(1);
    expect(r2027.day).toBe(1);
    expect(r2026.label).toBe(r2027.label);
  });
});

// Helper: build a Date for "day d of year" (1..366) in the
// given leap-year-safe year. day 1 = Jan 1, day 32 = Feb 1, etc.
function dayOf(year, day) {
  const d = new Date(year, 0, 1);
  d.setDate(d.getDate() + (day - 1));
  return d;
}
