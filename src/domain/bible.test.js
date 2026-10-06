import { describe, it, expect } from 'vitest';
import {
  BOOKS,
  chapterIndex,
  chapterAt,
  nextChapters,
  portionSize,
  booksCompleted,
  finderUrl,
} from './bible.js';

const reading = (over = {}) => ({
  plan: 'ownPace',
  start: { book: 1, chapter: 1 },
  startedOn: '2026-01-01',
  countEarlierAsRead: false,
  ...over,
});
const readLog = (...chapters) => [
  { routine: 'bibleReading', day: '2026-01-01', value: { chapters } },
];

describe('BOOKS', () => {
  it('has 66 books and 1189 chapters', () => {
    expect(BOOKS).toHaveLength(66);
    expect(BOOKS.map((b) => b.n)).toEqual(Array.from({ length: 66 }, (_, i) => i + 1));
    expect(BOOKS.reduce((s, b) => s + b.chapters, 0)).toBe(1189);
  });
  it('has known chapter counts', () => {
    expect(BOOKS[18]).toMatchObject({ name: 'Psalms', chapters: 150 });
    for (const n of [31, 57, 63, 64, 65]) expect(BOOKS[n - 1].chapters).toBe(1);
  });
});

describe('chapterIndex / chapterAt', () => {
  it('round-trips every chapter', () => {
    expect(chapterIndex(1, 1)).toBe(0);
    expect(chapterIndex(66, 22)).toBe(1188);
    for (let i = 0; i < 1189; i++) {
      const { book, chapter } = chapterAt(i);
      expect(chapterIndex(book, chapter)).toBe(i);
    }
  });
});

describe('portionSize', () => {
  it('year plan covers every chapter exactly once in 365 days', () => {
    const store = { reading: reading({ plan: 'year' }) };
    let total = 0;
    for (let k = 0; k < 365; k++) {
      const d = new Date(Date.UTC(2026, 0, 1 + k)).toISOString().slice(0, 10);
      const p = portionSize(store, d);
      expect([3, 4]).toContain(p);
      total += p;
    }
    expect(total).toBe(1189);
  });
  it('year plan repeats mod 365 and follows the formula', () => {
    const store = { reading: reading({ plan: 'year', startedOn: '2026-01-01' }) };
    expect(portionSize(store, '2027-01-01')).toBe(portionSize(store, '2026-01-01'));
    expect(portionSize(store, '2026-01-02')).toBe(Math.floor(2378 / 365) - Math.floor(1189 / 365));
  });
  it('ownPace is 1', () => {
    expect(portionSize({ reading: reading() }, '2026-03-03')).toBe(1);
  });
});

describe('nextChapters', () => {
  it('begins at the start chapter when nothing is read', () => {
    const store = { reading: reading({ start: { book: 19, chapter: 5 } }), log: [] };
    expect(nextChapters(store, 2)).toEqual([
      { book: 19, chapter: 5 },
      { book: 19, chapter: 6 },
    ]);
  });
  it('continues after the furthest chapter read, ignoring legacy true values', () => {
    const store = {
      reading: reading(),
      log: [
        ...readLog(chapterIndex(1, 3), chapterIndex(1, 1)),
        { routine: 'bibleReading', day: '2026-01-02', value: true },
        { routine: 'other', day: '2026-01-02', value: { chapters: [900] } },
      ],
    };
    expect(nextChapters(store, 2)).toEqual([
      { book: 1, chapter: 4 },
      { book: 1, chapter: 5 },
    ]);
  });
  it('measures furthest in plan order from the start, wrapping', () => {
    const store = {
      reading: reading({ start: { book: 66, chapter: 21 } }),
      log: readLog(chapterIndex(1, 2), chapterIndex(66, 22)),
    };
    expect(nextChapters(store, 2)).toEqual([
      { book: 1, chapter: 3 },
      { book: 1, chapter: 4 },
    ]);
  });
  it('wraps Revelation 22 to Genesis 1', () => {
    const store = { reading: reading({ start: { book: 66, chapter: 22 } }), log: [] };
    expect(nextChapters(store, 2)).toEqual([
      { book: 66, chapter: 22 },
      { book: 1, chapter: 1 },
    ]);
  });
});

describe('booksCompleted', () => {
  it('counts books with every chapter logged', () => {
    const all = Array.from({ length: 4 }, (_, i) => chapterIndex(8, i + 1));
    expect(booksCompleted({ reading: reading(), log: readLog(...all) })).toEqual([8]);
    expect(booksCompleted({ reading: reading(), log: readLog(...all.slice(1)) })).toEqual([]);
  });
  it('countEarlierAsRead adds whole books before the start, and toggling leaves the log alone', () => {
    const log = readLog(chapterIndex(19, 1));
    const on = {
      reading: reading({ start: { book: 19, chapter: 1 }, countEarlierAsRead: true }),
      log,
    };
    const done = booksCompleted(on);
    expect(done).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(done).not.toContain(19);
    const off = { reading: { ...on.reading, countEarlierAsRead: false }, log };
    expect(booksCompleted(off)).toEqual([]);
    expect(log).toEqual(readLog(chapterIndex(19, 1)));
  });
});

describe('finderUrl', () => {
  it('builds the English Psalms 1 link', () => {
    expect(finderUrl('en', 19, 1)).toBe(
      'https://www.jw.org/finder?wtlocale=E&prefer=lang&bible=19001001&pub=nwtsty'
    );
  });
  it('maps locales and falls back to E', () => {
    expect(finderUrl('es', 1, 1)).toContain('wtlocale=S');
    expect(finderUrl('fr', 66, 22)).toContain('wtlocale=F&prefer=lang&bible=66022001');
    expect(finderUrl('de', 1, 1)).toContain('wtlocale=E');
  });
});
