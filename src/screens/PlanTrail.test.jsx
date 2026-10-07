import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useCallback, useMemo, useState } from 'react';
// eslint-disable-next-line no-unused-vars -- used via JSX
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { openLink } from '../native/openLink.js';
// eslint-disable-next-line no-unused-vars -- used via JSX
import { StoreContext } from '../data/useStore.js';
import { defaultStore } from '../domain/store.js';
import { finderUrl } from '../domain/bible.js';
import { archivePlan, createPlan, generateBibleBook, setActiveStudy } from '../domain/plans.js';
// eslint-disable-next-line no-unused-vars -- used via JSX
import PlanTrail from './PlanTrail.jsx';

vi.mock('../native/openLink.js', () => ({ openLink: vi.fn() }));

const TODAY = '2026-10-07';
let current;

// eslint-disable-next-line no-unused-vars -- used via JSX
function Harness({ initial, path }) {
  const [store, setStore] = useState(initial);
  current = store;
  const update = useCallback((fn) => setStore((s) => fn(s)), []);
  const value = useMemo(() => ({ store, update, today: TODAY }), [store, update]);
  return (
    <StoreContext.Provider value={value}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/plans" element={<p>plans list</p>} />
          <Route path="/plans/:planId" element={<PlanTrail />} />
        </Routes>
      </MemoryRouter>
    </StoreContext.Provider>
  );
}

function danielStore() {
  const s = { ...defaultStore('2026-09-01', 'en'), onboardingDone: true };
  const { store, planId } = createPlan(
    s,
    {
      title: 'Daniel',
      kind: 'study',
      colour: 2,
      icon: 'scroll',
      steps: generateBibleBook(27, 'en'),
    },
    '2026-09-01'
  );
  return { store, planId };
}

function renderTrail(store, planId) {
  return render(<Harness initial={store} path={`/plans/${planId}`} />);
}

const stops = () => within(screen.getByRole('list', { name: 'Steps' })).getAllByRole('button');
const stopLabels = () => stops().map((b) => b.getAttribute('aria-label'));
const plan = () => current.plans[0];

function openStop(name) {
  fireEvent.click(screen.getByRole('button', { name }));
  return screen.getByRole('dialog');
}

beforeEach(() => openLink.mockClear());

