import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useCallback, useMemo, useState } from 'react';
// eslint-disable-next-line no-unused-vars -- used via JSX
import { MemoryRouter, Route, Routes } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars -- used via JSX
import { StoreContext } from '../data/useStore.js';
import { defaultStore } from '../domain/store.js';
import { createPlan, setStepDone } from '../domain/plans.js';
import { setAgenda } from '../domain/agenda.js';
import { openLink } from '../native/openLink.js';
// eslint-disable-next-line no-unused-vars -- used via JSX
import FamilyWeeks from './FamilyWeeks.jsx';

vi.mock('../native/openLink.js', () => ({ openLink: vi.fn() }));

const TODAY = '2026-10-07'; // a Wednesday; this week's Monday is 2026-10-05
const NEXT = '2026-10-12';
const AFTER = '2026-10-19';
let current;

// eslint-disable-next-line no-unused-vars -- used via JSX
function Harness({ initial }) {
  const [store, setStore] = useState(initial);
  current = store;
  const update = useCallback((fn) => setStore((s) => fn(s)), []);
  const value = useMemo(() => ({ store, update, today: TODAY }), [store, update]);
  return (
    <StoreContext.Provider value={value}>
      <MemoryRouter initialEntries={['/plans/family']}>
        <Routes>
          <Route path="/plans/family" element={<FamilyWeeks />} />
        </Routes>
      </MemoryRouter>
    </StoreContext.Provider>
  );
}

const steps = (names) => names.map((title) => ({ title, link: null, note: null }));

function twoPlans() {
  let s = { ...defaultStore('2026-09-01', 'en'), onboardingDone: true };
  s = createPlan(
    s,
    { title: 'Songs', kind: 'family', colour: 1, icon: 'dove', steps: steps(['S1', 'S2', 'S3']) },
    '2026-09-01'
  ).store;
  s = createPlan(
    s,
    { title: 'Stories', kind: 'family', colour: 3, icon: 'sun', steps: steps(['T1', 'T2', 'T3']) },
    '2026-09-02'
  ).store;
  return s;
}

const week = (monday) => within(screen.getByTestId(`week-${monday}`));
const itemText = (monday) =>
  week(monday)
    .queryAllByRole('listitem')
    .map((li) => li.textContent)
    .join(' | ');
const itemCount = (monday) => week(monday).queryAllByRole('listitem').length;

beforeEach(() => openLink.mockClear());

