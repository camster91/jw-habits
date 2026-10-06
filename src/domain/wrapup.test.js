import { describe, it, expect } from 'vitest';
import i18n from 'i18next';
import { isWrapUpTime, wrapUp } from './wrapup.js';
import { defaultStore } from './store.js';
import { ROUTINE_IDS } from './routines.js';
import { addDays } from './day.js';
import { BOOKS, chapterIndex } from './bible.js';

const t = i18n.t.bind(i18n);
const REST = "Rest well — tomorrow's a fresh start.";

/** Tuesday 2026-10-06 unless a date is given. */
const at = (h, m = 0, d = 6) => new Date(2026, 9, d, h, m);

function storeWith(on, patch = {}, from = '2026-10-01') {
  const s = defaultStore(from, 'en');
  s.schedule[0].enabled = Object.fromEntries(ROUTINE_IDS.map((id) => [id, on.includes(id)]));
  return { ...s, ...patch };
}
const log = (routine, day, value = true) => ({ routine, day, value });

describe('isWrapUpTime', () => {
  const store = (wrapUpTime) => ({ wrapUpTime });

  it('opens at the wrap-up time and runs through the 03:00 rollover', () => {
    const s = store('20:00');
    expect(isWrapUpTime(s, at(19, 59))).toBe(false);
    expect(isWrapUpTime(s, at(20, 0))).toBe(true);
    expect(isWrapUpTime(s, at(23, 30))).toBe(true);
    expect(isWrapUpTime(s, at(1, 0, 7))).toBe(true);
    expect(isWrapUpTime(s, at(2, 59, 7))).toBe(true);
    expect(isWrapUpTime(s, at(3, 0, 7))).toBe(false);
    expect(isWrapUpTime(s, at(12, 0))).toBe(false);
  });

  it('treats a wrap-up time of exactly 03:00 as a daytime hour', () => {
    const s = store('03:00');
    expect(isWrapUpTime(s, at(3, 0))).toBe(true);
    expect(isWrapUpTime(s, at(2, 0))).toBe(true);
  });

  it('after midnight but before 03:00, only counts from the wrap-up time', () => {
    const s = store('01:30');
    expect(isWrapUpTime(s, at(1, 29))).toBe(false);
    expect(isWrapUpTime(s, at(1, 30))).toBe(true);
    expect(isWrapUpTime(s, at(2, 59))).toBe(true);
    expect(isWrapUpTime(s, at(3, 0))).toBe(false);
    expect(isWrapUpTime(s, at(21, 0))).toBe(false);
  });
});

