import { describe, it, expect } from 'vitest';
import en from '../locales/en.json';
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
  getCurrentYearTextUrl,
} from './jwLibraryLinks.js';

// Build an English t() function from the en locale JSON.
// Functions in jwLibraryLinks now return i18n keys (when no t
// is passed the default identity returns the key unchanged;
// passing this English translator makes them return the
// English strings, preserving all existing test expectations).
function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null && !Array.isArray(v)
      ? flatten(v, prefix ? `${prefix}.${k}` : k)
      : [[prefix ? `${prefix}.${k}` : k, v]]
  );
}
const ENGLISH = Object.fromEntries(flatten(en));
const tEn = (k) => (k in ENGLISH ? ENGLISH[k] : k);
// Set the active language to English so getThisWeekMeetingUrl
// + getMemorialDate (which read window.__jw_lang for the
// date formatter locale) produce English output.
if (typeof window !== 'undefined') window.__jw_lang = 'en';

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
      // jw.org puts this week in the November-December 2025 volume
      // with year-on-each-end in the URL segment.
      expect(r.url).toBe(
        'https://www.jw.org/en/library/jw-meeting-workbook/november-december-2025-mwb/' +
        'Life-and-Ministry-Meeting-Schedule-for-December-29-2025-January-4-2026/'
      );
    });

    it('emits the end-month name when the ISO week spans two months (URL)', () => {
      // 2026-06-30 (Tue) is in the week Mon Jun 29 – Sun Jul 5.
      // jw.org requires the end-month name in the URL segment
      // for cross-month weeks — omitting it returns 404.
      // Verified: curl returns 200 for
      //   may-june-2026-mwb/Life-and-Ministry-Meeting-Schedule-for-June-29-July-5-2026/
      // and 404 for
      //   may-june-2026-mwb/Life-and-Ministry-Meeting-Schedule-for-June-29-05-2026/
      const r = getThisWeekMeetingUrl(new Date(2026, 5, 30));
      expect(r.url).toBe(
        'https://www.jw.org/en/library/jw-meeting-workbook/may-june-2026-mwb/' +
        'Life-and-Ministry-Meeting-Schedule-for-June-29-July-5-2026/'
      );
      expect(r.weekOf).toBe('June 29 – July 5, 2026');
    });

    it('emits the end-month name when the ISO week spans two months (boundary days)', () => {
      // The week Mon Jun 29 – Sun Jul 5 contains:
      //   Mon Jun 29 (start), Wed Jul 1 (mid-month), Sun Jul 5 (end).
      // All three must produce the same URL.
      const start = getThisWeekMeetingUrl(new Date(2026, 5, 29));
      const mid = getThisWeekMeetingUrl(new Date(2026, 6, 1));
      const end = getThisWeekMeetingUrl(new Date(2026, 6, 5));
      expect(start.url).toBe(mid.url);
      expect(mid.url).toBe(end.url);
      expect(start.url).toContain('June-29-July-5-2026');
    });

    it('omits the end-month name when both week endpoints fall in the same month', () => {
      // Regression guard: cross-month change must not alter
      // same-month URLs. Mon Jun 15 – Sun Jun 21.
      const r = getThisWeekMeetingUrl(new Date(2026, 5, 17));
      expect(r.url).toContain('June-15-21-2026');
      expect(r.url).not.toContain('July');
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
      const r = getMemorialRow(new Date(2026, 2, 3), 2026, tEn);
      expect(r).not.toBeNull();
      expect(r.visible).toBe(true);
      expect(r.title).toBe('Memorial');
      expect(r.href).toBe('https://www.jw.org/en/jehovahs-witnesses/memorial/');
    });

    it('is visible on the day of the Memorial', () => {
      const r = getMemorialRow(new Date(2026, 3, 2), 2026, tEn);
      expect(r).not.toBeNull();
      expect(r.visible).toBe(true);
    });

    it('is hidden more than 30 days before the Memorial', () => {
      // 2026 Memorial is April 2. 31 days before = March 2.
      const r = getMemorialRow(new Date(2026, 2, 2), 2026, tEn);
      expect(r).toBeNull();
    });

    it('is hidden on January 1 (Memorial is in March/April)', () => {
      const r = getMemorialRow(new Date(2026, 0, 1), 2026, tEn);
      expect(r).toBeNull();
    });

    it('is hidden after the Memorial (in May)', () => {
      const r = getMemorialRow(new Date(2026, 4, 1), 2026, tEn);
      expect(r).toBeNull();
    });

    it('is visible for unknown years during March/April (e.g. 2030)', () => {
      // 2030 is not in the table. Without the date, we show
      // the row only in March/April as a heuristic.
      const mar = getMemorialRow(new Date(2030, 2, 15), 2030, tEn);
      const apr = getMemorialRow(new Date(2030, 3, 1), 2030, tEn);
      expect(mar).not.toBeNull();
      expect(apr).not.toBeNull();
      expect(mar.sub).toBe('See jw.org for the date');
    });

    it('is hidden for unknown years outside March/April', () => {
      const jan = getMemorialRow(new Date(2030, 0, 15), 2030, tEn);
      const may = getMemorialRow(new Date(2030, 4, 15), 2030, tEn);
      expect(jan).toBeNull();
      expect(may).toBeNull();
    });

    it('always points to the year-agnostic Memorial page', () => {
      const r = getMemorialRow(new Date(2026, 3, 2), 2026, tEn);
      expect(r.href).toBe('https://www.jw.org/en/jehovahs-witnesses/memorial/');
    });

    it('sub-text shows the actual Memorial date for known years', () => {
      const r = getMemorialRow(new Date(2026, 3, 1), 2026, tEn);
      expect(r.sub).toBe('Thursday, April 2, 2026');
    });
  });


  describe('getTodayRow', () => {
    it('returns "Tonight — Midweek Meeting" on Tuesday', () => {
      const r = getTodayRow(new Date(2026, 5, 16), {}, tEn); // June 16 = Tue
      expect(r).not.toBeNull();
      expect(r.title).toBe('Tonight');
      expect(r.sub).toBe('Midweek Meeting');
      expect(r.key).toBe('today');
    });

    it('returns "Today — Midweek Meeting Prep" on Monday, Wednesday, Thursday, Friday', () => {
      const monday = getTodayRow(new Date(2026, 5, 15), {}, tEn);
      const wednesday = getTodayRow(new Date(2026, 5, 17), {}, tEn);
      const thursday = getTodayRow(new Date(2026, 5, 18), {}, tEn);
      const friday = getTodayRow(new Date(2026, 5, 19), {}, tEn);
      for (const r of [monday, wednesday, thursday, friday]) {
        expect(r.title).toBe('Today');
        expect(r.sub).toBe('Midweek Meeting Prep');
      }
    });

    it('returns "Today — Public Meeting" on Sunday', () => {
      const r = getTodayRow(new Date(2026, 5, 21), {}, tEn);
      expect(r.title).toBe('Today');
      expect(r.sub).toBe('Public Meeting + Watchtower Study');
    });

    it('returns "Today — Field Service" on Saturday', () => {
      const r = getTodayRow(new Date(2026, 5, 20), {}, tEn);
      expect(r.title).toBe('Today');
      expect(r.sub).toBe('Field Service');
      expect(r.href).toContain('/en/jehovahs-witnesses/meetings/');
    });

    it('always points to a public jw.org URL (no jwlibrary://)', () => {
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const date = new Date(2026, 5, 15 + dayOffset); // Mon 15 through Sun 21
        const r = getTodayRow(date, {}, tEn);
        expect(r.href).toMatch(/^https:\/\/www\.jw\.org\//);
      }
    });

    it('returns null for an invalid date', () => {
      const r = getTodayRow(new Date('not-a-date'), {}, tEn);
      expect(r).toBeNull();
    });

    it('points to this week\'s MWB schedule on meeting-related days', () => {
      const monday = getTodayRow(new Date(2026, 5, 15), {}, tEn);
      const tuesday = getTodayRow(new Date(2026, 5, 16), {}, tEn);
      const wednesday = getTodayRow(new Date(2026, 5, 17), {}, tEn);
      expect(monday.href).toBe(tuesday.href);
      expect(tuesday.href).toBe(wednesday.href);
      expect(monday.href).toContain('Life-and-Ministry-Meeting-Schedule-for-June-15-21-2026');
    });

    it('honors a custom midweekDay setting', () => {
      // Move the midweek meeting to Wednesday. June 17 2026
      // is Wednesday, so on that day the row should now be
      // "Tonight — Midweek Meeting" (was "Midweek Meeting Prep"
      // with the default Tuesday schedule).
      const wednesdayMeeting = getTodayRow(new Date(2026, 5, 17), { midweekDay: 3 }, tEn);
      expect(wednesdayMeeting.title).toBe('Tonight');
      expect(wednesdayMeeting.sub).toBe('Midweek Meeting');
      // The day after the new meeting day (Thursday) should
      // now read as "Midweek Meeting Prep" for next week.
      const thursdayAfter = getTodayRow(new Date(2026, 5, 18), { midweekDay: 3 }, tEn);
      expect(thursdayAfter.sub).toBe('Midweek Meeting Prep');
    });

    it('honors a custom weekendDay setting', () => {
      // Move the weekend meeting to Saturday. But the function
      // treats Saturday (dow=6) as a fixed "Field Service" day
      // regardless of the user's weekendDay — Saturday is
      // culturally the JW field-service day, not configurable.
      // So setting weekendDay=6 leaves the Saturday copy as
      // "Field Service".
      const saturday = getTodayRow(new Date(2026, 5, 20), { weekendDay: 6 }, tEn);
      expect(saturday.sub).toBe('Field Service');

      // Move it to Friday instead — uncommon but valid. Now
      // Friday is the weekend meeting day, and the day before
      // (Thursday) is the prep day, but Thursday falls into
      // the default "Midweek Meeting Prep" branch (it's not
      // Saturday). So Thursday still shows "Midweek Meeting
      // Prep" copy because that's the more useful signal.
      // The Friday copy should be the weekend-meeting copy.
      const fridayMeeting = getTodayRow(new Date(2026, 5, 19), { weekendDay: 5 }, tEn);
      expect(fridayMeeting.sub).toBe('Public Meeting + Watchtower Study');
    });

    it('coerces out-of-range day values to defaults', () => {
      // midweekDay: 99 → falls back to default (Tuesday = 2).
      // On Tuesday June 16, row should still be "Tonight".
      const r = getTodayRow(new Date(2026, 5, 16), { midweekDay: 99, weekendDay: -1 }, tEn);
      expect(r.title).toBe('Tonight');
      expect(r.sub).toBe('Midweek Meeting');
    });

    it('falls back to defaults when settings object is empty', () => {
      // No settings arg at all — same as {}.
      const r1 = getTodayRow(new Date(2026, 5, 16), {}, tEn);
      const r2 = getTodayRow(new Date(2026, 5, 16), {}, tEn);
      expect(r1.title).toBe(r2.title);
      expect(r1.sub).toBe(r2.sub);
    });
  });

  describe('getCurrentYearTextUrl', () => {
    it('returns the year-specific brochure URL for known years', () => {
      // 2024, 2025, 2026 are in the known set (verified 200 OK
      // against jw.org on 2026-07-01).
      const r2024 = getCurrentYearTextUrl(new Date(2024, 5, 15));
      expect(r2024.year).toBe(2024);
      expect(r2024.known).toBe(true);
      expect(r2024.url).toBe('https://www.jw.org/en/library/brochures/Examining-the-Scriptures-Daily-2024/');

      const r2026 = getCurrentYearTextUrl(new Date(2026, 6, 1));
      expect(r2026.year).toBe(2026);
      expect(r2026.known).toBe(true);
      expect(r2026.url).toBe('https://www.jw.org/en/library/brochures/Examining-the-Scriptures-Daily-2026/');
    });

    it('falls back to the generic brochures landing for unknown years', () => {
      // 2027 returns 404 today (brochure not yet published). The
      // function should NOT link to a 404 — it falls back to the
      // brochures landing which always lists the latest available.
      const r2027 = getCurrentYearTextUrl(new Date(2027, 0, 1));
      expect(r2027.year).toBe(2027);
      expect(r2027.known).toBe(false);
      expect(r2027.url).toBe('https://www.jw.org/en/library/brochures/');

      const r2030 = getCurrentYearTextUrl(new Date(2030, 11, 31));
      expect(r2030.known).toBe(false);
      expect(r2030.url).toBe('https://www.jw.org/en/library/brochures/');
    });

    it('does not include any verse text or scripture reference in the URL', () => {
      // ToS guard: the URL must be a generic year-brochure slug,
      // never a verse-anchored URL. (Verse-anchored URLs would
      // display content on click — we link out instead.)
      const r = getCurrentYearTextUrl(new Date(2026, 0, 1));
      expect(r.url).not.toMatch(/bible=\d+/);
      expect(r.url).not.toMatch(/verse/i);
      expect(r.url).not.toMatch(/scripture=/i);
    });
  });
});
