import { describe, it, expect } from 'vitest';
import { defaultStore, validateStore, addCheckIn } from './store.js';
import {
  createPlan,
  generateChapters,
  setActiveStudy,
  setStepDone,
  updateStep,
  moveStep,
} from './plans.js';
import { agendaFor, setAgenda } from './agenda.js';
import {
  checkInStudy,
  undoStudy,
  checkInFamily,
  undoFamily,
  todaysStudyStep,
} from './planCheckins.js';

const TODAY = '2026-10-07'; // a Wednesday
const MON = '2026-10-05';
const NEXT_MON = '2026-10-12';
const valid = (s) => expect(validateStore(s).ok).toBe(true);
const clone = (s) => JSON.parse(JSON.stringify(s));

function withPlan(n, kind = 'study', store = defaultStore(TODAY, 'en')) {
  const r = createPlan(store, { title: 'P' + n, kind, steps: generateChapters(n) }, TODAY);
  return { store: r.store, planId: r.planId };
}
const planOf = (store, planId) => store.plans.find((p) => p.id === planId);
const stepOf = (store, planId, i) => planOf(store, planId).steps[i];
const entry = (store, routine, day) =>
  store.log.find((e) => e.routine === routine && e.day === day);

function activeStudy(n = 3) {
  const { store, planId } = withPlan(n);
  return { store: setActiveStudy(store, planId), planId };
}

describe('checkInStudy', () => {
  it('logs {stepId} and sets that step done on the day', () => {
    const { store, planId } = activeStudy();
    const b = stepOf(store, planId, 1).id;
    const next = checkInStudy(store, TODAY, b);
    expect(entry(next, 'personalStudy', TODAY).value).toEqual({ stepId: b });
    expect(stepOf(next, planId, 1).doneOn).toBe(TODAY);
    expect(stepOf(next, planId, 0).doneOn).toBeNull();
    valid(next);
  });

  it('with null logs true and touches no plan', () => {
    const { store } = activeStudy();
    const next = checkInStudy(store, TODAY, null);
    expect(entry(next, 'personalStudy', TODAY).value).toBe(true);
    expect(next.plans).toEqual(store.plans);
    valid(next);
  });

  it('does not mutate its input', () => {
    const { store, planId } = activeStudy();
    const before = clone(store);
    checkInStudy(store, TODAY, stepOf(store, planId, 0).id);
    expect(store).toEqual(before);
  });

  it('logs true for an unknown step or a family step', () => {
    const { store } = activeStudy();
    expect(entry(checkInStudy(store, TODAY, 'nope'), 'personalStudy', TODAY).value).toBe(true);
    const fam = withPlan(2, 'family', store);
    const next = checkInStudy(fam.store, TODAY, stepOf(fam.store, fam.planId, 0).id);
    expect(entry(next, 'personalStudy', TODAY).value).toBe(true);
    expect(planOf(next, fam.planId)).toEqual(planOf(fam.store, fam.planId));
  });

  it('logs true (and leaves the date alone) for a step already done on another day', () => {
    const { store, planId } = activeStudy();
    const a = stepOf(store, planId, 0).id;
    const marked = setStepDone(store, planId, a, '2026-10-01');
    const next = checkInStudy(marked, TODAY, a);
    expect(entry(next, 'personalStudy', TODAY).value).toBe(true);
    expect(stepOf(next, planId, 0).doneOn).toBe('2026-10-01');
    expect(undoStudy(next, TODAY)).toEqual(marked);
  });

  it('logs true and ticks nothing for a step of a study plan that is not active', () => {
    const { store: s0 } = activeStudy();
    const other = withPlan(2, 'study', s0);
    const next = checkInStudy(other.store, TODAY, stepOf(other.store, other.planId, 0).id);
    expect(entry(next, 'personalStudy', TODAY).value).toBe(true);
    expect(next.plans).toEqual(other.store.plans);
    const none = withPlan(2);
    const idle = checkInStudy(none.store, TODAY, stepOf(none.store, none.planId, 0).id);
    expect(entry(idle, 'personalStudy', TODAY).value).toBe(true);
    expect(idle.plans).toEqual(none.store.plans);
    valid(next);
    expect(undoStudy(next, TODAY)).toEqual(other.store);
  });

  it('refuses an invalid day', () => {
    const { store, planId } = activeStudy();
    expect(checkInStudy(store, '2026-02-30', stepOf(store, planId, 0).id)).toBe(store);
  });

  it('a second check-in on the same day replaces the first, and undo restores the start', () => {
    const { store, planId } = activeStudy();
    const once = checkInStudy(store, TODAY, stepOf(store, planId, 0).id);
    const twice = checkInStudy(once, TODAY, stepOf(store, planId, 1).id);
    expect(stepOf(twice, planId, 0).doneOn).toBeNull();
    expect(stepOf(twice, planId, 1).doneOn).toBe(TODAY);
    expect(twice.log.filter((e) => e.routine === 'personalStudy')).toHaveLength(1);
    valid(twice);
    expect(undoStudy(twice, TODAY)).toEqual(store);
  });
});