describe('wrapUp', () => {
  const three = ['dailyText', 'bibleReading', 'ministry'];

  it('is "some" at 21:00 with two of three done, listing the open one', () => {
    const store = storeWith(three, {
      log: [log('dailyText', '2026-10-06'), log('bibleReading', '2026-10-06')],
    });
    const r = wrapUp(store, at(21), t);
    expect(r.state).toBe('some');
    expect(r.done).toEqual(['dailyText', 'bibleReading']);
    expect(r.stillOpen).toEqual(['ministry']);
    expect(r.closingLine).toBeNull();
  });

  it('hides stillOpen and adds the closing line from 22:00', () => {
    const store = storeWith(three, {
      log: [log('dailyText', '2026-10-06'), log('bibleReading', '2026-10-06')],
    });
    const r = wrapUp(store, at(22, 30), t);
    expect(r.state).toBe('some');
    expect(r.stillOpen).toEqual([]);
    expect(r.closingLine).toBe(REST);
    // After midnight it is still the same app day.
    const late = wrapUp(store, at(1, 0, 7), t);
    expect(late.done).toEqual(['dailyText', 'bibleReading']);
    expect(late.stillOpen).toEqual([]);
    expect(late.closingLine).toBe(REST);
  });

  it('is "allDone" when everything due is done', () => {
    const store = storeWith(['dailyText'], { log: [log('dailyText', '2026-10-06')] });
    const r = wrapUp(store, at(21), t);
    expect(r.state).toBe('allDone');
    expect(r.stillOpen).toEqual([]);
    expect(r.closingLine).toBeNull();
  });

  it('is "none" with empty lists and the closing line when nothing was done', () => {
    const r = wrapUp(storeWith(three), at(21), t);
    expect(r).toMatchObject({
      state: 'none',
      done: [],
      moved: [],
      stillOpen: [],
      closingLine: REST,
    });
  });

  describe('moved', () => {
    it('reports bible reading chapters and books completed', () => {
      const genesis = Array.from({ length: BOOKS[0].chapters }, (_, i) => chapterIndex(1, i + 1));
      const store = storeWith(['bibleReading'], {
        reading: { plan: 'own', start: { book: 1, chapter: 1 }, countEarlierAsRead: false },
        log: [log('bibleReading', '2026-10-06', { chapters: genesis })],
      });
      const r = wrapUp(store, at(21), t);
      expect(r.moved).toEqual([{ id: 'bibleReading', text: '50 chapters · 1 of 66 books' }]);
    });

    it('includes "13 of 66 books" when 13 books are complete, and a singular chapter', () => {
      const store = storeWith(['bibleReading'], {
        reading: { plan: 'own', start: { book: 14, chapter: 1 }, countEarlierAsRead: true },
        log: [log('bibleReading', '2026-10-06', { chapters: [chapterIndex(14, 1)] })],
      });
      const [item] = wrapUp(store, at(21), t).moved;
      expect(item.text).toBe('1 chapter · 13 of 66 books');
      expect(item.text).toContain('13 of 66 books');
    });

    it('drops the chapter count for a legacy `true` entry', () => {
      const store = storeWith(['bibleReading'], {
        reading: { plan: 'own', start: { book: 14, chapter: 1 }, countEarlierAsRead: true },
        log: [log('bibleReading', '2026-10-06', true)],
      });
      expect(wrapUp(store, at(21), t).moved).toEqual([
        { id: 'bibleReading', text: '13 of 66 books' },
      ]);
    });

    it('reports personal study against the weekly target', () => {
      const store = storeWith(['personalStudy'], {
        log: [log('personalStudy', '2026-10-05'), log('personalStudy', '2026-10-06')],
      });
      expect(wrapUp(store, at(21), t).moved).toEqual([
        { id: 'personalStudy', text: '2 of 3 this week' },
      ]);
    });

    it('reports family worship and gives nothing for daily text or ministry', () => {
      const store = storeWith(['familyWorship', 'dailyText', 'ministry'], {
        log: [
          log('familyWorship', '2026-10-06'),
          log('dailyText', '2026-10-06'),
          log('ministry', '2026-10-06', { shared: true }),
        ],
      });
      store.schedule[0].familyWorshipDay = 2; // Tuesday
      const r = wrapUp(store, at(21), t);
      expect(r.done).toEqual(['dailyText', 'familyWorship', 'ministry']);
      expect(r.moved).toEqual([{ id: 'familyWorship', text: 'Done this week' }]);
    });

    it('reports meeting prep from recent meetings', () => {
      const store = storeWith(['meetingPrep'], { log: [log('meetingPrep', '2026-10-06')] });
      store.schedule[0].meetingDays = [3]; // Wednesday
      const r = wrapUp(store, at(21), t);
      expect(r.done).toEqual(['meetingPrep']);
      expect(r.moved).toHaveLength(1);
      expect(r.moved[0].text).toMatch(/^\d+ of the last \d+ meetings$/);
    });
  });

  describe('graceUsedToday', () => {
    const days = [];
    for (let d = '2026-09-01'; d <= '2026-10-04'; d = addDays(d, 1)) days.push(d);

    it('is true when yesterday closed on a grace day', () => {
      const store = storeWith(
        ['dailyText'],
        { log: [...days.map((d) => log('dailyText', d)), log('dailyText', '2026-10-06')] },
        '2026-09-01'
      );
      expect(wrapUp(store, at(21), t).graceUsedToday).toBe(true);
    });

    it('is false when yesterday was done', () => {
      const store = storeWith(
        ['dailyText'],
        {
          log: [
            ...days.map((d) => log('dailyText', d)),
            log('dailyText', '2026-10-05'),
            log('dailyText', '2026-10-06'),
          ],
        },
        '2026-09-01'
      );
      expect(wrapUp(store, at(21), t).graceUsedToday).toBe(false);
    });
  });
});
