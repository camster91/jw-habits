/**
 * Plans: a titled list of steps (a study project or a family worship plan).
 * Pure: every function returns a new store and never mutates its input. A
 * refused change (unknown id, empty title, too many steps...) returns the
 * input store itself, unchanged.
 *
 * Step ids are unique across ALL plans (validateStore enforces it, because a
 * personalStudy log value names a step without a plan), so every step made
 * here gets `newId()`.
 */
import { BOOKS, finderUrl } from './bible.js';
import { addDays } from './day.js';
import { MAX_NOTE, MAX_STEPS, MAX_TITLE, newId } from './ids.js';
import { PLAN_ICONS, PLAN_KINDS, PLAN_COLOURS } from './store.js';
import { isSafeHttpUrl } from '../utils/safeUrls.js';

/** A real calendar day 'YYYY-MM-DD' (the same test validateStore applies). */
const isDay = (x) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && addDays(x, 0) === x;

const cleanTitle = (x) => (typeof x === 'string' ? x.trim().slice(0, MAX_TITLE) : '');

/** Notes are trimmed and cut to 280; an empty note is null. */
const cleanNote = (x) => {
  const n = typeof x === 'string' ? x.trim().slice(0, MAX_NOTE) : '';
  return n === '' ? null : n;
};

/** A link is null, or a safe http(s) URL; anything else is `undefined` (refuse). */
const cleanLink = (x) => {
  if (x === null || x === undefined || x === '') return null;
  return typeof x === 'string' && isSafeHttpUrl(x) ? x : undefined;
};

const mapPlan = (store, planId, fn) => {
  if (!store.plans.some((p) => p.id === planId)) return store;
  return { ...store, plans: store.plans.map((p) => (p.id === planId ? fn(p) : p)) };
};

/** The study pointer is dropped when it names this plan. */
const withoutActive = (store, planId) =>
  store.activePlan.personalStudy === planId
    ? { ...store, activePlan: { ...store.activePlan, personalStudy: null } }
    : store;

// ---- generators ----------------------------------------------------------

function count(n) {
  if (!Number.isInteger(n) || n < 1 || n > MAX_STEPS) {
    throw new RangeError(`n must be a whole number from 1 to ${MAX_STEPS}`);
  }
  return n;
}

const numbered = (n, label, link = () => null) =>
  Array.from({ length: count(n) }, (_, i) => ({
    title: `${label} ${i + 1}`,
    link: link(i + 1),
    note: null,
    doneOn: null,
  }));

export const generateChapters = (n) => numbered(n, 'Chapter');
export const generateLessons = (n) => numbered(n, 'Lesson');
export const generateWeekly = (n) => numbered(n, 'Week');

/** One step per chapter of a Bible book, each linked with `finderUrl`. */
export function generateBibleBook(book, locale) {
  const b = BOOKS.find((x) => x.n === book);
  if (!b) throw new RangeError('book must be a whole number from 1 to 66');
  return numbered(b.chapters, b.name, (c) => finderUrl(locale, book, c));
}

// ---- progress ------------------------------------------------------------

export function progress(plan) {
  return { done: plan.steps.filter((s) => s.doneOn !== null).length, total: plan.steps.length };
}

export const nextStep = (plan) => plan.steps.find((s) => s.doneOn === null) ?? null;

/** A plan with no steps is never finished. */
export const isFinished = (plan) => plan.steps.length > 0 && nextStep(plan) === null;

/** The latest `doneOn` once every step is done, else null. */
export function finishedOn(plan) {
  if (!isFinished(plan)) return null;
  return plan.steps.reduce((max, s) => (s.doneOn > max ? s.doneOn : max), plan.steps[0].doneOn);
}

// ---- create --------------------------------------------------------------

/**
 * @param {object} input `steps` are generator output (no ids); each gets a fresh id.
 * @returns {{store, planId: string|null}} planId is null (store unchanged) when refused.
 */
export function createPlan(store, { title, kind, colour = 0, icon = 'book', steps = [] }, today) {
  const refused = { store, planId: null };
  const t = cleanTitle(title);
  if (!t || !PLAN_KINDS.includes(kind) || !PLAN_ICONS.includes(icon)) return refused;
  if (!Number.isInteger(colour) || colour < 0 || colour >= PLAN_COLOURS) return refused;
  if (!Array.isArray(steps) || steps.length > MAX_STEPS) return refused;
  const made = [];
  for (const s of steps) {
    const st = cleanTitle(s?.title);
    const link = cleanLink(s?.link);
    const doneOn = s?.doneOn ?? null;
    if (!st || link === undefined || (doneOn !== null && !isDay(doneOn))) return refused;
    made.push({
      id: newId(),
      title: st,
      link,
      note: cleanNote(s.note),
      doneOn,
    });
  }
  const plan = {
    id: newId(),
    title: t,
    kind,
    colour,
    icon,
    steps: made,
    createdOn: today,
    archivedOn: null,
  };
  // A plan born finished (every step already done) is archived like any other.
  if (isFinished(plan)) plan.archivedOn = finishedOn(plan);
  return { store: { ...store, plans: [...store.plans, plan] }, planId: plan.id };
}

