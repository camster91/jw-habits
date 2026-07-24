import { describe, it, expect } from 'vitest';
import {
  parseHHMM,
  nextFireTime,
  skipQuiet,
  getPermissionState,
  NOTIFICATION_PERMISSION,
} from './notificationScheduler.js';

describe('parseHHMM', () => {
  it('accepts HH:MM', () => {
    expect(parseHHMM('09:00')).toEqual({ hours: 9, minutes: 0 });
    expect(parseHHMM('21:30')).toEqual({ hours: 21, minutes: 30 });
    expect(parseHHMM('00:00')).toEqual({ hours: 0, minutes: 0 });
    expect(parseHHMM('23:59')).toEqual({ hours: 23, minutes: 59 });
  });
  it('rejects bad input', () => {
    expect(parseHHMM(null)).toBeNull();
    expect(parseHHMM('')).toBeNull();
    expect(parseHHMM('24:00')).toBeNull();
    expect(parseHHMM('12:60')).toBeNull();
    expect(parseHHMM('12')).toBeNull();
    expect(parseHHMM('abc')).toBeNull();
  });
});

describe('nextFireTime', () => {
  it('returns today at the reminder time when in the future', () => {
    // 09:00 on June 30 2026 → next fire is same day at 09:00
    const now = new Date(2026, 5, 30, 6, 0); // 6 AM
    const t = nextFireTime(now, '09:00', null);
    expect(t.getFullYear()).toBe(2026);
    expect(t.getMonth()).toBe(5);
    expect(t.getDate()).toBe(30);
    expect(t.getHours()).toBe(9);
    expect(t.getMinutes()).toBe(0);
  });

  it('rolls to tomorrow when today has passed', () => {
    // 21:00 on June 30 2026 — but it's already 22:00 → push to July 1
    const now = new Date(2026, 5, 30, 22, 0);
    const t = nextFireTime(now, '21:00', null);
    expect(t.getDate()).toBe(1); // July 1
    expect(t.getMonth()).toBe(6);
    expect(t.getHours()).toBe(21);
  });

  it('returns null for missing reminder time', () => {
    expect(nextFireTime(new Date(), null, null)).toBeNull();
    expect(nextFireTime(new Date(), 'not-a-time', null)).toBeNull();
  });

  it('rolls to the quiet-hours end when the reminder lands inside them', () => {
    // 08:00 on June 30, reminder 21:00, quiet 06:00-22:00.
    // 21:00 falls inside 06:00-22:00 → fire at the END of quiet
    // (22:00 same day). The user wants a reminder shortly after
    // quiet hours end, not at the next day's reminder time.
    const now = new Date(2026, 5, 30, 8, 0);
    const t = nextFireTime(now, '21:00', { start: '06:00', end: '22:00' });
    expect(t.getDate()).toBe(30); // Same day, June 30
    expect(t.getHours()).toBe(22); // End of quiet hours
    expect(t.getMinutes()).toBe(0);
  });

  it('rolls past midnight for both date-bump and quiet-window reasons', () => {
    // 23:00 on June 30, reminder 21:00, quiet 14:00-02:00 (wraps midnight).
    // Today is past at 21:00 → bump to July 1 at 21:00.
    // 21:00 on July 1 is INSIDE quiet hours (Jul 1 14:00 → Jul 2
    // 02:00) since the wrap window on July 1 begins at 14:00 same
    // day, not at midnight. So we push past end of Jul 1's quiet =
    // Jul 2 02:00.
    const now = new Date(2026, 5, 30, 23, 0);
    const t = nextFireTime(now, '21:00', { start: '14:00', end: '02:00' });
    expect(t.getDate()).toBe(2); // July 2
    expect(t.getHours()).toBe(2); // End of Jul 1 quiet hours
    expect(t.getMinutes()).toBe(0);
  });

  it('returns end-of-quiet when the next reminder lands inside quiet hours', () => {
    // 23:00 on June 30, reminder 08:00 (8 AM, past), quiet 06:00-22:00.
    // Today at 08:00 is past → bump to July 1 at 08:00.
    // 08:00 on July 1 is INSIDE quiet hours (06:00-22:00) → push
    // to end-of-quiet same day at 22:00.
    const now = new Date(2026, 5, 30, 23, 0);
    const t = nextFireTime(now, '08:00', { start: '06:00', end: '22:00' });
    expect(t.getDate()).toBe(1); // July 1
    expect(t.getHours()).toBe(22); // End of Jul 1 quiet hours
  });

  it('does not shift when the bumped reminder lands outside quiet hours', () => {
    // Same setup as above but a reminder time that doesn't fall in
    // quiet hours.
    // 23:00 on June 30, reminder 03:00 (3 AM, past), quiet 06:00-22:00.
    // Bump to July 1 at 03:00. 03:00 is BEFORE 06:00, so outside.
    // Result: July 1 at 03:00.
    const now = new Date(2026, 5, 30, 23, 0);
    const t = nextFireTime(now, '03:00', { start: '06:00', end: '22:00' });
    expect(t.getDate()).toBe(1); // July 1
    expect(t.getHours()).toBe(3); // 03:00 — before 06:00 quiet start
  });
});

