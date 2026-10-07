import { describe, it, expect } from 'vitest';
import {
  STORE_VERSION,
  ANCHOR_PHRASE_TIMES,
  defaultStore,
  validateStore,
  addCheckIn,
  removeCheckIn,
  exportJson,
  importJson,
  labelFor,
} from './store.js';
import { ROUTINE_IDS } from './routines.js';

const TODAY = '2026-10-06';
const fresh = () => defaultStore(TODAY, 'en');
const clone = (x) => JSON.parse(JSON.stringify(x));
const reasonOf = (x) => validateStore(x).reason;

describe('defaultStore', () => {
  it('seeds the spec defaults with schedule fields only inside store.schedule', () => {
    const s = fresh();
    expect(s.version).toBe(STORE_VERSION);
    expect(STORE_VERSION).toBe(2);
    expect(s.schedule).toEqual([
      {
        from: TODAY,
        enabled: Object.fromEntries(ROUTINE_IDS.map((id) => [id, true])),
        meetingDays: [],
        familyWorshipDay: 5,
        bibleDaysPerWeek: 7,
        studyPerWeek: 3,
      },
    ]);
    for (const k of ['meetingDays', 'familyWorshipDay', 'bibleDaysPerWeek', 'studyPerWeek'])
      expect(s).not.toHaveProperty(k);
    expect(s.pioneer).toBe(false);
    expect(s.hoursGoal).toBe(50);
    expect(s.lastSeenDay).toBeNull();
    expect(s.reading).toEqual({
      plan: 'year',
      start: { book: 1, chapter: 1 },
      startedOn: TODAY,
      countEarlierAsRead: false,
    });
    expect(s.anchors).toEqual({ dailyText: { time: '07:00', phrase: null } });
    expect(s.wrapUpTime).toBe('20:00');
    expect(s.wrapUpNotification).toBe(false);
    expect(s.quietHours).toBeNull();
    expect(s.tone).toBe('warm');
    expect(s.reminders).toEqual({ enabled: true, off: [] });
    expect(s.accent).toBe(0);
    expect(s.theme).toBe('system');
    expect(s.labels).toEqual({});
    expect(s.studyTopic).toBe('');
    expect(s.links).toEqual({});
    expect(s.whatsNew).toEqual({ enabled: true, lastCheck: null, seen: [], newCount: 0 });
    expect(s.onboardingDone).toBe(false);
    expect(s.log).toEqual([]);
  });

  it('is valid and returns independent objects', () => {
    expect(validateStore(fresh()).ok).toBe(true);
    const a = fresh();
    a.schedule[0].enabled.dailyText = false;
    expect(fresh().schedule[0].enabled.dailyText).toBe(true);
  });

  it('exports the anchor phrase times', () => {
    expect(ANCHOR_PHRASE_TIMES).toEqual({
      afterBreakfast: '08:00',
      withFamilyPrayer: '07:00',
      beforeBed: '21:30',
    });
  });
});

describe('export / import', () => {
  it('round-trips deep-equal', () => {
    let s = addCheckIn(fresh(), { routine: 'dailyText', day: TODAY, value: true });
    s = addCheckIn(s, {
      routine: 'ministry',
      day: TODAY,
      value: { shared: true, studies: 1, hours: 2 },
    });
    s = addCheckIn(s, { routine: 'bibleReading', day: TODAY, value: { chapters: [1, 2] } });
    const r = importJson(exportJson(s));
    expect(r.ok).toBe(true);
    expect(r.store).toEqual(s);
    expect(r.store).not.toBe(s);
  });

  it('import of broken JSON is notObject', () => {
    expect(importJson('{')).toEqual({ ok: false, reason: 'notObject' });
    expect(importJson('[]').reason).toBe('notObject');
    expect(importJson('null').reason).toBe('notObject');
    expect(importJson('42').reason).toBe('notObject');
  });

  it('version 3 is newerVersion, version 1 olderVersion, missing is badShape', () => {
    expect(importJson(JSON.stringify({ ...fresh(), version: 3 })).reason).toBe('newerVersion');
    expect(importJson(JSON.stringify({ ...fresh(), version: 1 })).reason).toBe('olderVersion');
    const noVersion = fresh();
    delete noVersion.version;
    expect(reasonOf(noVersion)).toBe('badShape');
  });

  it('unknown routine id in the log is badShape', () => {
    const s = fresh();
    s.log.push({ routine: 'nope', day: TODAY, value: true });
    expect(importJson(JSON.stringify(s)).reason).toBe('badShape');
  });

  it('never mutates its input and returns a deep copy', () => {
    const bad = { ...fresh(), version: 3 };
    const before = clone(bad);
    validateStore(bad);
    expect(bad).toEqual(before);

    const good = addCheckIn(fresh(), { routine: 'dailyText', day: TODAY, value: true });
    const goodBefore = clone(good);
    const r = validateStore(good);
    r.store.log[0].value = false;
    r.store.schedule[0].enabled.dailyText = false;
    expect(good).toEqual(goodBefore);
  });
});

