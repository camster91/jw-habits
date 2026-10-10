import { describe, it, expect } from 'vitest';
import { appDay } from './day.js';
import {
  emptyOrganiser,
  validDate,
  validZone,
  civilDate,
  newOrganiserItem,
  putOrganiserItem,
  validateOrganiser,
  organiserOccurrences,
  changeOccurrence,
  editFuture,
  archiveItem,
  linkNote,
  togglePersonalCheckIn,
  occurrenceInstant,
  calendarEvents,
} from './organiser.js';
import { planOrganiserNotifications } from './organiserNotifications.js';
import { defaultStore } from './store.js';
const now = new Date('2026-10-10T14:00:00Z');
const task = (overrides = {}) =>
  newOrganiserItem('task', { title: 'Prepare', date: '2026-10-10', ...overrides }, now);
const stateWith = (item) => ({ ...emptyOrganiser(), tasks: [item] });
const first = (s) => organiserOccurrences(s, 'task', '2026-10-10', '2026-10-10')[0];
describe('organiser data and occurrences', () => {
  it('validates without mutating and distinguishes civil dates from app days', () => {
    const s = stateWith(task());
    const result = validateOrganiser(s);
    expect(result.ok).toBe(true);
    result.organiser.tasks[0].title = 'Different';
    expect(s.tasks[0].title).toBe('Prepare');
    const late = new Date(2026, 9, 10, 1);
    expect(civilDate(late)).toBe('2026-10-10');
    expect(appDay(late)).toBe('2026-10-09');
    expect(validDate('2026-02-30')).toBe(false);
    expect(validDate(1)).toBe(false);
    expect(validZone('Not/AZone')).toBe(false);
    expect(validZone('UTC')).toBe(true);
  });
  it.each([
    null,
    { version: 2 },
    { ...emptyOrganiser(), revision: -1 },
    { ...emptyOrganiser(), tasks: [null] },
    { ...emptyOrganiser(), events: [null] },
    { ...emptyOrganiser(), exceptions: [null] },
    { ...emptyOrganiser(), personalRoutines: [null] },
    { ...emptyOrganiser(), routineCheckIns: [null] },
    { ...emptyOrganiser(), relations: [null] },
  ])('rejects malformed persisted values', (value) =>
    expect(validateOrganiser(value).ok).toBe(false)
  );
  it.each([
    { title: '' },
    { title: 'x'.repeat(121) },
    { details: 1 },
    { time: '25:00' },
    { time: '09:00', date: null },
    { timezone: 'UTC' },
    { reminder: true },
    { createdAt: 'bad' },
    { updatedAt: 'bad' },
    { archivedAt: 'bad' },
    { repeat: { frequency: 'weekly', weekdays: [], until: null } },
    { repeat: { frequency: 'daily', weekdays: [], until: '2026-10-09' } },
    { repeat: { frequency: 'monthly', weekdays: [1, 1], until: null } },
    { repeat: { frequency: 'none', weekdays: [8], until: null } },
    { repeat: { frequency: 'other', weekdays: [], until: null } },
  ])('rejects invalid task fields %j', (fields) =>
    expect(validateOrganiser(stateWith(task(fields))).ok).toBe(false)
  );
  it('rejects duplicate IDs and references rather than dropping records', () => {
    const t = task(),
      s = stateWith(t);
    expect(validateOrganiser({ ...s, tasks: [t, t] }).ok).toBe(false);
    expect(
      validateOrganiser({
        ...s,
        events: [newOrganiserItem('event', { title: 'Event', id: t.id }, now)],
      }).reason
    ).toBe('badReferences');
    expect(
      validateOrganiser({
        ...s,
        exceptions: [
          {
            id: 'bad',
            itemId: t.id,
            date: t.date,
            scheduledDate: t.date,
            status: 'open',
            completedAt: null,
            title: t.title,
            details: '',
            time: null,
          },
        ],
      }).reason
    ).toBe('badReferences');
    expect(validateOrganiser(linkNote(s, 'note', { kind: 'event', id: 'missing' })).reason).toBe(
      'badReferences'
    );
    const linked = linkNote(s, 'note', { kind: 'task', id: t.id });
    expect(linkNote(linked, 'note', { kind: 'task', id: t.id })).toBe(linked);
    expect(
      validateOrganiser({
        ...linked,
        relations: [...linked.relations, { ...linked.relations[0], id: 'second' }],
      }).reason
    ).toBe('badReferences');
  });
  it('validates timed and all-day event ends', () => {
    const event = (values) =>
      validateOrganiser({
        ...emptyOrganiser(),
        events: [
          newOrganiserItem(
            'event',
            { title: 'Meeting', date: '2026-10-10', timezone: 'America/Toronto', ...values },
            now
          ),
        ],
      }).ok;
    expect(event({})).toBe(true);
    expect(event({ endDate: '2026-10-11', endTime: null })).toBe(true);
    expect(event({ endDate: '2026-10-10', endTime: null })).toBe(false);
    expect(event({ time: '19:00', endDate: '2026-10-10', endTime: '20:00' })).toBe(true);
    expect(event({ time: '19:00', endDate: '2026-10-10', endTime: '18:00' })).toBe(false);
    expect(event({ time: '19:00', endDate: null, endTime: '20:00' })).toBe(false);
    expect(event({ timezone: 'bad' })).toBe(false);
  });
  it('creates and edits durable shapes without inventing completion', () => {
    let s = putOrganiserItem(emptyOrganiser(), 'task', { title: 'Undated' }, now);
    expect(s.tasks[0].date).toBeNull();
    expect(first(s).status).toBe('open');
    s = putOrganiserItem(s, 'task', { id: s.tasks[0].id, title: 'Edited' }, now);
    expect(s.tasks).toHaveLength(1);
    expect(s.tasks[0].title).toBe('Edited');
    expect(() => putOrganiserItem(s, 'task', { title: '' }, now)).toThrow('draft');
  });
  it('expands selected weekdays, skips absent monthly days and obeys end date', () => {
    let s = stateWith(
      task({ repeat: { frequency: 'weekly', weekdays: [6, 0], until: '2026-10-18' } })
    );
    expect(organiserOccurrences(s, 'task', '2026-10-10', '2026-10-30').map((o) => o.date)).toEqual([
      '2026-10-10',
      '2026-10-11',
      '2026-10-17',
      '2026-10-18',
    ]);
    s = stateWith(
      task({ date: '2026-01-31', repeat: { frequency: 'monthly', weekdays: [], until: null } })
    );
    expect(organiserOccurrences(s, 'task', '2026-02-01', '2026-03-31').map((o) => o.date)).toEqual([
      '2026-03-31',
    ]);
    expect(() => organiserOccurrences(s, 'task', 'bad', '2026-10-10')).toThrow('range');
    expect(() => organiserOccurrences(s, 'task', '2026-01-01', '2028-01-01')).toThrow('range');
    expect(() => organiserOccurrences(s, 'task', '2026-02-01', '2026-01-01')).toThrow('range');
  });
  it('reschedules outside the original range with stable identity and retains actual completion', () => {
    let s = stateWith(task()),
      o = first(s);
    s = changeOccurrence(s, o, { scheduledDate: '2026-10-12', status: 'done' }, now);
    expect(organiserOccurrences(s, 'task', '2026-10-10', '2026-10-10')).toHaveLength(0);
    const moved = organiserOccurrences(s, 'task', '2026-10-12', '2026-10-12')[0];
    expect(moved.key).toBe(o.key);
    expect(moved.completedAt).toBe(now.toISOString());
    s = changeOccurrence(s, moved, { status: 'open' }, now);
    expect(s.exceptions[0].completedAt).toBeNull();
    expect(() => changeOccurrence(s, moved, { status: 'other' })).toThrow('Invalid');
    s = changeOccurrence(s, moved, { scheduledDate: null });
    expect(organiserOccurrences(s, 'task', '2026-10-10', '2026-10-10')[0].date).toBeNull();
  });
  it('splits future recurrence without erasing earlier completion; archive keeps records', () => {
    let s = stateWith(task({ repeat: { frequency: 'daily', weekdays: [], until: null } }));
    s = changeOccurrence(s, first(s), { status: 'done' }, now);
    const later = organiserOccurrences(s, 'task', '2026-10-12', '2026-10-12')[0];
    s = editFuture(s, later, { title: 'New rhythm' }, now);
    expect(s.tasks).toHaveLength(2);
    expect(first(s).status).toBe('done');
    expect(organiserOccurrences(s, 'task', '2026-10-12', '2026-10-12')[0].title).toBe('New rhythm');
    s = archiveItem(s, 'task', s.tasks[1].id, now);
    expect(organiserOccurrences(s, 'task', '2026-10-12', '2026-10-12')).toHaveLength(0);
    expect(
      organiserOccurrences(s, 'task', '2026-10-12', '2026-10-12', { includeArchived: true })
    ).toHaveLength(1);
  });
  it('records custom routines separately and retains unique check-in dates', () => {
    let s = {
      ...emptyOrganiser(),
      personalRoutines: [
        {
          id: 'custom',
          title: 'Explore',
          cadence: 'weekly',
          icon: 'sparkles',
          url: 'https://www.jw.org/en/whats-new/',
          archivedAt: null,
        },
      ],
    };
    s = togglePersonalCheckIn(s, 'custom', '2026-10-10', now);
    expect(validateOrganiser(s).ok).toBe(true);
    expect(togglePersonalCheckIn(s, 'custom', '2026-10-10', now).routineCheckIns).toHaveLength(0);
    expect(
      validateOrganiser({
        ...s,
        routineCheckIns: [{ ...s.routineCheckIns[0], routineId: 'missing' }],
      }).ok
    ).toBe(false);
    expect(
      validateOrganiser({
        ...s,
        personalRoutines: [{ ...s.personalRoutines[0], url: 'javascript:alert(1)' }],
      }).ok
    ).toBe(false);
  });
  it('uses real timezone rules for gaps, overlaps and travel', () => {
    const e = (values) =>
      newOrganiserItem(
        'event',
        {
          title: 'Meeting',
          date: '2026-03-08',
          time: '02:30',
          timezone: 'America/Toronto',
          ...values,
        },
        now
      );
    expect(occurrenceInstant(e()).toISOString()).toBe('2026-03-08T07:30:00.000Z');
    expect(occurrenceInstant(e({ date: '2026-11-01', time: '01:30' })).toISOString()).toBe(
      '2026-11-01T05:30:00.000Z'
    );
    expect(
      occurrenceInstant(
        { ...task({ time: '07:00' }), date: '2026-10-10' },
        'America/Vancouver'
      ).toISOString()
    ).toBe('2026-10-10T14:00:00.000Z');
    expect(occurrenceInstant(task())).toBeNull();
  });
  it('reconciles reminders with completion, dates, quiet hours and global permission preference', () => {
    const store = defaultStore('2026-10-10', 'en');
    let s = stateWith(task({ time: '18:00', reminder: true }));
    const clock = new Date(2026, 9, 10, 10);
    expect(planOrganiserNotifications(s, store, clock)).toHaveLength(1);
    s = changeOccurrence(s, first(s), { status: 'done' }, now);
    expect(planOrganiserNotifications(s, store, clock)).toHaveLength(0);
    s = stateWith(task({ time: '18:00', reminder: true }));
    expect(
      planOrganiserNotifications(
        s,
        { ...store, quietHours: { start: '17:00', end: '19:00' } },
        clock
      )
    ).toHaveLength(0);
    expect(
      planOrganiserNotifications(
        s,
        { ...store, reminders: { ...store.reminders, enabled: false } },
        clock
      )
    ).toHaveLength(0);
    expect(planOrganiserNotifications(s, store, new Date(2026, 9, 10, 19))).toHaveLength(0);
  });
});

