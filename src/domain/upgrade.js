/**
 * Upgrades an older stored value or backup file to the current store shape.
 * Pure: it never mutates its input, and it does not validate — callers pass
 * the result to `validateStore`, which rejects anything still malformed.
 *
 * v2 -> v3: a non-empty `studyTopic` becomes a study plan with that title and
 * no steps, set as the active study plan. `studyTopic` is removed and the v3
 * fields get their defaults. Everything else is carried over unchanged.
 */
import { MAX_TITLE, newId } from './store.js';

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

/**
 * @param {unknown} x a parsed stored value or backup file
 * @param {string} today app day 'YYYY-MM-DD'; a plan made from a v2 topic is created on it
 * @returns {unknown} the v3 shape for a version-2 object, otherwise `x` itself
 */
export function upgradeStore(x, today) {
  if (!isObject(x) || x.version !== 2) return x;
  return v2ToV3(x, today);
}
