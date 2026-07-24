/**
 * Tests for nextWeeklyFire and the Sunday Watchtower weekly
 * notifications. Pure functions + setTimeout-driven timers;
 * timers are cleaned up between tests so the suite doesn't
 * leak.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  nextWeeklyFire,
  scheduleSaturdayWindowOpen,
  cancelSaturdayWindowOpen,
  scheduleSundayEveningCheck,
  cancelSundayEveningCheck,
} from './notificationScheduler';

describe('nextWeeklyFire', () => {
  it('returns the same-day moment when hours/minutes are in the future', () => {
    // Mon Jul 27 2026 06:00 — Mon 08:00 is later today.
    const now = new Date(2026, 6, 27, 6, 0);
    const t = nextWeeklyFire(now, 1, 8, 0); // weekday 1 = Monday
    expect(t.getDay()).toBe(1);
    expect(t.getHours()).toBe(8);
    expect(t.getMinutes()).toBe(0);
  });

  it('schedules the same weekday +7 days when the time has already passed', () => {
    // Mon Jul 27 2026 09:00 — Mon 08:00 today already passed,
    // so the next Monday 08:00 is +8 days (next week + 1 day
    // because delta=0 then we add 7).
    const now = new Date(2026, 6, 27, 9, 0);
    const t = nextWeeklyFire(now, 1, 8, 0);
    expect(t.getDay()).toBe(1);
    expect(t.getHours()).toBe(8);
    const diffDays = Math.round((t.getTime() - now.getTime()) / (24 * 3600 * 1000));
    expect(diffDays).toBeGreaterThanOrEqual(7);
    expect(diffDays).toBeLessThanOrEqual(8);
  });

  it('advances to the next matching weekday', () => {
    // Tue Jul 28 2026 06:00 — Saturday 08:00 is +4 days.
    const now = new Date(2026, 6, 28, 6, 0);
    const t = nextWeeklyFire(now, 6, 8, 0);
    expect(t.getDay()).toBe(6);
    expect(t.getHours()).toBe(8);
  });

  it('returns null for invalid inputs', () => {
    const now = new Date();
    expect(nextWeeklyFire(now, -1, 8, 0)).toBeNull();
    expect(nextWeeklyFire(now, 7, 8, 0)).toBeNull();
    expect(nextWeeklyFire(now, 0, 24, 0)).toBeNull();
    expect(nextWeeklyFire(now, 0, 0, 60)).toBeNull();
    expect(nextWeeklyFire('not-a-date', 0, 8, 0)).toBeNull();
    expect(nextWeeklyFire(null, 0, 8, 0)).toBeNull();
  });

  it('Sunday → next Sunday rolls back +7 days (weekday 0)', () => {
    // Sat Jul 25 2026 06:00 → Sun Jul 26 2026 18:00 (+1 day).
    const now = new Date(2026, 6, 25, 6, 0);
    const t = nextWeeklyFire(now, 0, 18, 0);
    expect(t.getDay()).toBe(0);
    const target = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    expect(target.getDate()).toBe(26);
    expect(t.getHours()).toBe(18);
  });
});

describe('Sunday Watchtower weekly notifications', () => {
  beforeEach(() => {
    cancelSaturdayWindowOpen();
    cancelSundayEveningCheck();
    vi.useFakeTimers();
  });
  afterEach(() => {
    cancelSaturdayWindowOpen();
    cancelSundayEveningCheck();
    vi.useRealTimers();
  });

  it('scheduleSaturdayWindowOpen fires after the weekly target', () => {
    // Pin "now" to Wed Jul 22 2026 12:00. Saturday 8 AM is
    // 2 days 20 hours away. (Jul 22 Wed noon → Jul 25 Sat 8 AM =
    // 3 * 24 hours - 4 hours = 68 hours.)
    vi.setSystemTime(new Date(2026, 6, 22, 12, 0));
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
    scheduleSaturdayWindowOpen();
    // Assert: at least one setTimeout was scheduled
    expect(setTimeoutSpy).toHaveBeenCalled();
    // Assert: the delay corresponds to Saturday 8 AM = 2d 20h from Wed noon
    // (Jul 22 12:00 → Jul 25 08:00 = 68 hours)
    const [, delay] = setTimeoutSpy.mock.calls[0];
    expect(delay).toBe(68 * 3600 * 1000);
    setTimeoutSpy.mockRestore();
  });

  it('cancelSaturdayWindowOpen clears the pending timer', () => {
    vi.setSystemTime(new Date(2026, 6, 22, 12, 0));
    // Spy on setTimeout BEFORE scheduleSaturdayWindowOpen so we capture
    // the scheduled timer id, then spy on clearTimeout to verify cancel
    // uses the same id.
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    scheduleSaturdayWindowOpen();
    // setTimeoutSpy.mock.calls[0] = [callback, delay]; the third arg
    // (if present) is what setTimeout returns when called with more
    // args. The id from vi.useFakeTimers() is whatever the spy's return
    // value is. Capture via setTimeoutSpy.mock.results[0].value.
    const scheduledId = setTimeoutSpy.mock.results[0].value;
    cancelSaturdayWindowOpen();
    // Assert: clearTimeout was called with the same id that was scheduled
    expect(clearTimeoutSpy).toHaveBeenCalledWith(scheduledId);
    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });

  it('scheduleSundayEveningCheck targets Sunday 18:00 local', () => {
    // Wed Jul 22 2026 12:00 → Sun Jul 26 18:00 = 4 days 6 hours
    vi.setSystemTime(new Date(2026, 6, 22, 12, 0));
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
    scheduleSundayEveningCheck();
    expect(setTimeoutSpy).toHaveBeenCalled();
    const [, delay] = setTimeoutSpy.mock.calls[0];
    expect(delay).toBe(4 * 24 * 3600 * 1000 + 6 * 3600 * 1000);
    setTimeoutSpy.mockRestore();
  });
});
