import { describe, it, expect } from 'vitest';
import i18n from 'i18next';
import { reportMonth, reportDue, reportNotifyDue, reportLines, reportText } from './report.js';
import { defaultStore } from './store.js';
import { setMinistry } from './today.js';
import { withScheduleChange } from './schedule.js';
import { ROUTINE_IDS } from './routines.js';

const t = i18n.t.bind(i18n);

function makeStore(ministry = true, patch = {}) {
  const s = defaultStore('2026-09-01', 'en');
  s.schedule[0].enabled = Object.fromEntries(
    ROUTINE_IDS.map((id) => [id, id === 'ministry' && ministry])
  );
  return { ...s, ...patch };
}

describe('reportMonth', () => {
  it('names the previous month', () => {
    expect(reportMonth('2026-11-03')).toEqual({
      key: '2026-10',
      name: 'October',
      year: 2026,
      lastDay: '2026-10-31',
    });
  });
  it('crosses a year boundary', () => {
    expect(reportMonth('2027-01-01')).toMatchObject({
      key: '2026-12',
      name: 'December',
      year: 2026,
    });
  });
  it('knows a leap February', () => {
    expect(reportMonth('2028-03-02').lastDay).toBe('2028-02-29');
  });
});

describe('reportDue', () => {
  it('is due on days 1 to 7 with ministry on', () => {
    expect(reportDue(makeStore(), '2026-11-01')).toBe(true);
    expect(reportDue(makeStore(), '2026-11-07')).toBe(true);
  });
  it('is not due on day 8 or with ministry off', () => {
    expect(reportDue(makeStore(), '2026-11-08')).toBe(false);
    expect(reportDue(makeStore(false), '2026-11-03')).toBe(false);
  });
  it('uses the schedule in force on that day', () => {
    const s = withScheduleChange(makeStore(), '2026-11-05', {
      enabled: { ...makeStore().schedule[0].enabled, ministry: false },
    });
    expect(reportDue(s, '2026-11-03')).toBe(true);
    expect(reportDue(s, '2026-11-06')).toBe(false);
  });
});

describe('reportNotifyDue', () => {
  it('is true only on the 1st with ministry on and its reminder switch on', () => {
    expect(reportNotifyDue(makeStore(), '2026-11-01')).toBe(true);
    expect(reportNotifyDue(makeStore(), '2026-11-02')).toBe(false);
    expect(reportNotifyDue(makeStore(false), '2026-11-01')).toBe(false);
    const off = makeStore(true);
    off.reminders = { ...off.reminders, off: ['ministry'] };
    expect(reportNotifyDue(off, '2026-11-01')).toBe(false);
  });
});

describe('reportLines and reportText', () => {
  const logged = (patch, pioneer = false) =>
    setMinistry({ ...makeStore(), pioneer }, '2026-10-12', patch);

  it('lists shared and studies', () => {
    const s = logged({ shared: true, studies: 2, hours: 12 });
    expect(reportLines(s, '2026-11-03', t)).toEqual([
      'Shared in the ministry: Yes',
      'Bible studies: 2',
    ]);
    expect(reportText(s, '2026-11-03', t)).toBe(
      'October 2026 — Shared in the ministry: Yes · Bible studies: 2'
    );
  });
  it('adds hours only for pioneers with a numeric value', () => {
    const s = logged({ shared: true, studies: 2, hours: 12 }, true);
    expect(reportText(s, '2026-11-03', t)).toBe(
      'October 2026 — Shared in the ministry: Yes · Bible studies: 2 · Hours: 12'
    );
    expect(reportLines(logged({ shared: false, studies: 0 }, true), '2026-11-03', t)).toEqual([
      'Shared in the ministry: No',
      'Bible studies: 0',
    ]);
  });
  it('says nothing was logged without an entry', () => {
    expect(reportLines(makeStore(), '2026-11-03', t)).toEqual(['Nothing logged for October.']);
    expect(reportText(makeStore(), '2026-11-03', t)).toBe(
      'October 2026 — Nothing logged for October.'
    );
  });
  it('ignores an entry from the current month', () => {
    const s = setMinistry(makeStore(), '2026-11-02', { shared: true });
    expect(reportLines(s, '2026-11-03', t)).toEqual(['Nothing logged for October.']);
  });
});
