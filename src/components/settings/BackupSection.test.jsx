/* eslint-disable no-unused-vars -- JSX harness */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StoreContext } from '../../data/useStore.js';
import { defaultStore } from '../../domain/store.js';
import { saveBackup } from '../../utils/backup.js';
import BackupSection from './BackupSection.jsx';
vi.mock('../../utils/safeStorage.js', () => ({ durableGet: vi.fn(), durableSet: vi.fn() }));
vi.mock('../../utils/backup.js', () => ({
  saveBackup: vi.fn(),
  isShareCancel: (e) => e.message === 'cancel',
}));
const NOW = new Date(2026, 9, 28, 12, 0, 0);
const today = '2026-10-28';
const NUDGE = 'It has been a while — export a backup to keep your history safe.';
let store, update;
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  update = vi.fn();
});
afterEach(() => vi.useRealTimers());
const daysAgo = (n) => new Date(NOW.getTime() - n * 86400000).toISOString();
function renderBackup(lastExportAt) {
  store = { ...defaultStore(today, 'en'), backup: { lastExportAt } };
  return render(
    <StoreContext.Provider value={{ store, update, today }}>
      <BackupSection />
    </StoreContext.Provider>
  );
}
describe('recording backups', () => {
  it('writes lastExportAt as the ISO now after a successful export', async () => {
    saveBackup.mockResolvedValue(undefined);
    renderBackup(null);
    fireEvent.click(screen.getByText('Export a backup'));
    await waitFor(() => expect(update).toHaveBeenCalled());
    const next = update.mock.calls[0][0](store);
    expect(next.backup.lastExportAt).toBe(NOW.toISOString());
  });
  it('leaves it unchanged on a share-sheet cancel', async () => {
    saveBackup.mockRejectedValue(new Error('cancel'));
    renderBackup(null);
    fireEvent.click(screen.getByText('Export a backup'));
    await waitFor(() => expect(saveBackup).toHaveBeenCalled());
    await Promise.resolve();
    expect(update).not.toHaveBeenCalled();
  });
  it('leaves it unchanged on a failed export', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    saveBackup.mockRejectedValue(new Error('disk full'));
    renderBackup(null);
    fireEvent.click(screen.getByText('Export a backup'));
    await screen.findByText("The backup couldn't be saved. Please try again.");
    expect(update).not.toHaveBeenCalled();
  });
});
describe('last backup line and nudge', () => {
  it('shows no backup yet and the nudge when never exported', () => {
    renderBackup(null);
    expect(screen.getByText('No backup yet')).toBeTruthy();
    expect(screen.getByText(NUDGE)).toBeTruthy();
  });
  it('shows the date and no nudge after a recent export', () => {
    renderBackup(daysAgo(3));
    expect(screen.getByText(/^Last backup: Sun 25 Oct$/)).toBeTruthy();
    expect(screen.queryByText(NUDGE)).toBeNull();
  });
  it('nudges after 31 days', () => {
    renderBackup(daysAgo(31));
    expect(screen.getByText(/^Last backup:/)).toBeTruthy();
    expect(screen.getByText(NUDGE)).toBeTruthy();
  });
  it('nudges when the date is in the future', () => {
    renderBackup(daysAgo(-2));
    expect(screen.getByText(NUDGE)).toBeTruthy();
  });
});
