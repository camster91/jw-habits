import { describe, it, expect } from 'vitest';
import { defaultStore, validateStore, newId } from './store.js';
import { newId as leafNewId } from './ids.js';
import {
  createPlan,
  generateChapters,
  generateLessons,
  generateBibleBook,
  generateWeekly,
  addStep,
  updateStep,
  moveStep,
  deleteStep,
  setStepDone,
  archivePlan,
  restorePlan,
  deletePlan,
  setActiveStudy,
  progress,
  nextStep,
  isFinished,
  finishedOn,
} from './plans.js';

const TODAY = '2026-10-07';
const fresh = () => defaultStore(TODAY, 'en');
const valid = (s) => expect(validateStore(s).ok).toBe(true);
const frozen = (s) => JSON.stringify(s);

function planWith(n, kind = 'study', store = fresh()) {
  const r = createPlan(store, { title: 'Plan', kind, steps: generateChapters(n) }, TODAY);
  return { ...r, plan: r.store.plans.find((p) => p.id === r.planId) };
}

describe('ids module', () => {
  it('store.js re-exports the same newId', () => {
    expect(newId).toBe(leafNewId);
  });
});

describe('generators', () => {
  it('chapters, lessons and weeks', () => {
    expect(generateChapters(3).map((s) => s.title)).toEqual([
      'Chapter 1',
      'Chapter 2',
      'Chapter 3',
    ]);
    expect(generateLessons(2)[1]).toEqual({
      title: 'Lesson 2',
      link: null,
      note: null,
      doneOn: null,
    });
    expect(generateWeekly(1)[0].title).toBe('Week 1');
  });

  it('Daniel gives 12 linked steps', () => {
    const steps = generateBibleBook(27, 'en');
    expect(steps).toHaveLength(12);
    expect(steps[0].title).toBe('Daniel 1');
    expect(steps[11].title).toBe('Daniel 12');
    expect(steps[0].link).toBe(
      'https://www.jw.org/finder?wtlocale=E&prefer=lang&bible=27001001&pub=nwtsty'
    );
    expect(steps[0]).not.toHaveProperty('id');
  });

  it('uses the locale code', () => {
    expect(generateBibleBook(27, 'fr')[0].link).toContain('wtlocale=F');
  });

  it('rejects n outside 1-200 and non-integers', () => {
    for (const bad of [0, -1, 201, 1.5, NaN, '3']) {
      expect(() => generateChapters(bad)).toThrow(RangeError);
    }
    expect(generateWeekly(200)).toHaveLength(200);
    expect(() => generateBibleBook(67, 'en')).toThrow(RangeError);
  });
});

describe('createPlan', () => {
  it('builds a valid plan with unique step ids across plans', () => {
    const a = planWith(3);
    const b = planWith(3, 'family', a.store);
    valid(b.store);
    expect(b.store.plans).toHaveLength(2);
    const ids = b.store.plans.flatMap((p) => p.steps.map((s) => s.id));
    expect(new Set(ids).size).toBe(6);
    expect(a.plan).toMatchObject({
      kind: 'study',
      colour: 0,
      icon: 'book',
      createdOn: TODAY,
      archivedOn: null,
    });
  });

  it('trims and truncates the title to 60', () => {
    const r = createPlan(fresh(), { title: '  ' + 'x'.repeat(80) + '  ', kind: 'study' }, TODAY);
    expect(r.store.plans[0].title).toBe('x'.repeat(60));
    valid(r.store);
  });

  it('refuses an empty title, bad kind, icon, colour or link', () => {
    const s = fresh();
    for (const bad of [
      { title: '   ', kind: 'study' },
      { title: 'a', kind: 'other' },
      { title: 'a', kind: 'study', icon: 'nope' },
      { title: 'a', kind: 'study', colour: 8 },
      { title: 'a', kind: 'study', steps: [{ title: 'b', link: 'javascript:alert(1)' }] },
    ]) {
      const r = createPlan(s, bad, TODAY);
      expect(r.planId).toBeNull();
      expect(r.store).toBe(s);
    }
  });
});

