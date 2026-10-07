import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// eslint-disable-next-line no-unused-vars -- used via JSX
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// eslint-disable-next-line no-unused-vars -- used via JSX
import Share from './Share.jsx';
vi.mock('../utils/native', () => ({ haptics: { light: vi.fn() } }));
const state = vi.hoisted(() => ({ store: { links: {} } }));
vi.mock('../data/useStore.js', () => ({ useStore: () => state }));
beforeEach(() => {
  state.store.links = {};
});
const renderShare = (query = '') =>
  render(
    <MemoryRouter initialEntries={[`/share${query}`]}>
      <Routes>
        <Route path="/share" element={<Share />} />
        <Route path="/" element={<p>Today destination</p>} />
      </Routes>
    </MemoryRouter>
  );
afterEach(() => vi.restoreAllMocks());
describe('web share target', () => {
  it('shows an empty state and returns to Today', async () => {
    renderShare();
    expect(screen.getByRole('heading', { name: 'No Shared Content' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Back to Today' }));
    expect(screen.getByText('Today destination')).toBeVisible();
  });
  it.each(['javascript:alert(1)', 'https://phishing.example/login', 'https://user:pass@jw.org/'])(
    'renders unsafe URL %s as text without an opening control',
    (url) => {
      renderShare(
        `?url=${encodeURIComponent(url)}&text=${encodeURIComponent('<script>alert(1)</script>')}`
      );
      expect(screen.queryByRole('button', { name: 'Open Link' })).not.toBeInTheDocument();
      expect(screen.getByText('<script>alert(1)</script>')).toBeVisible();
      expect(document.querySelector('script')).toBeNull();
    }
  );
  it('opens a permitted link only after a deliberate click with opener isolation', async () => {
    state.store.links = { dailyText: 'https://www.jw.org/en/' };
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderShare('?url=https%3A%2F%2Fwww.jw.org%2Fen%2F');
    expect(open).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Open Link' }));
    expect(open).toHaveBeenCalledExactlyOnceWith(
      'https://www.jw.org/en/',
      '_blank',
      'noopener,noreferrer'
    );
  });
});
