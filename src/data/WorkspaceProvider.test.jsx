/* eslint-disable no-unused-vars -- JSX harness */
import { it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WorkspaceProvider from './WorkspaceProvider.jsx';
import { useWorkspace } from './useWorkspace.js';
import { durableGet, durableSet } from '../utils/safeStorage.js';
import { WORKSPACE_KEY } from '../domain/workspace.js';
vi.mock('../utils/native.js', () => ({ isNative: false }));
vi.mock('../utils/safeStorage.js', () => ({ durableGet: vi.fn(), durableSet: vi.fn() }));
let raw;
beforeEach(() => {
  vi.resetAllMocks();
  raw = null;
  durableGet.mockImplementation(async () => raw);
  durableSet.mockImplementation(async (_key, value) => {
    raw = value;
  });
});
function Consumer() {
  const w = useWorkspace();
  return (
    <>
      <p>{w.ready ? `Ready ${w.workspace.revision}` : 'Not ready'}</p>
      <p>{w.error}</p>
      <button onClick={() => w.save((x) => x).catch(() => {})}>Save</button>
      <button onClick={() => w.rawExport()}>Raw</button>
    </>
  );
}
it('loads and acknowledges saves through the real client, then reports persistence failure', async () => {
  render(
    <WorkspaceProvider>
      <Consumer />
    </WorkspaceProvider>
  );
  await screen.findByText('Ready 0');
  fireEvent.click(screen.getByText('Save'));
  await screen.findByText('Ready 1');
  fireEvent.click(screen.getByText('Raw'));
  expect(durableGet).toHaveBeenCalledWith(WORKSPACE_KEY);
  durableSet.mockRejectedValueOnce(new Error('full'));
  fireEvent.click(screen.getByText('Save'));
  await screen.findByText('full');
  expect(screen.getByText('Ready 1')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Save'));
  await screen.findByText('Ready 2');
});
it('does not enable writes after unreadable storage', async () => {
  durableGet.mockRejectedValue(new Error('unreadable'));
  render(
    <WorkspaceProvider>
      <Consumer />
    </WorkspaceProvider>
  );
  await screen.findByText('unreadable');
  expect(screen.getByText('Not ready')).toBeInTheDocument();
  expect(durableSet).not.toHaveBeenCalled();
});
it('uses Web Locks when available', async () => {
  const request = vi.fn(async (_name, fn) => fn());
  Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true });
  render(
    <WorkspaceProvider>
      <Consumer />
    </WorkspaceProvider>
  );
  await screen.findByText('Ready 0');
  fireEvent.click(screen.getByText('Save'));
  await screen.findByText('Ready 1');
  expect(request).toHaveBeenCalledWith(WORKSPACE_KEY, expect.any(Function));
  delete navigator.locks;
});