describe('undoStudy', () => {
  it('check-in then undo is a round trip', () => {
    const { store, planId } = activeStudy();
    const before = clone(store);
    const next = undoStudy(checkInStudy(store, TODAY, stepOf(store, planId, 0).id), TODAY);
    expect(next).toEqual(before);
    valid(next);
  });

  it('a null check-in then undo is a round trip', () => {
    const { store } = activeStudy();
    expect(undoStudy(checkInStudy(store, TODAY, null), TODAY)).toEqual(store);
  });

  it('with no entry for the day returns the store unchanged', () => {
    const { store } = activeStudy();
    expect(undoStudy(store, TODAY)).toBe(store);
  });

  it('Review Focus 2: undo after rename and reorder clears the recorded step B only', () => {
    const { store: s0, planId } = activeStudy(4);
    const [a, b, c, d] = planOf(s0, planId).steps.map((s) => s.id);
    // A was finished earlier; D on another day.
    let store = setStepDone(s0, planId, a, '2026-10-01');
    store = setStepDone(store, planId, d, '2026-10-02');
    store = checkInStudy(store, TODAY, b);
    store = updateStep(store, planId, b, { title: 'Renamed B' });
    store = updateStep(store, planId, c, { title: 'Renamed C' });
    store = moveStep(store, planId, b, 2); // order now a, c, d, b
    store = moveStep(store, planId, c, -1); // order now c, a, d, b
    const edited = store;
    const ids = planOf(edited, planId).steps.map((s) => s.id);
    expect(ids).toEqual([c, a, d, b]);

    const undone = undoStudy(edited, TODAY);
    const byId = (id) => planOf(undone, planId).steps.find((s) => s.id === id);
    expect(byId(b).doneOn).toBeNull();
    expect(byId(b).title).toBe('Renamed B');
    expect(byId(a).doneOn).toBe('2026-10-01');
    expect(byId(c).doneOn).toBeNull();
    expect(byId(d).doneOn).toBe('2026-10-02');
    expect(planOf(undone, planId).steps.map((s) => s.id)).toEqual([c, a, d, b]);
    expect(entry(undone, 'personalStudy', TODAY)).toBeUndefined();
    // Everything but B's doneOn and the log entry is as the edits left it.
    const expected = clone(edited);
    expected.log = expected.log.filter((e) => !(e.routine === 'personalStudy' && e.day === TODAY));
    planOf(expected, planId).steps.find((s) => s.id === b).doneOn = null;
    expect(undone).toEqual(expected);
    valid(undone);
  });

  it('does not clear a step that was re-marked on another day after the check-in', () => {
    const { store, planId } = activeStudy();
    const a = stepOf(store, planId, 0).id;
    let next = checkInStudy(store, TODAY, a);
    next = setStepDone(next, planId, a, '2026-10-01');
    const undone = undoStudy(next, TODAY);
    expect(stepOf(undone, planId, 0).doneOn).toBe('2026-10-01');
    expect(entry(undone, 'personalStudy', TODAY)).toBeUndefined();
    valid(undone);
  });

  it('removes the entry even when its step has since been deleted', () => {
    const { store, planId } = activeStudy();
    const a = stepOf(store, planId, 0).id;
    const next = checkInStudy(store, TODAY, a);
    const gone = { ...next, plans: next.plans.filter((p) => p.id !== planId) };
    const undone = undoStudy(gone, TODAY);
    expect(entry(undone, 'personalStudy', TODAY)).toBeUndefined();
    expect(undone.plans).toEqual([]);
  });

  it('finishing the last step archives the plan; undo un-archives and re-activates it', () => {
    const { store: s0, planId } = activeStudy(2);
    const pre = setStepDone(s0, planId, stepOf(s0, planId, 0).id, '2026-10-01');
    expect(pre.activePlan.personalStudy).toBe(planId);
    const before = clone(pre);

    const done = checkInStudy(pre, TODAY, stepOf(pre, planId, 1).id);
    expect(planOf(done, planId).archivedOn).toBe(TODAY);
    expect(done.activePlan.personalStudy).toBeNull();
    valid(done);

    const undone = undoStudy(done, TODAY);
    expect(planOf(undone, planId).archivedOn).toBeNull();
    expect(undone.activePlan.personalStudy).toBe(planId);
    expect(undone).toEqual(before);
    valid(undone);
  });

  it('does not re-activate over another plan the user made active since', () => {
    const { store: s0, planId } = activeStudy(1);
    const other = withPlan(2, 'study', s0);
    const done = checkInStudy(other.store, TODAY, stepOf(other.store, planId, 0).id);
    const switched = setActiveStudy(done, other.planId);
    const undone = undoStudy(switched, TODAY);
    expect(planOf(undone, planId).archivedOn).toBeNull();
    expect(undone.activePlan.personalStudy).toBe(other.planId);
  });

  it('keeps an archive date set by hand after the check-in, and does not re-activate', () => {
    const { store: s0, planId } = activeStudy(1);
    const done = checkInStudy(s0, TODAY, stepOf(s0, planId, 0).id);
    // The archive date is moved to a later day before undoing; nothing to un-archive.
    const archived = {
      ...done,
      plans: done.plans.map((p) => (p.id === planId ? { ...p, archivedOn: '2026-10-08' } : p)),
    };
    const undone = undoStudy(archived, TODAY);
    expect(stepOf(undone, planId, 0).doneOn).toBeNull();
    expect(planOf(undone, planId).archivedOn).toBe('2026-10-08');
    expect(undone.activePlan.personalStudy).toBeNull();
    valid(undone);
  });
});

