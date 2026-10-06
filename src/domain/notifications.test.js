import { describe, it, expect } from 'vitest';
import i18n from 'i18next';
import { planNotifications } from './notifications.js';
import { defaultStore } from './store.js';
import { ROUTINE_IDS } from './routines.js';

const t = i18n.t.bind(i18n);
// Tuesday 2026-10-06, 05:00 local: the whole of the day is still ahead.
const NOW = new Date(2026, 9, 6, 5, 0);

/** A store where only `on` routines are enabled. */
function storeWith(on, patch = {}) {
  const s = defaultStore('2026-10-01', 'en');
  s.schedule[0].enabled = Object.fromEntries(ROUTINE_IDS.map((id) => [id, on.includes(id)]));
  return { ...s, ...patch };
}

const plan = (store, now = NOW, days) => planNotifications(store, now, t, days);
const hhmm = (d) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

describe('planNotifications', () => {
  it('plans only a morning notification on a non-meeting eve with wrap-up off', () => {
    const store = storeWith(['dailyText', 'bibleReading']);
    const p = plan(store, NOW, 1);
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ id: 1, kind: 'morning' });
    expect(hhmm(p[0].at)).toBe('07:00');
    expect(p[0].body).toBe('07:00 · Daily text and Bible reading are ready');
  });

  it('uses the anchor phrase in place of the time, with singular verb', () => {
    const store = storeWith(['dailyText'], {
      anchors: { dailyText: { time: '08:00', phrase: 'afterBreakfast' } },
    });
    const [m] = plan(store, NOW, 1);
    expect(m.body).toBe('After breakfast · Daily text is ready');
    expect(hhmm(m.at)).toBe('08:00');
  });

  it('joins three labels with commas and a final and', () => {
    const store = storeWith(['dailyText', 'bibleReading', 'personalStudy']);
    const [m] = plan(store, NOW, 1);
    expect(m.body).toBe('07:00 · Daily text, Bible reading and Personal study are ready');
  });

  it('picks the earliest anchor among listed routines; unanchored ones use the daily text anchor', () => {
    const store = storeWith(['dailyText', 'bibleReading'], {
      anchors: {
        dailyText: { time: '07:00', phrase: null },
        bibleReading: { time: '06:15', phrase: null },
      },
    });
    const [m] = plan(store, NOW, 1);
    expect(hhmm(m.at)).toBe('06:15');
    expect(m.body.startsWith('06:15 · ')).toBe(true);
    const noDaily = storeWith(['bibleReading'], { anchors: {} });
    expect(hhmm(plan(noDaily, NOW, 1)[0].at)).toBe('07:00');
  });

  it('skips routines already done that day and those in reminders.off', () => {
    const store = storeWith(['dailyText', 'bibleReading', 'personalStudy'], {
      log: [{ routine: 'dailyText', day: '2026-10-06', value: null }],
      reminders: { enabled: true, off: ['personalStudy'] },
    });
    const [m] = plan(store, NOW, 1);
    expect(m.body).toBe('07:00 · Bible reading is ready');
  });

  it('plans one evening entry with both lines on a meeting eve with wrap-up on', () => {
    // Wednesday 2026-10-07 is a meeting day, so Tuesday evening is its eve.
    const store = storeWith(['meetingPrep'], { wrapUpNotification: true });
    store.schedule[0].meetingDays = [3];
    const evening = plan(store, NOW, 1).filter((n) => n.kind === 'evening');
    expect(evening).toHaveLength(1);
    expect(evening[0].id).toBe(2);
    expect(hhmm(evening[0].at)).toBe('20:00');
    expect(evening[0].body).toBe(
      "Your day in review is ready\nTomorrow's meeting — prep is ready when you are"
    );
  });

  it('plans the meeting line alone when wrap-up is off, and not when prep is already done today', () => {
    const store = storeWith(['meetingPrep']);
    store.schedule[0].meetingDays = [3];
    const [e] = plan(store, NOW, 1).filter((n) => n.kind === 'evening');
    expect(e.body).toBe("Tomorrow's meeting — prep is ready when you are");
    const done = { ...store, log: [{ routine: 'meetingPrep', day: '2026-10-06', value: null }] };
    expect(plan(done, NOW, 1).filter((n) => n.kind === 'evening')).toEqual([]);
  });

  it('has no meeting line when meetingPrep is off in reminders', () => {
    const store = storeWith(['meetingPrep'], {
      reminders: { enabled: true, off: ['meetingPrep'] },
    });
    store.schedule[0].meetingDays = [3];
    expect(plan(store, NOW, 1).filter((n) => n.kind === 'evening')).toEqual([]);
  });

  it('plans seven days by default with ids dayOffset*10 + 1 or 2', () => {
    const store = storeWith(['dailyText'], { wrapUpNotification: true });
    const p = plan(store);
    expect(p).toHaveLength(14);
    expect(p.map((n) => n.id)).toEqual(
      [0, 1, 2, 3, 4, 5, 6].flatMap((d) => [d * 10 + 1, d * 10 + 2])
    );
  });

  it('drops anything already in the past', () => {
    const store = storeWith(['dailyText'], { wrapUpNotification: true });
    const p = plan(store, new Date(2026, 9, 6, 7, 30), 1);
    expect(p.map((n) => n.kind)).toEqual(['evening']);
  });

  it('never uses discouraging words', () => {
    const store = storeWith(ROUTINE_IDS, { wrapUpNotification: true });
    store.schedule[0].meetingDays = [0, 1, 2, 3, 4, 5, 6];
    const bodies = plan(store).map((n) => n.body);
    expect(bodies.length).toBeGreaterThan(0);
    for (const b of bodies) expect(b).not.toMatch(/missed|broke|failed|lost/i);
  });

  it('drops the morning entry inside quiet hours that wrap midnight', () => {
    const store = storeWith(['dailyText'], {
      anchors: { dailyText: { time: '06:30', phrase: null } },
      quietHours: { start: '22:00', end: '07:00' },
    });
    expect(plan(store, NOW, 1)).toEqual([]);
  });

  it('drops an evening entry inside a same-day quiet window', () => {
    const store = storeWith([], {
      wrapUpNotification: true,
      quietHours: { start: '19:00', end: '21:00' },
    });
    expect(plan(store, NOW, 1)).toEqual([]);
  });

  it('is empty when every routine is off or reminders are disabled', () => {
    expect(plan(storeWith([], {}))).toEqual([]);
    const all = storeWith(['dailyText'], { reminders: { enabled: false, off: [] } });
    expect(plan(all)).toEqual([]);
  });

  it('has no morning entry when the only due routine has reminders off', () => {
    const store = storeWith(['dailyText'], { reminders: { enabled: true, off: ['dailyText'] } });
    expect(plan(store, NOW, 1)).toEqual([]);
  });
});
