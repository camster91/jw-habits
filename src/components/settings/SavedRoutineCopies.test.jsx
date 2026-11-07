/* eslint-disable no-unused-vars -- JSX harness */
import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { durableGet, durableKeys } from '../../utils/safeStorage.js';
import { saveBackup } from '../../utils/backup.js';
import SavedRoutineCopies from './SavedRoutineCopies.jsx';

vi.mock('../../utils/safeStorage.js', () => ({ durableGet: vi.fn(), durableKeys: vi.fn() }));
vi.mock('../../utils/backup.js', () => ({
  saveBackup: vi.fn(),
  isShareCancel: (error) => /cancel/i.test(error.message),
}));
const older = 'jw-habits-v2-corrupt-1700000000000';
const newer = 'jw-habits-v2-corrupt-1700000001000';
beforeEach(() => {
  vi.resetAllMocks();
  durableKeys.mockResolvedValue([
    older,
    'unrelated-private-key',
    newer,
    'jw-habits-v2-corrupt-invalid',
  ]);
});

it('lists only retained routine copies, allowing older copies to remain reachable', async () => {
  durableGet.mockResolvedValueOnce('older original bytes');
  render(<SavedRoutineCopies />);
  const selector = await screen.findByLabelText('Saved routine recovery copy');
  expect(selector).toHaveValue(newer);
  expect(screen.getAllByRole('option')).toHaveLength(2);
  fireEvent.change(selector, { target: { value: older } });
  fireEvent.click(screen.getByRole('button', { name: 'Save original routines copy' }));
  await screen.findByText('Copy offered. Finish saving it in your browser or share sheet.');
  expect(durableGet).toHaveBeenCalledWith(older);
  expect(saveBackup).toHaveBeenCalledWith(
    'older original bytes',
    expect.any(String),
    expect.any(String)
  );
});

it('exports an empty retained original as data rather than treating it as missing', async () => {
  durableGet.mockResolvedValueOnce('');
  render(<SavedRoutineCopies />);
  fireEvent.click(await screen.findByRole('button', { name: 'Save original routines copy' }));
  await screen.findByText('Copy offered. Finish saving it in your browser or share sheet.');
  expect(saveBackup).toHaveBeenCalledWith('', expect.any(String), expect.any(String));
});

it('reports a missing copy without offering a fabricated empty file', async () => {
  durableGet.mockResolvedValueOnce(null);
  render(<SavedRoutineCopies />);
  fireEvent.click(await screen.findByRole('button', { name: 'Save original routines copy' }));
  await screen.findByText('That recovery copy is no longer available.');
  expect(saveBackup).not.toHaveBeenCalled();
});

it.each([
  ['cancelled', 'Copy cancelled.'],
  ['read failed', 'Could not offer that recovery copy. Please try again.'],
])('reports %s without claiming the original was saved', async (message, expected) => {
  durableGet.mockRejectedValueOnce(new Error(message));
  render(<SavedRoutineCopies />);
  fireEvent.click(await screen.findByRole('button', { name: 'Save original routines copy' }));
  await screen.findByText(expected);
  expect(saveBackup).not.toHaveBeenCalled();
});

it('handles a failed directory listing and hides controls when no copies exist', async () => {
  durableKeys.mockRejectedValueOnce(new Error('unavailable'));
  const view = render(<SavedRoutineCopies />);
  await screen.findByText('Saved routine recovery copies could not be listed.');
  view.unmount();
  durableKeys.mockResolvedValueOnce([]);
  render(<SavedRoutineCopies />);
  expect(screen.queryByRole('button')).toBeNull();
});