describe('todaysStudyStep', () => {
  it('returns the active plan and its next step', () => {
    const { store, planId } = activeStudy();
    const marked = setStepDone(store, planId, stepOf(store, planId, 0).id, TODAY);
    const r = todaysStudyStep(marked);
    expect(r.plan.id).toBe(planId);
    expect(r.step.id).toBe(stepOf(store, planId, 1).id);
  });

  it('is null with no active plan, an unknown plan, or a finished plan', () => {
    const { store, planId } = withPlan(1);
    expect(todaysStudyStep(store)).toBeNull();
    expect(todaysStudyStep({ ...store, activePlan: { personalStudy: 'gone' } })).toBeNull();
    const archived = {
      ...store,
      activePlan: { personalStudy: planId },
      plans: store.plans.map((p) => ({ ...p, archivedOn: TODAY })),
    };
    expect(todaysStudyStep(archived)).toBeNull();
    const finishedNotArchived = {
      ...store,
      activePlan: { personalStudy: planId },
      plans: store.plans.map((p) => ({
        ...p,
        steps: p.steps.map((s) => ({ ...s, doneOn: TODAY })),
      })),
    };
    expect(todaysStudyStep(finishedNotArchived)).toBeNull();
  });
});

// ---- family --------------------------------------------------------------

