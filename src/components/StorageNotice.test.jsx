import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
// eslint-disable-next-line no-unused-vars -- used in JSX
import StorageNotice from './StorageNotice.jsx';
it('announces a failed save and opens backup settings', () => {
  const backup = vi.fn();
  render(<StorageNotice onBackup={backup} />);
  expect(screen.queryByRole('alert')).toBeNull();
  fireEvent(window, new CustomEvent('jw-storage-full'));
  expect(screen.getByRole('alert')).toHaveTextContent(/backup/i);
  fireEvent.click(screen.getByRole('button', { name: /backup/i }));
  expect(backup).toHaveBeenCalledOnce();
});
it('retains a failure that happened before the notice mounted', async () => {
  const { safeSetItem } = await import('../utils/safeStorage.js');
  const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
    throw Object.assign(new Error('full'), { name: 'QuotaExceededError' });
  });
  try {
    expect(safeSetItem('jw-habits-v2', 'data')).toBe(false);
  } finally {
    write.mockRestore();
  }
  render(<StorageNotice onBackup={() => {}} />);
  expect(screen.getByRole('alert')).toHaveTextContent('could not be saved');
});
