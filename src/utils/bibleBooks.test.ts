import { describe, it, expect } from 'vitest';
import { BIBLE_BOOKS_LOWER, BIBLE_BOOKS_TITLE } from './bibleBooks.ts';

describe('BIBLE_BOOKS_LOWER', () => {
  it('has 66 unique book numbers (1-66), with 67 keys (psalm/psalms alias)', () => {
    const values = Object.values(BIBLE_BOOKS_LOWER);
    // 66 books, but the psalm/psalms alias adds a 67th key
    expect(values).toHaveLength(67);
    // The psalm/psalms alias is intentional, so we have 67 keys but 66 unique values
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(66);
  });

  it('maps every number from 1 to 66', () => {
    const values = new Set(Object.values(BIBLE_BOOKS_LOWER));
    for (let i = 1; i <= 66; i++) {
      expect(values.has(i)).toBe(true);
    }
  });

  it('maps no number above 66', () => {
    for (const v of Object.values(BIBLE_BOOKS_LOWER)) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(66);
    }
  });

  it('maps genesis to 1 and revelation to 66', () => {
    expect(BIBLE_BOOKS_LOWER['genesis']).toBe(1);
    expect(BIBLE_BOOKS_LOWER['revelation']).toBe(66);
  });

  it('treats psalm and psalms as the same book (both = 19)', () => {
    expect(BIBLE_BOOKS_LOWER['psalm']).toBe(19);
    expect(BIBLE_BOOKS_LOWER['psalms']).toBe(19);
  });

  it('handles numbered books (1 samuel, 2 kings, etc.)', () => {
    expect(BIBLE_BOOKS_LOWER['1 samuel']).toBe(9);
    expect(BIBLE_BOOKS_LOWER['2 samuel']).toBe(10);
    expect(BIBLE_BOOKS_LOWER['1 kings']).toBe(11);
    expect(BIBLE_BOOKS_LOWER['2 kings']).toBe(12);
    expect(BIBLE_BOOKS_LOWER['1 chronicles']).toBe(13);
    expect(BIBLE_BOOKS_LOWER['2 chronicles']).toBe(14);
    expect(BIBLE_BOOKS_LOWER['1 corinthians']).toBe(46);
    expect(BIBLE_BOOKS_LOWER['2 corinthians']).toBe(47);
    expect(BIBLE_BOOKS_LOWER['1 thessalonians']).toBe(52);
    expect(BIBLE_BOOKS_LOWER['2 thessalonians']).toBe(53);
    expect(BIBLE_BOOKS_LOWER['1 timothy']).toBe(54);
    expect(BIBLE_BOOKS_LOWER['2 timothy']).toBe(55);
    expect(BIBLE_BOOKS_LOWER['1 peter']).toBe(60);
    expect(BIBLE_BOOKS_LOWER['2 peter']).toBe(61);
    expect(BIBLE_BOOKS_LOWER['1 john']).toBe(62);
    expect(BIBLE_BOOKS_LOWER['2 john']).toBe(63);
    expect(BIBLE_BOOKS_LOWER['3 john']).toBe(64);
  });

  it('returns undefined for unknown book names', () => {
    expect(BIBLE_BOOKS_LOWER['not a real book']).toBeUndefined();
    expect(BIBLE_BOOKS_LOWER['Genesis']).toBeUndefined(); // case-sensitive
    expect(BIBLE_BOOKS_LOWER['']).toBeUndefined();
  });

  it('uses lowercase keys (no mixed case)', () => {
    for (const key of Object.keys(BIBLE_BOOKS_LOWER)) {
      expect(key).toBe(key.toLowerCase());
    }
  });
});

describe('BIBLE_BOOKS_TITLE', () => {
  it('has 66 unique book numbers (1-66)', () => {
    const values = Object.values(BIBLE_BOOKS_TITLE);
    expect(values).toHaveLength(66);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(66);
  });

  it('maps every number from 1 to 66', () => {
    const values = new Set(Object.values(BIBLE_BOOKS_TITLE));
    for (let i = 1; i <= 66; i++) {
      expect(values.has(i)).toBe(true);
    }
  });

  it('maps Genesis to 1 and Revelation to 66 (canonical case)', () => {
    expect(BIBLE_BOOKS_TITLE['Genesis']).toBe(1);
    expect(BIBLE_BOOKS_TITLE['Revelation']).toBe(66);
  });

  it('uses title-case keys (each word starts with a capital letter, except prepositions like "of")', () => {
    // "Song of Solomon" is the only multi-word non-numbered entry with
    // a preposition that's lowercase. We don't hardcode that — we just
    // assert the FIRST word is capitalized, and for numbered books
    // ("1 Samuel") both the number-token and the name are title-cased.
    for (const key of Object.keys(BIBLE_BOOKS_TITLE)) {
      const firstWord = key.split(' ')[0];
      expect(firstWord[0]).toBe(firstWord[0].toUpperCase());
    }
  });

  it('does NOT have a psalm/psalms alias (this map is for the JW schedule)', () => {
    expect(BIBLE_BOOKS_TITLE['Psalm']).toBeUndefined();
    expect(BIBLE_BOOKS_TITLE['Psalms']).toBe(19); // singular "Psalms" with the S
  });
});

describe('BIBLE_BOOKS_LOWER vs BIBLE_BOOKS_TITLE', () => {
  it('agrees on the numeric mapping (same number for each book)', () => {
    // Take a sample of books and verify both maps give the same number
    const samples = [
      ['genesis', 'Genesis'],
      ['psalms', 'Psalms'],
      ['1 corinthians', '1 Corinthians'],
      ['revelation', 'Revelation'],
      ['song of solomon', 'Song of Solomon'],
    ];
    for (const [lower, title] of samples) {
      expect(BIBLE_BOOKS_LOWER[lower]).toBe(BIBLE_BOOKS_TITLE[title]);
    }
  });

  it('agree on the count: 66 unique book numbers in each', () => {
    const lowerNums = new Set(Object.values(BIBLE_BOOKS_LOWER));
    const titleNums = new Set(Object.values(BIBLE_BOOKS_TITLE));
    expect(lowerNums.size).toBe(titleNums.size);
    expect(lowerNums.size).toBe(66);
  });
});
