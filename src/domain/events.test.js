import { describe, it, expect } from 'vitest';
import { defaultStore, validateStore, MAX_EVENTS } from './store.js';
import { addDays } from './day.js';
import {
  addEvent,
  updateEvent,
  removeEvent,
  sortedEvents,
  upcoming,
  pastEvents,
  eventLabel,
  eventErrors,
  nextComing,
  shortDate,
  eventDates,
} from './events.js';

const TODAY = '2026-11-01';
const fresh = () => defaultStore(TODAY, 'en');
const valid = (s) => expect(validateStore(s).ok).toBe(true);
const t = (key) => `t:${key}`;

const assembly = (start, over = {}) => ({
  kind: 'assembly',
  title: null,
  start,
  end: null,
  link: null,
  ...over,
});

function withEvents(...inputs) {
  return inputs.reduce((s, input) => addEvent(s, input), fresh());
}

describe('addEvent', () => {
  it('gives a new id and keeps the input id out', () => {
    const s = addEvent(fresh(), { ...assembly('2026-11-14'), id: 'mine' });
    expect(s.events).toHaveLength(1);
    expect(s.events[0].id).not.toBe('mine');
    expect(typeof s.events[0].id).toBe('string');
    expect(s.events[0]).toEqual({
      id: s.events[0].id,
      kind: 'assembly',
      title: null,
      start: '2026-11-14',
      end: null,
      link: null,
    });
    valid(s);
  });

  it('gives each event its own id', () => {
    const s = withEvents(assembly('2026-11-14'), assembly('2026-11-14'));
    expect(s.events[0].id).not.toBe(s.events[1].id);
    valid(s);
  });

  it('trims the name and link, and stores blanks as null', () => {
    const s = addEvent(
      fresh(),
      assembly('2026-11-14', { title: '  Spring  ', link: ' https://example.org/a ', end: '' })
    );
    expect(s.events[0]).toMatchObject({
      title: 'Spring',
      link: 'https://example.org/a',
      end: null,
    });
    const blank = addEvent(fresh(), assembly('2026-11-14', { title: '   ', link: '' }));
    expect(blank.events[0]).toMatchObject({ title: null, link: null });
    valid(s);
    valid(blank);
  });

  it('refuses an invalid event (store unchanged)', () => {
    const s = fresh();
    expect(addEvent(s, { ...assembly('2026-11-14'), kind: 'party' })).toBe(s);
    expect(addEvent(s, { kind: 'other', title: ' ', start: '2026-11-14' })).toBe(s);
    expect(addEvent(s, assembly('2026-11-14', { end: '2026-11-13' }))).toBe(s);
    expect(addEvent(s, assembly('2026-11-14', { link: 'javascript:alert(1)' }))).toBe(s);
    expect(addEvent(s, assembly('2026-02-30'))).toBe(s);
    expect(addEvent(s, assembly('2026-11-14', { title: 'x'.repeat(61) }))).toBe(s);
    expect(addEvent(s, null)).toBe(s);
  });

  it('refuses a new event at MAX_EVENTS', () => {
    let s = fresh();
    for (let i = 0; i < MAX_EVENTS; i += 1) s = addEvent(s, assembly(addDays(TODAY, i)));
    expect(s.events).toHaveLength(MAX_EVENTS);
    valid(s);
    expect(addEvent(s, assembly(TODAY))).toBe(s);
  });
});

describe('updateEvent and removeEvent', () => {
  it('updates the fields given and keeps the id', () => {
    const s = withEvents(assembly('2026-11-14'));
    const id = s.events[0].id;
    const next = updateEvent(s, id, {
      kind: 'other',
      title: 'Bethel tour',
      end: '2026-11-15',
      id: 'x',
    });
    expect(next.events[0]).toEqual({
      id,
      kind: 'other',
      title: 'Bethel tour',
      start: '2026-11-14',
      end: '2026-11-15',
      link: null,
    });
    valid(next);
  });

  it('refuses an unknown id or a patch that would be invalid', () => {
    const s = withEvents(assembly('2026-11-14'));
    const id = s.events[0].id;
    expect(updateEvent(s, 'nope', { title: 'A' })).toBe(s);
    expect(updateEvent(s, id, { kind: 'other' })).toBe(s);
    expect(updateEvent(s, id, { end: '2026-11-01' })).toBe(s);
    expect(updateEvent(s, id, { link: 'ftp://x' })).toBe(s);
    expect(updateEvent(s, id, null)).toBe(s);
  });

  it('removes an event, and an unknown id changes nothing', () => {
    const s = withEvents(assembly('2026-11-14'), assembly('2026-11-20'));
    const next = removeEvent(s, s.events[0].id);
    expect(next.events.map((e) => e.start)).toEqual(['2026-11-20']);
    valid(next);
    expect(removeEvent(s, 'nope')).toBe(s);
  });
});