describe('validateStore shape', () => {
  const valid = (fn) => {
    const s = fresh();
    fn(s);
    return validateStore(s).ok;
  };
  const mutate = (fn) => {
    const s = fresh();
    fn(s);
    return reasonOf(s);
  };

  it('rejects non-objects', () => {
    for (const x of [null, undefined, 3, 'x', []]) expect(reasonOf(x)).toBe('notObject');
  });

  it('rejects unknown and missing top-level keys', () => {
    expect(mutate((s) => (s.extra = 1))).toBe('badShape');
    expect(mutate((s) => delete s.log)).toBe('badShape');
  });

  it('rejects labels over 30 chars, non-strings, and unknown ids', () => {
    expect(mutate((s) => (s.labels = { dailyText: 'x'.repeat(31) }))).toBe('badShape');
    expect(valid((s) => (s.labels = { dailyText: 'x'.repeat(30) }))).toBe(true);
    expect(mutate((s) => (s.labels = { dailyText: 5 }))).toBe('badShape');
    expect(mutate((s) => (s.labels = { nope: 'a' }))).toBe('badShape');
  });

  it('checks schedule entries', () => {
    expect(mutate((s) => (s.schedule = []))).toBe('badShape');
    expect(mutate((s) => (s.schedule[0].from = '2026-13-40'))).toBe('badShape');
    expect(mutate((s) => (s.schedule[0].from = 'today'))).toBe('badShape');
    expect(mutate((s) => (s.schedule[0].enabled.nope = true))).toBe('badShape');
    expect(mutate((s) => (s.schedule[0].meetingDays = [7]))).toBe('badShape');
    expect(mutate((s) => (s.schedule[0].meetingDays = [1.5]))).toBe('badShape');
    expect(valid((s) => (s.schedule[0].meetingDays = [2, 6]))).toBe(true);
    expect(mutate((s) => (s.schedule[0].familyWorshipDay = 7))).toBe('badShape');
    expect(mutate((s) => (s.schedule[0].bibleDaysPerWeek = 0))).toBe('badShape');
    expect(mutate((s) => (s.schedule[0].studyPerWeek = 8))).toBe('badShape');
  });

  it('checks log entries', () => {
    expect(mutate((s) => (s.log = [{ routine: 'dailyText', day: '2026-1-1', value: true }]))).toBe(
      'badShape'
    );
    expect(mutate((s) => (s.log = 'x'))).toBe('badShape');
    expect(mutate((s) => (s.log = [{ routine: 'dailyText', day: TODAY, value: false }]))).toBe(
      'badShape'
    );
    expect(
      mutate((s) => (s.log = [{ routine: 'ministry', day: TODAY, value: { shared: true } }]))
    ).toBe('badShape');
  });

  it('checks tone, theme and accent', () => {
    expect(mutate((s) => (s.tone = 'loud'))).toBe('badShape');
    expect(mutate((s) => (s.theme = 'sepia'))).toBe('badShape');
    expect(mutate((s) => (s.accent = 6))).toBe('badShape');
    expect(mutate((s) => (s.accent = 1.5))).toBe('badShape');
    expect(valid((s) => (s.accent = 5))).toBe(true);
  });

  it('checks anchors', () => {
    expect(mutate((s) => (s.anchors = { dailyText: '07:00' }))).toBe('badShape');
    expect(mutate((s) => (s.anchors = { dailyText: { time: '25:00', phrase: null } }))).toBe(
      'badShape'
    );
    expect(mutate((s) => (s.anchors = { dailyText: { time: '07:00', phrase: 'noon' } }))).toBe(
      'badShape'
    );
    expect(mutate((s) => (s.anchors = { nope: { time: '07:00', phrase: null } }))).toBe('badShape');
    expect(
      valid((s) => (s.anchors = { ministry: { time: '08:00', phrase: 'afterBreakfast' } }))
    ).toBe(true);
  });
});

