import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useMemo } from 'react';
// eslint-disable-next-line no-unused-vars -- used via JSX
import { StoreContext } from '../data/useStore.js';
import { defaultStore } from '../domain/store.js';
import { ROUTINE_IDS } from '../domain/routines.js';
import { setMinistry } from '../domain/today.js';
// eslint-disable-next-line no-unused-vars -- used via JSX
import ReportCard from './ReportCard.jsx';

function makeStore({ ministry = true, pioneer = false } = {}) {
  const s = defaultStore('2026-09-01', 'en');
  s.schedule[0].enabled = Object.fromEntries(
    ROUTINE_IDS.map((id) => [id, id === 'ministry' && ministry])
  );
  const logged = setMinistry({ ...s, pioneer }, '2026-10-12', {
    shared: true,
    studies: 2,
    hours: 12,
  });
  return logged;
}

// eslint-disable-next-line no-unused-vars -- used via JSX
function Harness({ store, today }) {
  const value = useMemo(() => ({ store, update: () => {}, today }), [store, today]);
  return (
    <StoreContext.Provider value={value}>
      <ReportCard />
    </StoreContext.Provider>
  );
}

const show = (store, today) => render(<Harness store={store} today={today} />);
let writeText;

beforeEach(() => {
  localStorage.clear();
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});
afterEach(() => vi.restoreAllMocks());

describe('ReportCard', () => {
  it("shows last month's totals on day 3", () => {
    show(makeStore(), '2026-11-03');
    expect(screen.getByText('October report')).toBeInTheDocument();
    expect(screen.getByText('Shared in the ministry: Yes')).toBeInTheDocument();
    expect(screen.getByText('Bible studies: 2')).toBeInTheDocument();
    expect(screen.queryByText(/Hours/)).not.toBeInTheDocument();
  });
  it('shows hours for a pioneer', () => {
    show(makeStore({ pioneer: true }), '2026-11-03');
    expect(screen.getByText('Hours: 12')).toBeInTheDocument();
  });
  it('is hidden on day 8 and when ministry is off', () => {
    const { container, rerender } = show(makeStore(), '2026-11-08');
    expect(container).toBeEmptyDOMElement();
    rerender(<Harness store={makeStore({ ministry: false })} today="2026-11-03" />);
    expect(container).toBeEmptyDOMElement();
  });
  it('copies the exact text and announces Copied', async () => {
    show(makeStore({ pioneer: true }), '2026-11-03');
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        'October 2026 — Shared in the ministry: Yes · Bible studies: 2 · Hours: 12'
      )
    );
    const live = await screen.findByText('Copied');
    expect(live.closest('[aria-live="polite"]')).not.toBeNull();
  });
  it('shows the failure text when the clipboard rejects', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    show(makeStore(), '2026-11-03');
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await screen.findByText("Couldn't copy. Select the text instead.")).toBeInTheDocument();
    expect(screen.getByText('Bible studies: 2')).toBeInTheDocument();
  });
  it('shows the failure text when there is no clipboard', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    show(makeStore(), '2026-11-03');
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await screen.findByText("Couldn't copy. Select the text instead.")).toBeInTheDocument();
  });
  it('says so when nothing was logged', () => {
    const empty = { ...makeStore(), log: [] };
    show(empty, '2026-11-03');
    expect(screen.getByText('Nothing logged for October.')).toBeInTheDocument();
  });
  it('hides for that month, persists, and shows again in a new month', () => {
    const store = makeStore();
    const { container, unmount } = show(store, '2026-11-03');
    fireEvent.click(screen.getByRole('button', { name: 'Hide report reminder' }));
    expect(container).toBeEmptyDOMElement();
    expect(localStorage.getItem('fd-report-dismissed')).toBe('2026-10');
    unmount();
    expect(show(store, '2026-11-05').container).toBeEmptyDOMElement();
    expect(show(store, '2026-12-02').getAllByText('November report')).toHaveLength(1);
  });
});
