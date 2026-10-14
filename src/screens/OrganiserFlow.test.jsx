/* eslint-disable no-unused-vars -- JSX harness */
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from '../App.jsx';
import { StoreProvider, STORE_KEY } from '../data/StoreProvider.jsx';
import { defaultStore } from '../domain/store.js';
import { emptyOrganiser, ORGANISER_KEY, newOrganiserItem } from '../domain/organiser.js';
import { emptyWorkspace, WORKSPACE_KEY } from '../domain/workspace.js';
import RestoreGate from '../components/RestoreGate.jsx';
import { RESTORE_JOURNAL_KEY, RECOVERY_KEY } from '../data/restoreKeys.js';
import { exportOrganiserBundle } from '../domain/organiserBackup.js';
import { saveBackup } from '../utils/backup.js';
vi.mock('../utils/backup.js', () => ({ saveBackup: vi.fn(), isShareCancel: () => false }));
vi.mock('../components/InstallPrompt', () => ({ default: () => null }));
vi.mock('../components/UpdatePrompt', () => ({ default: () => null }));
vi.mock('../components/OfflineIndicator', () => ({ default: () => null }));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 10, 10));
  window.scrollTo = vi.fn();
  window.matchMedia = vi.fn(() => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  window.history.pushState({}, '', '/plans');
  localStorage.setItem(
    STORE_KEY,
    JSON.stringify({ ...defaultStore('2026-10-10', 'en'), onboardingDone: true })
  );
});
afterEach(() => vi.useRealTimers());
const mount = () =>
  render(
    <StoreProvider>
      <App />
    </StoreProvider>
  );
