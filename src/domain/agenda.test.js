import { describe, it, expect } from 'vitest';
import { defaultStore, validateStore } from './store.js';
import { addDays, weekStart } from './day.js';
import { createPlan, generateChapters, deletePlan, setStepDone, archivePlan } from './plans.js';
import {
  agendaFor,
  autoFill,
  setAgenda,
  addFreeItem,
  removeAgendaItem,
  planWeeks,
  pruneAgendas,
  cleanReferences,
} from './agenda.js';

const TODAY = '2026-10-07'; // a Wednesday
const MON = '2026-10-05';
const NEXT = '2026-10-12';
const valid = (s) => expect(validateStore(s).ok).toBe(true);
const snap = (s) => JSON.stringify(s);

function withFamily(n, store = defaultStore(TODAY, 'en'), kind = 'family') {
  const r = createPlan(store, { title: 'P' + n, kind, steps: generateChapters(n) }, TODAY);
  return { store: r.store, plan: r.store.plans.find((p) => p.id === r.planId) };
}

const stepItem = (planId, stepId, id = 'i-' + stepId) => ({ id, kind: 'step', planId, stepId });
const preview = (plan, i = 0) => ({
  id: `preview-${plan.steps[i].id}`,
  kind: 'step',
  planId: plan.id,
  stepId: plan.steps[i].id,
});

describe('autoFill', () => {
  it('takes the next step of each of two active family plans, in creation order', () => {
    const a = withFamily(3);
    const b = withFamily(3, a.store);
    const items = autoFill(b.store, MON);
    expect(items).toEqual([preview(a.plan), preview(b.plan)]);
    valid({ ...b.store, familyAgendas: { [MON]: items } });
  });

  it('ignores study plans and archived plans, and caps at 3 plans', () => {
    let s = withFamily(2, undefined, 'study').store;
    const fam = [];
    for (let i = 0; i < 4; i += 1) {
      const r = withFamily(2, s);
      s = r.store;
      fam.push(r.plan);
    }
    expect(autoFill(s, MON).map((i) => i.planId)).toEqual(fam.slice(0, 3).map((p) => p.id));
    s = archivePlan(s, fam[0].id, TODAY);
    expect(autoFill(s, MON).map((i) => i.planId)).toEqual(fam.slice(1, 4).map((p) => p.id));
  });

  it("does not offer a step stored in next week's agenda this week", () => {
    const a = withFamily(3);
    const s = setAgenda(a.store, NEXT, [stepItem(a.plan.id, a.plan.steps[0].id)]);
    expect(autoFill(s, MON).map((i) => i.stepId)).toEqual([a.plan.steps[1].id]);
    // its own week still sees it: stored items of the requested week are not reserved
    expect(autoFill(s, NEXT).map((i) => i.stepId)).toEqual([a.plan.steps[0].id]);
  });

  it('skips done steps', () => {
    const a = withFamily(3);
    const s = setStepDone(a.store, a.plan.id, a.plan.steps[0].id, TODAY);
    expect(autoFill(s, MON).map((i) => i.stepId)).toEqual([a.plan.steps[1].id]);
  });

  it('is empty when every plan is out of unscheduled steps', () => {
    const a = withFamily(1);
    const s = setAgenda(a.store, NEXT, [stepItem(a.plan.id, a.plan.steps[0].id)]);
    expect(autoFill(s, MON)).toEqual([]);
  });
});

describe('agendaFor', () => {
  it('returns the preview when the week is not stored, without storing it', () => {
    const a = withFamily(2);
    const before = snap(a.store);
    expect(agendaFor(a.store, MON)).toEqual(autoFill(a.store, MON));
    expect(snap(a.store)).toBe(before);
  });

  it('returns stored items, even an empty array', () => {
    const a = withFamily(2);
    const s = setAgenda(a.store, MON, []);
    expect(s.familyAgendas[MON]).toEqual([]);
    expect(agendaFor(s, MON)).toEqual([]);
  });
});

