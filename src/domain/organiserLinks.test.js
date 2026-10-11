import { describe, it, expect } from 'vitest';
import {
  emptyOrganiser,
  newOrganiserItem,
  organiserOccurrences,
  changeOccurrence,
} from './organiser.js';
import { linkedOrganiserOccurrence, organiserItemUrl } from './organiserLinks.js';
const today = '2026-10-10';
const make = (kind, over = {}) =>
  newOrganiserItem(
    kind,
    { title: 'QA activity', date: '2026-10-15', ...over },
    new Date('2026-10-10T12:00:00Z')
  );
const withItem = (kind, item) => ({
  ...emptyOrganiser(),
  [kind === 'task' ? 'tasks' : 'events']: [item],
});
describe('linked organiser activity', () => {
  it('encodes an item URL without introducing extra query fields', () => {
    const url = new URL(organiserItemUrl('task', 'id&itemKind=event'), 'https://example.test');
    expect(url.pathname).toBe('/plans');
    expect(url.searchParams.get('itemKind')).toBe('task');
    expect(url.searchParams.get('itemId')).toBe('id&itemKind=event');
    expect([...url.searchParams]).toHaveLength(2);
  });
  it('resolves a future event and keeps stored data unchanged', () => {
    const item = make('event', { date: '2029-10-15' });
    const state = withItem('event', item),
      before = JSON.stringify(state);
    expect(linkedOrganiserOccurrence(state, 'event', item.id, today)).toMatchObject({
      id: item.id,
      date: '2029-10-15',
      kind: 'event',
    });
    expect(JSON.stringify(state)).toBe(before);
  });
  it('does not lose an event when its timezone moves its display date', () => {
    const item = make('event', { time: '00:00', timezone: 'Pacific/Kiritimati' });
    expect(
      linkedOrganiserOccurrence(withItem('event', item), 'event', item.id, today)
    ).toMatchObject({ id: item.id, originalDate: '2026-10-15' });
  });
  it('opens a rescheduled task at its changed date with its original identity', () => {
    const item = make('task');
    let state = withItem('task', item);
    const occurrence = organiserOccurrences(state, 'task', item.date, item.date)[0];
    state = changeOccurrence(state, occurrence, { scheduledDate: '2026-10-22' });
    expect(linkedOrganiserOccurrence(state, 'task', item.id, today)).toMatchObject({
      id: item.id,
      originalDate: '2026-10-15',
      date: '2026-10-22',
    });
  });
  it('opens an undated task', () => {
    const item = make('task', { date: null });
    expect(linkedOrganiserOccurrence(withItem('task', item), 'task', item.id, today)).toMatchObject(
      { id: item.id, date: null }
    );
  });
  it('prefers an upcoming open occurrence in a recurring series', () => {
    const item = make('task', {
      date: '2026-10-01',
      repeat: { frequency: 'daily', weekdays: [], until: null },
    });
    let state = withItem('task', item);
    const occurrence = organiserOccurrences(state, 'task', today, today)[0];
    state = changeOccurrence(state, occurrence, { status: 'done' });
    expect(linkedOrganiserOccurrence(state, 'task', item.id, today).date).toBe('2026-10-11');
  });
  it('retains a finished series through its most recent occurrence', () => {
    const item = make('task', {
      date: '2026-10-01',
      repeat: { frequency: 'daily', weekdays: [], until: '2026-10-05' },
    });
    expect(linkedOrganiserOccurrence(withItem('task', item), 'task', item.id, today).date).toBe(
      '2026-10-05'
    );
  });
  it('can still open an older ended series outside the recent window', () => {
    const item = make('task', {
      date: '2020-01-01',
      repeat: { frequency: 'daily', weekdays: [], until: '2020-01-05' },
    });
    expect(linkedOrganiserOccurrence(withItem('task', item), 'task', item.id, today).date).toBe(
      '2020-01-01'
    );
  });

  it('does not open a missing, archived or unsupported target', () => {
    const item = make('task', { archivedAt: '2026-10-10T12:00:00Z' });
    const state = withItem('task', item);
    expect(linkedOrganiserOccurrence(state, 'task', item.id, today)).toBeNull();
    expect(linkedOrganiserOccurrence(state, 'task', 'missing', today)).toBeNull();
    expect(linkedOrganiserOccurrence(state, 'note', item.id, today)).toBeNull();
  });
});
