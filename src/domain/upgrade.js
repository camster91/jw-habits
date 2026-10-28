/**
 * Upgrades an older stored value or backup file to the current store shape.
 * Pure: it never mutates its input, never throws, and it does not validate —
 * callers pass the result to `validateStore`, which rejects anything still
 * malformed. Upgrades chain: v2 -> v3 -> v4.
 *
 * v2 -> v3: a non-empty `studyTopic` becomes a study plan with that title and
 * no steps, set as the active study plan. `studyTopic` is removed and the v3
 * fields get their defaults. Everything else is carried over unchanged.
 *
 * v3 -> v4: adds the `whatsNew` routine. Schedule entries starting on or
 * before the upgrade day get `enabled.whatsNew = false`, so past days are not
 * judged against a routine that did not exist; a new entry from the upgrade
 * day (through `withScheduleChange`) turns it on. An entry dated after the
 * upgrade day (a clock running behind) is not history, so it gets it on too.
 * Adds `events: []`, `backup: {lastExportAt: null}` and the `events` and
 * `backup` reminder switches (on). The feed settings in `whatsNew` are kept.
 */
import { MAX_TITLE, newId } from './ids.js';
import { withScheduleChange } from './schedule.js';

const isObject = (x) => typeof x === 'object' && x !== null && !Array.isArray(x);

function v2ToV3(v2, today) {
  const { studyTopic, ...rest } = v2;
  const title = typeof studyTopic === 'string' ? studyTopic.trim().slice(0, MAX_TITLE) : '';
  const plan = title
    ? {
        id: newId(),
        title,
        kind: 'study',
        colour: 0,
        icon: 'book',
        steps: [],
        createdOn: today,
        archivedOn: null,
      }
    : null;
  return {
    ...rest,
    version: 3,
    plans: plan ? [plan] : [],
    activePlan: { personalStudy: plan ? plan.id : null },
    familyAgendas: {},
    badges: {},
    showGameLayer: true,
    showShare: true,
  };
}

/** Whether every schedule entry has the shape the v4 change can be applied to. */
function upgradableSchedule(schedule) {
  return (
    Array.isArray(schedule) &&
    schedule.length > 0 &&
    schedule.every((e) => isObject(e) && typeof e.from === 'string' && isObject(e.enabled))
  );
}

function v3ToV4(v3, today) {
  const reminders = isObject(v3.reminders)
    ? { ...v3.reminders, events: true, backup: true }
    : v3.reminders;
  const store = {
    ...v3,
    version: 4,
    reminders,
    events: [],
    backup: { lastExportAt: null },
  };
  // A malformed schedule is left as it is; validateStore then rejects it.
  if (!upgradableSchedule(v3.schedule)) return store;
  const schedule = v3.schedule.map((e) => ({
    ...e,
    enabled: { ...e.enabled, whatsNew: e.from > today },
  }));
  return withScheduleChange({ ...store, schedule }, today, { enabled: { whatsNew: true } });
}

/**
 * @param {unknown} x a parsed stored value or backup file
 * @param {string} today app day 'YYYY-MM-DD': a plan made from a v2 topic is
 *   created on it, and the v4 schedule entry that turns on `whatsNew` starts on it
 * @returns {unknown} the v4 shape for a version-2 or version-3 object, otherwise `x` itself
 */
export function upgradeStore(x, today) {
  if (!isObject(x)) return x;
  let current = x;
  if (current.version === 2) current = v2ToV3(current, today);
  if (current.version === 3) current = v3ToV4(current, today);
  return current;
}