describe('step operations', () => {
  it('addStep appends with a fresh id and trims the title', () => {
    const { store, planId } = planWith(1);
    const next = addStep(store, planId, {
      title: ' ' + 'y'.repeat(70),
      link: 'https://example.com/a',
    });
    const steps = next.plans[0].steps;
    expect(steps).toHaveLength(2);
    expect(steps[1].title).toBe('y'.repeat(60));
    expect(steps[1].link).toBe('https://example.com/a');
    valid(next);
  });

  it('addStep refuses an empty title, unsafe link, unknown plan and the 201st step', () => {
    const { store, planId } = planWith(200);
    expect(addStep(store, planId, { title: 'z' })).toBe(store);
    const small = planWith(1);
    expect(addStep(small.store, small.planId, { title: ' ' })).toBe(small.store);
    expect(addStep(small.store, small.planId, { title: 'a', link: 'ftp://x' })).toBe(small.store);
    expect(addStep(small.store, 'nope', { title: 'a' })).toBe(small.store);
  });

  it('updateStep patches fields, truncates title and note', () => {
    const { store, planId, plan } = planWith(2);
    const id = plan.steps[0].id;
    const next = updateStep(store, planId, id, {
      title: 'q'.repeat(90),
      note: 'n'.repeat(400),
      link: 'https://example.com',
    });
    const st = next.plans[0].steps[0];
    expect(st.title).toHaveLength(60);
    expect(st.note).toHaveLength(280);
    expect(st.link).toBe('https://example.com');
    expect(next.plans[0].steps[1]).toBe(store.plans[0].steps[1]);
    valid(next);
    expect(updateStep(next, planId, id, { note: '  ' }).plans[0].steps[0].note).toBeNull();
    expect(updateStep(next, planId, id, { link: null }).plans[0].steps[0].link).toBeNull();
  });

  it('updateStep refuses an empty title or bad link', () => {
    const { store, planId, plan } = planWith(1);
    const id = plan.steps[0].id;
    expect(updateStep(store, planId, id, { title: '  ' })).toBe(store);
    expect(updateStep(store, planId, id, { link: 'javascript:1' })).toBe(store);
    expect(updateStep(store, planId, 'nope', { title: 'a' })).toBe(store);
  });

  it('moveStep reorders, clamps, and is a no-op at the ends', () => {
    const { store, planId, plan } = planWith(3);
    const [a, b, c] = plan.steps.map((s) => s.id);
    expect(moveStep(store, planId, a, -1)).toBe(store);
    expect(moveStep(store, planId, c, 1)).toBe(store);
    expect(moveStep(store, planId, a, 1).plans[0].steps.map((s) => s.id)).toEqual([b, a, c]);
    expect(moveStep(store, planId, a, 9).plans[0].steps.map((s) => s.id)).toEqual([b, c, a]);
    expect(moveStep(store, planId, c, -1).plans[0].steps.map((s) => s.id)).toEqual([a, c, b]);
    valid(moveStep(store, planId, a, 1));
  });

  it('deleteStep removes only that step', () => {
    const { store, planId, plan } = planWith(3);
    const next = deleteStep(store, planId, plan.steps[1].id);
    expect(next.plans[0].steps.map((s) => s.title)).toEqual(['Chapter 1', 'Chapter 3']);
    expect(deleteStep(store, planId, 'nope')).toBe(store);
    valid(next);
  });
});

