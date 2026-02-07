import { describe, it, expect } from 'vitest';
import {
  BIBLE_BOOKS,
  JW_ORG_SECTIONS,
  getDailyTextLink,
  getBibleReadingLink,
  getMeetingWorkbookLink,
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
    it('should generate correct daily text link', () => {
      const date = new Date(2026, 0, 20); // January 20, 2026
      const link = getDailyTextLink(date);

      expect(link).toBe('jwlibrary:///finder?wtlocale=E&alias=daily-text&date=20260120');
    });

    it('should use custom locale', () => {
      const date = new Date(2026, 0, 20);
      const link = getDailyTextLink(date, 'S');

      expect(link).toContain('wtlocale=S');
    });

    it('should pad single digit months and days', () => {
      const date = new Date(2026, 0, 5); // January 5, 2026
      const link = getDailyTextLink(date);

      expect(link).toContain('date=20260105');
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
});
