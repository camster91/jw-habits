/**
 * Weekly family worship agendas, keyed by the week's Monday.
 *
 * Pure: every function returns a new store and never mutates its input. A
 * refused change (not a Monday, a 6th item, a bad title or link...) returns
 * the input store itself, unchanged.
 *
 * A week that has no stored key shows an auto-fill PREVIEW (ids
 * `preview-<stepId>`); nothing is stored until `setAgenda` or one of the
 * edit helpers keeps it. A stored week, even an empty one, always wins over
 * the preview: an empty array means the user cleared it on purpose.
 */
import { addDays, weekStart } from './day.js';
import { MAX_AGENDA_ITEMS, MAX_TITLE, newId } from './ids.js';
import { isMonday, validAgendaItem } from './store.js';
import { isSafeHttpUrl } from '../utils/safeUrls.js';

const MAX_AUTOFILL_PLANS = 3;
const WEEKS_BACK = 52;
const WEEKS_AHEAD = 8;
const PREVIEW = 'preview-';

/** Active family plans in createdOn order (ties keep array order: sort is stable). */
const activeFamilyPlans = (store) =>
  store.plans
    .filter((p) => p.kind === 'family' && p.archivedOn === null)
    .sort((a, b) => (a.createdOn < b.createdOn ? -1 : a.createdOn > b.createdOn ? 1 : 0));

/** A step item is `{id, kind:'step', planId, stepId}`; a free item carries a title and link. */
const isStepItem = (i) => i?.kind === 'step';

/**
 * Exactly the item rule validateStore applies (so a written agenda can never
 * make the store unloadable), plus: a free item's title must not be blank.
 */
const validItem = (i) => validAgendaItem(i) && (i.kind !== 'free' || i.title.trim() !== '');

/** The next not-done, unscheduled step of each active family plan (<= 3 plans, <= 5 items). */
export function autoFill(store, weekStartDay) {
  const reserved = new Set();
  for (const [week, items] of Object.entries(store.familyAgendas)) {
    if (week === weekStartDay) continue;
    for (const i of items) if (isStepItem(i)) reserved.add(i.stepId);
  }
  const items = [];
  for (const plan of activeFamilyPlans(store).slice(0, MAX_AUTOFILL_PLANS)) {
    const step = plan.steps.find((s) => s.doneOn === null && !reserved.has(s.id));
    if (step) items.push({ id: PREVIEW + step.id, kind: 'step', planId: plan.id, stepId: step.id });
  }
  return items.slice(0, MAX_AGENDA_ITEMS);
}

/** Stored items when the week has a key, else the auto-fill preview. */
export function agendaFor(store, weekStartDay) {
  return Object.hasOwn(store.familyAgendas, weekStartDay)
    ? store.familyAgendas[weekStartDay]
    : autoFill(store, weekStartDay);
}

/** Stores `items` for the week (capped at 5). Preview ids become real ids. */
export function setAgenda(store, weekStartDay, items) {
  if (!isMonday(weekStartDay) || !Array.isArray(items) || !items.every(validItem)) return store;
  const seen = new Set();
  const kept = items.slice(0, MAX_AGENDA_ITEMS).map((i) => {
    let id = i.id.startsWith(PREVIEW) ? newId() : i.id;
    if (seen.has(id)) id = newId();
    seen.add(id);
    return { ...i, id };
  });
  return { ...store, familyAgendas: { ...store.familyAgendas, [weekStartDay]: kept } };
}

/** Appends a free item to the week (keeping its preview, if any). Refused at 5 items. */
export function addFreeItem(store, weekStartDay, { title, link = null } = {}) {
  const t = typeof title === 'string' ? title.trim() : '';
  const l = link === undefined || link === '' ? null : link;
  if (!t || t.length > MAX_TITLE) return store;
  if (l !== null && !(typeof l === 'string' && isSafeHttpUrl(l))) return store;
  const current = agendaFor(store, weekStartDay);
  if (!isMonday(weekStartDay) || current.length >= MAX_AGENDA_ITEMS) return store;
  return setAgenda(store, weekStartDay, [
    ...current,
    { id: newId(), kind: 'free', title: t, link: l },
  ]);
}

/** Removes one item from the week (storing what is left). Unknown id: unchanged. */
export function removeAgendaItem(store, weekStartDay, itemId) {
  const current = agendaFor(store, weekStartDay);
  if (!current.some((i) => i.id === itemId)) return store;
  return setAgenda(
    store,
    weekStartDay,
    current.filter((i) => i.id !== itemId)
  );
}

/** This week's Monday plus the next 8. */
export function planWeeks(today) {
  const monday = weekStart(today);
  return Array.from({ length: WEEKS_AHEAD + 1 }, (_, n) => addDays(monday, 7 * n));
}

/** Drops weeks before Monday - 52 weeks or after Monday + 8 weeks. Same store if none dropped. */
export function pruneAgendas(store, today) {
  const monday = weekStart(today);
  const first = addDays(monday, -7 * WEEKS_BACK);
  const last = addDays(monday, 7 * WEEKS_AHEAD);
  const entries = Object.entries(store.familyAgendas);
  const kept = entries.filter(([week]) => week >= first && week <= last);
  if (kept.length === entries.length) return store;
  return { ...store, familyAgendas: Object.fromEntries(kept) };
}

/**
 * Drops agenda step items whose plan or step no longer exists, and clears a
 * missing `activePlan.personalStudy`. Same store if nothing dangled.
 */
export function cleanReferences(store) {
  const stepsOf = new Map(store.plans.map((p) => [p.id, new Set(p.steps.map((s) => s.id))]));
  const live = (i) => !isStepItem(i) || stepsOf.get(i.planId)?.has(i.stepId) === true;
  let changed = false;
  const agendas = {};
  for (const [week, items] of Object.entries(store.familyAgendas)) {
    const kept = items.filter(live);
    if (kept.length !== items.length) changed = true;
    agendas[week] = kept.length === items.length ? items : kept;
  }
  const study = store.activePlan.personalStudy;
  const clearStudy = study !== null && !stepsOf.has(study);
  if (!changed && !clearStudy) return store;
  return {
    ...store,
    familyAgendas: changed ? agendas : store.familyAgendas,
    activePlan: clearStudy ? { ...store.activePlan, personalStudy: null } : store.activePlan,
  };
}
