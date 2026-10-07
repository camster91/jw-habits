import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useCallback, useMemo, useState } from 'react';
// eslint-disable-next-line no-unused-vars -- used via JSX
import { MemoryRouter, Route, Routes } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars -- used via JSX
import { StoreContext } from '../data/useStore.js';
import { defaultStore } from '../domain/store.js';
import { finderUrl } from '../domain/bible.js';
import { createPlan, generateChapters, setActiveStudy, setStepDone } from '../domain/plans.js';
// eslint-disable-next-line no-unused-vars -- used via JSX
import Plans from './Plans.jsx';

// The real domain, with createPlan spied on so a refusal can be forced.
vi.mock('../domain/plans.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, createPlan: vi.fn(actual.createPlan) };
});

const TODAY = '2026-10-07';
let current;

// eslint-disable-next-line no-unused-vars -- used via JSX
function Harness({ initial }) {
  const [store, setStore] = useState(initial);
  current = store;
  const update = useCallback((fn) => setStore((s) => fn(s)), []);
  const value = useMemo(() => ({ store, update, today: TODAY }), [store, update]);
  return (
    <StoreContext.Provider value={value}>
      <MemoryRouter initialEntries={['/plans']}>
        <Routes>
          <Route path="/plans" element={<Plans />} />
          <Route path="/plans/:planId" element={<p>trail</p>} />
        </Routes>
      </MemoryRouter>
    </StoreContext.Provider>
  );
}

const base = () => ({ ...defaultStore('2026-09-01', 'en'), onboardingDone: true });
const renderPlans = (store = base()) => render(<Harness initial={store} />);
const section = (name) => screen.getByRole('region', { name });

function add(store, input) {
  return createPlan(store, { colour: 0, icon: 'book', ...input }, '2026-09-01');
}

const BANNED = /missed|broke|failed|lost/i;