describe('PlanTrail', () => {
  it('draws one stop per step on an SVG path', () => {
    const { store, planId } = danielStore();
    const { container } = renderTrail(store, planId);
    expect(screen.getByRole('heading', { level: 1, name: 'Daniel' })).toBeInTheDocument();
    expect(screen.getByText('0 of 12')).toBeInTheDocument();
    expect(stops()).toHaveLength(12);
    expect(container.querySelector('svg path')).not.toBeNull();
    expect(stopLabels().slice(0, 3)).toEqual([
      'Daniel 1, next',
      'Daniel 2, not yet',
      'Daniel 3, not yet',
    ]);
  });

  it('marks a stop done from its sheet: 1 of 12, and the next stop moves on', () => {
    const { store, planId } = danielStore();
    renderTrail(store, planId);
    const dialog = openStop('Daniel 1, next');
    expect(within(dialog).getByRole('heading', { name: 'Daniel 1' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark done' }));

    expect(plan().steps[0].doneOn).toBe(TODAY);
    expect(screen.getByText('1 of 12')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Mark not done' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));

    expect(stops()).toHaveLength(12);
    expect(stopLabels().slice(0, 3)).toEqual([
      'Daniel 1, done',
      'Daniel 2, next',
      'Daniel 3, not yet',
    ]);
  });

  it('fills done stops with the plan colour and lets only the next stop glow, motion-safe', () => {
    const { store, planId } = danielStore();
    renderTrail(store, planId);
    fireEvent.click(within(openStop('Daniel 1, next')).getByRole('button', { name: 'Mark done' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    const [done, next, later] = stops();
    expect(done.style.backgroundColor).toBe('rgb(123, 94, 167)'); // #7B5EA7, colour 2
    expect(later.style.backgroundColor).not.toBe('rgb(123, 94, 167)');
    const glows = document.querySelectorAll('[data-glow]');
    expect(glows).toHaveLength(1);
    expect(next.parentElement.contains(glows[0])).toBe(true);
    expect(glows[0].getAttribute('class')).toContain('motion-safe:');
  });

  it('marks a done stop not done again', () => {
    const { store, planId } = danielStore();
    renderTrail(store, planId);
    const dialog = openStop('Daniel 1, next');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark done' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark not done' }));
    expect(plan().steps[0].doneOn).toBeNull();
    expect(screen.getByText('0 of 12')).toBeInTheDocument();
  });

  it('shows the step link with its label and opens it through openLink', () => {
    const { store, planId } = danielStore();
    renderTrail(store, planId);
    const dialog = openStop('Daniel 2, not yet');
    expect(within(dialog).getByText('Opens in JW Library')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /Open/ }));
    expect(openLink).toHaveBeenCalledWith(finderUrl('en', 27, 2));
  });

  it('edits the title, link and note, and refuses an unsafe link', () => {
    const { store, planId } = danielStore();
    renderTrail(store, planId);
    const dialog = openStop('Daniel 1, next');
    fireEvent.change(within(dialog).getByLabelText('Title'), {
      target: { value: 'Daniel 1 again' },
    });
    fireEvent.change(within(dialog).getByLabelText('Link'), {
      target: { value: 'javascript:alert(1)' },
    });
    fireEvent.change(within(dialog).getByLabelText('Note'), { target: { value: 'Read with Mum' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(within(dialog).getByText(/https:/)).toBeInTheDocument();
    expect(plan().steps[0].title).toBe('Daniel 1');

    fireEvent.change(within(dialog).getByLabelText('Link'), {
      target: { value: 'https://example.org/x' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(plan().steps[0]).toMatchObject({
      title: 'Daniel 1 again',
      link: 'https://example.org/x',
      note: 'Read with Mum',
    });
    expect(within(dialog).getByText('example.org')).toBeInTheDocument();
  });

  it('moves a step up and down', () => {
    const { store, planId } = danielStore();
    renderTrail(store, planId);
    const dialog = openStop('Daniel 1, next');
    expect(within(dialog).getByRole('button', { name: 'Move up' })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move down' }));
    expect(
      plan()
        .steps.slice(0, 2)
        .map((s) => s.title)
    ).toEqual(['Daniel 2', 'Daniel 1']);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move up' }));
    expect(
      plan()
        .steps.slice(0, 2)
        .map((s) => s.title)
    ).toEqual(['Daniel 1', 'Daniel 2']);
  });

  it('deletes a step after a confirmation', () => {
    const { store, planId } = danielStore();
    renderTrail(store, planId);
    const dialog = openStop('Daniel 12, not yet');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete step' }));
    expect(plan().steps).toHaveLength(12);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(plan().steps).toHaveLength(11);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(stops()).toHaveLength(11);
  });

  it('adds a step at the end', () => {
    const { store, planId } = danielStore();
    renderTrail(store, planId);
    fireEvent.change(screen.getByLabelText('Add a step'), { target: { value: 'Review' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(stops()).toHaveLength(13);
    expect(plan().steps.at(-1).title).toBe('Review');
    expect(screen.getByLabelText('Add a step')).toHaveValue('');
  });

  it('makes a waiting project active', () => {
    const { store, planId } = danielStore();
    renderTrail(store, planId);
    fireEvent.click(screen.getByRole('button', { name: 'Make this the active project' }));
    expect(current.activePlan.personalStudy).toBe(planId);
    expect(screen.getByText('Active project')).toBeInTheDocument();
  });

  it('deletes the plan after a confirmation and goes back to Plans', () => {
    const { store, planId } = danielStore();
    renderTrail(setActiveStudy(store, planId), planId);
    fireEvent.click(screen.getByRole('button', { name: 'Delete plan' }));
    expect(current.plans).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(current.plans).toHaveLength(0);
    expect(current.activePlan.personalStudy).toBeNull();
    expect(screen.getByText('plans list')).toBeInTheDocument();
  });

  it('shows a completed plan read-only, with Restore', () => {
    const { store, planId } = danielStore();
    renderTrail(archivePlan(store, planId, TODAY), planId);
    expect(screen.queryByLabelText('Add a step')).not.toBeInTheDocument();
    const dialog = openStop('Daniel 1, next');
    expect(within(dialog).queryByRole('button', { name: 'Mark done' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Delete step' })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(plan().archivedOn).toBeNull();
    expect(screen.getByLabelText('Add a step')).toBeInTheDocument();
  });

  it('says so when the plan is not there', () => {
    const { store } = danielStore();
    renderTrail(store, 'nope');
    expect(screen.getByText(/isn.t here/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Plans/ })).toHaveAttribute('href', '/plans');
  });
});
