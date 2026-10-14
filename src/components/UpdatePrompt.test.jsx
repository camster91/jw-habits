import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
// eslint-disable-next-line no-unused-vars -- JSX component used by render.
import UpdatePrompt from './UpdatePrompt.jsx';

let state;
vi.mock('../hooks/usePWAContext', () => ({ usePWAContext: () => state }));
vi.mock('../utils/native', () => ({ haptics: { medium: vi.fn(), light: vi.fn() } }));

beforeEach(() => {
  sessionStorage.removeItem('jw-update-prompt-dismissed');
  state = { updateAvailable: true, applyUpdate: vi.fn() };
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ bottom: 64 });
});
afterEach(() => vi.restoreAllMocks());

describe('UpdatePrompt content clearance', () => {
  it('reserves the measured banner space and clears it when dismissed', () => {
    render(<UpdatePrompt />);
    expect(document.documentElement.style.getPropertyValue('--fd-update-clearance')).toBe('64px');
    expect(document.documentElement.getAttribute('data-fd-update-visible')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss update notification' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--fd-update-clearance')).toBe('');
    expect(document.documentElement.hasAttribute('data-fd-update-visible')).toBe(false);
    expect(state.applyUpdate).not.toHaveBeenCalled();
  });

  it('restores the normal page inset when the available update goes away', () => {
    const { rerender } = render(<UpdatePrompt />);
    state = { ...state, updateAvailable: false };
    rerender(<UpdatePrompt />);
    expect(document.documentElement.hasAttribute('data-fd-update-visible')).toBe(false);
    expect(document.documentElement.style.getPropertyValue('--fd-update-clearance')).toBe('');
  });
});