const data = () => JSON.parse(localStorage.getItem(ORGANISER_KEY));
it('separates calendar work from projects without resetting the chosen calendar view', async () => {
  mount();
  await board();
  expect(screen.queryByRole('button', { name: 'New study plan' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Month', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Study & family', exact: true }));
  expect(screen.getByRole('button', { name: 'New study plan' })).toBeVisible();
  expect(screen.queryByRole('region', { name: 'Calendar and tasks' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Calendar & tasks', exact: true }));
  expect(screen.getByRole('button', { name: 'Month', pressed: true })).toBeVisible();
  expect(localStorage.getItem(ORGANISER_KEY)).toBeNull();
});
async function board() {
  const b = await screen.findByRole('region', { name: 'Calendar and tasks' });
  await waitFor(() =>
    expect(within(b).getByRole('button', { name: 'Add', exact: true })).toBeEnabled()
  );
  return b;
}
async function add(kind, title, date = '2026-10-10') {
  const b = await board();
  fireEvent.click(within(b).getByRole('button', { name: 'Add', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: kind, exact: true }));
  fireEvent.change(screen.getByLabelText('Title', { exact: true }), { target: { value: title } });
  fireEvent.change(
    screen.getByLabelText(kind === 'Task' ? 'Due date (optional)' : 'Date', { exact: true }),
    { target: { value: date } }
  );
  return screen.getByRole('dialog');
}
async function save(kind) {
  fireEvent.click(screen.getByRole('button', { name: 'Save ' + kind.toLowerCase(), exact: true }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}
it.each([
  ['Event', '2026-10-12'],
  ['Task', '2026-10-12'],
  ['Task', ''],
])('confirms a saved %s and opens it beyond the current calendar date (%s)', async (kind, date) => {
  mount();
  await add(kind, 'Future capture', date);
  await save(kind);
  const message = screen.getByRole('status', { name: 'Saved activity' });
  const view = within(message).getByRole('link', { name: `View saved ${kind.toLowerCase()}` });
  const item = data()[kind === 'Task' ? 'tasks' : 'events'][0];
  expect(view).toHaveAttribute('href', `/plans?itemKind=${kind.toLowerCase()}&itemId=${item.id}`);
  expect(JSON.parse(localStorage.getItem(STORE_KEY)).log).toEqual([]);
  fireEvent.click(view);
  const detail = await screen.findByRole('dialog', { name: 'Future capture', exact: true });
  if (date) expect(screen.getByLabelText('Choose date')).toHaveValue(date);
  else expect(within(detail).getByText('No date', { exact: true })).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(STORE_KEY)).log).toEqual([]);
  fireEvent.click(within(detail).getByRole('button', { name: 'Close', exact: true }));
  fireEvent.click(within(await board()).getByRole('button', { name: 'Add', exact: true }));
  expect(screen.queryByRole('status', { name: 'Saved activity' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: kind, exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Close', exact: true }));
  expect(screen.queryByRole('status', { name: 'Saved activity' })).not.toBeInTheDocument();
  expect(data()[kind === 'Task' ? 'tasks' : 'events']).toHaveLength(1);
});
it('persists a connected event, preparation task and note, completion/Undo and full backup', async () => {
  const view = mount();
  await add('Event', 'Weekend meeting');
  await save('Event');
  fireEvent.click(screen.getByRole('button', { name: /Weekend meeting/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Add preparation task' }));
  fireEvent.change(screen.getByLabelText('Title', { exact: true }), {
    target: { value: 'Prepare reading' },
  });
  await save('Task');
  expect(data().relations[0].target.kind).toBe('event');
  fireEvent.click(screen.getByRole('button', { name: 'Complete Prepare reading', exact: true }));
  await waitFor(() => expect(data().exceptions[0].status).toBe('done'));
  fireEvent.click(screen.getByRole('button', { name: 'Undo', exact: true }));
  await waitFor(() => expect(data().exceptions).toHaveLength(0));
  fireEvent.click(screen.getByRole('button', { name: /^Weekend meeting/ }));
  fireEvent.click(screen.getByRole('link', { name: 'Add linked note' }));
  await screen.findByRole('dialog');
  fireEvent.change(screen.getByLabelText('Your note', { exact: true }), {
    target: { value: 'A question to explore' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save note' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(JSON.parse(localStorage.getItem(WORKSPACE_KEY)).notes[0].title).toBe(
    'A question to explore'
  );
  expect(data().relations.some((r) => r.source.kind === 'note')).toBe(true);
  fireEvent.click(screen.getByRole('link', { name: 'Linked event: Weekend meeting', exact: true }));
  const linked = await screen.findByRole('dialog', { name: 'Weekend meeting', exact: true });
  expect(within(linked).getByRole('heading', { name: 'Preparation tasks' })).toBeInTheDocument();
  expect(screen.getByLabelText('Choose date')).toHaveValue('2026-10-10');
  fireEvent.click(within(linked).getByRole('button', { name: 'Close', exact: true }));
  expect(new URLSearchParams(window.location.search).has('itemId')).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Settings', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Go to Backup', exact: false }));
  fireEvent.click(screen.getByRole('button', { name: 'Export a backup' }));
  await waitFor(() => expect(saveBackup).toHaveBeenCalled());
  const bundle = JSON.parse(saveBackup.mock.calls[0][0]);
  expect(bundle.organiser.events[0].title).toBe('Weekend meeting');
  expect(bundle.workspace.notes).toHaveLength(1);
  view.unmount();
  window.history.pushState({}, '', '/plans');
  mount();
  await board();
  expect(screen.getByRole('button', { name: /^Weekend meeting/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Weekend meeting/ }));
  expect(await screen.findByRole('link', { name: 'A question to explore' })).toBeInTheDocument();
});
it('opens a future capture from Today without marking a routine', async () => {
  window.history.pushState({}, '', '/');
  mount();
  const agenda = await screen.findByRole('region', { name: 'Today agenda and tasks' });
  await waitFor(() =>
    expect(within(agenda).getByRole('button', { name: 'Add', exact: true })).toBeEnabled()
  );
  fireEvent.click(within(agenda).getByRole('button', { name: 'Add', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Task', exact: true }));
  fireEvent.change(screen.getByLabelText('Title', { exact: true }), {
    target: { value: 'Tomorrow’s next step' },
  });
  fireEvent.change(screen.getByLabelText('Due date (optional)', { exact: true }), {
    target: { value: '2026-10-12' },
  });
  await save('Task');
  expect(
    within(agenda).queryByRole('button', { name: /^Tomorrow’s next step/ })
  ).not.toBeInTheDocument();
  fireEvent.click(within(agenda).getByRole('link', { name: 'View saved task', exact: true }));
  await screen.findByRole('dialog', { name: 'Tomorrow’s next step', exact: true });
  expect(screen.getByLabelText('Choose date')).toHaveValue('2026-10-12');
  expect(JSON.parse(localStorage.getItem(STORE_KEY)).log).toEqual([]);
});
it.each(['local', 'url'])(
  'returns from a %s preparation-task detail to its event without recording activity',
  async (entry) => {
    const event = newOrganiserItem('event', { title: 'Related meeting', date: '2026-10-12' });
    const task = newOrganiserItem('task', { title: 'Prepare beforehand', date: '2026-10-10' });
    const initial = {
      ...emptyOrganiser(),
      events: [event],
      tasks: [task],
      relations: [
        {
          id: 'preparation',
          source: { kind: 'task', id: task.id },
          target: { kind: 'event', id: event.id },
        },
      ],
    };
    localStorage.setItem(ORGANISER_KEY, JSON.stringify(initial));
    if (entry === 'url') window.history.pushState({}, '', `/plans?itemKind=task&itemId=${task.id}`);
    mount();
    await board();
    if (entry === 'local')
      fireEvent.click(screen.getByRole('button', { name: /^Prepare beforehand/ }));
    const detail = await screen.findByRole('dialog', { name: 'Prepare beforehand', exact: true });
    fireEvent.click(
      within(detail).getByRole('link', { name: 'Preparation for: Related meeting', exact: true })
    );
    await screen.findByRole('dialog', { name: 'Related meeting', exact: true });
    expect(screen.getByLabelText('Choose date')).toHaveValue('2026-10-12');
    expect(data()).toEqual(initial);
    expect(JSON.parse(localStorage.getItem(STORE_KEY)).log).toEqual([]);
  }
);

it('keeps the preparation task when its event is archived', async () => {
  const event = {
    ...newOrganiserItem('event', { title: 'Archived meeting', date: '2026-10-12' }),
    archivedAt: new Date(2026, 9, 9).toISOString(),
  };
  const task = newOrganiserItem('task', { title: 'Kept preparation', date: '2026-10-10' });
  localStorage.setItem(
    ORGANISER_KEY,
    JSON.stringify({
      ...emptyOrganiser(),
      events: [event],
      tasks: [task],
      relations: [
        {
          id: 'preparation',
          source: { kind: 'task', id: task.id },
          target: { kind: 'event', id: event.id },
        },
      ],
    })
  );
  mount();
  await board();
  fireEvent.click(screen.getByRole('button', { name: /^Kept preparation/ }));
  const detail = await screen.findByRole('dialog', { name: 'Kept preparation', exact: true });
  expect(
    within(detail).getByText('The related event is archived or unavailable. Your task is kept.')
  ).toBeInTheDocument();
  expect(within(detail).queryByRole('link', { name: /Preparation for/ })).not.toBeInTheDocument();
  expect(data().tasks[0].archivedAt).toBeNull();
  expect(JSON.parse(localStorage.getItem(STORE_KEY)).log).toEqual([]);
});
it('keeps invalid drafts, edits one recurrence, switches views and preserves history on archive', async () => {
  mount();
  await add('Task', 'Read', '2026-10-10');
  fireEvent.click(screen.getByText('Time, recurrence & details'));
  fireEvent.change(screen.getByLabelText('Repeat', { exact: true }), {
    target: { value: 'weekly' },
  });
  fireEvent.click(screen.getByLabelText('Sat'));
  fireEvent.click(screen.getByRole('button', { name: 'Save task' }));
  expect(
    await within(screen.getByRole('dialog')).findByText(/Check the title/)
  ).toBeInTheDocument();
  expect(screen.getByLabelText('Title', { exact: true })).toHaveValue('Read');
  expect(screen.queryByRole('status', { name: 'Saved activity' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Sun'));
  await save('Task');
  fireEvent.click(screen.getByRole('button', { name: 'Tasks', exact: true }));
  fireEvent.click(screen.getAllByRole('button', { name: /^Read/ })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Edit or reschedule' }));
  fireEvent.change(screen.getByLabelText('Title', { exact: true }), {
    target: { value: 'Read a little' },
  });
  await save('Task');
  expect(data().exceptions[0].title).toBe('Read a little');
  fireEvent.click(screen.getByRole('button', { name: 'Month', exact: true }));
  expect(screen.getAllByRole('button', { name: /Oct/ }).length).toBeGreaterThan(27);
  fireEvent.click(screen.getByRole('button', { name: 'Week', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Tasks', exact: true }));
  fireEvent.click(screen.getAllByRole('button', { name: /^Read/ })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Edit or reschedule' }));
  fireEvent.click(screen.getByRole('button', { name: 'Archive', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
  fireEvent.click(screen.getByRole('button', { name: 'Archive', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Archive', exact: true }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(data().tasks[0].archivedAt).not.toBeNull();
  expect(data().exceptions).toHaveLength(1);
});
it('tracks a custom What’s New routine separately and restores an archived routine', async () => {
  window.history.pushState({}, '', '/');
  mount();
  await screen.findByRole('heading', { name: 'Today', exact: true });
  expect(screen.queryByRole('region', { name: 'Personal routines' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Add routine' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Settings', exact: true }));
  fireEvent.click(screen.getByText('Routines', { selector: 'h3' }));
  const button = await screen.findByRole('button', { name: "Track exploring What's New" });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Add a personal routine' })).getByRole('button', {
      name: 'Close',
      exact: true,
    })
  );
  expect(screen.queryByRole('dialog', { name: 'Add a personal routine' })).not.toBeInTheDocument();
  fireEvent.click(button);
  fireEvent.click(screen.getByRole('button', { name: 'Save routine' }));
  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: 'Add a personal routine' })).not.toBeInTheDocument()
  );
  fireEvent.click(
    within(screen.getByRole('dialog', { name: 'Settings' })).getByRole('button', {
      name: 'Close',
      exact: true,
    })
  );
  expect(screen.queryByRole('button', { name: 'Edit routine' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: "Record Explore what's new" }));
  await waitFor(() => expect(data().routineCheckIns).toHaveLength(1));
  expect(JSON.parse(localStorage.getItem(STORE_KEY)).log).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: "Undo Explore what's new" }));
  await waitFor(() => expect(data().routineCheckIns).toHaveLength(0));
  fireEvent.click(screen.getByRole('button', { name: 'Settings', exact: true }));
  fireEvent.click(screen.getByText('Routines', { selector: 'h3' }));
  fireEvent.click(screen.getByRole('button', { name: 'Archive routine' }));
  await waitFor(() => expect(data().personalRoutines[0].archivedAt).not.toBeNull());
  fireEvent.click(screen.getByText('Archived routines'));
  fireEvent.click(screen.getByRole('button', { name: "Restore Explore what's new" }));
  await waitFor(() => expect(data().personalRoutines[0].archivedAt).toBeNull());
});
it('keeps daily routines on Today and removes weekly routines already recorded on an earlier day', async () => {
  const organiser = emptyOrganiser();
  organiser.personalRoutines = [
    {
      id: 'daily',
      title: 'Daily reflection',
      cadence: 'daily',
      icon: 'heart',
      url: null,
      archivedAt: null,
    },
    {
      id: 'weekly',
      title: 'Weekly exploration',
      cadence: 'weekly',
      icon: 'sparkles',
      url: null,
      archivedAt: null,
    },
  ];
  organiser.routineCheckIns = [
    {
      id: 'weekly@2026-10-09',
      routineId: 'weekly',
      day: '2026-10-09',
      recordedAt: '2026-10-09T10:00:00.000Z',
    },
  ];
  localStorage.setItem(ORGANISER_KEY, JSON.stringify(organiser));
  window.history.pushState({}, '', '/');
  mount();
  await screen.findByRole('button', { name: 'Record Daily reflection' });
  expect(
    screen.queryByRole('button', { name: 'Record Weekly exploration' })
  ).not.toBeInTheDocument();
  expect(data().routineCheckIns).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Settings', exact: true }));
  fireEvent.click(screen.getByText('Routines', { selector: 'h3' }));
  expect(screen.getByText('Weekly exploration')).toBeInTheDocument();
});
it('preserves unreadable organiser data and exposes original export instead of resetting it', async () => {
  localStorage.setItem(ORGANISER_KEY, '{not json');
  mount();
  await screen.findByText(/Tasks and calendar data cannot be read/);
  expect(localStorage.getItem(ORGANISER_KEY)).toBe('{not json');
  fireEvent.click(screen.getByRole('button', { name: 'Export original tasks and calendar' }));
  await waitFor(() =>
    expect(saveBackup).toHaveBeenCalledWith('{not json', expect.any(String), expect.any(String))
  );
});
it('blocks the entire app before providers can write an interrupted restore', async () => {
  const store = JSON.parse(localStorage.getItem(STORE_KEY)),
    w = emptyWorkspace(),
    o = emptyOrganiser();
  const backup = exportOrganiserBundle(store, w, o);
  localStorage.setItem(
    RESTORE_JOURNAL_KEY,
    JSON.stringify({
      version: 1,
      status: 'pending',
      before: { routines: store, workspace: w, organiser: o },
    })
  );
  localStorage.setItem(RECOVERY_KEY, backup);
  render(
    <RestoreGate>
      <StoreProvider>
        <App />
      </StoreProvider>
    </RestoreGate>
  );
  await screen.findByRole('heading', { name: 'Finish recovering your data' });
  expect(screen.queryByTestId('plans')).not.toBeInTheDocument();
  expect(localStorage.getItem(ORGANISER_KEY)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Export recovery backup' }));
  await waitFor(() =>
    expect(saveBackup).toHaveBeenCalledWith(backup, expect.any(String), expect.any(String))
  );
});

it('creates an undated task from a note with a stable backlink and rejects an empty note', async () => {
  window.history.pushState({}, '', '/notes');
  mount();
  const create = await screen.findByRole('button', { name: 'New note', exact: true });
  await waitFor(() => expect(create).toBeEnabled());
  fireEvent.click(create);
  fireEvent.click(screen.getByRole('button', { name: 'Save note', exact: true }));
  await screen.findByText('Add a title or a few words before saving.');
  fireEvent.change(screen.getByRole('textbox', { name: 'Your note', exact: true }), {
    target: { value: 'A question for next week' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save note', exact: true }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Create task from note', exact: true }));
  expect(screen.getByLabelText('Title', { exact: true })).toHaveValue('A question for next week');
  await save('Task');
  expect(data().tasks[0].date).toBeNull();
  expect(data().relations[0]).toMatchObject({
    source: { kind: 'note' },
    target: { kind: 'task', id: data().tasks[0].id },
  });
  fireEvent.change(screen.getByLabelText('Related activity'), { target: { value: 'task' } });
  expect(
    screen.getByRole('button', { name: 'A question for next week', exact: true })
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Related activity'), { target: { value: 'unlinked' } });
  expect(
    screen.queryByRole('button', { name: 'A question for next week', exact: true })
  ).not.toBeInTheDocument();
});

it('restores an archived activity without deleting its recorded completion', async () => {
  const task = newOrganiserItem('task', {
    title: 'Archived preparation',
    date: '2026-10-10',
    archivedAt: new Date().toISOString(),
  });
  localStorage.setItem(ORGANISER_KEY, JSON.stringify({ ...emptyOrganiser(), tasks: [task] }));
  mount();
  await board();
  fireEvent.click(screen.getByText('Archived activities', { exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Restore Archived preparation' }));
  await waitFor(() => expect(data().tasks[0].archivedAt).toBeNull());
  expect(screen.getByRole('button', { name: /Complete Archived preparation/ })).toBeInTheDocument();
});

it('shows all-day inclusive last days while persisting the exclusive calendar boundary', async () => {
  mount();
  await add('Event', 'Synthetic convention');
  fireEvent.click(screen.getByText('Time, recurrence & details', { exact: true }));
  fireEvent.change(screen.getByLabelText('Last day (optional)', { exact: true }), {
    target: { value: '2026-10-12' },
  });
  await save('Event');
  expect(data().events[0].endDate).toBe('2026-10-13');
  fireEvent.click(screen.getByRole('button', { name: 'Month', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Mon, Oct 12', exact: true }));
  expect(screen.getByRole('button', { name: /Synthetic convention/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Tue, Oct 13', exact: true }));
  expect(screen.queryByRole('button', { name: /Synthetic convention/ })).not.toBeInTheDocument();
});

it('blocks unknown recovery journal versions even when they claim completion', async () => {
  localStorage.setItem(RESTORE_JOURNAL_KEY, JSON.stringify({ version: 99, status: 'complete' }));
  render(
    <RestoreGate>
      <StoreProvider>
        <App />
      </StoreProvider>
    </RestoreGate>
  );
  await screen.findByRole('heading', { name: 'Finish recovering your data' });
  expect(screen.queryByTestId('plans')).not.toBeInTheDocument();
});

it('navigates calendar dates by view and prefills Add without recording activity', async () => {
  mount();
  const b = await board();
  const date = within(b).getByLabelText('Choose date');
  expect(
    within(b).queryByRole('button', { name: 'Sat, Oct 10', exact: true })
  ).not.toBeInTheDocument();
  fireEvent.click(within(b).getByRole('button', { name: 'Next day', exact: true }));
  expect(date).toHaveValue('2026-10-11');
  fireEvent.click(within(b).getByRole('button', { name: 'Previous day', exact: true }));
  expect(date).toHaveValue('2026-10-10');
  fireEvent.click(within(b).getByRole('button', { name: 'Week', exact: true }));
  expect(within(b).getByRole('button', { name: 'Sat, Oct 10', exact: true })).toBeInTheDocument();
  fireEvent.click(within(b).getByRole('button', { name: 'Next week', exact: true }));
  expect(date).toHaveValue('2026-10-17');
  fireEvent.click(within(b).getByRole('button', { name: 'Previous week', exact: true }));
  expect(date).toHaveValue('2026-10-10');
  fireEvent.click(within(b).getByRole('button', { name: 'Month', exact: true }));
  fireEvent.change(date, { target: { value: '2026-01-31' } });
  fireEvent.click(within(b).getByRole('button', { name: 'Next month', exact: true }));
  expect(date).toHaveValue('2026-02-28');
  fireEvent.click(within(b).getByRole('button', { name: 'Add', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Task', exact: true }));
  expect(screen.getByLabelText('Due date (optional)')).toHaveValue('2026-02-28');
  fireEvent.click(screen.getByRole('button', { name: 'Close', exact: true }));
  fireEvent.click(within(b).getByRole('button', { name: 'Previous month', exact: true }));
  expect(date).toHaveValue('2026-01-28');
  fireEvent.click(within(b).getByRole('button', { name: 'Today', exact: true }));
  expect(date).toHaveValue('2026-10-10');
  expect(within(b).getByRole('button', { name: 'Today', exact: true })).toBeDisabled();
  expect(JSON.parse(localStorage.getItem(STORE_KEY)).log).toEqual([]);
});

it('labels overdue and undated tasks as Open and preserves task filtering', async () => {
  localStorage.setItem(
    ORGANISER_KEY,
    JSON.stringify({
      ...emptyOrganiser(),
      tasks: [
        newOrganiserItem('task', { title: 'Overdue question', date: '2026-10-09' }),
        newOrganiserItem('task', { title: 'Undated idea', date: null }),
      ],
    })
  );
  mount();
  const b = await board();
  fireEvent.click(within(b).getByRole('button', { name: 'Tasks', exact: true }));
  expect(within(b).getByLabelText('Task view')).toHaveValue('Open');
  expect(within(b).getByRole('button', { name: /^Overdue question/ })).toBeInTheDocument();
  expect(within(b).getByRole('button', { name: /^Undated idea/ })).toBeInTheDocument();
  fireEvent.change(within(b).getByLabelText('Search tasks'), { target: { value: 'Undated' } });
  expect(within(b).queryByRole('button', { name: /^Overdue question/ })).not.toBeInTheDocument();
  expect(within(b).getByRole('button', { name: /^Undated idea/ })).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(STORE_KEY)).log).toEqual([]);
});

it('opens a linked undated task and clears the target when closed', async () => {
  const task = newOrganiserItem('task', { title: 'Linked undated task', date: null });
  localStorage.setItem(ORGANISER_KEY, JSON.stringify({ ...emptyOrganiser(), tasks: [task] }));
  window.history.pushState({}, '', `/plans?itemKind=task&itemId=${task.id}`);
  mount();
  const dialog = await screen.findByRole('dialog', { name: 'Linked undated task' });
  expect(within(dialog).getByText('No date', { exact: true })).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close', exact: true }));
  expect(window.location.search).toBe('');
  expect(screen.getByLabelText('Task view')).toHaveValue('Open');
  expect(screen.getByRole('button', { name: /^Linked undated task/ })).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(STORE_KEY)).log).toEqual([]);
});
it('shows a dismissible unavailable link without changing stored records', async () => {
  window.history.pushState({}, '', '/plans?itemKind=event&itemId=missing');
  mount();
  await screen.findByText('That activity is unavailable. Your notes are kept.');
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss', exact: true }));
  expect(window.location.search).toBe('');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(STORE_KEY)).log).toEqual([]);
});
