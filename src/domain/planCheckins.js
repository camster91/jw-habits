/**
 * What a personal-study or family-worship check-in does to plans, and its
 * exact undo.
 *
 * - A study check-in records the step it ticked in the log value
 *   (`{stepId}`), so undo clears THAT step even after the steps were renamed
 *   or reordered. It records `true` when it ticked nothing (no step, an
 *   unknown step, a step of a plan other than the active study, or a step
 *   already done), so undo never clears a date it did not set.
 * - A family check-in marks every not-done family-plan step on that week's
 *   agenda (an item pointing at a study step is ignored). Undo
 *   clears those steps only where `doneOn` is still the session day.
 *
 * Pure: every function returns a new store and never mutates its input. An
 * invalid day returns the input store itself.
 */
import { addCheckIn, removeCheckIn } from './store.js';
import { addDays, weekStart } from './day.js';
import { nextStep, setActiveStudy, setStepDone } from './plans.js';
import { agendaFor, setAgenda } from './agenda.js';

const isDay = (x) =>
  typeof x === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(x) && addDays(x, 0) === x;

const entryFor = (store, routine, day) =>
  store.log.find((e) => e.routine === routine && e.day === day);

/** `{plan, step}` for a step id (step ids are unique across all plans), else null. */
function findStep(store, stepId) {
  for (const plan of store.plans) {
    const step = plan.steps.find((s) => s.id === stepId);
    if (step) return { plan, step };
  }
  return null;
}

// ---- personal study --------------------------------------------------------

/**
 * Logs a personal-study session on `day`. With the id of a not-done step of
 * the ACTIVE study plan (`activePlan.personalStudy`), sets its
 * `doneOn = day` and logs `{stepId}`; otherwise logs `true` (session only). A check-in already logged for `day` is undone first, so the day
 * holds one session and undo restores the day as it was before both.
 */
export function checkInStudy(store, day, stepId) {
  if (!isDay(day)) return store;
  let next = undoStudy(store, day);
  const found = typeof stepId === 'string' ? findStep(next, stepId) : null;
  const ticks =
    found !== null &&
    found.plan.kind === 'study' &&
    found.plan.id === next.activePlan.personalStudy &&
    found.step.doneOn === null;
  if (!ticks) {
    return addCheckIn(next, { routine: 'personalStudy', day, value: true });
  }
  next = setStepDone(next, found.plan.id, stepId, day);
  return addCheckIn(next, { routine: 'personalStudy', day, value: { stepId } });
}

/**
 * Removes the personal-study entry for `day`. If it recorded a step whose
 * `doneOn` is still `day`, clears it. If that clear un-archives the plan the
 * check-in finished (and no other study is active), it becomes the active
 * study again, as it was before the check-in.
 */
export function undoStudy(store, day) {
  const entry = entryFor(store, 'personalStudy', day);
  if (!entry) return store;
  let next = store;
  const stepId = entry.value === true ? null : entry.value.stepId;
  const found = stepId === null ? null : findStep(store, stepId);
  if (found && found.step.doneOn === day) {
    const wasArchivedToday = found.plan.archivedOn === day;
    next = setStepDone(next, found.plan.id, stepId, null);
    const after = next.plans.find((p) => p.id === found.plan.id);
    if (
      wasArchivedToday &&
      after.archivedOn === null &&
      after.kind === 'study' &&
      next.activePlan.personalStudy === null
    ) {
      next = setActiveStudy(next, after.id);
    }
  }
  return removeCheckIn(next, 'personalStudy', day);
}

/** The active, unarchived study plan and its next step, else null. */
export function todaysStudyStep(store) {
  const id = store.activePlan.personalStudy;
  const plan = id === null ? null : store.plans.find((p) => p.id === id);
  if (!plan || plan.kind !== 'study' || plan.archivedOn !== null) return null;
  const step = nextStep(plan);
  return step ? { plan, step } : null;
}

// ---- family worship ------------------------------------------------------

const stepItems = (store, day) => agendaFor(store, weekStart(day)).filter((i) => i.kind === 'step');

/**
 * Logs a family-worship session on `day` and sets `doneOn = day` on every
 * step of that week's agenda that exists and is not done. A week still
 * showing its auto-fill preview is stored first, so undo and later views see
 * the same items (an empty preview is not stored: an empty stored week means
 * "cleared on purpose").
 */
export function checkInFamily(store, day) {
  if (!isDay(day)) return store;
  const week = weekStart(day);
  let next = store;
  if (!Object.hasOwn(next.familyAgendas, week)) {
    const preview = agendaFor(next, week);
    if (preview.length > 0) next = setAgenda(next, week, preview);
  }
  for (const item of stepItems(next, day)) {
    const found = findStep(next, item.stepId);
    if (
      found &&
      found.plan.id === item.planId &&
      found.plan.kind === 'family' &&
      found.step.doneOn === null
    ) {
      next = setStepDone(next, item.planId, item.stepId, day);
    }
  }
  return addCheckIn(next, { routine: 'familyWorship', day, value: true });
}

/**
 * Removes the family-worship entry for `day` and clears `doneOn` on that
 * week's agenda steps where it equals `day`. Family plans never become the
 * active study. The family log value is only `true`, so undo cannot tell a
 * step this check-in marked from one hand-marked done earlier the same day:
 * both are cleared.
 */
export function undoFamily(store, day) {
  if (!entryFor(store, 'familyWorship', day)) return store;
  let next = store;
  for (const item of stepItems(next, day)) {
    const found = findStep(next, item.stepId);
    if (
      found &&
      found.plan.id === item.planId &&
      found.plan.kind === 'family' &&
      found.step.doneOn === day
    ) {
      next = setStepDone(next, item.planId, item.stepId, null);
    }
  }
  return removeCheckIn(next, 'familyWorship', day);
}
