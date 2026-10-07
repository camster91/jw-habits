import { describe, it, expect } from 'vitest';
import { defaultStore, addCheckIn, removeCheckIn, BADGE_IDS } from './store.js';
import { createPlan, generateChapters, setStepDone } from './plans.js';
import { setAgenda } from './agenda.js';
import { addDays } from './day.js';
import { BOOKS, chapterIndex } from './bible.js';
import { BADGES, newlyEarned } from './badges.js';

const TODAY = '2026-10-07'; // Wednesday
const base = () => defaultStore('2020-01-01', 'en');
const rule = (id) => BADGES.find((b) => b.id === id).rule;
const log = (s, routine, day, value = true) => addCheckIn(s, { routine, day, value });
const daysBack = (n) => Array.from({ length: n }, (_, i) => addDays(TODAY, -i));
const withDays = (routine, n) => daysBack(n).reduce((s, d) => log(s, routine, d), base());
const mk = (store, n, kind = 'study') => {
  const r = createPlan(store, { title: 'P', kind, steps: generateChapters(n) }, TODAY);
  return { store: r.store, plan: r.store.plans.find((p) => p.id === r.planId) };
};
const finish = (store, plan) =>
  plan.steps.reduce((s, st) => setStepDone(s, plan.id, st.id, TODAY), store);
const readBooks = (store, from, to) => {
  let s = store;
  let day = 0;
  for (const b of BOOKS.filter((x) => x.n >= from && x.n <= to)) {
    const chapters = Array.from({ length: b.chapters }, (_, i) => chapterIndex(b.n, i + 1));
    s = log(s, 'bibleReading', addDays('2026-01-01', day++), { chapters }); // one entry per day
  }
  return s;
};
// One familyWorship entry in each of n consecutive weeks ending this week.
const withFamilyWeeks = (n) => {
  let s = base();
  for (let i = 0; i < n; i++) s = log(s, 'familyWorship', addDays('2026-10-05', -7 * i + 2));
  return s;
};

