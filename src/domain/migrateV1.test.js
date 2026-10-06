import { describe, it, expect } from 'vitest';
import { migrateV1 } from './migrateV1.js';
import { validateStore } from './store.js';

const STATE = 'jw-daily-habits-state';
const BIBLE = 'jw-bible-reading-days';
const SETTINGS = 'jw-user-settings';
const BEST = 'jw-habits-best-streak';

/** A Map-backed fixture: `read` is all the migration is given. */
function fixture(entries) {
  const map = new Map(
    Object.entries(entries).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])
  );
  return { map, read: (k) => (map.has(k) ? map.get(k) : null) };
}

const migrate = (entries, today = '2026-10-06') => migrateV1(fixture(entries).read, today, 'en');
const routinesOn = (store, day) =>
  store.log
    .filter((e) => e.day === day)
    .map((e) => e.routine)
    .sort();

describe('migrateV1', () => {
  it('returns null when there is no v1 key at all', () => {
    expect(migrate({})).toBeNull();
  });

  it('treats malformed keys as absent and never throws', () => {
    expect(migrate({ [STATE]: '{nope', [BIBLE]: 'x[', [SETTINGS]: '' })).toBeNull();
    expect(migrate({ [STATE]: '[]', [BIBLE]: '{}', [SETTINGS]: '5' })).toBeNull();
    const store = migrate({ [STATE]: '{nope', [BIBLE]: ['2026-10-01'] });
    expect(store.log).toEqual([{ routine: 'bibleReading', day: '2026-10-01', value: true }]);
  });

  it('maps text/bible/meeting/family on the state date, in both done shapes', () => {
    const store = migrate({
      [STATE]: {
        date: '2026-10-05',
        done: {
          text: { done: true, note: 'hi' },
          bible: true,
          meeting: { done: true, note: '' },
          family: true,
          today: true,
          thisWeek: { done: true, note: '' },
          conventions: true,
        },
        history: ['2026-10-04'],
      },
    });
    expect(routinesOn(store, '2026-10-05')).toEqual([
      'bibleReading',
      'dailyText',
      'familyWorship',
      'meetingPrep',
    ]);
    expect(store.log).toHaveLength(4);
    expect(store.log.every((e) => e.value === true)).toBe(true);
  });

  it('skips rows that are not done', () => {
    const store = migrate({
      [STATE]: { date: '2026-10-05', done: { text: { done: false, note: 'x' }, bible: false } },
    });
    expect(store.log).toEqual([]);
  });

  it('turns each bible-reading day into a bibleReading entry and merges duplicates', () => {
    const store = migrate({
      [STATE]: { date: '2026-10-05', done: { bible: { done: true, note: '' } } },
      [BIBLE]: ['2026-10-03', '2026-10-05', '2026-10-03', 'garbage', 7],
    });
    const bible = store.log.filter((e) => e.routine === 'bibleReading');
    expect(bible.map((e) => e.day).sort()).toEqual(['2026-10-03', '2026-10-05']);
    expect(bible.every((e) => e.value === true)).toBe(true);
  });

  it('maps midweek/weekend days into schedule[0].meetingDays, sorted and unique', () => {
    const a = migrate({ [SETTINGS]: { midweekDay: 4, weekendDay: 0 } });
    expect(a.schedule[0].meetingDays).toEqual([0, 4]);
    const b = migrate({ [SETTINGS]: { midweekDay: 3, weekendDay: 3 } });
    expect(b.schedule[0].meetingDays).toEqual([3]);
    expect(b).not.toHaveProperty('meetingDays');
  });

  it('carries a reminder time into the daily-text anchor and enables reminders', () => {
    const store = migrate({ [SETTINGS]: { reminderTime: '06:45' } });
    expect(store.anchors.dailyText).toEqual({ time: '06:45', phrase: null });
    expect(store.reminders.enabled).toBe(true);
  });

  it('keeps the default anchor but disables reminders when v1 reminderTime was null', () => {
    const store = migrate({ [SETTINGS]: { reminderTime: null } });
    expect(store.anchors.dailyText).toEqual({ time: '07:00', phrase: null });
    expect(store.reminders.enabled).toBe(false);
  });

  it('carries quiet hours over, and ignores an invalid window', () => {
    const q = { start: '22:00', end: '07:00' };
    expect(migrate({ [SETTINGS]: { quietHours: q } }).quietHours).toEqual(q);
    expect(
      migrate({ [SETTINGS]: { quietHours: { start: '25:00', end: '07:00' } } }).quietHours
    ).toBeNull();
  });

  it('sets onboardingDone and drops the best streak', () => {
    const store = migrate({ [BEST]: '12', [SETTINGS]: {} });
    expect(store.onboardingDone).toBe(true);
    expect(migrate({ [BEST]: '12' })).toBeNull();
  });

  it('starts the schedule at the earliest of today and every migrated log day', () => {
    const store = migrate({ [BIBLE]: ['2026-09-20', '2026-10-01'] }, '2026-10-06');
    expect(store.schedule).toHaveLength(1);
    expect(store.schedule[0].from).toBe('2026-09-20');
    expect(migrate({ [BIBLE]: ['2026-12-01'] }, '2026-10-06').schedule[0].from).toBe('2026-10-06');
  });

  it('does not migrate the history array', () => {
    const store = migrate({ [STATE]: { date: '2026-10-05', done: {}, history: ['2026-10-04'] } });
    expect(store.log).toEqual([]);
    expect(store.schedule[0].from).toBe('2026-10-06');
  });

  it('produces a store that passes validateStore', () => {
    const store = migrate({
      [STATE]: { date: '2026-10-05', done: { text: true, bible: true, family: true } },
      [BIBLE]: ['2026-10-05', '2026-09-30'],
      [SETTINGS]: {
        midweekDay: 2,
        weekendDay: 6,
        reminderTime: '08:15',
        quietHours: { start: '22:00', end: '07:00' },
      },
      [BEST]: '9',
    });
    const result = validateStore(store);
    expect(result.ok).toBe(true);
  });

  it('only reads: every v1 key is still present afterwards', () => {
    const fx = fixture({
      [STATE]: { date: '2026-10-05', done: { text: true } },
      [BIBLE]: ['2026-10-05'],
      [SETTINGS]: { midweekDay: 2, weekendDay: 0, reminderTime: null },
      [BEST]: '3',
    });
    const before = new Map(fx.map);
    migrateV1(fx.read, '2026-10-06', 'en');
    expect(fx.map).toEqual(before);
    expect([...fx.map.keys()].sort()).toEqual([BEST, BIBLE, SETTINGS, STATE].sort());
  });
});
