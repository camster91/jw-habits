/* eslint-disable no-unused-vars -- JSX imports and test harness */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';
import { WorkspaceContext } from '../data/useWorkspace.js';
import { StoreContext } from '../data/useStore.js';
import { emptyWorkspace, putNote, MEETING_PARTS } from '../domain/workspace.js';
import { defaultStore } from '../domain/store.js';
import Notes from './Notes.jsx';
import Preparation from './Preparation.jsx';
import { saveBackup } from '../utils/backup.js';
vi.mock('../utils/backup.js', () => ({ saveBackup: vi.fn(async () => {}) }));
const today = '2026-10-08';
let current,
  fail = false;
function Harness({
  children,
  initial = emptyWorkspace(),
  ready = true,
  route = '/notes',
  store = defaultStore(today, 'en'),
}) {
  const [workspace, set] = useState(initial);
  const [error, setError] = useState('');
  current = workspace;
  const save = async (fn) => {
    if (fail) {
      setError('Storage is full');
      throw new Error('Storage is full');
    }
    const value = fn(current);
    current = value;
    set(value);
    return value;
  };
  return (
    <StoreContext.Provider value={{ store, today }}>
      <WorkspaceContext.Provider
        value={{ workspace, save, ready, error, rawExport: async () => 'original' }}
      >
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </WorkspaceContext.Provider>
    </StoreContext.Provider>
  );
}
const field = (name, value) => fireEvent.change(screen.getByLabelText(name), { target: { value } });
const button = (name) => fireEvent.click(screen.getByRole('button', { name, exact: true }));
beforeEach(() => {
  fail = false;
  vi.clearAllMocks();
});
describe('Notes UI', () => {
  it('creates, searches, edits and deletes a durable note without routine activity', async () => {
    render(
      <Harness>
        <Notes />
      </Harness>
    );
    button('New note');
    field('Title', 'Question');
    field('Your note', 'James 1:5');
    field('Tags (separate with commas)', 'study, question');
    field('Links (one per line)', 'https://www.jw.org/');
    button('Save note');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(current.notes[0].context).toEqual({ kind: 'day', id: today });
    expect(screen.getByText(`Recorded on ${today}`)).toBeInTheDocument();
    field('Search notes', 'missing');
    expect(screen.getByText(/No notes match/)).toBeInTheDocument();
    field('Search notes', '');
    field('Filter by tag', 'study');
    button('Question');
    field('Title', 'Updated');
    button('Save note');
    await screen.findByRole('button', { name: 'Updated' });
    button('Updated');
    button('Delete note');
    button('Keep note');
    button('Delete note');
    button('Delete permanently');
    await waitFor(() => expect(current.notes).toEqual([]));
  });
  it('keeps a failed-save draft and offers deliberate discard', async () => {
    render(
      <Harness>
        <Notes />
      </Harness>
    );
    button('New note');
    field('Title', 'Keep me');
    fail = true;
    button('Save note');
    await screen.findAllByText('Storage is full');
    expect(screen.getByLabelText('Title')).toHaveValue('Keep me');
    button('Close');
    expect(screen.getByText('Discard your unsaved changes?')).toBeInTheDocument();
    button('Keep editing');
    button('Close');
    button('Discard changes');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fail = false;
    button('New note');
    button('Close');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('exports original unreadable data, handles export failure and disables new notes', async () => {
    render(
      <Harness ready={false}>
        <Notes />
      </Harness>
    );
    expect(screen.getByRole('button', { name: 'New note' })).toBeDisabled();
    button('Export original notes and preparation');
    await waitFor(() =>
      expect(saveBackup).toHaveBeenCalledWith('original', expect.any(String), expect.any(String))
    );
    saveBackup.mockRejectedValueOnce(new Error('Cannot export'));
    button('Export original notes and preparation');
    await screen.findByText('Cannot export');
  });
  it.each(['plan', 'step', 'meeting', 'assignment'])(
    'retains a note when %s context is removed',
    (kind) => {
      const initial = putNote(
        emptyWorkspace(),
        { title: 'Kept', body: '', tags: [], links: [], context: { kind, id: 'removed' } },
        today
      );
      render(
        <Harness initial={initial}>
          <Notes />
        </Harness>
      );
      expect(screen.getByText(/Original context is no longer available/)).toBeInTheDocument();
    }
  );
  it('accepts contextual creation from preparation without recording activity', async () => {
    render(
      <Harness route="/notes?new=1&context=meeting&id=m1">
        <Notes />
      </Harness>
    );
    field('Title', 'Meeting question');
    button('Save note');
    await waitFor(() => expect(current.notes[0].context).toEqual({ kind: 'meeting', id: 'm1' }));
  });
});
describe('Preparation UI', () => {
  it('adds a dated meeting, prepares and undoes a section, refuses duplicates and removes it deliberately', async () => {
    render(
      <Harness>
        <Preparation />
      </Harness>
    );
    button('Add meeting');
    await screen.findByText(`Midweek meeting · ${today}`);
    fireEvent.click(screen.getByLabelText(MEETING_PARTS.midweek[0]));
    await screen.findByText('1 of 6 sections prepared');
    fireEvent.click(screen.getByLabelText(MEETING_PARTS.midweek[0]));
    await screen.findByText('0 of 6 sections prepared');
    button('Add meeting');
    expect(screen.getByText('That meeting is already listed below.')).toBeInTheDocument();
    expect(current.meetings.length).toBe(1);
    expect(screen.getByRole('link', { name: 'Add a meeting note' })).toHaveAttribute(
      'href',
      expect.stringContaining('context=meeting')
    );
    button('Remove meeting');
    button('Keep record');
    button('Remove meeting');
    button('Remove record');
    await waitFor(() => expect(current.meetings).toEqual([]));
    field('Meeting type', 'weekend');
    field('Meeting date', '2026-10-11');
    button('Add meeting');
    await screen.findByText('Weekend meeting · 2026-10-11');
    expect(screen.getByLabelText('Watchtower Study')).toBeInTheDocument();
  });
  it('adds an assignment, checks all preparation tasks and removes it without deleting notes', async () => {
    render(
      <Harness>
        <Preparation />
      </Harness>
    );
    field('Assignment title', 'Read James');
    field('Assignment type', 'Talk');
    field('Assignment date', '2026-10-15');
    field('Details or reference', 'Chapter 1');
    field('Preparation checklist (one item per line)', 'Read\nPractise');
    button('Add assignment');
    await screen.findByText('Read James');
    expect(screen.getByLabelText('Assignment title')).toHaveValue('');
    fireEvent.click(screen.getByLabelText('Read'));
    await waitFor(() => expect(current.assignments[0].tasks[0].done).toBe(true));
    fireEvent.click(screen.getByLabelText('Practise'));
    await screen.findByText(/Checklist prepared/);
    fireEvent.click(screen.getByLabelText('Read'));
    await screen.findByText('Prepare at your own pace.');
    button('Edit assignment');
    field('Assignment title', 'Read James revised');
    field('Assignment date', '2026-10-16');
    button('Save assignment');
    await screen.findByText('Read James revised');
    expect(current.assignments[0].tasks[1].done).toBe(true);
    expect(current.assignments[0].date).toBe('2026-10-16');
    button('Edit assignment');
    button('Cancel assignment edit');
    button('Remove assignment');
    button('Remove record');
    await waitFor(() => expect(current.assignments).toEqual([]));
  });
  it('preserves meeting and assignment forms after persistence failure', async () => {
    render(
      <Harness>
        <Preparation />
      </Harness>
    );
    fail = true;
    button('Add meeting');
    await screen.findByText('Storage is full');
    expect(current.meetings).toEqual([]);
    field('Assignment title', 'Draft');
    button('Add assignment');
    await waitFor(() => expect(screen.getByLabelText('Assignment title')).toHaveValue('Draft'));
  });
});