describe('progress and finishing', () => {
  it('reports progress, next step, finished state', () => {
    const { store, planId, plan } = planWith(2);
    expect(progress(plan)).toEqual({ done: 0, total: 2 });
    expect(nextStep(plan).title).toBe('Chapter 1');
    const one = setStepDone(store, planId, plan.steps[0].id, '2026-10-05');
    expect(progress(one.plans[0])).toEqual({ done: 1, total: 2 });
    expect(nextStep(one.plans[0]).title).toBe('Chapter 2');
    expect(isFinished(one.plans[0])).toBe(false);
    expect(finishedOn(one.plans[0])).toBeNull();
    valid(one);
  });

  it('an empty plan is not finished', () => {
    const r = createPlan(fresh(), { title: 'Empty', kind: 'study' }, TODAY);
    expect(isFinished(r.store.plans[0])).toBe(false);
    expect(nextStep(r.store.plans[0])).toBeNull();
    expect(finishedOn(r.store.plans[0])).toBeNull();
  });

  it('doing the last step archives the plan on the latest doneOn and clears the active study', () => {
    const { store, planId, plan } = planWith(2);
    const active = setActiveStudy(store, planId);
    expect(active.activePlan.personalStudy).toBe(planId);
    // Done out of order: the latest doneOn wins, not the last one marked.
    let s = setStepDone(active, planId, plan.steps[1].id, '2026-10-06');
    s = setStepDone(s, planId, plan.steps[0].id, '2026-10-04');
    const p = s.plans[0];
    expect(isFinished(p)).toBe(true);
    expect(finishedOn(p)).toBe('2026-10-06');
    expect(p.archivedOn).toBe('2026-10-06');
    expect(s.activePlan.personalStudy).toBeNull();
    valid(s);
  });

  it('undoing the finishing step un-archives an auto-archived plan', () => {
    const { store, planId, plan } = planWith(1);
    const done = setStepDone(store, planId, plan.steps[0].id, TODAY);
    expect(done.plans[0].archivedOn).toBe(TODAY);
    const undone = setStepDone(done, planId, plan.steps[0].id, null);
    expect(undone.plans[0].archivedOn).toBeNull();
    expect(undone.plans[0].steps[0].doneOn).toBeNull();
    valid(undone);
  });

  it('undoing a step of a manually archived plan leaves it archived', () => {
    const { store, planId, plan } = planWith(2);
    let s = setStepDone(store, planId, plan.steps[0].id, TODAY);
    s = archivePlan(s, planId, '2026-10-09');
    s = setStepDone(s, planId, plan.steps[0].id, null);
    expect(s.plans[0].archivedOn).toBe('2026-10-09');
  });

  it('setStepDone with an unknown step is a no-op', () => {
    const { store, planId } = planWith(1);
    expect(setStepDone(store, planId, 'nope', TODAY)).toBe(store);
  });
});

describe('lifecycle', () => {
  it('archivePlan sets archivedOn and clears the active study, restorePlan does not re-activate', () => {
    const { store, planId } = planWith(2);
    const active = setActiveStudy(store, planId);
    const archived = archivePlan(active, planId, TODAY);
    expect(archived.plans[0].archivedOn).toBe(TODAY);
    expect(archived.activePlan.personalStudy).toBeNull();
    const restored = restorePlan(archived, planId);
    expect(restored.plans[0].archivedOn).toBeNull();
    expect(restored.activePlan.personalStudy).toBeNull();
    valid(restored);
    // archiving twice keeps the first day
    expect(archivePlan(archived, planId, '2026-11-01').plans[0].archivedOn).toBe(TODAY);
  });

  it('archiving some other plan leaves the active study alone', () => {
    const a = planWith(1);
    const b = planWith(1, 'study', a.store);
    const s = archivePlan(setActiveStudy(b.store, a.planId), b.planId, TODAY);
    expect(s.activePlan.personalStudy).toBe(a.planId);
  });

  it('deletePlan of the active study plan sets personalStudy to null', () => {
    const { store, planId } = planWith(2);
    const next = deletePlan(setActiveStudy(store, planId), planId);
    expect(next.plans).toHaveLength(0);
    expect(next.activePlan.personalStudy).toBeNull();
    valid(next);
    expect(deletePlan(store, 'nope')).toBe(store);
  });

  it('setActiveStudy accepts only an unarchived study plan, or null', () => {
    const study = planWith(1);
    const family = planWith(1, 'family', study.store);
    expect(setActiveStudy(family.store, family.planId)).toBe(family.store);
    expect(setActiveStudy(family.store, 'nope')).toBe(family.store);
    const archived = archivePlan(family.store, study.planId, TODAY);
    expect(setActiveStudy(archived, study.planId)).toBe(archived);
    const on = setActiveStudy(family.store, study.planId);
    expect(on.activePlan.personalStudy).toBe(study.planId);
    expect(setActiveStudy(on, null).activePlan.personalStudy).toBeNull();
    valid(on);
  });
});

