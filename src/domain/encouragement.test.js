import { describe, it, expect } from 'vitest';
import i18n from 'i18next';
import { WARM_LINES, REFERENCES, pickEncouragement } from './encouragement.js';
import { BOOKS, chapterIndex } from './bible.js';

const t = i18n.t.bind(i18n);

describe('WARM_LINES', () => {
  it('has 30 distinct lines, the same ones t() returns', () => {
    expect(WARM_LINES).toHaveLength(30);
    expect(new Set(WARM_LINES).size).toBe(30);
    expect(t('fd.encourage.warm', { returnObjects: true })).toEqual(WARM_LINES);
  });

  it('never uses words that shame', () => {
    for (const line of WARM_LINES) expect(line).not.toMatch(/missed|broke|failed|lost/i);
  });
});

describe('REFERENCES', () => {
  it('has about 60 entries, none repeated', () => {
    expect(REFERENCES.length).toBeGreaterThanOrEqual(60);
    const keys = REFERENCES.map((r) => `${r.book}:${r.chapter}:${r.verse}`);
    expect(new Set(keys).size).toBe(REFERENCES.length);
  });

  it('points every entry at a real chapter and a positive verse', () => {
    for (const { book, chapter, verse } of REFERENCES) {
      expect(BOOKS[book - 1], `book ${book}`).toBeDefined();
      expect(chapter).toBeGreaterThanOrEqual(1);
      expect(chapter).toBeLessThanOrEqual(BOOKS[book - 1].chapters);
      expect(Number.isInteger(verse) && verse >= 1).toBe(true);
      expect(chapterIndex(book, chapter)).toBeGreaterThanOrEqual(0);
    }
  });

  it('includes the well-known ones by book number', () => {
    const has = (b, c, v) =>
      REFERENCES.some((r) => r.book === b && r.chapter === c && r.verse === v);
    expect(has(19, 119, 105)).toBe(true); // Psalm 119:105
    expect(has(20, 3, 5)).toBe(true); // Proverbs 3:5
    expect(has(23, 40, 31)).toBe(true); // Isaiah 40:31
    expect(has(40, 6, 33)).toBe(true); // Matthew 6:33
    expect(has(50, 4, 13)).toBe(true); // Philippians 4:13
    expect(has(59, 4, 8)).toBe(true); // James 4:8
    expect(has(52, 5, 17)).toBe(true); // 1 Thessalonians 5:17
  });
});

describe('pickEncouragement', () => {
  it('gives nothing for quiet', () => {
    expect(pickEncouragement('quiet', 4, t)).toEqual({ text: null, ref: null });
  });

  it('gives a line and no reference for warm', () => {
    expect(pickEncouragement('warm', 4, t)).toEqual({ text: WARM_LINES[4], ref: null });
  });

  it('gives a line and a reference for scripture', () => {
    expect(pickEncouragement('scripture', 4, t)).toEqual({
      text: WARM_LINES[4],
      ref: REFERENCES[4],
    });
  });

  it('is deterministic and wraps by seed mod length', () => {
    expect(pickEncouragement('warm', 34, t).text).toBe(WARM_LINES[4]);
    expect(pickEncouragement('scripture', 3 + REFERENCES.length, t).ref).toBe(REFERENCES[3]);
    expect(pickEncouragement('warm', 0, t)).toEqual(pickEncouragement('warm', 0, t));
  });

  it('copes with a negative seed', () => {
    expect(WARM_LINES).toContain(pickEncouragement('warm', -1, t).text);
  });
});
