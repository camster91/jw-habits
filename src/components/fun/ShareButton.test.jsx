import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// eslint-disable-next-line no-unused-vars -- JSX
import ShareButton from './ShareButton.jsx';
// eslint-disable-next-line no-unused-vars -- JSX
import { StoreContext } from '../../data/useStore.js';
import { createCard } from '../../share/cards.js';
import { shareCard } from '../../native/shareCard.js';
vi.mock('../../share/cards.js', () => ({
  createCard: vi.fn(async () => new Blob(['PNG'], { type: 'image/png' })),
}));
vi.mock('../../native/shareCard.js', () => ({ shareCard: vi.fn(async () => {}) }));
function show(showShare) {
  return render(
    <StoreContext.Provider value={{ store: { showShare }, today: '2026-10-07' }}>
      <ShareButton kind="milestone" data={{ title: 'Daniel' }} />
    </StoreContext.Provider>
  );
}
describe('ShareButton', () => {
  it('hides buttons when sharing is disabled', () => {
    show(false);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('only creates and shares a card on a tap', async () => {
    show(true);
    expect(createCard).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Share card' }));
    await waitFor(() => expect(shareCard).toHaveBeenCalled());
    expect(shareCard.mock.calls.at(-1)[0].type).toBe('image/png');
  });
});