describe('validateStore remaining fields and log integrity', () => {
  const bad = (fn) => {
    const s = fresh();
    fn(s);
    return reasonOf(s);
  };
  const entry = (routine, value, day = TODAY) => ({ routine, day, value });
  const logOk = (...entries) => {
    const s = fresh();
    s.log = entries;
    return validateStore(s).ok;
  };

  it('rejects bad reading', () => {
    expect(bad((s) => (s.reading.plan = 'fast'))).toBe('badShape');
    expect(bad((s) => (s.reading.start.book = 67))).toBe('badShape');
    expect(bad((s) => (s.reading.start.book = 1.5))).toBe('badShape');
    expect(bad((s) => (s.reading.start = { book: 1, chapter: 51 }))).toBe('badShape');
    expect(bad((s) => (s.reading.start = { book: 1, chapter: 0 }))).toBe('badShape');
    expect(bad((s) => (s.reading.startedOn = 'x'))).toBe('badShape');
    expect(bad((s) => (s.reading.countEarlierAsRead = 1))).toBe('badShape');
    expect(bad((s) => (s.reading = null))).toBe('badShape');
  });

  it('accepts ownPace and the last chapter of a book', () => {
    const s = fresh();
    s.reading.plan = 'ownPace';
    s.reading.start = { book: 1, chapter: 50 };
    expect(validateStore(s).ok).toBe(true);
  });

  it('rejects bad reminders, whatsNew, links, quietHours', () => {
    expect(bad((s) => (s.reminders.enabled = 'yes'))).toBe('badShape');
    expect(bad((s) => (s.reminders.off = ['nope']))).toBe('badShape');
    expect(bad((s) => (s.whatsNew.enabled = 1))).toBe('badShape');
    expect(bad((s) => (s.whatsNew.lastCheck = 5))).toBe('badShape');
    expect(bad((s) => (s.whatsNew.seen = [1]))).toBe('badShape');
    expect(bad((s) => (s.whatsNew.newCount = -1))).toBe('badShape');
    expect(bad((s) => (s.whatsNew.newCount = 1.5))).toBe('badShape');
    expect(bad((s) => (s.links = []))).toBe('badShape');
    expect(bad((s) => (s.links = { meetings: 5 }))).toBe('badShape');
    expect(bad((s) => (s.quietHours = { start: '22:00' }))).toBe('badShape');
    expect(bad((s) => (s.quietHours = { start: '22:00', end: '7am' }))).toBe('badShape');
    expect(bad((s) => (s.quietHours = 'night'))).toBe('badShape');
  });

  it('accepts good quietHours and links', () => {
    const s = fresh();
    s.quietHours = { start: '22:00', end: '07:00' };
    s.links = { meetings: 'https://example.org' };
    expect(validateStore(s).ok).toBe(true);
  });

  it('rejects bad scalar fields', () => {
    expect(bad((s) => (s.wrapUpTime = '8pm'))).toBe('badShape');
    expect(bad((s) => (s.wrapUpNotification = 'no'))).toBe('badShape');
    expect(bad((s) => (s.onboardingDone = 0))).toBe('badShape');
    expect(bad((s) => (s.studyTopic = 5))).toBe('badShape');
    expect(bad((s) => (s.studyTopic = 'x'.repeat(61)))).toBe('badShape');
    expect(bad((s) => (s.lastSeenDay = 'yesterday'))).toBe('badShape');
    expect(bad((s) => (s.hoursGoal = -1))).toBe('badShape');
    expect(bad((s) => (s.hoursGoal = Infinity))).toBe('badShape');
    expect(bad((s) => (s.hoursGoal = '50'))).toBe('badShape');
    expect(bad((s) => (s.pioneer = 'no'))).toBe('badShape');
    const ok = fresh();
    ok.lastSeenDay = TODAY;
    expect(validateStore(ok).ok).toBe(true);
  });

  it('rejects duplicate log entries and extra keys', () => {
    expect(logOk(entry('dailyText', true), entry('dailyText', true))).toBe(false);
    expect(logOk(entry('dailyText', true), entry('dailyText', true, '2026-10-05'))).toBe(true);
    expect(logOk({ ...entry('dailyText', true), extra: 1 })).toBe(false);
  });

  it('checks bibleReading and ministry values', () => {
    expect(logOk(entry('bibleReading', { chapters: [] }))).toBe(true);
    expect(logOk(entry('bibleReading', { chapters: [0, 1188] }))).toBe(true);
    expect(logOk(entry('bibleReading', { chapters: [1189] }))).toBe(false);
    expect(logOk(entry('bibleReading', { chapters: [1.5] }))).toBe(false);
    expect(logOk(entry('bibleReading', { chapters: ['1'] }))).toBe(false);
    expect(logOk(entry('bibleReading', { chapters: [1], extra: 1 }))).toBe(false);
    expect(logOk(entry('ministry', { shared: true, studies: 1.5 }))).toBe(false);
    expect(logOk(entry('ministry', { shared: true, studies: -1 }))).toBe(false);
    expect(logOk(entry('ministry', { shared: true, studies: 0, hours: -1 }))).toBe(false);
    expect(logOk(entry('ministry', { shared: true, studies: 0, hours: Infinity }))).toBe(false);
    expect(logOk(entry('ministry', { shared: true, studies: 0, hours: 1.5 }))).toBe(true);
  });

  it('requires all six enabled ids and strictly ascending schedule dates', () => {
    expect(bad((s) => (s.schedule[0].enabled = {}))).toBe('badShape');
    expect(bad((s) => delete s.schedule[0].enabled.ministry)).toBe('badShape');
    expect(bad((s) => (s.schedule[0].enabled.ministry = 1))).toBe('badShape');
    const twoAt = (a, b) => {
      const s = fresh();
      s.schedule = [
        { ...s.schedule[0], from: a },
        { ...s.schedule[0], from: b },
      ];
      return validateStore(s).ok;
    };
    expect(twoAt('2026-10-06', '2026-10-06')).toBe(false);
    expect(twoAt('2026-10-07', '2026-10-06')).toBe(false);
    expect(twoAt('2026-10-06', '2026-10-07')).toBe(true);
  });
});

