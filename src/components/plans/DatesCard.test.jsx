import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useCallback, useMemo, useState } from 'react';
// eslint-disable-next-line no-unused-vars -- used via JSX
import { StoreContext } from '../../data/useStore.js';
import { defaultStore, MAX_EVENTS, validateStore } from '../../domain/store.js';
import { addEvent } from '../../domain/events.js';
import { addDays } from '../../domain/day.js';
import { openLink } from '../../native/openLink.js';
// eslint-disable-next-line no-unused-vars -- used via JSX
import DatesCard from './DatesCard.jsx';

vi.mock('../../native/openLink.js', () => ({ openLink: vi.fn() }));

const TODAY = '2026-11-01';
let current;

// eslint-disable-next-line no-unused-vars -- used via JSX
function Harness({ initial }) {
  const [store, setStore] = useState(initial);
  current = store;
  const update = useCallback((fn) => setStore((s) => fn(s)), []);
  const value = useMemo(() => ({ store, update, today: TODAY }), [store, update]);
  return (
    <StoreContext.Provider value={value}>
      <DatesCard />
    </StoreContext.Provider>
  );
}

const base = () => ({ ...defaultStore('2026-09-01', 'en'), onboardingDone: true });
const renderCard = (store = base()) => render(<Harness initial={store} />);
const card = () => screen.getByRole('region', { name: 'Dates' });
const upcomingList = () => within(card()).getByRole('list', { name: 'Dates' });
const dialog = () => screen.getByRole('dialog');

function openAdd() {
  fireEvent.click(within(card()).getByRole('button', { name: 'Add date' }));
  return dialog();
}

function fill(d, { kind, name, start, end, link }) {
  const field = (label) => within(d).getByLabelText(label);
  if (kind) fireEvent.change(field('Type'), { target: { value: kind } });
  if (name !== undefined) fireEvent.change(field(/^Name/), { target: { value: name } });
  if (start !== undefined) fireEvent.change(field('Starts'), { target: { value: start } });
  if (end !== undefined) fireEvent.change(field('Ends (optional)'), { target: { value: end } });
  if (link !== undefined) fireEvent.change(field('Link (optional)'), { target: { value: link } });
}

const save = (d) => fireEvent.click(within(d).getByRole('button', { name: 'Save' }));

beforeEach(() => {
  vi.mocked(openLink).mockClear();
});

