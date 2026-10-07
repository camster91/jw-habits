/**
 * XP, derived from the store and never stored: check-in 10, plan step 15,
 * plan finished 100, full family-worship week 25, capped at 100 per app day.
 * Undoing an action removes its XP because the action is no longer in the
 * store; a day with nothing done never reduces anything.
 */
import { weekStart } from './day.js';
import { finishedOn } from './plans.js';

export const XP_CHECKIN = 10;
export const XP_STEP = 15;
export const XP_PLAN = 100;
export const XP_FAMILY_WEEK = 25;
export const XP_DAY_CAP = 100;

/**
 * Days (ascending) that earn the family-week bonus: the first familyWorship
 * session of a week whose stored agenda is non-empty and whose step items are
 * all done on or before that session. Free items are done by the session.
 */
export function familyWeekDays(store) {
  const stepDone = new Map();
  for (const p of store.plans) for (const s of p.steps) stepDone.set(s.id, s.doneOn);
  const awarded = new Set();
  const days = [];
  const sessions = store.log
    .filter((e) => e.routine === 'familyWorship')
    .map((e) => e.day)
    .sort();
  for (const day of sessions) {
    const week = weekStart(day);
    if (awarded.has(week) || !Object.hasOwn(store.familyAgendas, week)) continue;
    const items = store.familyAgendas[week];
    if (items.length === 0) continue;
    const done = items.every((it) => {
      if (it.kind !== 'step') return true;
      const d = stepDone.get(it.stepId);
      return typeof d === 'string' && d <= day;
    });
    if (done) {
      awarded.add(week);
      days.push(day);
    }
  }
  return days;
}

/** Full-family-week days (ascending) on or before `today`. */
export const fullFamilyWeekDays = (store, today) => familyWeekDays(store).filter((d) => d <= today);

/** @returns {{[day: string]: number}} XP per app day up to `today`, each capped at 100. */
export function xpByDay(store, today) {
  const raw = {};
  const add = (day, n) => {
    if (typeof day === 'string' && day <= today) raw[day] = (raw[day] ?? 0) + n;
  };
  for (const e of store.log) add(e.day, XP_CHECKIN);
  for (const p of store.plans) {
    for (const s of p.steps) add(s.doneOn, XP_STEP);
    add(finishedOn(p), XP_PLAN);
  }
  for (const day of familyWeekDays(store)) add(day, XP_FAMILY_WEEK);
  const out = {};
  for (const [day, n] of Object.entries(raw)) out[day] = Math.min(XP_DAY_CAP, n);
  return out;
}

export const totalXp = (store, today) =>
  Object.values(xpByDay(store, today)).reduce((a, b) => a + b, 0);
