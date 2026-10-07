import { describe, it, expect } from 'vitest';
import { upgradeStore } from './upgrade.js';
import { addCheckIn, defaultStore, exportJson, importJson, validateStore } from './store.js';

const TODAY = '2026-10-07';
const clone = (x) => JSON.parse(JSON.stringify(x));

/** A v2 store as v5.0 wrote it: the v3 default without the v3 fields, plus studyTopic. */
function v2(studyTopic = '') {
  // eslint-disable-next-line no-unused-vars
  const { plans, activePlan, familyAgendas, badges, showGameLayer, showShare, ...rest } =
    defaultStore('2026-09-01', 'en');
  let s = { ...rest, version: 2, studyTopic, onboardingDone: true, labels: { dailyText: 'Text' } };
  s = addCheckIn(s, { routine: 'dailyText', day: '2026-10-01', value: true });
  s = addCheckIn(s, { routine: 'personalStudy', day: '2026-10-02', value: true });
  return s;
}

describe('upgradeStore v2 -> v3', () => {
  it('turns a studyTopic into one active study plan with no steps', () => {
    const s = upgradeStore(v2('Daniel'), TODAY);
    expect(s.version).toBe(3);
    expect(s).not.toHaveProperty('studyTopic');
    expect(s.plans).toHaveLength(1);
    const [plan] = s.plans;
    expect(plan).toEqual({
      id: plan.id,
      title: 'Daniel',
      kind: 'study',
      colour: 0,
      icon: 'book',
      steps: [],
      createdOn: TODAY,
      archivedOn: null,
    });
    expect(typeof plan.id).toBe('string');
    expect(plan.id).not.toBe('');
    expect(s.activePlan).toEqual({ personalStudy: plan.id });
    expect(validateStore(s).ok).toBe(true);
  });

  it('creates no plan for an empty or blank studyTopic', () => {
    for (const topic of ['', '   ']) {
      const s = upgradeStore(v2(topic), TODAY);
      expect(s.plans).toEqual([]);
      expect(s.activePlan).toEqual({ personalStudy: null });
      expect(s).not.toHaveProperty('studyTopic');
      expect(validateStore(s).ok).toBe(true);
    }
  });

  it('trims the title and keeps it within 60 characters', () => {
    expect(upgradeStore(v2('  Daniel  '), TODAY).plans[0].title).toBe('Daniel');
    const long = upgradeStore(v2('x'.repeat(80)), TODAY);
    expect(long.plans[0].title).toBe('x'.repeat(60));
    expect(validateStore(long).ok).toBe(true);
  });

  it('adds the v3 defaults and carries everything else over unchanged', () => {
    const before = v2('Daniel');
    const s = upgradeStore(before, TODAY);
    expect(s.familyAgendas).toEqual({});
    expect(s.badges).toEqual({});
    expect(s.showGameLayer).toBe(true);
    expect(s.showShare).toBe(true);
    // eslint-disable-next-line no-unused-vars
    const { studyTopic, version, ...rest } = before;
    for (const [k, v] of Object.entries(rest)) expect(s[k], k).toEqual(v);
    expect(Object.keys(s).sort()).toEqual(Object.keys(defaultStore(TODAY, 'en')).sort());
  });

  it('gives each upgrade a fresh plan id', () => {
    const a = upgradeStore(v2('Daniel'), TODAY).plans[0].id;
    const b = upgradeStore(v2('Daniel'), TODAY).plans[0].id;
    expect(a).not.toBe(b);
  });

  it('never mutates its input', () => {
    const before = v2('Daniel');
    const copy = clone(before);
    upgradeStore(before, TODAY);
    expect(before).toEqual(copy);
  });

  it('returns anything that is not version 2 unchanged', () => {
    const v3 = defaultStore(TODAY, 'en');
    expect(upgradeStore(v3, TODAY)).toBe(v3);
    const v4 = { ...v3, version: 4, studyTopic: 'Daniel' };
    const v4Before = clone(v4);
    expect(upgradeStore(v4, TODAY)).toBe(v4);
    expect(v4).toEqual(v4Before);
    const v1 = { version: 1, studyTopic: 'Daniel' };
    expect(upgradeStore(v1, TODAY)).toBe(v1);
    for (const x of [null, undefined, 3, 'x', []]) expect(upgradeStore(x, TODAY)).toBe(x);
  });
});

describe('importJson upgrades v2 backups', () => {
  it('imports a v2 file as a valid v3 store', () => {
    const r = importJson(exportJson(v2('Daniel')), TODAY);
    expect(r.ok).toBe(true);
    expect(r.store.version).toBe(3);
    expect(r.store.plans.map((p) => p.title)).toEqual(['Daniel']);
    expect(r.store.plans[0].createdOn).toBe(TODAY);
    expect(r.store.activePlan.personalStudy).toBe(r.store.plans[0].id);
    expect(r.store.log).toEqual(v2().log);
  });

  it('dates the migrated plan from the clock when no day is passed', () => {
    const r = importJson(exportJson(v2('Daniel')));
    expect(r.ok).toBe(true);
    expect(validateStore(r.store).ok).toBe(true);
  });

  it('rejects a v4 file as newerVersion and leaves the object it parsed alone', () => {
    const v4 = { ...defaultStore(TODAY, 'en'), version: 4 };
    expect(importJson(JSON.stringify(v4), TODAY)).toEqual({ ok: false, reason: 'newerVersion' });
    const before = clone(v4);
    expect(validateStore(upgradeStore(v4, TODAY))).toEqual({ ok: false, reason: 'newerVersion' });
    expect(v4).toEqual(before);
  });

  it('still rejects version 1 as olderVersion', () => {
    const v1 = { ...v2(), version: 1 };
    expect(importJson(JSON.stringify(v1), TODAY).reason).toBe('olderVersion');
  });

  it('rejects a v2 file that is broken in any other way as badShape', () => {
    const broken = { ...v2('Daniel'), tone: 'loud' };
    expect(importJson(JSON.stringify(broken), TODAY).reason).toBe('badShape');
  });
});