describe('sortedEvents, upcoming and pastEvents', () => {
  it('sorts by start, then id', () => {
    const s = {
      ...fresh(),
      events: [
        { ...assembly('2026-12-01'), id: 'b' },
        { ...assembly('2026-11-14'), id: 'z' },
        { ...assembly('2026-11-14'), id: 'a' },
      ],
    };
    expect(sortedEvents(s).map((e) => e.id)).toEqual(['a', 'z', 'b']);
  });

  it('includes start === day and day + 14, excludes day + 15 and yesterday', () => {
    const s = withEvents(
      assembly(addDays(TODAY, 15)),
      assembly(addDays(TODAY, 14)),
      assembly(TODAY),
      assembly(addDays(TODAY, -1))
    );
    expect(upcoming(s, TODAY, 14).map((e) => e.start)).toEqual([TODAY, addDays(TODAY, 14)]);
  });

  it('does not count an event whose start has passed, even if it is still going', () => {
    const s = withEvents(assembly(addDays(TODAY, -1), { end: addDays(TODAY, 1) }));
    expect(upcoming(s, TODAY, 14)).toEqual([]);
    expect(nextComing(s, TODAY)).toBeNull();
  });

  it('lists everything before today as past, most recent first', () => {
    const s = withEvents(
      assembly('2026-10-01'),
      assembly(TODAY),
      assembly('2026-10-20'),
      assembly('2027-01-01')
    );
    expect(pastEvents(s, TODAY).map((e) => e.start)).toEqual(['2026-10-20', '2026-10-01']);
    expect(upcoming(s, TODAY, Infinity).map((e) => e.start)).toEqual([TODAY, '2027-01-01']);
  });

  it('nextComing is the first event starting within 14 days', () => {
    const s = withEvents(assembly('2026-11-20'), assembly('2026-11-14'));
    expect(nextComing(s, TODAY).start).toBe('2026-11-14');
    expect(nextComing(withEvents(assembly('2026-11-16')), TODAY)).toBeNull();
  });
});

describe('eventLabel', () => {
  it('uses the title when set and the kind name when it is null or blank', () => {
    expect(eventLabel({ kind: 'assembly', title: 'Spring assembly' }, t)).toBe('Spring assembly');
    expect(eventLabel({ kind: 'assembly', title: null }, t)).toBe('t:fd.events.kind.assembly');
    expect(eventLabel({ kind: 'memorial', title: '   ' }, t)).toBe('t:fd.events.kind.memorial');
  });
});

describe('eventErrors', () => {
  it('names each problem the store would refuse', () => {
    expect(eventErrors(assembly('2026-11-14'))).toEqual({});
    expect(eventErrors({ kind: 'other', title: ' ', start: '2026-11-14' })).toEqual({
      title: 'titleNeeded',
    });
    expect(eventErrors(assembly(''))).toEqual({ start: 'startNeeded' });
    expect(eventErrors(assembly('2026-11-14', { end: '2026-11-13' }))).toEqual({
      end: 'endBeforeStart',
    });
    expect(eventErrors(assembly('2026-11-14', { link: 'javascript:x' }))).toEqual({
      link: 'badLink',
    });
    expect(eventErrors(assembly('2026-11-14', { title: 'x'.repeat(61) }))).toEqual({
      title: 'titleTooLong',
    });
    expect(eventErrors(assembly('2026-11-14', { end: 'nope' }))).toEqual({ end: 'badEnd' });
    expect(eventErrors(assembly('2026-11-14', { kind: 'party' }))).toEqual({ kind: 'kindNeeded' });
  });
});

describe('every writer keeps the store valid', () => {
  it('passes validateStore after a sequence of writes', () => {
    let s = fresh();
    const kinds = ['memorial', 'convention', 'assembly', 'coVisit', 'other'];
    for (let i = 0; i < 30; i += 1) {
      s = addEvent(s, {
        kind: kinds[i % 5],
        title: i % 3 === 0 ? `Event ${i}` : i % 5 === 4 ? null : '  ',
        start: addDays(TODAY, i - 10),
        end: i % 2 ? addDays(TODAY, i - 9) : null,
        link: i % 4 === 0 ? 'https://example.org' : i % 4 === 1 ? 'bad' : null,
      });
      valid(s);
      if (s.events.length > 2) {
        s = updateEvent(s, s.events[1].id, { title: i % 2 ? 'Renamed' : '' });
        valid(s);
      }
      if (i % 7 === 0 && s.events.length) {
        s = removeEvent(s, s.events[0].id);
        valid(s);
      }
    }
  });
});

describe('shortDate and eventDates', () => {
  it('formats "Sat 14 Nov", with the year on request', () => {
    expect(shortDate('2026-11-14', 'en')).toBe('Sat 14 Nov');
    expect(shortDate('2027-03-21', 'en', true)).toBe('Sun 21 Mar 2027');
  });

  it('shows a range when the event ends later, and the year outside this one', () => {
    const e = { start: '2026-11-14', end: '2026-11-15' };
    expect(eventDates(e, 'en', TODAY)).toBe('Sat 14 Nov – Sun 15 Nov');
    expect(eventDates({ start: '2026-11-14', end: null }, 'en', TODAY)).toBe('Sat 14 Nov');
    expect(eventDates({ start: '2026-11-14', end: '2026-11-14' }, 'en', TODAY)).toBe('Sat 14 Nov');
    expect(eventDates({ start: '2027-03-21', end: null }, 'en', TODAY)).toBe('Sun 21 Mar 2027');
  });
});
