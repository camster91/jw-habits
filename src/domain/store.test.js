import { describe, it, expect, vi } from 'vitest';
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
  newId,
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
    expect(STORE_VERSION).toBe(3);
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
    expect(s).not.toHaveProperty('studyTopic');
    expect(s.plans).toEqual([]);
    expect(s.activePlan).toEqual({ personalStudy: null });
    expect(s.familyAgendas).toEqual({});
    expect(s.badges).toEqual({});
    expect(s.showGameLayer).toBe(true);
    expect(s.showShare).toBe(true);
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

  it('version 4 is newerVersion, version 1 olderVersion, missing is badShape', () => {
    expect(importJson(JSON.stringify({ ...fresh(), version: 4 })).reason).toBe('newerVersion');
    expect(reasonOf({ ...fresh(), version: 2 })).toBe('olderVersion');
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
    const bad = { ...fresh(), version: 4 };
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
    expect(bad((s) => (s.studyTopic = 'Daniel'))).toBe('badShape');
    expect(bad((s) => (s.showGameLayer = 'yes'))).toBe('badShape');
    expect(bad((s) => (s.showShare = null))).toBe('badShape');
    expect(bad((s) => delete s.showShare)).toBe('badShape');
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

describe('newId', () => {
  it('returns distinct non-empty strings', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newId()));
    expect(ids.size).toBe(50);
    for (const id of ids) {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    }
  });

  it('falls back when crypto.randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {});
    try {
      const a = newId();
      const b = newId();
      expect(typeof a).toBe('string');
      expect(a.length).toBeGreaterThan(0);
      expect(a).not.toBe(b);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('validateStore v3 fields', () => {
  const MONDAY = '2026-10-05';
  const step = (id, extra = {}) => ({
    id,
    title: 'Chapter ' + id,
    link: null,
    note: null,
    doneOn: null,
    ...extra,
  });
  const plan = (id, extra = {}) => ({
    id,
    title: 'Daniel',
    kind: 'study',
    colour: 0,
    icon: 'book',
    steps: [step(id + '-s1'), step(id + '-s2')],
    createdOn: TODAY,
    archivedOn: null,
    ...extra,
  });
  /** A v3 store using every new field. */
  const full = () => ({
    ...fresh(),
    plans: [
      plan('p1', {
        steps: [
          step('p1-s1', {
            link: 'https://example.org/a',
            note: 'n'.repeat(280),
            doneOn: '2026-10-04',
          }),
          step('p1-s2'),
        ],
      }),
      plan('p2', { kind: 'family', colour: 7, icon: 'path', archivedOn: TODAY }),
    ],
    activePlan: { personalStudy: 'p1' },
    familyAgendas: {
      [MONDAY]: [
        { id: 'a1', kind: 'step', planId: 'p2', stepId: 'p2-s1' },
        { id: 'a2', kind: 'free', title: 'Song practice', link: null },
        { id: 'a3', kind: 'free', title: 'Video', link: 'https://example.org/v' },
      ],
    },
    badges: { firstStep: '2026-10-04', level5: TODAY },
    log: [
      { routine: 'personalStudy', day: '2026-10-04', value: { stepId: 'p1-s1' } },
      { routine: 'personalStudy', day: TODAY, value: true },
    ],
  });
  const reason = (fn) => {
    const s = full();
    fn(s);
    return reasonOf(s);
  };
  const ok = (fn) => reason(fn) === undefined;

  it('accepts a store using every new field', () => {
    expect(validateStore(full())).toMatchObject({ ok: true });
  });

  it('accepts every icon, colour and both kinds', () => {
    for (const icon of ['book', 'scroll', 'lamp', 'mountain', 'seedling', 'dove', 'sun', 'path'])
      expect(
        ok((s) => (s.plans[0].icon = icon)),
        icon
      ).toBe(true);
    for (let c = 0; c <= 7; c++) expect(ok((s) => (s.plans[0].colour = c))).toBe(true);
    expect(ok((s) => (s.plans[0].kind = 'family'))).toBe(true);
  });

  it('checks plans', () => {
    expect(reason((s) => (s.plans = {}))).toBe('badShape');
    expect(reason((s) => (s.plans[0].extra = 1))).toBe('badShape');
    expect(reason((s) => delete s.plans[0].archivedOn)).toBe('badShape');
    expect(reason((s) => (s.plans[0].id = ''))).toBe('badShape');
    expect(reason((s) => (s.plans[0].id = 5))).toBe('badShape');
    expect(reason((s) => (s.plans[1].id = 'p1'))).toBe('badShape');
    expect(reason((s) => (s.plans[0].title = ''))).toBe('badShape');
    expect(reason((s) => (s.plans[0].title = 'x'.repeat(61)))).toBe('badShape');
    expect(ok((s) => (s.plans[0].title = 'x'.repeat(60)))).toBe(true);
    expect(reason((s) => (s.plans[0].kind = 'other'))).toBe('badShape');
    expect(reason((s) => (s.plans[0].colour = 8))).toBe('badShape');
    expect(reason((s) => (s.plans[0].colour = -1))).toBe('badShape');
    expect(reason((s) => (s.plans[0].colour = 1.5))).toBe('badShape');
    expect(reason((s) => (s.plans[0].icon = 'star'))).toBe('badShape');
    expect(reason((s) => (s.plans[0].steps = null))).toBe('badShape');
    expect(reason((s) => (s.plans[0].createdOn = 'today'))).toBe('badShape');
    expect(reason((s) => (s.plans[0].archivedOn = '2026-02-30'))).toBe('badShape');
  });

  it('checks steps', () => {
    const steps = (n) => Array.from({ length: n }, (_, i) => step('s' + i));
    expect(ok((s) => (s.plans[0].steps = steps(200)))).toBe(true);
    expect(reason((s) => (s.plans[0].steps = steps(201)))).toBe('badShape');
    expect(reason((s) => (s.plans[0].steps[0].extra = 1))).toBe('badShape');
    expect(reason((s) => delete s.plans[0].steps[0].note)).toBe('badShape');
    expect(reason((s) => (s.plans[0].steps[0].id = ''))).toBe('badShape');
    expect(reason((s) => (s.plans[0].steps[1].id = 'p1-s1'))).toBe('badShape');
    expect(reason((s) => (s.plans[1].steps[0].id = 'p1-s1'))).toBe('badShape');
    expect(reason((s) => (s.plans[0].steps[0].title = ''))).toBe('badShape');
    expect(reason((s) => (s.plans[0].steps[0].title = 'x'.repeat(61)))).toBe('badShape');
    expect(reason((s) => (s.plans[0].steps[0].note = 'n'.repeat(281)))).toBe('badShape');
    expect(reason((s) => (s.plans[0].steps[0].note = 5))).toBe('badShape');
    expect(reason((s) => (s.plans[0].steps[0].doneOn = 'x'))).toBe('badShape');
    for (const link of ['javascript:alert(1)', 'https://u:p@evil.com/', 'not a url', '', 5])
      expect(
        reason((s) => (s.plans[0].steps[0].link = link)),
        String(link)
      ).toBe('badShape');
  });

  it('checks activePlan, and lets a dangling one through', () => {
    expect(ok((s) => (s.activePlan.personalStudy = 'gone'))).toBe(true);
    expect(ok((s) => (s.activePlan.personalStudy = null))).toBe(true);
    expect(reason((s) => (s.activePlan = null))).toBe('badShape');
    expect(reason((s) => (s.activePlan = {}))).toBe('badShape');
    expect(reason((s) => (s.activePlan.personalStudy = ''))).toBe('badShape');
    expect(reason((s) => (s.activePlan.personalStudy = 3))).toBe('badShape');
    expect(reason((s) => (s.activePlan.familyWorship = null))).toBe('badShape');
  });

  it('checks family agendas, and lets dangling step references through', () => {
    const items = (s) => s.familyAgendas[MONDAY];
    expect(ok((s) => (items(s)[0].planId = 'gone'))).toBe(true);
    expect(ok((s) => (items(s)[0].stepId = 'gone'))).toBe(true);
    expect(ok((s) => (s.familyAgendas[MONDAY] = []))).toBe(true);
    expect(reason((s) => (s.familyAgendas = []))).toBe('badShape');
    expect(reason((s) => (s.familyAgendas = { '2026-10-06': [] }))).toBe('badShape');
    expect(reason((s) => (s.familyAgendas = { monday: [] }))).toBe('badShape');
    expect(reason((s) => (s.familyAgendas[MONDAY] = {}))).toBe('badShape');
    expect(
      reason((s) => {
        for (let i = 0; i < 3; i++)
          items(s).push({ id: 'x' + i, kind: 'free', title: 'Free', link: null });
      })
    ).toBe('badShape');
    expect(reason((s) => (items(s)[1].id = 'a1'))).toBe('badShape');
    expect(reason((s) => (items(s)[0].id = ''))).toBe('badShape');
    expect(reason((s) => (items(s)[0].kind = 'other'))).toBe('badShape');
    expect(reason((s) => (items(s)[0].planId = ''))).toBe('badShape');
    expect(reason((s) => (items(s)[0].stepId = 4))).toBe('badShape');
    expect(reason((s) => (items(s)[0].title = 'x'))).toBe('badShape');
    expect(reason((s) => delete items(s)[1].link)).toBe('badShape');
    expect(reason((s) => (items(s)[1].title = ''))).toBe('badShape');
    expect(reason((s) => (items(s)[1].title = 'x'.repeat(61)))).toBe('badShape');
    expect(reason((s) => (items(s)[1].link = 'javascript:x'))).toBe('badShape');
    expect(reason((s) => (items(s)[1].planId = 'p1'))).toBe('badShape');
  });

  it('checks badges', () => {
    const ids = [
      'firstStep',
      'firstProject',
      'firstFamilyPlan',
      'familyWeeks4',
      'familyWeeks12',
      'familyWeeks52',
      'dailyText30',
      'dailyText100',
      'dailyText365',
      'study10',
      'plans5',
      'meetings10',
      'pentateuch',
      'gospels',
      'greekScriptures',
      'wholeBible',
      'firstFullFamilyWeek',
      'level5',
    ];
    expect(ok((s) => (s.badges = Object.fromEntries(ids.map((id) => [id, TODAY]))))).toBe(true);
    expect(reason((s) => (s.badges = []))).toBe('badShape');
    expect(reason((s) => (s.badges = { nope: TODAY }))).toBe('badShape');
    expect(reason((s) => (s.badges = { firstStep: true }))).toBe('badShape');
    expect(reason((s) => (s.badges = { firstStep: '2026-13-01' }))).toBe('badShape');
  });

  it('allows {stepId} only as a personalStudy log value', () => {
    const entry = (routine, value) => (s) => (s.log = [{ routine, day: TODAY, value }]);
    expect(ok(entry('personalStudy', { stepId: 'gone' }))).toBe(true);
    expect(reason(entry('personalStudy', { stepId: '' }))).toBe('badShape');
    expect(reason(entry('personalStudy', { stepId: 3 }))).toBe('badShape');
    expect(reason(entry('personalStudy', { stepId: 'p1-s1', extra: 1 }))).toBe('badShape');
    expect(reason(entry('personalStudy', {}))).toBe('badShape');
    expect(reason(entry('dailyText', { stepId: 'p1-s1' }))).toBe('badShape');
    expect(reason(entry('familyWorship', { stepId: 'p1-s1' }))).toBe('badShape');
  });

  it('round-trips a full v3 store through export and import', () => {
    const s = full();
    const r = importJson(exportJson(s), TODAY);
    expect(r.ok).toBe(true);
    expect(r.store).toEqual(s);
  });
});
