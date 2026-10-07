import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
// eslint-disable-next-line no-unused-vars -- used in JSX
import ErrorBoundary from './ErrorBoundary.jsx';
vi.mock('../utils/native.js', () => ({ isNative: false }));
// eslint-disable-next-line no-unused-vars -- used in JSX
function Broken() {
  throw new Error('test screen failure');
}
afterEach(() => vi.restoreAllMocks());
it('offers a recovery copy and requires acknowledgement before scoped reset', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  render(
    <ErrorBoundary>
      <Broken />
    </ErrorBoundary>
  );
  expect(screen.queryByText(/your data is safe/i)).toBeNull();
  expect(screen.getByRole('button', { name: 'Save a data recovery copy' })).toBeInTheDocument();
  const reset = screen.getByRole('button', { name: 'Reset current app data and reload' });
  expect(reset).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(reset);
  expect(confirm).toHaveBeenCalledExactlyOnceWith(
    expect.stringContaining('Existing recovery copies and other site data will remain')
  );
});
