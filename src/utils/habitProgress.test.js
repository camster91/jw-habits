import { describe, it, expect } from 'vitest';
import { bibleReadingProgress, dailyTextProgress } from './habitProgress.js';

describe('bibleReadingProgress', () => {
  it('returns day 1 of 366 on Jan 1', () => {
    const p = bibleReadingProgress(new Date(2026, 0, 1));
    expect(p.current).toBe(1);
    expect(p.total).toBe(366);
    expect(p.pct).toBeCloseTo(1 / 366, 5);
    expect(p.label).toBe('Day 1 of 366');
  });

  it('returns day 181 of 366 on June 30', () => {
    const p = bibleReadingProgress(new Date(2026, 5, 30));
    expect(p.current).toBe(181);
    expect(p.label).toBe('Day 181 of 366');
  });
  it('returns day 365 of 366 on Dec 31 (non-leap year)', () => {
    const p = bibleReadingProgress(new Date(2026, 11, 31));
    expect(p.current).toBe(365);
    expect(p.label).toBe('Day 365 of 366');
  });

  it('clamps pct at 1.0 for the year boundary', () => {
    const p = bibleReadingProgress(new Date(2026, 11, 31), 366);
    expect(p.pct).toBeLessThanOrEqual(1);
  });
});

describe('dailyTextProgress', () => {
  it('returns day 1 of 31 on Jan 1', () => {
    const p = dailyTextProgress(new Date(2026, 0, 1));
    expect(p.current).toBe(1);
    expect(p.total).toBe(31);
    expect(p.label).toBe('Day 1 of 31');
  });

  it('returns day 30 of 30 on Apr 30', () => {
    const p = dailyTextProgress(new Date(2026, 3, 30));
    expect(p.current).toBe(30);
    expect(p.total).toBe(30);
    expect(p.pct).toBe(1);
  });

  it('returns day 31 of 31 on Jul 31', () => {
    const p = dailyTextProgress(new Date(2026, 6, 31));
    expect(p.current).toBe(31);
    expect(p.total).toBe(31);
  });

  it('handles February correctly across leap and non-leap years', () => {
    // 2024 is a leap year: Feb has 29 days
    expect(dailyTextProgress(new Date(2024, 1, 28)).total).toBe(29);
    // 2026 is not a leap year: Feb has 28 days
    expect(dailyTextProgress(new Date(2026, 1, 28)).total).toBe(28);
  });
});
