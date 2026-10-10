import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
// eslint-disable-next-line no-unused-vars -- components used by JSX in the fixture
import { MemoryRouter, Link, Route, Routes, useNavigate } from 'react-router-dom';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
// eslint-disable-next-line no-unused-vars -- component used by JSX in the fixture
import NavigationPosition from './NavigationPosition.jsx';

let y;
let scroll;
beforeEach(() => {
  y = 650;
  vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => y);
  scroll = vi.spyOn(window, 'scrollTo').mockImplementation(({ top }) => {
    y = top;
  });
});
afterEach(() => vi.restoreAllMocks());

// eslint-disable-next-line no-unused-vars -- component rendered by mount via JSX
function Fixture() {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      <NavigationPosition enabled={enabled} />
      <button onClick={() => setEnabled(true)}>Finish setup</button>
      <button onClick={() => navigate(-1)}>Back</button>
      <Link to="/notes">Notes</Link>
      <button onClick={() => setLoaded(true)}>Resolve route</button>
      <Routes>
        <Route
          path="/"
          element={
            <main>
              <h1>Today</h1>
            </main>
          }
        />
        <Route
          path="/notes"
          element={
            loaded ? (
              <main>
                <h1>Notes</h1>
              </main>
            ) : (
              <p>Loading notes</p>
            )
          }
        />
      </Routes>
    </>
  );
}
function mount() {
  return render(
    <MemoryRouter>
      <Fixture />
    </MemoryRouter>
  );
}

it('resets onboarding scroll and focuses Today when setup finishes', () => {
  mount();
  expect(scroll).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Finish setup'));
  expect(y).toBe(0);
  expect(screen.getByRole('heading', { name: 'Today' })).toHaveFocus();
});

it('waits for lazy route content and restores the saved list position on Back', async () => {
  mount();
  fireEvent.click(screen.getByText('Finish setup'));
  y = 460;
  fireEvent.click(screen.getByRole('link', { name: 'Notes' }));
  expect(screen.getByText('Loading notes')).toBeInTheDocument();
  await act(async () => {
    fireEvent.click(screen.getByText('Resolve route'));
  });
  expect(y).toBe(0);
  expect(screen.getByRole('heading', { name: 'Notes' })).toHaveFocus();
  y = 280;
  fireEvent.click(screen.getByText('Back'));
  expect(y).toBe(460);
  expect(screen.getByRole('heading', { name: 'Today' })).toHaveFocus();
});

it('restores browser scroll ownership and cancels pending lazy positioning on unmount', async () => {
  window.history.scrollRestoration = 'auto';
  const view = mount();
  fireEvent.click(screen.getByText('Finish setup'));
  fireEvent.click(screen.getByRole('link', { name: 'Notes' }));
  expect(window.history.scrollRestoration).toBe('manual');
  view.unmount();
  expect(window.history.scrollRestoration).toBe('auto');
  scroll.mockClear();
  await act(async () => {
    document.body.appendChild(document.createElement('main'));
  });
  expect(scroll).not.toHaveBeenCalled();
});
