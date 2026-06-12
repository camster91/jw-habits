import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { formatRelativeDate, formatRelativeDateTime } from './relativeDate.js';

describe('formatRelativeDate', () => {
  beforeEach(() => {
    // Pin "now" to a known point so the relative-day math is deterministic.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T15:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty string for null', () => {
    expect(formatRelativeDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatRelativeDate(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatRelativeDate('')).toBe('');
  });

  it('returns empty string for invalid date', () => {
    expect(formatRelativeDate('not a date')).toBe('');
  });

  it('accepts a Date object', () => {
    const today = new Date();
    expect(formatRelativeDate(today)).toBe('Today');
  });

  it('accepts an ISO string', () => {
    expect(formatRelativeDate('2026-06-12T08:00:00')).toBe('Today');
  });

  it('accepts a numeric timestamp', () => {
    const now = new Date('2026-06-12T15:00:00');
    expect(formatRelativeDate(now.getTime())).toBe('Today');
  });

  it('returns "Yesterday" for one day ago', () => {
    const yesterday = new Date('2026-06-11T15:00:00');
    expect(formatRelativeDate(yesterday)).toBe('Yesterday');
  });

  it('returns "3 days ago" for three days ago', () => {
    const threeDaysAgo = new Date('2026-06-09T15:00:00');
    expect(formatRelativeDate(threeDaysAgo)).toBe('3 days ago');
  });

  it('returns "1 days ago" for one day ago at the edge of the "yesterday" boundary', () => {
    // The exact 48-hour mark. isYesterday is true for the previous
    // calendar day, but the differenceInDays at 48 hours exactly is 2.
    // We test with a 1-day-ago-at-the-same-time on the previous day to
    // make sure the "Yesterday" path is reached before "X days ago" kicks in.
    const yesterday2 = new Date('2026-06-11T15:00:00');
    expect(formatRelativeDate(yesterday2)).toBe('Yesterday');
  });

  it('returns absolute date for 7+ days ago', () => {
    // 7 days back — at the edge of the threshold
    const sevenDays = new Date('2026-06-05T15:00:00');
    expect(formatRelativeDate(sevenDays)).toBe('Jun 5');

    // 30 days back
    const thirtyDays = new Date('2026-05-13T15:00:00');
    expect(formatRelativeDate(thirtyDays)).toBe('May 13');
  });

  it('returns absolute date for future dates (never "X days from now")', () => {
    const tomorrow = new Date('2026-06-13T15:00:00');
    expect(formatRelativeDate(tomorrow)).toBe('Jun 13');

    const nextYear = new Date('2027-01-01T00:00:00');
    // The format is 'MMM d' (no year), so we just verify it's a non-empty
    // string and matches the expected pattern.
    expect(formatRelativeDate(nextYear)).toMatch(/^Jan 1$/);
  });
});

describe('formatRelativeDateTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T15:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty string for null/invalid', () => {
    expect(formatRelativeDateTime(null)).toBe('');
    expect(formatRelativeDateTime(undefined)).toBe('');
    expect(formatRelativeDateTime('')).toBe('');
    expect(formatRelativeDateTime('not a date')).toBe('');
  });

  it('appends lowercase time for today', () => {
    // 2:30pm on the same day
    const t = new Date('2026-06-12T14:30:00');
    const result = formatRelativeDateTime(t);
    expect(result).toMatch(/^Today /);
    // Time portion is lowercased; the "Today" prefix is not
    expect(result.startsWith('Today')).toBe(true);
    expect(result.substring(5)).toBe(result.substring(5).toLowerCase());
  });

  it('appends lowercase time for yesterday', () => {
    const t = new Date('2026-06-11T09:15:00');
    const result = formatRelativeDateTime(t);
    expect(result).toMatch(/^Yesterday /);
    expect(result.startsWith('Yesterday')).toBe(true);
    expect(result.substring(9)).toBe(result.substring(9).toLowerCase());
  });

  it('omits time for 7+ days ago', () => {
    const t = new Date('2026-06-05T10:00:00');
    const result = formatRelativeDateTime(t);
    expect(result).toBe('Jun 5');
  });

  it('omits time for future dates (more than 24h away)', () => {
    // A date > 24h in the future — differenceInDays returns -1, so
    // the code takes the `days < 0` branch and shows the absolute date.
    const t = new Date('2026-06-15T10:00:00');
    expect(formatRelativeDateTime(t)).toBe('Jun 15');
  });
});