describe('FamilyWeeks', () => {
  it('lists this week and the next 8', () => {
    render(<Harness initial={twoPlans()} />);
    expect(screen.getAllByTestId(/^week-/)).toHaveLength(9);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Family worship weeks' })
    ).toBeInTheDocument();
  });

  it('shows 2 suggested items for next week from 2 family plans', () => {
    render(<Harness initial={twoPlans()} />);
    expect(week(NEXT).getByText('Suggested')).toBeInTheDocument();
    expect(itemCount(NEXT)).toBe(2);
    expect(itemText(NEXT)).toContain('S1');
    expect(itemText(NEXT)).toContain('T1');
  });

  it('Keep stores the preview and the following week advances', () => {
    render(<Harness initial={twoPlans()} />);
    fireEvent.click(week(NEXT).getByRole('button', { name: /^Keep/ }));
    expect(current.familyAgendas[NEXT]).toHaveLength(2);
    expect(current.familyAgendas[NEXT][0].id.startsWith('preview-')).toBe(false);
    expect(week(NEXT).queryByText('Suggested')).toBeNull();
    expect(week(NEXT).queryByRole('button', { name: /^Keep/ })).toBeNull();
    expect(itemText(AFTER)).toContain('S2');
    expect(itemText(AFTER)).toContain('T2');
  });

  it('removes an item and keeps what is left', () => {
    render(<Harness initial={twoPlans()} />);
    fireEvent.click(week(NEXT).getByRole('button', { name: 'Remove S1' }));
    expect(current.familyAgendas[NEXT]).toHaveLength(1);
    expect(itemCount(NEXT)).toBe(1);
  });

  it('adds a free item with an https link', () => {
    render(<Harness initial={twoPlans()} />);
    fireEvent.click(week(NEXT).getByRole('button', { name: 'Add to this week' }));
    fireEvent.change(week(NEXT).getByLabelText('Title'), { target: { value: 'Game night' } });
    fireEvent.change(week(NEXT).getByLabelText('Link (optional)'), {
      target: { value: 'https://example.org/x' },
    });
    fireEvent.click(week(NEXT).getByRole('button', { name: 'Add item' }));
    const items = current.familyAgendas[NEXT];
    expect(items).toHaveLength(3);
    expect(items[2]).toMatchObject({ kind: 'free', title: 'Game night' });
  });

  it('a free item with a non-https link shows the inline error and stores nothing', () => {
    render(<Harness initial={twoPlans()} />);
    fireEvent.click(week(NEXT).getByRole('button', { name: 'Add to this week' }));
    fireEvent.change(week(NEXT).getByLabelText('Title'), { target: { value: 'Bad' } });
    const link = week(NEXT).getByLabelText('Link (optional)');
    fireEvent.change(link, { target: { value: 'ftp://example.org/file' } });
    fireEvent.click(week(NEXT).getByRole('button', { name: 'Add item' }));
    expect(
      week(NEXT).getByText('Use a web address that starts with https:// or http://')
    ).toBeInTheDocument();
    expect(link).toHaveAttribute('aria-invalid', 'true');
    expect(current.familyAgendas[NEXT]).toBeUndefined();
  });

  it('adds a step from a family plan with the picker', () => {
    render(<Harness initial={twoPlans()} />);
    fireEvent.click(week(NEXT).getByRole('button', { name: 'Add to this week' }));
    fireEvent.change(week(NEXT).getByLabelText('Step from a plan'), {
      target: { value: current.plans[0].steps[2].id },
    });
    fireEvent.click(week(NEXT).getByRole('button', { name: 'Add step' }));
    expect(itemText(NEXT)).toContain('S3');
    expect(current.familyAgendas[NEXT]).toHaveLength(3);
  });

  it('disables adding when the week has 5 items', () => {
    let s = twoPlans();
    const items = Array.from({ length: 5 }, (_, i) => ({
      id: `f${i}`,
      kind: 'free',
      title: `Item ${i}`,
      link: null,
    }));
    s = setAgenda(s, NEXT, items);
    render(<Harness initial={s} />);
    expect(week(NEXT).getByRole('button', { name: 'Add to this week' })).toBeDisabled();
    expect(week(NEXT).getByText('This week is full (5 items).')).toBeInTheDocument();
  });

  it('opens a free item link', () => {
    let s = twoPlans();
    s = setAgenda(s, NEXT, [
      { id: 'f1', kind: 'free', title: 'Read', link: 'https://example.org/r' },
    ]);
    render(<Harness initial={s} />);
    fireEvent.click(week(NEXT).getByRole('button', { name: 'Open link for Read' }));
    expect(openLink).toHaveBeenCalledWith('https://example.org/r');
  });

  it('shows earlier weeks read-only with the done state', () => {
    let s = twoPlans();
    const planId = s.plans[0].id;
    const stepId = s.plans[0].steps[0].id;
    s = setStepDone(s, planId, stepId, '2026-09-23');
    s = setAgenda(s, '2026-09-21', [
      { id: 'a', kind: 'step', planId, stepId },
      { id: 'b', kind: 'free', title: 'Picnic', link: null },
    ]);
    render(<Harness initial={s} />);
    fireEvent.click(screen.getByText('Earlier weeks'));
    const past = within(screen.getByTestId('week-2026-09-21'));
    expect(past.getByText('S1, done')).toBeInTheDocument();
    expect(past.getByText('Picnic')).toBeInTheDocument();
    expect(past.queryByRole('button')).toBeNull();
  });

  it('shows a hint when there are no family plans', () => {
    const s = { ...defaultStore('2026-09-01', 'en'), onboardingDone: true };
    render(<Harness initial={s} />);
    expect(screen.getByText(/Make a family plan/)).toBeInTheDocument();
  });
});
