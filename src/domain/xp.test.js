import { describe, it, expect } from 'vitest';
import { defaultStore, addCheckIn, removeCheckIn } from './store.js';
import { createPlan, generateChapters, setStepDone } from './plans.js';
import { setAgenda, addFreeItem } from './agenda.js';
import { xpByDay, totalXp } from './xp.js';

const TODAY = '2026-10-07'; // Wednesday
const MON = '2026-10-05';
const base = () => defaultStore(TODAY, 'en');
const mk = (store, n, kind = 'study') => {
  const r = createPlan(store, { title: 'P', kind, steps: generateChapters(n) }, TODAY);
  return { store: r.store, plan: r.store.plans.find((p) => p.id === r.planId) };
};
const log = (s, routine, day, value = true) => addCheckIn(s, { routine, day, value });

describe('xpByDay', () => {
  it('one check-in and one step on a day gives 25', () => {
    let { store, plan } = mk(base(), 3);
    store = setStepDone(store, plan.id, plan.steps[0].id, TODAY);
    store = log(store, 'dailyText', TODAY);
    expect(xpByDay(store, TODAY)[TODAY]).toBe(25);
  });

  it('12 check-ins on a day give 100 (the cap)', () => {
    let s = base();
    for (let i = 0; i < 12; i++) s = log(s, 'r' + i, TODAY);
    expect(xpByDay(s, TODAY)[TODAY]).toBe(100);
    expect(totalXp(s, TODAY)).toBe(100);
  });

  it('a finished plan gives 100 on its finish day, archived or not', () => {
    let { store, plan } = mk(base(), 2);
    store = setStepDone(store, plan.id, plan.steps[0].id, '2026-10-01');
    store = setStepDone(store, plan.id, plan.steps[1].id, '2026-10-03');
    const x = xpByDay(store, TODAY);
    expect(x['2026-10-01']).toBe(15);
    expect(x['2026-10-03']).toBe(100); // 15 + 100 capped
  });

  it('days after today are ignored', () => {
    const s = log(base(), 'dailyText', '2026-10-08');
    expect(xpByDay(s, TODAY)['2026-10-08']).toBeUndefined();
    expect(totalXp(s, TODAY)).toBe(0);
  });

  it('Review Focus 4: check-in then undo the same day restores the XP', () => {
    const before = log(base(), 'dailyText', '2026-10-06');
    const t0 = totalXp(before, TODAY);
    const after = log(before, 'meetings', '2026-10-06');
    expect(totalXp(after, TODAY)).toBe(t0 + 10);
    expect(totalXp(removeCheckIn(after, 'meetings', '2026-10-06'), TODAY)).toBe(t0);
  });

  it('a day with nothing done reduces nothing', () => {
    const s = log(base(), 'dailyText', '2026-10-04');
    const a = totalXp(s, '2026-10-05');
    expect(totalXp(s, '2026-10-07')).toBe(a);
    expect(xpByDay(s, TODAY)['2026-10-06']).toBeUndefined();
  });

  describe('full family week', () => {
    const family = () => {
      let { store, plan } = mk(base(), 3, 'family');
      store = setAgenda(store, MON, [
        { id: 'a1', kind: 'step', planId: plan.id, stepId: plan.steps[0].id },
      ]);
      return { store, plan };
    };

    it('awards 25 on the session day when every step is done by then', () => {
      let { store, plan } = family();
      store = setStepDone(store, plan.id, plan.steps[0].id, TODAY);
      store = log(store, 'familyWorship', TODAY, { stepIds: [plan.steps[0].id] });
      // 10 check-in + 15 step + 25 week
      expect(xpByDay(store, TODAY)[TODAY]).toBe(50);
    });

    it('does not award when a step is not done', () => {
      const { store } = family();
      expect(xpByDay(log(store, 'familyWorship', TODAY), TODAY)[TODAY]).toBe(10);
    });

    it('does not award when the step was done after the session', () => {
      let { store, plan } = family();
      store = setStepDone(store, plan.id, plan.steps[0].id, TODAY);
      store = log(store, 'familyWorship', MON);
      expect(xpByDay(store, TODAY)[MON]).toBe(10);
    });

    it('free items count as done; legacy true value works; no stored agenda gives nothing', () => {
      let s = addFreeItem(base(), MON, { title: 'Song' });
      s = log(s, 'familyWorship', TODAY);
      expect(xpByDay(s, TODAY)[TODAY]).toBe(35);
      expect(xpByDay(log(base(), 'familyWorship', TODAY), TODAY)[TODAY]).toBe(10);
    });

    it('awards at most once a week, on the first qualifying session', () => {
      let s = addFreeItem(base(), MON, { title: 'Song' });
      s = log(s, 'familyWorship', '2026-10-06');
      s = log(s, 'familyWorship', TODAY);
      const x = xpByDay(s, TODAY);
      expect(x['2026-10-06']).toBe(35);
      expect(x[TODAY]).toBe(10);
    });
  });
});
