/**
 * What "Skip — use defaults" does on each onboarding step: put that step's
 * fields back to the values onboarding started with, dropping any edits made
 * on the step. Pure; each takes `(draft, initial, today)` and returns a store.
 */
import { scheduleOn, withScheduleChange } from '../../domain/schedule.js';

/** Restore schedule fields through withScheduleChange, only if they changed. */
function restoreSchedule(draft, initial, today, keys) {
  const was = scheduleOn(initial, today);
  const now = scheduleOn(draft, today);
  const patch = {};
  for (const k of keys) {
    if (JSON.stringify(now[k]) !== JSON.stringify(was[k])) patch[k] = was[k];
  }
  return Object.keys(patch).length ? withScheduleChange(draft, today, patch) : draft;
}

const pick = (store, keys) => Object.fromEntries(keys.map((k) => [k, store[k]]));

export const RESTORE = {
  routines: (draft, initial, today) => ({
    ...restoreSchedule(draft, initial, today, ['enabled']),
    ...pick(initial, ['labels']),
  }),
  week: (draft, initial, today) => ({
    ...restoreSchedule(draft, initial, today, ['meetingDays', 'familyWorshipDay']),
    ...pick(initial, ['pioneer', 'hoursGoal']),
  }),
  reading: (draft, initial) => ({ ...draft, ...pick(initial, ['reading']) }),
  rhythm: (draft, initial) => ({
    ...draft,
    ...pick(initial, ['anchors', 'wrapUpTime', 'wrapUpNotification', 'tone']),
  }),
  look: (draft, initial) => ({ ...draft, ...pick(initial, ['accent', 'theme']) }),
};

/** Every top-level field onboarding may change; finishing commits only these. */
export const ONBOARDING_FIELDS = [
  'schedule',
  'labels',
  'pioneer',
  'hoursGoal',
  'reading',
  'anchors',
  'wrapUpTime',
  'wrapUpNotification',
  'tone',
  'accent',
  'theme',
];

/** `store` with the onboarding fields taken from `draft`, and onboarding done. */
export function commitOnboarding(store, draft) {
  return { ...store, ...pick(draft, ONBOARDING_FIELDS), onboardingDone: true };
}