describe('check-ins', () => {
  it('keeps one entry per routine and day, last write wins', () => {
    let s = addCheckIn(fresh(), {
      routine: 'ministry',
      day: TODAY,
      value: { shared: false, studies: 0 },
    });
    s = addCheckIn(s, { routine: 'ministry', day: TODAY, value: { shared: true, studies: 2 } });
    expect(s.log).toHaveLength(1);
    expect(s.log[0].value).toEqual({ shared: true, studies: 2 });
  });

  it('keeps entries for other routines and days', () => {
    let s = addCheckIn(fresh(), { routine: 'dailyText', day: TODAY, value: true });
    s = addCheckIn(s, { routine: 'dailyText', day: '2026-10-05', value: true });
    s = addCheckIn(s, { routine: 'bibleReading', day: TODAY, value: true });
    expect(s.log).toHaveLength(3);
  });

  it('removeCheckIn deletes the entry and leaves the rest', () => {
    let s = addCheckIn(fresh(), { routine: 'dailyText', day: TODAY, value: true });
    s = addCheckIn(s, { routine: 'bibleReading', day: TODAY, value: true });
    const r = removeCheckIn(s, 'dailyText', TODAY);
    expect(r.log).toEqual([{ routine: 'bibleReading', day: TODAY, value: true }]);
    expect(removeCheckIn(r, 'dailyText', TODAY).log).toEqual(r.log);
  });

  it('is pure', () => {
    const s = fresh();
    const before = clone(s);
    const added = addCheckIn(s, { routine: 'dailyText', day: TODAY, value: true });
    expect(s).toEqual(before);
    const addedBefore = clone(added);
    const removed = removeCheckIn(added, 'dailyText', TODAY);
    expect(added).toEqual(addedBefore);
    expect(removed).not.toBe(added);
  });
});

describe('labels', () => {
  const t = (k) => `T(${k})`;

  it('uses the custom label when set, else the translation', () => {
    const s = fresh();
    expect(labelFor(s, 'dailyText', t)).toBe('T(fd.routine.dailyText)');
    expect(labelFor({ ...s, labels: { dailyText: 'Morning' } }, 'dailyText', t)).toBe('Morning');
    expect(labelFor({ ...s, labels: { dailyText: '' } }, 'dailyText', t)).toBe(
      'T(fd.routine.dailyText)'
    );
  });

  it('treats a whitespace-only label as unset', () => {
    expect(labelFor({ ...fresh(), labels: { dailyText: '   ' } }, 'dailyText', t)).toBe(
      'T(fd.routine.dailyText)'
    );
  });

  it('renaming a label leaves the log untouched', () => {
    const s = addCheckIn(fresh(), { routine: 'dailyText', day: TODAY, value: true });
    const renamed = { ...s, labels: { ...s.labels, dailyText: 'Morning' } };
    expect(renamed.log).toEqual(s.log);
  });
});