function twoFamilies() {
  const a = withPlan(3, 'family');
  const b = withPlan(2, 'family', a.store);
  return { store: b.store, a: a.planId, b: b.planId };
}

describe('checkInFamily', () => {
  it('marks exactly that week’s agenda steps and logs true', () => {
    const { store: s0, a, b } = twoFamilies();
    const store = setAgenda(s0, MON, [
      { id: 'x1', kind: 'step', planId: a, stepId: stepOf(s0, a, 1).id },
      { id: 'x2', kind: 'free', title: 'Song', link: null },
    ]);
    const withNext = setAgenda(store, NEXT_MON, [
      { id: 'y1', kind: 'step', planId: b, stepId: stepOf(s0, b, 0).id },
    ]);
    const next = checkInFamily(withNext, TODAY);
    expect(entry(next, 'familyWorship', TODAY).value).toBe(true);
    expect(stepOf(next, a, 1).doneOn).toBe(TODAY);
    expect(stepOf(next, a, 0).doneOn).toBeNull();
    expect(stepOf(next, a, 2).doneOn).toBeNull();
    expect(stepOf(next, b, 0).doneOn).toBeNull();
    expect(stepOf(next, b, 1).doneOn).toBeNull();
    expect(next.familyAgendas).toEqual(withNext.familyAgendas);
    valid(next);
  });

  it('check-in then undo is a round trip on a stored agenda', () => {
    const { store: s0, a, b } = twoFamilies();
    const store = setAgenda(s0, MON, agendaFor(s0, MON));
    const before = clone(store);
    const next = checkInFamily(store, TODAY);
    expect(stepOf(next, a, 0).doneOn).toBe(TODAY);
    expect(stepOf(next, b, 0).doneOn).toBe(TODAY);
    const undone = undoFamily(next, TODAY);
    expect(undone).toEqual(before);
    valid(undone);
  });

  it('stores an auto-fill preview first, so undo and later views see the same items', () => {
    const { store, a, b } = twoFamilies();
    expect(Object.hasOwn(store.familyAgendas, MON)).toBe(false);
    const next = checkInFamily(store, TODAY);
    const items = next.familyAgendas[MON];
    expect(items.map((i) => i.stepId)).toEqual([stepOf(store, a, 0).id, stepOf(store, b, 0).id]);
    expect(items.every((i) => !i.id.startsWith('preview-'))).toBe(true);
    expect(agendaFor(next, MON)).toBe(items);
    expect(stepOf(next, a, 0).doneOn).toBe(TODAY);
    expect(stepOf(next, b, 0).doneOn).toBe(TODAY);
    valid(next);

    const undone = undoFamily(next, TODAY);
    expect(stepOf(undone, a, 0).doneOn).toBeNull();
    expect(stepOf(undone, b, 0).doneOn).toBeNull();
    expect(undone.familyAgendas[MON]).toEqual(items);
    expect(entry(undone, 'familyWorship', TODAY)).toBeUndefined();
    // Apart from the now-kept agenda, the store is as it was.
    expect({ ...undone, familyAgendas: {} }).toEqual({ ...store, familyAgendas: {} });
    valid(undone);
  });

  it('does not store an empty preview (that would mean "cleared on purpose")', () => {
    const store = defaultStore(TODAY, 'en');
    const next = checkInFamily(store, TODAY);
    expect(next.familyAgendas).toEqual({});
    expect(entry(next, 'familyWorship', TODAY).value).toBe(true);
    expect(undoFamily(next, TODAY)).toEqual(store);
  });

  it('leaves steps already done on another day alone, and undo keeps them', () => {
    const { store: s0, a, b } = twoFamilies();
    let store = setAgenda(s0, MON, agendaFor(s0, MON));
    store = setStepDone(store, a, stepOf(store, a, 0).id, '2026-10-05');
    const next = checkInFamily(store, TODAY);
    expect(stepOf(next, a, 0).doneOn).toBe('2026-10-05');
    expect(stepOf(next, b, 0).doneOn).toBe(TODAY);
    const undone = undoFamily(next, TODAY);
    expect(undone).toEqual(store);
  });

  it('skips agenda items whose step no longer exists', () => {
    const { store: s0, a } = twoFamilies();
    const store = setAgenda(s0, MON, [
      { id: 'x1', kind: 'step', planId: a, stepId: 'gone' },
      { id: 'x2', kind: 'step', planId: a, stepId: stepOf(s0, a, 0).id },
    ]);
    const next = checkInFamily(store, TODAY);
    expect(stepOf(next, a, 0).doneOn).toBe(TODAY);
    valid(next);
    expect(undoFamily(next, TODAY)).toEqual(store);
  });

  it('finishing a family plan archives it (never activates it), and undo un-archives it', () => {
    const fam = withPlan(1, 'family');
    const store = setAgenda(fam.store, MON, agendaFor(fam.store, MON));
    const next = checkInFamily(store, TODAY);
    expect(planOf(next, fam.planId).archivedOn).toBe(TODAY);
    expect(next.activePlan.personalStudy).toBeNull();
    valid(next);
    const undone = undoFamily(next, TODAY);
    expect(planOf(undone, fam.planId).archivedOn).toBeNull();
    expect(undone.activePlan.personalStudy).toBeNull();
    expect(undone).toEqual(store);
  });

  it('ignores an agenda item that points at a study step (never finishes the active study)', () => {
    const study = activeStudy(1);
    const fam = withPlan(2, 'family', study.store);
    const studyStep = stepOf(fam.store, study.planId, 0).id;
    const store = setAgenda(fam.store, MON, [
      { id: 'x1', kind: 'step', planId: study.planId, stepId: studyStep },
      { id: 'x2', kind: 'step', planId: fam.planId, stepId: stepOf(fam.store, fam.planId, 0).id },
    ]);
    const next = checkInFamily(store, TODAY);
    expect(stepOf(next, study.planId, 0).doneOn).toBeNull();
    expect(planOf(next, study.planId).archivedOn).toBeNull();
    expect(next.activePlan.personalStudy).toBe(study.planId);
    expect(stepOf(next, fam.planId, 0).doneOn).toBe(TODAY);
    valid(next);
    // A study step done today (by the study check-in) is not cleared by the family undo.
    const both = checkInStudy(next, TODAY, studyStep);
    const undone = undoFamily(both, TODAY);
    expect(stepOf(undone, study.planId, 0).doneOn).toBe(TODAY);
    expect(stepOf(undone, fam.planId, 0).doneOn).toBeNull();
    valid(undone);
  });

  it('refuses an invalid day', () => {
    const { store } = twoFamilies();
    expect(checkInFamily(store, 'nope')).toBe(store);
  });
});

describe('undoFamily', () => {
  it('with no entry for the day returns the store unchanged', () => {
    const { store } = twoFamilies();
    expect(undoFamily(store, TODAY)).toBe(store);
  });

  it('clears only doneOn equal to the day', () => {
    const { store: s0, a, b } = twoFamilies();
    const store = setAgenda(s0, MON, agendaFor(s0, MON));
    let next = checkInFamily(store, TODAY);
    next = setStepDone(next, b, stepOf(next, b, 0).id, '2026-10-06');
    const undone = undoFamily(next, TODAY);
    expect(stepOf(undone, a, 0).doneOn).toBeNull();
    expect(stepOf(undone, b, 0).doneOn).toBe('2026-10-06');
    valid(undone);
  });

  it('removes a logged session even if the log already had it from elsewhere', () => {
    const { store } = twoFamilies();
    const logged = addCheckIn(store, { routine: 'familyWorship', day: TODAY, value: true });
    const undone = undoFamily(logged, TODAY);
    expect(entry(undone, 'familyWorship', TODAY)).toBeUndefined();
  });
});