describe('skipQuiet', () => {
  it('returns the time unchanged when no quiet hours set', () => {
    const t = new Date(2026, 5, 30, 21, 0);
    expect(skipQuiet(t, null).getTime()).toBe(t.getTime());
    expect(skipQuiet(t, undefined).getTime()).toBe(t.getTime());
  });

  it('returns the time unchanged when outside a same-day quiet window', () => {
    // Quiet is 09:00-17:00 same day. 21:00 is outside.
    const t = new Date(2026, 5, 30, 21, 0);
    const result = skipQuiet(t, { start: '09:00', end: '17:00' });
    expect(result.getTime()).toBe(t.getTime());
  });

  it('pushes past the end for a same-day quiet window', () => {
    // Quiet 09:00-17:00. Fire at 14:00 → push to 17:00.
    const t = new Date(2026, 5, 30, 14, 0);
    const result = skipQuiet(t, { start: '09:00', end: '17:00' });
    expect(result.getHours()).toBe(17);
    expect(result.getMinutes()).toBe(0);
    expect(result.getDate()).toBe(30);
  });

  it('handles wrap-midnight quiet windows (22:00 today → 07:00 tomorrow)', () => {
    // Fire at 23:00. Quiet 22:00-07:00. Inside → push to 07:00 next day.
    const t = new Date(2026, 5, 30, 23, 0);
    const result = skipQuiet(t, { start: '22:00', end: '07:00' });
    expect(result.getDate()).toBe(1); // July 1
    expect(result.getHours()).toBe(7);
  });

  it('keeps the time when inside a start<end quiet hour on the boundary', () => {
    // Fire exactly at quiet start should NOT be skipped (window is
    // half-open: [start, end)). The user wants reminders to fire
    // ON the start boundary.
    const t = new Date(2026, 5, 30, 9, 0);
    const result = skipQuiet(t, { start: '09:00', end: '17:00' });
    expect(result.getTime()).toBe(t.getTime());
  });
});

describe('getPermissionState', () => {
  it('returns UNSUPPORTED when Notification API absent', () => {
    const orig = global.Notification;
    delete global.Notification;
    try {
      expect(getPermissionState()).toBe(NOTIFICATION_PERMISSION.UNSUPPORTED);
    } finally {
      global.Notification = orig;
    }
  });

  it('returns GRANTED when Notification.permission is granted', () => {
    global.Notification.permission = 'granted';
    expect(getPermissionState()).toBe(NOTIFICATION_PERMISSION.GRANTED);
    global.Notification.permission = 'default';
  });

  it('returns DENIED when Notification.permission is denied', () => {
    global.Notification.permission = 'denied';
    expect(getPermissionState()).toBe(NOTIFICATION_PERMISSION.DENIED);
    global.Notification.permission = 'default';
  });
});

describe('startReminder / cancelReminder (lifecycle)', () => {
  afterEach(() => {
    // Reset the timer between tests by simulating a re-read with no settings
    localStorage.clear();
  });

  it('does nothing when reminderTime is unset', () => {
    const { startReminder, cancelReminder } = require('./notificationScheduler.js');
    startReminder(); // should silently no-op
    cancelReminder();
  });
});
