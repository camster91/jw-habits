process.env.TZ = 'America/Toronto';

import { describe, it, expect } from 'vitest';
import { appDay, addDays, weekday, weekStart, monthKey, serviceYear } from './day.js';

const zoneIsToronto = Intl.DateTimeFormat().resolvedOptions().timeZone === 'America/Toronto';

describe('appDay', () => {
  it('rolls over at 03:00 local', () => {
    expect(appDay(new Date(2026, 9, 6, 2, 59))).toBe('2026-10-05');
    expect(appDay(new Date(2026, 9, 6, 3, 0))).toBe('2026-10-06');
  });

  it('crosses month and year boundaries', () => {
    expect(appDay(new Date(2026, 0, 1, 1, 0))).toBe('2025-12-31');
    expect(appDay(new Date(2026, 2, 1, 0, 0))).toBe('2026-02-28');
  });

  // Hour-by-hour across a DST change: dates may repeat within a day but must
  // never skip a day or go backwards.
  it.skipIf(!zoneIsToronto)('has no skipped or repeated day across DST changes', () => {
    for (const [y, m, d] of [
      [2026, 2, 8],
      [2026, 10, 1],
    ]) {
      const start = new Date(y, m, d - 2, 0, 0).getTime();
      const end = new Date(y, m, d + 3, 0, 0).getTime();
      const seq = [];
      for (let t = start; t < end; t += 3600 * 1000) {
        const day = appDay(new Date(t));
        if (seq[seq.length - 1] !== day) seq.push(day);
      }
      // Each distinct day appears in one contiguous run, in calendar order.
      expect(new Set(seq).size).toBe(seq.length);
      for (let i = 1; i < seq.length; i++) expect(seq[i]).toBe(addDays(seq[i - 1], 1));
      // And the rollover is still wall-clock 03:00 on the DST day (02:xx does not exist on spring-forward).
      expect(appDay(new Date(y, m, d, 1, 59, 59))).toBe(
        addDays(`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, -1)
      );
      expect(appDay(new Date(y, m, d, 3, 0))).toBe(
        `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      );
    }
  });
});

describe('day arithmetic', () => {
  it('addDays handles month, year and leap boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09');
  });

  it('weekday: 0 is Sunday', () => {
    expect(weekday('2026-10-11')).toBe(0);
    expect(weekday('2026-10-05')).toBe(1);
    expect(weekday('2026-10-10')).toBe(6);
  });

  it('weekStart returns the Monday', () => {
    expect(weekStart('2026-10-11')).toBe('2026-10-05');
    expect(weekStart('2026-10-05')).toBe('2026-10-05');
    expect(weekStart('2026-10-07')).toBe('2026-10-05');
  });

  it('monthKey', () => {
    expect(monthKey('2026-03-08')).toBe('2026-03');
  });

  it('serviceYear runs September to August', () => {
    expect(serviceYear('2026-08-31')).toBe(2025);
    expect(serviceYear('2026-09-01')).toBe(2026);
    expect(serviceYear('2026-12-31')).toBe(2026);
    expect(serviceYear('2027-01-01')).toBe(2026);
  });
});
