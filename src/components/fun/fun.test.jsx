import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react';
// eslint-disable-next-line no-unused-vars -- JSX
import { StrictMode } from 'react';
// eslint-disable-next-line no-unused-vars -- JSX
import Garden from './Garden.jsx';
// eslint-disable-next-line no-unused-vars -- JSX
import BadgeToast from './BadgeToast.jsx';
// eslint-disable-next-line no-unused-vars -- JSX
import LevelBar from './LevelBar.jsx';
// eslint-disable-next-line no-unused-vars -- JSX
import Confetti from './Confetti.jsx';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('fun layer', () => {
  it('has distinct accessible garden stages and badge blooms', () => {
    const { rerender, container } = render(<Garden stage={0} />);
    expect(screen.getByRole('img', { name: 'Your garden: a seed' })).toBeInTheDocument();
    rerender(<Garden stage={7} level={7} badges={18} />);
    expect(screen.getByRole('img', { name: 'Your garden: a fruitful tree' })).toBeInTheDocument();
    expect(container.querySelectorAll('g')).toHaveLength(18);
  });
  it('announces queued badge awards and dismisses one at a time', () => {
    render(<BadgeToast />);
    act(() =>
      window.dispatchEvent(
        new CustomEvent('fd-badge', { detail: { ids: ['firstStep', 'firstProject', 'unknown'] } })
      )
    );
    expect(screen.getByRole('status')).toHaveTextContent('First step');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.getByRole('status')).toHaveTextContent('First project finished');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
  it('ignores malformed badge events', () => {
    render(<BadgeToast />);
    act(() => window.dispatchEvent(new CustomEvent('fd-badge', { detail: { ids: 'firstStep' } })));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
  it('does not animate under reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    render(<Confetti />);
    expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();
  });
  it('celebrates a level once even under StrictMode and after remount', () => {
    vi.useFakeTimers();
    const { unmount } = render(
      <StrictMode>
        <LevelBar xp={100} />
      </StrictMode>
    );
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole('status')).toHaveTextContent('Your garden is growing · Sprout');
    unmount();
    render(<LevelBar xp={100} />);
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