describe('calendar zones and event spans', () => {
  it('displays a fixed-zone event on the device calendar date across midnight', () => {
    const event = newOrganiserItem(
      'event',
      { title: 'Meeting', date: '2026-10-10', time: '00:30', timezone: 'Asia/Tokyo' },
      now
    );
    const s = { ...emptyOrganiser(), events: [event] };
    expect(calendarEvents(s, '2026-10-09', '2026-10-09', 'America/Toronto')[0]).toMatchObject({
      date: '2026-10-10',
      displayDate: '2026-10-09',
      displayTime: '11:30',
    });
    expect(calendarEvents(s, '2026-10-10', '2026-10-10', 'America/Toronto')).toEqual([]);
  });
  it('preserves all-day dates and displays each covered day with an exclusive end', () => {
    const event = newOrganiserItem(
      'event',
      { title: 'Convention', date: '2026-10-10', endDate: '2026-10-13' },
      now
    );
    const s = { ...emptyOrganiser(), events: [event] };
    expect(calendarEvents(s, '2026-10-12', '2026-10-12', 'Pacific/Honolulu')).toHaveLength(1);
    expect(calendarEvents(s, '2026-10-13', '2026-10-13', 'Pacific/Honolulu')).toHaveLength(0);
  });
  it('moves recurring event end dates with the occurrence and permits completing a later occurrence', () => {
    const event = newOrganiserItem(
      'event',
      {
        title: 'Weekly event',
        date: '2026-10-10',
        time: '10:00',
        endDate: '2026-10-10',
        endTime: '11:00',
        repeat: { frequency: 'weekly', weekdays: [6], until: null },
      },
      now
    );
    const s = { ...emptyOrganiser(), events: [event] };
    const occurrence = organiserOccurrences(s, 'event', '2026-10-17', '2026-10-17')[0];
    expect(occurrence.endDate).toBe('2026-10-17');
    expect(validateOrganiser(changeOccurrence(s, occurrence, { status: 'skipped' })).ok).toBe(true);
  });
});

it('rejects events spanning beyond the supported year without truncating them', () => {
  const event = newOrganiserItem(
    'event',
    { title: 'Long event', date: '2026-10-10', endDate: '2027-10-12' },
    now
  );
  expect(validateOrganiser({ ...emptyOrganiser(), events: [event] }).ok).toBe(false);
});
