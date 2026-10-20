/**
 * Builds a repaired routine store from saved data that failed validation (#315).
 * Pure: reads nothing and writes nothing. The caller shows the user what a
 * repair would reset and only writes it after explicit confirmation, keeping
 * the original bytes first.
 *
 * Each top-level field is validated on its own against a default store, so one
 * bad value only resets that field. Check-ins, schedule entries and plans are
 * kept entry by entry.
 */
import { defaultStore, STORE_VERSION, validateStore } from './store.js';

const valid = (base, key, value) => validateStore({ ...base, [key]: value }).ok;

function repairLog(base, log) {
  if (!Array.isArray(log)) return [];
  // Later entries win, matching addCheckIn's replace-per-day behaviour.
  const byDay = new Map();
  for (const entry of log) {
    if (valid(base, 'log', [entry])) byDay.set(`${entry.routine}|${entry.day}`, entry);
  }
  return [...byDay.values()];
}

function repairSchedule(base, schedule) {
  if (!Array.isArray(schedule)) return null;
  const kept = [];
  for (const entry of schedule) {
    if (!valid(base, 'schedule', [entry])) continue;
    if (kept.length && kept[kept.length - 1].from >= entry.from) continue;
    kept.push(entry);
  }
  return kept.length ? kept : null;
}

function repairPlans(base, plans) {
  if (!Array.isArray(plans)) return [];
  const kept = [];
  for (const plan of plans) {
    if (valid(base, 'plans', [...kept, plan])) kept.push(plan);
  }
  return kept;
}

/**
 * @param {unknown} parsed the parsed (and, where possible, upgraded) saved value
 * @param {string} today app day used for any default values
 * @param {string} locale
 * @returns {null | {store: object, reset: string[], droppedCheckIns: number}}
 *   null when nothing usable could be kept (the user can still start fresh).
 *   `reset`: top-level fields that fell back to defaults or lost entries.
 */
export function repairStore(parsed, today, locale) {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  if (Number.isInteger(parsed.version) && parsed.version > STORE_VERSION) return null;
  const base = defaultStore(today, locale);
  const store = { ...base };
  const reset = [];
  let droppedCheckIns = 0;
  let keptAny = false;

  for (const key of Object.keys(base)) {
    if (key === 'version') continue;
    if (!(key in parsed)) {
      reset.push(key);
      continue;
    }
    const value = parsed[key];
    if (valid(base, key, value)) {
      store[key] = value;
      keptAny = true;
      continue;
    }
    if (key === 'log') {
      store.log = repairLog(base, value);
      droppedCheckIns = Array.isArray(value) ? value.length - store.log.length : 0;
      if (store.log.length) keptAny = true;
    } else if (key === 'schedule') {
      const schedule = repairSchedule(base, value);
      if (schedule) {
        store.schedule = schedule;
        keptAny = true;
      }
    } else if (key === 'plans') {
      store.plans = repairPlans(base, value);
      if (store.plans.length) keptAny = true;
    }
    reset.push(key);
  }

  const result = validateStore(store);
  if (!keptAny || !result.ok) return null;
  return { store: result.store, reset, droppedCheckIns };
}
