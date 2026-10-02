import { describe, it, expect } from 'vitest';
import { getThisWeekMeetingUrl, getTodayRow } from './weekContext';

// Pass-through translator: returns the key, so assertions test the key
// the row chose rather than any locale's wording.
const tEn = (k) => k;

describe('weekContext', () => {
  describe('getThisWeekMeetingUrl', () => {
    it('returns the Monday-Sunday range for the week containing the date', () => {
      // 2026-06-17 is a Wednesday; its week runs Mon Jun 15 - Sun Jun 21.
      expect(getThisWeekMeetingUrl(new Date(2026, 5, 17)).weekOf).toBe('June 15–21, 2026');
    });

    it('uses Monday even when the date is mid-week or Sunday', () => {
      const wed = getThisWeekMeetingUrl(new Date(2026, 5, 17));
      const sun = getThisWeekMeetingUrl(new Date(2026, 5, 21));
      const nextMon = getThisWeekMeetingUrl(new Date(2026, 5, 22));
      expect(wed.weekOf).toBe(sun.weekOf);
      expect(nextMon.weekOf).not.toBe(wed.weekOf);
      expect(nextMon.weekOf).toBe('June 22–28, 2026');
    });

    it('uses the local date, not UTC, for the boundary', () => {
      // 11pm local on Sunday stays in the same week.
      expect(getThisWeekMeetingUrl(new Date(2026, 5, 21, 23, 0)).weekOf).toBe('June 15–21, 2026');
    });

    it('names both months when the week spans two of them', () => {
      expect(getThisWeekMeetingUrl(new Date(2026, 5, 30)).weekOf).toBe('June 29 – July 5, 2026');
    });

    it('names both years when the week spans the year boundary', () => {
      expect(getThisWeekMeetingUrl(new Date(2025, 11, 31)).weekOf).toBe(
        'December 29, 2025 – January 4, 2026'
      );
    });

    it('carries no destination URL', () => {
      // The app ships no organisation links; the row's href is the user's.
      expect(getThisWeekMeetingUrl(new Date(2026, 5, 17)).url).toBeUndefined();
    });
  });

  describe('getTodayRow', () => {
    it('labels the configured weekend day', () => {
      // 2026-06-21 is a Sunday (the default weekend day).
      expect(getTodayRow(new Date(2026, 5, 21), {}, tEn).sub).toBe('habit.subPublicMeeting');
    });

    it('labels the configured midweek day as the meeting night', () => {
      // 2026-06-16 is a Tuesday (the default midweek day).
      const r = getTodayRow(new Date(2026, 5, 16), {}, tEn);
      expect(r.title).toBe('habit.tonight');
      expect(r.sub).toBe('habit.subMidweekMeeting');
    });

    it('labels Saturday as field service when it is not the weekend day', () => {
      expect(getTodayRow(new Date(2026, 5, 20), {}, tEn).sub).toBe('habit.subFieldService');
    });

    it('labels the surrounding days as meeting prep', () => {
      // 2026-06-17 is a Wednesday.
      expect(getTodayRow(new Date(2026, 5, 17), {}, tEn).sub).toBe('habit.subMidweekMeetingPrep');
    });

    it('honors a custom midweek day', () => {
      // Move midweek to Wednesday: that day becomes the meeting night.
      const wed = getTodayRow(new Date(2026, 5, 17), { midweekDay: 3 }, tEn);
      expect(wed.title).toBe('habit.tonight');
      expect(wed.sub).toBe('habit.subMidweekMeeting');
    });

    it('lets a custom weekend day win over the Saturday label', () => {
      const sat = getTodayRow(new Date(2026, 5, 20), { weekendDay: 6 }, tEn);
      expect(sat.sub).toBe('habit.subPublicMeeting');
    });

    it('coerces out-of-range day values to the defaults', () => {
      const r = getTodayRow(new Date(2026, 5, 16), { midweekDay: 99, weekendDay: -1 }, tEn);
      expect(r.title).toBe('habit.tonight');
    });

    it('carries no destination', () => {
      expect(getTodayRow(new Date(2026, 5, 17), {}, tEn).href).toBeUndefined();
    });

    it('returns null for an invalid date', () => {
      expect(getTodayRow(new Date('not-a-date'), {}, tEn)).toBeNull();
    });
  });
});
