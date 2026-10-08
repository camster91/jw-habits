import { it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
vi.mock('../utils/native.js', () => ({
  isNative: false,
  appLifecycle: { onStateChange: () => () => {} },
}));
// eslint-disable-next-line no-unused-vars -- used in JSX
import { StoreProvider, STORE_KEY } from './StoreProvider.jsx';
import { defaultStore } from '../domain/store.js';
import { useStore } from './useStore.js';

let state;
// eslint-disable-next-line no-unused-vars -- used in JSX
function Probe() {
  state = useStore();
  return <p>Review probe</p>;
}

it('preserves browser history after failed reads even when writes are available', async () => {
  const original = JSON.stringify({
    ...defaultStore('2026-10-01', 'en'),
    labels: { dailyText: 'Existing history' },
  });
  localStorage.setItem(STORE_KEY, original);
  const read = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
    throw new Error('Transient read failure');
  });
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const view = render(
    <StoreProvider>
      <Probe />
    </StoreProvider>
  );
  try {
    await act(async () => {
      for (let i = 0; i < 30; i++) await Promise.resolve();
    });
    await act(async () => state.update((s) => ({ ...s, labels: { dailyText: 'Changed' } })));
    read.mockRestore();
    expect(localStorage.getItem(STORE_KEY)).toBe(original);
  } finally {
    read.mockRestore();
    warning.mockRestore();
    view.unmount();
  }
});