// ---- steps ---------------------------------------------------------------

export function addStep(store, planId, { title, link = null }) {
  const t = cleanTitle(title);
  const l = cleanLink(link);
  const plan = store.plans.find((p) => p.id === planId);
  if (!plan || !t || l === undefined || plan.steps.length >= MAX_STEPS) return store;
  const step = { id: newId(), title: t, link: l, note: null, doneOn: null };
  return mapPlan(store, planId, (p) => ({ ...p, steps: [...p.steps, step] }));
}

/** `patch` may carry `title`, `link` and `note`; an invalid field refuses the whole patch. */
export function updateStep(store, planId, stepId, patch) {
  const plan = store.plans.find((p) => p.id === planId);
  const step = plan?.steps.find((s) => s.id === stepId);
  if (!step || typeof patch !== 'object' || patch === null) return store;
  const next = { ...step };
  if ('title' in patch) {
    next.title = cleanTitle(patch.title);
    if (!next.title) return store;
  }
  if ('link' in patch) {
    next.link = cleanLink(patch.link);
    if (next.link === undefined) return store;
  }
  if ('note' in patch) next.note = cleanNote(patch.note);
  return mapPlan(store, planId, (p) => ({
    ...p,
    steps: p.steps.map((s) => (s.id === stepId ? next : s)),
  }));
}

/** Moves a step by `delta` places, stopping at either end; no movement is a no-op. */
export function moveStep(store, planId, stepId, delta) {
  const plan = store.plans.find((p) => p.id === planId);
  const from = plan ? plan.steps.findIndex((s) => s.id === stepId) : -1;
  if (from < 0) return store;
  const to = Math.max(0, Math.min(plan.steps.length - 1, from + delta));
  if (to === from) return store;
  return mapPlan(store, planId, (p) => {
    const steps = [...p.steps];
    const [moved] = steps.splice(from, 1);
    steps.splice(to, 0, moved);
    return { ...p, steps };
  });
}

export function deleteStep(store, planId, stepId) {
  const plan = store.plans.find((p) => p.id === planId);
  if (!plan || !plan.steps.some((s) => s.id === stepId)) return store;
  const steps = plan.steps.filter((s) => s.id !== stepId);
  let updated = { ...plan, steps };
  // Deleting the last undone step finishes the plan, so it archives like setStepDone.
  if (isFinished(updated) && plan.archivedOn === null) {
    updated = { ...updated, archivedOn: finishedOn(updated) };
  }
  const next = mapPlan(store, planId, () => updated);
  return updated.archivedOn !== null && plan.archivedOn === null
    ? withoutActive(next, planId)
    : next;
}

/**
 * Marks a step done on `day`, or clears it with null. Finishing the last step
 * archives the plan on that day (and drops it as the active study). Clearing a
 * step of a plan that auto-archived on its finishing day un-archives it, so an
 * undo puts the plan back exactly as it was.
 */
export function setStepDone(store, planId, stepId, day) {
  if (day !== null && !isDay(day)) return store;
  const plan = store.plans.find((p) => p.id === planId);
  if (!plan || !plan.steps.some((s) => s.id === stepId)) return store;
  const steps = plan.steps.map((s) => (s.id === stepId ? { ...s, doneOn: day } : s));
  let updated = { ...plan, steps };
  if (isFinished(updated) && plan.archivedOn === null) {
    updated = { ...updated, archivedOn: finishedOn(updated) };
  } else if (isFinished(plan) && !isFinished(updated) && plan.archivedOn === finishedOn(plan)) {
    updated = { ...updated, archivedOn: null };
  }
  const next = mapPlan(store, planId, () => updated);
  return updated.archivedOn !== null ? withoutActive(next, planId) : next;
}

// ---- lifecycle -----------------------------------------------------------

export function archivePlan(store, planId, today) {
  const plan = store.plans.find((p) => p.id === planId);
  if (!plan) return store;
  const next =
    plan.archivedOn === null ? mapPlan(store, planId, (p) => ({ ...p, archivedOn: today })) : store;
  return withoutActive(next, planId);
}

/**
 * Un-archives a plan. It does not make it the active study again. A finished
 * plan may be restored; it stays restored until one of its steps changes
 * (setStepDone / deleteStep then archive it again).
 */
export function restorePlan(store, planId) {
  const plan = store.plans.find((p) => p.id === planId);
  if (!plan || plan.archivedOn === null) return store;
  return mapPlan(store, planId, (p) => ({ ...p, archivedOn: null }));
}

export function deletePlan(store, planId) {
  if (!store.plans.some((p) => p.id === planId)) return store;
  return withoutActive({ ...store, plans: store.plans.filter((p) => p.id !== planId) }, planId);
}

/** Points personalStudy at an unarchived study plan, or clears it with null. */
export function setActiveStudy(store, planId) {
  if (planId === null) {
    return { ...store, activePlan: { ...store.activePlan, personalStudy: null } };
  }
  const plan = store.plans.find((p) => p.id === planId);
  if (!plan || plan.kind !== 'study' || plan.archivedOn !== null) return store;
  return { ...store, activePlan: { ...store.activePlan, personalStudy: planId } };
}
