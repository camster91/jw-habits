/**
 * Badges: 18 descriptive milestones. Each rule is a pure function of the
 * store; only the day a badge was first earned is stored (`store.badges`).
 * A badge is earned once and never revoked, so undoing the action that
 * earned it leaves it in place (newlyEarned skips what is already held).
 */
import { weekStart } from './day.js';
import { levelFor } from './garden.js';
import { isFinished } from './plans.js';
import { booksCompleted } from './bible.js';
import { streak } from './progress.js';
import { totalXp, fullFamilyWeekDays } from './xp.js';

const logDays = (store, routine, today) =>
  new Set(store.log.filter((e) => e.routine === routine && e.day <= today).map((e) => e.day)).size;

const familyWeeks = (store, today) =>
  new Set(
    store.log
      .filter((e) => e.routine === 'familyWorship' && e.day <= today)
      .map((e) => weekStart(e.day))
  ).size;

const finishedPlans = (store, kind) =>
  store.plans.filter((p) => (kind ? p.kind === kind : true) && isFinished(p)).length;

const booksIn = (from, to) => (store) => {
  const done = new Set(booksCompleted(store));
  for (let n = from; n <= to; n++) if (!done.has(n)) return false;
  return true;
};

const atLeast = (n, count) => (store, today) => count(store, today) >= n;

/** @type {{id: string, rule: (store: object, today: string) => boolean}[]} */
export const BADGES = [
  {
    id: 'firstStep',
    rule: (s, today) =>
      s.plans.some((p) =>
        p.steps.some((st) => typeof st.doneOn === 'string' && st.doneOn <= today)
      ),
  },
  { id: 'firstProject', rule: (s) => finishedPlans(s, 'study') >= 1 },
  { id: 'firstFamilyPlan', rule: (s) => finishedPlans(s, 'family') >= 1 },
  { id: 'familyWeeks4', rule: atLeast(4, familyWeeks) },
  { id: 'familyWeeks12', rule: atLeast(12, familyWeeks) },
  { id: 'familyWeeks52', rule: atLeast(52, familyWeeks) },
  { id: 'dailyText30', rule: atLeast(30, (s, t) => logDays(s, 'dailyText', t)) },
  { id: 'dailyText100', rule: atLeast(100, (s, t) => logDays(s, 'dailyText', t)) },
  { id: 'dailyText365', rule: atLeast(365, (s, t) => logDays(s, 'dailyText', t)) },
  { id: 'study10', rule: atLeast(10, (s, t) => logDays(s, 'personalStudy', t)) },
  { id: 'plans5', rule: (s) => finishedPlans(s) >= 5 },
  { id: 'meetings10', rule: (s, t) => streak(s, 'meetingPrep', t).current >= 10 },
  { id: 'pentateuch', rule: booksIn(1, 5) },
  { id: 'gospels', rule: booksIn(40, 43) },
  { id: 'greekScriptures', rule: booksIn(40, 66) },
  { id: 'wholeBible', rule: booksIn(1, 66) },
  { id: 'firstFullFamilyWeek', rule: (s, t) => fullFamilyWeekDays(s, t).length > 0 },
  { id: 'level5', rule: (s, t) => levelFor(totalXp(s, t)).level >= 5 },
];

/** Ids whose rule holds today and that are not yet in `store.badges`. */
export function newlyEarned(store, today) {
  return BADGES.filter((b) => !Object.hasOwn(store.badges, b.id) && b.rule(store, today)).map(
    (b) => b.id
  );
}
