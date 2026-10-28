import { describe, it, expect } from 'vitest';
import { upgradeStore } from './upgrade.js';
import { addCheckIn, defaultStore, exportJson, importJson, validateStore } from './store.js';
import { ROUTINE_IDS } from './routines.js';
import { v2Store, v3Store } from '../test/legacyStores.js';

const TODAY = '2026-10-07';
const clone = (x) => JSON.parse(JSON.stringify(x));

/** A v2 store as v5.0 wrote it, with a study topic, a label and two check-ins. */
function v2(studyTopic = '') {
  let s = {
    ...v2Store('2026-09-01', studyTopic),
    onboardingDone: true,
    labels: { dailyText: 'Text' },
  };
  s = addCheckIn(s, { routine: 'dailyText', day: '2026-10-01', value: true });
  s = addCheckIn(s, { routine: 'personalStudy', day: '2026-10-02', value: true });
  return s;
}

describe('upgradeStore v2 -> v3', () => {
  it('turns a studyTopic into one active study plan with no steps', () => {
    const s = upgradeStore(v2('Daniel'), TODAY);
    expect(s.version).toBe(4);
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
    // schedule and reminders gain the v4 fields, checked in the v3 -> v4 tests.
    // eslint-disable-next-line no-unused-vars
    const { studyTopic, version, schedule, reminders, ...rest } = before;
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

  it('returns anything that is not version 2 or 3 unchanged', () => {
    const v4 = defaultStore(TODAY, 'en');
    expect(upgradeStore(v4, TODAY)).toBe(v4);
    const v5 = { ...v4, version: 5, studyTopic: 'Daniel' };
    const v5Before = clone(v5);
    expect(upgradeStore(v5, TODAY)).toBe(v5);
    expect(v5).toEqual(v5Before);
    const v1 = { version: 1, studyTopic: 'Daniel' };
    expect(upgradeStore(v1, TODAY)).toBe(v1);
    for (const x of [null, undefined, 3, 'x', []]) expect(upgradeStore(x, TODAY)).toBe(x);
  });
});

/** A v3 store with two schedule entries, the later one turning family worship off. */
function v3Two() {
  const s = v3Store('2026-09-01');
  const second = {
    ...s.schedule[0],
    from: '2026-09-20',
    enabled: { ...s.schedule[0].enabled, familyWorship: false },
    studyPerWeek: 5,
  };
  return {
    ...s,
    onboardingDone: true,
    schedule: [s.schedule[0], second],
    reminders: { enabled: false, off: ['ministry'] },
    whatsNew: {
      enabled: false,
      lastCheck: '2026-10-01T08:00:00.000Z',
      seen: ['a', 'b'],
      newCount: 2,
    },
    log: [{ routine: 'dailyText', day: '2026-10-01', value: true }],
  };
}

describe('upgradeStore v3 -> v4', () => {
  it('v3 to v4 marks whatsNew off in every past schedule entry', () => {
    const before = v3Two();
    const s = upgradeStore(before, TODAY);
    expect(s.version).toBe(4);
    for (const original of before.schedule) {
      const entry = s.schedule.find((e) => e.from === original.from);
      expect(entry.enabled.whatsNew).toBe(false);
      expect(entry).toEqual({ ...original, enabled: { ...original.enabled, whatsNew: false } });
    }
    expect(validateStore(s).ok).toBe(true);
  });

  it('v3 to v4 adds an entry from today with whatsNew on', () => {
    const before = v3Two();
    const s = upgradeStore(before, TODAY);
    expect(s.schedule).toHaveLength(3);
    const last = s.schedule.at(-1);
    expect(last.from).toBe(TODAY);
    expect(last.enabled.whatsNew).toBe(true);
    const inForce = before.schedule[1];
    expect(last).toEqual({
      ...inForce,
      from: TODAY,
      enabled: { ...inForce.enabled, whatsNew: true },
    });
    expect(Object.keys(last.enabled).sort()).toEqual([...ROUTINE_IDS].sort());
  });

  it('v3 to v4 replaces an entry that already starts today', () => {
    const before = v3Two();
    before.schedule[1] = { ...before.schedule[1], from: TODAY };
    const s = upgradeStore(before, TODAY);
    const froms = s.schedule.map((e) => e.from);
    expect(new Set(froms).size).toBe(froms.length);
    expect(froms).toEqual(['2026-09-01', TODAY]);
    expect(s.schedule[1]).toEqual({
      ...before.schedule[1],
      enabled: { ...before.schedule[1].enabled, whatsNew: true },
    });
    expect(s.schedule[0].enabled.whatsNew).toBe(false);
    expect(validateStore(s).ok).toBe(true);
  });

  it('v3 to v4 turns whatsNew on in an entry dated after today', () => {
    // A clock behind the last schedule change (westward travel) must not
    // leave the new routine off from that entry onwards.
    const before = v3Two();
    before.schedule[1] = { ...before.schedule[1], from: '2026-10-08' };
    const s = upgradeStore(before, TODAY);
    expect(s.schedule.map((e) => [e.from, e.enabled.whatsNew])).toEqual([
      ['2026-09-01', false],
      [TODAY, true],
      ['2026-10-08', true],
    ]);
    expect(validateStore(s).ok).toBe(true);
  });

  it('v3 to v4 sets the new defaults and keeps whatsNew settings', () => {
    const before = v3Two();
    const s = upgradeStore(before, TODAY);
    expect(s.events).toEqual([]);
    expect(s.backup).toEqual({ lastExportAt: null });
    expect(s.reminders).toEqual({ enabled: false, off: ['ministry'], events: true, backup: true });
    expect(s.whatsNew).toEqual(before.whatsNew);
    // eslint-disable-next-line no-unused-vars
    const { version, schedule, reminders, ...rest } = before;
    for (const [k, v] of Object.entries(rest)) expect(s[k], k).toEqual(v);
    expect(Object.keys(s).sort()).toEqual(Object.keys(defaultStore(TODAY, 'en')).sort());
  });

  it('v3 to v4 never mutates its input', () => {
    const before = v3Two();
    const copy = clone(before);
    upgradeStore(before, TODAY);
    expect(before).toEqual(copy);
  });

  it('v3 to v4 does not throw on a malformed v3 value, which then fails validation', () => {
    for (const schedule of [undefined, null, [], 'x', [null], [{ from: '2026-09-01' }]]) {
      const broken = { ...v3Two(), schedule };
      expect(() => upgradeStore(broken, TODAY)).not.toThrow();
      expect(validateStore(upgradeStore(broken, TODAY)).reason).toBe('badShape');
    }
    const noReminders = { ...v3Two(), reminders: null };
    expect(validateStore(upgradeStore(noReminders, TODAY)).reason).toBe('badShape');
  });

  it('v2 upgrades through to v4', () => {
    const s = upgradeStore(v2('Daniel'), TODAY);
    expect(s.version).toBe(4);
    expect(s.plans.map((p) => p.title)).toEqual(['Daniel']);
    expect(s.schedule.map((e) => [e.from, e.enabled.whatsNew])).toEqual([
      ['2026-09-01', false],
      [TODAY, true],
    ]);
    expect(validateStore(s).ok).toBe(true);
  });

  it('v4 input is returned unchanged', () => {
    const v4 = upgradeStore(v3Two(), TODAY);
    expect(upgradeStore(v4, TODAY)).toBe(v4);
  });
});

describe('importJson upgrades v2 backups', () => {
  it('imports a v2 file as a valid v4 store', () => {
    const r = importJson(exportJson(v2('Daniel')), TODAY);
    expect(r.ok).toBe(true);
    expect(r.store.version).toBe(4);
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

  it('rejects a v5 file as newerVersion and leaves the object it parsed alone', () => {
    const v5 = { ...defaultStore(TODAY, 'en'), version: 5 };
    expect(importJson(JSON.stringify(v5), TODAY)).toEqual({ ok: false, reason: 'newerVersion' });
    const before = clone(v5);
    expect(validateStore(upgradeStore(v5, TODAY))).toEqual({ ok: false, reason: 'newerVersion' });
    expect(v5).toEqual(before);
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