describe('review fixes', () => {
  it('refuses a malformed step day in createPlan and setStepDone', () => {
    const s = fresh();
    for (const bad of ['yesterday', '2026-13-40', 5, '2026-10-7']) {
      const r = createPlan(
        s,
        { title: 'a', kind: 'study', steps: [{ title: 'b', doneOn: bad }] },
        TODAY
      );
      expect(r.planId).toBeNull();
      expect(r.store).toBe(s);
    }
    const { store, planId, plan } = planWith(2);
    for (const bad of [undefined, 'nope', '2026-02-30', 7]) {
      expect(setStepDone(store, planId, plan.steps[0].id, bad)).toBe(store);
    }
  });

  it('deleteStep archives a plan whose last undone step is deleted', () => {
    const { store, planId, plan } = planWith(2);
    let s = setStepDone(store, planId, plan.steps[0].id, '2026-10-05');
    s = setActiveStudy(s, planId);
    s = deleteStep(s, planId, plan.steps[1].id);
    expect(s.plans[0].archivedOn).toBe('2026-10-05');
    expect(s.activePlan.personalStudy).toBeNull();
    valid(s);
    // deleting the only step leaves an empty, unfinished plan: not archived
    const one = planWith(1);
    expect(deleteStep(one.store, one.planId, one.plan.steps[0].id).plans[0].archivedOn).toBeNull();
  });

  it('createPlan with every step done is born archived', () => {
    const steps = generateChapters(2).map((st, i) => ({
      ...st,
      doneOn: i ? '2026-10-06' : '2026-10-02',
    }));
    const r = createPlan(fresh(), { title: 'Done', kind: 'study', steps }, TODAY);
    expect(r.store.plans[0].archivedOn).toBe('2026-10-06');
    valid(r.store);
  });

  it('a finished plan can be restored and stays restored', () => {
    const { store, planId, plan } = planWith(1);
    const done = setStepDone(store, planId, plan.steps[0].id, TODAY);
    const back = restorePlan(done, planId);
    expect(back.plans[0].archivedOn).toBeNull();
    valid(back);
  });

  it('updateStep with a null or undefined patch is a no-op', () => {
    const { store, planId, plan } = planWith(1);
    expect(updateStep(store, planId, plan.steps[0].id, null)).toBe(store);
    expect(updateStep(store, planId, plan.steps[0].id, undefined)).toBe(store);
  });
});

describe('purity', () => {
  it('never mutates its input', () => {
    const { store, planId, plan } = planWith(3);
    const stepId = plan.steps[1].id;
    const before = frozen(store);
    const ops = [
      (s) => createPlan(s, { title: 'N', kind: 'family', steps: generateWeekly(2) }, TODAY).store,
      (s) => addStep(s, planId, { title: 'x' }),
      (s) => updateStep(s, planId, stepId, { title: 'renamed', note: 'n' }),
      (s) => moveStep(s, planId, stepId, -1),
      (s) => deleteStep(s, planId, stepId),
      (s) => setStepDone(s, planId, stepId, TODAY),
      (s) => archivePlan(s, planId, TODAY),
      (s) => restorePlan(archivePlan(s, planId, TODAY), planId),
      (s) => deletePlan(s, planId),
      (s) => setActiveStudy(s, planId),
    ];
    for (const op of ops) {
      const out = op(store);
      expect(frozen(store)).toBe(before);
      expect(out).not.toBe(store);
      valid(out);
    }
  });
});
