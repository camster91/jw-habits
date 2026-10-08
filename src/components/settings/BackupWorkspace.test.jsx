/* eslint-disable no-unused-vars -- JSX harness */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StoreContext } from '../../data/useStore.js';
import { WorkspaceContext } from '../../data/useWorkspace.js';
import { defaultStore } from '../../domain/store.js';
import { emptyWorkspace, exportBundle } from '../../domain/workspace.js';
import { durableGet, durableSet } from '../../utils/safeStorage.js';
import { saveBackup } from '../../utils/backup.js';
import BackupSection from './BackupSection.jsx';
vi.mock('../../utils/safeStorage.js', () => ({ durableGet: vi.fn(), durableSet: vi.fn() }));
vi.mock('../../utils/backup.js', () => ({
  saveBackup: vi.fn(),
  isShareCancel: (e) => e.message === 'cancel',
}));
const today = '2026-10-08';
let store, workspace, replace, save, onReplaced;
beforeEach(() => {
  vi.resetAllMocks();
  store = defaultStore(today, 'en');
  workspace = emptyWorkspace();
  replace = vi.fn(async () => {});
  save = vi.fn(async (fn, before) => {
    await before(workspace);
    workspace = fn(workspace);
  });
  onReplaced = vi.fn();
});
function renderBackup(ready = true) {
  return render(
    <StoreContext.Provider value={{ store, today, replace }}>
      <WorkspaceContext.Provider value={{ workspace, ready, save }}>
        <BackupSection onReplaced={onReplaced} />
      </WorkspaceContext.Provider>
    </StoreContext.Provider>
  );
}
function importFile(raw) {
  fireEvent.change(screen.getByLabelText('Import a backup'), {
    target: { files: [{ text: async () => raw }] },
  });
}
describe('combined backup replacement', () => {
  it('exports both stores and retains a pre-import copy before replacement', async () => {
    renderBackup();
    fireEvent.click(screen.getByText('Export a backup'));
    await waitFor(() =>
      expect(saveBackup).toHaveBeenCalledWith(
        exportBundle(store, workspace),
        expect.any(String),
        expect.any(String)
      )
    );
    const next = { ...store, tone: 'quiet' };
    importFile(exportBundle(next, { ...workspace, revision: 10 }));
    await screen.findByText(
      'This replaces routines, notes and preparation. A pre-import backup will be retained.'
    );
    fireEvent.click(screen.getByText('Replace'));
    await waitFor(() => expect(onReplaced).toHaveBeenCalled());
    expect(durableSet).toHaveBeenCalledWith(
      'faithful-days-before-import',
      exportBundle(store, emptyWorkspace())
    );
    expect(replace).toHaveBeenCalledWith(next);
    expect(workspace.revision).toBe(10);
  });
  it('legacy import explicitly retains notes and preparation', async () => {
    renderBackup();
    importFile(JSON.stringify(store));
    await screen.findByText(
      'This older backup replaces routines only. Your notes and preparation stay here.'
    );
    fireEvent.click(screen.getByText('Replace'));
    await waitFor(() => expect(onReplaced).toHaveBeenCalled());
    expect(workspace).toEqual(emptyWorkspace());
  });
  it('does not replace either store when the recovery copy cannot be saved', async () => {
    durableSet.mockRejectedValueOnce(new Error('recovery full'));
    renderBackup();
    importFile(exportBundle(store, workspace));
    await screen.findByText('Replace');
    fireEvent.click(screen.getByText('Replace'));
    await screen.findByText(/recovery full/);
    expect(replace).not.toHaveBeenCalled();
    expect(onReplaced).not.toHaveBeenCalled();
  });
  it('rolls routines back when the workspace fails and retains a recovery bundle', async () => {
    save.mockImplementation(async (_fn, before) => {
      await before(workspace);
      throw new Error('workspace full');
    });
    renderBackup();
    const next = { ...store, tone: 'quiet' };
    importFile(exportBundle(next, workspace));
    await screen.findByText('Replace');
    fireEvent.click(screen.getByText('Replace'));
    await screen.findByText(/workspace full/);
    expect(replace.mock.calls).toEqual([[next], [store]]);
    expect(onReplaced).not.toHaveBeenCalled();
  });
  it('reports failure even when rollback also fails', async () => {
    save.mockImplementation(async (_fn, before) => {
      await before(workspace);
      throw new Error('workspace full');
    });
    replace.mockResolvedValueOnce().mockRejectedValueOnce(new Error('rollback full'));
    renderBackup();
    importFile(exportBundle(store, workspace));
    await screen.findByText('Replace');
    fireEvent.click(screen.getByText('Replace'));
    await screen.findByText(/pre-import backup is retained/);
    expect(onReplaced).not.toHaveBeenCalled();
  });
  it('unreadable workspace blocks export/import and keeps stored routines', async () => {
    renderBackup(false);
    fireEvent.click(screen.getByText('Export a backup'));
    await screen.findByText(/couldn't be saved/);
    expect(saveBackup).not.toHaveBeenCalled();
    importFile(exportBundle(store, workspace));
    await screen.findByText('Replace');
    fireEvent.click(screen.getByText('Replace'));
    await screen.findByText(/import is paused/);
    expect(replace).not.toHaveBeenCalled();
  });
  it('exports the recovery copy and handles missing copies or read failures', async () => {
    renderBackup();
    durableGet.mockResolvedValueOnce(null);
    fireEvent.click(screen.getByText('Export pre-import backup'));
    await screen.findByText(/no pre-import backup/);
    durableGet.mockResolvedValueOnce('recovery');
    fireEvent.click(screen.getByText('Export pre-import backup'));
    await waitFor(() =>
      expect(saveBackup).toHaveBeenCalledWith(
        'recovery',
        'faithful-days-before-import.json',
        'Pre-import backup'
      )
    );
    durableGet.mockRejectedValueOnce(new Error('unreadable'));
    fireEvent.click(screen.getByText('Export pre-import backup'));
    await screen.findByText('unreadable');
  });
});