describe('BADGES', () => {
  it('has exactly the 18 store ids', () => {
    expect(BADGES.map((b) => b.id).sort()).toEqual([...BADGE_IDS].sort());
    expect(BADGES).toHaveLength(18);
  });

  it('firstStep: any step done on or before today', () => {
    const { store, plan } = mk(base(), 2);
    const done = (day) => setStepDone(store, plan.id, plan.steps[0].id, day);
    expect(rule('firstStep')(store, TODAY)).toBe(false);
    expect(rule('firstStep')(done(TODAY), TODAY)).toBe(true);
    expect(rule('firstStep')(done('2026-10-08'), TODAY)).toBe(false);
  });

  it('firstProject and firstFamilyPlan: a finished plan of that kind', () => {
    const study = mk(base(), 2);
    const part = setStepDone(study.store, study.plan.id, study.plan.steps[0].id, TODAY);
    expect(rule('firstProject')(part, TODAY)).toBe(false);
    const done = finish(study.store, study.plan);
    expect(done.plans[0].archivedOn).not.toBeNull();
    expect(rule('firstProject')(done, TODAY)).toBe(true);
    expect(rule('firstFamilyPlan')(done, TODAY)).toBe(false);
    const fam = mk(base(), 1, 'family');
    expect(rule('firstFamilyPlan')(fam.store, TODAY)).toBe(false);
    expect(rule('firstFamilyPlan')(finish(fam.store, fam.plan), TODAY)).toBe(true);
    expect(rule('firstProject')(finish(fam.store, fam.plan), TODAY)).toBe(false);
  });

  it('plans5: 5 finished plans of any kind', () => {
    let s = base();
    for (let i = 0; i < 5; i++) {
      const { store, plan } = mk(s, 1, i % 2 ? 'family' : 'study');
      s = finish(store, plan);
      expect(rule('plans5')(s, TODAY)).toBe(i === 4);
    }
  });

  it.each([
    ['familyWeeks4', 4],
    ['familyWeeks12', 12],
    ['familyWeeks52', 52],
  ])('%s counts distinct weeks', (id, n) => {
    expect(rule(id)(withFamilyWeeks(n), TODAY)).toBe(true);
    expect(rule(id)(withFamilyWeeks(n - 1), TODAY)).toBe(false);
  });

  it('familyWeeks: two sessions in one week count once', () => {
    const s = log(withFamilyWeeks(3), 'familyWorship', '2026-10-05');
    expect(rule('familyWeeks4')(s, TODAY)).toBe(false);
  });

  it.each([
    ['dailyText30', 30],
    ['dailyText100', 100],
    ['dailyText365', 365],
  ])('%s counts distinct days', (id, n) => {
    expect(rule(id)(withDays('dailyText', n), TODAY)).toBe(true);
    expect(rule(id)(withDays('dailyText', n - 1), TODAY)).toBe(false);
  });

  it('dailyText ignores days after today', () => {
    const s = log(withDays('dailyText', 29), 'dailyText', '2026-10-08');
    expect(rule('dailyText30')(s, TODAY)).toBe(false);
  });

  it('study10: 10 distinct personalStudy days', () => {
    expect(rule('study10')(withDays('personalStudy', 10), TODAY)).toBe(true);
    expect(rule('study10')(withDays('personalStudy', 9), TODAY)).toBe(false);
  });

  it('meetings10: meetingPrep streak of 10', () => {
    const meet = (n) => {
      const s = base();
      s.schedule[0].meetingDays = [0, 1, 2, 3, 4, 5, 6];
      return daysBack(n + 1)
        .slice(1)
        .reduce((acc, d) => log(acc, 'meetingPrep', d), s);
    };
    expect(rule('meetings10')(meet(10), TODAY)).toBe(true);
    // One occurrence of grace is spent before the first miss, so 8 done = streak 9.
    expect(rule('meetings10')(meet(8), TODAY)).toBe(false);
  });

  it('book badges need their whole range', () => {
    expect(rule('pentateuch')(readBooks(base(), 1, 5), TODAY)).toBe(true);
    expect(rule('pentateuch')(readBooks(base(), 1, 4), TODAY)).toBe(false);
    expect(rule('gospels')(readBooks(base(), 40, 43), TODAY)).toBe(true);
    expect(rule('gospels')(readBooks(base(), 40, 42), TODAY)).toBe(false);
    expect(rule('greekScriptures')(readBooks(base(), 40, 66), TODAY)).toBe(true);
    expect(rule('greekScriptures')(readBooks(base(), 40, 65), TODAY)).toBe(false);
    expect(rule('wholeBible')(readBooks(base(), 1, 66), TODAY)).toBe(true);
    expect(rule('wholeBible')(readBooks(base(), 1, 65), TODAY)).toBe(false);
  });

  it('firstFullFamilyWeek: a full week per the XP definition', () => {
    const MON = '2026-10-05';
    let s = setAgenda(base(), MON, [{ id: 'a', kind: 'free', title: 'Song', link: null }]);
    expect(rule('firstFullFamilyWeek')(s, TODAY)).toBe(false);
    s = log(s, 'familyWorship', '2026-10-07');
    expect(rule('firstFullFamilyWeek')(s, TODAY)).toBe(true);
    expect(rule('firstFullFamilyWeek')(s, '2026-10-06')).toBe(false);
  });

  it('level5: 1500 XP', () => {
    // Ten check-ins a day hit the 100 XP cap; 15 such days is 1500 = level 5.
    const build = (n) => {
      let s = base();
      for (let d = 0; d < n; d++) {
        for (let i = 0; i < 10; i++) s = log(s, 'r' + i, addDays('2026-09-01', d));
      }
      return s;
    };
    expect(rule('level5')(build(15), TODAY)).toBe(true);
    expect(rule('level5')(build(14), TODAY)).toBe(false);
  });
});

describe('newlyEarned', () => {
  it('lists earned ids not yet held', () => {
    const s = withDays('personalStudy', 10);
    expect(newlyEarned(s, TODAY)).toEqual(['study10']);
    expect(newlyEarned({ ...s, badges: { study10: '2026-10-01' } }, TODAY)).toEqual([]);
  });

  it('Review Focus 4: a held badge stays when undo makes its rule false', () => {
    const s = { ...withDays('personalStudy', 10), badges: { study10: TODAY } };
    const undone = removeCheckIn(s, 'personalStudy', TODAY);
    expect(rule('study10')(undone, TODAY)).toBe(false);
    expect(undone.badges.study10).toBe(TODAY);
    expect(newlyEarned(undone, TODAY)).toEqual([]);
  });
});
