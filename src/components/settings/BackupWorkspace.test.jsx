/* eslint-disable no-unused-vars -- JSX harness */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StoreContext } from '../../data/useStore.js';
import { WorkspaceContext } from '../../data/useWorkspace.js';
import { defaultStore, exportJson } from '../../domain/store.js';
import { emptyWorkspace, exportBundle } from '../../domain/workspace.js';
import { durableGet, durableSet } from '../../utils/safeStorage.js';
import { saveBackup } from '../../utils/backup.js';
import BackupSection from './BackupSection.jsx';
vi.mock('../../utils/safeStorage.js', () => ({
  durableGet: vi.fn(),
  durableSet: vi.fn(),
  durableKeys: async () => [],
}));
vi.mock('../../utils/backup.js', () => ({
  saveBackup: vi.fn(),
  isShareCancel: (e) => e.message === 'cancel',
}));
const today = '2026-10-08';
let store, workspace, replace, save, update, onReplaced, rawExport;
beforeEach(() => {
  vi.resetAllMocks();
  store = defaultStore(today, 'en');
  workspace = emptyWorkspace();
  replace = vi.fn(async () => {});
  update = vi.fn();
  save = vi.fn(async (fn, before) => {
    await before(workspace);
    workspace = fn(workspace);
  });
  rawExport = vi.fn(async () => null);
  onReplaced = vi.fn();
});
function renderBackup(ready = true, error = '') {
  return render(
    <StoreContext.Provider value={{ store, today, replace, update }}>
      <WorkspaceContext.Provider value={{ workspace, ready, error, save, rawExport }}>
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
  it('unreadable workspace still exports routines, offers original notes bytes and pauses import (#316)', async () => {
    rawExport.mockResolvedValueOnce('{"broken": notes');
    renderBackup(false, 'cannot be read');
    fireEvent.click(screen.getByText('Export a backup'));
    await screen.findByText(/Routines exported\. Notes and preparation could not be read/);
    expect(saveBackup).toHaveBeenCalledWith(
      exportJson(store),
      `faithful-days-routines-${today}.json`,
      expect.any(String)
    );
    expect(update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Save original notes data'));
    await screen.findByText('Original notes data copy offered.');
    expect(saveBackup).toHaveBeenLastCalledWith(
      '{"broken": notes',
      `faithful-days-notes-original-${today}.json`,
      expect.any(String)
    );
    expect(durableSet).not.toHaveBeenCalled();
    importFile(exportBundle(store, workspace));
    await screen.findByText('Replace');
    fireEvent.click(screen.getByText('Replace'));
    await screen.findByText(/import is paused/);
    expect(replace).not.toHaveBeenCalled();
  });
  it('reports routines export failure and preserves cancellation semantics when workspace is unreadable', async () => {
    renderBackup(false, 'cannot be read');
    saveBackup.mockRejectedValueOnce(new Error('disk full'));
    fireEvent.click(screen.getByText('Export a backup'));
    await screen.findByText("The backup couldn't be saved. Please try again.");

    saveBackup.mockRejectedValueOnce(new Error('cancel'));
    fireEvent.click(screen.getByText('Export a backup'));
    await waitFor(() => expect(saveBackup).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("The backup couldn't be saved. Please try again.")).toBeNull();
  });
  it('reports empty, read-failure and cancellation outcomes for original notes export', async () => {
    renderBackup(false, 'cannot be read');
    fireEvent.click(screen.getByText('Save original notes data'));
    await screen.findByText('There is no saved notes data to export.');

    rawExport.mockResolvedValueOnce('');
    fireEvent.click(screen.getByText('Save original notes data'));
    await screen.findByText('Original notes data copy offered.');
    expect(saveBackup).toHaveBeenLastCalledWith(
      '',
      `faithful-days-notes-original-${today}.json`,
      'Faithful Days original notes data'
    );

    rawExport.mockRejectedValueOnce(new Error('read failed'));
    fireEvent.click(screen.getByText('Save original notes data'));
    await screen.findByText('Could not read the original notes data to export it.');

    rawExport.mockResolvedValueOnce('raw bytes');
    saveBackup.mockRejectedValueOnce(new Error('cancel'));
    fireEvent.click(screen.getByText('Save original notes data'));
    await waitFor(() =>
      expect(saveBackup).toHaveBeenCalledWith(
        'raw bytes',
        `faithful-days-notes-original-${today}.json`,
        'Faithful Days original notes data'
      )
    );
    expect(screen.queryByText('Could not read the original notes data to export it.')).toBeNull();
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