describe('DatesCard', () => {
  it('adding a "Circuit assembly" on 2026-11-14 lists it under upcoming', () => {
    renderCard();
    expect(within(card()).getByText('No dates coming up.')).toBeInTheDocument();
    const d = openAdd();
    fill(d, { kind: 'assembly', start: '2026-11-14' });
    save(d);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(current.events).toHaveLength(1);
    expect(current.events[0]).toMatchObject({ kind: 'assembly', title: null, start: '2026-11-14' });
    expect(validateStore(current).ok).toBe(true);
    const item = within(upcomingList()).getByRole('button', { name: /Circuit assembly/ });
    expect(item).toHaveTextContent('Sat 14 Nov');
  });

  it('choosing "Other" with a blank name keeps the Save button disabled', () => {
    renderCard();
    const d = openAdd();
    fill(d, { kind: 'other', start: '2026-11-14', name: '   ' });
    expect(within(d).getByRole('button', { name: 'Save' })).toBeDisabled();
    fill(d, { name: 'Bethel tour' });
    expect(within(d).getByRole('button', { name: 'Save' })).toBeEnabled();
    save(d);
    expect(current.events[0]).toMatchObject({ kind: 'other', title: 'Bethel tour' });
  });

  it('an end date before the start shows an error and does not save', () => {
    renderCard();
    const d = openAdd();
    fill(d, { kind: 'convention', start: '2026-11-14', end: '2026-11-13' });
    save(d);
    expect(within(d).getByText("The end can't be before the start")).toBeInTheDocument();
    expect(within(d).getByLabelText('Ends (optional)')).toHaveAttribute('aria-invalid', 'true');
    expect(current.events).toEqual([]);
  });

  it('a missing start date shows an error and does not save', () => {
    renderCard();
    const d = openAdd();
    save(d);
    expect(within(d).getByText('Choose a start date')).toBeInTheDocument();
    expect(current.events).toEqual([]);
  });

  it('an unsafe link is flagged and not saved', () => {
    renderCard();
    const d = openAdd();
    fill(d, { kind: 'memorial', start: '2027-03-23', link: 'javascript:alert(1)' });
    save(d);
    expect(
      within(d).getByText('Use a web address that starts with https:// or http://')
    ).toBeInTheDocument();
    expect(current.events).toEqual([]);
    fill(d, { link: 'https://example.org/memorial' });
    save(d);
    expect(current.events[0].link).toBe('https://example.org/memorial');
  });

  it('opens an event link with openLink', () => {
    const s = addEvent(base(), {
      kind: 'coVisit',
      start: '2026-11-10',
      link: 'https://example.org/visit',
    });
    renderCard(s);
    fireEvent.click(
      within(card()).getByRole('button', { name: 'Open link for Circuit overseer visit' })
    );
    expect(openLink).toHaveBeenCalledWith('https://example.org/visit');
  });

  it('edits an event and keeps its id', () => {
    const s = addEvent(base(), { kind: 'assembly', start: '2026-11-14' });
    const id = s.events[0].id;
    renderCard(s);
    fireEvent.click(within(card()).getByRole('button', { name: /Circuit assembly/ }));
    const d = screen.getByRole('dialog', { name: 'Edit date' });
    expect(within(d).getByLabelText('Starts')).toHaveValue('2026-11-14');
    fill(d, { name: 'Spring assembly', end: '2026-11-15' });
    save(d);
    expect(current.events).toEqual([
      expect.objectContaining({ id, title: 'Spring assembly', end: '2026-11-15' }),
    ]);
    expect(within(card()).getByRole('button', { name: /Spring assembly/ })).toHaveTextContent(
      'Sat 14 Nov – Sun 15 Nov'
    );
  });

  it('delete removes the event', () => {
    const s = addEvent(base(), { kind: 'assembly', start: '2026-11-14' });
    renderCard(s);
    fireEvent.click(within(card()).getByRole('button', { name: /Circuit assembly/ }));
    const d = dialog();
    fireEvent.click(within(d).getByRole('button', { name: 'Delete date' }));
    fireEvent.click(within(d).getByRole('button', { name: 'Keep it' }));
    expect(current.events).toHaveLength(1);
    fireEvent.click(within(d).getByRole('button', { name: 'Delete date' }));
    fireEvent.click(within(d).getByRole('button', { name: 'Delete' }));
    expect(current.events).toEqual([]);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(card()).getByText('No dates coming up.')).toBeInTheDocument();
  });

  it('past events appear under "Past"', () => {
    let s = addEvent(base(), { kind: 'convention', start: '2026-08-07', end: '2026-08-09' });
    s = addEvent(s, { kind: 'assembly', start: '2026-11-14' });
    renderCard(s);
    const past = within(card()).getByRole('list', { name: 'Past' });
    expect(within(past).getByRole('button', { name: /Regional convention/ })).toHaveTextContent(
      'Fri 7 Aug – Sun 9 Aug'
    );
    expect(within(upcomingList()).queryByText(/Regional convention/)).toBeNull();
    expect(within(upcomingList()).getByText(/Circuit assembly/)).toBeInTheDocument();
  });

  it('lists an event still under way with the upcoming ones, not under Past', () => {
    const s = addEvent(base(), { kind: 'convention', start: '2026-10-30', end: '2026-11-02' });
    renderCard(s);
    expect(within(upcomingList()).getByText(/Regional convention/)).toBeInTheDocument();
    expect(within(card()).queryByRole('list', { name: 'Past' })).toBeNull();
  });

  it('closes the sheet without saving', () => {
    renderCard();
    const d = openAdd();
    fill(d, { kind: 'assembly', start: '2026-11-14' });
    fireEvent.click(within(d).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(current.events).toEqual([]);
  });

  it('disables "Add date" at the limit', () => {
    let s = base();
    for (let i = 0; i < MAX_EVENTS; i += 1) {
      s = addEvent(s, { kind: 'assembly', start: addDays('2026-01-01', i) });
    }
    renderCard(s);
    expect(within(card()).getByRole('button', { name: 'Add date' })).toBeDisabled();
    expect(within(card()).getByText(/most dates the app can keep/)).toBeInTheDocument();
  });
});
