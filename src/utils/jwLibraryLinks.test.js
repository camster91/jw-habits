import { describe, it, expect } from 'vitest';
import {
  BIBLE_BOOKS,
  JW_ORG_SECTIONS,
  getDailyTextLink,
  getBibleReadingLink,
  getMeetingWorkbookLink,
  getMemorialDate,
  getMemorialRow,
  getThisWeekMeetingUrl,
  getTodayRow,
  parseReadingToLink,
  getISOWeekString,
} from './jwLibraryLinks.js';

describe('jwLibraryLinks', () => {
  describe('BIBLE_BOOKS', () => {
    it('should have 66 books mapped (with psalm alias)', () => {
      const uniqueBookNumbers = new Set(Object.values(BIBLE_BOOKS));
      expect(uniqueBookNumbers.size).toBe(66);
    });

    it('should map genesis to 1', () => {
      expect(BIBLE_BOOKS['genesis']).toBe(1);
    });

    it('should map revelation to 66', () => {
      expect(BIBLE_BOOKS['revelation']).toBe(66);
    });

    it('should handle psalm and psalms aliases', () => {
      expect(BIBLE_BOOKS['psalm']).toBe(19);
      expect(BIBLE_BOOKS['psalms']).toBe(19);
    });
  });

  describe('JW_ORG_SECTIONS', () => {
    it('should have home URL', () => {
      expect(JW_ORG_SECTIONS.home).toBe('https://www.jw.org/en/');
    });

    it('should have all expected sections', () => {
      const expectedSections = [
        'home', 'news', 'whatsNew', 'library', 'magazines',
        'watchtowerStudy', 'awake', 'videos', 'broadcasting',
        'music', 'meetingWorkbooks', 'bibles', 'bibleTeachings', 'aboutUs'
      ];
      expectedSections.forEach(section => {
        expect(JW_ORG_SECTIONS[section]).toBeDefined();
        expect(JW_ORG_SECTIONS[section]).toContain('jw.org');
      });
    });
  });

  describe('getDailyTextLink', () => {
    it('should generate a jwlibrary:// deep link for the given date', () => {
      // Use the date Cam specified when requesting this URL format.
      const date = new Date(2026, 5, 17); // June 17, 2026 (monthIndex 5)
      const link = getDailyTextLink(date);

      // The daily text surface on jw.org's public web returns
      // 404 for any date-anchored URL. The supported deep link
      // is the jwlibrary:// scheme, registered by the official
      // JW Library app on Android and iOS. On the web (no app),
      // the link is a no-op — same trade-off as the Bible
      // reading row.
      expect(link).toBe(
        'jwlibrary:///showDailyText?wtlocale=E&date=20260617'
      );
    });

    it('should pad single-digit months and days', () => {
      // January 5, 2026 → date=20260105
      const date = new Date(2026, 0, 5);
      const link = getDailyTextLink(date);

      expect(link).toBe(
        'jwlibrary:///showDailyText?wtlocale=E&date=20260105'
      );
    });

    it('should always default to English (E) locale', () => {
      const date = new Date(2026, 5, 17);
      const link = getDailyTextLink(date);

      expect(link).toContain('wtlocale=E');
      expect(link).not.toContain('wtlocale=S');
    });

    it('should accept a custom locale parameter', () => {
      const date = new Date(2026, 5, 17);
      const linkS = getDailyTextLink(date, 'S');
      const linkF = getDailyTextLink(date, 'F');

      expect(linkS).toContain('wtlocale=S');
      expect(linkF).toContain('wtlocale=F');
    });

    it('should default to today when no date is passed', () => {
      const link = getDailyTextLink();
      // Just verify the format — the date is today.
      expect(link).toMatch(
        /^jwlibrary:\/\/\/showDailyText\?wtlocale=E&date=\d{8}$/
      );
    });

    it('should use the local date (not UTC) so the EDT user gets their day', () => {
      // An EDT user clicking "today's daily text" at 11pm local
      // on June 17 sees June 17's text, not June 18's UTC date.
      // This is what `getDate()`/`getMonth()` give us.
      const date = new Date(2026, 5, 17, 23, 0); // 11pm local June 17
      const link = getDailyTextLink(date);
      expect(link).toContain('date=20260617');
    });
  });

  describe('getBibleReadingLink', () => {
    it('should generate link for single chapter', () => {
      const link = getBibleReadingLink(1, 1); // Genesis 1

      expect(link).toBe('jwlibrary:///finder?wtlocale=E&bible=01001001-01001999&pub=nwtsty');
    });

    it('should generate link for chapter range', () => {
      const link = getBibleReadingLink(1, 1, 3); // Genesis 1-3

      expect(link).toBe('jwlibrary:///finder?wtlocale=E&bible=01001001-01003999&pub=nwtsty');
    });

    it('should handle double-digit book numbers', () => {
      const link = getBibleReadingLink(40, 1, 2); // Matthew 1-2

      expect(link).toContain('bible=40001001-40002999');
    });

    it('should use custom locale', () => {
      const link = getBibleReadingLink(1, 1, 1, 'S');

      expect(link).toContain('wtlocale=S');
    });
  });

  describe('getMeetingWorkbookLink', () => {
    it('should generate correct workbook link', () => {
      const link = getMeetingWorkbookLink('123456789');

      expect(link).toBe('jwlibrary:///finder?wtlocale=E&docid=123456789');
    });

    it('should use custom locale', () => {
      const link = getMeetingWorkbookLink('123456789', 'S');

      expect(link).toContain('wtlocale=S');
    });
  });

  describe('getThisWeekMeetingUrl', () => {
    it('returns a jw.org meeting-workbook URL for the ISO week containing the date', () => {
      // Today (2026-06-17, Wednesday) is in ISO week 25.
      // Week 25 of 2026: Mon Jun 15 – Sun Jun 21.
      const result = getThisWeekMeetingUrl(new Date(2026, 5, 17));
      expect(result).not.toBeNull();
      expect(result.url).toBe(
        'https://www.jw.org/en/library/jw-meeting-workbook/may-june-2026-mwb/' +
        'Life-and-Ministry-Meeting-Schedule-for-June-15-21-2026/'
      );
      expect(result.weekOf).toBe('June 15–21, 2026');
    });

    it('uses the Monday of the week even when the date is mid-week', () => {
      // June 17 (Wed) → Mon Jun 15
      const r1 = getThisWeekMeetingUrl(new Date(2026, 5, 17));
      // June 21 (Sun) → same week, Mon Jun 15
      const r2 = getThisWeekMeetingUrl(new Date(2026, 5, 21));
      // June 22 (Mon) → next week, Mon Jun 22
      const r3 = getThisWeekMeetingUrl(new Date(2026, 5, 22));
      expect(r1.url).toBe(r2.url);
      expect(r3.url).not.toBe(r1.url);
      // The week containing June 22: Mon Jun 22 - Sun Jun 28
      expect(r3.weekOf).toBe('June 22–28, 2026');
    });

    it('uses the Sunday of the week when the date is a Sunday', () => {
      // June 21, 2026 is a Sunday. Week 25 still covers Mon
      // Jun 15 - Sun Jun 21. URL segment: June-15-21-2026.
      const r = getThisWeekMeetingUrl(new Date(2026, 5, 21));
      expect(r.weekOf).toBe('June 15–21, 2026');
      expect(r.url).toContain('June-15-21-2026');
    });

    it('uses the local date for week boundaries (not UTC)', () => {
      // A user in EDT clicking the row at 11pm local on Sunday
      // June 21 should see the same-week URL, not the next
      // week's URL based on UTC. This is what local Date
      // arithmetic gives us.
      const lateSunday = new Date(2026, 5, 21, 23, 0);
      const r = getThisWeekMeetingUrl(lateSunday);
      expect(r.weekOf).toBe('June 15–21, 2026');
    });

    it('handles January 1 which is in week 1 of the new year', () => {
      // Jan 1, 2026 is a Thursday. ISO week 1 of 2026.
      const r = getThisWeekMeetingUrl(new Date(2026, 0, 1));
      expect(r.weekOf).toBe('December 29, 2025 – January 4, 2026');
    });

    it('handles cross-year December 31 in week 1 of the next year', () => {
      // Dec 31, 2025 is a Wednesday. ISO week 1 of 2026
      // (because Jan 1, 2026 is Thu).
      const r = getThisWeekMeetingUrl(new Date(2025, 11, 31));
      expect(r.weekOf).toBe('December 29, 2025 – January 4, 2026');
    });

    it('returns the correct MWB volume for each month of 2026', () => {
      // The volumes alternate 2 months each:
      // Jan-Feb (january-february), Mar-Apr (march-april),
      // May-Jun (may-june), Jul-Aug (july-august),
      // Sep-Oct (september-october), Nov-Dec (november-december).
      const cases = [
        [new Date(2026, 0, 15), 'january-february-2026-mwb'],
        [new Date(2026, 1, 15), 'january-february-2026-mwb'],
        [new Date(2026, 2, 15), 'march-april-2026-mwb'],
        [new Date(2026, 3, 15), 'march-april-2026-mwb'],
        [new Date(2026, 4, 15), 'may-june-2026-mwb'],
        [new Date(2026, 5, 15), 'may-june-2026-mwb'],
        [new Date(2026, 6, 15), 'july-august-2026-mwb'],
        [new Date(2026, 7, 15), 'july-august-2026-mwb'],
        [new Date(2026, 8, 15), 'september-october-2026-mwb'],
        [new Date(2026, 9, 15), 'september-october-2026-mwb'],
        [new Date(2026, 10, 15), 'november-december-2026-mwb'],
        [new Date(2026, 11, 15), 'november-december-2026-mwb'],
      ];
      for (const [date, expectedSlug] of cases) {
        const r = getThisWeekMeetingUrl(date);
        expect(r.url).toContain(`/jw-meeting-workbook/${expectedSlug}/`);
      }
    });
  });

  describe('parseReadingToLink', () => {
    it('should parse simple chapter range', () => {
      const link = parseReadingToLink('Genesis 1-3');

      expect(link).toContain('bible=01001001-01003999');
    });

    it('should parse single chapter', () => {
      const link = parseReadingToLink('Genesis 1');

      expect(link).toContain('bible=01001001-01001999');
    });

    it('should handle numbered books like 1 Samuel', () => {
      const link = parseReadingToLink('1 Samuel 1-2');

      expect(link).toContain('bible=09001001-09002999');
    });

    it('should handle books with slashes', () => {
      const link = parseReadingToLink('Obadiah/Jonah');

      expect(link).not.toBeNull();
      expect(link).toContain('bible=31');
    });

    it('should return null for completed readings', () => {
      expect(parseReadingToLink('Completed!')).toBeNull();
      expect(parseReadingToLink('Finished!')).toBeNull();
    });

    it('should return null for empty input', () => {
      expect(parseReadingToLink('')).toBeNull();
      expect(parseReadingToLink(null)).toBeNull();
    });

    it('should handle verse ranges like Psalm 119:64-176', () => {
      const link = parseReadingToLink('Psalm 119:64-176');

      expect(link).not.toBeNull();
      expect(link).toContain('bible=19119001-19119999');
    });

    it('should handle complex ranges with "to"', () => {
      const link = parseReadingToLink('Psalm 116 to Psalm 119:63');

      expect(link).not.toBeNull();
      expect(link).toContain('bible=19116001-19119999');
    });
  });

  describe('getISOWeekString', () => {
    it('should return correct ISO week string', () => {
      // January 20, 2026 is in week 4
      const date = new Date(2026, 0, 20);
      const weekString = getISOWeekString(date);

      expect(weekString).toMatch(/^\d{4}-W\d{2}$/);
    });

    it('should pad week numbers', () => {
      // First week of the year
      const date = new Date(2026, 0, 1);
      const weekString = getISOWeekString(date);

      expect(weekString).toMatch(/-W0\d$/);
    });
  });


  describe('getMemorialDate', () => {
    it('returns the published 2024 date (Sunday, March 24)', () => {
      const r = getMemorialDate(2024);
      expect(r).not.toBeNull();
      expect(r.date.getFullYear()).toBe(2024);
      expect(r.date.getMonth()).toBe(2); // March (0-indexed)
      expect(r.date.getDate()).toBe(24);
      expect(r.weekOf).toContain('Sunday');
      expect(r.weekOf).toContain('March 24');
    });

    it('returns the published 2026 date (Thursday, April 2)', () => {
      const r = getMemorialDate(2026);
      expect(r).not.toBeNull();
      expect(r.date.getMonth()).toBe(3); // April
      expect(r.date.getDate()).toBe(2);
      expect(r.weekOf).toContain('Thursday');
    });

    it('returns the published 2029 date (Thursday, March 29)', () => {
      const r = getMemorialDate(2029);
      expect(r).not.toBeNull();
      expect(r.date.getMonth()).toBe(2); // March
      expect(r.date.getDate()).toBe(29);
    });

    it('returns null for years outside the published table', () => {
      expect(getMemorialDate(2030)).toBeNull();
      expect(getMemorialDate(2023)).toBeNull();
      expect(getMemorialDate(1995)).toBeNull();
    });
  });

  describe('getMemorialRow', () => {
    it('is visible 30 days before the Memorial', () => {
      // 2026 Memorial is April 2. 30 days before = March 3.
      const r = getMemorialRow(new Date(2026, 2, 3), 2026);
      expect(r).not.toBeNull();
      expect(r.visible).toBe(true);
      expect(r.title).toBe('Memorial');
      expect(r.href).toBe('https://www.jw.org/en/jehovahs-witnesses/memorial/');
    });

    it('is visible on the day of the Memorial', () => {
      const r = getMemorialRow(new Date(2026, 3, 2), 2026);
      expect(r).not.toBeNull();
      expect(r.visible).toBe(true);
    });

    it('is hidden more than 30 days before the Memorial', () => {
      // 2026 Memorial is April 2. 31 days before = March 2.
      const r = getMemorialRow(new Date(2026, 2, 2), 2026);
      expect(r).toBeNull();
    });

    it('is hidden on January 1 (Memorial is in March/April)', () => {
      const r = getMemorialRow(new Date(2026, 0, 1), 2026);
      expect(r).toBeNull();
    });

    it('is hidden after the Memorial (in May)', () => {
      const r = getMemorialRow(new Date(2026, 4, 1), 2026);
      expect(r).toBeNull();
    });

    it('is visible for unknown years during March/April (e.g. 2030)', () => {
      // 2030 is not in the table. Without the date, we show
      // the row only in March/April as a heuristic.
      const mar = getMemorialRow(new Date(2030, 2, 15), 2030);
      const apr = getMemorialRow(new Date(2030, 3, 1), 2030);
      expect(mar).not.toBeNull();
      expect(apr).not.toBeNull();
      expect(mar.sub).toBe('See jw.org for the date');
    });

    it('is hidden for unknown years outside March/April', () => {
      const jan = getMemorialRow(new Date(2030, 0, 15), 2030);
      const may = getMemorialRow(new Date(2030, 4, 15), 2030);
      expect(jan).toBeNull();
      expect(may).toBeNull();
    });

    it('always points to the year-agnostic Memorial page', () => {
      const r = getMemorialRow(new Date(2026, 3, 2), 2026);
      expect(r.href).toBe('https://www.jw.org/en/jehovahs-witnesses/memorial/');
    });

    it('sub-text shows the actual Memorial date for known years', () => {
      const r = getMemorialRow(new Date(2026, 3, 1), 2026);
      expect(r.sub).toBe('Thursday, April 2, 2026');
    });
  });


  describe('getTodayRow', () => {
    it('returns "Tonight — Midweek Meeting" on Tuesday', () => {
      const r = getTodayRow(new Date(2026, 5, 16)); // June 16 = Tue
      expect(r).not.toBeNull();
      expect(r.title).toBe('Tonight');
      expect(r.sub).toBe('Midweek Meeting');
      expect(r.key).toBe('today');
    });

    it('returns "Today — Midweek Meeting Prep" on Monday, Wednesday, Thursday, Friday', () => {
      const monday = getTodayRow(new Date(2026, 5, 15));
      const wednesday = getTodayRow(new Date(2026, 5, 17));
      const thursday = getTodayRow(new Date(2026, 5, 18));
      const friday = getTodayRow(new Date(2026, 5, 19));
      for (const r of [monday, wednesday, thursday, friday]) {
        expect(r.title).toBe('Today');
        expect(r.sub).toBe('Midweek Meeting Prep');
      }
    });

    it('returns "Today — Public Meeting" on Sunday', () => {
      const r = getTodayRow(new Date(2026, 5, 21));
      expect(r.title).toBe('Today');
      expect(r.sub).toBe('Public Meeting + Watchtower Study');
    });

    it('returns "Today — Field Service" on Saturday', () => {
      const r = getTodayRow(new Date(2026, 5, 20));
      expect(r.title).toBe('Today');
      expect(r.sub).toBe('Field Service');
      expect(r.href).toContain('/en/jehovahs-witnesses/meetings/');
    });

    it('always points to a public jw.org URL (no jwlibrary://)', () => {
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const date = new Date(2026, 5, 15 + dayOffset); // Mon 15 through Sun 21
        const r = getTodayRow(date);
        expect(r.href).toMatch(/^https:\/\/www\.jw\.org\//);
      }
    });

    it('returns null for an invalid date', () => {
      const r = getTodayRow(new Date('not-a-date'));
      expect(r).toBeNull();
    });

    it('points to this week\'s MWB schedule on meeting-related days', () => {
      const monday = getTodayRow(new Date(2026, 5, 15));
      const tuesday = getTodayRow(new Date(2026, 5, 16));
      const wednesday = getTodayRow(new Date(2026, 5, 17));
      expect(monday.href).toBe(tuesday.href);
      expect(tuesday.href).toBe(wednesday.href);
      expect(monday.href).toContain('Life-and-Ministry-Meeting-Schedule-for-June-15-21-2026');
    });
  });
});