describe('Plans', () => {
  it('has the three sections', () => {
    renderPlans();
    expect(screen.getByRole('heading', { level: 1, name: 'Plans' })).toBeInTheDocument();
    expect(section('Study projects')).toBeInTheDocument();
    expect(section('Family worship')).toBeInTheDocument();
    expect(section('Completed')).toBeInTheDocument();
  });

  it('creates "Daniel" with the Bible-book generator and lists it with 0 of 12', () => {
    renderPlans();
    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    const dialog = screen.getByRole('dialog', { name: 'New project' });
    fireEvent.change(within(dialog).getByLabelText('Steps'), { target: { value: 'bibleBook' } });
    fireEvent.change(within(dialog).getByLabelText('Bible book'), { target: { value: '27' } });
    expect(within(dialog).getByLabelText('Title')).toHaveValue('Daniel');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const link = within(section('Study projects')).getByRole('link', { name: /Daniel/ });
    expect(link).toHaveTextContent('0 of 12');
    expect(link).toHaveTextContent('Next: Daniel 1');

    const plan = current.plans[0];
    expect(plan).toMatchObject({ title: 'Daniel', kind: 'study', createdOn: TODAY });
    expect(plan.steps).toHaveLength(12);
    expect(plan.steps[0].link).toBe(finderUrl('en', 27, 1));
    // The first project becomes the active one.
    expect(current.activePlan.personalStudy).toBe(plan.id);
    expect(link).toHaveAttribute('href', `/plans/${plan.id}`);
  });

  it('creates a family plan with the weekly generator, colour and icon', () => {
    renderPlans();
    fireEvent.click(screen.getByRole('button', { name: 'New family plan' }));
    const dialog = screen.getByRole('dialog', { name: 'New family plan' });
    fireEvent.change(within(dialog).getByLabelText('Title'), {
      target: { value: 'Evenings together' },
    });
    fireEvent.change(within(dialog).getByLabelText('Steps'), { target: { value: 'weekly' } });
    fireEvent.change(within(dialog).getByLabelText('How many'), { target: { value: '4' } });
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Green' }));
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Dove' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    const link = within(section('Family worship')).getByRole('link', {
      name: /Evenings together/,
    });
    expect(link).toHaveTextContent('0 of 4');
    expect(current.plans[0]).toMatchObject({ kind: 'family', colour: 6, icon: 'dove' });
    expect(current.plans[0].steps.map((s) => s.title)).toEqual([
      'Week 1',
      'Week 2',
      'Week 3',
      'Week 4',
    ]);
    expect(current.activePlan.personalStudy).toBeNull();
  });

  it('can start blank, and needs a title', () => {
    renderPlans();
    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    const dialog = screen.getByRole('dialog', { name: 'New project' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    expect(within(dialog).getByText('Give it a title')).toBeInTheDocument();
    expect(current.plans).toHaveLength(0);

    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Jeremiah' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    expect(current.plans[0].steps).toEqual([]);
    expect(
      within(section('Study projects')).getByRole('link', { name: /Jeremiah/ })
    ).toHaveTextContent('No steps yet');
  });

  it('refuses a step count outside 1 to 200', () => {
    renderPlans();
    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    const dialog = screen.getByRole('dialog', { name: 'New project' });
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'A book' } });
    fireEvent.change(within(dialog).getByLabelText('Steps'), { target: { value: 'chapters' } });
    fireEvent.change(within(dialog).getByLabelText('How many'), { target: { value: '201' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    const howMany = within(dialog).getByLabelText('How many');
    expect(howMany).toHaveAttribute('aria-invalid', 'true');
    expect(howMany).toHaveAccessibleDescription('Choose a number from 1 to 200');
    expect(current.plans).toHaveLength(0);
  });

  it('drops the auto-filled book title when leaving the Bible-book generator', () => {
    renderPlans();
    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    const dialog = screen.getByRole('dialog', { name: 'New project' });
    const steps = within(dialog).getByLabelText('Steps');
    fireEvent.change(steps, { target: { value: 'bibleBook' } });
    expect(within(dialog).getByLabelText('Title')).toHaveValue('Genesis');
    fireEvent.change(steps, { target: { value: 'chapters' } });
    expect(within(dialog).getByLabelText('Title')).toHaveValue('');

    // A title the user typed stays.
    fireEvent.change(steps, { target: { value: 'bibleBook' } });
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'My Genesis' } });
    fireEvent.change(steps, { target: { value: 'lessons' } });
    expect(within(dialog).getByLabelText('Title')).toHaveValue('My Genesis');
  });

  it('keeps the sheet open with a message when createPlan refuses', () => {
    renderPlans();
    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    const dialog = screen.getByRole('dialog', { name: 'New project' });
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Refused' } });
    createPlan.mockImplementationOnce((s) => ({ store: s, planId: null }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    expect(screen.getByRole('dialog', { name: 'New project' })).toBeInTheDocument();
    expect(within(dialog).getByText(/couldn.t be made/)).toBeInTheDocument();
    expect(current.plans).toHaveLength(0);
  });

  it('closes the sheet with Cancel and Escape without creating anything', () => {
    renderPlans();
    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(current.plans).toHaveLength(0);
  });

  it('shows the active project first, then waiting ones that can be made active', () => {
    let s = base();
    ({ store: s } = add(s, { title: 'Waiting one', kind: 'study', steps: generateChapters(3) }));
    const waitingId = s.plans[0].id;
    ({ store: s } = add(s, { title: 'Current one', kind: 'study', steps: generateChapters(5) }));
    s = setActiveStudy(s, s.plans[1].id);
    renderPlans(s);

    const study = section('Study projects');
    const links = within(study).getAllByRole('link');
    expect(links[0]).toHaveTextContent('Current one');
    expect(links[0]).toHaveTextContent('Active');
    expect(links[1]).toHaveTextContent('Waiting one');
    expect(links[1]).toHaveTextContent('Waiting');

    fireEvent.click(
      within(study).getByRole('button', { name: 'Make Waiting one the active project' })
    );
    expect(current.activePlan.personalStudy).toBe(waitingId);
  });

  it('links to the family weeks view', () => {
    renderPlans();
    expect(within(section('Family worship')).getByRole('link', { name: /next 8/ })).toHaveAttribute(
      'href',
      '/plans/family'
    );
  });

  it('puts finished plans on the Completed shelf, where they can be restored', () => {
    let s = base();
    ({ store: s } = add(s, { title: 'Done book', kind: 'study', steps: generateChapters(1) }));
    const plan = s.plans[0];
    s = setStepDone(s, plan.id, plan.steps[0].id, '2026-10-01');
    renderPlans(s);

    expect(within(section('Study projects')).queryByRole('link', { name: /Done book/ })).toBeNull();
    const shelf = section('Completed');
    expect(within(shelf).getByRole('link', { name: /Done book/ })).toHaveTextContent('1 of 1');
    fireEvent.click(within(shelf).getByRole('button', { name: 'Restore Done book' }));
    expect(current.plans[0].archivedOn).toBeNull();
    expect(
      within(section('Study projects')).getByRole('link', { name: /Done book/ })
    ).toBeInTheDocument();
  });

  it('uses no guilt words', () => {
    let s = base();
    ({ store: s } = add(s, { title: 'Daniel', kind: 'study', steps: generateChapters(2) }));
    renderPlans(s);
    expect(document.body.textContent).not.toMatch(BANNED);
    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    expect(document.body.textContent).not.toMatch(BANNED);
  });
});
