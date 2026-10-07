/**
 * Leaf module: ids and the plan size limits. It imports nothing, so store.js,
 * upgrade.js and plans.js can all use it without an import cycle.
 */

export const MAX_TITLE = 60;
export const MAX_NOTE = 280;
export const MAX_STEPS = 200;
export const MAX_AGENDA_ITEMS = 5;

/** A fresh id for a plan, step or agenda item. */
export function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
}