describe('setAgenda and free items', () => {
  it('refuses a non-Monday key and caps at 5', () => {
    const s = defaultStore(TODAY, 'en');
    expect(setAgenda(s, '2026-10-07', [])).toBe(s);
    let cur = s;
    for (let i = 0; i < 5; i += 1) cur = addFreeItem(cur, MON, { title: 'T' + i, link: null });
    expect(cur.familyAgendas[MON]).toHaveLength(5);
    expect(addFreeItem(cur, MON, { title: 'six', link: null })).toBe(cur);
    const six = [...cur.familyAgendas[MON], { id: 'extra', kind: 'free', title: 'x', link: null }];
    expect(setAgenda(cur, MON, six).familyAgendas[MON]).toHaveLength(5);
    valid(cur);
  });

  it('adds a free item to a previewed week, storing the preview first', () => {
    const a = withFamily(2);
    const s = addFreeItem(a.store, MON, { title: '  Song  ', link: 'https://example.org/x' });
    const items = s.familyAgendas[MON];
    expect(items).toHaveLength(2);
    expect(items[0].kind).toBe('step');
    expect(items[0].id).not.toMatch(/^preview-/);
    expect(items[1]).toMatchObject({ kind: 'free', title: 'Song', link: 'https://example.org/x' });
    valid(s);
  });

  it('refuses bad titles and unsafe links', () => {
    const s = defaultStore(TODAY, 'en');
    expect(addFreeItem(s, MON, { title: '   ', link: null })).toBe(s);
    expect(addFreeItem(s, MON, { title: 'x'.repeat(61), link: null })).toBe(s);
    expect(addFreeItem(s, MON, { title: 'ok', link: 'javascript:alert(1)' })).toBe(s);
    expect(addFreeItem(s, MON, { title: 'ok', link: 'ftp://a.b/c' })).toBe(s);
    expect(addFreeItem(s, '2026-10-07', { title: 'ok', link: null })).toBe(s);
    expect(addFreeItem(s, MON, { title: 'x'.repeat(60) }).familyAgendas[MON][0].link).toBe(null);
  });

  it('setAgenda refuses items validateStore would reject (Codex P2) and blank free titles', () => {
    const s = defaultStore(TODAY, 'en');
    expect(setAgenda(s, MON, [{ id: 'x', kind: 'step', planId: '', stepId: '' }])).toBe(s);
    expect(setAgenda(s, MON, [{ id: 'x', kind: 'step', planId: 'p', stepId: '' }])).toBe(s);
    expect(setAgenda(s, MON, [{ id: 'x', kind: 'step', planId: '', stepId: 's' }])).toBe(s);
    expect(setAgenda(s, MON, [{ id: 'x', kind: 'free', title: '   ', link: null }])).toBe(s);
    expect(setAgenda(s, MON, [{ id: 'x', kind: 'step', planId: 'p', stepId: 's', extra: 1 }])).toBe(
      s
    );
    const ok = setAgenda(s, MON, [
      { id: 'x', kind: 'step', planId: 'p', stepId: 's' },
      { id: 'y', kind: 'free', title: 'Song', link: null },
    ]);
    expect(ok.familyAgendas[MON]).toHaveLength(2);
    valid(ok);
  });

  it('removes an item (storing the rest of a preview) and ignores unknown ids', () => {
    const a = withFamily(1);
    const b = withFamily(1, a.store);
    const s = removeAgendaItem(b.store, MON, `preview-${a.plan.steps[0].id}`);
    expect(s.familyAgendas[MON].map((i) => i.stepId)).toEqual([b.plan.steps[0].id]);
    valid(s);
    expect(removeAgendaItem(s, MON, 'nope')).toBe(s);
    const cleared = removeAgendaItem(s, MON, s.familyAgendas[MON][0].id);
    expect(cleared.familyAgendas[MON]).toEqual([]);
  });
});

describe('planWeeks', () => {
  it('is this Monday plus the next 8', () => {
    const w = planWeeks(TODAY);
    expect(w).toHaveLength(9);
    expect(w[0]).toBe(MON);
    expect(w[8]).toBe(addDays(MON, 56));
    expect(w.every((d) => weekStart(d) === d)).toBe(true);
  });
});

describe('pruneAgendas', () => {
  it('keeps free items within range and drops weeks outside it', () => {
    const base = defaultStore(TODAY, 'en');
    const free = [{ id: 'f1', kind: 'free', title: 'Song', link: null }];
    const keys = {
      [addDays(MON, -7 * 52)]: free,
      [addDays(MON, -7 * 53)]: free,
      [addDays(MON, 7 * 8)]: free,
      [addDays(MON, 7 * 9)]: free,
      [MON]: free,
    };
    const s = pruneAgendas({ ...base, familyAgendas: keys }, TODAY);
    expect(Object.keys(s.familyAgendas).sort()).toEqual(
      [addDays(MON, -7 * 52), MON, addDays(MON, 56)].sort()
    );
    expect(s.familyAgendas[MON]).toEqual(free);
    valid(s);
  });

  it('returns the same store when nothing is dropped', () => {
    const s = addFreeItem(defaultStore(TODAY, 'en'), MON, { title: 'a', link: null });
    expect(pruneAgendas(s, TODAY)).toBe(s);
  });
});

describe('cleanReferences (Review Focus 1)', () => {
  it('drops agenda items of a deleted plan and clears activePlan', () => {
    const study = withFamily(2, undefined, 'study');
    const fam = withFamily(2, study.store);
    let s = { ...fam.store, activePlan: { personalStudy: study.plan.id } };
    s = setAgenda(s, MON, [
      stepItem(fam.plan.id, fam.plan.steps[0].id),
      { id: 'free1', kind: 'free', title: 'Song', link: null },
      stepItem(study.plan.id, study.plan.steps[0].id),
    ]);
    const gone = deletePlan(s, study.plan.id);
    // deletePlan clears the pointer itself; a stale save could still carry it.
    const dangling = { ...gone, activePlan: { personalStudy: study.plan.id } };
    const cleaned = cleanReferences(dangling);
    expect(cleaned.activePlan.personalStudy).toBe(null);
    expect(cleaned.familyAgendas[MON].map((i) => i.id)).toEqual([
      `i-${fam.plan.steps[0].id}`,
      'free1',
    ]);
    valid(cleaned);

    const famGone = cleanReferences(deletePlan(s, fam.plan.id));
    expect(famGone.familyAgendas[MON].map((i) => i.id)).toEqual([
      'free1',
      `i-${study.plan.steps[0].id}`,
    ]);
    valid(famGone);
  });

  it('drops an item whose step was deleted but keeps the plan', () => {
    const fam = withFamily(2);
    const s = setAgenda(fam.store, MON, [stepItem(fam.plan.id, 'ghost')]);
    expect(cleanReferences(s).familyAgendas[MON]).toEqual([]);
  });

  it('returns the same store when nothing dangles', () => {
    const fam = withFamily(2);
    const clean = setAgenda(fam.store, MON, [stepItem(fam.plan.id, fam.plan.steps[0].id)]);
    expect(cleanReferences(clean)).toBe(clean);
  });
});
